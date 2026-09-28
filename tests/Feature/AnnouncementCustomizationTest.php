<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Announcement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function newsPayload(array $overrides = []): array
{
    return array_replace([
        'title' => 'School news',
        'type' => 'update',
        'placement' => 'both',
        'banner_style' => 'standard',
        'banner_direction' => 'auto',
        'banner_font' => 'default',
        'status' => 'published',
        'is_dismissible' => true,
        'sort_order' => 0,
    ], $overrides);
}

function newsAdmin(): User
{
    return User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'status' => UserStatus::Active,
        'created_by' => null,
    ]);
}

test('admins can publish a thousand character title with custom banner text', function () {
    $title = str_repeat('خبر', 333).'!';
    $this->actingAs(newsAdmin())->post(route('superadmin.announcements.store'), newsPayload([
        'title' => $title,
        'banner_style' => 'ticker',
        'banner_font' => 'urdu',
        'banner_font_size' => 24,
        'banner_summary_font_size' => 16,
        'banner_font_weight' => 700,
        'banner_scroll_duration' => 90,
    ]))->assertRedirect(route('superadmin.announcements'))->assertSessionHasNoErrors();

    $announcement = Announcement::sole();
    expect($announcement->title)->toBe($title);
    expect($announcement->banner_font_size)->toBe(24);
    expect($announcement->banner_summary_font_size)->toBe(16);
    expect($announcement->banner_font_weight)->toBe(700);
    expect($announcement->banner_scroll_duration)->toBe(90);

    $this->get(route('superadmin.announcements.edit', $announcement))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('announcement.title', $title)
            ->where('announcement.banner_font_size', 24)
            ->where('announcement.banner_summary_font_size', 16)
            ->where('announcement.banner_font_weight', 700)
            ->where('announcement.banner_scroll_duration', 90)
        );
});

test('existing edits preserve optional settings and settings can be reset to defaults', function () {
    $announcement = Announcement::create(newsPayload([
        'published_at' => now()->subDay(),
        'banner_font_size' => 22,
        'banner_summary_font_size' => 15,
        'banner_font_weight' => 500,
        'banner_scroll_duration' => 60,
    ]));
    $publishedAt = $announcement->published_at->toISOString();

    $this->actingAs(newsAdmin())
        ->put(route('superadmin.announcements.update', $announcement), newsPayload(['title' => 'Updated news']))
        ->assertSessionHasNoErrors();
    $announcement->refresh();
    expect($announcement->banner_font_size)->toBe(22);
    expect($announcement->banner_summary_font_size)->toBe(15);
    expect($announcement->banner_font_weight)->toBe(500);
    expect($announcement->banner_scroll_duration)->toBe(60);
    expect($announcement->published_at->toISOString())->toBe($publishedAt);

    $this->put(route('superadmin.announcements.update', $announcement), newsPayload([
        'banner_font_size' => null,
        'banner_summary_font_size' => null,
        'banner_font_weight' => null,
        'banner_scroll_duration' => null,
    ]))->assertSessionHasNoErrors();
    $announcement->refresh();
    expect($announcement->banner_font_size)->toBeNull();
    expect($announcement->banner_summary_font_size)->toBeNull();
    expect($announcement->banner_font_weight)->toBeNull();
    expect($announcement->banner_scroll_duration)->toBeNull();
});

test('news settings reject values outside their supported limits', function (string $field, mixed $value) {
    $this->actingAs(newsAdmin())
        ->post(route('superadmin.announcements.store'), newsPayload([$field => $value]))
        ->assertSessionHasErrors($field);
    $this->assertDatabaseCount('announcements', 0);
})->with([
    'oversize title' => ['title', str_repeat('a', 1001)],
    'title too small' => ['banner_font_size', 9],
    'title too large' => ['banner_font_size', 49],
    'summary too large' => ['banner_summary_font_size', 33],
    'unsupported weight' => ['banner_font_weight', 650],
    'duration too short' => ['banner_scroll_duration', 9],
    'duration too long' => ['banner_scroll_duration', 181],
]);

test('all eligible banners appear in order and dismissals stay separate per item and surface', function () {
    $customer = User::factory()->create([
        'user_type' => UserType::Customer,
        'status' => UserStatus::Active,
        'account_type' => AccountType::Trial,
    ]);
    $first = Announcement::create(newsPayload([
        'title' => 'First news', 'sort_order' => 20, 'published_at' => now(),
        'banner_font_size' => 22, 'banner_font_weight' => 700,
    ]));
    $second = Announcement::create(newsPayload([
        'title' => 'Second news', 'sort_order' => 10, 'published_at' => now(),
        'banner_style' => 'ticker', 'banner_scroll_duration' => 60,
    ]));
    $card = Announcement::create(newsPayload(['title' => 'Card only', 'placement' => 'card']));
    foreach ([
        ['title' => 'Draft news', 'status' => 'draft'],
        ['title' => 'Future news', 'starts_at' => now()->addDay()],
        ['title' => 'Expired news', 'ends_at' => now()->subDay()],
        ['title' => 'Archived news', 'status' => 'archived'],
    ] as $hidden) {
        Announcement::create(newsPayload($hidden));
    }

    $this->actingAs($customer)->get(route('dashboard'))->assertInertia(fn (Assert $page) => $page
        ->has('announcements.banners', 2)
        ->where('announcements.banner.id', $first->id)
        ->where('announcements.banners.0.id', $first->id)
        ->where('announcements.banners.0.banner_font_size', 22)
        ->where('announcements.banners.1.id', $second->id)
        ->where('announcements.banners.1.banner_scroll_duration', 60)
        ->has('announcements.updates', 3)
    );

    $this->post('/announcements/'.$first->id.'/dismiss', ['surface' => 'banner'])->assertRedirect();
    $this->post('/announcements/'.$second->id.'/dismiss', ['surface' => 'card'])->assertRedirect();

    $this->get(route('dashboard'))->assertInertia(fn (Assert $page) => $page
        ->has('announcements.banners', 1)
        ->where('announcements.banners.0.id', $second->id)
        ->where('announcements.banner.id', $second->id)
        ->has('announcements.updates', 2)
        ->where('announcements.updates', fn ($items) => collect($items)->pluck('id')->all() === [$first->id, $card->id])
    );

    $other = User::factory()->create(['user_type' => UserType::Customer, 'account_type' => AccountType::Trial]);
    $this->actingAs($other)->get(route('dashboard'))->assertInertia(fn (Assert $page) => $page
        ->has('announcements.banners', 2)
        ->has('announcements.updates', 3)
    );
});

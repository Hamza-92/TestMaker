<?php

use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\SitePage;
use App\Models\User;
use App\Support\PricingPageContent;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->master = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'status' => UserStatus::Active,
        'created_by' => null,
    ]);
});

it('shows the published pricing content to guests and uses it on the homepage', function () {
    $pricing = $this->get('/pricing')->assertOk()->viewData('page');
    expect($pricing['props']['content']['plans'][0]['name'])->toBe('30-Day Free Trial');

    $home = $this->get('/')->assertOk()->viewData('page');
    expect($home['props']['pricingContent']['plans'][0]['name'])->toBe('30-Day Free Trial');
});

it('keeps drafts private until publication and stores a restorable revision', function () {
    $this->actingAs($this->master)->get('/superadmin/site/pricing')->assertOk();
    $draft = PricingPageContent::defaults();
    $draft['hero']['title'] = 'A new pricing headline';
    $draft['plans'][1]['price'] = 'Rs 10,000';

    $this->put('/superadmin/site/pricing', ['version' => 1, 'publish' => false, 'content' => $draft])->assertRedirect();
    expect(SitePage::where('slug', 'pricing')->firstOrFail()->draft_content['hero']['title'])->toBe('A new pricing headline');
    expect($this->get('/pricing')->viewData('page')['props']['content']['hero']['title'])->not->toBe('A new pricing headline');
    expect($this->get('/superadmin/site/pricing/preview')->viewData('page')['props']['content']['hero']['title'])->toBe('A new pricing headline');

    $this->put('/superadmin/site/pricing', ['version' => 2, 'publish' => true, 'content' => $draft])->assertRedirect();
    expect($this->get('/pricing')->viewData('page')['props']['content']['hero']['title'])->toBe('A new pricing headline');
    auth()->logout();
    expect($this->get('/')->viewData('page')['props']['pricingContent']['plans'][1]['price'])->toBe('Rs 10,000');
    $this->actingAs($this->master);
    expect(SitePage::where('slug', 'pricing')->firstOrFail()->revisions()->count())->toBe(1);

    $next = $draft;
    $next['hero']['title'] = 'Changed again';
    $this->put('/superadmin/site/pricing', ['version' => 3, 'publish' => false, 'content' => $next])->assertRedirect();
    $page = SitePage::where('slug', 'pricing')->firstOrFail();
    $this->post('/superadmin/site/pricing/revisions/'.$page->revisions()->firstOrFail()->id.'/restore', ['version' => 4])->assertRedirect();
    expect($page->fresh()->draft_content['hero']['title'])->toBe('A new pricing headline');
    expect($page->fresh()->published_content['hero']['title'])->toBe('A new pricing headline');
});

it('rejects unsafe links and stale changes', function () {
    $this->actingAs($this->master)->get('/superadmin/site/pricing')->assertOk();
    $content = PricingPageContent::defaults();
    $content['plans'][0]['action_url'] = 'javascript:alert(1)';

    $this->put('/superadmin/site/pricing', ['version' => 1, 'publish' => true, 'content' => $content])
        ->assertSessionHasErrors('content.plans.0.action_url');
    expect(SitePage::where('slug', 'pricing')->firstOrFail()->revisions()->count())->toBe(0);

    $content['plans'][0]['action_url'] = '/register';
    $this->put('/superadmin/site/pricing', ['version' => 1, 'publish' => false, 'content' => $content])->assertRedirect();
    $this->put('/superadmin/site/pricing', ['version' => 1, 'publish' => true, 'content' => $content])
        ->assertSessionHasErrors('version');
});

it('enforces separate website viewing and editing permissions', function () {
    $viewer = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'status' => UserStatus::Active,
        'created_by' => $this->master->id,
    ]);
    $viewer->syncPermissions(['site_pages.view']);

    $this->actingAs($viewer)->get('/superadmin/site/pricing')->assertOk();
    $this->get('/superadmin/site/pricing/preview')->assertOk();
    $this->put('/superadmin/site/pricing', [
        'version' => 1, 'publish' => true, 'content' => PricingPageContent::defaults(),
    ])->assertForbidden();

    $customer = User::factory()->create(['user_type' => UserType::Customer]);
    $this->actingAs($customer)->get('/superadmin/site/pricing')->assertRedirect('/dashboard');
});

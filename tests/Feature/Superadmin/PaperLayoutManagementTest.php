<?php

use App\Enums\UserType;
use App\Models\Pattern;
use App\Models\User;
use App\Support\PaperLayouts\PaperLayoutRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('shows registered paper layouts and pattern assignments', function () {
    $admin = User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
        'created_by' => null,
    ]);
    $pattern = Pattern::create([
        'name' => 'Layout Test Pattern',
        'paper_layout' => PaperLayoutRegistry::STANDARD,
        'status' => 1,
        'created_by' => $admin->id,
    ]);

    $this->actingAs($admin)
        ->get(route('superadmin.paper-layouts'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/paper-layouts')
            ->has('layouts', 2)
            ->has('patterns', 1)
            ->where('patterns.0.id', $pattern->id)
            ->where('patterns.0.paper_layout', PaperLayoutRegistry::STANDARD),
        );
});

it('assigns a registered paper layout to a pattern', function () {
    $admin = User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
        'created_by' => null,
    ]);
    $pattern = Pattern::create([
        'name' => 'Federal Assignment Pattern',
        'paper_layout' => PaperLayoutRegistry::STANDARD,
        'status' => 1,
        'created_by' => $admin->id,
    ]);

    $this->actingAs($admin)
        ->put(route('superadmin.paper-layouts.assignments'), [
            'assignments' => [[
                'pattern_id' => $pattern->id,
                'paper_layout' => PaperLayoutRegistry::FEDERAL_BOARD,
            ]],
        ])
        ->assertRedirect();

    expect($pattern->refresh()->paper_layout)
        ->toBe(PaperLayoutRegistry::FEDERAL_BOARD);

    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => Pattern::class,
        'auditable_id' => $pattern->id,
        'notes' => 'Paper layout assignment updated.',
    ]);
});

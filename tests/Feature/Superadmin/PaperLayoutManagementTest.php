<?php

use App\Enums\UserType;
use App\Models\PaperLayoutAssignment;
use App\Models\Pattern;
use App\Models\SchoolClass;
use App\Models\User;
use App\Support\PaperLayouts\PaperLayoutRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function createPaperLayoutScope(User $admin, string $patternName = 'Layout Test Pattern'): array
{
    $pattern = Pattern::create([
        'name' => $patternName,
        'paper_layout' => PaperLayoutRegistry::STANDARD,
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $classes = collect(['9th', '8th'])->map(fn (string $name) => SchoolClass::create([
        'name' => $name,
        'status' => 1,
        'created_by' => $admin->id,
    ]));

    DB::table('pattern_classes')->insert($classes->map(fn (SchoolClass $class) => [
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
    ])->all());

    return [$pattern, $classes];
}

it('shows registered paper layouts for every pattern and class assignment', function () {
    $admin = User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
        'created_by' => null,
    ]);
    [$pattern, $classes] = createPaperLayoutScope($admin);

    PaperLayoutAssignment::create([
        'pattern_id' => $pattern->id,
        'class_id' => $classes[0]->id,
        'paper_layout' => PaperLayoutRegistry::FEDERAL_BOARD,
    ]);

    $this->actingAs($admin)
        ->get(route('superadmin.paper-layouts'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/paper-layouts')
            ->has('layouts', 2)
            ->has('patterns', 1)
            ->where('patterns.0.id', $pattern->id)
            ->has('patterns.0.classes', 2)
            ->where('patterns.0.classes.0.id', $classes[0]->id)
            ->where('patterns.0.classes.0.paper_layout', PaperLayoutRegistry::FEDERAL_BOARD)
            ->where('patterns.0.classes.1.id', $classes[1]->id)
            ->where('patterns.0.classes.1.paper_layout', PaperLayoutRegistry::STANDARD),
        );
});

it('assigns a registered paper layout to one class without changing another class', function () {
    $admin = User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
        'created_by' => null,
    ]);
    [$pattern, $classes] = createPaperLayoutScope($admin, 'Federal Assignment Pattern');

    $this->actingAs($admin)
        ->put(route('superadmin.paper-layouts.assignments'), [
            'assignments' => [
                [
                    'pattern_id' => $pattern->id,
                    'class_id' => $classes[0]->id,
                    'paper_layout' => PaperLayoutRegistry::FEDERAL_BOARD,
                ],
                [
                    'pattern_id' => $pattern->id,
                    'class_id' => $classes[1]->id,
                    'paper_layout' => PaperLayoutRegistry::STANDARD,
                ],
            ],
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('paper_layout_assignments', [
        'pattern_id' => $pattern->id,
        'class_id' => $classes[0]->id,
        'paper_layout' => PaperLayoutRegistry::FEDERAL_BOARD,
    ]);
    $this->assertDatabaseMissing('paper_layout_assignments', [
        'pattern_id' => $pattern->id,
        'class_id' => $classes[1]->id,
    ]);
    expect($pattern->refresh()->paper_layout)->toBe(PaperLayoutRegistry::STANDARD);

    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => Pattern::class,
        'auditable_id' => $pattern->id,
        'notes' => 'Class paper layout assignment updated.',
    ]);
});

it('requires the complete current pattern and class assignment list', function () {
    $admin = User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
        'created_by' => null,
    ]);
    [$pattern, $classes] = createPaperLayoutScope($admin);

    $this->actingAs($admin)
        ->from(route('superadmin.paper-layouts'))
        ->put(route('superadmin.paper-layouts.assignments'), [
            'assignments' => [[
                'pattern_id' => $pattern->id,
                'class_id' => $classes[0]->id,
                'paper_layout' => PaperLayoutRegistry::FEDERAL_BOARD,
            ]],
        ])
        ->assertRedirect(route('superadmin.paper-layouts'))
        ->assertSessionHasErrors('assignments');

    $this->assertDatabaseCount('paper_layout_assignments', 0);
});

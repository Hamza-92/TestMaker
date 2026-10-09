<?php

use App\Enums\UserType;
use App\Models\Pattern;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function circularLabelScopes(): array
{
    $pattern = Pattern::create(['name' => 'First Pattern', 'status' => 1]);
    $otherPattern = Pattern::create(['name' => 'Second Pattern', 'status' => 1]);
    $class = SchoolClass::create(['name' => '9th', 'status' => 1]);
    $otherClass = SchoolClass::create(['name' => '10th', 'status' => 1]);

    DB::table('pattern_classes')->insert([
        ['pattern_id' => $pattern->id, 'class_id' => $class->id],
        ['pattern_id' => $pattern->id, 'class_id' => $otherClass->id],
        ['pattern_id' => $otherPattern->id, 'class_id' => $class->id],
    ]);

    return [$pattern, $otherPattern, $class, $otherClass];
}

test('superadmin sees circular label defaults for each pattern and class', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    [$pattern, $otherPattern, $class] = circularLabelScopes();
    DB::table('pattern_classes')
        ->where('pattern_id', $pattern->id)
        ->where('class_id', $class->id)
        ->update(['circular_labels_default' => true]);

    $this->actingAs($admin)->get(route('superadmin.circular-labels'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/circular-labels')
            ->has('patterns', 2)
            ->where('patterns.0.id', $pattern->id)
            ->where('patterns.0.classes.0.circular_labels_default', true)
            ->where('patterns.0.classes.1.circular_labels_default', false)
            ->where('patterns.1.id', $otherPattern->id)
            ->where('patterns.1.classes.0.circular_labels_default', false));
});

test('superadmin can enable one class without enabling the same class in another pattern', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    [$pattern, $otherPattern, $class] = circularLabelScopes();

    $this->actingAs($admin)->put(route('superadmin.circular-labels.update'), [
        'assignments' => [[
            'pattern_id' => $pattern->id,
            'class_id' => $class->id,
            'enabled' => true,
        ]],
    ])->assertRedirect();

    $this->assertDatabaseHas('pattern_classes', [
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'circular_labels_default' => true,
    ]);
    $this->assertDatabaseHas('pattern_classes', [
        'pattern_id' => $otherPattern->id,
        'class_id' => $class->id,
        'circular_labels_default' => false,
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => Pattern::class,
        'auditable_id' => $pattern->id,
        'notes' => 'Class circular labels default updated.',
    ]);

    $this->put(route('superadmin.circular-labels.update'), [
        'assignments' => [[
            'pattern_id' => $pattern->id,
            'class_id' => $class->id,
            'enabled' => false,
        ]],
    ])->assertRedirect();

    $this->assertDatabaseHas('pattern_classes', [
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'circular_labels_default' => false,
    ]);
});

test('circular label defaults reject unlinked or duplicate class assignments', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    [$pattern, $otherPattern, , $otherClass] = circularLabelScopes();
    $assignment = [
        'pattern_id' => $otherPattern->id,
        'class_id' => $otherClass->id,
        'enabled' => true,
    ];

    $this->actingAs($admin)
        ->from(route('superadmin.circular-labels'))
        ->put(route('superadmin.circular-labels.update'), ['assignments' => [$assignment]])
        ->assertRedirect(route('superadmin.circular-labels'))
        ->assertSessionHasErrors('assignments');

    $duplicate = [
        'pattern_id' => $pattern->id,
        'class_id' => $otherClass->id,
        'enabled' => true,
    ];
    $this->put(route('superadmin.circular-labels.update'), ['assignments' => [$duplicate, $duplicate]])
        ->assertSessionHasErrors('assignments');

    $this->assertDatabaseMissing('pattern_classes', [
        'pattern_id' => $pattern->id,
        'class_id' => $otherClass->id,
        'circular_labels_default' => true,
    ]);
});

test('school accounts cannot change circular label defaults', function () {
    $school = User::factory()->create(['user_type' => UserType::Customer->value]);
    [$pattern, , $class] = circularLabelScopes();

    $this->actingAs($school)->put(route('superadmin.circular-labels.update'), [
        'assignments' => [[
            'pattern_id' => $pattern->id,
            'class_id' => $class->id,
            'enabled' => true,
        ]],
    ])->assertRedirect('/dashboard');

    $this->assertDatabaseHas('pattern_classes', [
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'circular_labels_default' => false,
    ]);
});

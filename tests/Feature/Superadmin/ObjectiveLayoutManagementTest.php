<?php

use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\ClassSubject;
use App\Models\Medium;
use App\Models\ObjectiveLayoutAssignment;
use App\Models\Pattern;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function objectiveLayoutFixture(): array
{
    $admin = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'status' => UserStatus::Active,
        'created_by' => null,
    ]);
    $pattern = Pattern::create([
        'name' => 'Federal Board',
        'short_name' => 'F.B',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $class = SchoolClass::create([
        'name' => '9th',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $subject = Subject::create([
        'name_eng' => 'Biology',
        'name_ur' => 'حیاتیات',
        'subject_type' => 'chapter-wise',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $medium = Medium::create(['name' => 'Both']);

    DB::table('pattern_classes')->insert([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
    ]);
    ClassSubject::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'subject_type' => 'chapter-wise',
        'medium_id' => $medium->id,
    ]);

    return compact('admin', 'pattern', 'class', 'subject', 'medium');
}

it('shows subject-specific objective layout assignments', function () {
    $fixture = objectiveLayoutFixture();

    ObjectiveLayoutAssignment::create([
        'pattern_id' => $fixture['pattern']->id,
        'class_id' => $fixture['class']->id,
        'subject_id' => $fixture['subject']->id,
        'objective_layout' => ObjectiveLayoutAssignment::FEDERAL_ROW,
        'show_bubbles' => true,
    ]);

    $this->actingAs($fixture['admin'])
        ->get(route('superadmin.objective-layouts'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/objective-layouts')
            ->has('layouts', 2)
            ->has('patterns', 1)
            ->where('patterns.0.id', $fixture['pattern']->id)
            ->where('patterns.0.classes.0.id', $fixture['class']->id)
            ->where('patterns.0.classes.0.subjects.0.id', $fixture['subject']->id)
            ->where(
                'patterns.0.classes.0.subjects.0.objective_layout',
                ObjectiveLayoutAssignment::FEDERAL_ROW,
            )
            ->where('patterns.0.classes.0.subjects.0.show_bubbles', true)
            ->where('patterns.0.classes.0.subjects.0.medium', 'Both'),
        );
});

it('saves only changed assignments while leaving other subjects untouched', function () {
    $fixture = objectiveLayoutFixture();
    $untouchedSubject = Subject::create([
        'name_eng' => 'Chemistry',
        'subject_type' => 'chapter-wise',
        'status' => 1,
        'created_by' => $fixture['admin']->id,
    ]);
    ClassSubject::create([
        'pattern_id' => $fixture['pattern']->id,
        'class_id' => $fixture['class']->id,
        'subject_id' => $untouchedSubject->id,
        'subject_type' => 'chapter-wise',
        'medium_id' => $fixture['medium']->id,
    ]);
    $scope = [
        'pattern_id' => $fixture['pattern']->id,
        'class_id' => $fixture['class']->id,
        'subject_id' => $fixture['subject']->id,
    ];

    $this->actingAs($fixture['admin'])
        ->put(route('superadmin.objective-layouts.update'), [
            'assignments' => [[
                ...$scope,
                'objective_layout' => ObjectiveLayoutAssignment::FEDERAL_ROW,
                'show_bubbles' => false,
            ]],
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('objective_layout_assignments', [
        ...$scope,
        'objective_layout' => ObjectiveLayoutAssignment::FEDERAL_ROW,
        'show_bubbles' => 0,
    ]);
    $this->assertDatabaseMissing('objective_layout_assignments', [
        'pattern_id' => $fixture['pattern']->id,
        'class_id' => $fixture['class']->id,
        'subject_id' => $untouchedSubject->id,
    ]);

    $this->actingAs($fixture['admin'])
        ->put(route('superadmin.objective-layouts.update'), [
            'assignments' => [[
                ...$scope,
                'objective_layout' => ObjectiveLayoutAssignment::FEDERAL_ROW,
                'show_bubbles' => true,
            ]],
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('objective_layout_assignments', [
        ...$scope,
        'show_bubbles' => 1,
    ]);

    $this->actingAs($fixture['admin'])
        ->put(route('superadmin.objective-layouts.update'), [
            'assignments' => [[
                ...$scope,
                'objective_layout' => ObjectiveLayoutAssignment::STANDARD,
                'show_bubbles' => true,
            ]],
        ])
        ->assertRedirect();

    $this->assertDatabaseMissing('objective_layout_assignments', $scope);
});
it('rejects a subject outside the selected pattern and class scope', function () {
    $fixture = objectiveLayoutFixture();
    $unassignedSubject = Subject::create([
        'name_eng' => 'Physics',
        'subject_type' => 'chapter-wise',
        'status' => 1,
        'created_by' => $fixture['admin']->id,
    ]);

    $this->actingAs($fixture['admin'])
        ->put(route('superadmin.objective-layouts.update'), [
            'assignments' => [[
                'pattern_id' => $fixture['pattern']->id,
                'class_id' => $fixture['class']->id,
                'subject_id' => $unassignedSubject->id,
                'objective_layout' => ObjectiveLayoutAssignment::FEDERAL_ROW,
                'show_bubbles' => true,
            ]],
        ])
        ->assertSessionHasErrors('assignments');

    $this->assertDatabaseMissing('objective_layout_assignments', [
        'subject_id' => $unassignedSubject->id,
    ]);
});


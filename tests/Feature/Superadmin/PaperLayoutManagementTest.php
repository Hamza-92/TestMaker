<?php

use App\Enums\UserType;
use App\Models\ClassSubject;
use App\Models\CustomPaperLayout;
use App\Models\PaperLayoutAssignment;
use App\Models\Pattern;
use App\Models\QuestionType;
use App\Models\QuestionTypeOrder;
use App\Models\SchoolClass;
use App\Models\Subject;
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

it('saves Federal pairing preferences only for subjective types in the selected subject', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    [$pattern, $classes] = createPaperLayoutScope($admin);
    $scope = ['pattern_id' => $pattern->id, 'class_id' => $classes[0]->id];
    PaperLayoutAssignment::create([...$scope, 'paper_layout' => PaperLayoutRegistry::FEDERAL_BOARD]);
    $physics = Subject::create(['name_eng' => 'Physics', 'subject_type' => 'chapter-wise', 'status' => 1]);
    $chemistry = Subject::create(['name_eng' => 'Chemistry', 'subject_type' => 'chapter-wise', 'status' => 1]);
    $physicsScope = ClassSubject::create([...$scope, 'subject_id' => $physics->id]);
    $chemistryScope = ClassSubject::create([...$scope, 'subject_id' => $chemistry->id]);
    $standardScope = ClassSubject::create([...$scope, 'class_id' => $classes[1]->id, 'subject_id' => $physics->id]);
    $customSubject = Subject::create(['name_eng' => 'Biology', 'subject_type' => 'chapter-wise', 'status' => 1]);
    $customScope = ClassSubject::create([...$scope, 'subject_id' => $customSubject->id]);
    CustomPaperLayout::create([...$scope, 'subject_id' => $customSubject->id, 'is_active' => true]);

    $short = QuestionType::create(['name' => 'Short questions', 'heading_en' => 'Short questions', 'status' => 1, 'is_objective' => false]);
    $mcq = QuestionType::create(['name' => 'MCQs', 'heading_en' => 'MCQs', 'status' => 1, 'is_objective' => true]);
    $long = QuestionType::create(['name' => 'Long questions', 'heading_en' => 'Long questions', 'status' => 1, 'is_objective' => false]);
    QuestionTypeOrder::create([...$scope, 'subject_id' => $physics->id, 'question_type_id' => $short->id, 'sort_order' => 1]);
    QuestionTypeOrder::create([...$scope, 'subject_id' => $physics->id, 'question_type_id' => $mcq->id, 'sort_order' => 2]);
    QuestionTypeOrder::create([...$scope, 'subject_id' => $chemistry->id, 'question_type_id' => $long->id, 'sort_order' => 1]);
    $url = route('superadmin.paper-layouts.federal-or', $physicsScope);

    $this->actingAs($admin)->putJson($url, ['single_question_type_ids' => [$mcq->id, $long->id]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('single_question_type_ids');
    $this->put($url, ['single_question_type_ids' => [$short->id]])
        ->assertRedirect(route('superadmin.paper-layouts.federal-or.index', ['federal_subject' => $physicsScope->id]));

    expect($physicsScope->fresh()->federal_single_question_type_ids)->toBe([$short->id])
        ->and($chemistryScope->fresh()->federal_single_question_type_ids)->toBeNull();

    $this->get(route('superadmin.paper-layouts.federal-or.index', ['federal_subject' => $physicsScope->id]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/federal-or-settings')
            ->has('federalSubjects', 2)
            ->where('federalSubjects.1.patternName', $pattern->name)
            ->where('federalSubjects.1.className', $classes[0]->name)
            ->has('federalOr.questionTypes', 1)
            ->where('federalOr.questionTypes.0.id', $short->id)
            ->where('federalOr.singleQuestionTypeIds', [$short->id]));

    $this->get(route('superadmin.paper-layouts.federal-or.index', ['federal_subject' => $standardScope->id]))
        ->assertInertia(fn (Assert $page) => $page->where('federalOr', null));
    $this->putJson(route('superadmin.paper-layouts.federal-or', $customScope), ['single_question_type_ids' => []])
        ->assertNotFound();

    $this->put($url, ['single_question_type_ids' => []])->assertRedirect();
    expect($physicsScope->fresh()->federal_single_question_type_ids)->toBeNull();
});

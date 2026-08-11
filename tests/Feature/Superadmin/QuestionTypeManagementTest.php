<?php

use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\QuestionTypeOrder;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function makeSuperAdmin(): User
{
    return User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
    ]);
}

function makeQuestionType(User $creator, array $overrides = []): QuestionType
{
    $uuid = Str::lower((string) Str::uuid());

    return QuestionType::create(array_merge([
        'name' => "Question Type {$uuid}",
        'name_ur' => null,
        'heading_en' => "Heading {$uuid}",
        'heading_ur' => null,
        'description_en' => null,
        'description_ur' => null,
        'have_exercise' => false,
        'have_statement' => true,
        'statement_label' => 'Statement',
        'have_description' => false,
        'description_label' => null,
        'have_answer' => true,
        'is_single' => true,
        'is_objective' => false,
        'schema_key' => 'subjective_standard',
        'objective_type_id' => null,
        'column_per_row' => 1,
        'status' => 1,
        'created_by' => $creator->id,
    ], $overrides));
}

function makeQuestion(User $creator, QuestionType $questionType): Question
{
    $suffix = Str::lower((string) Str::uuid());

    $pattern = Pattern::create([
        'name' => "Pattern {$suffix}",
        'short_name' => strtoupper(Str::random(5)),
        'status' => 1,
        'created_by' => $creator->id,
    ]);

    $class = SchoolClass::create([
        'name' => "Class {$suffix}",
        'status' => 1,
        'created_by' => $creator->id,
    ]);

    $subject = Subject::create([
        'name_eng' => "Subject {$suffix}",
        'name_ur' => null,
        'subject_type' => 'chapter-wise',
        'status' => 1,
        'created_by' => $creator->id,
    ]);

    $chapter = Chapter::create([
        'subject_id' => $subject->id,
        'class_id' => $class->id,
        'pattern_id' => $pattern->id,
        'name' => "Chapter {$suffix}",
        'name_ur' => null,
        'chapter_number' => 1,
        'sort_id' => 1,
        'status' => 1,
        'created_by' => $creator->id,
    ]);

    return Question::create([
        'question_type_id' => $questionType->id,
        'topic_id' => null,
        'chapter_id' => $chapter->id,
        'statement_en' => 'What is the sample answer?',
        'statement_ur' => null,
        'description_en' => null,
        'description_ur' => null,
        'answer_en' => 'Sample answer.',
        'answer_ur' => null,
        'source' => 'exercise',
        'created_by' => $creator->id,
    ]);
}

it('renders the question types index page', function () {
    $admin = makeSuperAdmin();
    $questionType = makeQuestionType($admin, [
        'name' => 'MCQ',
        'heading_en' => 'Multiple Choice Questions',
    ]);

    $this->actingAs($admin)
        ->get(route('superadmin.question-types'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/question-types')
            ->has('questionTypes', 1)
            ->where('questionTypes.0.name', $questionType->name)
            ->where('questionTypes.0.heading_en', $questionType->heading_en),
        );
});

it('creates a question type and normalizes dependent fields', function () {
    $admin = makeSuperAdmin();
    $objectiveType = makeQuestionType($admin, [
        'name' => 'Objective Base',
        'heading_en' => 'Objective Base',
        'is_objective' => true,
    ]);

    $response = $this
        ->actingAs($admin)
        ->post(route('superadmin.question-types.store'), [
            'name' => 'Short Question',
            'name_ur' => null,
            'heading_en' => 'Short Question',
            'heading_ur' => null,
            'description_en' => null,
            'description_ur' => null,
            'have_answer' => true,
            'is_single' => false,
            'is_objective' => false,
            'schema_key' => 'subjective_standard',
            'status' => true,
        ]);

    $response->assertRedirect(route('superadmin.question-types'));

    $questionType = QuestionType::query()
        ->where('name', 'Short Question')
        ->sole();

    expect($questionType->schema_key)->toBe('subjective_standard')
        ->and($questionType->statement_label)->toBe('Prompt')
        ->and($questionType->description_label)->toBe('Guidance')
        ->and($questionType->objective_type_id)->toBeNull()
        ->and($questionType->column_per_row)->toBe(1);
});

it('updates a question type', function () {
    $admin = makeSuperAdmin();
    $objectiveType = makeQuestionType($admin, [
        'name' => 'Objective Parent',
        'heading_en' => 'Objective Parent',
        'is_objective' => true,
    ]);
    $questionType = makeQuestionType($admin, [
        'name' => 'Long Question',
        'heading_en' => 'Long Question',
        'have_description' => false,
        'description_label' => null,
    ]);

    $response = $this
        ->actingAs($admin)
        ->put(route('superadmin.question-types.update', $questionType), [
            'name' => 'Structured Question',
            'name_ur' => null,
            'heading_en' => 'Structured Response',
            'heading_ur' => null,
            'description_en' => 'Updated description.',
            'description_ur' => null,
            'have_answer' => false,
            'is_single' => true,
            'is_objective' => true,
            'schema_key' => 'objective_passage_mcq',
            'status' => false,
        ]);

    $response->assertRedirect(route('superadmin.question-types.objective.show', $questionType));

    $questionType->refresh();

    expect($questionType->name)->toBe('Structured Question')
        ->and($questionType->heading_en)->toBe('Structured Response')
        ->and($questionType->schema_key)->toBe('objective_passage_mcq')
        ->and($questionType->statement_label)->toBe('Passage')
        ->and($questionType->description_label)->toBeNull()
        ->and($questionType->is_single)->toBeTrue()
        ->and($questionType->is_objective)->toBeTrue()
        ->and($questionType->objective_type_id)->toBeNull()
        ->and($questionType->status)->toBe(0);
});

it('does not delete a question type that is already linked to questions', function () {
    $admin = makeSuperAdmin();
    $questionType = makeQuestionType($admin, [
        'name' => 'Protected Type',
        'heading_en' => 'Protected Type',
    ]);

    makeQuestion($admin, $questionType);

    $this->actingAs($admin)
        ->delete(route('superadmin.question-types.destroy', $questionType))
        ->assertRedirect(route('superadmin.question-types'))
        ->assertSessionHas('error');

    expect(QuestionType::query()->whereKey($questionType->id)->exists())->toBeTrue();
});

it('sorts only question types available in the selected scope and keeps kinds independent', function () {
    $admin = makeSuperAdmin();
    $first = makeQuestionType($admin, ['name' => 'First scoped subjective']);
    $second = makeQuestionType($admin, ['name' => 'Second scoped subjective']);
    $outside = makeQuestionType($admin, ['name' => 'Outside scoped subjective']);
    $objective = makeQuestionType($admin, [
        'name' => 'Scoped objective',
        'is_objective' => true,
        'schema_key' => 'objective_mcq',
    ]);

    $pattern = Pattern::create([
        'name' => 'Scoped Pattern',
        'short_name' => 'SP',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $class = SchoolClass::create([
        'name' => 'Scoped Class',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $subject = Subject::create([
        'name_eng' => 'Scoped Subject',
        'name_ur' => null,
        'subject_type' => 'chapter-wise',
        'status' => 1,
        'created_by' => $admin->id,
    ]);

    DB::table('pattern_classes')->insert([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
    ]);
    DB::table('class_subjects')->insert([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'medium_id' => null,
    ]);

    $chapter = Chapter::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'name' => 'Scoped Chapter',
        'chapter_number' => 1,
        'sort_id' => 1,
        'status' => 1,
        'created_by' => $admin->id,
    ]);

    foreach ([$first, $second, $objective] as $questionType) {
        Question::create([
            'question_type_id' => $questionType->id,
            'chapter_id' => $chapter->id,
            'statement_en' => 'Scoped question '.$questionType->id,
            'source' => Question::SOURCE_EXERCISE,
            'status' => 1,
            'created_by' => $admin->id,
        ]);
    }

    $otherClass = SchoolClass::create([
        'name' => 'Other Scoped Class',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    DB::table('pattern_classes')->insert([
        'pattern_id' => $pattern->id,
        'class_id' => $otherClass->id,
    ]);
    DB::table('class_subjects')->insert([
        'pattern_id' => $pattern->id,
        'class_id' => $otherClass->id,
        'subject_id' => $subject->id,
        'medium_id' => null,
    ]);
    $otherChapter = Chapter::create([
        'pattern_id' => $pattern->id,
        'class_id' => $otherClass->id,
        'subject_id' => $subject->id,
        'name' => 'Other Scoped Chapter',
        'chapter_number' => 1,
        'sort_id' => 1,
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    Question::create([
        'question_type_id' => $outside->id,
        'chapter_id' => $otherChapter->id,
        'statement_en' => 'Question available only in the other class',
        'source' => Question::SOURCE_EXERCISE,
        'status' => 1,
        'created_by' => $admin->id,
    ]);

    $scope = [
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
    ];
    $otherScope = [
        'pattern_id' => $pattern->id,
        'class_id' => $otherClass->id,
        'subject_id' => $subject->id,
    ];

    $this->actingAs($admin)
        ->get(route('superadmin.question-types.subjective', $scope))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('scopedQuestionTypes', 2)
            ->where('scopedQuestionTypes.0.id', $first->id)
            ->where('scopedQuestionTypes.1.id', $second->id)
            ->where('scopedOrderIds', [$first->id, $second->id]),
        );

    $this->actingAs($admin)
        ->get(route('superadmin.question-types.subjective', $otherScope))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('scopedQuestionTypes', 1)
            ->where('scopedQuestionTypes.0.id', $outside->id)
            ->where('scopedOrderIds', [$outside->id]),
        );

    $this->actingAs($admin)
        ->post(route('superadmin.question-types.reorder', ['kind' => 'subjective']), [
            ...$scope,
            'order' => [$second->id, $first->id],
        ])
        ->assertRedirect();

    $this->actingAs($admin)
        ->post(route('superadmin.question-types.reorder', ['kind' => 'objective']), [
            ...$scope,
            'order' => [$objective->id],
        ])
        ->assertRedirect();

    expect(QuestionTypeOrder::query()
        ->where($scope)
        ->whereIn('question_type_id', [$first->id, $second->id])
        ->orderBy('sort_order')
        ->pluck('question_type_id')
        ->all())->toBe([$second->id, $first->id])
        ->and(QuestionTypeOrder::query()
            ->where($scope)
            ->where('question_type_id', $objective->id)
            ->value('sort_order'))->toBe(1)
        ->and(QuestionTypeOrder::query()
            ->where($scope)
            ->where('question_type_id', $outside->id)
            ->exists())->toBeFalse();

    $this->actingAs($admin)
        ->get(route('superadmin.question-types.subjective', $scope))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('scopedOrderIds', [$second->id, $first->id]),
        );
});

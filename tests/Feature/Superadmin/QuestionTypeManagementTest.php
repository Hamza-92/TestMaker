<?php

use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
            'have_exercise' => true,
            'have_statement' => true,
            'statement_label' => '',
            'have_description' => true,
            'description_label' => '',
            'have_answer' => true,
            'is_single' => true,
            'is_objective' => false,
            'objective_type_id' => $objectiveType->id,
            'column_per_row' => 2,
            'status' => true,
        ]);

    $response->assertRedirect(route('superadmin.question-types'));

    $questionType = QuestionType::query()
        ->where('name', 'Short Question')
        ->sole();

    expect($questionType->statement_label)->toBe('Statement')
        ->and($questionType->description_label)->toBe('Description')
        ->and($questionType->objective_type_id)->toBeNull()
        ->and($questionType->column_per_row)->toBe(2);
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
            'have_exercise' => true,
            'have_statement' => true,
            'statement_label' => 'Prompt',
            'have_description' => true,
            'description_label' => 'Guidance',
            'have_answer' => true,
            'is_single' => false,
            'is_objective' => true,
            'objective_type_id' => $objectiveType->id,
            'column_per_row' => 3,
            'status' => false,
        ]);

    $response->assertRedirect(route('superadmin.question-types.show', $questionType));

    $questionType->refresh();

    expect($questionType->name)->toBe('Structured Question')
        ->and($questionType->heading_en)->toBe('Structured Response')
        ->and($questionType->description_label)->toBe('Guidance')
        ->and($questionType->is_single)->toBeFalse()
        ->and($questionType->is_objective)->toBeTrue()
        ->and($questionType->objective_type_id)->toBe($objectiveType->id)
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

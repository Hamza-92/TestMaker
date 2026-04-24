<?php

use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\QuestionType;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function makeQuestionAdmin(): User
{
    return User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
    ]);
}

function makeQuestionContextForManagement(User $creator): array
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

    return compact('pattern', 'class', 'subject', 'chapter');
}

function makeObjectiveQuestionTypeForManagement(User $creator, array $overrides = []): QuestionType
{
    $uuid = Str::lower((string) Str::uuid());

    return QuestionType::create(array_merge([
        'name' => "MCQ {$uuid}",
        'name_ur' => null,
        'heading_en' => "MCQ {$uuid}",
        'heading_ur' => null,
        'description_en' => null,
        'description_ur' => null,
        'have_exercise' => false,
        'have_statement' => true,
        'statement_label' => 'Statement',
        'have_description' => false,
        'description_label' => null,
        'have_answer' => false,
        'is_single' => true,
        'is_objective' => true,
        'objective_type_id' => null,
        'column_per_row' => 1,
        'status' => 1,
        'created_by' => $creator->id,
    ], $overrides));
}

it('creates an objective question with options', function () {
    $admin = makeQuestionAdmin();
    $questionType = makeObjectiveQuestionTypeForManagement($admin);
    $context = makeQuestionContextForManagement($admin);

    $response = $this
        ->actingAs($admin)
        ->post(route('superadmin.questions.store'), [
            'question_type_id' => $questionType->id,
            'chapter_id' => $context['chapter']->id,
            'topic_id' => null,
            'statement_en' => 'Choose the correct option',
            'statement_ur' => null,
            'description_en' => null,
            'description_ur' => null,
            'answer_en' => null,
            'answer_ur' => null,
            'source' => 'exercise',
            'status' => true,
            'options' => [
                ['text_en' => 'Option A', 'text_ur' => null, 'is_correct' => true],
                ['text_en' => 'Option B', 'text_ur' => null, 'is_correct' => false],
                ['text_en' => 'Option C', 'text_ur' => null, 'is_correct' => false],
            ],
        ]);

    $question = Question::query()->with('options')->sole();

    $response->assertRedirect(route('superadmin.questions.show', $question));

    expect($question->question_type_id)->toBe($questionType->id)
        ->and($question->statement_en)->toBe('Choose the correct option')
        ->and($question->answer_en)->toBeNull()
        ->and($question->options)->toHaveCount(3)
        ->and($question->options->where('is_correct', true))->toHaveCount(1)
        ->and($question->options->pluck('text_en')->all())->toBe([
            'Option A',
            'Option B',
            'Option C',
        ]);
});

it('updates an objective question and replaces its options', function () {
    $admin = makeQuestionAdmin();
    $questionType = makeObjectiveQuestionTypeForManagement($admin);
    $context = makeQuestionContextForManagement($admin);

    $question = Question::create([
        'question_type_id' => $questionType->id,
        'chapter_id' => $context['chapter']->id,
        'topic_id' => null,
        'statement_en' => 'Original prompt',
        'statement_ur' => null,
        'description_en' => null,
        'description_ur' => null,
        'answer_en' => null,
        'answer_ur' => null,
        'source' => 'exercise',
        'status' => 1,
        'created_by' => $admin->id,
    ]);

    $question->options()->createMany([
        ['text_en' => 'Old A', 'text_ur' => null, 'is_correct' => true, 'sort_order' => 1],
        ['text_en' => 'Old B', 'text_ur' => null, 'is_correct' => false, 'sort_order' => 2],
    ]);

    $response = $this
        ->actingAs($admin)
        ->put(route('superadmin.questions.update', $question), [
            'question_type_id' => $questionType->id,
            'chapter_id' => $context['chapter']->id,
            'topic_id' => null,
            'statement_en' => 'Updated prompt',
            'statement_ur' => null,
            'description_en' => null,
            'description_ur' => null,
            'answer_en' => null,
            'answer_ur' => null,
            'source' => 'past paper',
            'status' => false,
            'options' => [
                ['text_en' => 'New A', 'text_ur' => null, 'is_correct' => false],
                ['text_en' => 'New B', 'text_ur' => null, 'is_correct' => true],
                ['text_en' => 'New C', 'text_ur' => null, 'is_correct' => false],
                ['text_en' => 'New D', 'text_ur' => null, 'is_correct' => false],
            ],
        ]);

    $response->assertRedirect(route('superadmin.questions.show', $question));

    $question->refresh()->load('options');

    expect($question->statement_en)->toBe('Updated prompt')
        ->and($question->source)->toBe('past paper')
        ->and($question->status)->toBe(0)
        ->and($question->options)->toHaveCount(4)
        ->and($question->options->where('is_correct', true))->toHaveCount(1)
        ->and($question->options->firstWhere('is_correct', true)?->text_en)->toBe('New B')
        ->and(QuestionOption::query()->where('question_id', $question->id)->count())->toBe(4);
});

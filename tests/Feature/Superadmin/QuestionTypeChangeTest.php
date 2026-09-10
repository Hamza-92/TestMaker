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
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function makeTypeChangeAdmin(): User
{
    return User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
    ]);
}

function makeTypeChangeContext(User $admin, string $suffix): array
{
    $pattern = Pattern::create([
        'name' => "Pattern {$suffix}",
        'short_name' => "P{$suffix}",
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $class = SchoolClass::create([
        'name' => "Class {$suffix}",
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $subject = Subject::create([
        'name_eng' => "Subject {$suffix}",
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
        'name' => "Chapter {$suffix}",
        'chapter_number' => 1,
        'sort_id' => 1,
        'status' => 1,
        'created_by' => $admin->id,
    ]);

    return compact('pattern', 'class', 'subject', 'chapter');
}

function makeTypeChangeQuestionType(
    User $admin,
    string $name,
    string $schema = 'subjective_standard',
): QuestionType {
    return QuestionType::create([
        'name' => $name,
        'heading_en' => $name,
        'have_exercise' => false,
        'have_statement' => true,
        'have_description' => $schema === 'subjective_standard',
        'have_answer' => $schema === 'subjective_standard',
        'is_single' => $schema === 'objective_mcq',
        'is_objective' => str_starts_with($schema, 'objective_'),
        'schema_key' => $schema,
        'column_per_row' => 1,
        'status' => 1,
        'created_by' => $admin->id,
    ]);
}

function makeTypeChangeQuestion(
    User $admin,
    Chapter $chapter,
    QuestionType $type,
    string $text,
): Question {
    return Question::create([
        'question_type_id' => $type->id,
        'chapter_id' => $chapter->id,
        'statement_en' => $text,
        'source' => Question::SOURCE_EXERCISE,
        'status' => 1,
        'created_by' => $admin->id,
    ]);
}

it('changes the type of only the selected questions', function () {
    $admin = makeTypeChangeAdmin();
    $context = makeTypeChangeContext($admin, 'Selected');
    $source = makeTypeChangeQuestionType($admin, 'Short Questions AJK');
    $target = makeTypeChangeQuestionType($admin, 'Short Questions');
    $selected = makeTypeChangeQuestion($admin, $context['chapter'], $source, 'Selected question');
    $unselected = makeTypeChangeQuestion($admin, $context['chapter'], $source, 'Unselected question');

    $this->actingAs($admin)
        ->patch(route('superadmin.questions.type.update'), [
            'question_ids' => [$selected->id],
            'question_type_id' => $target->id,
        ])
        ->assertRedirect()
        ->assertSessionHas('success', '1 question type changed.');

    expect($selected->refresh()->question_type_id)->toBe($target->id)
        ->and($unselected->refresh()->question_type_id)->toBe($source->id);

    $this->assertDatabaseHas('audit_logs', [
        'auditable_type' => $selected->getMorphClass(),
        'auditable_id' => $selected->id,
        'event' => 'updated',
        'notes' => 'Question type changed in bulk.',
    ]);
});

it('rejects a bulk change to a different question structure', function () {
    $admin = makeTypeChangeAdmin();
    $context = makeTypeChangeContext($admin, 'Structure');
    $source = makeTypeChangeQuestionType($admin, 'Short Questions');
    $target = makeTypeChangeQuestionType($admin, 'MCQs', 'objective_mcq');
    $question = makeTypeChangeQuestion($admin, $context['chapter'], $source, 'Subjective question');

    $this->actingAs($admin)
        ->from(route('superadmin.questions'))
        ->patch(route('superadmin.questions.type.update'), [
            'question_ids' => [$question->id],
            'question_type_id' => $target->id,
        ])
        ->assertRedirect(route('superadmin.questions'))
        ->assertSessionHasErrors('question_type_id');

    expect($question->refresh()->question_type_id)->toBe($source->id);
});

it('lists scoped types and replaces a type only inside that scope', function () {
    $admin = makeTypeChangeAdmin();
    $scope = makeTypeChangeContext($admin, 'Inside');
    $outsideScope = makeTypeChangeContext($admin, 'Outside');
    $source = makeTypeChangeQuestionType($admin, 'Long Questions AJK');
    $target = makeTypeChangeQuestionType($admin, 'Long Questions');
    $insideOne = makeTypeChangeQuestion($admin, $scope['chapter'], $source, 'Inside one');
    $insideTwo = makeTypeChangeQuestion($admin, $scope['chapter'], $source, 'Inside two');
    $outside = makeTypeChangeQuestion($admin, $outsideScope['chapter'], $source, 'Outside');
    $params = [
        'pattern_id' => $scope['pattern']->id,
        'class_id' => $scope['class']->id,
        'subject_id' => $scope['subject']->id,
    ];

    $this->actingAs($admin)
        ->get(route('superadmin.question-types.change', $params))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/question-types/change')
            ->where('filters', $params)
            ->has('scopedTypes', 1)
            ->where('scopedTypes.0.id', $source->id)
            ->where('scopedTypes.0.questions_count', 2));

    $this->actingAs($admin)
        ->patch(route('superadmin.question-types.change.update'), [
            ...$params,
            'source_question_type_id' => $source->id,
            'question_type_id' => $target->id,
        ])
        ->assertRedirect(route('superadmin.question-types.change', $params))
        ->assertSessionHas('success', '2 question types changed.');

    expect($insideOne->refresh()->question_type_id)->toBe($target->id)
        ->and($insideTwo->refresh()->question_type_id)->toBe($target->id)
        ->and($outside->refresh()->question_type_id)->toBe($source->id);
});

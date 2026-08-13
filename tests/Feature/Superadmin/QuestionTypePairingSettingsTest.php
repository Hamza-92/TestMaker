<?php

use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\QuestionTypePairing;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function makePairingAdmin(): User
{
    return User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
    ]);
}

function makePairingQuestionType(User $admin, string $name, bool $objective = false): QuestionType
{
    return QuestionType::create([
        'name' => $name,
        'heading_en' => $name.' heading',
        'have_exercise' => false,
        'have_statement' => true,
        'have_description' => false,
        'have_answer' => true,
        'is_single' => true,
        'is_objective' => $objective,
        'schema_key' => $objective ? 'objective_mcq' : 'subjective_standard',
        'column_per_row' => 1,
        'status' => 1,
        'created_by' => $admin->id,
    ]);
}

function makePairingQuestion(
    User $admin,
    QuestionType $questionType,
    Chapter $chapter,
    string $statement,
): Question {
    return Question::create([
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'statement_en' => $statement,
        'source' => Question::SOURCE_EXERCISE,
        'status' => 1,
        'created_by' => $admin->id,
    ]);
}

function makePairingFixture(): array
{
    $admin = makePairingAdmin();
    $pattern = Pattern::create([
        'name' => 'Pairing Pattern',
        'short_name' => 'PAIR',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $class = SchoolClass::create([
        'name' => 'Pairing Class',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $otherClass = SchoolClass::create([
        'name' => 'Other Pairing Class',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $subject = Subject::create([
        'name_eng' => 'Pairing Subject',
        'subject_type' => 'chapter-wise',
        'status' => 1,
        'created_by' => $admin->id,
    ]);

    foreach ([$class, $otherClass] as $linkedClass) {
        DB::table('pattern_classes')->insert([
            'pattern_id' => $pattern->id,
            'class_id' => $linkedClass->id,
        ]);
        DB::table('class_subjects')->insert([
            'pattern_id' => $pattern->id,
            'class_id' => $linkedClass->id,
            'subject_id' => $subject->id,
            'medium_id' => null,
        ]);
    }

    $chapter = Chapter::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'name' => 'Pairing Chapter',
        'chapter_number' => 1,
        'sort_id' => 1,
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $otherChapter = Chapter::create([
        'pattern_id' => $pattern->id,
        'class_id' => $otherClass->id,
        'subject_id' => $subject->id,
        'name' => 'Other Pairing Chapter',
        'chapter_number' => 1,
        'sort_id' => 1,
        'status' => 1,
        'created_by' => $admin->id,
    ]);

    $first = makePairingQuestionType($admin, 'First Subjective Type');
    $second = makePairingQuestionType($admin, 'Second Subjective Type');
    $outside = makePairingQuestionType($admin, 'Other Class Subjective Type');
    $objective = makePairingQuestionType($admin, 'Objective Type', true);

    makePairingQuestion($admin, $first, $chapter, 'First subjective question');
    makePairingQuestion($admin, $second, $chapter, 'Second subjective question');
    makePairingQuestion($admin, $objective, $chapter, 'Objective question');
    makePairingQuestion($admin, $outside, $otherChapter, 'Other class question');

    return compact(
        'admin',
        'pattern',
        'class',
        'otherClass',
        'subject',
        'first',
        'second',
        'outside',
        'objective',
    );
}

it('shows only subjective question types available in the exact selected scope', function () {
    $fixture = makePairingFixture();
    $scope = [
        'pattern_id' => $fixture['pattern']->id,
        'class_id' => $fixture['class']->id,
        'subject_id' => $fixture['subject']->id,
    ];

    $this->actingAs($fixture['admin'])
        ->get(route('superadmin.question-type-pairings', $scope))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/question-type-pairings')
            ->where('selectedScope', $scope)
            ->has('questionTypes', 2)
            ->where('questionTypes.0.id', $fixture['first']->id)
            ->where('questionTypes.1.id', $fixture['second']->id)
            ->has('pairings', 0),
        );

    $otherScope = [
        'pattern_id' => $fixture['pattern']->id,
        'class_id' => $fixture['otherClass']->id,
        'subject_id' => $fixture['subject']->id,
    ];

    $this->actingAs($fixture['admin'])
        ->get(route('superadmin.question-type-pairings', $otherScope))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('selectedScope', $otherScope)
            ->has('questionTypes', 1)
            ->where('questionTypes.0.id', $fixture['outside']->id),
        );
});

it('normalizes bidirectional pairs and rejects duplicate or invalid pairings', function () {
    $fixture = makePairingFixture();
    $scope = [
        'pattern_id' => $fixture['pattern']->id,
        'class_id' => $fixture['class']->id,
        'subject_id' => $fixture['subject']->id,
    ];

    $this->actingAs($fixture['admin'])
        ->post(route('superadmin.question-type-pairings.store'), [
            ...$scope,
            'question_type_a_id' => $fixture['second']->id,
            'question_type_b_id' => $fixture['first']->id,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $pairing = QuestionTypePairing::query()->sole();
    expect($pairing->question_type_a_id)->toBe(min($fixture['first']->id, $fixture['second']->id))
        ->and($pairing->question_type_b_id)->toBe(max($fixture['first']->id, $fixture['second']->id))
        ->and($pairing->is_active)->toBeTrue();

    $this->actingAs($fixture['admin'])
        ->from(route('superadmin.question-type-pairings', $scope))
        ->post(route('superadmin.question-type-pairings.store'), [
            ...$scope,
            'question_type_a_id' => $fixture['first']->id,
            'question_type_b_id' => $fixture['second']->id,
        ])
        ->assertSessionHasErrors('question_type_b_id');

    $this->actingAs($fixture['admin'])
        ->from(route('superadmin.question-type-pairings', $scope))
        ->post(route('superadmin.question-type-pairings.store'), [
            ...$scope,
            'question_type_a_id' => $fixture['first']->id,
            'question_type_b_id' => $fixture['objective']->id,
        ])
        ->assertSessionHasErrors('question_type_b_id');

    $this->actingAs($fixture['admin'])
        ->from(route('superadmin.question-type-pairings', $scope))
        ->post(route('superadmin.question-type-pairings.store'), [
            ...$scope,
            'question_type_a_id' => $fixture['first']->id,
            'question_type_b_id' => $fixture['outside']->id,
        ])
        ->assertSessionHasErrors('question_type_b_id');

    expect(QuestionTypePairing::query()->count())->toBe(1);
});

it('supports safe activation, deactivation, and removal', function () {
    $fixture = makePairingFixture();
    $pairing = QuestionTypePairing::create([
        'pattern_id' => $fixture['pattern']->id,
        'class_id' => $fixture['class']->id,
        'subject_id' => $fixture['subject']->id,
        'question_type_a_id' => min($fixture['first']->id, $fixture['second']->id),
        'question_type_b_id' => max($fixture['first']->id, $fixture['second']->id),
        'is_active' => true,
        'created_by' => $fixture['admin']->id,
    ]);

    $this->actingAs($fixture['admin'])
        ->patch(route('superadmin.question-type-pairings.update', $pairing), [
            'is_active' => false,
        ])
        ->assertRedirect();

    expect($pairing->fresh()->is_active)->toBeFalse();

    $fixture['second']->update(['status' => 0]);
    $this->actingAs($fixture['admin'])
        ->from(route('superadmin.question-type-pairings'))
        ->patch(route('superadmin.question-type-pairings.update', $pairing), [
            'is_active' => true,
        ])
        ->assertSessionHasErrors('is_active');

    expect($pairing->fresh()->is_active)->toBeFalse();

    $this->actingAs($fixture['admin'])
        ->delete(route('superadmin.question-type-pairings.destroy', $pairing))
        ->assertRedirect()
        ->assertSessionHas('success');

    expect(QuestionTypePairing::query()->whereKey($pairing->id)->exists())->toBeFalse();
});

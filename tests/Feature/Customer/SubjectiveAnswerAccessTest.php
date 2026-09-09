<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Subscription;
use App\Models\TrialSetting;
use App\Models\User;
use App\Support\SubjectiveAnswerAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function subjectiveAnswerCustomer(): User
{
    return User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);
}

function subjectiveAnswerQuestionScope(): array
{
    $pattern = Pattern::create([
        'name' => 'Answer Access Pattern',
        'short_name' => 'AAP',
        'status' => 1,
    ]);
    $class = SchoolClass::create([
        'name' => 'Answer Access Class',
        'status' => 1,
    ]);
    $subject = Subject::create([
        'name_eng' => 'Answer Access Subject',
        'subject_type' => 'chapter-wise',
        'status' => 1,
    ]);
    $chapter = Chapter::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'name' => 'Answer Access Chapter',
        'chapter_number' => 1,
        'sort_id' => 1,
        'status' => 1,
    ]);
    $questionType = QuestionType::create([
        'name' => 'Short Questions',
        'heading_en' => 'Answer the following questions.',
        'have_exercise' => false,
        'have_statement' => true,
        'have_description' => false,
        'have_answer' => true,
        'is_single' => true,
        'is_objective' => false,
        'schema_key' => 'subjective_standard',
        'column_per_row' => 1,
        'status' => 1,
    ]);
    $question = Question::create([
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'statement_en' => 'What is velocity?',
        'answer_en' => 'Velocity is displacement per unit time.',
        'content' => [
            'statement_en' => 'What is velocity?',
            'answer_en' => 'Velocity is displacement per unit time.',
        ],
        'source' => Question::SOURCE_EXERCISE,
        'status' => 1,
    ]);

    return [$chapter, $questionType, $question];
}

test('trial setting controls subjective answer access on the paper generator', function () {
    $customer = subjectiveAnswerCustomer();
    $trialSetting = TrialSetting::current();
    $trialSetting->update([
        'access_scope' => null,
        'allow_subjective_answers' => false,
    ]);

    $this->actingAs($customer)
        ->get(route('customer.papers.generate'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('customer/papers/generate')
            ->where('canViewSubjectiveAnswers', false));

    $trialSetting->update(['allow_subjective_answers' => true]);

    $this->actingAs($customer)
        ->get(route('customer.papers.generate'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('customer/papers/generate')
            ->where('canViewSubjectiveAnswers', true));
});

test('subjective answers are removed from question responses without access', function () {
    $customer = subjectiveAnswerCustomer();
    [$chapter, $questionType] = subjectiveAnswerQuestionScope();
    TrialSetting::current()->update([
        'access_scope' => null,
        'allow_subjective_answers' => false,
    ]);

    $this->actingAs($customer)
        ->getJson(route('customer.papers.generate.questions', [
            'chapter_ids' => [$chapter->id],
            'sources' => [Question::SOURCE_EXERCISE],
            'question_type_id' => $questionType->id,
        ]))
        ->assertOk()
        ->assertJsonPath('questions.0.summaryTextEn', 'What is velocity?')
        ->assertJsonPath('questions.0.content.answer_en', null);
});

test('subjective answers are returned when trial access is enabled', function () {
    $customer = subjectiveAnswerCustomer();
    [$chapter, $questionType] = subjectiveAnswerQuestionScope();
    TrialSetting::current()->update([
        'access_scope' => null,
        'allow_subjective_answers' => true,
    ]);

    $this->actingAs($customer)
        ->getJson(route('customer.papers.generate.questions', [
            'chapter_ids' => [$chapter->id],
            'sources' => [Question::SOURCE_EXERCISE],
            'question_type_id' => $questionType->id,
        ]))
        ->assertOk()
        ->assertJsonPath(
            'questions.0.content.answer_en',
            'Velocity is displacement per unit time.',
        );
});

test('an active subscription overrides the trial subjective answer setting', function () {
    $customer = subjectiveAnswerCustomer();
    TrialSetting::current()->update(['allow_subjective_answers' => true]);
    $subscription = Subscription::create([
        'user_id' => $customer->id,
        'name' => 'Restricted Answers Plan',
        'allowed_questions' => null,
        'amount' => 0,
        'started_at' => now(),
        'duration' => 30,
        'expired_at' => now()->addDays(30),
        'status' => 'active',
        'allow_subjective_answers' => false,
    ]);

    expect(SubjectiveAnswerAccess::allows($customer))->toBeFalse();

    $subscription->update(['allow_subjective_answers' => true]);

    expect(SubjectiveAnswerAccess::allows($customer))->toBeTrue();
});

test('saved subjective answer data is redacted for users without access', function () {
    $paperData = [
        'paper' => [
            'sections' => [[
                'category' => 'Subjective Questions',
                'questions' => [[
                    'answerText' => 'A protected answer',
                    'options' => [['text' => 'Choice', 'isCorrect' => true]],
                ]],
                'multipart' => [
                    'rows' => [[
                        'parts' => [[
                            'question' => ['answerText' => 'A multipart answer'],
                        ]],
                    ]],
                ],
            ]],
        ],
        'questionPoolsByType' => [
            10 => [[
                'isObjective' => false,
                'content' => [
                    'answer_en' => 'A pool answer',
                    'items' => [[
                        'answer_ur' => 'جواب',
                        'is_correct' => true,
                    ]],
                ],
            ]],
        ],
    ];

    $redacted = SubjectiveAnswerAccess::redactPaperData($paperData);

    expect(data_get($redacted, 'paper.sections.0.questions.0.answerText'))->toBeNull()
        ->and(data_get($redacted, 'paper.sections.0.questions.0.options.0.isCorrect'))->toBeFalse()
        ->and(data_get($redacted, 'paper.sections.0.multipart.rows.0.parts.0.question.answerText'))->toBeNull()
        ->and(data_get($redacted, 'questionPoolsByType.10.0.content.answer_en'))->toBeNull()
        ->and(data_get($redacted, 'questionPoolsByType.10.0.content.items.0.answer_ur'))->toBeNull()
        ->and(data_get($redacted, 'questionPoolsByType.10.0.content.items.0.is_correct'))->toBeNull();
});

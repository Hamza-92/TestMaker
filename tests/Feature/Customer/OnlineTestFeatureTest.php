<?php

use App\Enums\UserType;
use App\Models\OnlineTest;
use App\Models\OnlineTestAttempt;
use App\Models\OnlineTestQuestion;
use App\Models\Pattern;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function inertiaHeaders(): array
{
    return [
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
    ];
}

function makeCustomerOwner(): User
{
    return User::factory()->create([
        'user_type' => UserType::Customer->value,
        'account_type' => 'paid',
    ]);
}

function makeOnlineTestSubscription(User $customer, array $overrides = []): Subscription
{
    return Subscription::create(array_merge([
        'user_id' => $customer->id,
        'name' => 'Premium',
        'pattern_access' => null,
        'class_access' => null,
        'subject_access' => null,
        'access_scope' => null,
        'allow_teachers' => false,
        'allow_online_mcq_tests' => false,
        'max_teachers' => null,
        'is_question_based' => false,
        'allowed_questions' => null,
        'amount' => '2000.00',
        'started_at' => Carbon::parse('2026-07-01')->startOfDay(),
        'duration' => 30,
        'expired_at' => Carbon::parse('2026-07-31')->startOfDay(),
        'status' => 'active',
        'created_by' => $customer->id,
    ], $overrides));
}

it('blocks customer online tests when the subscription add-on is disabled', function () {
    $customer = makeCustomerOwner();
    makeOnlineTestSubscription($customer, [
        'allow_online_mcq_tests' => false,
    ]);

    $this->actingAs($customer)
        ->getJson('/online-tests/catalog/chapters?pattern_id=1&class_id=1&subject_id=1')
        ->assertStatus(403);
});

it('allows customer online tests when the subscription add-on is enabled', function () {
    $customer = makeCustomerOwner();
    $pattern = Pattern::create([
        'name' => 'Board Access',
        'short_name' => 'BA',
        'status' => 1,
        'created_by' => $customer->id,
    ]);
    $class = SchoolClass::create([
        'name' => 'Class 9',
        'status' => 1,
        'created_by' => $customer->id,
    ]);
    $subject = Subject::create([
        'name_eng' => 'Math',
        'name_ur' => 'Math',
        'subject_type' => 'chapter-wise',
        'status' => 1,
        'created_by' => $customer->id,
    ]);

    DB::table('pattern_classes')->insert([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
    ]);

    DB::table('class_subjects')->insert([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
    ]);

    makeOnlineTestSubscription($customer, [
        'allow_online_mcq_tests' => true,
    ]);

    $this->actingAs($customer)
        ->getJson("/online-tests/catalog/chapters?pattern_id={$pattern->id}&class_id={$class->id}&subject_id={$subject->id}")
        ->assertOk();
});

it('lets a student start and submit a published online mcq test', function () {
    $owner = makeCustomerOwner();
    $pattern = Pattern::create([
        'name' => 'Board',
        'short_name' => 'BRD',
        'status' => 1,
        'created_by' => $owner->id,
    ]);
    $class = SchoolClass::create([
        'name' => 'Class 10',
        'status' => 1,
        'created_by' => $owner->id,
    ]);
    $subject = Subject::create([
        'name_eng' => 'Physics',
        'name_ur' => 'Physics',
        'subject_type' => 'chapter-wise',
        'status' => 1,
        'created_by' => $owner->id,
    ]);

    $test = OnlineTest::create([
        'school_id' => $owner->id,
        'created_by' => $owner->id,
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'title' => 'Entry Test',
        'instructions' => 'Answer all questions.',
        'duration_minutes' => 30,
        'focus_loss_action' => 'warn',
        'status' => 'published',
        'share_token' => 'test-token-123',
        'published_at' => now(),
    ]);

    $onlineTestQuestion = OnlineTestQuestion::create([
        'online_test_id' => $test->id,
        'question_id' => null,
        'question_type_id' => null,
        'chapter_id' => null,
        'topic_id' => null,
        'payload' => [
            'prompt_en' => 'What is 2 + 2?',
            'prompt_ur' => null,
            'options' => [
                ['key' => '1', 'label' => 'A', 'text_en' => '3', 'text_ur' => null],
                ['key' => '2', 'label' => 'B', 'text_en' => '4', 'text_ur' => null],
                ['key' => '3', 'label' => 'C', 'text_en' => '5', 'text_ur' => null],
            ],
        ],
        'correct_option_key' => '2',
        'marks' => 1,
        'sort_order' => 1,
    ]);

    $startResponse = $this->post('/take-test/test-token-123/start', [
        'student_name' => 'Ali Khan',
        'student_class' => '10th',
        'roll_number' => 'R-101',
    ]);

    $attempt = OnlineTestAttempt::query()->sole();

    $startResponse->assertRedirect("/take-test/attempt/{$attempt->attempt_token}");

    $this->get("/take-test/attempt/{$attempt->attempt_token}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('online-tests/attempt')
            ->missing('attempt.focus_loss_count'));

    $this->post("/take-test/attempt/{$attempt->attempt_token}/focus-loss")
        ->assertRedirect("/take-test/attempt/{$attempt->attempt_token}");

    $attempt->refresh();

    expect($attempt->focus_loss_count)->toBe(1)
        ->and($attempt->status)->toBe('in_progress');

    $this->post("/take-test/attempt/{$attempt->attempt_token}/answer", [
        'question_id' => $onlineTestQuestion->id,
        'selected_option_key' => '2',
    ])->assertRedirect("/take-test/attempt/{$attempt->attempt_token}/complete");

    $attempt->refresh();

    expect($attempt->status)->toBe('submitted')
        ->and($attempt->score)->toBe(1)
        ->and($attempt->current_index)->toBe(1)
        ->and($attempt->submitted_at)->not()->toBeNull();
});

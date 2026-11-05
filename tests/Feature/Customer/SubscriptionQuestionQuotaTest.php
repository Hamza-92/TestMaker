<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Paper;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function quotaCustomer(int $allowed = 5, ?int $remaining = null): User
{
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Paid->value,
    ]);

    Subscription::create([
        'user_id' => $customer->id,
        'name' => 'Primary',
        'is_question_based' => true,
        'allowed_questions' => $allowed,
        'remaining_questions' => $remaining,
        'amount' => 0,
        'started_at' => now()->subDay(),
        'duration' => 30,
        'expired_at' => now()->addDays(29),
        'status' => 'active',
        'created_by' => $customer->id,
    ]);

    return $customer;
}

test('generation deducts once and reports the shared balance on dashboard and profile', function () {
    $customer = quotaCustomer(5, 4);
    $sections = [['questions' => [['id' => 'one'], ['id' => 'two']]]];

    $this->actingAs($customer)->postJson(route('customer.papers.generate.charge'), [
        'generation_key' => 'paper_test_one', 'sections' => $sections,
    ])->assertOk()->assertJsonPath('quota.remaining', 2);

    $this->actingAs($customer)->postJson(route('customer.papers.generate.charge'), [
        'generation_key' => 'paper_test_one', 'sections' => $sections,
    ])->assertOk()->assertJsonPath('quota.remaining', 2);

    $this->actingAs($customer)->get(route('dashboard'))->assertInertia(fn (Assert $page) => $page
        ->component('customer/dashboard-view')->where('school.question_quota.remaining', 2));
    $this->actingAs($customer)->get(route('customer.profile'))->assertInertia(fn (Assert $page) => $page
        ->component('customer/profile')->where('questionQuota.remaining', 2));
});

test('generation stops before exceeding the remaining balance', function () {
    $customer = quotaCustomer(5, 1);

    $this->actingAs($customer)->postJson(route('customer.papers.generate.charge'), [
        'generation_key' => 'paper_test_too_many',
        'sections' => [['questions' => [['id' => 'one'], ['id' => 'two']]]],
    ])->assertUnprocessable()->assertJsonValidationErrors('paper');

    expect($customer->activeSchoolSubscription()->fresh()->remaining_questions)->toBe(1);
});

test('saving a generated paper does not charge it again and multipart parts count', function () {
    $customer = quotaCustomer(5, 5);
    $sections = [[
        'questions' => [],
        'multipart' => ['rows' => [['parts' => [['question' => ['id' => 1]], ['question' => ['id' => 2]]]]]],
    ]];
    $this->actingAs($customer)->postJson(route('customer.papers.generate.charge'), [
        'generation_key' => 'paper_test_multipart', 'sections' => $sections,
    ])->assertOk()->assertJsonPath('quota.remaining', 3);

    $payload = [
        'name' => 'Multipart paper', 'total_marks' => 10, 'is_draft' => false,
        'paper_data' => ['paper' => ['id' => 'paper_test_multipart', 'sections' => $sections]],
    ];
    $this->actingAs($customer)->postJson(route('customer.papers.store'), $payload)->assertCreated();
    $this->actingAs($customer)->postJson(route('customer.papers.store'), $payload)->assertCreated();

    expect($customer->activeSchoolSubscription()->fresh()->remaining_questions)->toBe(3)
        ->and(Paper::query()->where('user_id', $customer->id)->count())->toBe(1);
});

test('saving more questions than the generated preview charges the difference', function () {
    $customer = quotaCustomer(5, 5);
    $this->actingAs($customer)->postJson(route('customer.papers.generate.charge'), [
        'generation_key' => 'paper_test_expanded',
        'sections' => [['questions' => [['id' => 'one']]]],
    ])->assertOk()->assertJsonPath('quota.remaining', 4);

    $this->actingAs($customer)->postJson(route('customer.papers.store'), [
        'name' => 'Expanded paper', 'total_marks' => 10, 'is_draft' => false,
        'paper_data' => ['paper' => [
            'id' => 'paper_test_expanded',
            'sections' => [['questions' => [['id' => 'one'], ['id' => 'two'], ['id' => 'three']]]],
        ]],
    ])->assertCreated();

    expect($customer->activeSchoolSubscription()->fresh()->remaining_questions)->toBe(2);
});

test('a teacher uses the school question balance and an existing null balance starts at the allowed total', function () {
    $school = quotaCustomer(4);
    $teacher = User::factory()->create([
        'user_type' => UserType::Teacher->value,
        'status' => UserStatus::Active->value,
        'school_id' => $school->id,
        'teacher_permissions' => ['generate_papers'],
    ]);

    $this->actingAs($teacher)->postJson(route('customer.papers.generate.charge'), [
        'generation_key' => 'paper_teacher_one',
        'sections' => [['questions' => [['id' => 'one']]]],
    ])->assertOk()->assertJsonPath('quota.remaining', 3);

    expect($school->activeSchoolSubscription()->fresh()->remaining_questions)->toBe(3);
});

test('the superadmin customer profile receives the remaining balance for its subscription card', function () {
    $customer = quotaCustomer(12, 7);
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);

    $this->actingAs($admin)->get(route('superadmin.customers.show', $customer))
        ->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/customers/show')
            ->where('customer.subscriptions.0.is_question_based', true)
            ->where('customer.subscriptions.0.allowed_questions', 12)
            ->where('customer.subscriptions.0.remaining_questions', 7));
});

test('zero allowed questions remains unlimited as in the old TestMaker', function () {
    $customer = quotaCustomer(0, 0);

    $this->actingAs($customer)->postJson(route('customer.papers.generate.charge'), [
        'generation_key' => 'paper_unlimited',
        'sections' => [['questions' => [['id' => 'one']]]],
    ])->assertOk()->assertJsonPath('quota', null);

    expect($customer->activeSchoolSubscription()->fresh()->remaining_questions)->toBe(0);
});

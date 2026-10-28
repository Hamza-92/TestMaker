<?php

use App\Enums\PaymentStatus;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\PaymentLog;
use App\Models\Subscription;
use App\Models\User;
use App\Support\CustomerPaymentAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function paymentDueFixture(string $dueDate, string $amount = '1000.00'): array
{
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin]);
    $customer = User::factory()->create(['user_type' => UserType::Customer, 'account_type' => 'paid']);
    $subscription = Subscription::create([
        'user_id' => $customer->id,
        'name' => 'School Plan',
        'amount' => $amount,
        'started_at' => now()->subMonth(),
        'expired_at' => now()->addMonth(),
        'payment_due_date' => $dueDate,
        'duration' => 60,
        'status' => 'active',
        'created_by' => $admin->id,
    ]);

    return [$admin, $customer, $subscription];
}

test('paid subscriptions may omit a due date but provided dates must be before expiry', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin]);
    $customer = User::factory()->create(['user_type' => UserType::Customer, 'account_type' => 'paid']);
    $payload = [
        'name' => 'Primary',
        'amount' => 1000,
        'started_at' => now()->toDateString(),
        'expired_at' => now()->addMonth()->toDateString(),
        'status' => 'active',
    ];

    $this->actingAs($admin)->post(route('superadmin.customers.subscriptions.store', $customer), $payload)
        ->assertSessionHasNoErrors();

    expect(Subscription::query()->sole()->payment_due_date)->toBeNull();

    $this->actingAs($admin)->post(route('superadmin.customers.subscriptions.store', $customer), [
        ...$payload,
        'payment_due_date' => now()->addMonths(2)->toDateString(),
    ])->assertSessionHasErrors('payment_due_date');

    expect(Subscription::count())->toBe(1);
});

test('due date is inclusive and pending payments do not clear a hold', function () {
    [$admin, $customer, $subscription] = paymentDueFixture(now('Asia/Karachi')->toDateString());
    $access = app(CustomerPaymentAccess::class);

    expect($access->syncCustomer($customer))->toBeFalse();

    $subscription->update(['payment_due_date' => now('Asia/Karachi')->subDay()->toDateString()]);
    PaymentLog::create([
        'subscription_id' => $subscription->id,
        'amount' => 1000,
        'payment_method' => 'online',
        'status' => PaymentStatus::PendingReview,
        'created_by' => $admin->id,
    ]);

    expect($access->syncCustomer($customer))->toBeTrue()
        ->and($customer->fresh()->payment_hold_at)->not->toBeNull();
});

test('an overdue customer and school teacher cannot continue authenticated sessions', function () {
    [, $customer] = paymentDueFixture(now('Asia/Karachi')->subDay()->toDateString());
    $teacher = User::factory()->create(['user_type' => UserType::Teacher, 'school_id' => $customer->id]);

    $this->actingAs($customer)->get(route('dashboard'))->assertRedirect(route('login'));
    $this->assertGuest();

    $this->actingAs($teacher)->get(route('dashboard'))->assertRedirect(route('login'));
    $this->assertGuest();

    $this->post(route('login.store'), ['email' => $customer->email, 'password' => 'password'])
        ->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('approval or a due date extension clears only the payment hold', function () {
    [$admin, $customer, $subscription] = paymentDueFixture(now('Asia/Karachi')->subDay()->toDateString());
    $customer->forceFill(['status' => UserStatus::Suspended])->save();
    $access = app(CustomerPaymentAccess::class);

    expect($access->syncCustomer($customer))->toBeTrue();

    PaymentLog::create([
        'subscription_id' => $subscription->id,
        'amount' => 1000,
        'payment_method' => 'online',
        'status' => PaymentStatus::Approved,
        'created_by' => $admin->id,
    ]);

    expect($access->syncCustomer($customer))->toBeFalse()
        ->and($customer->fresh()->payment_hold_at)->toBeNull()
        ->and($customer->fresh()->status)->toBe(UserStatus::Suspended);

    [, $otherCustomer, $otherSubscription] = paymentDueFixture(now('Asia/Karachi')->subDay()->toDateString());
    expect($access->syncCustomer($otherCustomer))->toBeTrue();

    $otherSubscription->update(['payment_due_date' => now('Asia/Karachi')->addWeek()->toDateString()]);
    expect($access->syncCustomer($otherCustomer))->toBeFalse()
        ->and($otherCustomer->fresh()->payment_hold_at)->toBeNull();
});

test('the sync command updates overdue accounts before they visit', function () {
    [, $customer] = paymentDueFixture(now('Asia/Karachi')->subDay()->toDateString());

    $this->artisan('subscriptions:sync-payment-holds')->assertSuccessful();

    expect($customer->fresh()->payment_hold_at)->not->toBeNull();
});

test('subscription edits cannot move the cutoff before an outstanding next payment date', function () {
    [$admin, $customer, $subscription] = paymentDueFixture(now('Asia/Karachi')->addWeek()->toDateString());
    PaymentLog::create([
        'subscription_id' => $subscription->id,
        'amount' => 500,
        'payment_method' => 'online',
        'next_payment_date' => now('Asia/Karachi')->addDays(5)->toDateString(),
        'status' => PaymentStatus::PendingReview,
        'created_by' => $admin->id,
    ]);

    $this->actingAs($admin)->put(route('superadmin.customers.subscriptions.update', [$customer, $subscription]), [
        'name' => $subscription->name,
        'amount' => 1000,
        'started_at' => $subscription->started_at->toDateString(),
        'expired_at' => $subscription->expired_at->toDateString(),
        'payment_due_date' => now('Asia/Karachi')->addDays(4)->toDateString(),
        'status' => 'active',
    ])->assertSessionHasErrors('payment_due_date');
});

test('editing a subscription does not require a payment due date', function () {
    [$admin, $customer, $subscription] = paymentDueFixture(now('Asia/Karachi')->addWeek()->toDateString());

    $this->actingAs($admin)->put(route('superadmin.customers.subscriptions.update', [$customer, $subscription]), [
        'name' => 'Elementary',
        'amount' => 1000,
        'started_at' => $subscription->started_at->toDateString(),
        'expired_at' => $subscription->expired_at->toDateString(),
        'payment_due_date' => '',
        'status' => 'active',
    ])->assertSessionHasNoErrors();

    expect($subscription->fresh()->name)->toBe('Elementary')
        ->and($subscription->fresh()->payment_due_date)->toBeNull();
});

test('approving the full payment directly removes the access hold', function () {
    [$admin, $customer, $subscription] = paymentDueFixture(now('Asia/Karachi')->subDay()->toDateString());
    $payment = PaymentLog::create([
        'subscription_id' => $subscription->id,
        'amount' => 1000,
        'payment_method' => 'online',
        'status' => PaymentStatus::PendingReview,
        'created_by' => $admin->id,
    ]);

    app(CustomerPaymentAccess::class)->syncCustomer($customer);
    expect($customer->fresh()->payment_hold_at)->not->toBeNull();

    $route = route('superadmin.customers.subscriptions.payment-logs.review', [$customer, $subscription, $payment]);
    $this->actingAs($admin)->patch($route, ['status' => PaymentStatus::Approved->value])->assertSessionHasNoErrors();
    expect($customer->fresh()->payment_hold_at)->toBeNull();
});

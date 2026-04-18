<?php

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\UserType;
use App\Models\PaymentLog;
use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeSuperAdmin(): User
{
    return User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
    ]);
}

function makeCustomer(): User
{
    return User::factory()->create([
        'user_type' => UserType::Customer->value,
    ]);
}

function makeSubscription(User $customer, User $creator, array $overrides = []): Subscription
{
    return Subscription::create(array_merge([
        'user_id' => $customer->id,
        'name' => 'Starter Plan',
        'pattern_access' => null,
        'class_access' => null,
        'subject_access' => null,
        'access_scope' => null,
        'allow_teachers' => false,
        'max_teachers' => null,
        'allowed_questions' => 100,
        'amount' => '1000.00',
        'started_at' => Carbon::parse('2026-04-18')->startOfDay(),
        'duration' => 30,
        'expired_at' => Carbon::parse('2026-05-18')->startOfDay(),
        'status' => 'active',
        'created_by' => $creator->id,
    ], $overrides));
}

function makePaymentLog(Subscription $subscription, User $creator, array $overrides = []): PaymentLog
{
    return PaymentLog::create(array_merge([
        'subscription_id' => $subscription->id,
        'amount' => '300.00',
        'payment_method' => PaymentMethod::Online->value,
        'account_number' => 'TXN-1001',
        'status' => PaymentStatus::PendingReview->value,
        'attachments' => null,
        'notes' => 'Initial receipt',
        'rejection_reason' => null,
        'created_by' => $creator->id,
    ], $overrides));
}

it('creates a subscription without auto-creating a payment record', function () {
    $admin = makeSuperAdmin();
    $customer = makeCustomer();

    $response = $this
        ->actingAs($admin)
        ->post(route('superadmin.customers.subscriptions.store', $customer), [
            'name' => 'Starter Plan',
            'amount' => '1200',
            'allowed_questions' => 250,
            'started_at' => '2026-04-18',
            'duration' => 30,
            'status' => 'active',
            'access_scope' => null,
            'allow_teachers' => false,
        ]);

    $subscription = Subscription::query()->sole();

    $response->assertRedirect(route('superadmin.customers.subscriptions.show', [$customer, $subscription]));

    expect(PaymentLog::count())->toBe(0);
});

it('stores subscription payments in pending review status', function () {
    $admin = makeSuperAdmin();
    $customer = makeCustomer();
    $subscription = makeSubscription($customer, $admin);

    $response = $this
        ->actingAs($admin)
        ->from(route('superadmin.customers.subscriptions.show', [$customer, $subscription]))
        ->post(route('superadmin.customers.subscriptions.payment-logs.store', [$customer, $subscription]), [
            'amount' => '400',
            'payment_method' => PaymentMethod::Online->value,
            'account_number' => 'TXN-2002',
            'status' => PaymentStatus::Approved->value,
            'notes' => 'Uploaded by admin',
        ]);

    $response->assertSessionHasNoErrors();

    $payment = PaymentLog::query()->sole();

    expect($payment->status)->toBe(PaymentStatus::PendingReview)
        ->and($payment->payment_method)->toBe(PaymentMethod::Online)
        ->and((string) $payment->amount)->toBe('400.00');
});

it('enforces stepwise payment status transitions', function () {
    $admin = makeSuperAdmin();
    $customer = makeCustomer();
    $subscription = makeSubscription($customer, $admin);
    $payment = makePaymentLog($subscription, $admin);

    $this
        ->actingAs($admin)
        ->from(route('superadmin.customers.subscriptions.show', [$customer, $subscription]))
        ->patch(route('superadmin.customers.subscriptions.payment-logs.review', [$customer, $subscription, $payment]), [
            'status' => PaymentStatus::Approved->value,
        ])
        ->assertSessionHasErrors('status');

    expect($payment->fresh()->status)->toBe(PaymentStatus::PendingReview);

    $this
        ->actingAs($admin)
        ->from(route('superadmin.customers.subscriptions.show', [$customer, $subscription]))
        ->patch(route('superadmin.customers.subscriptions.payment-logs.review', [$customer, $subscription, $payment]), [
            'status' => PaymentStatus::Reviewed->value,
        ])
        ->assertSessionHasNoErrors();

    expect($payment->fresh()->status)->toBe(PaymentStatus::Reviewed);

    $this
        ->actingAs($admin)
        ->from(route('superadmin.customers.subscriptions.show', [$customer, $subscription]))
        ->patch(route('superadmin.customers.subscriptions.payment-logs.review', [$customer, $subscription, $payment]), [
            'status' => PaymentStatus::Approved->value,
        ])
        ->assertSessionHasNoErrors();

    $payment->refresh();

    expect($payment->status)->toBe(PaymentStatus::Approved)
        ->and($payment->reviewed_by)->toBe($admin->id)
        ->and($payment->reviewed_at)->not()->toBeNull();
});

it('requires a rejection reason before rejecting a reviewed payment', function () {
    $admin = makeSuperAdmin();
    $customer = makeCustomer();
    $subscription = makeSubscription($customer, $admin);
    $payment = makePaymentLog($subscription, $admin, [
        'status' => PaymentStatus::Reviewed->value,
        'reviewed_by' => $admin->id,
        'reviewed_at' => now(),
    ]);

    $this
        ->actingAs($admin)
        ->from(route('superadmin.customers.subscriptions.show', [$customer, $subscription]))
        ->patch(route('superadmin.customers.subscriptions.payment-logs.review', [$customer, $subscription, $payment]), [
            'status' => PaymentStatus::Rejected->value,
        ])
        ->assertSessionHasErrors('rejection_reason');

    expect($payment->fresh()->status)->toBe(PaymentStatus::Reviewed)
        ->and($payment->rejection_reason)->toBeNull();

    $this
        ->actingAs($admin)
        ->from(route('superadmin.customers.subscriptions.show', [$customer, $subscription]))
        ->patch(route('superadmin.customers.subscriptions.payment-logs.review', [$customer, $subscription, $payment]), [
            'status' => PaymentStatus::Rejected->value,
            'rejection_reason' => 'Receipt does not match the submitted amount.',
        ])
        ->assertSessionHasNoErrors();

    $payment->refresh();

    expect($payment->status)->toBe(PaymentStatus::Rejected)
        ->and($payment->rejection_reason)->toBe('Receipt does not match the submitted amount.');
});

it('does not allow tracking payments above the subscription amount', function () {
    $admin = makeSuperAdmin();
    $customer = makeCustomer();
    $subscription = makeSubscription($customer, $admin);

    makePaymentLog($subscription, $admin, [
        'amount' => '700.00',
        'status' => PaymentStatus::Approved->value,
        'reviewed_by' => $admin->id,
        'reviewed_at' => now(),
    ]);

    $this
        ->actingAs($admin)
        ->from(route('superadmin.customers.subscriptions.show', [$customer, $subscription]))
        ->post(route('superadmin.customers.subscriptions.payment-logs.store', [$customer, $subscription]), [
            'amount' => '400',
            'payment_method' => PaymentMethod::Online->value,
            'account_number' => 'TXN-9009',
        ])
        ->assertSessionHasErrors('amount');

    expect(PaymentLog::count())->toBe(1);
});

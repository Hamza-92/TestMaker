<?php

use App\Enums\AuditEvent;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\AuditLog;
use App\Models\PaymentLog;
use App\Models\Subscription;
use App\Models\TrialSetting;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->master = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'created_by' => null,
    ]);
});

function dashboardCustomer(User $creator, string $accountType, array $attributes = []): User
{
    return User::factory()->create([
        'user_type' => UserType::Customer,
        'account_type' => $accountType,
        'created_by' => $creator->id,
        ...$attributes,
    ]);
}

function dashboardSubscription(User $customer, User $creator, int $daysUntilExpiry): Subscription
{
    return Subscription::create([
        'user_id' => $customer->id,
        'name' => 'Standard',
        'amount' => 1000,
        'started_at' => now()->subDay(),
        'expired_at' => now()->addDays($daysUntilExpiry),
        'duration' => 365,
        'status' => 'active',
        'created_by' => $creator->id,
    ]);
}

function dashboardPayment(Subscription $subscription, User $creator, string $status, string $amount): PaymentLog
{
    return PaymentLog::create([
        'subscription_id' => $subscription->id,
        'amount' => $amount,
        'payment_method' => 'cash',
        'status' => $status,
        'created_by' => $creator->id,
    ]);
}

it('shows accurate customer and payment summary values to the master admin', function () {
    TrialSetting::create(['trial_duration_days' => 14]);

    $expiring = dashboardCustomer($this->master, 'paid');
    $longPlan = dashboardCustomer($this->master, 'paid');
    $expired = dashboardCustomer($this->master, 'paid');
    $suspended = dashboardCustomer($this->master, 'paid', ['status' => UserStatus::Suspended]);
    dashboardCustomer($this->master, 'trial', ['created_at' => now()->subDays(5)]);
    dashboardCustomer($this->master, 'trial', ['created_at' => now()->subDays(20)]);
    $subscribedTrial = dashboardCustomer($this->master, 'trial');

    $expiringPlan = dashboardSubscription($expiring, $this->master, 10);
    $laterExpiringPlan = dashboardSubscription($expiring, $this->master, 20);
    dashboardSubscription($longPlan, $this->master, 60);
    dashboardSubscription($expired, $this->master, -1);
    dashboardSubscription($suspended, $this->master, 10);
    $trialPlan = dashboardSubscription($subscribedTrial, $this->master, 20);

    dashboardPayment($expiringPlan, $this->master, 'approved', '250.50');
    dashboardPayment($expiringPlan, $this->master, 'pending_review', '100.00');
    dashboardPayment($expiringPlan, $this->master, 'reviewed', '40.00');
    dashboardPayment($expiringPlan, $this->master, 'rejected', '20.00');
    dashboardPayment($trialPlan, $this->master, 'approved', '50.00');
    dashboardPayment($trialPlan, $this->master, 'pending_review', '10.00');
    $oldPayment = dashboardPayment($expiringPlan, $this->master, 'approved', '900.00');
    DB::table('payment_logs')->where('id', $oldPayment->id)->update([
        'created_at' => now()->subMonth(),
    ]);

    $page = $this->actingAs($this->master)->get(route('dashboard'))->assertOk()->viewData('page');
    $summary = $page['props']['summary'];

    expect($summary['paid_customers'])->toBe(2)
        ->and($summary['active_trials'])->toBe(2)
        ->and($summary['expiring_soon'])->toBe(2)
        ->and($summary['pending_payments'])->toBe(3)
        ->and((float) $summary['approved_payments_this_month'])->toBe(300.5);

    $trends = $page['props']['trends'];
    $thisMonth = now('Asia/Karachi')->format('Y-m');
    expect($trends)->not->toHaveKey('payments')
        ->and($trends)->not->toHaveKey('paymentDays')
        ->and(collect($trends['customers'])->firstWhere('month', $thisMonth)['paid'])->toBe(4)
        ->and(collect($trends['customers'])->sum('trial'))->toBe(3)
        ->and(collect($trends['customerDays'])->sum('paid'))->toBe(4)
        ->and(collect($trends['customerDays'])->sum('trial'))->toBe(collect($trends['customers'])->firstWhere('month', $thisMonth)['trial'])
        ->and($page['props']['subscriptionStatus'])->toBe(['active' => 5, 'expired' => 1])
        ->and($page['props']['recentExpiredCustomers'])->toHaveCount(1)
        ->and($page['props']['recentExpiredCustomers'][0]['customer_id'])->toBe($expired->id)
        ->and($page['props']['paymentsToReview'])->toHaveCount(3);

    expect(array_column($page['props']['expiringSubscriptions'], 'id'))
        ->toBe([$expiringPlan->id, $laterExpiringPlan->id]);

    $review = collect($page['props']['paymentsToReview'])->firstWhere('amount', '100.00');
    expect($review['customer_name'])->toBe($expiring->school_name ?: $expiring->name)
        ->and($review['recorded_by'])->toBe($this->master->name)
        ->and($review['subscription_name'])->toBe('Standard')
        ->and($review['subscription_amount'])->toBe('1000.00')
        ->and($review['approved_amount'])->toBe('1150.50')
        ->and($review['balance_amount'])->toBe('0.00')
        ->and($review['payment_method'])->toBe('Cash')
        ->and($review['recent_payments'])->not->toBeEmpty();
});

it('shows recently expired paid customers without an active replacement plan', function () {
    $twoDaysAgo = dashboardCustomer($this->master, 'paid');
    $fiveDaysAgo = dashboardCustomer($this->master, 'paid');
    $old = dashboardCustomer($this->master, 'paid');
    $renewed = dashboardCustomer($this->master, 'paid');

    dashboardSubscription($twoDaysAgo, $this->master, -2);
    dashboardSubscription($fiveDaysAgo, $this->master, -5);
    dashboardSubscription($old, $this->master, -35);
    dashboardSubscription($renewed, $this->master, -1);
    dashboardSubscription($renewed, $this->master, 40);

    $page = $this->actingAs($this->master)->get(route('dashboard'))->assertOk()->viewData('page');

    expect(array_column($page['props']['recentExpiredCustomers'], 'customer_id'))
        ->toBe([$twoDaysAgo->id, $fiveDaysAgo->id])
        ->and($page['props']['subscriptionStatus'])->toBe(['active' => 1, 'expired' => 4]);
});

it('shows employee customer, subscription and payment activity within the viewer scope', function () {
    $delegate = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => $this->master->id]);
    $delegate->syncPermissions(['customers.paid.view', 'subscriptions.view']);
    $ownCustomer = dashboardCustomer($delegate, 'paid', ['school_name' => 'Own School']);
    $otherCustomer = dashboardCustomer($this->master, 'paid');
    $subscription = dashboardSubscription($ownCustomer, $delegate, 8);
    $payment = dashboardPayment($subscription, $delegate, 'pending_review', '150.00');

    AuditLog::record($ownCustomer, AuditEvent::Created, newValues: ['name' => $ownCustomer->name], actor: $delegate);
    AuditLog::record($subscription, AuditEvent::Created, newValues: ['name' => 'Standard'], actor: $delegate);
    AuditLog::record($payment, AuditEvent::Created, newValues: ['amount' => '150.00'], actor: $delegate);
    AuditLog::record($ownCustomer, AuditEvent::Updated, newValues: ['subscription_id' => $subscription->id], actor: $delegate);
    AuditLog::record($otherCustomer, AuditEvent::Updated, newValues: ['status' => 'active'], actor: $this->master);

    $page = $this->actingAs($delegate)->get(route('dashboard'))->assertOk()->viewData('page');
    $activity = $page['props']['recentEmployeeActivity'];

    expect($activity)->toHaveCount(3)
        ->and(array_column($activity, 'type'))->toContain('customer', 'subscription', 'payment')
        ->and(array_unique(array_column($activity, 'customer_id')))->toBe([$ownCustomer->id]);
});

it('shows the five nearest active paid expiries with seven day markers', function () {
    $school = dashboardCustomer($this->master, 'paid', ['school_name' => 'North Campus']);
    $plans = [];

    foreach ([29, 8, 2, 4, 6, 20] as $days) {
        $plans[$days] = dashboardSubscription($school, $this->master, $days);
    }

    dashboardSubscription($school, $this->master, -1);
    dashboardSubscription($school, $this->master, 1)->update(['status' => 'cancelled']);

    $page = $this->actingAs($this->master)->get(route('dashboard'))->assertOk()->viewData('page');
    $rows = $page['props']['expiringSubscriptions'];

    expect($page['props']['summary']['expiring_soon'])->toBe(6)
        ->and(array_column($rows, 'id'))->toBe([
            $plans[2]->id, $plans[4]->id, $plans[6]->id, $plans[8]->id, $plans[20]->id,
        ])
        ->and(array_column($rows, 'within_7_days'))->toBe([true, true, true, false, false])
        ->and($rows[0]['customer_id'])->toBe($school->id)
        ->and($rows[0]['school_name'])->toBe('North Campus')
        ->and($rows[0]['plan_name'])->toBe('Standard')
        ->and($rows[0]['days_left'])->toBe(2);
});

it('approves a dashboard payment directly without changing recorded details', function () {
    $recorder = User::factory()->create(['user_type' => UserType::SuperAdmin]);
    $school = dashboardCustomer($this->master, 'paid', [
        'school_name' => 'North Campus',
        'phone' => '03001234567',
    ]);
    $subscription = dashboardSubscription($school, $this->master, 20);
    $payment = dashboardPayment($subscription, $recorder, 'pending_review', '275.50');

    $page = $this->actingAs($this->master)->get(route('dashboard'))->assertOk()->viewData('page');
    $detail = collect($page['props']['paymentsToReview'])->firstWhere('id', $payment->id);

    expect($detail['customer_name'])->toBe('North Campus')
        ->and($detail['school_name'])->toBe('North Campus')
        ->and($detail['customer_contact_name'])->toBe($school->name)
        ->and($detail['customer_email'])->toBe($school->email)
        ->and($detail['customer_phone'])->toBe('03001234567')
        ->and($detail['recorded_by'])->toBe($recorder->name)
        ->and($detail['amount'])->toBe('275.50')
        ->and($detail['status'])->toBe('pending_review');

    $reviewUrl = route('superadmin.customers.subscriptions.payment-logs.review', [$school, $subscription, $payment]);
    $this->from(route('dashboard'))->patch($reviewUrl, ['status' => 'approved'])->assertSessionHasNoErrors();

    $page = $this->get(route('dashboard'))->assertOk()->viewData('page');
    expect($page['props']['paymentsToReview'])->toBe([])
        ->and($page['props']['summary']['pending_payments'])->toBe(0)
        ->and((float) $page['props']['summary']['approved_payments_this_month'])->toBe(275.5)
        ->and((string) $payment->fresh()->amount)->toBe('275.50');
});

it('limits delegated admin metrics to granted account types and owned customers', function () {
    $delegate = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'created_by' => $this->master->id,
    ]);
    $delegate->syncPermissions([
        'customers.paid.view',
        'subscriptions.view',
        'subscriptions.manage_payments',
    ]);

    $ownPaid = dashboardCustomer($delegate, 'paid');
    $otherPaid = dashboardCustomer($this->master, 'paid');
    dashboardCustomer($delegate, 'trial');
    $ownPlan = dashboardSubscription($ownPaid, $delegate, 10);
    $otherPlan = dashboardSubscription($otherPaid, $this->master, 10);
    dashboardPayment($ownPlan, $delegate, 'approved', '120.25');
    dashboardPayment($ownPlan, $delegate, 'pending_review', '20.00');
    dashboardPayment($otherPlan, $this->master, 'approved', '800.00');
    dashboardPayment($otherPlan, $this->master, 'pending_review', '40.00');

    $page = $this->actingAs($delegate)->get(route('dashboard'))->assertOk()->viewData('page');
    $summary = $page['props']['summary'];

    expect($summary)->toHaveKeys([
        'paid_customers', 'expiring_soon', 'pending_payments', 'approved_payments_this_month',
    ])
        ->not->toHaveKey('active_trials')
        ->and($summary['paid_customers'])->toBe(1)
        ->and($summary['expiring_soon'])->toBe(1)
        ->and($summary['pending_payments'])->toBe(1)
        ->and((float) $summary['approved_payments_this_month'])->toBe(120.25);

    $current = now('Asia/Karachi')->format('Y-m');
    $customerMonth = collect($page['props']['trends']['customers'])->firstWhere('month', $current);
    expect($customerMonth['paid'])->toBe(1)
        ->and($customerMonth['trial'])->toBeNull()
        ->and(collect($page['props']['trends']['customerDays'])->sum('paid'))->toBe(1)
        ->and($page['props']['trends']['customerDays'][0]['trial'])->toBeNull()
        ->and($page['props']['subscriptionStatus'])->toBe(['active' => 1, 'expired' => 0])
        ->and($page['props']['expiringSubscriptions'])->toHaveCount(1)
        ->and($page['props']['recentExpiredCustomers'])->toBe([])
        ->and($page['props']['expiringSubscriptions'][0]['customer_id'])->toBe($ownPaid->id)
        ->and($page['props']['paymentsToReview'])->toHaveCount(1)
        ->and($page['props']['paymentsToReview'][0]['customer_id'])->toBe($ownPaid->id);
});

it('hides expiring subscription details without subscription view permission', function () {
    $delegate = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'created_by' => $this->master->id,
    ]);
    $delegate->syncPermissions(['customers.paid.view']);
    $school = dashboardCustomer($delegate, 'paid');
    dashboardSubscription($school, $delegate, 5);

    $page = $this->actingAs($delegate)->get(route('dashboard'))->assertOk()->viewData('page');

    expect($page['props']['summary']['expiring_soon'])->toBe(1)
        ->and($page['props']['expiringSubscriptions'])->toBeNull()
        ->and($page['props']['recentExpiredCustomers'])->toBeNull()
        ->and($page['props']['subscriptionStatus'])->toBeNull();
});

it('omits unauthorized cards without creating trial settings on a dashboard read', function () {
    $delegate = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'created_by' => $this->master->id,
    ]);
    $trial = dashboardCustomer($delegate, 'trial', ['created_at' => now()->subDays(2)]);

    $this->actingAs($delegate)->get(route('dashboard'))->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('summary', [])
            ->where('trends', [])
            ->where('subscriptionStatus', null)
            ->where('recentEmployeeActivity', null)
            ->where('expiringSubscriptions', null)
            ->where('recentExpiredCustomers', null)
            ->where('paymentsToReview', null));

    $delegate->syncPermissions(['customers.trial.view']);
    $page = $this->get(route('dashboard'))->assertOk()->viewData('page');

    expect($page['props']['summary'])->toBe(['active_trials' => 1]);
    expect($page['props']['trends'])->toHaveKeys(['customers', 'customerDays'])
        ->not->toHaveKey('payments')
        ->not->toHaveKey('paymentDays');
    expect($page['props']['paymentsToReview'])->toBeNull()
        ->and($page['props']['expiringSubscriptions'])->toBeNull()
        ->and($page['props']['recentExpiredCustomers'])->toBeNull()
        ->and($page['props']['subscriptionStatus'])->toBeNull();

    $trialPlan = dashboardSubscription($trial, $delegate, 10);
    dashboardPayment($trialPlan, $delegate, 'approved', '25.00');
    dashboardPayment($trialPlan, $delegate, 'pending_review', '5.00');
    $delegate->syncPermissions(['customers.trial.view', 'subscriptions.view']);

    $page = $this->get(route('dashboard'))->assertOk()->viewData('page');
    $summary = $page['props']['summary'];
    expect($summary)->toHaveKeys(['active_trials', 'approved_payments_this_month'])
        ->not->toHaveKey('pending_payments')
        ->and($summary['active_trials'])->toBe(1)
        ->and((float) $summary['approved_payments_this_month'])->toBe(25.0);
    expect($page['props']['trends'])->toHaveKeys(['customers', 'customerDays'])
        ->and($page['props']['paymentsToReview'])->toBeNull()
        ->and($page['props']['expiringSubscriptions'])->toBeNull()
        ->and($page['props']['recentExpiredCustomers'])->toBeNull()
        ->and($page['props']['subscriptionStatus'])->toBe(['active' => 1, 'expired' => 0]);
    expect(TrialSetting::count())->toBe(0);
});

<?php

use App\Enums\UserStatus;
use App\Enums\UserType;
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
    dashboardSubscription($expiring, $this->master, 20);
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
    $lastMonth = now('Asia/Karachi')->subMonth()->format('Y-m');
    expect($trends['payments'])->toHaveCount(12)
        ->and(collect($trends['payments'])->firstWhere('month', $thisMonth)['amount_cents'])->toBe(30050)
        ->and(collect($trends['payments'])->firstWhere('month', $lastMonth)['amount_cents'])->toBe(90000)
        ->and(collect($trends['paymentDays'])->sum('amount_cents'))->toBe(30050)
        ->and(collect($trends['customers'])->firstWhere('month', $thisMonth)['paid'])->toBe(4)
        ->and(collect($trends['customers'])->sum('trial'))->toBe(3)
        ->and(collect($trends['customerDays'])->sum('paid'))->toBe(4)
        ->and(collect($trends['customerDays'])->sum('trial'))->toBe(collect($trends['customers'])->firstWhere('month', $thisMonth)['trial'])
        ->and($page['props']['paymentsToReview'])->toHaveCount(3);
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
    $paymentMonth = collect($page['props']['trends']['payments'])->firstWhere('month', $current);
    expect($customerMonth['paid'])->toBe(1)
        ->and($customerMonth['trial'])->toBeNull()
        ->and($paymentMonth['amount_cents'])->toBe(12025)
        ->and(collect($page['props']['trends']['paymentDays'])->sum('amount_cents'))->toBe(12025)
        ->and(collect($page['props']['trends']['customerDays'])->sum('paid'))->toBe(1)
        ->and($page['props']['trends']['customerDays'][0]['trial'])->toBeNull()
        ->and($page['props']['paymentsToReview'])->toHaveCount(1)
        ->and($page['props']['paymentsToReview'][0]['customer_id'])->toBe($ownPaid->id);
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
            ->where('paymentsToReview', null));

    $delegate->syncPermissions(['customers.trial.view']);
    $page = $this->get(route('dashboard'))->assertOk()->viewData('page');

    expect($page['props']['summary'])->toBe(['active_trials' => 1]);
    expect($page['props']['trends'])->toHaveKeys(['customers', 'customerDays'])
        ->not->toHaveKey('payments')
        ->not->toHaveKey('paymentDays');
    expect($page['props']['paymentsToReview'])->toBeNull();

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
    expect($page['props']['trends'])->toHaveKeys(['customers', 'customerDays', 'payments', 'paymentDays'])
        ->and($page['props']['paymentsToReview'])->toBeNull();
    expect(TrialSetting::count())->toBe(0);
});

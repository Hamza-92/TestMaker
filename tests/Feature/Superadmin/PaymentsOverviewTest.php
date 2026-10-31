<?php

use App\Enums\AuditEvent;
use App\Enums\UserType;
use App\Models\AuditLog;
use App\Models\PaymentLog;
use App\Models\Subscription;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Keep the month-end boundary covered regardless of the date CI runs.
    $this->travelTo(Carbon::parse('2026-10-31 12:00:00', 'Asia/Karachi'));

    $this->seed(PermissionSeeder::class);
    $this->master = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'created_by' => null,
    ]);
});

function overviewSubscription(User $creator, ?int $commission): Subscription
{
    $customer = User::factory()->create([
        'user_type' => UserType::Customer,
        'account_type' => 'paid',
        'created_by' => $creator->id,
    ]);

    return Subscription::create([
        'user_id' => $customer->id,
        'name' => 'Plan',
        'amount' => 1000,
        'commission_amount' => $commission,
        'started_at' => now(),
        'duration' => 30,
        'expired_at' => now()->addDays(30),
        'status' => 'active',
        'created_by' => $creator->id,
    ]);
}

function overviewPayment(Subscription $subscription, User $creator, string $status, string $amount, ?int $commission = null): PaymentLog
{
    return PaymentLog::create([
        'subscription_id' => $subscription->id,
        'amount' => $amount,
        'commission_amount' => $commission,
        'payment_method' => 'cash',
        'status' => $status,
        'created_by' => $creator->id,
    ]);
}

it('shows payment totals and counts each eligible subscription commission once', function () {
    $paid = overviewSubscription($this->master, 120);
    $rejectedOnly = overviewSubscription($this->master, 80);
    $legacy = overviewSubscription($this->master, null);
    overviewSubscription($this->master, 70);

    overviewPayment($paid, $this->master, 'pending_review', '200.00');
    overviewPayment($paid, $this->master, 'approved', '300.50');
    overviewPayment($paid, $this->master, 'rejected', '50.00');
    overviewPayment($rejectedOnly, $this->master, 'rejected', '40.00');
    overviewPayment($legacy, $this->master, 'approved', '100.00', 25);

    $page = $this->actingAs($this->master)
        ->get(route('superadmin.payments'))
        ->assertOk()
        ->viewData('page');

    expect($page['component'])->toBe('superadmin/payments')
        ->and($page['props']['summary'])->toBe([
            'approved' => '400.50',
            'gross' => '690.50',
            'commissions' => '145.00',
            'net' => '545.50',
            'expenses' => '0.00',
            'profit' => '545.50',
        ]);
});

it('shows one approved sale per subscription in the month of first approval', function () {
    $agent = User::factory()->create([
        'name' => 'Agent One',
        'email' => 'agent-one@example.test',
        'user_type' => UserType::SuperAdmin,
        'created_by' => $this->master->id,
    ]);
    $otherAgent = User::factory()->create([
        'name' => 'Agent Two',
        'email' => 'agent-two@example.test',
        'user_type' => UserType::SuperAdmin,
        'created_by' => $this->master->id,
    ]);
    $noSalesAgent = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'created_by' => $this->master->id,
    ]);

    $sale = overviewSubscription($agent, 120);
    overviewPayment($sale, $agent, 'approved', '200.00');
    overviewPayment($sale, $agent, 'approved', '100.00');
    overviewPayment(overviewSubscription($agent, 80), $agent, 'pending_review', '50.00');
    overviewPayment(overviewSubscription($noSalesAgent, 90), $noSalesAgent, 'rejected', '50.00');
    overviewPayment(overviewSubscription($otherAgent, 50), $otherAgent, 'approved', '100.00');
    overviewPayment(overviewSubscription($agent, null), $agent, 'approved', '100.00', 25);

    $previousSubscription = overviewSubscription($otherAgent, 40);
    $previousSale = overviewPayment($previousSubscription, $otherAgent, 'approved', '100.00');
    DB::table('payment_logs')->where('id', $previousSale->id)->update(['created_at' => now()->subMonthNoOverflow()]);
    overviewPayment($previousSubscription, $otherAgent, 'approved', '50.00');

    $recordedLastMonth = overviewPayment(overviewSubscription($agent, 30), $agent, 'approved', '100.00');
    DB::table('payment_logs')->where('id', $recordedLastMonth->id)->update(['created_at' => now()->subMonthNoOverflow()]);
    AuditLog::record(
        model: $recordedLastMonth,
        event: AuditEvent::Updated,
        newValues: ['status' => 'approved'],
        actor: $this->master,
    );

    $unassigned = overviewSubscription($this->master, 60);
    $unassigned->update(['created_by' => null]);
    overviewPayment($unassigned, $this->master, 'approved', '100.00');

    $data = $this->actingAs($this->master)
        ->get(route('superadmin.payments'))
        ->assertOk()
        ->viewData('page')['props']['agentCommissions'];

    expect($data['agents'])->toBe([
        [
            'id' => $agent->id,
            'name' => 'Agent One',
            'email' => 'agent-one@example.test',
            'sales' => 3,
            'commission' => '175.00',
        ],
        [
            'id' => $otherAgent->id,
            'name' => 'Agent Two',
            'email' => 'agent-two@example.test',
            'sales' => 1,
            'commission' => '50.00',
        ],
    ])
        ->and($data['totalSales'])->toBe(4)
        ->and($data['totalCommission'])->toBe('225.00');
});

it('lists this months submissions with payment status filters and a date range', function () {
    $subscription = overviewSubscription($this->master, 90);
    $subscription->user->update(['name' => 'A Customer', 'phone' => '03001234567', 'school_name' => 'A School']);
    $approved = overviewPayment($subscription, $this->master, 'approved', '200.00');
    $pending = overviewPayment($subscription, $this->master, 'pending_review', '250.00');
    $reviewed = overviewPayment($subscription, $this->master, 'reviewed', '75.00');
    $rejected = overviewPayment($subscription, $this->master, 'rejected', '50.00');
    $older = overviewPayment($subscription, $this->master, 'approved', '100.00');
    DB::table('payment_logs')->where('id', $older->id)->update(['created_at' => now()->subMonthNoOverflow()]);

    $page = $this->actingAs($this->master)
        ->get(route('superadmin.payments'))
        ->assertOk()
        ->viewData('page');
    $requests = $page['props']['paymentRequests'];

    expect($requests['filters'])->toBe([
        'from' => now('Asia/Karachi')->startOfMonth()->toDateString(),
        'to' => now('Asia/Karachi')->toDateString(),
        'status' => 'all',
    ])
        ->and($requests['meta']['total'])->toBe(4)
        ->and($requests['totals'])->toBe([
            'payable' => '1000.00',
            'paid' => '575.00',
            'due' => '700.00',
            'commission' => '90.00',
        ])
        ->and(collect($requests['data'])->pluck('id')->all())->toBe([$rejected->id, $reviewed->id, $pending->id, $approved->id]);

    $row = collect($requests['data'])->firstWhere('id', $pending->id);
    expect($row)->toMatchArray([
        'subscription_id' => $subscription->id,
        'agent' => $this->master->name,
        'customer_name' => 'A Customer',
        'phone' => '03001234567',
        'school' => 'A School',
        'subscription' => 'Plan',
        'payable' => '1000.00',
        'paid' => '250.00',
        'due' => '700.00',
        'commission' => '90',
        'status' => 'pending_review',
    ]);

    $pendingRequests = $this->get(route('superadmin.payments', ['status' => 'pending']))
        ->assertOk()->viewData('page')['props']['paymentRequests'];
    $pendingRows = $pendingRequests['data'];
    expect(collect($pendingRows)->pluck('id')->all())->toBe([$reviewed->id, $pending->id]);
    expect($pendingRequests['totals']['paid'])->toBe('325.00');

    $approvedRows = $this->get(route('superadmin.payments', ['status' => 'approved']))
        ->assertOk()->viewData('page')['props']['paymentRequests']['data'];
    expect(collect($approvedRows)->pluck('id')->all())->toBe([$approved->id]);

    $rejectedRows = $this->get(route('superadmin.payments', ['status' => 'rejected']))
        ->assertOk()->viewData('page')['props']['paymentRequests']['data'];
    expect(collect($rejectedRows)->pluck('id')->all())->toBe([$rejected->id]);

    $previousMonth = now('Asia/Karachi')->subMonthNoOverflow()->toDateString();
    $olderRows = $this->get(route('superadmin.payments', [
        'from' => $previousMonth,
        'to' => $previousMonth,
        'status' => 'all',
    ]))->assertOk()->viewData('page')['props']['paymentRequests']['data'];
    expect(collect($olderRows)->pluck('id')->all())->toBe([$older->id]);

    $this->withHeaders([
        'X-Inertia' => 'true',
        'X-Inertia-Version' => $page['version'],
        'X-Inertia-Partial-Component' => 'superadmin/payments',
        'X-Inertia-Partial-Data' => 'paymentRequests',
    ])->get(route('superadmin.payments', ['status' => 'pending']))
        ->assertOk()
        ->assertJsonMissingPath('props.summary')
        ->assertJsonMissingPath('props.agentCommissions')
        ->assertJsonPath('props.paymentRequests.meta.total', 2);
});

it('restricts payments and submission details to the master superadmin', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'created_by' => $this->master->id,
    ]);
    $staff->syncPermissions(['customers.paid.view', 'subscriptions.view', 'subscriptions.manage_payments']);
    $owned = overviewSubscription($staff, 120);
    $payment = overviewPayment($owned, $staff, 'pending_review', '250.00');
    $detailUrl = route('superadmin.payments.requests.show', $payment->id);
    $this->actingAs($staff)->get(route('superadmin.payments'))->assertForbidden();
    $this->getJson($detailUrl)->assertForbidden();

    $reviewUrl = route('superadmin.customers.subscriptions.payment-logs.review', [$owned->user_id, $owned->id, $payment->id]);
    $this->patch($reviewUrl, ['status' => 'approved'])->assertSessionHasNoErrors();

    $approvedRows = $this->actingAs($this->master)->get(route('superadmin.payments', ['status' => 'approved']))
        ->assertOk()->viewData('page')['props']['paymentRequests']['data'];
    expect(collect($approvedRows)->pluck('id')->all())->toBe([$payment->id]);
    $this->getJson($detailUrl)->assertJsonPath('status', 'approved');
});

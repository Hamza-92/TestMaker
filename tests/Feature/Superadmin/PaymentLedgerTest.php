<?php

use App\Enums\UserType;
use App\Models\PaymentLog;
use App\Models\Subscription;
use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->travelTo(CarbonImmutable::parse('2026-10-20 12:00:00', 'Asia/Karachi'));
    $this->master = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'created_by' => null,
    ]);
});

function ledgerSubscription(User $customer, User $agent): Subscription
{
    return Subscription::create([
        'user_id' => $customer->id,
        'name' => 'Plan',
        'amount' => 1000,
        'started_at' => now(),
        'duration' => 30,
        'expired_at' => now()->addDays(30),
        'status' => 'active',
        'created_by' => $agent->id,
    ]);
}

function ledgerPayment(Subscription $subscription, User $agent, string $status, string $amount, string $localDate): PaymentLog
{
    $payment = PaymentLog::create([
        'subscription_id' => $subscription->id,
        'amount' => $amount,
        'payment_method' => 'cash',
        'status' => $status,
        'created_by' => $agent->id,
    ]);
    DB::table('payment_logs')->where('id', $payment->id)->update([
        'created_at' => CarbonImmutable::parse($localDate, 'Asia/Karachi')->utc()->toDateTimeString(),
    ]);

    return $payment;
}

it('groups approved receipts into new sales renewals and due installments across months', function () {
    $customer = User::factory()->create([
        'user_type' => UserType::Customer,
        'account_type' => 'paid',
        'created_by' => $this->master->id,
        'school_name' => 'Ledger School',
        'phone' => '03001234567',
    ]);
    $otherCustomer = User::factory()->create([
        'user_type' => UserType::Customer,
        'account_type' => 'paid',
        'created_by' => $this->master->id,
    ]);
    $first = ledgerSubscription($customer, $this->master);
    $renewal = ledgerSubscription($customer, $this->master);
    $other = ledgerSubscription($otherCustomer, $this->master);

    ledgerPayment($first, $this->master, 'approved', '100.00', '2026-09-30 12:00:00');
    $due = ledgerPayment($first, $this->master, 'approved', '40.00', '2026-10-05 12:00:00');
    $renewalFirst = ledgerPayment($renewal, $this->master, 'approved', '80.00', '2026-10-06 12:00:00');
    $renewalDue = ledgerPayment($renewal, $this->master, 'approved', '20.00', '2026-10-07 12:00:00');
    $newSale = ledgerPayment($other, $this->master, 'approved', '50.00', '2026-10-08 12:00:00');
    ledgerPayment($other, $this->master, 'pending_review', '90.00', '2026-10-09 12:00:00');
    ledgerPayment($other, $this->master, 'approved', '10.00', '2026-11-01 00:00:00');

    $page = $this->actingAs($this->master)
        ->get(route('superadmin.payments.ledger'))
        ->assertOk()
        ->viewData('page');
    $ledger = $page['props']['ledger'];

    expect($page['component'])->toBe('superadmin/payment-ledger')
        ->and($ledger['filters'])->toBe(['from' => '2026-10-01', 'to' => '2026-11-01', 'search' => ''])
        ->and($ledger['summary'])->toBe([
            'total_received' => '190.00',
            'new_sales' => '50.00',
            'renewals' => '80.00',
            'due_payments' => '60.00',
        ])
        ->and($ledger['meta']['total'])->toBe(4)
        ->and(collect($ledger['data'])->pluck('id')->all())->toBe([$newSale->id, $renewalDue->id, $renewalFirst->id, $due->id])
        ->and(collect($ledger['data'])->pluck('source', 'id')->all())->toBe([
            $newSale->id => 'new',
            $renewalDue->id => 'due',
            $renewalFirst->id => 'renewal',
            $due->id => 'due',
        ]);

    $searched = $this->get(route('superadmin.payments.ledger', [
        'from' => '2026-10-01',
        'to' => '2026-10-07',
        'search' => 'Ledger School',
    ]))->assertOk()->viewData('page')['props']['ledger'];
    expect(collect($searched['data'])->pluck('id')->all())->toBe([$renewalFirst->id, $due->id])
        ->and($searched['summary']['total_received'])->toBe('120.00');

    $this->get(route('superadmin.payments.ledger', ['from' => '2026-10-10', 'to' => '2026-10-10']))
        ->assertSessionHasErrors('to');
});

it('denies delegated admins access to the payment ledger even with payment permissions', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'created_by' => $this->master->id,
    ]);
    $staff->syncPermissions(['subscriptions.view', 'subscriptions.manage_payments', 'customers.paid.view']);
    $owned = User::factory()->create([
        'user_type' => UserType::Customer,
        'account_type' => 'paid',
        'created_by' => $staff->id,
    ]);
    $visiblePayment = ledgerPayment(ledgerSubscription($owned, $staff), $staff, 'approved', '70.00', '2026-10-10 12:00:00');
    $this->actingAs($staff)->get(route('superadmin.payments.ledger'))->assertForbidden();
    $this->getJson(route('superadmin.payments.requests.show', $visiblePayment->id))->assertForbidden();
});

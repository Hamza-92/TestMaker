<?php

use App\Enums\AuditEvent;
use App\Enums\UserType;
use App\Models\AuditLog;
use App\Models\Expense;
use App\Models\PaymentLog;
use App\Models\ShareholderSpend;
use App\Models\Subscription;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->master = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => null]);
});

function shareholderSubscription(User $customer, User $agent, int $commission): Subscription
{
    return Subscription::create([
        'user_id' => $customer->id,
        'name' => 'Plan',
        'amount' => 1000,
        'commission_amount' => $commission,
        'started_at' => now(),
        'duration' => 30,
        'expired_at' => now()->addDays(30),
        'status' => 'active',
        'created_by' => $agent->id,
    ]);
}

function shareholderPayment(Subscription $subscription, User $agent, string $amount, string $status): void
{
    PaymentLog::create([
        'subscription_id' => $subscription->id,
        'amount' => $amount,
        'payment_method' => 'cash',
        'status' => $status,
        'created_by' => $agent->id,
    ]);
}

it('calculates the all-time reserve from approved profit and keeps a spend audit trail', function () {
    $customer = User::factory()->create(['user_type' => UserType::Customer, 'account_type' => 'paid', 'created_by' => $this->master->id]);
    $subscription = shareholderSubscription($customer, $this->master, 100);
    shareholderPayment($subscription, $this->master, '1000.00', 'approved');
    shareholderPayment($subscription, $this->master, '500.00', 'rejected');
    Expense::create(['name' => 'Rent', 'amount' => '200.00', 'created_by' => $this->master->id]);

    $page = $this->actingAs($this->master)->get(route('superadmin.payments.shareholder'))
        ->assertOk()->viewData('page');
    expect($page['component'])->toBe('superadmin/shareholder')
        ->and($page['props']['summary'])->toBe([
            'profit' => '700.00',
            'reserve' => '105.00',
            'spent' => '0.00',
            'available' => '105.00',
        ]);

    $this->post(route('superadmin.payments.shareholder.spends.store'), [
        'amount' => '105.01', 'note' => 'Too much',
    ])->assertSessionHasErrors('amount');
    expect(ShareholderSpend::query()->count())->toBe(0);

    $this->post(route('superadmin.payments.shareholder.spends.store'), [
        'amount' => '40.00', 'note' => 'Food support',
    ])->assertRedirect(route('superadmin.payments.shareholder'));
    $spend = ShareholderSpend::query()->firstOrFail();
    $afterCreate = $this->get(route('superadmin.payments.shareholder'))->assertOk()->viewData('page')['props'];
    expect($afterCreate['summary']['spent'])->toBe('40.00')
        ->and($afterCreate['summary']['available'])->toBe('65.00')
        ->and($afterCreate['ledger']['data'][0]['note'])->toBe('Food support')
        ->and($afterCreate['ledger']['data'][0]['by'])->toBe($this->master->name);

    $this->put(route('superadmin.payments.shareholder.spends.update', $spend), [
        'amount' => '105.01', 'note' => 'Too much',
    ])->assertSessionHasErrors('amount');
    $this->put(route('superadmin.payments.shareholder.spends.update', $spend), [
        'amount' => '65.00', 'note' => 'School supplies',
    ])->assertRedirect(route('superadmin.payments.shareholder'));
    $afterEdit = $this->get(route('superadmin.payments.shareholder'))->assertOk()->viewData('page')['props'];
    expect($afterEdit['summary']['available'])->toBe('40.00')
        ->and($afterEdit['ledger']['data'][0]['note'])->toBe('School supplies');

    $this->delete(route('superadmin.payments.shareholder.spends.destroy', $spend))
        ->assertRedirect(route('superadmin.payments.shareholder'));
    expect(ShareholderSpend::query()->count())->toBe(0)
        ->and(ShareholderSpend::withTrashed()->count())->toBe(1)
        ->and(AuditLog::query()->where('auditable_type', $spend->getMorphClass())->pluck('event')->all())
        ->toBe([AuditEvent::Created, AuditEvent::Updated, AuditEvent::Deleted]);
    $afterDelete = $this->get(route('superadmin.payments.shareholder'))->assertOk()->viewData('page')['props'];
    expect($afterDelete['summary']['available'])->toBe('105.00');
});

it('does not allocate from a loss and restricts shareholder actions to the master admin', function () {
    Expense::create(['name' => 'Loss', 'amount' => '50.00', 'created_by' => $this->master->id]);
    $summary = $this->actingAs($this->master)->get(route('superadmin.payments.shareholder'))
        ->assertOk()->viewData('page')['props']['summary'];
    expect($summary['profit'])->toBe('-50.00')
        ->and($summary['reserve'])->toBe('0.00')
        ->and($summary['available'])->toBe('0.00');

    $staff = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => $this->master->id]);
    $staff->syncPermissions(['subscriptions.manage_payments', 'subscriptions.view', 'customers.paid.view']);
    $this->actingAs($staff)->get(route('superadmin.payments.shareholder'))->assertForbidden();
    $this->post(route('superadmin.payments.shareholder.spends.store'), [
        'amount' => '1.00', 'note' => 'Denied',
    ])->assertForbidden();
    expect(ShareholderSpend::query()->count())->toBe(0);
});

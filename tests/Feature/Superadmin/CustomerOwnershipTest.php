<?php

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\UserType;
use App\Models\PaymentLog;
use App\Models\Subscription;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PermissionSeeder::class);

    $this->master = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => null]);
    $this->staff = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => $this->master->id]);
    $this->staff->syncPermissions([
        'customers.view', 'customers.create', 'customers.edit', 'customers.impersonate',
        'subscriptions.view', 'subscriptions.create', 'subscriptions.edit', 'subscriptions.manage_payments',
    ]);

    $this->ownCustomer = User::factory()->create([
        'user_type' => UserType::Customer,
        'account_type' => 'paid',
        'created_by' => $this->staff->id,
    ]);
    $this->otherCustomer = User::factory()->create([
        'user_type' => UserType::Customer,
        'account_type' => 'paid',
        'created_by' => $this->master->id,
    ]);
});

function ownershipSubscription(User $customer, User $creator): Subscription
{
    return Subscription::create([
        'user_id' => $customer->id,
        'name' => 'Plan',
        'amount' => 1000,
        'started_at' => now()->startOfDay(),
        'duration' => 30,
        'expired_at' => now()->addDays(30)->startOfDay(),
        'status' => 'active',
        'created_by' => $creator->id,
    ]);
}

it('lists only customers created by the delegated user and calculates totals from those rows', function () {
    $ownSubscription = ownershipSubscription($this->ownCustomer, $this->master);
    $otherSubscription = ownershipSubscription($this->otherCustomer, $this->staff);

    foreach ([$ownSubscription, $otherSubscription] as $subscription) {
        PaymentLog::create([
            'subscription_id' => $subscription->id,
            'amount' => 200,
            'commission_amount' => 50,
            'payment_method' => PaymentMethod::Online,
            'status' => PaymentStatus::Approved,
            'created_by' => $this->staff->id,
        ]);
    }

    $page = $this->actingAs($this->staff)->get(route('superadmin.customers'))->assertOk()->viewData('page');
    $customers = collect($page['props']['customers']);

    expect($customers->pluck('id')->all())->toBe([$this->ownCustomer->id]);
    expect($customers->first()['is_my_customer'])->toBeTrue();
    expect($customers->first()['my_commission'])->toBe('50');
    expect($page['props']['canViewAllCustomers'])->toBeFalse();

    $masterPage = $this->actingAs($this->master)->get(route('superadmin.customers'))->assertOk()->viewData('page');
    expect(collect($masterPage['props']['customers'])->pluck('id')->sort()->values()->all())
        ->toBe([$this->ownCustomer->id, $this->otherCustomer->id]);
    expect($masterPage['props']['canViewAllCustomers'])->toBeTrue();
});

it('blocks customer and subscription URLs for customers created by someone else', function () {
    $subscription = ownershipSubscription($this->otherCustomer, $this->staff);
    $payment = PaymentLog::create([
        'subscription_id' => $subscription->id,
        'amount' => 200,
        'payment_method' => PaymentMethod::Online,
        'status' => PaymentStatus::PendingReview,
        'created_by' => $this->staff->id,
    ]);

    $this->actingAs($this->staff)
        ->get(route('superadmin.customers.show', $this->otherCustomer))->assertNotFound();
    $this->get(route('superadmin.customers.edit', $this->otherCustomer))->assertNotFound();
    $this->put(route('superadmin.customers.update', $this->otherCustomer), [])->assertNotFound();
    $this->post(route('superadmin.customers.reset-password', $this->otherCustomer), [])->assertNotFound();
    $this->post(route('superadmin.customers.login', $this->otherCustomer))->assertNotFound();
    $this->get(route('superadmin.customers.subscriptions.show', [$this->otherCustomer, $subscription]))->assertNotFound();
    $this->get(route('superadmin.customers.subscriptions.edit', [$this->otherCustomer, $subscription]))->assertNotFound();
    $this->put(route('superadmin.customers.subscriptions.update', [$this->otherCustomer, $subscription]), [])->assertNotFound();
    $this->get(route('superadmin.customers.subscriptions.add', $this->otherCustomer))->assertNotFound();
    $this->post(route('superadmin.customers.subscriptions.store', $this->otherCustomer), [])->assertNotFound();
    $this->post(route('superadmin.customers.subscriptions.payment-logs.store', [$this->otherCustomer, $subscription]), [])->assertNotFound();
    $this->patch(route('superadmin.customers.subscriptions.payment-logs.review', [$this->otherCustomer, $subscription, $payment]), [])->assertNotFound();

    expect($this->otherCustomer->fresh()->name)->toBe($this->otherCustomer->name);
    expect($payment->fresh()->status)->toBe(PaymentStatus::PendingReview);

    $this->get(route('superadmin.customers.show', $this->ownCustomer))->assertOk();
    $this->get(route('superadmin.customers.edit', $this->ownCustomer))->assertOk();
    $this->actingAs($this->master)->get(route('superadmin.customers.show', $this->otherCustomer))->assertOk();
});

it('keeps editing and creation permission-gated even for owned customers', function () {
    $viewer = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'created_by' => $this->master->id,
    ]);
    $viewer->syncPermissions(['customers.view']);
    $owned = User::factory()->create([
        'user_type' => UserType::Customer,
        'created_by' => $viewer->id,
    ]);

    $this->actingAs($viewer)->get(route('superadmin.customers.show', $owned))->assertOk();
    $this->get(route('superadmin.customers.edit', $owned))->assertForbidden();
    $this->put(route('superadmin.customers.update', $owned), [])->assertForbidden();
    $this->get(route('superadmin.customers.add'))->assertForbidden();
    $this->post(route('superadmin.customers.store'), [])->assertForbidden();
});

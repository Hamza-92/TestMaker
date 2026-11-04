<?php

use App\Enums\AuditEvent;
use App\Enums\UserType;
use App\Models\AuditLog;
use App\Models\PaymentLog;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('previews the customer payment reset and requires a confirmed backup before clearing records', function () {
    $customer = User::factory()->create([
        'user_type' => UserType::Customer,
        'account_type' => 'paid',
    ]);
    $customer->forceFill(['payment_hold_at' => now()])->save();
    $subscription = Subscription::create([
        'user_id' => $customer->id,
        'name' => 'Primary',
        'amount' => 1000,
        'commission_amount' => 100,
        'started_at' => now(),
        'duration' => 30,
        'expired_at' => now()->addDays(30),
        'payment_due_date' => now()->subDay()->toDateString(),
        'status' => 'active',
    ]);
    $payment = PaymentLog::create([
        'subscription_id' => $subscription->id,
        'amount' => 400,
        'commission_amount' => 60,
        'payment_method' => 'cash',
        'status' => 'approved',
    ]);
    AuditLog::record($payment, AuditEvent::Created);
    AuditLog::record($subscription, AuditEvent::Created);

    $this->artisan('payments:reset-customer-history')->assertExitCode(0);
    $this->artisan('payments:reset-customer-history --execute')->assertExitCode(1);
    expect(PaymentLog::count())->toBe(1)
        ->and(AuditLog::count())->toBe(2)
        ->and($customer->fresh()->payment_hold_at)->not->toBeNull();

    $this->artisan('payments:reset-customer-history --execute --backup-confirmed')->assertExitCode(0);
    $subscription->refresh();

    expect(PaymentLog::count())->toBe(0)
        ->and(AuditLog::query()->where('auditable_type', $payment->getMorphClass())->count())->toBe(0)
        ->and(AuditLog::query()->where('auditable_type', $subscription->getMorphClass())->count())->toBe(1)
        ->and($subscription->amount)->toBe('0.00')
        ->and($subscription->commission_amount)->toBeNull()
        ->and($subscription->payment_due_date)->toBeNull()
        ->and($subscription->status->value)->toBe('active')
        ->and($subscription->expired_at->toDateString())->toBe(now()->addDays(30)->toDateString())
        ->and($customer->fresh()->payment_hold_at)->toBeNull();
});

it('only lets the master superadmin apply the temporary reset page after backup confirmation', function () {
    $master = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => null]);
    $staff = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => $master->id]);
    $customer = User::factory()->create(['user_type' => UserType::Customer]);
    $subscription = Subscription::create([
        'user_id' => $customer->id,
        'name' => 'Primary',
        'amount' => 1000,
        'started_at' => now(),
        'duration' => 30,
        'expired_at' => now()->addDays(30),
        'status' => 'active',
    ]);
    PaymentLog::create([
        'subscription_id' => $subscription->id,
        'amount' => 400,
        'payment_method' => 'cash',
        'status' => 'approved',
    ]);

    $this->actingAs($staff)->get(route('superadmin.payments.reset'))->assertForbidden();
    $this->actingAs($staff)->post(route('superadmin.payments.reset.apply'), [
        'backup_confirmed' => '1',
        'confirmation' => 'CLEAR PAYMENTS',
    ])->assertForbidden();

    $this->actingAs($master)->get(route('superadmin.payments.reset'))
        ->assertOk()
        ->assertSee('Dry-run preview');
    expect(PaymentLog::count())->toBe(1);

    $this->post(route('superadmin.payments.reset.apply'), [
        'backup_confirmed' => '1',
        'confirmation' => 'wrong',
    ])->assertSessionHasErrors('confirmation');
    $this->post(route('superadmin.payments.reset.apply'), [
        'confirmation' => 'CLEAR PAYMENTS',
    ])->assertSessionHasErrors('backup_confirmed');
    expect(PaymentLog::count())->toBe(1);

    $this->post(route('superadmin.payments.reset.apply'), [
        'backup_confirmed' => '1',
        'confirmation' => 'CLEAR PAYMENTS',
    ])->assertOk()->assertSee('Reset completed');
    expect(PaymentLog::count())->toBe(0)
        ->and($subscription->fresh()->amount)->toBe('0.00');
});

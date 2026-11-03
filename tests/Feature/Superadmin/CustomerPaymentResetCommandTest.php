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
        ->and($subscription->amount)->toBe('1000.00')
        ->and($subscription->commission_amount)->toBeNull()
        ->and($subscription->payment_due_date)->toBeNull()
        ->and($customer->fresh()->payment_hold_at)->toBeNull();
});

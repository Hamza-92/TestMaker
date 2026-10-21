<?php

use App\Enums\AccountType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\UserType;
use App\Models\AuditLog;
use App\Models\PaymentLog;
use App\Models\Subscription;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->admin = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => null]);
    $this->recorder = User::factory()->create(['user_type' => UserType::Staff]);
    $this->otherRecorder = User::factory()->create(['user_type' => UserType::Staff]);
    $this->customer = User::factory()->create([
        'user_type' => UserType::Customer,
        'account_type' => AccountType::Paid,
        'created_by' => $this->admin->id,
    ]);
    $this->subscription = Subscription::create([
        'user_id' => $this->customer->id,
        'name' => 'School plan',
        'amount' => '1000.00',
        'allowed_questions' => 100,
        'started_at' => now()->subDay(),
        'duration' => 30,
        'expired_at' => now()->addDays(29),
        'status' => 'active',
        'created_by' => $this->admin->id,
    ]);
});

function rejectedPaymentRecordedBy(Subscription $subscription, User $recorder): PaymentLog
{
    return PaymentLog::create([
        'subscription_id' => $subscription->id,
        'amount' => '300.00',
        'payment_method' => PaymentMethod::Online->value,
        'status' => PaymentStatus::Rejected->value,
        'attachments' => ['payment-receipts/first.png'],
        'rejection_reason' => 'Receipt is unclear.',
        'created_by' => $recorder->id,
    ]);
}

it('shows rejected payments only on the dashboard of the staff member who recorded them', function () {
    $payment = rejectedPaymentRecordedBy($this->subscription, $this->recorder);

    $page = $this->actingAs($this->recorder)->get(route('dashboard'))->assertOk()->viewData('page');
    expect(collect($page['props']['rejectedPayments'])->pluck('id')->all())->toBe([$payment->id]);
    expect($page['props']['rejectedPayments'][0]['receipts'])->toHaveCount(1);

    $page = $this->actingAs($this->otherRecorder)->get(route('dashboard'))->assertOk()->viewData('page');
    expect($page['props']['rejectedPayments'])->toBe([]);

    $page = $this->actingAs($this->customer)->get(route('dashboard'))->assertOk()->viewData('page');
    expect($page['props'])->not->toHaveKey('rejectedPayments');
});

it('lets only the recorder resubmit remarks while preserving the recorded payment', function () {
    $payment = rejectedPaymentRecordedBy($this->subscription, $this->recorder);
    $url = route('superadmin.rejected-payments.resubmit', $payment);

    $this->actingAs($this->otherRecorder)->patch($url, ['remarks' => 'Not mine'])->assertNotFound();
    $this->actingAs($this->recorder)->patch($url, ['remarks' => '   '])->assertSessionHasErrors('remarks');
    $this->patch($url, ['remarks' => 'Bank confirmed this transfer.'])->assertSessionHasNoErrors();

    $payment->refresh();
    expect($payment->status)->toBe(PaymentStatus::PendingReview)
        ->and($payment->recorder_remarks)->toBe('Bank confirmed this transfer.')
        ->and($payment->rejection_reason)->toBe('Receipt is unclear.')
        ->and((string) $payment->amount)->toBe('300.00')
        ->and($payment->attachments)->toBe(['payment-receipts/first.png']);
    expect(AuditLog::query()->forModel($payment)->where('changed_by', $this->recorder->id)->count())->toBe(1);

    $this->patch($url, ['remarks' => 'Again'])->assertSessionHasErrors('remarks');
});

it('shows recorder remarks to the admin and lets the payment be decided again', function () {
    $payment = rejectedPaymentRecordedBy($this->subscription, $this->recorder);
    $this->actingAs($this->recorder)->patch(route('superadmin.rejected-payments.resubmit', $payment), [
        'remarks' => 'Here is the bank reference.',
    ])->assertSessionHasNoErrors();

    $page = $this->actingAs($this->admin)->get(route('dashboard'))->assertOk()->viewData('page');
    $detail = collect($page['props']['paymentsToReview'])->firstWhere('id', $payment->id);
    expect($detail['rejection_reason'])->toBe('Receipt is unclear.')
        ->and($detail['recorder_remarks'])->toBe('Here is the bank reference.')
        ->and($detail['receipts'])->toHaveCount(1);

    $review = route('superadmin.customers.subscriptions.payment-logs.review', [$this->customer, $this->subscription, $payment]);
    $this->patch($review, ['status' => 'rejected', 'rejection_reason' => 'Still unclear.'])->assertSessionHasNoErrors();
    expect($payment->fresh()->rejection_reason)->toBe('Still unclear.');

    $this->actingAs($this->recorder)->patch(route('superadmin.rejected-payments.resubmit', $payment), [
        'remarks' => 'Updated bank confirmation.',
    ])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->patch($review, ['status' => 'approved'])->assertSessionHasNoErrors();
    expect($payment->fresh()->status)->toBe(PaymentStatus::Approved);
});

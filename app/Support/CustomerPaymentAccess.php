<?php

namespace App\Support;

use App\Enums\AuditEvent;
use App\Enums\PaymentStatus;
use App\Models\AuditLog;
use App\Models\Subscription;
use App\Models\User;

class CustomerPaymentAccess
{
    public function isBlockedFor(User $user): bool
    {
        $owner = $user->schoolOwner();

        return $owner !== null && $this->syncCustomer($owner);
    }

    public function syncCustomer(User $customer): bool
    {
        if (! $customer->isCustomer()) {
            return false;
        }

        $subscription = $customer->subscriptions()
            ->whereIn('status', ['active', 'expired'])
            ->where('started_at', '<=', now())
            ->orderByDesc('started_at')
            ->orderByDesc('id')
            ->first();

        $blocked = $subscription !== null && $this->isOverdueAndUnpaid($subscription);
        $wasBlocked = $customer->payment_hold_at !== null;

        if ($blocked === $wasBlocked) {
            return $blocked;
        }

        $changed = User::query()
            ->whereKey($customer->id)
            ->when(
                $blocked,
                fn ($query) => $query->whereNull('payment_hold_at'),
                fn ($query) => $query->whereNotNull('payment_hold_at'),
            )
            ->update(['payment_hold_at' => $blocked ? now() : null]);

        if ($changed) {
            $customer->refresh();
            AuditLog::create([
                'auditable_type' => $customer->getMorphClass(),
                'auditable_id' => $customer->id,
                'event' => AuditEvent::Updated,
                'old_values' => ['payment_hold' => $wasBlocked],
                'new_values' => ['payment_hold' => $blocked],
                'changed_by' => null,
                'ip_address' => null,
                'notes' => $blocked
                    ? 'Customer access paused because payment was not approved by the due date.'
                    : 'Customer payment hold cleared.',
            ]);
        }

        return $blocked;
    }

    private function isOverdueAndUnpaid(Subscription $subscription): bool
    {
        if ($subscription->payment_due_date === null
            || $subscription->payment_due_date->toDateString() >= now('Asia/Karachi')->toDateString()) {
            return false;
        }

        $amountCents = (int) round((float) $subscription->amount * 100);

        if ($amountCents <= 0) {
            return false;
        }

        $approvedCents = (int) round((float) $subscription->paymentLogs()
            ->where('status', PaymentStatus::Approved->value)
            ->sum('amount') * 100);

        return $approvedCents < $amountCents;
    }
}

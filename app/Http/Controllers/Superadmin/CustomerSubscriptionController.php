<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PaymentLog;
use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CustomerSubscriptionController extends Controller
{
    public function create(User $customer)
    {
        return Inertia::render('superadmin/customers/subscriptions/add', [
            'customer' => $customer->only(['id', 'name', 'email', 'school_name']),
        ]);
    }

    public function store(Request $request, User $customer)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'allowed_questions' => ['required', 'integer', 'min:0'],
            'started_at' => ['required', 'date'],
            'duration' => ['required', 'integer', 'min:1'],
            'status' => ['required', 'in:active,expired,cancelled'],
            'payment_method' => ['required', 'in:cash,bank_transfer,online,cheque'],
            'account_number' => ['nullable', 'string', 'max:100'],
        ]);

        $startedAt = Carbon::parse($validated['started_at'])->startOfDay();

        DB::transaction(function () use ($validated, $startedAt, $customer) {
            $subscription = Subscription::create([
                'user_id' => $customer->id,
                'name' => $validated['name'],
                'pattern_access' => null,
                'class_access' => null,
                'subject_access' => null,
                'allowed_questions' => $validated['allowed_questions'],
                'amount' => $validated['amount'],
                'started_at' => $startedAt,
                'duration' => $validated['duration'],
                'expired_at' => $startedAt->copy()->addDays((int) $validated['duration']),
                'status' => $validated['status'],
                'created_by' => auth()->id(),
            ]);

            $paymentLog = PaymentLog::create([
                'subscription_id' => $subscription->id,
                'amount' => $validated['amount'],
                'payment_method' => $validated['payment_method'],
                'account_number' => $validated['account_number'] ?: null,
                'status' => PaymentStatus::Approved->value,
                'reviewed_by' => auth()->id(),
                'reviewed_at' => now(),
                'notes' => 'Payment recorded while creating subscription.',
                'created_by' => auth()->id(),
            ]);

            AuditLog::record(
                model: $subscription,
                event: AuditEvent::Created,
                newValues: [
                    'name' => $subscription->name,
                    'amount' => $subscription->amount,
                    'status' => $subscription->status->value,
                ],
                actor: auth()->user(),
                notes: 'Subscription created for customer.',
            );

            AuditLog::record(
                model: $paymentLog,
                event: AuditEvent::Created,
                newValues: [
                    'amount' => $paymentLog->amount,
                    'payment_method' => $paymentLog->payment_method->value,
                    'status' => $paymentLog->status->value,
                ],
                actor: auth()->user(),
                notes: 'Payment log created during subscription creation.',
            );

            AuditLog::record(
                model: $customer,
                event: AuditEvent::Updated,
                newValues: [
                    'subscription_id' => $subscription->id,
                    'subscription_name' => $subscription->name,
                    'subscription_amount' => (string) $subscription->amount,
                    'subscription_status' => $subscription->status->value,
                    'payment_log_id' => $paymentLog->id,
                ],
                actor: auth()->user(),
                notes: 'A new subscription was added for this customer.',
            );
        });

        return redirect()
            ->route('superadmin.customers.show', $customer)
            ->with('success', 'Subscription added successfully.');
    }
}

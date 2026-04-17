<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Pattern;
use App\Models\PaymentLog;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class CustomerSubscriptionController extends Controller
{
    public function show(User $customer, Subscription $subscription)
    {
        abort_unless((int) $subscription->user_id === (int) $customer->id, 404);

        $subscription->load([
            'creator:id,name',
            'paymentLogs' => fn ($q) => $q->with('creator:id,name', 'reviewer:id,name')->latest(),
            'auditLogs'   => fn ($q) => $q->with('changedBy:id,name')->latest('created_at'),
        ]);

        $patternNames = $this->resolveNames(Pattern::class, $subscription->pattern_access, 'name');
        $classNames   = $this->resolveNames(SchoolClass::class, $subscription->class_access, 'name');
        $subjectNames = $this->resolveNames(Subject::class, $subscription->subject_access, 'name_eng');

        $paymentLogs = $subscription->paymentLogs->map(fn (PaymentLog $log) => [
            'id'                   => $log->id,
            'amount'               => (string) $log->amount,
            'payment_method'       => $log->payment_method?->value,
            'payment_method_label' => $log->payment_method?->label(),
            'account_number'       => $log->account_number,
            'status'               => $log->status?->value,
            'status_label'         => $log->status?->label(),
            'notes'                => $log->notes,
            'attachments'          => collect($log->attachments ?? [])->map(fn ($p) => Storage::url($p))->all(),
            'created_at'           => $log->created_at?->toISOString(),
            'reviewed_at'          => $log->reviewed_at?->toISOString(),
            'creator_name'         => $log->creator?->name,
            'reviewer_name'        => $log->reviewer?->name,
        ]);

        $auditLogs = $subscription->auditLogs->map(fn (AuditLog $log) => [
            'id'              => $log->id,
            'event'           => $log->event?->value,
            'old_values'      => $log->old_values ?? [],
            'new_values'      => $log->new_values ?? [],
            'notes'           => $log->notes,
            'changed_by_name' => $log->changedBy?->name,
            'created_at'      => $log->created_at?->toISOString(),
        ]);

        return Inertia::render('superadmin/customers/subscriptions/show', [
            'customer' => $customer->only(['id', 'name', 'email', 'school_name']),
            'subscription' => [
                'id'                => $subscription->id,
                'name'              => $subscription->name,
                'amount'            => (string) $subscription->amount,
                'allowed_questions' => $subscription->allowed_questions,
                'started_at'        => $subscription->started_at?->toISOString(),
                'expired_at'        => $subscription->expired_at?->toISOString(),
                'duration'          => $subscription->duration,
                'status'            => $subscription->status?->value,
                'allow_teachers'    => $subscription->allow_teachers,
                'max_teachers'      => $subscription->max_teachers,
                'pattern_access'    => $subscription->pattern_access,
                'class_access'      => $subscription->class_access,
                'subject_access'    => $subscription->subject_access,
                'pattern_names'     => $patternNames,
                'class_names'       => $classNames,
                'subject_names'     => $subjectNames,
                'creator_name'      => $subscription->creator?->name,
                'created_at'        => $subscription->created_at?->toISOString(),
            ],
            'paymentLogs' => $paymentLogs,
            'auditLogs'   => $auditLogs,
        ]);
    }

    public function storePaymentLog(Request $request, User $customer, Subscription $subscription)
    {
        abort_unless((int) $subscription->user_id === (int) $customer->id, 404);

        $validated = $request->validate([
            'amount'         => ['required', 'numeric', 'min:0'],
            'payment_method' => ['required', 'in:cash,bank_transfer,online,cheque'],
            'account_number' => ['nullable', 'string', 'max:100'],
            'status'         => ['required', 'in:pending_review,reviewed,approved,rejected'],
            'notes'          => ['nullable', 'string', 'max:1000'],
            'receipt'        => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf,webp', 'max:5120'],
        ]);

        $attachments = [];
        if ($request->hasFile('receipt') && $request->file('receipt')->isValid()) {
            $attachments[] = $request->file('receipt')->store('payment-receipts', 'public');
        }

        $isReviewed = in_array($validated['status'], ['reviewed', 'approved', 'rejected']);

        DB::transaction(function () use ($validated, $attachments, $subscription, $isReviewed) {
            $log = PaymentLog::create([
                'subscription_id' => $subscription->id,
                'amount'          => $validated['amount'],
                'payment_method'  => $validated['payment_method'],
                'account_number'  => $validated['account_number'] ?: null,
                'status'          => $validated['status'],
                'attachments'     => $attachments ?: null,
                'notes'           => $validated['notes'] ?: null,
                'reviewed_by'     => $isReviewed ? auth()->id() : null,
                'reviewed_at'     => $isReviewed ? now() : null,
                'created_by'      => auth()->id(),
            ]);

            AuditLog::record(
                model: $log,
                event: AuditEvent::Created,
                newValues: [
                    'amount'         => $log->amount,
                    'payment_method' => $log->payment_method->value,
                    'status'         => $log->status->value,
                ],
                actor: auth()->user(),
                notes: $validated['notes'] ?? 'Payment log added.',
            );
        });

        return back()->with('success', 'Payment log added.');
    }

    public function updatePaymentLog(Request $request, User $customer, Subscription $subscription, PaymentLog $paymentLog)
    {
        abort_unless((int) $subscription->user_id === (int) $customer->id, 404);
        abort_unless((int) $paymentLog->subscription_id === (int) $subscription->id, 404);

        $validated = $request->validate([
            'amount'         => ['required', 'numeric', 'min:0'],
            'payment_method' => ['required', 'in:cash,bank_transfer,online,cheque'],
            'account_number' => ['nullable', 'string', 'max:100'],
            'status'         => ['required', 'in:pending_review,reviewed,approved,rejected'],
            'notes'          => ['nullable', 'string', 'max:1000'],
            'receipt'        => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf,webp', 'max:5120'],
        ]);

        $attachments = $paymentLog->attachments ?? [];
        if ($request->hasFile('receipt') && $request->file('receipt')->isValid()) {
            $attachments[] = $request->file('receipt')->store('payment-receipts', 'public');
        }

        $oldValues = [
            'amount'         => (string) $paymentLog->amount,
            'payment_method' => $paymentLog->payment_method?->value,
            'status'         => $paymentLog->status?->value,
        ];

        $newStatus  = $validated['status'];
        $isReviewed = in_array($newStatus, ['reviewed', 'approved', 'rejected']);

        DB::transaction(function () use ($validated, $attachments, $paymentLog, $oldValues, $newStatus, $isReviewed) {
            $paymentLog->update([
                'amount'         => $validated['amount'],
                'payment_method' => $validated['payment_method'],
                'account_number' => $validated['account_number'] ?: null,
                'status'         => $newStatus,
                'attachments'    => $attachments ?: null,
                'notes'          => $validated['notes'] ?: null,
                'reviewed_by'    => $isReviewed ? auth()->id() : $paymentLog->reviewed_by,
                'reviewed_at'    => $isReviewed ? now() : $paymentLog->reviewed_at,
            ]);

            AuditLog::record(
                model: $paymentLog,
                event: AuditEvent::Updated,
                oldValues: $oldValues,
                newValues: [
                    'amount'         => $validated['amount'],
                    'payment_method' => $validated['payment_method'],
                    'status'         => $newStatus,
                ],
                actor: auth()->user(),
                notes: $validated['notes'] ?? 'Payment log updated.',
            );
        });

        return back()->with('success', 'Payment log updated.');
    }

    public function reviewPaymentLog(Request $request, User $customer, Subscription $subscription, PaymentLog $paymentLog)
    {
        abort_unless((int) $subscription->user_id === (int) $customer->id, 404);
        abort_unless((int) $paymentLog->subscription_id === (int) $subscription->id, 404);

        $validated = $request->validate([
            'status' => ['required', 'in:reviewed,approved,rejected'],
            'notes'  => ['nullable', 'string', 'max:1000'],
        ]);

        $paymentLog->transitionTo(
            PaymentStatus::from($validated['status']),
            $validated['notes'] ?? null,
            auth()->user(),
        );

        return back()->with('success', 'Payment status updated.');
    }

    private function resolveNames(string $model, ?array $ids, string $column): array|null
    {
        if ($ids === null) return null;
        if (empty($ids)) return [];
        return $model::whereIn('id', $ids)->pluck($column)->all();
    }

    public function create(User $customer)
    {
        return Inertia::render('superadmin/customers/subscriptions/add', [
            'customer' => $customer->only(['id', 'name', 'email', 'school_name']),
            'patterns' => Pattern::where('status', 1)->orderBy('name')->get(['id', 'name', 'short_name']),
            'classes'  => SchoolClass::where('status', 1)->orderBy('name')->get(['id', 'name']),
            'subjects' => Subject::where('status', 1)->orderBy('name_eng')->get(['id', 'name_eng', 'name_ur']),
        ]);
    }

    public function store(Request $request, User $customer)
    {
        $validated = $request->validate([
            'name'               => ['required', 'string', 'max:255'],
            'amount'             => ['required', 'numeric', 'min:0'],
            'allowed_questions'  => ['required', 'integer', 'min:0'],
            'started_at'         => ['required', 'date'],
            'duration'           => ['required', 'integer', 'min:1'],
            'status'             => ['required', 'in:active,expired,cancelled'],
            'payment_method'     => ['required', 'in:cash,bank_transfer,online,cheque'],
            'account_number'     => ['nullable', 'string', 'max:100'],
            'pattern_access'     => ['nullable', 'array'],
            'pattern_access.*'   => ['integer'],
            'class_access'       => ['nullable', 'array'],
            'class_access.*'     => ['integer'],
            'subject_access'     => ['nullable', 'array'],
            'subject_access.*'   => ['integer'],
            'allow_teachers'     => ['boolean'],
            'max_teachers'       => ['nullable', 'integer', 'min:1'],
        ]);

        $startedAt = Carbon::parse($validated['started_at'])->startOfDay();

        DB::transaction(function () use ($validated, $startedAt, $customer) {
            $subscription = Subscription::create([
                'user_id'           => $customer->id,
                'name'              => $validated['name'],
                'pattern_access'    => $validated['pattern_access'] ?? null,
                'class_access'      => $validated['class_access'] ?? null,
                'subject_access'    => $validated['subject_access'] ?? null,
                'allow_teachers'    => $validated['allow_teachers'] ?? false,
                'max_teachers'      => ($validated['allow_teachers'] ?? false) ? ($validated['max_teachers'] ?? null) : null,
                'allowed_questions' => $validated['allowed_questions'],
                'amount'            => $validated['amount'],
                'started_at'        => $startedAt,
                'duration'          => $validated['duration'],
                'expired_at'        => $startedAt->copy()->addDays((int) $validated['duration']),
                'status'            => $validated['status'],
                'created_by'        => auth()->id(),
            ]);

            $paymentLog = PaymentLog::create([
                'subscription_id' => $subscription->id,
                'amount'          => $validated['amount'],
                'payment_method'  => $validated['payment_method'],
                'account_number'  => $validated['account_number'] ?: null,
                'status'          => PaymentStatus::Approved->value,
                'reviewed_by'     => auth()->id(),
                'reviewed_at'     => now(),
                'notes'           => 'Payment recorded while creating subscription.',
                'created_by'      => auth()->id(),
            ]);

            AuditLog::record(
                model: $subscription,
                event: AuditEvent::Created,
                newValues: [
                    'name'   => $subscription->name,
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
                    'amount'         => $paymentLog->amount,
                    'payment_method' => $paymentLog->payment_method->value,
                    'status'         => $paymentLog->status->value,
                ],
                actor: auth()->user(),
                notes: 'Payment log created during subscription creation.',
            );

            AuditLog::record(
                model: $customer,
                event: AuditEvent::Updated,
                newValues: [
                    'subscription_id'     => $subscription->id,
                    'subscription_name'   => $subscription->name,
                    'subscription_amount' => (string) $subscription->amount,
                    'subscription_status' => $subscription->status->value,
                    'payment_log_id'      => $paymentLog->id,
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

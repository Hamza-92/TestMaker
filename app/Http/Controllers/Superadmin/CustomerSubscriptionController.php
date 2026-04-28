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
use App\Support\SubscriptionAccess;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
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

        $resources = $this->accessResources();
        $accessScope = SubscriptionAccess::resolveScope($subscription, $resources);
        $summaryIds = SubscriptionAccess::summaryIds($accessScope, $resources);
        $patternNames = $this->resolveNames(Pattern::class, $summaryIds['pattern_access'], 'name');
        $classNames   = $this->resolveNames(SchoolClass::class, $summaryIds['class_access'], 'name');
        $subjectNames = $this->resolveNames(Subject::class, $summaryIds['subject_access'], 'name_eng');

        $paymentLogs = $subscription->paymentLogs->map(fn (PaymentLog $log) => [
            'id'                   => $log->id,
            'amount'               => (string) $log->amount,
            'payment_method'       => $log->payment_method?->value,
            'payment_method_label' => $log->payment_method?->label(),
            'account_number'       => $log->account_number,
            'status'               => $log->status?->value,
            'status_label'         => $log->status?->label(),
            'notes'                => $log->notes,
            'rejection_reason'     => $log->rejection_reason,
            'attachments'          => collect($log->attachments ?? [])->map(fn ($p) => Storage::url($p))->all(),
            'created_at'           => $log->created_at?->toISOString(),
            'reviewed_at'          => $log->reviewed_at?->toISOString(),
            'creator_name'         => $log->creator?->name,
            'reviewer_name'        => $log->reviewer?->name,
            'is_editable'          => $log->isEditable(),
        ]);

        $paymentSummary = $this->buildPaymentSummary($subscription);

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
                'is_question_based' => $subscription->is_question_based,
                'pattern_access'    => $summaryIds['pattern_access'],
                'class_access'      => $summaryIds['class_access'],
                'subject_access'    => $summaryIds['subject_access'],
                'access_scope'      => $accessScope,
                'access_overview'   => SubscriptionAccess::overview(
                    $accessScope,
                    $resources['patterns'],
                    $resources['classes'],
                    $resources['subjects'],
                    $resources,
                ),
                'pattern_names'     => $patternNames,
                'class_names'       => $classNames,
                'subject_names'     => $subjectNames,
                'creator_name'      => $subscription->creator?->name,
                'created_at'        => $subscription->created_at?->toISOString(),
            ],
            'paymentLogs'    => $paymentLogs,
            'paymentSummary' => $paymentSummary,
            'auditLogs'      => $auditLogs,
        ]);
    }

    public function storePaymentLog(Request $request, User $customer, Subscription $subscription)
    {
        abort_unless((int) $subscription->user_id === (int) $customer->id, 404);

        $validated = $this->validatePaymentPayload($request);
        $this->ensurePaymentFitsSubscription($subscription, (float) $validated['amount']);

        $attachments = [];
        if ($request->hasFile('receipt') && $request->file('receipt')->isValid()) {
            $attachments[] = $request->file('receipt')->store('payment-receipts', 'public');
        }

        DB::transaction(function () use ($validated, $attachments, $subscription) {
            $log = PaymentLog::create([
                'subscription_id' => $subscription->id,
                'amount'          => $validated['amount'],
                'payment_method'  => $validated['payment_method'],
                'account_number'  => $validated['account_number'] ?: null,
                'status'          => PaymentStatus::PendingReview->value,
                'attachments'     => $attachments ?: null,
                'notes'           => $validated['notes'] ?: null,
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
                notes: 'Payment added.',
            );
        });

        return back()->with('success', 'Payment recorded.');
    }

    public function updatePaymentLog(Request $request, User $customer, Subscription $subscription, PaymentLog $paymentLog)
    {
        abort_unless((int) $subscription->user_id === (int) $customer->id, 404);
        abort_unless((int) $paymentLog->subscription_id === (int) $subscription->id, 404);

        if (! $paymentLog->isEditable()) {
            throw ValidationException::withMessages([
                'payment' => 'Only pending payments can be edited.',
            ]);
        }

        $validated = $this->validatePaymentPayload($request, requireReceipt: false);
        $this->ensurePaymentFitsSubscription($subscription, (float) $validated['amount'], $paymentLog);

        $attachments = $paymentLog->attachments ?? [];
        if ($request->hasFile('receipt') && $request->file('receipt')->isValid()) {
            $attachments[] = $request->file('receipt')->store('payment-receipts', 'public');
        }

        $oldValues = [
            'amount'         => (string) $paymentLog->amount,
            'payment_method' => $paymentLog->payment_method?->value,
            'status'         => $paymentLog->status?->value,
        ];

        DB::transaction(function () use ($validated, $attachments, $paymentLog, $oldValues) {
            $paymentLog->update([
                'amount'         => $validated['amount'],
                'payment_method' => $validated['payment_method'],
                'account_number' => $validated['account_number'] ?: null,
                'attachments'    => $attachments ?: null,
                'notes'          => $validated['notes'] ?: null,
            ]);

            AuditLog::record(
                model: $paymentLog,
                event: AuditEvent::Updated,
                oldValues: $oldValues,
                newValues: [
                    'amount'         => $validated['amount'],
                    'payment_method' => $validated['payment_method'],
                    'status'         => $paymentLog->status?->value,
                ],
                actor: auth()->user(),
                notes: 'Payment updated.',
            );
        });

        return back()->with('success', 'Payment updated.');
    }

    public function reviewPaymentLog(Request $request, User $customer, Subscription $subscription, PaymentLog $paymentLog)
    {
        abort_unless((int) $subscription->user_id === (int) $customer->id, 404);
        abort_unless((int) $paymentLog->subscription_id === (int) $subscription->id, 404);

        $validated = $request->validate([
            'status' => ['required', 'in:reviewed,approved,rejected'],
            'notes'  => ['nullable', 'string', 'max:1000'],
            'rejection_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $nextStatus = PaymentStatus::from($validated['status']);

        if (! $paymentLog->canTransitionTo($nextStatus)) {
            throw ValidationException::withMessages([
                'status' => 'Invalid payment status transition.',
            ]);
        }

        if ($nextStatus === PaymentStatus::Rejected && blank($validated['rejection_reason'] ?? null)) {
            throw ValidationException::withMessages([
                'rejection_reason' => 'Rejection reason is required.',
            ]);
        }

        $paymentLog->transitionTo(
            $nextStatus,
            $validated['notes'] ?? null,
            auth()->user(),
            $validated['rejection_reason'] ?? null,
        );

        return back()->with('success', 'Payment status updated.');
    }

    private function accessResources(): array
    {
        return [
            'patterns' => Pattern::where('status', 1)->orderBy('name')->get(['id', 'name', 'short_name']),
            'classes'  => SchoolClass::where('status', 1)->orderBy('name')->get(['id', 'name']),
            'subjects' => Subject::where('status', 1)->orderBy('name_eng')->get(['id', 'name_eng', 'name_ur']),
            ...SubscriptionAccess::buildMaps(),
        ];
    }

    private function resolveNames(string $model, ?array $ids, string $column): array|null
    {
        if ($ids === null) return null;
        if (empty($ids)) return [];
        return $model::whereIn('id', $ids)->pluck($column)->all();
    }

    public function edit(User $customer, Subscription $subscription)
    {
        abort_unless((int) $subscription->user_id === (int) $customer->id, 404);

        $resources = $this->accessResources();

        return Inertia::render('superadmin/customers/subscriptions/edit', [
            'customer' => $customer->only(['id', 'name', 'email', 'school_name']),
            'subscription' => [
                'id'                => $subscription->id,
                'name'              => $subscription->name,
                'amount'            => (string) $subscription->amount,
                'allowed_questions' => $subscription->allowed_questions,
                'started_at'        => $subscription->started_at?->toDateString(),
                'duration'          => $subscription->duration,
                'status'            => $subscription->status?->value,
                'allow_teachers'    => $subscription->allow_teachers,
                'max_teachers'      => $subscription->max_teachers,
                'is_question_based' => $subscription->is_question_based,
                'access_scope'      => SubscriptionAccess::resolveScope($subscription, $resources),
            ],
            'patterns'        => $resources['patterns'],
            'classes'         => $resources['classes'],
            'subjects'        => $resources['subjects'],
            'patternClassMap' => $resources['patternClassMap'],
            'classSubjectMap' => $resources['classSubjectMap'],
        ]);
    }

    public function update(Request $request, User $customer, Subscription $subscription)
    {
        abort_unless((int) $subscription->user_id === (int) $customer->id, 404);

        $resources = $this->accessResources();

        $validated = $request->validate([
            'name'               => ['required', 'string', 'max:255'],
            'amount'             => ['required', 'numeric', 'min:0'],
            'is_question_based'  => ['boolean'],
            'allowed_questions'  => [
                Rule::requiredIf(fn () => $request->boolean('is_question_based')),
                'nullable', 'integer', 'min:0',
            ],
            'started_at'         => ['required', 'date'],
            'duration'           => ['required', 'integer', 'min:1'],
            'status'             => ['required', 'in:active,expired,cancelled'],
            'access_scope'       => ['nullable', 'array'],
            'allow_teachers'     => ['boolean'],
            'max_teachers'       => ['nullable', 'integer', 'min:1'],
        ]);

        $startedAt = Carbon::parse($validated['started_at'])->startOfDay();
        $accessScope = SubscriptionAccess::normalizeScope($validated['access_scope'] ?? null, $resources);
        $summaryIds = SubscriptionAccess::summaryIds($accessScope, $resources);
        $oldAccessScope = SubscriptionAccess::resolveScope($subscription, $resources);
        $oldSummaryIds = SubscriptionAccess::summaryIds($oldAccessScope, $resources);

        $oldValues = [
            'name'           => $subscription->name,
            'amount'         => (string) $subscription->amount,
            'status'         => $subscription->status?->value,
            'pattern_access' => $oldSummaryIds['pattern_access'],
            'class_access'   => $oldSummaryIds['class_access'],
            'subject_access' => $oldSummaryIds['subject_access'],
            'access_scope'   => $oldAccessScope,
        ];

        DB::transaction(function () use ($validated, $startedAt, $subscription, $oldValues, $accessScope, $summaryIds) {
            $isQuestionBased = $validated['is_question_based'] ?? false;
            $subscription->update([
                'name'               => $validated['name'],
                'pattern_access'     => $summaryIds['pattern_access'],
                'class_access'       => $summaryIds['class_access'],
                'subject_access'     => $summaryIds['subject_access'],
                'access_scope'       => $accessScope,
                'allow_teachers'     => $validated['allow_teachers'] ?? false,
                'max_teachers'       => ($validated['allow_teachers'] ?? false) ? ($validated['max_teachers'] ?? null) : null,
                'is_question_based'  => $isQuestionBased,
                'allowed_questions'  => $isQuestionBased ? ($validated['allowed_questions'] ?? null) : null,
                'amount'             => $validated['amount'],
                'started_at'         => $startedAt,
                'duration'           => $validated['duration'],
                'expired_at'         => $startedAt->copy()->addDays((int) $validated['duration']),
                'status'             => $validated['status'],
            ]);

            AuditLog::record(
                model: $subscription,
                event: AuditEvent::Updated,
                oldValues: $oldValues,
                newValues: [
                    'name'           => $subscription->name,
                    'amount'         => (string) $subscription->amount,
                    'status'         => $subscription->status->value,
                    'pattern_access' => $subscription->pattern_access,
                    'class_access'   => $subscription->class_access,
                    'subject_access' => $subscription->subject_access,
                    'access_scope'   => $subscription->access_scope,
                ],
                actor: auth()->user(),
                notes: 'Subscription updated.',
            );
        });

        return redirect()
            ->route('superadmin.customers.subscriptions.show', [$customer, $subscription])
            ->with('success', 'Subscription updated successfully.');
    }

    public function create(User $customer)
    {
        $resources = $this->accessResources();

        return Inertia::render('superadmin/customers/subscriptions/add', [
            'customer'        => $customer->only(['id', 'name', 'email', 'school_name']),
            'patterns'        => $resources['patterns'],
            'classes'         => $resources['classes'],
            'subjects'        => $resources['subjects'],
            'patternClassMap' => $resources['patternClassMap'],
            'classSubjectMap' => $resources['classSubjectMap'],
        ]);
    }

    public function store(Request $request, User $customer)
    {
        $resources = $this->accessResources();

        $validated = $request->validate([
            'name'               => ['required', 'string', 'max:255'],
            'amount'             => ['required', 'numeric', 'min:0'],
            'is_question_based'  => ['boolean'],
            'allowed_questions'  => [
                Rule::requiredIf(fn () => $request->boolean('is_question_based')),
                'nullable', 'integer', 'min:0',
            ],
            'started_at'         => ['required', 'date'],
            'duration'           => ['required', 'integer', 'min:1'],
            'status'             => ['required', 'in:active,expired,cancelled'],
            'access_scope'       => ['nullable', 'array'],
            'allow_teachers'     => ['boolean'],
            'max_teachers'       => ['nullable', 'integer', 'min:1'],
        ]);

        $startedAt = Carbon::parse($validated['started_at'])->startOfDay();
        $accessScope = SubscriptionAccess::normalizeScope($validated['access_scope'] ?? null, $resources);
        $summaryIds = SubscriptionAccess::summaryIds($accessScope, $resources);
        $createdSubscription = null;

        DB::transaction(function () use ($validated, $startedAt, $customer, $accessScope, $summaryIds, &$createdSubscription) {
            $isQuestionBased = $validated['is_question_based'] ?? false;
            $createdSubscription = Subscription::create([
                'user_id'            => $customer->id,
                'name'               => $validated['name'],
                'pattern_access'     => $summaryIds['pattern_access'],
                'class_access'       => $summaryIds['class_access'],
                'subject_access'     => $summaryIds['subject_access'],
                'access_scope'       => $accessScope,
                'allow_teachers'     => $validated['allow_teachers'] ?? false,
                'max_teachers'       => ($validated['allow_teachers'] ?? false) ? ($validated['max_teachers'] ?? null) : null,
                'is_question_based'  => $isQuestionBased,
                'allowed_questions'  => $isQuestionBased ? ($validated['allowed_questions'] ?? null) : null,
                'amount'             => $validated['amount'],
                'started_at'        => $startedAt,
                'duration'          => $validated['duration'],
                'expired_at'        => $startedAt->copy()->addDays((int) $validated['duration']),
                'status'            => $validated['status'],
                'created_by'        => auth()->id(),
            ]);

            AuditLog::record(
                model: $createdSubscription,
                event: AuditEvent::Created,
                newValues: [
                    'name'           => $createdSubscription->name,
                    'amount'         => $createdSubscription->amount,
                    'status'         => $createdSubscription->status->value,
                    'pattern_access' => $createdSubscription->pattern_access,
                    'class_access'   => $createdSubscription->class_access,
                    'subject_access' => $createdSubscription->subject_access,
                    'access_scope'   => $createdSubscription->access_scope,
                ],
                actor: auth()->user(),
                notes: 'Subscription created for customer.',
            );

            AuditLog::record(
                model: $customer,
                event: AuditEvent::Updated,
                newValues: [
                    'subscription_id'     => $createdSubscription->id,
                    'subscription_name'   => $createdSubscription->name,
                    'subscription_amount' => (string) $createdSubscription->amount,
                    'subscription_status' => $createdSubscription->status->value,
                ],
                actor: auth()->user(),
                notes: 'A new subscription was added for this customer.',
            );
        });

        return redirect()
            ->route('superadmin.customers.subscriptions.show', [$customer, $createdSubscription])
            ->with('success', 'Subscription added successfully.');
    }

    private function validatePaymentPayload(Request $request, bool $requireReceipt = true): array
    {
        return $request->validate([
            'amount'         => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'in:cash,bank_transfer,online,cheque'],
            'account_number' => ['nullable', 'string', 'max:100'],
            'notes'          => ['nullable', 'string', 'max:1000'],
            'receipt'        => [
                $requireReceipt ? 'required' : 'nullable',
                'file', 'mimes:jpg,jpeg,png,pdf,webp', 'max:5120',
            ],
        ]);
    }

    private function ensurePaymentFitsSubscription(
        Subscription $subscription,
        float $amount,
        ?PaymentLog $ignoredLog = null,
    ): void {
        $remainingTrackableAmount = (float) $this->buildPaymentSummary($subscription, $ignoredLog)['remaining_trackable_amount'];

        if ($amount - $remainingTrackableAmount > 0.00001) {
            throw ValidationException::withMessages([
                'amount' => 'Payment amount exceeds the remaining balance for this subscription.',
            ]);
        }
    }

    private function buildPaymentSummary(Subscription $subscription, ?PaymentLog $ignoredLog = null): array
    {
        $logs = $subscription->relationLoaded('paymentLogs')
            ? $subscription->paymentLogs
            : $subscription->paymentLogs()->get();

        if ($ignoredLog) {
            $logs = $logs->reject(fn (PaymentLog $log) => (int) $log->id === (int) $ignoredLog->id)->values();
        }

        $subscriptionAmount = (float) $subscription->amount;
        $receivedAmount = (float) $logs
            ->filter(fn (PaymentLog $log) => $log->status === PaymentStatus::Approved)
            ->sum('amount');
        $underReviewAmount = (float) $logs
            ->filter(fn (PaymentLog $log) => in_array($log->status, [PaymentStatus::PendingReview, PaymentStatus::Reviewed], true))
            ->sum('amount');
        $trackedAmount = (float) $logs
            ->filter(fn (PaymentLog $log) => $log->status !== PaymentStatus::Rejected)
            ->sum('amount');

        return [
            'subscription_amount'       => number_format($subscriptionAmount, 2, '.', ''),
            'received_amount'           => number_format($receivedAmount, 2, '.', ''),
            'under_review_amount'       => number_format($underReviewAmount, 2, '.', ''),
            'pending_amount'            => number_format(max($subscriptionAmount - $receivedAmount, 0), 2, '.', ''),
            'remaining_trackable_amount'=> number_format(max($subscriptionAmount - $trackedAmount, 0), 2, '.', ''),
        ];
    }
}

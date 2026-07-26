<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Enums\UserType;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PaymentLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CustomerController extends Controller
{
    public function index()
    {
        $today = now()->startOfDay();
        $todayStr = $today->toDateString();
        $nearExpiryThresholdDays = 7;
        $currentUserId = auth()->id();

        $customers = User::where('user_type', UserType::Customer)
            ->with([
                'subscriptions' => fn ($q) => $q
                    ->latest('started_at')
                    ->select(['id', 'user_id', 'name', 'amount', 'started_at', 'expired_at', 'duration', 'status', 'created_by'])
                    ->with(['paymentLogs' => fn ($pq) => $pq->select([
                        'id', 'subscription_id', 'amount', 'commission_amount',
                        'status', 'next_payment_date', 'created_by',
                    ])]),
            ])
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'email', 'school_name', 'logo', 'city', 'province', 'status', 'account_type', 'created_at'])
            ->map(function (User $customer) use ($today, $todayStr, $nearExpiryThresholdDays, $currentUserId) {
                $activeSubscription = $customer->subscriptions->first(
                    fn ($subscription) => $subscription->status?->value === 'active'
                );

                $subscription = $activeSubscription ?? $customer->subscriptions->first();
                $subscriptionStatus = $subscription?->status?->value;
                $daysToExpiry = $subscription?->expired_at
                    ? $today->diffInDays($subscription->expired_at->copy()->startOfDay(), false)
                    : null;

                $planState = match (true) {
                    $subscription === null => 'no_plan',
                    $subscriptionStatus === 'cancelled' => 'cancelled',
                    $subscriptionStatus === 'expired' || ($daysToExpiry !== null && $daysToExpiry < 0) => 'expired',
                    $subscriptionStatus === 'active' && $daysToExpiry !== null && $daysToExpiry <= $nearExpiryThresholdDays => 'near_expiry',
                    $subscriptionStatus === 'active' => 'active',
                    default => 'no_plan',
                };

                $allLogs = $customer->subscriptions->flatMap(fn ($s) => $s->paymentLogs);

                $totalPaid = (int) $allLogs
                    ->filter(fn ($l) => $l->status?->value === 'approved')
                    ->sum('amount');

                $totalPending = (int) $allLogs
                    ->filter(fn ($l) => in_array($l->status?->value, ['pending_review', 'reviewed']))
                    ->sum('amount');

                $totalDues = max(0, (int) $customer->subscriptions->sum('amount') - $totalPaid);

                $myCommission = (int) $allLogs
                    ->filter(fn ($l) => (int) $l->created_by === $currentUserId)
                    ->sum('commission_amount');

                $nextPaymentDate = $allLogs
                    ->filter(fn ($l) => $l->next_payment_date !== null && $l->next_payment_date >= $todayStr)
                    ->sortBy('next_payment_date')
                    ->first()
                    ?->next_payment_date;

                $isMyCustomer = $customer->subscriptions->some(fn ($s) => (int) $s->created_by === $currentUserId)
                    || $allLogs->some(fn ($l) => (int) $l->created_by === $currentUserId);

                return [
                    'id'                 => $customer->id,
                    'name'               => $customer->name,
                    'email'              => $customer->email,
                    'school_name'        => $customer->school_name,
                    'logo'               => $customer->logo,
                    'city'               => $customer->city,
                    'province'           => $customer->province,
                    'status'             => $customer->status?->value,
                    'account_type'       => $customer->account_type?->value,
                    'created_at'         => $customer->created_at?->toISOString(),
                    'subscription_count' => $customer->subscriptions->count(),
                    'plan_state'         => $planState,
                    'subscription'       => $subscription ? [
                        'id'             => $subscription->id,
                        'name'           => $subscription->name,
                        'amount'         => (string) $subscription->amount,
                        'started_at'     => $subscription->started_at?->toISOString(),
                        'expired_at'     => $subscription->expired_at?->toISOString(),
                        'duration'       => $subscription->duration,
                        'status'         => $subscription->status?->value,
                        'days_to_expiry' => $daysToExpiry,
                    ] : null,
                    'total_paid'         => (string) $totalPaid,
                    'total_pending'      => (string) $totalPending,
                    'total_dues'         => (string) $totalDues,
                    'my_commission'      => (string) $myCommission,
                    'next_payment_date'  => $nextPaymentDate,
                    'is_my_customer'     => $isMyCustomer,
                ];
            })
            ->values();

        return Inertia::render('superadmin/customers', [
            'customers' => $customers,
        ]);
    }

    public function show(User $customer)
    {
        $customer->load([
            'subscriptions' => fn ($q) => $q->latest('started_at')
                ->select(['id', 'user_id', 'name', 'amount', 'allowed_questions', 'started_at', 'expired_at', 'duration', 'status']),
            'auditLogs' => fn ($q) => $q->with('changedBy:id,name')->latest('created_at'),
        ]);

        $paymentLogs = PaymentLog::query()
            ->whereHas('subscription', fn ($q) => $q->where('user_id', $customer->id))
            ->with([
                'subscription:id,name',
                'creator:id,name',
                'reviewer:id,name',
            ])
            ->latest()
            ->get()
            ->map(fn (PaymentLog $log) => [
                'id'                   => $log->id,
                'subscription_id'      => $log->subscription_id,
                'subscription_name'    => $log->subscription?->name,
                'amount'               => (string) $log->amount,
                'payment_method'       => $log->payment_method?->value,
                'payment_method_label' => $log->payment_method?->label(),
                'status'               => $log->status?->value,
                'status_label'         => $log->status?->label(),
                'account_number'       => $log->account_number,
                'notes'                => $log->notes,
                'created_at'           => $log->created_at?->toISOString(),
                'creator_name'         => $log->creator?->name,
                'reviewed_at'          => $log->reviewed_at?->toISOString(),
                'reviewer_name'        => $log->reviewer?->name,
            ]);

        $customerLogs = $customer->auditLogs
            ->map(fn ($log) => $this->transformCustomerLog($customer, $log));

        return Inertia::render('superadmin/customers/show', [
            'customer' => $customer->only([
                'id', 'name', 'email', 'phone',
                'school_name', 'logo',
                'address', 'city', 'province', 'is_show_address',
                'status', 'account_type', 'created_at',
                'subscriptions',
            ]),
            'paymentLogs' => $paymentLogs,
            'customerLogs' => $customerLogs,
        ]);
    }

    public function showLog(User $customer, AuditLog $log)
    {
        abort_unless(
            $log->auditable_type === $customer->getMorphClass()
            && (int) $log->auditable_id === (int) $customer->getKey(),
            404
        );

        $log->loadMissing('changedBy:id,name');

        return Inertia::render('superadmin/customers/logs/show', [
            'customer' => $customer->only(['id', 'name']),
            'log' => [
                'id' => $log->id,
                'summary' => $this->buildCustomerLogSummary($log),
                'detail' => $this->buildCustomerLogDetail($log),
                'event' => $log->event?->value,
                'changed_by_name' => $log->changedBy?->name,
                'notes' => $log->notes,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at?->toISOString(),
                'old_values' => $log->old_values ?? [],
                'new_values' => $log->new_values ?? [],
            ],
        ]);
    }

    public function edit(User $customer)
    {
        return Inertia::render('superadmin/customers/edit', [
            'customer' => $customer->only([
                'id', 'name', 'email', 'phone',
                'school_name', 'logo',
                'address', 'city', 'province', 'is_show_address',
                'status', 'account_type',
            ]),
        ]);
    }

    public function create()
    {
        return Inertia::render('superadmin/customers/add');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                  => ['required', 'string', 'max:255'],
            'email'                 => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone'                 => ['required', 'string', 'max:30'],
            'password'              => ['required', 'string', 'min:3', 'confirmed'],
            'status'                => ['required', 'in:active,inactive,suspended'],
            'account_type'          => ['required', 'in:trial,paid'],
            'school_name'           => ['nullable', 'string', 'max:255'],
            'logo'                  => ['nullable', 'image', 'mimes:png,jpg,jpeg', 'max:2048'],
            'address'               => ['nullable', 'string', 'max:255'],
            'city'                  => ['nullable', 'string', 'max:100'],
            'province'              => ['nullable', 'string', 'max:100'],
            'is_show_address'       => ['boolean'],
        ]);

        if ($request->hasFile('logo')) {
            $validated['logo'] = $request->file('logo')->store('logos', 'public');
        }

        $validated['password']   = Hash::make($validated['password']);
        $validated['user_type']  = UserType::Customer->value;
        $validated['created_by'] = auth()->id();

        $customer = User::create($validated);

        AuditLog::record(
            model: $customer,
            event: AuditEvent::Created,
            newValues: [
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'status' => $customer->status->value,
            ],
            actor: auth()->user(),
            notes: 'Customer account created.',
        );

        return redirect()->route('superadmin.customers')
            ->with('success', 'Customer created successfully.');
    }

    public function update(Request $request, User $customer)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($customer->id)],
            'phone' => ['required', 'string', 'max:30'],
            'status' => ['required', 'in:active,inactive,suspended'],
            'account_type' => ['required', 'in:trial,paid'],
            'school_name' => ['nullable', 'string', 'max:255'],
            'logo' => ['nullable', 'image', 'mimes:png,jpg,jpeg', 'max:2048'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'province' => ['nullable', 'string', 'max:100'],
            'is_show_address' => ['boolean'],
            'remove_logo' => ['boolean'],
        ]);

        $oldValues = [
            'name' => $customer->name,
            'email' => $customer->email,
            'phone' => $customer->phone,
            'status' => $customer->status->value,
            'account_type' => $customer->account_type?->value,
            'school_name' => $customer->school_name,
            'address' => $customer->address,
            'city' => $customer->city,
            'province' => $customer->province,
            'is_show_address' => $customer->is_show_address,
            'logo' => $customer->logo,
        ];

        if (($validated['remove_logo'] ?? false) && $customer->logo) {
            Storage::disk('public')->delete($customer->logo);
            $validated['logo'] = null;
        } elseif ($request->hasFile('logo')) {
            if ($customer->logo) {
                Storage::disk('public')->delete($customer->logo);
            }

            $validated['logo'] = $request->file('logo')->store('logos', 'public');
        } else {
            unset($validated['logo']);
        }

        unset($validated['remove_logo']);

        $customer->fill($validated);

        $changes = $customer->getDirty();

        if (!empty($changes)) {
            $customer->save();

            $newValues = [];
            foreach (array_keys($changes) as $field) {
                $value = $customer->{$field};
                $newValues[$field] = $value instanceof \BackedEnum ? $value->value : $value;
            }

            $oldChangedValues = [];
            foreach (array_keys($changes) as $field) {
                $oldChangedValues[$field] = $oldValues[$field] ?? null;
            }

            AuditLog::record(
                model: $customer,
                event: AuditEvent::Updated,
                oldValues: $oldChangedValues,
                newValues: $newValues,
                actor: auth()->user(),
                notes: 'Customer details updated.',
            );
        }

        return redirect()
            ->route('superadmin.customers.show', $customer)
            ->with('success', 'Customer updated successfully.');
    }

    public function resetPassword(Request $request, User $customer)
    {
        abort_unless($customer->isCustomer(), 404);

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:3', 'confirmed'],
        ]);

        $customer->password = Hash::make($validated['password']);
        $customer->save();

        AuditLog::record(
            model: $customer,
            event: AuditEvent::Updated,
            newValues: ['password' => '[reset by superadmin]'],
            actor: auth()->user(),
            notes: 'Customer password reset by superadmin.',
        );

        return redirect()->route('superadmin.customers.show', $customer);
    }

    public function loginAsCustomer(Request $request, User $customer)
    {
        abort_unless($customer->isCustomer(), 404);

        $request->session()->put('impersonator_id', $request->user()->id);
        Auth::login($customer);
        $request->session()->regenerate();

        return redirect()->route('dashboard');
    }

    public function stopImpersonation(Request $request)
    {
        $impersonatorId = $request->session()->pull('impersonator_id');

        abort_unless($request->user()?->isCustomer() && $impersonatorId, 403);

        $admin = User::query()
            ->whereKey($impersonatorId)
            ->whereIn('user_type', [UserType::SuperAdmin->value, UserType::Staff->value])
            ->first();

        if (! $admin) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login');
        }

        Auth::login($admin);
        $request->session()->regenerate();

        return redirect()->route('superadmin.customers');
    }

    private function transformCustomerLog(User $customer, AuditLog $log): array
    {
        return [
            'id' => $log->id,
            'summary' => $this->buildCustomerLogSummary($log),
            'detail' => $this->buildCustomerLogDetail($log),
            'event' => $log->event?->value,
            'created_at' => $log->created_at?->toISOString(),
            'href' => route('superadmin.customers.logs.show', [$customer, $log]),
        ];
    }

    private function buildCustomerLogSummary(AuditLog $log): string
    {
        $actor = $log->changedBy?->name ?? 'System';
        $newValues = $log->new_values ?? [];

        if (isset($newValues['subscription_name'])) {
            $amount = isset($newValues['subscription_amount'])
                ? ' for Rs. '.number_format((float) $newValues['subscription_amount'])
                : '';

            return "{$actor} added the {$newValues['subscription_name']} subscription{$amount}.";
        }

        return match ($log->event) {
            AuditEvent::Created => "{$actor} created the customer account.",
            AuditEvent::Updated => $this->buildCustomerUpdateSummary($actor, $newValues),
            AuditEvent::Deleted => "{$actor} deleted this customer.",
            AuditEvent::Restored => "{$actor} restored this customer.",
        };
    }

    private function buildCustomerUpdateSummary(string $actor, array $newValues): string
    {
        if (empty($newValues)) {
            return "{$actor} updated the customer details.";
        }

        $fields = $this->formatAuditFieldList(array_keys($newValues));

        return "{$actor} updated {$fields}.";
    }

    private function buildCustomerLogDetail(AuditLog $log): ?string
    {
        $newValues = $log->new_values ?? [];

        if (isset($newValues['subscription_name'])) {
            $details = [];

            if (isset($newValues['subscription_amount'])) {
                $details[] = 'Amount: Rs. '.number_format((float) $newValues['subscription_amount']);
            }

            if (isset($newValues['subscription_status'])) {
                $details[] = 'Status: '.$this->formatAuditValue('subscription_status', $newValues['subscription_status']);
            }

            if (isset($newValues['payment_log_id'])) {
                $details[] = 'Payment log created';
            }

            return !empty($details) ? implode(' · ', $details) : $log->notes;
        }

        if (empty($newValues)) {
            return $log->notes;
        }

        $details = collect($newValues)
            ->take(3)
            ->map(fn ($value, $field) => $this->auditFieldLabel((string) $field).': '.$this->formatAuditValue((string) $field, $value))
            ->values()
            ->all();

        $remaining = count($newValues) - count($details);

        if ($remaining > 0) {
            $details[] = "+{$remaining} more";
        }

        return implode(' · ', $details);
    }

    private function formatAuditFieldList(array $fields): string
    {
        $labels = array_map(fn ($field) => $this->auditFieldLabel($field), $fields);

        if (count($labels) === 1) {
            return $labels[0];
        }

        if (count($labels) === 2) {
            return $labels[0].' and '.$labels[1];
        }

        $last = array_pop($labels);

        return implode(', ', $labels).', and '.$last;
    }

    private function auditFieldLabel(string $field): string
    {
        return match ($field) {
            'name' => 'name',
            'email' => 'email',
            'phone' => 'phone number',
            'status' => 'status',
            'account_type' => 'account type',
            'school_name' => 'school name',
            'address' => 'address',
            'city' => 'city',
            'province' => 'province',
            'is_show_address' => 'public address setting',
            'logo' => 'logo',
            'subscription_name' => 'subscription',
            'subscription_amount' => 'amount',
            'subscription_status' => 'subscription status',
            default => str_replace('_', ' ', $field),
        };
    }

    private function formatAuditValue(string $field, mixed $value): string
    {
        if (is_bool($value)) {
            return $value ? 'Enabled' : 'Disabled';
        }

        if ($value === null || $value === '') {
            return 'Empty';
        }

        if (in_array($field, ['amount', 'subscription_amount'], true)) {
            return 'Rs. '.number_format((float) $value);
        }

        if (in_array($field, ['status', 'subscription_status'], true)) {
            return ucfirst(str_replace('_', ' ', (string) $value));
        }

        return (string) $value;
    }
}

<?php

namespace App\Support;

use App\Enums\AccountType;
use App\Enums\PaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\AuditLog;
use App\Models\PaymentLog;
use App\Models\Subscription;
use App\Models\TrialSetting;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Storage;

class SuperadminDashboardSummary
{
    public static function for(User $actor): array
    {
        $summary = [];
        $now = now();
        $canViewPaid = CustomerAccess::canViewType($actor, AccountType::Paid);
        $canViewTrial = CustomerAccess::canViewType($actor, AccountType::Trial);

        if ($canViewPaid) {
            $paidCustomers = CustomerAccess::visibleTo($actor, AccountType::Paid)
                ->where('status', UserStatus::Active->value);

            $summary['paid_customers'] = $paidCustomers
                ->whereHas('subscriptions', fn (Builder $query) => $query
                    ->where('status', SubscriptionStatus::Active->value)
                    ->where(fn (Builder $expiry) => $expiry
                        ->whereNull('expired_at')
                        ->orWhere('expired_at', '>', $now)))
                ->count();

            $summary['expiring_soon'] = self::expiringPaidSubscriptions($actor, $now)->count();
        }

        if ($canViewTrial) {
            $trialDuration = (int) (TrialSetting::query()->value('trial_duration_days') ?? 30);

            $summary['active_trials'] = CustomerAccess::visibleTo($actor, AccountType::Trial)
                ->where('status', UserStatus::Active->value)
                ->where(fn (Builder $query) => $query
                    ->whereHas('subscriptions', fn (Builder $subscriptions) => $subscriptions
                        ->where('status', SubscriptionStatus::Active->value)
                        ->where(fn (Builder $expiry) => $expiry
                            ->whereNull('expired_at')
                            ->orWhere('expired_at', '>', $now)))
                    ->orWhere(fn (Builder $noPlan) => $noPlan
                        ->whereDoesntHave('subscriptions')
                        ->where('created_at', '>=', $now->copy()->subDays($trialDuration))))
                ->count();
        }

        if (($canViewPaid || $canViewTrial) && $actor->can('subscriptions.view')) {
            $visibleTypes = array_values(array_filter([
                $canViewPaid ? AccountType::Paid->value : null,
                $canViewTrial ? AccountType::Trial->value : null,
            ]));

            $visiblePayments = self::visiblePayments($actor, $visibleTypes);

            if ($actor->can('subscriptions.manage_payments')) {
                $summary['pending_payments'] = (clone $visiblePayments)
                    ->whereIn('status', [PaymentStatus::PendingReview->value, PaymentStatus::Reviewed->value])
                    ->count();
            }

            $monthStart = now('Asia/Karachi')->startOfMonth();
            $summary['approved_payments_this_month'] = (string) (clone $visiblePayments)
                ->where('status', PaymentStatus::Approved->value)
                ->where('created_at', '>=', $monthStart->copy()->utc())
                ->where('created_at', '<', $monthStart->copy()->addMonth()->utc())
                ->sum('amount');
        }

        return $summary;
    }

    public static function trendsFor(User $actor): array
    {
        $canViewPaid = CustomerAccess::canViewType($actor, AccountType::Paid);
        $canViewTrial = CustomerAccess::canViewType($actor, AccountType::Trial);
        $now = now('Asia/Karachi');
        $start = $now->copy()->startOfMonth()->subMonths(11);
        $months = [];
        $days = [];

        for ($offset = 11; $offset >= 0; $offset--) {
            $month = $now->copy()->startOfMonth()->subMonths($offset);
            $months[$month->format('Y-m')] = [
                'month' => $month->format('Y-m'),
                'label' => $month->format('M'),
            ];
        }

        for ($offset = 0; $offset < $now->day; $offset++) {
            $day = $now->copy()->startOfMonth()->addDays($offset);
            $days[$day->toDateString()] = [
                'date' => $day->toDateString(),
                'label' => $day->format('j'),
            ];
        }

        $trends = [];
        $visibleTypes = array_values(array_filter([
            $canViewPaid ? AccountType::Paid->value : null,
            $canViewTrial ? AccountType::Trial->value : null,
        ]));

        if ($canViewPaid || $canViewTrial) {
            $customers = array_map(fn (array $month) => $month + [
                'paid' => null,
                'trial' => null,
            ], $months);
            $customerDays = array_map(fn (array $day) => $day + [
                'paid' => null,
                'trial' => null,
            ], $days);

            foreach ([AccountType::Paid, AccountType::Trial] as $type) {
                if (! CustomerAccess::canViewType($actor, $type)) {
                    continue;
                }

                foreach ($customers as &$month) {
                    $month[$type->value] = 0;
                }
                unset($month);

                foreach ($customerDays as &$day) {
                    $day[$type->value] = 0;
                }
                unset($day);

                CustomerAccess::visibleTo($actor, $type)
                    ->where('created_at', '>=', $start->copy()->utc())
                    ->where('created_at', '<=', $now->copy()->utc())
                    ->select(['id', 'created_at'])
                    ->lazyById()
                    ->each(function (User $customer) use (&$customers, &$customerDays, $type): void {
                        $createdAt = $customer->created_at->timezone('Asia/Karachi');
                        $customers[$createdAt->format('Y-m')][$type->value]++;

                        if (isset($customerDays[$createdAt->toDateString()])) {
                            $customerDays[$createdAt->toDateString()][$type->value]++;
                        }
                    });
            }

            $trends['customers'] = array_values($customers);
            $trends['customerDays'] = array_values($customerDays);
        }

        return $trends;
    }

    public static function paymentsToReviewFor(User $actor): ?array
    {
        $visibleTypes = array_values(array_filter([
            CustomerAccess::canViewType($actor, AccountType::Paid) ? AccountType::Paid->value : null,
            CustomerAccess::canViewType($actor, AccountType::Trial) ? AccountType::Trial->value : null,
        ]));

        if ($visibleTypes === [] || ! $actor->can('subscriptions.view') || ! $actor->can('subscriptions.manage_payments')) {
            return null;
        }

        return self::visiblePayments($actor, $visibleTypes)
            ->whereIn('status', [PaymentStatus::PendingReview->value, PaymentStatus::Reviewed->value])
            ->with([
                'subscription.user:id,name,school_name,email,phone',
                'subscription.paymentLogs:id,subscription_id,amount,status,created_at',
                'creator:id,name',
                'reviewer:id,name',
            ])
            ->latest('created_at')
            ->limit(5)
            ->get()
            ->map(function (PaymentLog $log) {
                $subscription = $log->subscription;
                $payments = $subscription->paymentLogs;
                $approved = (float) $payments
                    ->filter(fn (PaymentLog $payment) => $payment->status === PaymentStatus::Approved)
                    ->sum('amount');

                return [
                    'id' => $log->id,
                    'customer_id' => $subscription->user_id,
                    'customer_name' => $subscription->user->school_name ?: $subscription->user->name,
                    'school_name' => $subscription->user->school_name,
                    'customer_contact_name' => $subscription->user->name,
                    'customer_email' => $subscription->user->email,
                    'customer_phone' => $subscription->user->phone,
                    'subscription_id' => $subscription->id,
                    'subscription_name' => $subscription->name,
                    'subscription_amount' => (string) $subscription->amount,
                    'approved_amount' => number_format($approved, 2, '.', ''),
                    'balance_amount' => number_format(max((float) $subscription->amount - $approved, 0), 2, '.', ''),
                    'subscription_started_at' => $subscription->started_at?->toISOString(),
                    'subscription_expired_at' => $subscription->expired_at?->toISOString(),
                    'amount' => (string) $log->amount,
                    'payment_method' => $log->account_number === 'legacy-testmaker'
                        ? 'Legacy TestMaker Record'
                        : $log->payment_method?->label(),
                    'account_number' => $log->account_number === 'legacy-testmaker' ? null : $log->account_number,
                    'next_payment_date' => $log->next_payment_date?->toDateString(),
                    'status' => $log->status->value,
                    'created_at' => $log->created_at->toISOString(),
                    'recorded_by' => $log->creator?->name,
                    'reviewed_at' => $log->reviewed_at?->toISOString(),
                    'reviewed_by' => $log->reviewer?->name,
                    'notes' => $log->notes,
                    'receipts' => collect($log->attachments ?? [])->map(fn (string $path) => Storage::url($path))->all(),
                    'recent_payments' => $payments
                        ->sortByDesc('created_at')
                        ->take(4)
                        ->map(fn (PaymentLog $payment) => [
                            'id' => $payment->id,
                            'amount' => (string) $payment->amount,
                            'status' => $payment->status?->value,
                            'created_at' => $payment->created_at?->toISOString(),
                        ])
                        ->values()
                        ->all(),
                ];
            })
            ->all();
    }

    public static function expiringSubscriptionsFor(User $actor): ?array
    {
        if (! CustomerAccess::canViewType($actor, AccountType::Paid) || ! $actor->can('subscriptions.view')) {
            return null;
        }

        $now = now();
        $sevenDaysFromNow = $now->copy()->addDays(7);

        return self::expiringPaidSubscriptions($actor, $now)
            ->with('user:id,name,school_name')
            ->orderBy('expired_at')
            ->orderBy('id')
            ->limit(5)
            ->get(['id', 'user_id', 'name', 'expired_at'])
            ->map(fn (Subscription $subscription) => [
                'id' => $subscription->id,
                'customer_id' => $subscription->user_id,
                'school_name' => $subscription->user->school_name ?: $subscription->user->name,
                'plan_name' => $subscription->name,
                'expires_at' => $subscription->expired_at->toISOString(),
                'days_left' => max(1, (int) ceil($now->diffInDays($subscription->expired_at))),
                'within_7_days' => $subscription->expired_at->lessThanOrEqualTo($sevenDaysFromNow),
            ])
            ->all();
    }

    public static function recentExpiredCustomersFor(User $actor): ?array
    {
        if (! CustomerAccess::canViewType($actor, AccountType::Paid) || ! $actor->can('subscriptions.view')) {
            return null;
        }

        $now = now();
        $since = $now->copy()->subDays(30);
        $expired = fn ($query) => $query
            ->whereNotNull('expired_at')
            ->where('expired_at', '>', $since)
            ->where('expired_at', '<=', $now)
            ->where('status', '!=', SubscriptionStatus::Cancelled->value);

        return CustomerAccess::visibleTo($actor, AccountType::Paid)
            ->where('status', UserStatus::Active->value)
            ->whereHas('subscriptions', $expired)
            ->whereDoesntHave('subscriptions', fn (Builder $query) => $query
                ->where('status', SubscriptionStatus::Active->value)
                ->where(fn (Builder $expiry) => $expiry
                    ->whereNull('expired_at')
                    ->orWhere('expired_at', '>', $now)))
            ->with(['subscriptions' => fn ($query) => $expired($query)->orderByDesc('expired_at')])
            ->withMax(['subscriptions as last_expired_at' => $expired], 'expired_at')
            ->orderByDesc('last_expired_at')
            ->limit(5)
            ->get(['id', 'name', 'school_name'])
            ->map(function (User $customer) use ($now) {
                $subscription = $customer->subscriptions->first();

                return [
                    'customer_id' => $customer->id,
                    'school_name' => $customer->school_name ?: $customer->name,
                    'plan_name' => $subscription->name,
                    'expired_at' => $subscription->expired_at->toISOString(),
                    'days_ago' => max(0, (int) floor($subscription->expired_at->diffInDays($now))),
                ];
            })
            ->all();
    }

    public static function subscriptionStatusFor(User $actor): ?array
    {
        $types = self::visibleCustomerTypes($actor);

        if ($types === [] || ! $actor->can('subscriptions.view')) {
            return null;
        }

        $now = now();
        $query = Subscription::query()->whereIn('user_id', self::visibleCustomerIds($actor, $types));

        return [
            'active' => (clone $query)
                ->where('status', SubscriptionStatus::Active->value)
                ->where(fn (Builder $expiry) => $expiry->whereNull('expired_at')->orWhere('expired_at', '>', $now))
                ->count(),
            'expired' => (clone $query)
                ->where(fn (Builder $expired) => $expired
                    ->where('status', SubscriptionStatus::Expired->value)
                    ->orWhere(fn (Builder $elapsed) => $elapsed
                        ->where('status', SubscriptionStatus::Active->value)
                        ->where('expired_at', '<=', $now)))
                ->count(),
        ];
    }

    public static function recentEmployeeActivityFor(User $actor): ?array
    {
        $types = self::visibleCustomerTypes($actor);

        if ($types === []) {
            return null;
        }

        $sources = [
            [User::class, fn ($query) => $query->join('users as customers', 'customers.id', '=', 'audit_logs.auditable_id')],
        ];

        if ($actor->can('subscriptions.view')) {
            $sources[] = [Subscription::class, fn ($query) => $query
                ->join('subscriptions', 'subscriptions.id', '=', 'audit_logs.auditable_id')
                ->join('users as customers', 'customers.id', '=', 'subscriptions.user_id')];
            $sources[] = [PaymentLog::class, fn ($query) => $query
                ->join('payment_logs', 'payment_logs.id', '=', 'audit_logs.auditable_id')
                ->join('subscriptions', 'subscriptions.id', '=', 'payment_logs.subscription_id')
                ->join('users as customers', 'customers.id', '=', 'subscriptions.user_id')];
        }

        return collect($sources)
            ->flatMap(function (array $source) use ($actor, $types) {
                [$model, $join] = $source;
                $query = $join(AuditLog::query())
                    ->join('users as employees', 'employees.id', '=', 'audit_logs.changed_by')
                    ->where('audit_logs.auditable_type', $model)
                    ->where('employees.user_type', UserType::SuperAdmin->value)
                    ->where('customers.user_type', UserType::Customer->value)
                    ->whereIn('customers.account_type', $types)
                    ->whereNull('customers.deleted_at')
                    ->when(! $actor->isMasterSuperAdmin(), fn ($q) => $q->where('customers.created_by', $actor->id))
                    ->select([
                        'audit_logs.id', 'audit_logs.event', 'audit_logs.new_values',
                        'audit_logs.created_at', 'customers.id as customer_id',
                        'customers.name as customer_name', 'customers.school_name',
                        'employees.name as employee_name',
                    ])
                    ->orderByDesc('audit_logs.created_at')
                    ->orderByDesc('audit_logs.id')
                    ->limit(8);

                return $query->get()->map(fn (AuditLog $log) => [
                    'id' => $log->id,
                    'type' => $model === User::class ? 'customer' : ($model === Subscription::class ? 'subscription' : 'payment'),
                    'event' => $log->event->value,
                    'changes' => array_keys($log->new_values ?? []),
                    'customer_id' => $log->customer_id,
                    'school_name' => $log->school_name ?: $log->customer_name,
                    'employee_name' => $log->employee_name,
                    'created_at' => $log->created_at->toISOString(),
                ]);
            })
            ->reject(fn (array $activity) => $activity['type'] === 'customer' && in_array('subscription_id', $activity['changes'], true))
            ->sortByDesc(fn (array $activity) => $activity['created_at'].str_pad((string) $activity['id'], 12, '0', STR_PAD_LEFT))
            ->take(5)
            ->values()
            ->all();
    }

    private static function expiringPaidSubscriptions(User $actor, CarbonInterface $now): Builder
    {
        return Subscription::query()
            ->whereIn('user_id', CustomerAccess::visibleTo($actor, AccountType::Paid)
                ->where('status', UserStatus::Active->value)
                ->select('id'))
            ->where('status', SubscriptionStatus::Active->value)
            ->where('expired_at', '>', $now)
            ->where('expired_at', '<=', $now->copy()->addDays(30));
    }

    private static function visibleCustomerTypes(User $actor): array
    {
        return array_values(array_filter([
            CustomerAccess::canViewType($actor, AccountType::Paid) ? AccountType::Paid->value : null,
            CustomerAccess::canViewType($actor, AccountType::Trial) ? AccountType::Trial->value : null,
        ]));
    }

    private static function visibleCustomerIds(User $actor, array $types): Builder
    {
        return User::query()
            ->where('user_type', UserType::Customer->value)
            ->whereIn('account_type', $types)
            ->when(! $actor->isMasterSuperAdmin(), fn (Builder $query) => $query->where('created_by', $actor->id))
            ->select('id');
    }

    private static function visiblePayments(User $actor, array $visibleTypes): Builder
    {
        return PaymentLog::query()
            ->whereHas('subscription.user', function (Builder $query) use ($actor, $visibleTypes): void {
                $query->whereIn('account_type', $visibleTypes);

                if (! $actor->isMasterSuperAdmin()) {
                    $query->where('created_by', $actor->id);
                }
            });
    }
}

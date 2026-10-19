<?php

namespace App\Support;

use App\Enums\AccountType;
use App\Enums\PaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\UserStatus;
use App\Models\PaymentLog;
use App\Models\Subscription;
use App\Models\TrialSetting;
use App\Models\User;
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

            $summary['expiring_soon'] = Subscription::query()
                ->whereIn('user_id', CustomerAccess::visibleTo($actor, AccountType::Paid)
                    ->where('status', UserStatus::Active->value)
                    ->select('id'))
                ->where('status', SubscriptionStatus::Active->value)
                ->where('expired_at', '>', $now)
                ->where('expired_at', '<=', $now->copy()->addDays(30))
                ->count();
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

        if ($visibleTypes !== [] && $actor->can('subscriptions.view')) {
            $payments = array_map(fn (array $month) => $month + ['amount_cents' => 0], $months);
            $paymentDays = array_map(fn (array $day) => $day + ['amount_cents' => 0], $days);

            self::visiblePayments($actor, $visibleTypes)
                ->where('status', PaymentStatus::Approved->value)
                ->where('created_at', '>=', $start->copy()->utc())
                ->where('created_at', '<=', $now->copy()->utc())
                ->select(['id', 'amount', 'created_at'])
                ->lazyById()
                ->each(function (PaymentLog $log) use (&$payments, &$paymentDays): void {
                    $createdAt = $log->created_at->timezone('Asia/Karachi');
                    $cents = (int) round((float) $log->amount * 100);
                    $payments[$createdAt->format('Y-m')]['amount_cents'] += $cents;

                    if (isset($paymentDays[$createdAt->toDateString()])) {
                        $paymentDays[$createdAt->toDateString()]['amount_cents'] += $cents;
                    }
                });

            $trends['payments'] = array_values($payments);
            $trends['paymentDays'] = array_values($paymentDays);
        }

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

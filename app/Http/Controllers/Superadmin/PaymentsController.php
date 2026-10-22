<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AccountType;
use App\Enums\PaymentStatus;
use App\Enums\UserType;
use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\PaymentLog;
use App\Models\Subscription;
use App\Models\User;
use App\Support\CustomerAccess;
use App\Support\SuperadminDashboardSummary;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PaymentsController extends Controller
{
    public function index(Request $request)
    {
        $actor = $request->user();
        $visibleTypes = array_values(array_filter([
            CustomerAccess::canViewType($actor, AccountType::Paid) ? AccountType::Paid->value : null,
            CustomerAccess::canViewType($actor, AccountType::Trial) ? AccountType::Trial->value : null,
        ]));

        $visibleCustomer = function (Builder $query) use ($actor, $visibleTypes): void {
            $query->where('user_type', UserType::Customer->value)
                ->whereIn('account_type', $visibleTypes);

            if (! $actor->isMasterSuperAdmin()) {
                $query->where('created_by', $actor->id);
            }
        };

        return Inertia::render('superadmin/payments', [
            'summary' => fn () => $this->summary($visibleCustomer, $actor),
            'agentCommissions' => fn () => $this->monthlyAgentCommissions($visibleCustomer),
            'paymentRequests' => fn () => $this->paymentRequests($request, $visibleCustomer),
        ]);
    }

    private function summary(callable $visibleCustomer, User $actor): array
    {
        $payments = PaymentLog::query()->whereHas('subscription.user', $visibleCustomer);
        $subscriptions = Subscription::query()->whereHas('user', $visibleCustomer);
        $eligibleStatuses = [
            PaymentStatus::PendingReview->value,
            PaymentStatus::Reviewed->value,
            PaymentStatus::Approved->value,
        ];

        $approved = (string) (clone $payments)
            ->where('status', PaymentStatus::Approved->value)
            ->sum('amount');
        $gross = (string) (clone $payments)->sum('amount');
        $subscriptionCommission = (clone $subscriptions)
            ->whereNotNull('commission_amount')
            ->whereHas('paymentLogs', fn (Builder $query) => $query->whereIn('status', $eligibleStatuses))
            ->sum('commission_amount');
        $legacyCommission = (clone $payments)
            ->whereIn('status', $eligibleStatuses)
            ->whereHas('subscription', fn (Builder $query) => $query->whereNull('commission_amount'))
            ->sum('commission_amount');

        $grossCents = (int) round((float) $gross * 100);
        $commissionCents = ((int) $subscriptionCommission + (int) $legacyCommission) * 100;
        $expenseQuery = Expense::query();
        if (! $actor->isMasterSuperAdmin()) {
            $expenseQuery->where('created_by', $actor->id);
        }
        $expensesCents = (int) round((float) $expenseQuery->sum('amount') * 100);
        $netCents = $grossCents - $commissionCents;

        return [
            'approved' => number_format((float) $approved, 2, '.', ''),
            'gross' => number_format($grossCents / 100, 2, '.', ''),
            'commissions' => number_format($commissionCents / 100, 2, '.', ''),
            'net' => number_format($netCents / 100, 2, '.', ''),
            'expenses' => number_format($expensesCents / 100, 2, '.', ''),
            'profit' => number_format(($netCents - $expensesCents) / 100, 2, '.', ''),
        ];
    }

    public function show(Request $request, int $paymentLog)
    {
        $actor = $request->user();
        $visibleTypes = array_values(array_filter([
            CustomerAccess::canViewType($actor, AccountType::Paid) ? AccountType::Paid->value : null,
            CustomerAccess::canViewType($actor, AccountType::Trial) ? AccountType::Trial->value : null,
        ]));
        $visibleCustomer = function (Builder $query) use ($actor, $visibleTypes): void {
            $query->where('user_type', UserType::Customer->value)
                ->whereIn('account_type', $visibleTypes);

            if (! $actor->isMasterSuperAdmin()) {
                $query->where('created_by', $actor->id);
            }
        };

        $payment = PaymentLog::query()
            ->whereHas('subscription.user', $visibleCustomer)
            ->with([
                'subscription.user:id,name,school_name,email,phone',
                'subscription.paymentLogs:id,subscription_id,amount,status,created_at',
                'creator:id,name',
                'reviewer:id,name',
            ])
            ->findOrFail($paymentLog);

        return response()->json(SuperadminDashboardSummary::paymentDetail($payment));
    }

    private function paymentRequests(Request $request, callable $visibleCustomer): array
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'status' => ['nullable', 'in:all,pending,approved,rejected'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $today = now('Asia/Karachi');
        $from = $validated['from'] ?? $today->copy()->startOfMonth()->toDateString();
        $to = $validated['to'] ?? $today->toDateString();
        $status = $validated['status'] ?? 'all';
        $start = CarbonImmutable::parse($from, 'Asia/Karachi')->startOfDay()->utc();
        $end = CarbonImmutable::parse($to, 'Asia/Karachi')->addDay()->startOfDay()->utc();

        $query = PaymentLog::query()
            ->select(['id', 'subscription_id', 'amount', 'status', 'created_at'])
            ->whereHas('subscription.user', $visibleCustomer)
            ->where('created_at', '>=', $start)
            ->where('created_at', '<', $end)
            ->with(['subscription' => fn ($subscription) => $subscription
                ->select(['id', 'user_id', 'created_by', 'name', 'amount', 'commission_amount'])
                ->with(['user:id,name,phone,school_name', 'creator:id,name'])
                ->withSum([
                    'paymentLogs as approved_total' => fn ($payments) => $payments
                        ->where('status', PaymentStatus::Approved->value),
                ], 'amount')
                ->withSum('paymentLogs as legacy_commission', 'commission_amount')]);

        match ($status) {
            'pending' => $query->whereIn('status', [PaymentStatus::PendingReview->value, PaymentStatus::Reviewed->value]),
            'approved' => $query->where('status', PaymentStatus::Approved->value),
            'rejected' => $query->where('status', PaymentStatus::Rejected->value),
            default => null,
        };

        $filteredSubscriptions = (clone $query)
            ->reorder()
            ->select('subscription_id')
            ->distinct();
        $approvedBySubscription = PaymentLog::query()
            ->where('status', PaymentStatus::Approved->value)
            ->select('subscription_id')
            ->selectRaw('SUM(amount) as approved_amount')
            ->groupBy('subscription_id');
        $legacyCommissionBySubscription = PaymentLog::query()
            ->select('subscription_id')
            ->selectRaw('SUM(commission_amount) as legacy_commission')
            ->groupBy('subscription_id');
        $subscriptionTotals = Subscription::query()
            ->whereIn('subscriptions.id', $filteredSubscriptions)
            ->leftJoinSub($approvedBySubscription, 'approved_payments', fn ($join) => $join
                ->on('approved_payments.subscription_id', '=', 'subscriptions.id'))
            ->leftJoinSub($legacyCommissionBySubscription, 'legacy_commissions', fn ($join) => $join
                ->on('legacy_commissions.subscription_id', '=', 'subscriptions.id'))
            ->selectRaw('COALESCE(SUM(subscriptions.amount), 0) as payable')
            ->selectRaw('COALESCE(SUM(CASE WHEN subscriptions.amount > COALESCE(approved_payments.approved_amount, 0) THEN subscriptions.amount - COALESCE(approved_payments.approved_amount, 0) ELSE 0 END), 0) as due')
            ->selectRaw('COALESCE(SUM(COALESCE(subscriptions.commission_amount, legacy_commissions.legacy_commission, 0)), 0) as commission')
            ->first();
        $paidTotal = (clone $query)->sum('amount');
        $page = $query->latest('created_at')->orderByDesc('id')->paginate(20);

        return [
            'filters' => ['from' => $from, 'to' => $to, 'status' => $status],
            'totals' => [
                'payable' => number_format((float) $subscriptionTotals->payable, 2, '.', ''),
                'paid' => number_format((float) $paidTotal, 2, '.', ''),
                'due' => number_format((float) $subscriptionTotals->due, 2, '.', ''),
                'commission' => number_format((float) $subscriptionTotals->commission, 2, '.', ''),
            ],
            'data' => $page->getCollection()->map(function (PaymentLog $log) {
                $subscription = $log->subscription;

                return [
                    'id' => $log->id,
                    'subscription_id' => $subscription->id,
                    'agent' => $subscription->creator?->name ?? '—',
                    'customer_name' => $subscription->user->name,
                    'phone' => $subscription->user->phone,
                    'school' => $subscription->user->school_name,
                    'subscription' => $subscription->name,
                    'payable' => (string) $subscription->amount,
                    'paid' => (string) $log->amount,
                    'due' => number_format(max((float) $subscription->amount - (float) $subscription->approved_total, 0), 2, '.', ''),
                    'commission' => (string) ($subscription->commission_amount ?? $subscription->legacy_commission ?? 0),
                    'status' => $log->status->value,
                ];
            })->all(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'from' => $page->firstItem(),
                'to' => $page->lastItem(),
            ],
        ];
    }

    private function monthlyAgentCommissions(callable $visibleCustomer): array
    {
        $monthStart = now('Asia/Karachi')->startOfMonth()->utc();
        $monthEnd = $monthStart->copy()->timezone('Asia/Karachi')->addMonth()->utc();

        $approvalEvents = DB::table('audit_logs')
            ->select('auditable_id')
            ->selectRaw('MIN(created_at) as approved_at')
            ->where('auditable_type', (new PaymentLog)->getMorphClass())
            ->where('new_values->status', PaymentStatus::Approved->value)
            ->groupBy('auditable_id');

        $firstApprovals = DB::table('payment_logs')
            ->leftJoinSub($approvalEvents, 'approval_events', fn ($join) => $join
                ->on('approval_events.auditable_id', '=', 'payment_logs.id'))
            ->where('payment_logs.status', PaymentStatus::Approved->value)
            ->select('payment_logs.subscription_id')
            ->selectRaw('MIN(COALESCE(approval_events.approved_at, payment_logs.reviewed_at, payment_logs.created_at)) as first_approved_at')
            ->groupBy('payment_logs.subscription_id');

        $subscriptions = Subscription::query()
            ->joinSub($firstApprovals, 'first_approvals', fn ($join) => $join
                ->on('first_approvals.subscription_id', '=', 'subscriptions.id'))
            ->where('first_approvals.first_approved_at', '>=', $monthStart)
            ->where('first_approvals.first_approved_at', '<', $monthEnd)
            ->whereHas('user', $visibleCustomer)
            ->whereHas('creator')
            ->with('creator:id,name,email')
            ->withSum([
                'paymentLogs as legacy_approved_commission' => fn (Builder $query) => $query
                    ->where('status', PaymentStatus::Approved->value),
            ], 'commission_amount')
            ->get(['subscriptions.id', 'subscriptions.created_by', 'subscriptions.commission_amount']);

        $agents = $subscriptions
            ->groupBy('created_by')
            ->map(function ($sales) {
                $agent = $sales->first()->creator;

                return [
                    'id' => $agent->id,
                    'name' => $agent->name,
                    'email' => $agent->email,
                    'sales' => $sales->count(),
                    'commission' => number_format((float) $sales->sum(
                        fn (Subscription $subscription) => $subscription->commission_amount
                            ?? $subscription->legacy_approved_commission
                            ?? 0
                    ), 2, '.', ''),
                ];
            })
            ->sortBy([['sales', 'desc'], ['name', 'asc']])
            ->values();

        return [
            'agents' => $agents->all(),
            'totalSales' => $agents->sum('sales'),
            'totalCommission' => number_format((float) $agents->sum('commission'), 2, '.', ''),
        ];
    }
}

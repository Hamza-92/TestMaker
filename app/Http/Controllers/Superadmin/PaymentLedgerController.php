<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AccountType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\UserType;
use App\Http\Controllers\Controller;
use App\Models\PaymentLog;
use App\Support\CustomerAccess;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PaymentLedgerController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after:from'],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $today = CarbonImmutable::now('Asia/Karachi');
        $from = $validated['from'] ?? $today->startOfMonth()->toDateString();
        $to = $validated['to'] ?? $today->startOfMonth()->addMonth()->toDateString();
        $search = trim($validated['search'] ?? '');
        $start = CarbonImmutable::parse($from, 'Asia/Karachi')->startOfDay()->utc();
        $end = CarbonImmutable::parse($to, 'Asia/Karachi')->startOfDay()->utc();

        $actor = $request->user();
        $visibleTypes = array_values(array_filter([
            CustomerAccess::canViewType($actor, AccountType::Paid) ? AccountType::Paid->value : null,
            CustomerAccess::canViewType($actor, AccountType::Trial) ? AccountType::Trial->value : null,
        ]));

        $approvalEvents = DB::table('audit_logs')
            ->select('auditable_id')
            ->selectRaw('MIN(created_at) as approved_at')
            ->where('auditable_type', (new PaymentLog)->getMorphClass())
            ->where('new_values->status', PaymentStatus::Approved->value)
            ->groupBy('auditable_id');
        $paidAt = 'COALESCE(approval_events.approved_at, payment_logs.reviewed_at, payment_logs.created_at)';

        // Rank before applying the date filter so installments retain their source across months.
        $rankedPayments = DB::table('payment_logs')
            ->join('subscriptions', 'subscriptions.id', '=', 'payment_logs.subscription_id')
            ->join('users as customers', 'customers.id', '=', 'subscriptions.user_id')
            ->leftJoinSub($approvalEvents, 'approval_events', fn ($join) => $join
                ->on('approval_events.auditable_id', '=', 'payment_logs.id'))
            ->where('payment_logs.status', PaymentStatus::Approved->value)
            ->where('customers.user_type', UserType::Customer->value)
            ->whereIn('customers.account_type', $visibleTypes)
            ->when(! $actor->isMasterSuperAdmin(), fn ($builder) => $builder
                ->where('customers.created_by', $actor->id))
            ->select([
                'payment_logs.id',
                'payment_logs.subscription_id',
                'subscriptions.user_id',
                'payment_logs.amount',
                'payment_logs.payment_method',
                'payment_logs.created_by',
                'customers.name as customer_name',
                'customers.school_name',
                'customers.phone',
            ])
            ->selectRaw("{$paidAt} as paid_at")
            ->selectRaw("ROW_NUMBER() OVER (PARTITION BY payment_logs.subscription_id ORDER BY {$paidAt}, payment_logs.id) as subscription_payment_number")
            ->selectRaw("ROW_NUMBER() OVER (PARTITION BY subscriptions.user_id ORDER BY {$paidAt}, payment_logs.id) as customer_payment_number");

        $query = DB::query()->fromSub($rankedPayments, 'ledger')
            ->leftJoin('users as agents', 'agents.id', '=', 'ledger.created_by')
            ->where('ledger.paid_at', '>=', $start)
            ->where('ledger.paid_at', '<', $end)
            ->when($search !== '', function ($builder) use ($search): void {
                $builder->where(function ($builder) use ($search): void {
                    $builder->where('ledger.school_name', 'like', "%{$search}%")
                        ->orWhere('ledger.customer_name', 'like', "%{$search}%")
                        ->orWhere('ledger.phone', 'like', "%{$search}%");

                    if (ctype_digit($search)) {
                        $builder->orWhere('ledger.id', (int) $search)
                            ->orWhere('ledger.subscription_id', (int) $search);
                    }
                });
            })
            ->select([
                'ledger.id',
                'ledger.user_id',
                'ledger.subscription_id',
                'ledger.amount',
                'ledger.payment_method',
                'ledger.paid_at',
                'ledger.school_name',
                'ledger.phone',
                'agents.name as agent_name',
            ])
            ->selectRaw("CASE WHEN ledger.subscription_payment_number > 1 THEN 'due' WHEN ledger.customer_payment_number = 1 THEN 'new' ELSE 'renewal' END as source");

        $totals = DB::query()->fromSub(clone $query, 'entries')
            ->selectRaw('COALESCE(SUM(amount), 0) as total_received')
            ->selectRaw("COALESCE(SUM(CASE WHEN source = 'new' THEN amount ELSE 0 END), 0) as new_sales")
            ->selectRaw("COALESCE(SUM(CASE WHEN source = 'renewal' THEN amount ELSE 0 END), 0) as renewals")
            ->selectRaw("COALESCE(SUM(CASE WHEN source = 'due' THEN amount ELSE 0 END), 0) as due_payments")
            ->first();
        $page = $query->orderByDesc('ledger.paid_at')->orderByDesc('ledger.id')->paginate(20);

        return Inertia::render('superadmin/payment-ledger', [
            'ledger' => [
                'filters' => ['from' => $from, 'to' => $to, 'search' => $search],
                'summary' => [
                    'total_received' => number_format((float) $totals->total_received, 2, '.', ''),
                    'new_sales' => number_format((float) $totals->new_sales, 2, '.', ''),
                    'renewals' => number_format((float) $totals->renewals, 2, '.', ''),
                    'due_payments' => number_format((float) $totals->due_payments, 2, '.', ''),
                ],
                'data' => $page->getCollection()->map(fn ($payment) => [
                    'id' => $payment->id,
                    'customer_id' => $payment->user_id,
                    'subscription_id' => $payment->subscription_id,
                    'paid_at' => $payment->paid_at,
                    'school' => $payment->school_name,
                    'phone' => $payment->phone,
                    'amount' => number_format((float) $payment->amount, 2, '.', ''),
                    'method' => PaymentMethod::tryFrom($payment->payment_method)?->label() ?? $payment->payment_method,
                    'source' => $payment->source,
                    'agent' => $payment->agent_name ?? '—',
                ])->all(),
                'meta' => [
                    'current_page' => $page->currentPage(),
                    'last_page' => $page->lastPage(),
                    'per_page' => $page->perPage(),
                    'total' => $page->total(),
                    'from' => $page->firstItem(),
                    'to' => $page->lastItem(),
                ],
            ],
        ]);
    }
}

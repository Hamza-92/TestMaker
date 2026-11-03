<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AccountType;
use App\Enums\PaymentStatus;
use App\Enums\UserType;
use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\PaymentLog;
use App\Support\CustomerAccess;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AnnualReportController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate(['year' => ['nullable', 'integer', 'between:2000,2100']]);
        $year = (int) ($validated['year'] ?? now('Asia/Karachi')->year);
        $yearStart = CarbonImmutable::create($year, 1, 1, 0, 0, 0, 'Asia/Karachi');
        $start = $yearStart->utc();
        $end = $yearStart->addYear()->utc();
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

        $months = [];
        for ($month = 1; $month <= 12; $month++) {
            $months[$month] = [
                'month' => $yearStart->setMonth($month)->format('M Y'),
                'gross' => 0,
                'commissions' => 0,
                'expenses' => 0,
                'profit' => 0,
                'bank_transfer' => 0,
                'online' => 0,
                'cash' => 0,
                'cheque' => 0,
                'other' => 0,
            ];
        }

        $approvalEvents = DB::table('audit_logs')
            ->select('auditable_id')
            ->selectRaw('MIN(created_at) as approved_at')
            ->where('auditable_type', (new PaymentLog)->getMorphClass())
            ->where('new_values->status', PaymentStatus::Approved->value)
            ->groupBy('auditable_id');
        $paidAt = 'COALESCE(approval_events.approved_at, payment_logs.reviewed_at, payment_logs.created_at)';
        $payments = PaymentLog::query()
            ->where('payment_logs.status', PaymentStatus::Approved->value)
            ->whereHas('subscription.user', $visibleCustomer)
            ->leftJoinSub($approvalEvents, 'approval_events', fn ($join) => $join
                ->on('approval_events.auditable_id', '=', 'payment_logs.id'))
            ->whereRaw("{$paidAt} >= ?", [$start->toDateTimeString()])
            ->whereRaw("{$paidAt} < ?", [$end->toDateTimeString()])
            ->select(['payment_logs.id', 'payment_logs.amount', 'payment_logs.commission_amount', 'payment_logs.payment_method'])
            ->selectRaw("{$paidAt} as paid_at")
            ->cursor();

        foreach ($payments as $payment) {
            $month = CarbonImmutable::parse($payment->paid_at, 'UTC')->timezone('Asia/Karachi')->month;
            $amount = (int) round((float) $payment->amount * 100);
            $method = $payment->payment_method?->value ?? 'other';
            $months[$month]['gross'] += $amount;
            $months[$month]['commissions'] += (int) round((float) $payment->commission_amount * 100);
            $months[$month][array_key_exists($method, $months[$month]) ? $method : 'other'] += $amount;
        }

        $expenses = Expense::query()
            ->when(! $actor->isMasterSuperAdmin(), fn ($query) => $query->where('created_by', $actor->id))
            ->where('created_at', '>=', $start)
            ->where('created_at', '<', $end)
            ->cursor();
        foreach ($expenses as $expense) {
            $month = $expense->created_at->timezone('Asia/Karachi')->month;
            $months[$month]['expenses'] += (int) round((float) $expense->amount * 100);
        }

        $totals = array_fill_keys(array_keys($months[1]), 0);
        $totals['month'] = 'Total';
        foreach ($months as &$row) {
            $row['profit'] = $row['gross'] - $row['commissions'] - $row['expenses'];
            foreach ($row as $key => $value) {
                if ($key !== 'month') {
                    $totals[$key] += $value;
                    $row[$key] = number_format($value / 100, 2, '.', '');
                }
            }
        }
        unset($row);
        foreach ($totals as $key => $value) {
            if ($key !== 'month') {
                $totals[$key] = number_format($value / 100, 2, '.', '');
            }
        }

        return Inertia::render('superadmin/annual-report', [
            'year' => $year,
            'months' => array_values($months),
            'totals' => $totals,
        ]);
    }
}

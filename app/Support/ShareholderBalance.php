<?php

namespace App\Support;

use App\Enums\PaymentStatus;
use App\Models\Expense;
use App\Models\PaymentLog;
use App\Models\ShareholderSpend;
use App\Models\Subscription;
use Illuminate\Database\Eloquent\Builder;

class ShareholderBalance
{
    /** @return array{profit: int, reserve: int, spent: int, available: int} Amounts in paisa. */
    public static function totals(): array
    {
        $approvedPayments = PaymentLog::query()->where('status', PaymentStatus::Approved->value);
        $gross = (int) round((float) (clone $approvedPayments)->sum('amount') * 100);
        $subscriptionCommissions = (int) Subscription::query()
            ->whereNotNull('commission_amount')
            ->whereHas('paymentLogs', fn (Builder $query) => $query
                ->where('status', PaymentStatus::Approved->value))
            ->sum('commission_amount') * 100;
        $legacyCommissions = (int) round((float) (clone $approvedPayments)
            ->whereHas('subscription', fn (Builder $query) => $query->whereNull('commission_amount'))
            ->sum('commission_amount') * 100);
        $expenses = (int) round((float) Expense::query()->sum('amount') * 100);
        $profit = $gross - $subscriptionCommissions - $legacyCommissions - $expenses;
        $reserve = (int) round(max($profit, 0) * 0.15);
        $spent = (int) round((float) ShareholderSpend::query()->sum('amount') * 100);

        return [
            'profit' => $profit,
            'reserve' => $reserve,
            'spent' => $spent,
            'available' => $reserve - $spent,
        ];
    }

    public static function money(int $paisa): string
    {
        return number_format($paisa / 100, 2, '.', '');
    }
}

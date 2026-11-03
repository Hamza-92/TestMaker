<?php

namespace App\Support;

use App\Enums\PaymentStatus;
use App\Models\Expense;
use App\Models\PaymentLog;
use App\Models\ShareholderSpend;

class ShareholderBalance
{
    /** @return array{profit: int, reserve: int, spent: int, available: int} Amounts in paisa. */
    public static function totals(): array
    {
        $approvedPayments = PaymentLog::query()->where('status', PaymentStatus::Approved->value);
        $gross = (int) round((float) (clone $approvedPayments)->sum('amount') * 100);
        $commissions = (int) round((float) (clone $approvedPayments)->sum('commission_amount') * 100);
        $expenses = (int) round((float) Expense::query()->sum('amount') * 100);
        $profit = $gross - $commissions - $expenses;
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

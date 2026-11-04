<?php

namespace App\Console\Commands;

use App\Enums\UserType;
use App\Models\PaymentLog;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ResetCustomerPayments extends Command
{
    protected $signature = 'payments:reset-customer-history {--execute : Apply the reset} {--backup-confirmed : Confirm that payment_logs, subscriptions, users, and audit_logs were backed up}';

    protected $description = 'Preview or clear customer payment history for a fresh payment ledger';

    public function handle(): int
    {
        $customerSubscriptions = Subscription::query()
            ->whereHas('user', fn ($query) => $query->withTrashed()->where('user_type', UserType::Customer->value));
        $customerPayments = PaymentLog::query()
            ->whereHas('subscription.user', fn ($query) => $query->withTrashed()->where('user_type', UserType::Customer->value));

        $this->table(['Record', 'Count'], [
            ['Customer payment logs', (clone $customerPayments)->count()],
            ['Payment audit entries', DB::table('audit_logs')
                ->where('auditable_type', (new PaymentLog)->getMorphClass())
                ->whereIn('auditable_id', (clone $customerPayments)->select('payment_logs.id'))
                ->count()],
            ['Subscriptions with nonzero amount', (clone $customerSubscriptions)->where('amount', '!=', 0)->count()],
            ['Subscriptions with commission', (clone $customerSubscriptions)->whereNotNull('commission_amount')->count()],
            ['Subscriptions with payment due dates', (clone $customerSubscriptions)->whereNotNull('payment_due_date')->count()],
            ['Customers with payment holds', User::query()->withTrashed()
                ->where('user_type', UserType::Customer->value)
                ->whereNotNull('payment_hold_at')
                ->count()],
        ]);

        if (! $this->option('execute')) {
            $this->info('Dry run only. No records were changed.');

            return self::SUCCESS;
        }

        if (! $this->option('backup-confirmed')) {
            $this->error('Back up payment_logs, subscriptions, users, and audit_logs before using --execute --backup-confirmed.');

            return self::FAILURE;
        }

        DB::transaction(function (): void {
            DB::table('payment_logs')
                ->join('subscriptions', 'subscriptions.id', '=', 'payment_logs.subscription_id')
                ->join('users', 'users.id', '=', 'subscriptions.user_id')
                ->where('users.user_type', UserType::Customer->value)
                ->select('payment_logs.id')
                ->chunkById(500, function ($payments): void {
                    $ids = $payments->pluck('id')->all();

                    DB::table('audit_logs')
                        ->where('auditable_type', (new PaymentLog)->getMorphClass())
                        ->whereIn('auditable_id', $ids)
                        ->delete();
                    DB::table('payment_logs')->whereIn('id', $ids)->delete();
                }, 'payment_logs.id', 'id');

            Subscription::query()
                ->whereHas('user', fn ($query) => $query->withTrashed()->where('user_type', UserType::Customer->value))
                ->update(['amount' => 0, 'commission_amount' => null, 'payment_due_date' => null]);

            User::query()->withTrashed()
                ->where('user_type', UserType::Customer->value)
                ->whereNotNull('payment_hold_at')
                ->update(['payment_hold_at' => null]);
        });

        $this->info('Customer payments cleared and subscription amounts set to zero. Subscription status, dates, and access remain unchanged.');
        $this->line('Stored receipt files remain on disk; this command only resets database records.');

        return self::SUCCESS;
    }
}

<?php

namespace App\Console\Commands;

use App\Enums\UserType;
use App\Models\User;
use App\Support\CustomerPaymentAccess;
use Illuminate\Console\Command;

class SyncCustomerPaymentHolds extends Command
{
    protected $signature = 'subscriptions:sync-payment-holds';

    protected $description = 'Update customer payment holds from active subscription due dates and approved payments';

    public function handle(CustomerPaymentAccess $access): int
    {
        $checked = 0;

        User::query()
            ->where('user_type', UserType::Customer->value)
            ->where(function ($query) {
                $query->whereNotNull('payment_hold_at')
                    ->orWhereHas('subscriptions', fn ($subscriptions) => $subscriptions->whereNotNull('payment_due_date'));
            })
            ->chunkById(200, function ($customers) use ($access, &$checked) {
                foreach ($customers as $customer) {
                    $access->syncCustomer($customer);
                    $checked++;
                }
            });

        $this->info("Checked {$checked} customer accounts.");

        return self::SUCCESS;
    }
}

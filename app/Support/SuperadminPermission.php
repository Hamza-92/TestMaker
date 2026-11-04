<?php

namespace App\Support;

class SuperadminPermission
{
    public const FULL_ACCESS = 'app.full_access';

    public static function excludedFromFullAccess(string $name, ?string $group = null): bool
    {
        return $name === self::FULL_ACCESS
            || $name === 'subscriptions.manage_payments'
            || str_starts_with($name, 'payments.')
            || str_starts_with($name, 'payment_logs.')
            || str_starts_with(strtolower($group ?? ''), 'payment');
    }
}

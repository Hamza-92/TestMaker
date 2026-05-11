<?php

namespace App\Enums;

enum AccountType: string
{
    case Trial = 'trial';
    case Paid  = 'paid';

    public function label(): string
    {
        return match ($this) {
            self::Trial => 'Trial',
            self::Paid  => 'Paid',
        };
    }
}

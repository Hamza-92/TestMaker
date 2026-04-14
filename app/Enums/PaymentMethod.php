<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Cash         = 'cash';
    case BankTransfer = 'bank_transfer';
    case Online       = 'online';
    case Cheque       = 'cheque';

    public function label(): string
    {
        return match($this) {
            self::Cash         => 'Cash',
            self::BankTransfer => 'Bank Transfer',
            self::Online       => 'Online',
            self::Cheque       => 'Cheque',
        };
    }
}

<?php

namespace App\Enums;

enum UserType: string
{
    case SuperAdmin = 'super_admin';
    case Staff      = 'staff';
    case Teacher    = 'teacher';
    case Customer   = 'customer';

    public function label(): string
    {
        return match($this) {
            self::SuperAdmin => 'Super Admin',
            self::Staff      => 'Staff',
            self::Teacher    => 'Teacher',
            self::Customer   => 'Customer',
        };
    }

    public function isSuperAdmin(): bool
    {
        return $this === self::SuperAdmin;
    }

    public function isCustomer(): bool
    {
        return $this === self::Customer;
    }
}

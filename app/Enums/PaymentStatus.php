<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case PendingReview = 'pending_review';
    case Reviewed      = 'reviewed';
    case Approved      = 'approved';
    case Rejected      = 'rejected';

    public function label(): string
    {
        return match($this) {
            self::PendingReview => 'Pending Review',
            self::Reviewed      => 'Reviewed',
            self::Approved      => 'Approved',
            self::Rejected      => 'Rejected',
        };
    }
}

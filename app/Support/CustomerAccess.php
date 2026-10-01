<?php

namespace App\Support;

use App\Enums\UserType;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class CustomerAccess
{
    public static function visibleTo(User $actor): Builder
    {
        return User::query()
            ->where('user_type', UserType::Customer)
            ->when(! $actor->isMasterSuperAdmin(), fn (Builder $query) => $query->where('created_by', $actor->id));
    }

    public static function ensureVisible(User $actor, User $customer): void
    {
        abort_unless(
            $customer->isCustomer()
                && ($actor->isMasterSuperAdmin() || (int) $customer->created_by === (int) $actor->id),
            404,
        );
    }
}

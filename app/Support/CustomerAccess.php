<?php

namespace App\Support;

use App\Enums\AccountType;
use App\Enums\UserType;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class CustomerAccess
{
    public static function canViewType(User $actor, AccountType $type): bool
    {
        return $actor->can('customers.view') || $actor->can("customers.{$type->value}.view");
    }

    public static function visibleTo(User $actor, AccountType $type): Builder
    {
        return User::query()
            ->where('user_type', UserType::Customer)
            ->where('account_type', $type->value)
            ->when(! $actor->isMasterSuperAdmin(), fn (Builder $query) => $query->where('created_by', $actor->id));
    }

    public static function ensureVisible(User $actor, User $customer): void
    {
        abort_unless(
            $customer->isCustomer()
                && ($actor->isMasterSuperAdmin() || (int) $customer->created_by === (int) $actor->id),
            404,
        );

        abort_unless($customer->account_type !== null && self::canViewType($actor, $customer->account_type), 403);
    }
}

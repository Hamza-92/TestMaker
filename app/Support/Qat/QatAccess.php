<?php

namespace App\Support\Qat;

use App\Enums\AccountType;
use App\Models\User;
use App\Support\AppUserAccess;
use App\Support\SubscriptionAccess;

final class QatAccess
{
    public static function only(User $user): bool
    {
        $owner = $user->schoolOwner();
        if ($owner?->account_type !== AccountType::Paid) {
            return false;
        }

        $subscription = $owner->activeSchoolSubscription();

        return $subscription?->allow_qat_tests
            && $subscription->isActive()
            && AppUserAccess::resolve($owner)['ids']['pattern_access'] === [];
    }

    public static function catalogue(User $user): array
    {
        $access = AppUserAccess::resolve($user);

        if ($user->isTeacher() && self::only($user)) {
            // The school has no standard scope to inherit. Explicit teacher
            // assignments still limit which QAT subjects they can use.
            $access['scope'] = SubscriptionAccess::normalizeScope($user->access_scope, $access['maps']);
            $access['ids'] = SubscriptionAccess::summaryIds($access['scope'], $access['maps']);
        }

        return $access;
    }
}

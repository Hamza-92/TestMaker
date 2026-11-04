<?php

namespace App\Support\Qat;

use App\Enums\AccountType;
use App\Enums\TeacherPermission;
use App\Models\QatPaper;
use App\Models\User;
use App\Support\AppUserAccess;
use App\Support\SchoolTeacherSummary;
use App\Support\SubscriptionAccess;
use Illuminate\Database\Eloquent\Builder;

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

    /** @return Builder<QatPaper> */
    public static function savedPapers(User $user): Builder
    {
        return QatPaper::query()
            ->whereIn('user_id', self::visiblePaperUserIds($user))
            ->where('is_draft', false);
    }

    /** @return list<int> */
    public static function visiblePaperUserIds(User $user): array
    {
        $ids = [(int) $user->id];
        if ($user->isSchoolOwner()) {
            return array_values(array_unique([...$ids, ...SchoolTeacherSummary::for($user)['ids']]));
        }

        if ($user->hasTeacherPermission(TeacherPermission::ViewSchoolPapers->value)) {
            $owner = $user->schoolOwner();
            if ($owner !== null) {
                return array_values(array_unique([...$ids, (int) $owner->id, ...SchoolTeacherSummary::for($user)['ids']]));
            }
        }

        return $ids;
    }
}

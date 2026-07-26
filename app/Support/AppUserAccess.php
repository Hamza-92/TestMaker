<?php

namespace App\Support;

use App\Enums\AccountType;
use App\Models\TrialSetting;
use App\Models\User;

class AppUserAccess
{
    public static function resolve(User $user): array
    {
        $maps = SubscriptionAccess::buildMaps();
        $subscription = $user->activeSchoolSubscription();
        $schoolOwner = $user->schoolOwner();

        if ($subscription !== null) {
            $scope = $user->isTeacher()
                ? TeacherAccess::effectiveScope($user, $subscription, $maps)
                : SubscriptionAccess::resolveScope($subscription, $maps);
        } elseif ($schoolOwner?->account_type === AccountType::Trial) {
            $scope = SubscriptionAccess::normalizeScope(TrialSetting::current()->access_scope, $maps);
        } else {
            $scope = [];
        }

        $ids = SubscriptionAccess::summaryIds($scope, $maps);

        return [
            'scope' => $scope,
            'ids'   => $ids,
            'maps'  => $maps,
        ];
    }

    public static function allowsPattern(array $access, int $patternId): bool
    {
        $ids = $access['ids']['pattern_access'];

        return $ids === null || in_array($patternId, $ids, true);
    }

    public static function allowsClass(array $access, int $patternId, int $classId): bool
    {
        if (! self::allowsPattern($access, $patternId)) {
            return false;
        }

        $scope = $access['scope'];

        if ($scope === null) {
            return true;
        }

        $classes = $scope[(string) $patternId]['classes'] ?? null;

        return is_array($classes) && array_key_exists((string) $classId, $classes);
    }

    public static function allowsSubject(array $access, int $patternId, int $classId, int $subjectId): bool
    {
        if (! self::allowsClass($access, $patternId, $classId)) {
            return false;
        }

        $scope = $access['scope'];

        if ($scope === null) {
            return true;
        }

        $classRule = $scope[(string) $patternId]['classes'][(string) $classId] ?? null;

        if (! is_array($classRule)) {
            return false;
        }

        if ($classRule['subjects'] === null) {
            return true;
        }

        return in_array($subjectId, $classRule['subjects'], true);
    }
}

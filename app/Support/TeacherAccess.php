<?php

namespace App\Support;

use App\Models\Subscription;
use App\Models\User;

class TeacherAccess
{
    public static function schoolCeilingScope(Subscription $subscription, array $maps): ?array
    {
        return SubscriptionAccess::resolveScope($subscription, $maps);
    }

    public static function effectiveScope(User $teacher, ?Subscription $subscription, array $maps): ?array
    {
        if ($subscription === null) {
            return [];
        }

        $ceiling = self::schoolCeilingScope($subscription, $maps);
        $teacherScope = SubscriptionAccess::normalizeScope($teacher->access_scope, $maps);

        if ($teacherScope === null) {
            return $ceiling;
        }

        if ($ceiling === null) {
            return $teacherScope;
        }

        return self::intersect($ceiling, $teacherScope);
    }

    public static function boundedScope(?array $requestedScope, ?array $ceilingScope, array $maps): ?array
    {
        $normalized = SubscriptionAccess::normalizeScope($requestedScope, $maps);

        if ($normalized === null) {
            return null;
        }

        if ($ceilingScope === null) {
            return $normalized;
        }

        return self::intersect($ceilingScope, $normalized);
    }

    private static function intersect(array $ceiling, array $requested): array
    {
        $result = [];

        foreach ($requested as $patternKey => $patternRule) {
            if (! isset($ceiling[$patternKey])) {
                continue;
            }

            $classes = [];
            $ceilingClasses = $ceiling[$patternKey]['classes'] ?? [];
            $requestedClasses = $patternRule['classes'] ?? [];

            foreach ($requestedClasses as $classKey => $classRule) {
                if (! isset($ceilingClasses[$classKey])) {
                    continue;
                }

                $ceilingSubjects = $ceilingClasses[$classKey]['subjects'] ?? null;
                $requestedSubjects = $classRule['subjects'] ?? null;

                if ($requestedSubjects === null && $ceilingSubjects === null) {
                    $classes[$classKey] = ['subjects' => null];
                    continue;
                }

                if ($requestedSubjects === null) {
                    $classes[$classKey] = ['subjects' => $ceilingSubjects];
                    continue;
                }

                if ($ceilingSubjects === null) {
                    $classes[$classKey] = ['subjects' => array_values($requestedSubjects)];
                    continue;
                }

                $classes[$classKey] = [
                    'subjects' => array_values(array_intersect($requestedSubjects, $ceilingSubjects)),
                ];
            }

            if ($classes !== []) {
                $result[$patternKey] = ['classes' => $classes];
            }
        }

        return $result;
    }
}

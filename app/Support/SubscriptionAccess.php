<?php

namespace App\Support;

use App\Models\Subscription;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SubscriptionAccess
{
    public static function buildMaps(): array
    {
        $patternClassMap = DB::table('pattern_classes')
            ->join('classes', 'classes.id', '=', 'pattern_classes.class_id')
            ->where('classes.status', 1)
            ->select('pattern_classes.pattern_id', 'pattern_classes.class_id')
            ->get()
            ->groupBy('pattern_id')
            ->map(fn (Collection $rows) => self::sortIds($rows->pluck('class_id')->all()))
            ->toArray();

        $classSubjectMap = DB::table('class_subjects')
            ->join('subjects', 'subjects.id', '=', 'class_subjects.subject_id')
            ->where('subjects.status', 1)
            ->select('class_subjects.pattern_id', 'class_subjects.class_id', 'class_subjects.subject_id')
            ->get()
            ->groupBy(fn ($row) => "{$row->pattern_id}:{$row->class_id}")
            ->map(fn (Collection $rows) => self::sortIds($rows->pluck('subject_id')->all()))
            ->toArray();

        return [
            'patternClassMap' => $patternClassMap,
            'classSubjectMap' => $classSubjectMap,
        ];
    }

    public static function resolveScope(Subscription $subscription, array $maps): ?array
    {
        if (is_array($subscription->access_scope)) {
            return self::normalizeScope($subscription->access_scope, $maps);
        }

        return self::scopeFromLegacy(
            $subscription->pattern_access,
            $subscription->class_access,
            $subscription->subject_access,
            $maps,
        );
    }

    public static function scopeFromLegacy(
        ?array $patternAccess,
        ?array $classAccess,
        ?array $subjectAccess,
        array $maps,
    ): ?array {
        if ($patternAccess === null && $classAccess === null && $subjectAccess === null) {
            return null;
        }

        $selectedPatternIds = $patternAccess === null
            ? self::sortIds(array_map('intval', array_keys($maps['patternClassMap'] ?? [])))
            : self::sortIds($patternAccess);

        $selectedClassIds = $classAccess === null
            ? null
            : self::sortIds($classAccess);

        $selectedSubjectIds = $subjectAccess === null
            ? null
            : self::sortIds($subjectAccess);

        $scope = [];

        foreach ($selectedPatternIds as $patternId) {
            $classes = [];

            foreach (self::availableClassesForPattern($patternId, $maps) as $classId) {
                if ($selectedClassIds !== null && ! in_array($classId, $selectedClassIds, true)) {
                    continue;
                }

                $availableSubjectIds = self::availableSubjectsForClass($patternId, $classId, $maps);

                if ($selectedSubjectIds === null) {
                    $subjects = $availableSubjectIds === [] ? [] : null;
                } else {
                    $subjects = array_values(array_intersect($selectedSubjectIds, $availableSubjectIds));

                    if ($availableSubjectIds !== [] && count($subjects) === count($availableSubjectIds)) {
                        $subjects = null;
                    }
                }

                $classes[(string) $classId] = ['subjects' => $subjects];
            }

            $scope[(string) $patternId] = ['classes' => $classes];
        }

        return self::normalizeScope($scope, $maps);
    }

    public static function normalizeScope(?array $scope, array $maps): ?array
    {
        if ($scope === null) {
            return null;
        }

        $validPatternIds = self::sortIds(array_map('intval', array_keys($maps['patternClassMap'] ?? [])));
        $normalized = [];

        foreach ($scope as $patternKey => $patternData) {
            $patternId = (int) $patternKey;

            if (! in_array($patternId, $validPatternIds, true)) {
                continue;
            }

            $rawClasses = is_array($patternData['classes'] ?? null)
                ? $patternData['classes']
                : [];

            $normalizedClasses = [];
            $availableClassIds = self::availableClassesForPattern($patternId, $maps);

            foreach ($rawClasses as $classKey => $classData) {
                $classId = (int) $classKey;

                if (! in_array($classId, $availableClassIds, true)) {
                    continue;
                }

                $availableSubjectIds = self::availableSubjectsForClass($patternId, $classId, $maps);
                $rawSubjects = $classData['subjects'] ?? null;

                if ($rawSubjects === null) {
                    $subjects = $availableSubjectIds === [] ? [] : null;
                } elseif (is_array($rawSubjects)) {
                    $subjects = array_values(array_intersect(self::sortIds($rawSubjects), $availableSubjectIds));

                    if ($availableSubjectIds !== [] && count($subjects) === count($availableSubjectIds)) {
                        $subjects = null;
                    }
                } else {
                    $subjects = [];
                }

                $normalizedClasses[(string) $classId] = ['subjects' => $subjects];
            }

            ksort($normalizedClasses, SORT_NUMERIC);

            $normalized[(string) $patternId] = [
                'classes' => $normalizedClasses,
            ];
        }

        ksort($normalized, SORT_NUMERIC);

        if (self::isFullAccess($normalized, $maps)) {
            return null;
        }

        return $normalized;
    }

    public static function summaryIds(?array $scope, array $maps): array
    {
        if ($scope === null) {
            return [
                'pattern_access' => null,
                'class_access'   => null,
                'subject_access' => null,
            ];
        }

        $patternIds = [];
        $classIds = [];
        $subjectIds = [];

        foreach ($scope as $patternKey => $patternData) {
            $patternId = (int) $patternKey;
            $patternIds[] = $patternId;

            foreach (($patternData['classes'] ?? []) as $classKey => $classData) {
                $classId = (int) $classKey;
                $classIds[] = $classId;

                $subjects = array_key_exists('subjects', $classData)
                    ? $classData['subjects']
                    : [];

                if ($subjects === null) {
                    $subjectIds = [...$subjectIds, ...self::availableSubjectsForClass($patternId, $classId, $maps)];
                    continue;
                }

                $subjectIds = [...$subjectIds, ...self::sortIds($subjects)];
            }
        }

        return [
            'pattern_access' => self::sortIds($patternIds),
            'class_access'   => self::sortIds($classIds),
            'subject_access' => self::sortIds($subjectIds),
        ];
    }

    public static function overview(
        ?array $scope,
        iterable $patterns,
        iterable $classes,
        iterable $subjects,
        array $maps,
    ): array {
        if ($scope === null) {
            return [];
        }

        $patternLookup = collect($patterns)->keyBy('id');
        $classLookup = collect($classes)->keyBy('id');
        $subjectLookup = collect($subjects)->keyBy('id');

        $overview = [];

        foreach ($scope as $patternKey => $patternData) {
            $patternId = (int) $patternKey;
            $pattern = $patternLookup->get($patternId);
            $selectedClasses = [];

            foreach (($patternData['classes'] ?? []) as $classKey => $classData) {
                $classId = (int) $classKey;
                $class = $classLookup->get($classId);
                $availableSubjectIds = self::availableSubjectsForClass($patternId, $classId, $maps);

                $subjectIds = $classData['subjects'] === null
                    ? $availableSubjectIds
                    : self::sortIds($classData['subjects'] ?? []);

                $selectedSubjects = [];

                foreach ($subjectIds as $subjectId) {
                    $subject = $subjectLookup->get($subjectId);

                    $selectedSubjects[] = [
                        'id'       => $subjectId,
                        'name_eng' => data_get($subject, 'name_eng', "Subject #{$subjectId}"),
                        'name_ur'  => data_get($subject, 'name_ur'),
                    ];
                }

                $selectedClasses[] = [
                    'id'                      => $classId,
                    'name'                    => data_get($class, 'name', "Class #{$classId}"),
                    'subject_mode'            => $classData['subjects'] === null ? 'all' : (empty($selectedSubjects) ? 'none' : 'selected'),
                    'subjects'                => $selectedSubjects,
                    'selected_subject_count'  => count($selectedSubjects),
                    'available_subject_count' => count($availableSubjectIds),
                ];
            }

            $overview[] = [
                'id'                    => $patternId,
                'name'                  => data_get($pattern, 'name', "Pattern #{$patternId}"),
                'short_name'            => data_get($pattern, 'short_name'),
                'classes'               => $selectedClasses,
                'selected_class_count'  => count($selectedClasses),
                'available_class_count' => count(self::availableClassesForPattern($patternId, $maps)),
            ];
        }

        return $overview;
    }

    private static function isFullAccess(array $scope, array $maps): bool
    {
        $availablePatternIds = self::sortIds(array_map('intval', array_keys($maps['patternClassMap'] ?? [])));

        if ($availablePatternIds === [] || count($scope) !== count($availablePatternIds)) {
            return false;
        }

        foreach ($availablePatternIds as $patternId) {
            $patternData = $scope[(string) $patternId] ?? null;

            if (! is_array($patternData)) {
                return false;
            }

            $availableClassIds = self::availableClassesForPattern($patternId, $maps);
            $selectedClassIds = self::sortIds(array_map('intval', array_keys($patternData['classes'] ?? [])));

            if ($availableClassIds !== $selectedClassIds) {
                return false;
            }

            foreach ($availableClassIds as $classId) {
                $classData = $patternData['classes'][(string) $classId] ?? null;

                if (! is_array($classData)) {
                    return false;
                }

                $availableSubjectIds = self::availableSubjectsForClass($patternId, $classId, $maps);

                if ($availableSubjectIds === []) {
                    continue;
                }

                if (array_key_exists('subjects', $classData) && $classData['subjects'] === null) {
                    continue;
                }

                $selectedSubjectIds = self::sortIds($classData['subjects'] ?? []);

                if ($selectedSubjectIds !== $availableSubjectIds) {
                    return false;
                }
            }
        }

        return true;
    }

    private static function availableClassesForPattern(int $patternId, array $maps): array
    {
        return self::sortIds($maps['patternClassMap'][(string) $patternId] ?? []);
    }

    private static function availableSubjectsForClass(int $patternId, int $classId, array $maps): array
    {
        return self::sortIds($maps['classSubjectMap']["{$patternId}:{$classId}"] ?? []);
    }

    private static function sortIds(array $ids): array
    {
        $normalized = array_values(array_unique(array_map('intval', $ids)));
        sort($normalized, SORT_NUMERIC);

        return $normalized;
    }
}

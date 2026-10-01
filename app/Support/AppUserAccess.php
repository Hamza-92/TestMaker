<?php

namespace App\Support;

use App\Enums\AccountType;
use App\Models\TrialSetting;
use App\Models\User;

class AppUserAccess
{
    public static function resolve(User $user): array
    {
        $request = app()->runningInConsole() || ! app()->bound('request')
            ? null
            : app('request');
        $cacheKey = '_app_user_access_'.(string) $user->getKey();

        if ($request?->attributes->has($cacheKey)) {
            return $request->attributes->get($cacheKey);
        }

        $maps = SubscriptionAccess::buildMaps();
        $subscription = $user->activeSchoolSubscription();
        $schoolOwner = $user->schoolOwner();
        $chapterAccess = [];
        $topicAccess = [];

        if ($subscription !== null) {
            $scope = $user->isTeacher()
                ? TeacherAccess::effectiveScope($user, $subscription, $maps)
                : SubscriptionAccess::resolveScope($subscription, $maps);
        } elseif ($schoolOwner?->account_type === AccountType::Trial) {
            $trialSettings = TrialSetting::current();
            $scope = SubscriptionAccess::normalizeScope($trialSettings->access_scope, $maps);
            $chapterAccess = self::contentRules($trialSettings->chapter_access);
            $topicAccess = self::contentRules($trialSettings->topic_access);
        } else {
            $scope = [];
        }

        $ids = SubscriptionAccess::summaryIds($scope, $maps);

        $access = [
            'scope' => $scope,
            'ids' => $ids,
            'maps' => $maps,
            'chapter_access' => $chapterAccess,
            'topic_access' => $topicAccess,
        ];

        $request?->attributes->set($cacheKey, $access);

        return $access;
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

    public static function chapterIds(array $access, int $patternId, int $classId, int $subjectId): ?array
    {
        return $access['chapter_access'][self::contentKey($patternId, $classId, $subjectId)] ?? null;
    }

    public static function topicIds(array $access, int $patternId, int $classId, int $subjectId): ?array
    {
        return $access['topic_access'][self::contentKey($patternId, $classId, $subjectId)] ?? null;
    }

    public static function allowsChapter(array $access, int $patternId, int $classId, int $subjectId, int $chapterId): bool
    {
        $ids = self::chapterIds($access, $patternId, $classId, $subjectId);

        return $ids === null || in_array($chapterId, $ids, true);
    }

    public static function allowsTopic(array $access, int $patternId, int $classId, int $subjectId, int $topicId): bool
    {
        $ids = self::topicIds($access, $patternId, $classId, $subjectId);

        return $ids === null || in_array($topicId, $ids, true);
    }

    public static function restrictQuestions($query, array $access, int $patternId, int $classId, int $subjectId): void
    {
        $chapterIds = self::chapterIds($access, $patternId, $classId, $subjectId);
        $topicIds = self::topicIds($access, $patternId, $classId, $subjectId);

        if ($chapterIds !== null) {
            $query->whereIn('questions.chapter_id', $chapterIds);
        }

        if ($topicIds !== null) {
            $query->whereIn('questions.topic_id', $topicIds);
        }
    }

    private static function contentKey(int $patternId, int $classId, int $subjectId): string
    {
        return "{$patternId}:{$classId}:{$subjectId}";
    }

    private static function contentRules(?array $rules): array
    {
        if ($rules === null) {
            return [];
        }

        return collect($rules)
            ->filter(fn ($ids, $key) => is_string($key) && preg_match('/^\d+:\d+:\d+$/', $key) && is_array($ids))
            ->map(fn (array $ids) => collect($ids)->map(fn ($id) => (int) $id)->unique()->sort()->values()->all())
            ->all();
    }
}

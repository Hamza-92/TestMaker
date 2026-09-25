<?php

namespace App\Support;

use App\Models\User;

class SchoolTeacherSummary
{
    /** @return array{ids: list<int>, total: int, active: int} */
    public static function for(User $user): array
    {
        $owner = $user->schoolOwner();

        if ($owner === null) {
            return ['ids' => [], 'total' => 0, 'active' => 0];
        }

        $request = app()->runningInConsole() || ! app()->bound('request')
            ? null
            : app('request');
        $cacheKey = '_school_teacher_summary_'.(string) $owner->getKey();

        if ($request?->attributes->has($cacheKey)) {
            return $request->attributes->get($cacheKey);
        }

        $teachers = $owner->teachers()->get(['id', 'status']);
        $summary = [
            'ids' => $teachers->pluck('id')->map(static fn ($id): int => (int) $id)->all(),
            'total' => $teachers->count(),
            'active' => $teachers->filter->isActive()->count(),
        ];

        $request?->attributes->set($cacheKey, $summary);

        return $summary;
    }
}

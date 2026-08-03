<?php

namespace App\Support;

use App\Enums\AuditEvent;
use App\Enums\TeacherPermission;
use App\Models\AuditLog;
use App\Models\Paper;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

class CustomerActivityData
{
    public static function page(User $user, ?string $category, string $search): LengthAwarePaginator
    {
        return self::query($user, $category, $search)
            ->with('changedBy:id,name')
            ->latest('created_at')
            ->latest('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (AuditLog $log): array => self::present($log));
    }

    /** @return array{all: int, papers: int, teachers: int} */
    public static function counts(User $user): array
    {
        $query = self::query($user, null, '');

        return [
            'all' => (clone $query)->count(),
            'papers' => (clone $query)->where('auditable_type', Paper::class)->count(),
            'teachers' => (clone $query)->where('auditable_type', User::class)->count(),
        ];
    }

    private static function query(User $user, ?string $category, string $search): Builder
    {
        $ownerIds = self::ownerIds($user);

        return AuditLog::query()
            ->whereIn('changed_by', $ownerIds)
            ->where(function (Builder $query): void {
                $query->where('auditable_type', Paper::class)
                    ->orWhere(function (Builder $userQuery): void {
                        $userQuery
                            ->where('auditable_type', User::class)
                            ->where('notes', 'like', 'Teacher %');
                    });
            })
            ->when($category === 'papers', fn (Builder $query) => $query->where('auditable_type', Paper::class))
            ->when($category === 'teachers', fn (Builder $query) => $query->where('auditable_type', User::class))
            ->when($search !== '', function (Builder $query) use ($search): void {
                $term = '%'.addcslashes($search, '%_\\').'%';

                $query->where(function (Builder $searchQuery) use ($term): void {
                    $searchQuery
                        ->where('notes', 'like', $term)
                        ->orWhere('new_values', 'like', $term)
                        ->orWhere('old_values', 'like', $term)
                        ->orWhereHas('changedBy', fn (Builder $actorQuery) => $actorQuery->where('name', 'like', $term));
                });
            });
    }

    /** @return array<string, mixed> */
    private static function present(AuditLog $log): array
    {
        $values = $log->event === AuditEvent::Deleted
            ? ($log->old_values ?? [])
            : ($log->new_values ?? []);
        $isPaper = $log->auditable_type === Paper::class;
        $action = (string) ($values['activity'] ?? $log->event?->value ?? 'updated');
        $target = trim((string) ($values['name'] ?? ''));

        if ($isPaper) {
            $verb = match ($action) {
                'generated' => 'generated',
                'drafted' => 'saved a draft of',
                'saved' => 'saved',
                'deleted' => 'deleted',
                'duplicated' => 'duplicated',
                default => 'updated',
            };
            $target = $target !== '' ? $target : ((string) ($values['subject'] ?? 'a paper'));
            $type = 'paper_'.$action;
            $label = 'Paper';
        } else {
            $verb = match ($action) {
                'added' => 'added',
                'removed' => 'removed',
                default => 'updated',
            };
            $target = $target !== '' ? $target : 'a teacher';
            $target .= ' as a teacher';
            $type = 'teacher_'.$action;
            $label = 'Teacher';
        }

        return [
            'id' => 'audit-'.$log->id,
            'type' => $type,
            'category' => $isPaper ? 'papers' : 'teachers',
            'label' => $label,
            'action' => $action,
            'message' => trim(($log->changedBy?->name ?? 'Someone').' '.$verb.' '.$target),
            'created_at' => $log->created_at?->toISOString(),
        ];
    }

    /** @return list<int> */
    private static function ownerIds(User $user): array
    {
        if ($user->isSchoolOwner()) {
            return array_values(array_unique([
                $user->id,
                ...$user->teachers()->pluck('id')->all(),
            ]));
        }

        if ($user->isTeacher() && $user->hasTeacherPermission(TeacherPermission::ViewSchoolPapers->value)) {
            $owner = $user->schoolOwner();

            if ($owner !== null) {
                return array_values(array_unique([
                    $user->id,
                    $owner->id,
                    ...$owner->teachers()->pluck('id')->all(),
                ]));
            }
        }

        return [$user->id];
    }
}

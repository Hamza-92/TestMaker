<?php

namespace App\Support;

use App\Enums\AccountType;
use App\Enums\AuditEvent;
use App\Enums\TeacherPermission;
use App\Models\Announcement;
use App\Models\AnnouncementDismissal;
use App\Models\AuditLog;
use App\Models\Paper;
use App\Models\Pattern;
use App\Models\SchoolClass;
use App\Models\TrialSetting;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class CustomerDashboardData
{
    private const PATTERN_COLORS = [
        '#4f46e5', '#059669', '#0284c7', '#ea580c',
        '#0f9fa8', '#db2777', '#4338ca', '#7c3aed',
        '#0891b2', '#16a34a', '#d97706', '#dc2626',
    ];

    private const PATTERN_ICONS = [
        'graduation-cap', 'landmark', 'book-open', 'mountain',
        'feather', 'sun', 'school', 'lightbulb',
        'grid', 'library', 'atom', 'shapes',
    ];

    public static function for(User $user): array
    {
        $owner = $user->schoolOwner() ?? $user;
        $subscription = $user->activeSchoolSubscription();
        $teachers = $owner->teachers()->get(['id', 'status']);
        $teacherCount = $teachers->count();
        $activeTeacherCount = $teachers->filter->isActive()->count();
        $paperOwnerIds = self::paperOwnerIds(
            $user,
            $owner,
            $teachers->pluck('id')->map(static fn ($id): int => (int) $id)->all(),
        );
        $papers = Paper::query()->whereIn('user_id', $paperOwnerIds);
        $paperStats = self::paperStats($papers);
        $access = AppUserAccess::resolve($user);
        $classIds = $access['ids']['class_access'];
        $isTrial = $owner->account_type === AccountType::Trial && $subscription === null;
        $planStart = $isTrial ? $owner->created_at : $subscription?->started_at;
        $planEnd = $isTrial
            ? $owner->created_at?->copy()->addDays(TrialSetting::current()->trial_duration_days)
            : $subscription?->expired_at;
        $planName = $isTrial ? 'Trial' : ($subscription?->name ?? 'No plan');
        $daysRemaining = self::daysRemaining($planEnd);
        $remainingPercent = self::remainingPercent($planStart, $planEnd);

        return [
            'school' => [
                'name' => $owner->school_name ?: $owner->name,
                'logo' => $owner->logo,
                'plan_name' => $planName,
                'subscription_ends_at' => $planEnd?->toISOString(),
                'days_remaining' => $daysRemaining,
                'subscription_remaining_percent' => $remainingPercent,
                'total_teachers' => $teacherCount,
                'total_classes' => SchoolClass::query()
                    ->where('status', 1)
                    ->when($classIds !== null, fn (Builder $query) => $query->whereIn('id', $classIds))
                    ->count(),
            ],
            'stats' => [
                'papers_generated' => $paperStats['total'],
                'saved_papers' => $paperStats['saved'],
                'questions_used' => $paperStats['questions'],
                'active_teachers' => $activeTeacherCount,
                'drafts' => $paperStats['drafts'],
                'total_teachers' => $teacherCount,
            ],
            'announcements' => self::announcements($user),
            'patterns' => self::patterns($access),
            'activities' => self::activities($user, $paperOwnerIds),
            'subject_usage' => self::subjectUsage($papers),

            'permissions' => [
                'can_generate_papers' => $user->isSchoolOwner()
                    || $user->hasTeacherPermission(TeacherPermission::GeneratePapers->value),
                'can_add_teacher' => $user->isSchoolOwner(),
            ],
        ];
    }

    private static function paperStats(Builder $papers): array
    {
        $stats = (clone $papers)
            ->selectRaw('COUNT(*) as total_count')
            ->selectRaw('SUM(CASE WHEN is_draft = 0 THEN 1 ELSE 0 END) as saved_count')
            ->selectRaw('SUM(CASE WHEN is_draft = 1 THEN 1 ELSE 0 END) as draft_count')
            ->selectRaw('COALESCE(SUM(questions_count), 0) as questions_count')
            ->first();

        return [
            'total' => (int) ($stats?->total_count ?? 0),
            'saved' => (int) ($stats?->saved_count ?? 0),
            'drafts' => (int) ($stats?->draft_count ?? 0),
            'questions' => (int) ($stats?->questions_count ?? 0),
        ];
    }

    private static function announcements(User $user): array
    {
        $visible = Announcement::query()
            ->published()
            ->get();

        $dismissedSurfaces = $visible->isEmpty()
            ? collect()
            : AnnouncementDismissal::query()
                ->where('user_id', $user->id)
                ->whereIn('announcement_id', $visible->pluck('id'))
                ->get(['announcement_id', 'surface'])
                ->mapWithKeys(fn (AnnouncementDismissal $dismissal): array => [
                    $dismissal->announcement_id.':'.$dismissal->surface => true,
                ]);

        $isDismissed = fn (Announcement $announcement, string $surface): bool => $announcement->is_dismissible
            && $dismissedSurfaces->has($announcement->id.':'.$surface);

        $banner = $visible->first(
            fn (Announcement $announcement) => in_array($announcement->placement, ['banner', 'both'], true)
                && ! $isDismissed($announcement, 'banner'),
        );

        $updates = $visible
            ->filter(
                fn (Announcement $announcement) => in_array($announcement->placement, ['card', 'both'], true)
                    && ! $isDismissed($announcement, 'card'),
            )
            ->values();

        $present = fn (Announcement $announcement): array => [
            'id' => $announcement->id,
            'title' => $announcement->title,
            'summary' => $announcement->summary,
            'body' => $announcement->body,
            'type' => $announcement->type,
            'banner_style' => $announcement->banner_style,
            'banner_direction' => $announcement->banner_direction,
            'banner_font' => $announcement->banner_font,
            'banner_background' => $announcement->banner_background,
            'banner_text_color' => $announcement->banner_text_color,
            'action_label' => $announcement->action_label,
            'action_url' => $announcement->action_url,
            'details_url' => '/announcements/'.$announcement->id,
            'published_at' => $announcement->published_at?->toISOString(),
            'is_dismissible' => $announcement->is_dismissible,
        ];

        return [
            'banner' => $banner ? $present($banner) : null,
            'updates' => $updates->map($present)->values()->all(),
        ];
    }

    private static function patterns(array $access): Collection
    {
        $patternIds = $access['ids']['pattern_access'];
        $classIds = $access['ids']['class_access'];

        return Pattern::query()
            ->where('status', 1)
            ->when($patternIds !== null, fn (Builder $query) => $query->whereIn('id', $patternIds))
            ->with(['classes' => function ($query) use ($classIds): void {
                $query
                    ->where('classes.status', 1)
                    ->when($classIds !== null, fn ($classQuery) => $classQuery->whereIn('classes.id', $classIds))
                    ->orderBy('classes.sort_order')
                    ->orderBy('classes.id');
            }])
            ->ordered()
            ->get(['id', 'name', 'short_name', 'description', 'icon', 'color'])
            ->values()
            ->map(function (Pattern $pattern, int $index): array {
                $classNames = $pattern->classes->pluck('name')->values();
                $classLabel = match ($classNames->count()) {
                    0 => 'No classes assigned',
                    1 => (string) $classNames->first(),
                    default => $classNames->first().' ? '.$classNames->last(),
                };

                return [
                    'id' => $pattern->id,
                    'name' => $pattern->name,
                    'short_name' => $pattern->short_name,
                    'description' => $pattern->description,
                    'icon' => $pattern->icon ?: self::PATTERN_ICONS[$index % count(self::PATTERN_ICONS)],
                    'color' => $pattern->color ?: self::PATTERN_COLORS[$index % count(self::PATTERN_COLORS)],
                    'class_count' => $classNames->count(),
                    'classes_label' => $classLabel,
                ];
            });
    }

    private static function subjectUsage(Builder $papers): array
    {
        $weekStart = now()->startOfWeek();
        $monthStart = now()->startOfMonth();
        $yearStart = now()->startOfYear();

        $rows = (clone $papers)
            ->where('is_draft', false)
            ->whereNotNull('subject')
            ->where('subject', '!=', '')
            ->where('created_at', '>=', $yearStart)
            ->select('subject')
            ->selectRaw(
                'SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as weekly_count',
                [$weekStart],
            )
            ->selectRaw(
                'SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as monthly_count',
                [$monthStart],
            )
            ->selectRaw('COUNT(*) as yearly_count')
            ->groupBy('subject')
            ->get();

        return [
            'weekly' => self::subjectUsageForPeriod($rows, 'weekly_count'),
            'monthly' => self::subjectUsageForPeriod($rows, 'monthly_count'),
            'yearly' => self::subjectUsageForPeriod($rows, 'yearly_count'),
        ];
    }

    private static function subjectUsageForPeriod(Collection $rows, string $countColumn): Collection
    {
        $topRows = $rows
            ->filter(fn ($row): bool => (int) $row->{$countColumn} > 0)
            ->sortByDesc(fn ($row): int => (int) $row->{$countColumn})
            ->take(5)
            ->values();
        $total = max(1, (int) $topRows->sum($countColumn));

        return $topRows->map(fn ($row): array => [
            'name' => $row->subject,
            'count' => (int) $row->{$countColumn},
            'percentage' => round(((int) $row->{$countColumn} / $total) * 100, 1),
        ])->values();
    }

    private static function activities(User $user, array $paperOwnerIds): Collection
    {
        $logs = AuditLog::query()
            ->with('changedBy:id,name')
            ->whereIn('changed_by', $paperOwnerIds)
            ->where(function ($query): void {
                $query->where('auditable_type', Paper::class)
                    ->orWhere(function ($userQuery): void {
                        $userQuery
                            ->where('auditable_type', User::class)
                            ->where('notes', 'like', 'Teacher %');
                    });
            })
            ->latest('created_at')
            ->limit(10)
            ->get();

        $activities = $logs->map(function (AuditLog $log): array {
            $values = $log->event === AuditEvent::Deleted
                ? ($log->old_values ?? [])
                : ($log->new_values ?? []);
            $actor = $log->changedBy?->name ?? 'Someone';
            $action = (string) ($values['activity'] ?? $log->event?->value ?? 'updated');
            $isPaper = $log->auditable_type === Paper::class;
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
            } else {
                $verb = match ($action) {
                    'added' => 'added',
                    'removed' => 'removed',
                    default => 'updated',
                };
                $target = $target !== '' ? $target : 'a teacher';
                $target .= ' as a teacher';
                $type = 'teacher_'.$action;
            }

            return [
                'id' => 'audit-'.$log->id,
                'type' => $type,
                'message' => trim("{$actor} {$verb} {$target}"),
                'created_at' => $log->created_at?->toISOString(),
                'auditable_id' => (int) $log->auditable_id,
                'is_paper' => $isPaper,
            ];
        });

        if ($activities->count() < 6) {
            $loggedPaperIds = $activities
                ->where('is_paper', true)
                ->pluck('auditable_id')
                ->all();

            $fallback = Paper::query()
                ->whereIn('user_id', $paperOwnerIds)
                ->when($loggedPaperIds !== [], fn (Builder $query) => $query->whereNotIn('id', $loggedPaperIds))
                ->with('user:id,name')
                ->latest('updated_at')
                ->limit(6 - $activities->count())
                ->get(['id', 'user_id', 'name', 'is_draft', 'updated_at'])
                ->map(fn (Paper $paper) => [
                    'id' => 'paper-'.$paper->id,
                    'type' => $paper->is_draft ? 'paper_drafted' : 'paper_saved',
                    'message' => trim(
                        ($paper->user?->name ?? $user->name)
                        .($paper->is_draft ? ' saved a draft of ' : ' saved ')
                        .$paper->name
                    ),
                    'created_at' => $paper->updated_at?->toISOString(),
                    'auditable_id' => $paper->id,
                    'is_paper' => true,
                ]);

            $activities = $activities
                ->concat($fallback)
                ->sortByDesc('created_at')
                ->take(6)
                ->values();
        }

        return $activities->map(fn (array $activity) => [
            'id' => $activity['id'],
            'type' => $activity['type'],
            'message' => $activity['message'],
            'created_at' => $activity['created_at'],
        ])->values();
    }

    private static function paperOwnerIds(User $user, User $owner, array $teacherIds): array
    {
        if ($user->isSchoolOwner()) {
            return array_values(array_unique([$user->id, ...$teacherIds]));
        }

        if ($user->isTeacher() && $user->hasTeacherPermission(TeacherPermission::ViewSchoolPapers->value)) {
            return array_values(array_unique([$user->id, $owner->id, ...$teacherIds]));
        }

        return [$user->id];
    }

    private static function daysRemaining($expiredAt): ?int
    {
        if ($expiredAt === null) {
            return null;
        }

        return max(0, (int) now()->startOfDay()->diffInDays($expiredAt->copy()->startOfDay(), false));
    }

    private static function remainingPercent($startedAt, $expiredAt): int
    {
        if ($startedAt === null || $expiredAt === null) {
            return 0;
        }

        $totalSeconds = max(1, $startedAt->diffInSeconds($expiredAt));
        $remainingSeconds = max(0, now()->diffInSeconds($expiredAt, false));

        return (int) round(min(100, ($remainingSeconds / $totalSeconds) * 100));
    }
}

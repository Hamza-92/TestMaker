<?php

namespace App\Http\Middleware;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user'                => $user,
                'permissions'         => $user?->isSuperAdmin() ? $user->getPermissionNames() : [],
                'is_master'           => $user?->isMasterSuperAdmin() ?? false,
                'teacher_permissions' => $user?->isTeacher() ? (array) ($user->teacher_permissions ?? []) : [],
                'school_context'      => $this->schoolContext($user),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    private function schoolContext(?User $user): ?array
    {
        if ($user === null || (! $user->isSchoolOwner() && ! $user->isTeacher())) {
            return null;
        }

        $owner = $user->schoolOwner();

        if ($owner === null) {
            return null;
        }

        $subscription = $user->activeSchoolSubscription();
        $teacherCount = $owner->teachers()->count();

        return [
            'school_name'         => $owner->school_name ?? $owner->name,
            'is_owner'            => $user->isSchoolOwner(),
            'allow_teachers'      => (bool) ($subscription?->allow_teachers ?? false),
            'max_teachers'        => $subscription?->max_teachers,
            'teachers_used'       => $teacherCount,
            'has_subscription'    => $subscription !== null,
        ];
    }
}

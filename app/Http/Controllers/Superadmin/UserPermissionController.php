<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserPermissionController extends Controller
{
    public function edit(User $user)
    {
        abort_unless($user->isSuperAdmin(), 404);
        abort_unless(auth()->user()->canManageSuperAdmin($user), 403);

        $granted = $user->permissions()->pluck('name')->toArray();

        $permissionGroups = Permission::when(! auth()->user()->isMasterSuperAdmin(),
            fn ($query) => $query->whereIn('name', auth()->user()->getPermissionNames()))
            ->orderBy('group')
            ->orderBy('display_name')
            ->get()
            ->groupBy('group')
            ->map(fn ($perms, $group) => [
                'group' => $group,
                'permissions' => $perms->map(fn ($p) => [
                    'id'           => $p->id,
                    'name'         => $p->name,
                    'display_name' => $p->display_name,
                    'granted'      => in_array($p->name, $granted, true),
                ])->values(),
            ])
            ->values();

        return Inertia::render('superadmin/users/permissions', [
            'targetUser'       => $user->only(['id', 'name', 'email']),
            'permissionGroups' => $permissionGroups,
        ]);
    }

    public function update(Request $request, User $user)
    {
        abort_unless($user->isSuperAdmin(), 404);
        abort_unless($request->user()->canManageSuperAdmin($user), 403);

        $validated = $request->validate([
            'permissions'   => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $requested = $validated['permissions'] ?? [];
        abort_unless($request->user()->isMasterSuperAdmin()
            || array_diff($requested, $request->user()->getPermissionNames()) === [], 403);

        $user->syncPermissions($requested);

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Permissions updated successfully.',
        ]);
    }
}

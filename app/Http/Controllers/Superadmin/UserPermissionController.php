<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\User;
use App\Support\SuperadminPermission;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class UserPermissionController extends Controller
{
    public function edit(User $user)
    {
        abort_unless($user->isSuperAdmin(), 404);
        abort_unless(auth()->user()->canManageSuperAdmin($user), 403);

        $actor = auth()->user();
        $granted = $user->getPermissionNames();
        $available = $actor->getEffectivePermissionNames();

        $permissionGroups = Permission::query()
            ->where('name', '!=', SuperadminPermission::FULL_ACCESS)
            ->orderBy('group')
            ->orderBy('display_name')
            ->get()
            ->groupBy('group')
            ->map(fn ($perms, $group) => [
                'group' => $group,
                'permissions' => $perms->map(fn ($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'display_name' => $p->display_name,
                    'granted' => in_array($p->name, $granted, true),
                    'grantable' => $actor->isMasterSuperAdmin() || in_array($p->name, $available, true),
                    'excluded_from_full_access' => SuperadminPermission::excludedFromFullAccess($p->name, $p->group),
                ])->values(),
            ])
            ->values();

        return Inertia::render('superadmin/users/permissions', [
            'targetUser' => $user->only(['id', 'name', 'email']),
            'permissionGroups' => $permissionGroups,
            'fullAccess' => in_array(SuperadminPermission::FULL_ACCESS, $granted, true),
            'canGrantFullAccess' => $actor->isMasterSuperAdmin(),
        ]);
    }

    public function update(Request $request, User $user)
    {
        abort_unless($user->isSuperAdmin(), 404);
        abort_unless($request->user()->canManageSuperAdmin($user), 403);

        $validated = $request->validate([
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
            'full_access' => ['sometimes', 'boolean'],
        ]);

        $requested = $validated['permissions'] ?? [];
        $fullAccess = (bool) ($validated['full_access'] ?? false);
        abort_if(in_array(SuperadminPermission::FULL_ACCESS, $requested, true), 403);
        abort_unless($request->user()->isMasterSuperAdmin() || ! $fullAccess, 403);
        abort_unless($request->user()->isMasterSuperAdmin()
            || array_diff($requested, $request->user()->getEffectivePermissionNames()) === [], 403);

        if ($fullAccess && Permission::query()->whereIn('name', $requested)->get()
            ->contains(fn (Permission $permission) => SuperadminPermission::excludedFromFullAccess($permission->name, $permission->group))) {
            throw ValidationException::withMessages(['permissions' => 'Payment permissions cannot be combined with full access.']);
        }

        $user->syncPermissions($fullAccess
            ? [...$requested, SuperadminPermission::FULL_ACCESS]
            : $requested);

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Permissions updated successfully.',
        ]);
    }
}

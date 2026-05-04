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
        abort_if($user->isMasterSuperAdmin(), 403);
        abort_unless($user->isSuperAdmin(), 404);

        $granted = $user->permissions()->pluck('name')->toArray();

        $permissionGroups = Permission::orderBy('group')
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
        abort_if($user->isMasterSuperAdmin(), 403);
        abort_unless($user->isSuperAdmin(), 404);

        $validated = $request->validate([
            'permissions'   => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $user->syncPermissions($validated['permissions'] ?? []);

        return back()->with('success', 'Permissions updated successfully.');
    }
}

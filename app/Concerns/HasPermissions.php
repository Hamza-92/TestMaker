<?php

namespace App\Concerns;

use App\Models\Permission;
use App\Models\User;
use App\Support\SuperadminPermission;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Cache;

trait HasPermissions
{
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'user_permissions');
    }

    public function isMasterSuperAdmin(): bool
    {
        return $this->isSuperAdmin() && $this->created_by === null;
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->isMasterSuperAdmin()) {
            return true;
        }

        $granted = $this->cachedPermissions();

        if (in_array($permission, $granted, true)) {
            return true;
        }

        if (! in_array(SuperadminPermission::FULL_ACCESS, $granted, true)) {
            return false;
        }

        $permissionRecord = Permission::query()->where('name', $permission)->first(['group']);

        return $permissionRecord !== null
            && ! SuperadminPermission::excludedFromFullAccess($permission, $permissionRecord->group);
    }

    public function getPermissionNames(): array
    {
        if ($this->isMasterSuperAdmin()) {
            return [];
        }

        return $this->cachedPermissions();
    }

    public function getEffectivePermissionNames(): array
    {
        $granted = $this->getPermissionNames();

        if (! in_array(SuperadminPermission::FULL_ACCESS, $granted, true)) {
            return $granted;
        }

        $included = Permission::query()->get(['name', 'group'])
            ->reject(fn (Permission $permission) => SuperadminPermission::excludedFromFullAccess($permission->name, $permission->group))
            ->pluck('name')
            ->all();

        return array_values(array_unique([...$granted, ...$included]));
    }

    public function canManageSuperAdmin(User $target): bool
    {
        if (! $this->isSuperAdmin() || ! $target->isSuperAdmin()
            || $target->isMasterSuperAdmin() || $this->is($target)) {
            return false;
        }

        if ($this->isMasterSuperAdmin()) {
            return true;
        }

        if (in_array(SuperadminPermission::FULL_ACCESS, $this->getPermissionNames(), true)) {
            return ! $target->permissions()->get(['name', 'group'])
                ->contains(fn (Permission $permission) => SuperadminPermission::excludedFromFullAccess($permission->name, $permission->group));
        }

        return array_diff($target->getPermissionNames(), $this->getPermissionNames()) === [];
    }

    public function canImpersonateSuperAdmin(User $target): bool
    {
        if (! $this->isSuperAdmin() || ! $this->isActive()
            || ! $target->isSuperAdmin() || ! $target->isActive()
            || $target->isMasterSuperAdmin() || $this->is($target)) {
            return false;
        }

        if ($this->isMasterSuperAdmin()) {
            return true;
        }

        return in_array(SuperadminPermission::FULL_ACCESS, $this->getPermissionNames(), true)
            && ! $target->permissions->contains(fn (Permission $permission) => SuperadminPermission::excludedFromFullAccess($permission->name, $permission->group));
    }

    public function syncPermissions(array $permissionNames): void
    {
        $ids = Permission::whereIn('name', $permissionNames)->pluck('id');
        $this->permissions()->sync($ids);
        $this->clearPermissionCache();
    }

    private function cachedPermissions(): array
    {
        return Cache::remember(
            "user_permissions_{$this->id}",
            now()->addMinutes(30),
            fn () => $this->permissions()->pluck('name')->toArray()
        );
    }

    private function clearPermissionCache(): void
    {
        Cache::forget("user_permissions_{$this->id}");
    }
}

<?php

namespace App\Concerns;

use App\Models\Permission;
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

        return in_array($permission, $this->cachedPermissions(), true);
    }

    public function getPermissionNames(): array
    {
        if ($this->isMasterSuperAdmin()) {
            return [];
        }

        return $this->cachedPermissions();
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

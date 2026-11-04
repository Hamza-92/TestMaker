import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeftIcon, SaveIcon, ShieldCheckIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface Permission {
    id: number;
    name: string;
    display_name: string;
    granted: boolean;
    grantable: boolean;
    excluded_from_full_access: boolean;
}

interface PermissionGroup {
    group: string;
    permissions: Permission[];
}

interface TargetUser {
    id: number;
    name: string;
    email: string;
}

interface FormData {
    permissions: string[];
    full_access: boolean;
    [key: string]: string[] | boolean;
}

// "customers.view" → "view", "subscriptions.manage_payments" → "manage_payments"
function getAction(permName: string): string {
    const idx = permName.indexOf('.');

    return idx >= 0 ? permName.slice(idx + 1) : permName;
}

function formatAction(action: string): string {
    return action
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

const STANDARD_ACTIONS = ['view', 'create', 'edit', 'reset_password', 'delete'];

export default function UserPermissions({
    targetUser,
    permissionGroups,
    fullAccess,
    canGrantFullAccess,
}: {
    targetUser: TargetUser;
    permissionGroups: PermissionGroup[];
    fullAccess: boolean;
    canGrantFullAccess: boolean;
}) {
    const initialGranted = useMemo(
        () => permissionGroups.flatMap((g) =>
            g.permissions.filter((p) => p.granted).map((p) => p.name),
        ),
        [permissionGroups],
    );

    const { data, setData, put, processing, errors, recentlySuccessful } = useForm<FormData>({
        permissions: initialGranted,
        full_access: fullAccess,
    });

    useEffect(() => {
        setData('permissions', initialGranted);
        setData('full_access', fullAccess);
    }, [targetUser.id, initialGranted, fullAccess, setData]);

    // Build ordered column list: standard actions first, then any extras
    const columns = useMemo(() => {
        const all = new Set<string>();
        permissionGroups.forEach((g) => g.permissions.forEach((p) => all.add(getAction(p.name))));
        const standard = STANDARD_ACTIONS.filter((a) => all.has(a));
        const extras = Array.from(all).filter((a) => !STANDARD_ACTIONS.includes(a));

        return [...standard, ...extras];
    }, [permissionGroups]);

    function findPerm(group: PermissionGroup, action: string): Permission | undefined {
        return group.permissions.find((p) => getAction(p.name) === action);
    }

    function toggle(name: string, checked: boolean) {
        setData(
            'permissions',
            checked ? [...data.permissions, name] : data.permissions.filter((p) => p !== name),
        );
    }

    function toggleFullAccess(checked: boolean) {
        setData((current) => ({
            ...current,
            full_access: checked,
            permissions: checked
                ? current.permissions.filter((name) =>
                      !permissionGroups.some((group) => group.permissions.some((permission) =>
                          permission.name === name && permission.excluded_from_full_access,
                      )),
                  )
                : current.permissions,
        }));
    }

    function toggleGroup(group: PermissionGroup, toChecked: boolean) {
        const names = group.permissions
            .filter((p) => p.grantable && (!data.full_access || !p.excluded_from_full_access))
            .map((p) => p.name);

        if (toChecked) {
            setData('permissions', Array.from(new Set([...data.permissions, ...names])));
        } else {
            setData('permissions', data.permissions.filter((n) => !names.includes(n)));
        }
    }

    function groupState(group: PermissionGroup): 'all' | 'some' | 'none' {
        const selectable = group.permissions.filter((p) => p.grantable);
        const granted = selectable.filter((p) =>
            data.permissions.includes(p.name) ||
            (data.full_access && !p.excluded_from_full_access),
        ).length;

        if (granted === 0) {
            return 'none';
        }

        if (granted === selectable.length) {
            return 'all';
        }

        return 'some';
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        put(`/superadmin/users/${targetUser.id}/permissions`);
    }

    return (
        <>
            <Head title={`Permissions — ${targetUser.name}`} />

            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/superadmin/users"
                        className="text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <h1 className="h1-semibold flex items-center gap-2">
                            <ShieldCheckIcon className="size-5" />
                            Permissions
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {targetUser.name} &middot; {targetUser.email}
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    {canGrantFullAccess && (
                        <label className="flex items-start gap-3 rounded-xl border bg-card p-4">
                            <Checkbox
                                checked={data.full_access}
                                onCheckedChange={(value) => toggleFullAccess(Boolean(value))}
                                aria-label="Full access except payments"
                            />
                            <span>
                                <span className="block font-medium">Full access except payments</span>
                                <span className="text-muted-foreground block text-sm">
                                    Includes current and future permissions. Payment logs and the master-only Payments Management module stay restricted.
                                </span>
                            </span>
                        </label>
                    )}
                    {!canGrantFullAccess && (
                        <p className="text-muted-foreground text-sm">
                            Permissions you cannot grant are shown as disabled. Only the master superadmin can grant Full Access.
                        </p>
                    )}
                    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/40 border-b">
                                        <th className="px-5 py-3 text-left font-semibold">Module</th>
                                        <th className="px-4 py-3 text-center font-semibold text-muted-foreground w-24">
                                            Select All
                                        </th>
                                        {columns.map((action) => (
                                            <th
                                                key={action}
                                                className="px-4 py-3 text-center font-semibold text-muted-foreground w-28"
                                            >
                                                {formatAction(action)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody className="divide-y">
                                    {permissionGroups.map((group) => {
                                        const state = groupState(group);

                                        return (
                                            <tr key={group.group} className="hover:bg-muted/20 transition-colors">
                                                {/* Module name */}
                                                <td className="px-5 py-4 font-medium">{group.group}</td>

                                                {/* Select All */}
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex justify-center">
                                                        <Checkbox
                                                            checked={state === 'some' ? 'indeterminate' : state === 'all'}
                                                            disabled={data.full_access || !group.permissions.some((permission) => permission.grantable)}
                                                            className={cn(state === 'some' && 'opacity-60')}
                                                            onCheckedChange={(v) => toggleGroup(group, Boolean(v))}
                                                            aria-label={`Select all ${group.group} permissions`}
                                                        />
                                                    </div>
                                                </td>

                                                {/* Action columns */}
                                                {columns.map((action) => {
                                                    const perm = findPerm(group, action);
                                                    const checked = perm
                                                        ? data.permissions.includes(perm.name) ||
                                                          (data.full_access && !perm.excluded_from_full_access)
                                                        : false;

                                                    return (
                                                        <td key={action} className="px-4 py-4 text-center">
                                                            {perm ? (
                                                                <div className="flex justify-center">
                                                                    <Checkbox
                                                                        checked={checked}
                                                                        disabled={data.full_access || !perm.grantable}
                                                                        onCheckedChange={(v) =>
                                                                            toggle(perm.name, Boolean(v))
                                                                        }
                                                                        aria-label={perm.display_name}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground/40 select-none">
                                                                    —
                                                                </span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {Object.keys(errors).length > 0 && (
                        <p role="alert" className="text-sm text-destructive">
                            {Object.values(errors).join(' ')}
                        </p>
                    )}
                    {recentlySuccessful && (
                        <p role="status" className="text-sm text-emerald-700">
                            Permissions saved.
                        </p>
                    )}

                    <div className="flex justify-end gap-3">
                        <Link
                            href="/superadmin/users"
                            className="border-input bg-background hover:bg-accent inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors disabled:opacity-60"
                        >
                            <SaveIcon className="size-4" />
                            Save Permissions
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

UserPermissions.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Users', href: '/superadmin/users' },
        { title: 'Permissions' },
    ],
};

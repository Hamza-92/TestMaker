import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeftIcon, SaveIcon, ShieldCheckIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface Permission {
    id: number;
    name: string;
    display_name: string;
    granted: boolean;
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
    [key: string]: string[];
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

const STANDARD_ACTIONS = ['view', 'create', 'edit', 'delete'];

export default function UserPermissions({
    targetUser,
    permissionGroups,
}: {
    targetUser: TargetUser;
    permissionGroups: PermissionGroup[];
}) {
    const initialGranted = permissionGroups.flatMap((g) =>
        g.permissions.filter((p) => p.granted).map((p) => p.name),
    );

    const { data, setData, put, processing } = useForm<FormData>({
        permissions: initialGranted,
    });

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

    function toggleGroup(group: PermissionGroup, toChecked: boolean) {
        const names = group.permissions.map((p) => p.name);
        if (toChecked) {
            setData('permissions', Array.from(new Set([...data.permissions, ...names])));
        } else {
            setData('permissions', data.permissions.filter((n) => !names.includes(n)));
        }
    }

    function groupState(group: PermissionGroup): 'all' | 'some' | 'none' {
        const granted = group.permissions.filter((p) => data.permissions.includes(p.name)).length;
        if (granted === 0) return 'none';
        if (granted === group.permissions.length) return 'all';
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
                                                            checked={state === 'all'}
                                                            data-state={state === 'some' ? 'indeterminate' : undefined}
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
                                                        ? data.permissions.includes(perm.name)
                                                        : false;

                                                    return (
                                                        <td key={action} className="px-4 py-4 text-center">
                                                            {perm ? (
                                                                <div className="flex justify-center">
                                                                    <Checkbox
                                                                        checked={checked}
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

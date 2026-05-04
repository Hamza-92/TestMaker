import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeftIcon, SaveIcon, ShieldCheckIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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

    function toggle(name: string, checked: boolean) {
        setData(
            'permissions',
            checked ? [...data.permissions, name] : data.permissions.filter((p) => p !== name),
        );
    }

    function toggleGroup(group: PermissionGroup, checked: boolean) {
        const groupNames = group.permissions.map((p) => p.name);
        if (checked) {
            const merged = Array.from(new Set([...data.permissions, ...groupNames]));
            setData('permissions', merged);
        } else {
            setData('permissions', data.permissions.filter((p) => !groupNames.includes(p)));
        }
    }

    function isGroupFullyChecked(group: PermissionGroup): boolean {
        return group.permissions.every((p) => data.permissions.includes(p.name));
    }

    function isGroupPartiallyChecked(group: PermissionGroup): boolean {
        const count = group.permissions.filter((p) => data.permissions.includes(p.name)).length;
        return count > 0 && count < group.permissions.length;
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        put(`/superadmin/users/${targetUser.id}/permissions`);
    }

    return (
        <>
            <Head title={`Permissions — ${targetUser.name}`} />

            <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
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

                <form onSubmit={submit} className="space-y-4">
                    {permissionGroups.map((group) => {
                        const fullyChecked = isGroupFullyChecked(group);
                        const partial = isGroupPartiallyChecked(group);

                        return (
                            <div key={group.group} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                {/* Group header */}
                                <div className="bg-muted/30 flex items-center justify-between gap-3 px-5 py-3 border-b">
                                    <p className="text-sm font-semibold">{group.group}</p>
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(group, !fullyChecked)}
                                        className={cn(
                                            'text-xs font-medium transition-colors',
                                            fullyChecked || partial
                                                ? 'text-primary hover:text-primary/80'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {fullyChecked ? 'Deselect all' : 'Select all'}
                                    </button>
                                </div>

                                {/* Permissions grid */}
                                <div className="grid gap-0 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                                    {group.permissions.map((perm, i) => {
                                        const checked = data.permissions.includes(perm.name);
                                        return (
                                            <label
                                                key={perm.name}
                                                className={cn(
                                                    'flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors',
                                                    checked ? 'bg-primary/5' : 'hover:bg-muted/30',
                                                    // restore dividers in 2-col grid
                                                    i >= 2 && 'sm:border-t',
                                                )}
                                            >
                                                <Checkbox
                                                    id={perm.name}
                                                    checked={checked}
                                                    onCheckedChange={(v) => toggle(perm.name, Boolean(v))}
                                                />
                                                <span className="text-sm font-medium select-none">{perm.display_name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
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

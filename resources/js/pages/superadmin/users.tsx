import { Head, Link, router } from '@inertiajs/react';
import {
    KeyRoundIcon,
    PencilIcon,
    PlusIcon,
    SearchIcon,
    ShieldCheckIcon,
    Trash2Icon,
    UserCogIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermission } from '@/hooks/use-permission';
import { cn } from '@/lib/utils';

type AccountStatus = 'active' | 'inactive' | 'suspended';

interface SuperadminUser {
    id: number;
    name: string;
    email: string;
    status: AccountStatus;
    created_at: string;
    created_by: string | null;
}

const STATUS_CONFIG: Record<AccountStatus, { label: string; className: string }> = {
    active:    { label: 'Active',    className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    inactive:  { label: 'Inactive',  className: 'border-gray-200 bg-gray-50 text-gray-600' },
    suspended: { label: 'Suspended', className: 'border-red-200 bg-red-50 text-red-700' },
};

function fmt(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Users({ users }: { users: SuperadminUser[] }) {
    const { can } = usePermission();
    const [search, setSearch] = useState('');
    const [deleting, setDeleting] = useState<number | null>(null);

    const filtered = users.filter((u) => {
        const q = search.trim().toLowerCase();
        return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });

    function confirmDelete(user: SuperadminUser) {
        if (!confirm(`Delete "${user.name}"? This cannot be undone.`)) return;
        setDeleting(user.id);
        router.delete(`/superadmin/users/${user.id}`, {
            onFinish: () => setDeleting(null),
        });
    }

    return (
        <>
            <Head title="Users" />

            <div className="space-y-5 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="h1-semibold flex items-center gap-2">
                            <UserCogIcon className="size-6" />
                            Users
                        </h1>
                        <p className="text-muted-foreground mt-0.5 text-sm">Superadmin accounts and their permissions</p>
                    </div>

                    {can('users.create') && (
                        <Link
                            href="/superadmin/users/add"
                            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors"
                        >
                            <PlusIcon className="size-4" />
                            <span className="hidden sm:inline">Add User</span>
                        </Link>
                    )}
                </div>

                <div className="relative max-w-sm">
                    <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        placeholder="Search name or email"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/40 border-b text-left">
                                    <th className="text-muted-foreground px-4 py-3 font-medium">Name</th>
                                    <th className="text-muted-foreground px-4 py-3 font-medium">Email</th>
                                    <th className="text-muted-foreground px-4 py-3 font-medium">Status</th>
                                    <th className="text-muted-foreground px-4 py-3 font-medium">Created By</th>
                                    <th className="text-muted-foreground px-4 py-3 font-medium">Joined</th>
                                    <th className="px-4 py-3 font-medium" />
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-muted-foreground px-4 py-16 text-center">
                                            <SearchIcon className="mx-auto mb-3 size-8 opacity-30" />
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((user) => {
                                        const status = STATUS_CONFIG[user.status];
                                        return (
                                            <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3 font-medium">{user.name}</td>
                                                <td className="text-muted-foreground px-4 py-3">{user.email}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className={cn('font-medium', status.className)}>
                                                        {status.label}
                                                    </Badge>
                                                </td>
                                                <td className="text-muted-foreground px-4 py-3">
                                                    {user.created_by ?? <span className="italic">—</span>}
                                                </td>
                                                <td className="text-muted-foreground px-4 py-3">{fmt(user.created_at)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {can('users.manage_permissions') && (
                                                            <Link
                                                                href={`/superadmin/users/${user.id}/permissions`}
                                                                className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors"
                                                                title="Manage permissions"
                                                            >
                                                                <ShieldCheckIcon className="size-4" />
                                                            </Link>
                                                        )}
                                                        {can('users.edit') && (
                                                            <Link
                                                                href={`/superadmin/users/${user.id}/edit`}
                                                                className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors"
                                                                title="Edit user"
                                                            >
                                                                <PencilIcon className="size-4" />
                                                            </Link>
                                                        )}
                                                        {can('users.delete') && (
                                                            <button
                                                                onClick={() => confirmDelete(user)}
                                                                disabled={deleting === user.id}
                                                                className="text-muted-foreground hover:bg-red-50 hover:text-red-600 inline-flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-40"
                                                                title="Delete user"
                                                            >
                                                                <Trash2Icon className="size-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

Users.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Users', href: '/superadmin/users' },
    ],
};

import { Head, Link, router } from '@inertiajs/react';
import {
    KeyRoundIcon,
    MailIcon,
    PencilIcon,
    PlusIcon,
    SearchIcon,
    ShieldCheckIcon,
    Trash2Icon,
    UsersIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '../papers/paper-layouts/confirm-dialog';

type TeacherStatus = 'active' | 'inactive' | 'suspended';

interface Teacher {
    id: number;
    name: string;
    email: string;
    status: TeacherStatus;
    permission_count: number;
    created_at: string;
}

interface Quota {
    used: number;
    max: number | null;
    allow: boolean;
}

interface Props {
    teachers: Teacher[];
    quota: Quota;
}

const STATUS_STYLES: Record<TeacherStatus, string> = {
    active:    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    inactive:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    suspended: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
}

export default function TeachersIndex({ teachers, quota }: Props) {
    const [search, setSearch] = useState('');
    const [deleting, setDeleting] = useState<Teacher | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return teachers;
        return teachers.filter(
            (t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q),
        );
    }, [teachers, search]);

    const seatsLeft =
        quota.max === null ? Infinity : Math.max(0, quota.max - quota.used);
    const canAdd = quota.allow && (quota.max === null || quota.used < quota.max);

    function handleDelete() {
        if (!deleting || isDeleting) return;
        setIsDeleting(true);
        router.delete(`/teachers/${deleting.id}`, {
            onFinish: () => {
                setIsDeleting(false);
                setDeleting(null);
            },
        });
    }

    return (
        <>
            <Head title="Teachers" />

            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                            <UsersIcon className="size-5" />
                            Teachers
                        </h1>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            Manage the teachers who use your school's TestMaker account.
                        </p>
                    </div>

                    {canAdd ? (
                        <Link
                            href="/teachers/add"
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
                        >
                            <PlusIcon className="size-4" />
                            Add Teacher
                        </Link>
                    ) : (
                        <span
                            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                            title="Teacher limit reached"
                        >
                            <PlusIcon className="size-4" />
                            Add Teacher
                        </span>
                    )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <QuotaCard
                        label="Teachers Used"
                        value={quota.used.toString()}
                        accent="bg-brand-600"
                    />
                    <QuotaCard
                        label="Seats Remaining"
                        value={quota.max === null ? 'Unlimited' : `${seatsLeft}`}
                        accent="bg-emerald-600"
                    />
                    <QuotaCard
                        label="Plan Limit"
                        value={quota.max === null ? 'Unlimited' : quota.max.toString()}
                        accent="bg-violet-600"
                    />
                </div>

                <div className="relative max-w-sm">
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder="Search by name or email"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                                <UsersIcon className="size-6" />
                            </div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                {teachers.length === 0 ? 'No teachers yet' : 'No matches'}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                {teachers.length === 0
                                    ? 'Add your first teacher to start delegating access.'
                                    : 'Try a different name or email.'}
                            </p>
                            {teachers.length === 0 && canAdd && (
                                <Link
                                    href="/teachers/add"
                                    className="mt-5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                                >
                                    <PlusIcon className="size-4" />
                                    Add Teacher
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filtered.map((teacher) => (
                                <div
                                    key={teacher.id}
                                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                >
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                                        {initials(teacher.name)}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                {teacher.name}
                                            </p>
                                            <span
                                                className={cn(
                                                    'rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
                                                    STATUS_STYLES[teacher.status],
                                                )}
                                            >
                                                {teacher.status}
                                            </span>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                <KeyRoundIcon className="size-3" />
                                                {teacher.permission_count} permissions
                                            </span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <MailIcon className="size-3.5" />
                                                {teacher.email}
                                            </span>
                                            <span>Added {formatDate(teacher.created_at)}</span>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1.5">
                                        <Link
                                            href={`/teachers/${teacher.id}/permissions`}
                                            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-brand-400"
                                            title="Access & permissions"
                                        >
                                            <ShieldCheckIcon className="size-4" />
                                        </Link>
                                        <Link
                                            href={`/teachers/${teacher.id}/edit`}
                                            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                            title="Edit"
                                        >
                                            <PencilIcon className="size-4" />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => setDeleting(teacher)}
                                            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                                            title="Remove"
                                        >
                                            <Trash2Icon className="size-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {deleting && (
                <ConfirmDialog
                    variant="danger"
                    title="Remove teacher"
                    message={`Remove ${deleting.name}? They will lose access to the app immediately.`}
                    confirmLabel={isDeleting ? 'Removing…' : 'Remove'}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleting(null)}
                />
            )}
        </>
    );
}

function QuotaCard({
    label,
    value,
    accent,
}: {
    label: string;
    value: string;
    accent: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg text-white ${accent}`}>
                <UsersIcon className="size-5" />
            </div>
            <div className="min-w-0">
                <p className="text-xl leading-tight font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                    {value}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{label}</p>
            </div>
        </div>
    );
}

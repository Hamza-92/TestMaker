import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeftIcon, SaveIcon, ShieldCheckIcon, SlidersHorizontalIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { HierarchicalAccessControl } from '@/components/subscription-access-control';
import type {
    AccessClass,
    AccessPattern,
    AccessSubject,
    ClassSubjectMap,
    PatternClassMap,
    SubscriptionAccessScope,
} from '@/lib/subscription-access';
import { cn } from '@/lib/utils';

interface PermissionCatalogItem {
    name: string;
    label: string;
    description: string;
}

interface Teacher {
    id: number;
    name: string;
    email: string;
    teacher_permissions: string[];
    access_scope: SubscriptionAccessScope | null;
}

interface Props {
    teacher: Teacher;
    permissionCatalog: PermissionCatalogItem[];
    ceilingScope: SubscriptionAccessScope | null;
    patterns: AccessPattern[];
    classes: AccessClass[];
    subjects: AccessSubject[];
    patternClassMap: PatternClassMap;
    classSubjectMap: ClassSubjectMap;
}

type FormValues = {
    permissions: string[];
    access_scope: SubscriptionAccessScope | null;
};

export default function TeacherPermissions({
    teacher,
    permissionCatalog,
    ceilingScope,
    patterns,
    classes,
    subjects,
    patternClassMap,
    classSubjectMap,
}: Props) {
    const { data, setData, put, processing } = useForm<FormValues>({
        permissions: teacher.teacher_permissions ?? [],
        access_scope: teacher.access_scope ?? null,
    });

    function togglePermission(name: string, checked: boolean) {
        setData(
            'permissions',
            checked
                ? Array.from(new Set([...data.permissions, name]))
                : data.permissions.filter((p) => p !== name),
        );
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        put(`/teachers/${teacher.id}/permissions`);
    }

    const scopeInheritsFromSchool = ceilingScope === null;

    return (
        <>
            <Head title={`Access — ${teacher.name}`} />

            <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/teachers"
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                            <ShieldCheckIcon className="size-5" />
                            Access & Permissions
                        </h1>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            {teacher.name} &middot; {teacher.email}
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                <SlidersHorizontalIcon className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    Feature Permissions
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Toggle which parts of the app this teacher can use.
                                </p>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {permissionCatalog.map((permission) => {
                                const checked = data.permissions.includes(permission.name);

                                return (
                                    <label
                                        key={permission.name}
                                        className={cn(
                                            'flex cursor-pointer items-start gap-3 px-5 py-4 transition-colors',
                                            checked
                                                ? 'bg-brand-50/40 dark:bg-brand-500/5'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                                        )}
                                    >
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={(v) =>
                                                togglePermission(permission.name, v === true)
                                            }
                                            className="mt-0.5"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                {permission.label}
                                            </p>
                                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                {permission.description}
                                            </p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                Content Access
                            </h2>
                            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                                {scopeInheritsFromSchool
                                    ? 'No active subscription found — assign a subscription to unlock content access.'
                                    : 'Pick which patterns, classes, and subjects this teacher can use. The list is limited to what your school subscription allows.'}
                            </p>
                        </div>

                        <HierarchicalAccessControl
                            patterns={patterns}
                            classes={classes}
                            subjects={subjects}
                            patternClassMap={patternClassMap}
                            classSubjectMap={classSubjectMap}
                            value={data.access_scope}
                            onChange={(next) => setData('access_scope', next)}
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Link
                            href="/teachers"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
                        >
                            <SaveIcon className="size-4" />
                            Save Access
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

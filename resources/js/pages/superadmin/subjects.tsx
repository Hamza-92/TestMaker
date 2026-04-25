import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
    EyeIcon,
    PencilIcon,
    SearchIcon,
    Trash2Icon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import PlusIcon from '@/components/icons/PlusIcon';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface ClassLink {
    school_class: { id: number; name: string } | null;
    pattern: { id: number; name: string; short_name: string | null } | null;
}

interface Subject {
    id: number;
    name_eng: string;
    name_ur: string | null;
    subject_type: 'chapter-wise' | 'topic-wise';
    status: number;
    created_at: string;
    class_subjects: ClassLink[];
}

interface PatternFilterOption {
    id: number;
    name: string;
    short_name: string | null;
}

interface ClassFilterOption {
    id: number;
    name: string;
}

interface LinkGroup {
    key: string;
    pattern: PatternFilterOption | null;
    classes: ClassFilterOption[];
}

type FacetKey = 'pattern' | 'class' | 'type' | 'status';

interface FacetFilters {
    pattern: string;
    class: string;
    type: string;
    status: string;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20];
const TYPE_CONFIG = {
    'chapter-wise': {
        label: 'Chapter-wise',
        className: 'border-blue-200 bg-blue-100 text-blue-700',
    },
    'topic-wise': {
        label: 'Topic-wise',
        className: 'border-violet-200 bg-violet-100 text-violet-700',
    },
} as const;
const SUBJECT_TYPE_OPTIONS = [
    { value: 'chapter-wise', label: 'Chapter-wise' },
    { value: 'topic-wise', label: 'Topic-wise' },
] as const;
const STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
] as const;

function statusBadge(status: number) {
    return status === 1 ? (
        <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-100 font-medium text-emerald-700"
        >
            <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />
            Active
        </Badge>
    ) : (
        <Badge
            variant="outline"
            className="border-gray-200 bg-gray-100 font-medium text-gray-600"
        >
            <span className="mr-1 inline-block size-1.5 rounded-full bg-gray-400" />
            Inactive
        </Badge>
    );
}

function patternLabel(pattern: PatternFilterOption | null) {
    if (!pattern) {
        return 'Unknown Pattern';
    }

    return pattern.short_name
        ? `${pattern.short_name} / ${pattern.name}`
        : pattern.name;
}

function groupLinks(subject: Subject) {
    const groups = new Map<string, LinkGroup>();

    subject.class_subjects.forEach((link, index) => {
        const key = link.pattern?.id
            ? `pattern-${link.pattern.id}`
            : `pattern-unknown-${index}`;

        if (!groups.has(key)) {
            groups.set(key, {
                key,
                pattern: link.pattern,
                classes: [],
            });
        }

        const group = groups.get(key);

        if (!group || !link.school_class) {
            return;
        }

        if (!group.classes.some((item) => item.id === link.school_class?.id)) {
            group.classes.push(link.school_class);
        }
    });

    return Array.from(groups.values())
        .map((group) => ({
            ...group,
            classes: [...group.classes].sort((left, right) =>
                left.name.localeCompare(right.name),
            ),
        }))
        .sort((left, right) =>
            patternLabel(left.pattern).localeCompare(patternLabel(right.pattern)),
        );
}

function matchesSearch(subject: Subject, query: string) {
    const normalized = query.trim().toLowerCase();

    if (normalized === '') {
        return true;
    }

    return (
        subject.name_eng.toLowerCase().includes(normalized) ||
        (subject.name_ur ?? '').toLowerCase().includes(normalized)
    );
}

function matchesFacetFilters(
    subject: Subject,
    filters: FacetFilters,
    excluded: FacetKey[] = [],
) {
    const skip = new Set(excluded);

    const matchesPattern =
        skip.has('pattern') ||
        filters.pattern === 'all' ||
        subject.class_subjects.some(
            (link) => String(link.pattern?.id ?? '') === filters.pattern,
        );

    const matchesClass =
        skip.has('class') ||
        filters.class === 'all' ||
        subject.class_subjects.some(
            (link) => String(link.school_class?.id ?? '') === filters.class,
        );

    const matchesType =
        skip.has('type') ||
        filters.type === 'all' ||
        subject.subject_type === filters.type;

    const matchesStatus =
        skip.has('status') ||
        filters.status === 'all' ||
        (filters.status === 'active' && subject.status === 1) ||
        (filters.status === 'inactive' && subject.status === 0);

    return matchesPattern && matchesClass && matchesType && matchesStatus;
}

export default function Subjects({ subjects }: { subjects: Subject[] }) {
    const [search, setSearch] = useState('');
    const [patternFilter, setPatternFilter] = useState('all');
    const [classFilter, setClassFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
    const [deleting, setDeleting] = useState(false);

    const activeFilters = useMemo<FacetFilters>(
        () => ({
            pattern: patternFilter,
            class: classFilter,
            type: typeFilter,
            status: statusFilter,
        }),
        [classFilter, patternFilter, statusFilter, typeFilter],
    );

    const searchMatchedSubjects = useMemo(
        () => subjects.filter((subject) => matchesSearch(subject, search)),
        [search, subjects],
    );

    const allPatternOptions = useMemo(() => {
        const patterns = new Map<number, PatternFilterOption>();

        subjects.forEach((subject) => {
            subject.class_subjects.forEach((link) => {
                if (!link.pattern) {
                    return;
                }

                patterns.set(link.pattern.id, link.pattern);
            });
        });

        return Array.from(patterns.values()).sort((left, right) =>
            patternLabel(left).localeCompare(patternLabel(right)),
        );
    }, [subjects]);

    const allClassOptions = useMemo(() => {
        const classes = new Map<number, ClassFilterOption>();

        subjects.forEach((subject) => {
            subject.class_subjects.forEach((link) => {
                if (!link.school_class) {
                    return;
                }

                classes.set(link.school_class.id, link.school_class);
            });
        });

        return Array.from(classes.values()).sort((left, right) =>
            left.name.localeCompare(right.name),
        );
    }, [subjects]);

    const patternOptions = useMemo(() => {
        const availableIds = new Set(
            searchMatchedSubjects
                .filter((subject) =>
                    matchesFacetFilters(subject, activeFilters, ['pattern']),
                )
                .flatMap((subject) =>
                    subject.class_subjects
                        .map((link) => link.pattern?.id)
                        .filter((id): id is number => typeof id === 'number'),
                ),
        );

        return allPatternOptions.filter(
            (option) =>
                availableIds.has(option.id) ||
                String(option.id) === patternFilter,
        );
    }, [
        activeFilters,
        allPatternOptions,
        patternFilter,
        searchMatchedSubjects,
    ]);

    const classOptions = useMemo(() => {
        const availableIds = new Set(
            searchMatchedSubjects
                .filter((subject) =>
                    matchesFacetFilters(subject, activeFilters, ['class']),
                )
                .flatMap((subject) =>
                    subject.class_subjects
                        .map((link) => link.school_class?.id)
                        .filter((id): id is number => typeof id === 'number'),
                ),
        );

        return allClassOptions.filter(
            (option) =>
                availableIds.has(option.id) || String(option.id) === classFilter,
        );
    }, [activeFilters, allClassOptions, classFilter, searchMatchedSubjects]);

    const typeOptions = useMemo(() => {
        const availableTypes = new Set(
            searchMatchedSubjects
                .filter((subject) =>
                    matchesFacetFilters(subject, activeFilters, ['type']),
                )
                .map((subject) => subject.subject_type),
        );

        return SUBJECT_TYPE_OPTIONS.filter(
            (option) =>
                availableTypes.has(option.value) || option.value === typeFilter,
        );
    }, [activeFilters, searchMatchedSubjects, typeFilter]);

    const statusOptions = useMemo(() => {
        const availableStatuses = new Set(
            searchMatchedSubjects
                .filter((subject) =>
                    matchesFacetFilters(subject, activeFilters, ['status']),
                )
                .map((subject) => (subject.status === 1 ? 'active' : 'inactive')),
        );

        return STATUS_OPTIONS.filter(
            (option) =>
                availableStatuses.has(option.value) ||
                option.value === statusFilter,
        );
    }, [activeFilters, searchMatchedSubjects, statusFilter]);

    const filtered = useMemo(
        () =>
            searchMatchedSubjects.filter((subject) =>
                matchesFacetFilters(subject, activeFilters),
            ),
        [activeFilters, searchMatchedSubjects],
    );

    const hasActiveFilters =
        search.trim() !== '' ||
        patternFilter !== 'all' ||
        classFilter !== 'all' ||
        typeFilter !== 'all' ||
        statusFilter !== 'all';

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize,
    );

    const goTo = (targetPage: number) =>
        setPage(Math.min(Math.max(1, targetPage), totalPages));

    const clearFilters = () => {
        setSearch('');
        setPatternFilter('all');
        setClassFilter('all');
        setTypeFilter('all');
        setStatusFilter('all');
        setPage(1);
    };

    const confirmDelete = () => {
        if (!deleteTarget) {
            return;
        }

        setDeleting(true);
        router.delete(`/superadmin/subjects/${deleteTarget.id}`, {
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    return (
        <>
            <Head title="Subjects" />

            <div className="space-y-5 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="h1-semibold">Subjects</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {filtered.length} total
                        </p>
                    </div>
                    <Link
                        href="/superadmin/subjects/add"
                        className="bg-primary text-primary-foreground flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-primary/90"
                    >
                        <PlusIcon size={16} color="currentColor" />
                        <span className="hidden sm:inline">Add Subject</span>
                    </Link>
                </div>

                <div className="space-y-4 rounded-xl border p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative min-w-0 flex-1">
                            <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                placeholder="Search subjects..."
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                                className="pl-9"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                            <button
                                type="button"
                                onClick={clearFilters}
                                disabled={!hasActiveFilters}
                                className="border-input hover:bg-accent flex h-10 items-center rounded-lg border px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Clear Filters
                            </button>

                            <Select
                                value={String(pageSize)}
                                onValueChange={(value) => {
                                    setPageSize(Number(value));
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-24">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAGE_SIZE_OPTIONS.map((value) => (
                                        <SelectItem
                                            key={value}
                                            value={String(value)}
                                        >
                                            {value}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                        <Select
                            value={patternFilter}
                            onValueChange={(value) => {
                                setPatternFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Pattern" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All patterns</SelectItem>
                                {patternOptions.map((pattern) => (
                                    <SelectItem
                                        key={pattern.id}
                                        value={String(pattern.id)}
                                    >
                                        {patternLabel(pattern)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={classFilter}
                            onValueChange={(value) => {
                                setClassFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Class" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All classes</SelectItem>
                                {classOptions.map((schoolClass) => (
                                    <SelectItem
                                        key={schoolClass.id}
                                        value={String(schoolClass.id)}
                                    >
                                        {schoolClass.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={typeFilter}
                            onValueChange={(value) => {
                                setTypeFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All types</SelectItem>
                                {typeOptions.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={statusFilter}
                            onValueChange={(value) => {
                                setStatusFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                {statusOptions.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Subject
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Type
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Linked To
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Status
                                    </th>
                                    <th className="w-16 px-4 py-3 text-center font-medium text-muted-foreground" />
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-16 text-center text-muted-foreground"
                                        >
                                            <SearchIcon className="mx-auto mb-2 size-8 opacity-30" />
                                            No subjects found
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((subject, index) => {
                                        const typeConfig =
                                            TYPE_CONFIG[subject.subject_type];
                                        const links = groupLinks(subject);

                                        return (
                                            <tr
                                                key={subject.id}
                                                className={`transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-accent/50`}
                                            >
                                                <td className="px-4 py-3 align-top">
                                                    <p className="font-medium">
                                                        {subject.name_eng}
                                                    </p>
                                                    {subject.name_ur ? (
                                                        <p
                                                            className="text-xs text-muted-foreground"
                                                            dir="rtl"
                                                        >
                                                            {subject.name_ur}
                                                        </p>
                                                    ) : null}
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <Badge
                                                        variant="outline"
                                                        className={`${typeConfig.className} font-medium`}
                                                    >
                                                        {typeConfig.label}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    {links.length === 0 ? (
                                                        <span className="text-muted-foreground italic">
                                                            -
                                                        </span>
                                                    ) : (
                                                        <div className="flex max-w-xl flex-wrap gap-1.5">
                                                            {links.map((link) => (
                                                                <span
                                                                    key={link.key}
                                                                    className="inline-flex items-center gap-1.5 rounded-full border bg-muted/20 px-3 py-1 text-xs"
                                                                >
                                                                    <span className="font-medium text-foreground">
                                                                        {patternLabel(
                                                                            link.pattern,
                                                                        )}
                                                                    </span>
                                                                    <span className="text-muted-foreground">
                                                                        :
                                                                    </span>
                                                                    <span className="text-muted-foreground">
                                                                        {link.classes
                                                                            .map(
                                                                                (
                                                                                    schoolClass,
                                                                                ) =>
                                                                                    schoolClass.name,
                                                                            )
                                                                            .join(
                                                                                ', ',
                                                                            ) ||
                                                                            'No class'}
                                                                    </span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    {statusBadge(subject.status)}
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Link
                                                            href={`/superadmin/subjects/${subject.id}`}
                                                            className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-1.5 transition-colors"
                                                        >
                                                            <EyeIcon className="size-4" />
                                                        </Link>
                                                        <Link
                                                            href={`/superadmin/subjects/${subject.id}/edit`}
                                                            className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-1.5 transition-colors"
                                                        >
                                                            <PencilIcon className="size-4" />
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDeleteTarget(
                                                                    subject,
                                                                )
                                                            }
                                                            className="text-destructive hover:bg-destructive/10 rounded-md p-1.5 transition-colors"
                                                        >
                                                            <Trash2Icon className="size-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-muted/20 flex items-center justify-between border-t px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                            {filtered.length === 0
                                ? 'No results'
                                : `${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}`}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => goTo(1)}
                                disabled={safePage === 1}
                                className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30"
                            >
                                <ChevronsLeftIcon className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => goTo(safePage - 1)}
                                disabled={safePage === 1}
                                className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30"
                            >
                                <ChevronLeftIcon className="size-4" />
                            </button>

                            <div className="flex items-center gap-1 px-1">
                                {Array.from(
                                    { length: totalPages },
                                    (_, index) => index + 1,
                                )
                                    .filter(
                                        (value) =>
                                            value === 1 ||
                                            value === totalPages ||
                                            Math.abs(value - safePage) <= 1,
                                    )
                                    .reduce<(number | 'ellipsis')[]>(
                                        (carry, value, index, array) => {
                                            if (
                                                index > 0 &&
                                                value -
                                                    (array[
                                                        index - 1
                                                    ] as number) >
                                                    1
                                            ) {
                                                carry.push('ellipsis');
                                            }

                                            carry.push(value);

                                            return carry;
                                        },
                                        [],
                                    )
                                    .map((value, index) =>
                                        value === 'ellipsis' ? (
                                            <span
                                                key={`ellipsis-${index}`}
                                                className="px-1 text-xs text-muted-foreground"
                                            >
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() =>
                                                    goTo(value as number)
                                                }
                                                className={`min-w-[28px] rounded px-2 py-1 text-xs font-medium transition-colors ${safePage === value ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                                            >
                                                {value}
                                            </button>
                                        ),
                                    )}
                            </div>

                            <button
                                type="button"
                                onClick={() => goTo(safePage + 1)}
                                disabled={safePage === totalPages}
                                className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30"
                            >
                                <ChevronRightIcon className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => goTo(totalPages)}
                                disabled={safePage === totalPages}
                                className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30"
                            >
                                <ChevronsRightIcon className="size-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <DialogContent>
                    <DialogTitle>Delete Subject</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete{' '}
                        <span className="font-medium text-foreground">
                            "{deleteTarget?.name_eng}"
                        </span>
                        ? This action cannot be undone.
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <button
                            type="button"
                            onClick={() => setDeleteTarget(null)}
                            className="border-input hover:bg-accent flex h-9 items-center rounded-lg border px-4 text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={confirmDelete}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-60"
                        >
                            <Trash2Icon className="size-4" />
                            {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Subjects.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Subjects', href: '/superadmin/subjects' },
    ],
};

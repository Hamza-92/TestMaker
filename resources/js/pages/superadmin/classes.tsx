import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowUpDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
    EyeIcon,
    GripVerticalIcon,
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
import { usePermission } from '@/hooks/use-permission';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Pattern {
    id: number;
    name: string;
    sort_order: number;
    short_name: string | null;
}

interface SchoolClass {
    id: number;
    name: string;
    sort_order: number;
    status: number;
    created_at: string;
    patterns: Pattern[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [5, 10, 20];

const PATTERN_COLORS = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-violet-100 text-violet-700 border-violet-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-cyan-100 text-cyan-700 border-cyan-200',
    'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-teal-100 text-teal-700 border-teal-200',
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Classes({ classes }: { classes: SchoolClass[] }) {
    const { can } = usePermission();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [patternFilter, setPatternFilter] = useState<string>('all');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<SchoolClass | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [sortingEnabled, setSortingEnabled] = useState(false);
    const [sortingItems, setSortingItems] = useState(classes);
    const [draggedId, setDraggedId] = useState<number | null>(null);
    const [sortDirty, setSortDirty] = useState(false);
    const [sortSaving, setSortSaving] = useState(false);

    // ── Unique patterns for filter dropdown ──────────────────────────────────
    const allPatterns = useMemo(() => {
        const seen = new Set<number>();
        const result: Pattern[] = [];

        for (const cls of classes) {
            for (const p of cls.patterns) {
                if (!seen.has(p.id)) {
                    seen.add(p.id);
                    result.push(p);
                }
            }
        }

        return result.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    }, [classes]);

    // ── Filter + Search ──────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase();

        return classes.filter((c) => {
            const matchesSearch =
                !q ||
                c.name.toLowerCase().includes(q) ||
                c.patterns.some((p) => p.name.toLowerCase().includes(q));
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && c.status === 1) ||
                (statusFilter === 'inactive' && c.status === 0);
            const matchesPattern =
                patternFilter === 'all' ||
                c.patterns.some((p) => p.id === Number(patternFilter));

            return matchesSearch && matchesStatus && matchesPattern;
        });
    }, [classes, search, statusFilter, patternFilter]);

    // ── Pagination ───────────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize,
    );
    const rows = sortingEnabled ? sortingItems : paginated;

    const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1);
    };
    const handleStatusChange = (val: string) => {
        setStatusFilter(val);
        setPage(1);
    };
    const handlePatternChange = (val: string) => {
        setPatternFilter(val);
        setPage(1);
    };

    const confirmDelete = () => {
        if (!deleteTarget) {
            return;
        }

        setDeleting(true);
        router.delete(`/superadmin/classes/${deleteTarget.id}`, {
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    const beginSorting = () => {
        setSearch('');
        setStatusFilter('all');
        setPatternFilter('all');
        setPage(1);
        setSortingItems(classes);
        setSortDirty(false);
        setSortingEnabled(true);
    };

    const cancelSorting = () => {
        setSortingItems(classes);
        setDraggedId(null);
        setSortDirty(false);
        setSortingEnabled(false);
    };

    const handleDrop = (targetId: number) => {
        if (draggedId === null || draggedId === targetId) {
            setDraggedId(null);

            return;
        }

        setSortingItems((current) => {
            const fromIndex = current.findIndex(
                (item) => item.id === draggedId,
            );
            const toIndex = current.findIndex((item) => item.id === targetId);

            if (fromIndex < 0 || toIndex < 0) {
                return current;
            }

            const next = [...current];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);

            return next;
        });
        setDraggedId(null);
        setSortDirty(true);
    };

    const saveSorting = () => {
        setSortSaving(true);
        router.post(
            '/superadmin/classes/reorder',
            { order: sortingItems.map((item) => item.id) },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSortDirty(false);
                    setSortingEnabled(false);
                },
                onFinish: () => setSortSaving(false),
            },
        );
    };

    return (
        <>
            <Head title="Classes" />
            <div className="space-y-5 p-4 md:p-6">
                {/* ── Page Header ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="h1-semibold">Classes</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {filtered.length} total
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {can('classes.edit') && !sortingEnabled && (
                            <button
                                type="button"
                                onClick={beginSorting}
                                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                            >
                                <ArrowUpDownIcon className="size-4" />
                                <span className="hidden sm:inline">
                                    Sort classes
                                </span>
                            </button>
                        )}
                        {sortingEnabled && (
                            <>
                                <button
                                    type="button"
                                    onClick={cancelSorting}
                                    disabled={sortSaving}
                                    className="rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={saveSorting}
                                    disabled={!sortDirty || sortSaving}
                                    className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                                >
                                    {sortSaving ? 'Saving…' : 'Save order'}
                                </button>
                            </>
                        )}
                        {can('classes.create') && !sortingEnabled && (
                            <Link
                                href="/superadmin/classes/add"
                                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                            >
                                <PlusIcon size={16} color="currentColor" />
                                <span className="hidden sm:inline">
                                    Add Class
                                </span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* ── Filters ─────────────────────────────────────────────── */}
                {!sortingEnabled && (
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[200px] flex-1">
                            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search classes or patterns…"
                                value={search}
                                onChange={handleSearch}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Select
                                value={patternFilter}
                                onValueChange={handlePatternChange}
                            >
                                <SelectTrigger className="w-40 gap-1.5">
                                    <SelectValue placeholder="Pattern" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All patterns
                                    </SelectItem>
                                    {allPatterns.map((p) => (
                                        <SelectItem
                                            key={p.id}
                                            value={String(p.id)}
                                        >
                                            {p.name}
                                            {p.short_name
                                                ? ` (${p.short_name})`
                                                : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={statusFilter}
                                onValueChange={handleStatusChange}
                            >
                                <SelectTrigger className="w-36 gap-1.5">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All statuses
                                    </SelectItem>
                                    <SelectItem value="active">
                                        Active
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                        Inactive
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={String(pageSize)}
                                onValueChange={(v) => {
                                    setPageSize(Number(v));
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAGE_SIZE_OPTIONS.map((n) => (
                                        <SelectItem key={n} value={String(n)}>
                                            {n}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                {sortingEnabled && (
                    <p className="text-sm text-muted-foreground">
                        Drag the classes into their required order, then save.
                    </p>
                )}

                {/* ── Table ───────────────────────────────────────────────── */}
                <div className="overflow-hidden rounded-xl border shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Class
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Patterns
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Created
                                    </th>
                                    <th className="w-16 px-4 py-3 text-center font-medium text-muted-foreground"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {rows.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-16 text-center text-muted-foreground"
                                        >
                                            <SearchIcon className="mx-auto mb-2 size-8 opacity-30" />
                                            No classes found
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((cls, idx) => (
                                        <tr
                                            key={cls.id}
                                            draggable={sortingEnabled}
                                            onDragStart={() =>
                                                setDraggedId(cls.id)
                                            }
                                            onDragEnd={() => setDraggedId(null)}
                                            onDragOver={(event) => {
                                                if (sortingEnabled) {
                                                    event.preventDefault();
                                                }
                                            }}
                                            onDrop={() => handleDrop(cls.id)}
                                            className={`transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} ${sortingEnabled ? 'cursor-grab select-none hover:bg-accent/50 active:cursor-grabbing' : 'hover:bg-accent/50'} ${draggedId === cls.id ? 'opacity-40' : ''}`}
                                        >
                                            <td className="px-4 py-3 font-medium">
                                                <div className="flex items-center gap-2">
                                                    {sortingEnabled && (
                                                        <GripVerticalIcon className="size-4 shrink-0 text-muted-foreground" />
                                                    )}
                                                    <span>{cls.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {cls.patterns.length === 0 ? (
                                                    <span className="text-muted-foreground italic">
                                                        —
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {cls.patterns.map(
                                                            (p) => (
                                                                <Badge
                                                                    key={p.id}
                                                                    variant="outline"
                                                                    className={`${PATTERN_COLORS[p.id % PATTERN_COLORS.length]} text-xs font-medium`}
                                                                >
                                                                    {p.short_name ??
                                                                        p.name}
                                                                </Badge>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {cls.status === 1 ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-emerald-200 bg-emerald-100 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                    >
                                                        <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-gray-200 bg-gray-100 font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                                    >
                                                        <span className="mr-1 inline-block size-1.5 rounded-full bg-gray-400" />
                                                        Inactive
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground tabular-nums">
                                                {new Date(
                                                    cls.created_at,
                                                ).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </td>
                                            <td className="px-4 py-3">
                                                {!sortingEnabled && (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Link
                                                            href={`/superadmin/classes/${cls.id}`}
                                                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                        >
                                                            <EyeIcon className="size-4" />
                                                        </Link>
                                                        {can(
                                                            'classes.edit',
                                                        ) && (
                                                            <Link
                                                                href={`/superadmin/classes/${cls.id}/edit`}
                                                                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                            >
                                                                <PencilIcon className="size-4" />
                                                            </Link>
                                                        )}
                                                        {can(
                                                            'classes.delete',
                                                        ) && (
                                                            <button
                                                                onClick={() =>
                                                                    setDeleteTarget(
                                                                        cls,
                                                                    )
                                                                }
                                                                className="rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                                                            >
                                                                <Trash2Icon className="size-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Pagination ──────────────────────────────────────── */}
                    <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
                        {sortingEnabled ? (
                            <p className="text-xs text-muted-foreground">
                                {sortingItems.length} classes
                            </p>
                        ) : (
                            <>
                                <p className="text-xs text-muted-foreground">
                                    {filtered.length === 0
                                        ? 'No results'
                                        : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}`}
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => goTo(1)}
                                        disabled={safePage === 1}
                                        className="rounded p-1.5 transition-colors hover:bg-accent disabled:opacity-30"
                                        title="First page"
                                    >
                                        <ChevronsLeftIcon className="size-4" />
                                    </button>
                                    <button
                                        onClick={() => goTo(safePage - 1)}
                                        disabled={safePage === 1}
                                        className="rounded p-1.5 transition-colors hover:bg-accent disabled:opacity-30"
                                        title="Previous"
                                    >
                                        <ChevronLeftIcon className="size-4" />
                                    </button>
                                    <div className="flex items-center gap-1 px-1">
                                        {Array.from(
                                            { length: totalPages },
                                            (_, i) => i + 1,
                                        )
                                            .filter(
                                                (p) =>
                                                    p === 1 ||
                                                    p === totalPages ||
                                                    Math.abs(p - safePage) <= 1,
                                            )
                                            .reduce<(number | 'ellipsis')[]>(
                                                (acc, p, idx, arr) => {
                                                    if (
                                                        idx > 0 &&
                                                        p -
                                                            (arr[
                                                                idx - 1
                                                            ] as number) >
                                                            1
                                                    ) {
                                                        acc.push('ellipsis');
                                                    }

                                                    acc.push(p);

                                                    return acc;
                                                },
                                                [],
                                            )
                                            .map((p, i) =>
                                                p === 'ellipsis' ? (
                                                    <span
                                                        key={`e${i}`}
                                                        className="px-1 text-xs text-muted-foreground"
                                                    >
                                                        …
                                                    </span>
                                                ) : (
                                                    <button
                                                        key={p}
                                                        onClick={() =>
                                                            goTo(p as number)
                                                        }
                                                        className={`min-w-[28px] rounded px-2 py-1 text-xs font-medium transition-colors ${safePage === p ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                                                    >
                                                        {p}
                                                    </button>
                                                ),
                                            )}
                                    </div>
                                    <button
                                        onClick={() => goTo(safePage + 1)}
                                        disabled={safePage === totalPages}
                                        className="rounded p-1.5 transition-colors hover:bg-accent disabled:opacity-30"
                                        title="Next"
                                    >
                                        <ChevronRightIcon className="size-4" />
                                    </button>
                                    <button
                                        onClick={() => goTo(totalPages)}
                                        disabled={safePage === totalPages}
                                        className="rounded p-1.5 transition-colors hover:bg-accent disabled:opacity-30"
                                        title="Last page"
                                    >
                                        <ChevronsRightIcon className="size-4" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Delete Confirmation Dialog ───────────────────────────────── */}
            <Dialog
                open={!!deleteTarget}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteTarget(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogTitle>Delete Class</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete{' '}
                        <span className="font-medium text-foreground">
                            "{deleteTarget?.name}"
                        </span>
                        ? This action cannot be undone.
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <button
                            type="button"
                            onClick={() => setDeleteTarget(null)}
                            className="flex h-9 items-center rounded-lg border border-input px-4 text-sm font-medium transition-colors hover:bg-accent"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={confirmDelete}
                            disabled={deleting}
                            className="flex h-9 items-center gap-2 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
                        >
                            <Trash2Icon className="size-4" />
                            {deleting ? 'Deleting…' : 'Delete'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Classes.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Classes', href: '/superadmin/classes' },
    ],
};

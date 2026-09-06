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
    status: number;
    created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [5, 10, 20];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Patterns({ patterns }: { patterns: Pattern[] }) {
    const { can } = usePermission();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<Pattern | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [sortingEnabled, setSortingEnabled] = useState(false);
    const [sortingItems, setSortingItems] = useState(patterns);
    const [draggedId, setDraggedId] = useState<number | null>(null);
    const [sortDirty, setSortDirty] = useState(false);
    const [sortSaving, setSortSaving] = useState(false);

    // ── Filter + Search ──────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase();

        return patterns.filter((p) => {
            const matchesSearch =
                !q ||
                p.name.toLowerCase().includes(q) ||
                (p.short_name ?? '').toLowerCase().includes(q);
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && p.status === 1) ||
                (statusFilter === 'inactive' && p.status === 0);

            return matchesSearch && matchesStatus;
        });
    }, [patterns, search, statusFilter]);

    // ── Pagination ───────────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize,
    );
    const rows = sortingEnabled ? sortingItems : paginated;

    const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

    const handleStatusChange = (val: string) => {
        setStatusFilter(val);
        setPage(1);
    };
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const beginSorting = () => {
        setSearch('');
        setStatusFilter('all');
        setPage(1);
        setSortingItems(patterns);
        setSortDirty(false);
        setSortingEnabled(true);
    };

    const cancelSorting = () => {
        setSortingItems(patterns);
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
            '/superadmin/patterns/reorder',
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

    const confirmDelete = () => {
        if (!deleteTarget) {
            return;
        }

        setDeleting(true);
        router.delete(`/superadmin/patterns/${deleteTarget.id}`, {
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    return (
        <>
            <Head title="Patterns" />
            <div className="space-y-5 p-4 md:p-6">
                {/* ── Page Header ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="h1-semibold">Patterns</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {filtered.length} total
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {can('patterns.edit') && !sortingEnabled && (
                            <button
                                type="button"
                                onClick={beginSorting}
                                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                            >
                                <ArrowUpDownIcon className="size-4" />
                                <span className="hidden sm:inline">
                                    Sort patterns
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
                        {can('patterns.create') && !sortingEnabled && (
                            <Link
                                href="/superadmin/patterns/add"
                                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                            >
                                <PlusIcon size={16} color="currentColor" />
                                <span className="hidden sm:inline">
                                    Add Pattern
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
                                placeholder="Search patterns…"
                                value={search}
                                onChange={handleSearch}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex items-center gap-2">
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
                        Drag the patterns into their required order, then save.
                    </p>
                )}

                {/* ── Table ───────────────────────────────────────────────── */}
                <div className="overflow-hidden rounded-xl border shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Name
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Short Name
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
                                            No patterns found
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((pattern, idx) => (
                                        <tr
                                            key={pattern.id}
                                            draggable={sortingEnabled}
                                            onDragStart={() =>
                                                setDraggedId(pattern.id)
                                            }
                                            onDragEnd={() => setDraggedId(null)}
                                            onDragOver={(event) => {
                                                if (sortingEnabled) {
                                                    event.preventDefault();
                                                }
                                            }}
                                            onDrop={() =>
                                                handleDrop(pattern.id)
                                            }
                                            className={`transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} ${sortingEnabled ? 'cursor-grab select-none hover:bg-accent/50 active:cursor-grabbing' : 'hover:bg-accent/50'} ${draggedId === pattern.id ? 'opacity-40' : ''}`}
                                        >
                                            <td className="px-4 py-3 font-medium">
                                                <div className="flex items-center gap-2">
                                                    {sortingEnabled && (
                                                        <GripVerticalIcon className="size-4 shrink-0 text-muted-foreground" />
                                                    )}
                                                    <span>{pattern.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {pattern.short_name ?? (
                                                    <span className="italic">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {pattern.status === 1 ? (
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
                                                    pattern.created_at,
                                                ).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Link
                                                        href={`/superadmin/patterns/${pattern.id}`}
                                                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                    >
                                                        <EyeIcon className="size-4" />
                                                    </Link>
                                                    {can('patterns.edit') && (
                                                        <Link
                                                            href={`/superadmin/patterns/${pattern.id}/edit`}
                                                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                        >
                                                            <PencilIcon className="size-4" />
                                                        </Link>
                                                    )}
                                                    {can('patterns.delete') && (
                                                        <button
                                                            onClick={() =>
                                                                setDeleteTarget(
                                                                    pattern,
                                                                )
                                                            }
                                                            className="rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                                                        >
                                                            <Trash2Icon className="size-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Pagination ──────────────────────────────────────── */}
                    {!sortingEnabled && (
                        <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
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
                        </div>
                    )}
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
                    <DialogTitle>Delete Pattern</DialogTitle>
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

Patterns.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Patterns', href: '/superadmin/patterns' },
    ],
};

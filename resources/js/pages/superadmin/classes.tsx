import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
    EllipsisIcon,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Pattern {
    id: number;
    name: string;
    short_name: string | null;
}

interface SchoolClass {
    id: number;
    name: string;
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
    const [search, setSearch]             = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [pageSize, setPageSize]         = useState(10);
    const [page, setPage]                 = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<SchoolClass | null>(null);
    const [deleting, setDeleting]         = useState(false);

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
            return matchesSearch && matchesStatus;
        });
    }, [classes, search, statusFilter]);

    // ── Pagination ───────────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage   = Math.min(page, totalPages);
    const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); };
    const handleStatusChange = (val: string) => { setStatusFilter(val); setPage(1); };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        router.delete(`/superadmin/classes/${deleteTarget.id}`, {
            onFinish: () => { setDeleting(false); setDeleteTarget(null); },
        });
    };

    return (
        <>
            <Head title="Classes" />
            <div className="space-y-5 p-4 md:p-6">

                {/* ── Page Header ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="h1-semibold">Classes</h1>
                        <p className="text-muted-foreground mt-0.5 text-sm">{filtered.length} total</p>
                    </div>
                    <Link
                        href="/superadmin/classes/add"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors"
                    >
                        <PlusIcon size={16} color="currentColor" />
                        <span className="hidden sm:inline">Add Class</span>
                    </Link>
                </div>

                {/* ── Filters ─────────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[200px] flex-1">
                        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            placeholder="Search classes or patterns…"
                            value={search}
                            onChange={handleSearch}
                            className="pl-9"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={statusFilter} onValueChange={handleStatusChange}>
                            <SelectTrigger className="w-36 gap-1.5">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                            <SelectTrigger className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAGE_SIZE_OPTIONS.map((n) => (
                                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* ── Table ───────────────────────────────────────────────── */}
                <div className="overflow-hidden rounded-xl border shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/40 border-b">
                                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">Class</th>
                                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">Patterns</th>
                                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">Status</th>
                                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">Created</th>
                                    <th className="text-muted-foreground w-16 px-4 py-3 text-center font-medium"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-muted-foreground py-16 text-center">
                                            <SearchIcon className="mx-auto mb-2 size-8 opacity-30" />
                                            No classes found
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((cls, idx) => (
                                        <tr
                                            key={cls.id}
                                            className={`transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-accent/50`}
                                        >
                                            <td className="px-4 py-3 font-medium">{cls.name}</td>
                                            <td className="px-4 py-3">
                                                {cls.patterns.length === 0 ? (
                                                    <span className="text-muted-foreground italic">—</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {cls.patterns.map((p) => (
                                                            <Badge
                                                                key={p.id}
                                                                variant="outline"
                                                                className={`${PATTERN_COLORS[p.id % PATTERN_COLORS.length]} text-xs font-medium`}
                                                            >
                                                                {p.short_name ?? p.name}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {cls.status === 1 ? (
                                                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">
                                                        <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 font-medium">
                                                        <span className="mr-1 inline-block size-1.5 rounded-full bg-gray-400" />
                                                        Inactive
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="text-muted-foreground px-4 py-3 tabular-nums">
                                                {new Date(cls.created_at).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric', year: 'numeric',
                                                })}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="hover:bg-accent rounded-md p-1.5 transition-colors">
                                                            <EllipsisIcon className="size-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-36">
                                                        <DropdownMenuItem asChild className="gap-2">
                                                            <Link href={`/superadmin/classes/${cls.id}`}>
                                                                <EyeIcon className="size-3.5" /> View
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild className="gap-2">
                                                            <Link href={`/superadmin/classes/${cls.id}/edit`}>
                                                                <PencilIcon className="size-3.5" /> Edit
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive gap-2 focus:text-destructive"
                                                            onSelect={() => setDeleteTarget(cls)}
                                                        >
                                                            <Trash2Icon className="size-3.5" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Pagination ──────────────────────────────────────── */}
                    <div className="bg-muted/20 flex items-center justify-between border-t px-4 py-3">
                        <p className="text-muted-foreground text-xs">
                            {filtered.length === 0
                                ? 'No results'
                                : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}`}
                        </p>
                        <div className="flex items-center gap-1">
                            <button onClick={() => goTo(1)} disabled={safePage === 1} className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30" title="First page">
                                <ChevronsLeftIcon className="size-4" />
                            </button>
                            <button onClick={() => goTo(safePage - 1)} disabled={safePage === 1} className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30" title="Previous">
                                <ChevronLeftIcon className="size-4" />
                            </button>
                            <div className="flex items-center gap-1 px-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                                    .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                                        acc.push(p);
                                        return acc;
                                    }, [])
                                    .map((p, i) =>
                                        p === 'ellipsis' ? (
                                            <span key={`e${i}`} className="text-muted-foreground px-1 text-xs">…</span>
                                        ) : (
                                            <button
                                                key={p}
                                                onClick={() => goTo(p as number)}
                                                className={`min-w-[28px] rounded px-2 py-1 text-xs font-medium transition-colors ${safePage === p ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                                            >
                                                {p}
                                            </button>
                                        ),
                                    )}
                            </div>
                            <button onClick={() => goTo(safePage + 1)} disabled={safePage === totalPages} className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30" title="Next">
                                <ChevronRightIcon className="size-4" />
                            </button>
                            <button onClick={() => goTo(totalPages)} disabled={safePage === totalPages} className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30" title="Last page">
                                <ChevronsRightIcon className="size-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Delete Confirmation Dialog ───────────────────────────────── */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <DialogContent>
                    <DialogTitle>Delete Class</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <span className="text-foreground font-medium">"{deleteTarget?.name}"</span>?
                        This action cannot be undone.
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

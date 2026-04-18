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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [5, 10, 20];

const TYPE_CONFIG = {
    'chapter-wise': { label: 'Chapter-wise', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    'topic-wise':   { label: 'Topic-wise',   className: 'bg-violet-100 text-violet-700 border-violet-200' },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Subjects({ subjects }: { subjects: Subject[] }) {
    const [search, setSearch]             = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter]     = useState('all');
    const [pageSize, setPageSize]         = useState(10);
    const [page, setPage]                 = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
    const [deleting, setDeleting]         = useState(false);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return subjects.filter((s) => {
            const matchesSearch =
                !q ||
                s.name_eng.toLowerCase().includes(q) ||
                (s.name_ur ?? '').toLowerCase().includes(q);
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && s.status === 1) ||
                (statusFilter === 'inactive' && s.status === 0);
            const matchesType = typeFilter === 'all' || s.subject_type === typeFilter;
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [subjects, search, statusFilter, typeFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage   = Math.min(page, totalPages);
    const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

    const confirmDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        router.delete(`/superadmin/subjects/${deleteTarget.id}`, {
            onFinish: () => { setDeleting(false); setDeleteTarget(null); },
        });
    };

    return (
        <>
            <Head title="Subjects" />
            <div className="space-y-5 p-4 md:p-6">

                {/* ── Page Header ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="h1-semibold">Subjects</h1>
                        <p className="text-muted-foreground mt-0.5 text-sm">{filtered.length} total</p>
                    </div>
                    <Link
                        href="/superadmin/subjects/add"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors"
                    >
                        <PlusIcon size={16} color="currentColor" />
                        <span className="hidden sm:inline">Add Subject</span>
                    </Link>
                </div>

                {/* ── Filters ─────────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[200px] flex-1">
                        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            placeholder="Search subjects…"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="pl-9"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                            <SelectTrigger className="w-36">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All types</SelectItem>
                                <SelectItem value="chapter-wise">Chapter-wise</SelectItem>
                                <SelectItem value="topic-wise">Topic-wise</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                            <SelectTrigger className="w-36">
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
                                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">Subject</th>
                                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">Type</th>
                                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">Linked to</th>
                                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">Status</th>
                                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">Created</th>
                                    <th className="text-muted-foreground w-16 px-4 py-3 text-center font-medium"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-muted-foreground py-16 text-center">
                                            <SearchIcon className="mx-auto mb-2 size-8 opacity-30" />
                                            No subjects found
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((subject, idx) => {
                                        const typeCfg = TYPE_CONFIG[subject.subject_type];
                                        return (
                                            <tr
                                                key={subject.id}
                                                className={`transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-accent/50`}
                                            >
                                                <td className="px-4 py-3">
                                                    <p className="font-medium">{subject.name_eng}</p>
                                                    {subject.name_ur && (
                                                        <p className="text-muted-foreground text-xs" dir="rtl">{subject.name_ur}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className={`${typeCfg.className} font-medium`}>
                                                        {typeCfg.label}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {subject.class_subjects.length === 0 ? (
                                                        <span className="text-muted-foreground italic">—</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1">
                                                            {subject.class_subjects.map((cs, i) => (
                                                                <span
                                                                    key={i}
                                                                    className="bg-muted border text-muted-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
                                                                >
                                                                    <span className="font-medium text-foreground">{cs.school_class?.name}</span>
                                                                    <span className="opacity-50">·</span>
                                                                    <span>{cs.pattern?.short_name ?? cs.pattern?.name}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {subject.status === 1 ? (
                                                        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 font-medium">
                                                            <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200 font-medium">
                                                            <span className="mr-1 inline-block size-1.5 rounded-full bg-gray-400" />
                                                            Inactive
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="text-muted-foreground px-4 py-3 tabular-nums">
                                                    {new Date(subject.created_at).toLocaleDateString('en-US', {
                                                        month: 'short', day: 'numeric', year: 'numeric',
                                                    })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Link href={`/superadmin/subjects/${subject.id}`} className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-1.5 transition-colors">
                                                            <EyeIcon className="size-4" />
                                                        </Link>
                                                        <Link href={`/superadmin/subjects/${subject.id}/edit`} className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-1.5 transition-colors">
                                                            <PencilIcon className="size-4" />
                                                        </Link>
                                                        <button onClick={() => setDeleteTarget(subject)} className="text-destructive hover:bg-destructive/10 rounded-md p-1.5 transition-colors">
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

                    {/* ── Pagination ──────────────────────────────────────── */}
                    <div className="bg-muted/20 flex items-center justify-between border-t px-4 py-3">
                        <p className="text-muted-foreground text-xs">
                            {filtered.length === 0
                                ? 'No results'
                                : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}`}
                        </p>
                        <div className="flex items-center gap-1">
                            <button onClick={() => goTo(1)} disabled={safePage === 1} className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30"><ChevronsLeftIcon className="size-4" /></button>
                            <button onClick={() => goTo(safePage - 1)} disabled={safePage === 1} className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30"><ChevronLeftIcon className="size-4" /></button>
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
                                            <button key={p} onClick={() => goTo(p as number)} className={`min-w-[28px] rounded px-2 py-1 text-xs font-medium transition-colors ${safePage === p ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>{p}</button>
                                        ),
                                    )}
                            </div>
                            <button onClick={() => goTo(safePage + 1)} disabled={safePage === totalPages} className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30"><ChevronRightIcon className="size-4" /></button>
                            <button onClick={() => goTo(totalPages)} disabled={safePage === totalPages} className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30"><ChevronsRightIcon className="size-4" /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Delete Dialog ────────────────────────────────────────────── */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <DialogContent>
                    <DialogTitle>Delete Subject</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <span className="text-foreground font-medium">"{deleteTarget?.name_eng}"</span>?
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

Subjects.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Subjects', href: '/superadmin/subjects' },
    ],
};

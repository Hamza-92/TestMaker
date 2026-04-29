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
import { useEffect, useMemo, useState } from 'react';
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

interface QuestionType {
    id: number;
    name: string;
    name_ur: string | null;
    heading_en: string;
    heading_ur: string | null;
    description_en: string | null;
    description_ur: string | null;
    have_answer: boolean;
    is_single: boolean;
    is_objective: boolean;
    schema_key: string;
    schema: {
        key: string;
        kind: 'objective' | 'subjective';
        label: string;
        description: string;
        settings: {
            supports_answer_toggle: boolean;
            supports_single_toggle: boolean;
        };
    };
    status: number;
    created_at: string | null;
    questions_count: number;
    objective_children_count: number;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function StatusBadge({ status }: { status: number }) {
    return status === 1 ? (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-100 font-medium text-emerald-700">
            <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />
            Active
        </Badge>
    ) : (
        <Badge variant="outline" className="border-gray-200 bg-gray-100 font-medium text-gray-600">
            <span className="mr-1 inline-block size-1.5 rounded-full bg-gray-400" />
            Inactive
        </Badge>
    );
}

function KindBadge({ isObjective }: { isObjective: boolean }) {
    return isObjective ? (
        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-normal text-[11px] px-1.5 py-0">
            Obj
        </Badge>
    ) : (
        <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700 font-normal text-[11px] px-1.5 py-0">
            Subj
        </Badge>
    );
}

function TraitPill({ label, active }: { label: string; active: boolean }) {
    if (!active) return null;
    return (
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0 text-[11px] font-normal text-amber-700">
            {label}
        </span>
    );
}

const PAGE_TITLES: Record<string, string> = {
    all: 'Question Types',
    objective: 'Objective Question Types',
    subjective: 'Subjective Question Types',
};

export default function QuestionTypes({
    questionTypes,
    initialKind = 'all',
}: {
    questionTypes: QuestionType[];
    initialKind?: string;
}) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [answerFilter, setAnswerFilter] = useState('all');
    const [schemaFilter, setSchemaFilter] = useState('all');
    const [kindFilter, setKindFilter] = useState(initialKind);
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<QuestionType | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        setKindFilter(initialKind);
        setPage(1);
    }, [initialKind]);

    const schemaOptions = useMemo(() => {
        const seen = new Map<string, string>();
        questionTypes.forEach((qt) => {
            if (!seen.has(qt.schema_key)) seen.set(qt.schema_key, qt.schema.label);
        });
        return Array.from(seen.entries()).map(([key, label]) => ({ key, label }));
    }, [questionTypes]);

    const filtered = useMemo(() => {
        const query = search.toLowerCase().trim();

        return questionTypes.filter((qt) => {
            if (
                query !== '' &&
                !qt.name.toLowerCase().includes(query) &&
                !(qt.name_ur ?? '').toLowerCase().includes(query) &&
                !qt.heading_en.toLowerCase().includes(query) &&
                !qt.schema.label.toLowerCase().includes(query)
            ) return false;

            if (kindFilter !== 'all') {
                if (kindFilter === 'objective' && !qt.is_objective) return false;
                if (kindFilter === 'subjective' && qt.is_objective) return false;
            }

            if (statusFilter === 'active' && qt.status !== 1) return false;
            if (statusFilter === 'inactive' && qt.status !== 0) return false;

            if (answerFilter === 'yes' && !qt.have_answer) return false;
            if (answerFilter === 'no' && qt.have_answer) return false;

            if (schemaFilter !== 'all' && qt.schema_key !== schemaFilter) return false;

            return true;
        });
    }, [questionTypes, search, kindFilter, statusFilter, answerFilter, schemaFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
    const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

    const resetPage = () => setPage(1);

    const confirmDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        router.delete(`/superadmin/question-types/${deleteTarget.id}`, {
            onFinish: () => { setDeleting(false); setDeleteTarget(null); },
        });
    };

    const pageTitle = PAGE_TITLES[initialKind] ?? 'Question Types';
    const showKindColumn = initialKind === 'all';

    return (
        <>
            <Head title={pageTitle} />

            <div className="space-y-5 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="h1-semibold">{pageTitle}</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">{filtered.length} total</p>
                    </div>
                    <Link
                        href="/superadmin/question-types/add"
                        className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                        <PlusIcon size={16} color="currentColor" />
                        <span className="hidden sm:inline">Add Question Type</span>
                    </Link>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-50 flex-1">
                        <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search name, heading, schema…"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                            className="pl-9"
                        />
                    </div>

                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); resetPage(); }}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={answerFilter} onValueChange={(v) => { setAnswerFilter(v); resetPage(); }}>
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="Answer" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Any answer</SelectItem>
                            <SelectItem value="yes">Has answer</SelectItem>
                            <SelectItem value="no">No answer</SelectItem>
                        </SelectContent>
                    </Select>

                    {schemaOptions.length > 1 && (
                        <Select value={schemaFilter} onValueChange={(v) => { setSchemaFilter(v); resetPage(); }}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="Schema" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All schemas</SelectItem>
                                {schemaOptions.map((s) => (
                                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); resetPage(); }}>
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

                {/* Table */}
                <div className="overflow-hidden rounded-xl border shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Heading</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Schema</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Questions</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                                    <th className="w-24 px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-muted-foreground">
                                            <SearchIcon className="mx-auto mb-2 size-8 opacity-30" />
                                            No question types found
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((qt, i) => (
                                        <tr
                                            key={qt.id}
                                            className={`transition-colors ${i % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-accent/50`}
                                        >
                                            {/* Name */}
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="font-medium">{qt.name}</span>
                                                    {showKindColumn && <KindBadge isObjective={qt.is_objective} />}
                                                </div>
                                                {qt.name_ur && (
                                                    <p className="mt-0.5 text-xs text-muted-foreground" dir="rtl">{qt.name_ur}</p>
                                                )}
                                            </td>

                                            {/* Heading */}
                                            <td className="px-4 py-3 max-w-50">
                                                <p className="truncate font-medium">{qt.heading_en}</p>
                                                {qt.heading_ur && (
                                                    <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="rtl">{qt.heading_ur}</p>
                                                )}
                                            </td>

                                            {/* Schema + traits */}
                                            <td className="px-4 py-3">
                                                <p className="text-sm">{qt.schema.label}</p>
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    <TraitPill label="Answer" active={qt.have_answer} />
                                                    <TraitPill label="Single" active={qt.is_single} />
                                                </div>
                                            </td>

                                            {/* Questions */}
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                <span className="font-medium">{qt.questions_count.toLocaleString()}</span>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <StatusBadge status={qt.status} />
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={
                                                            initialKind === 'all'
                                                                ? `/superadmin/question-types/${qt.id}`
                                                                : `/superadmin/question-types/${initialKind}/${qt.id}`
                                                        }
                                                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                        title="View"
                                                    >
                                                        <EyeIcon className="size-4" />
                                                    </Link>
                                                    <Link
                                                        href={`/superadmin/question-types/${qt.id}/edit`}
                                                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                        title="Edit"
                                                    >
                                                        <PencilIcon className="size-4" />
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeleteTarget(qt)}
                                                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                                        title="Delete"
                                                    >
                                                        <Trash2Icon className="size-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination footer */}
                    <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm text-muted-foreground">
                            {filtered.length === 0
                                ? 'No results'
                                : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}`}
                        </p>
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={() => goTo(1)} disabled={safePage === 1} className="rounded-lg p-2 transition-colors hover:bg-accent disabled:opacity-40">
                                <ChevronsLeftIcon className="size-4" />
                            </button>
                            <button type="button" onClick={() => goTo(safePage - 1)} disabled={safePage === 1} className="rounded-lg p-2 transition-colors hover:bg-accent disabled:opacity-40">
                                <ChevronLeftIcon className="size-4" />
                            </button>
                            <span className="px-2 text-sm text-muted-foreground">
                                {safePage} / {totalPages}
                            </span>
                            <button type="button" onClick={() => goTo(safePage + 1)} disabled={safePage === totalPages} className="rounded-lg p-2 transition-colors hover:bg-accent disabled:opacity-40">
                                <ChevronRightIcon className="size-4" />
                            </button>
                            <button type="button" onClick={() => goTo(totalPages)} disabled={safePage === totalPages} className="rounded-lg p-2 transition-colors hover:bg-accent disabled:opacity-40">
                                <ChevronsRightIcon className="size-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogTitle>Delete Question Type</DialogTitle>
                    <DialogDescription>
                        Delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This cannot be undone.
                    </DialogDescription>
                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => setDeleteTarget(null)}
                            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={confirmDelete}
                            disabled={deleting}
                            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
                        >
                            {deleting ? 'Deleting…' : 'Delete'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

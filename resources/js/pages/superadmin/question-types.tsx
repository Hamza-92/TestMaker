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

const PAGE_SIZE_OPTIONS = [5, 10, 20];

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

export default function QuestionTypes({
    questionTypes,
}: {
    questionTypes: QuestionType[];
}) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [kindFilter, setKindFilter] = useState('all');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<QuestionType | null>(null);
    const [deleting, setDeleting] = useState(false);

    const filtered = useMemo(() => {
        const query = search.toLowerCase().trim();

        return questionTypes.filter((questionType) => {
            const matchesSearch =
                query === '' ||
                questionType.name.toLowerCase().includes(query) ||
                (questionType.name_ur ?? '').toLowerCase().includes(query) ||
                questionType.heading_en.toLowerCase().includes(query) ||
                questionType.schema.label.toLowerCase().includes(query);

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && questionType.status === 1) ||
                (statusFilter === 'inactive' && questionType.status === 0);

            const matchesKind =
                kindFilter === 'all' ||
                (kindFilter === 'objective' && questionType.is_objective) ||
                (kindFilter === 'subjective' && !questionType.is_objective);

            return matchesSearch && matchesStatus && matchesKind;
        });
    }, [kindFilter, questionTypes, search, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize,
    );

    const goTo = (targetPage: number) =>
        setPage(Math.min(Math.max(1, targetPage), totalPages));

    const confirmDelete = () => {
        if (!deleteTarget) {
            return;
        }

        setDeleting(true);
        router.delete(`/superadmin/question-types/${deleteTarget.id}`, {
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    return (
        <>
            <Head title="Question Types" />

            <div className="space-y-5 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="h1-semibold">Question Types</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {filtered.length} total
                        </p>
                    </div>
                    <Link
                        href="/superadmin/question-types/add"
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                        <PlusIcon size={16} color="currentColor" />
                        <span className="hidden sm:inline">
                            Add Question Type
                        </span>
                    </Link>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[220px] flex-1">
                        <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search question types..."
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            className="pl-9"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select
                            value={kindFilter}
                            onValueChange={(value) => {
                                setKindFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-36">
                                <SelectValue placeholder="Kind" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All kinds</SelectItem>
                                <SelectItem value="objective">
                                    Objective
                                </SelectItem>
                                <SelectItem value="subjective">
                                    Subjective
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={statusFilter}
                            onValueChange={(value) => {
                                setStatusFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-36">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All statuses
                                </SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">
                                    Inactive
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={String(pageSize)}
                            onValueChange={(value) => {
                                setPageSize(Number(value));
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-20">
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

                <div className="overflow-hidden rounded-xl border shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Type
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Heading
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Structure
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Questions
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
                                            colSpan={6}
                                            className="py-16 text-center text-muted-foreground"
                                        >
                                            <SearchIcon className="mx-auto mb-2 size-8 opacity-30" />
                                            No question types found
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((questionType, index) => (
                                        <tr
                                            key={questionType.id}
                                            className={`transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-accent/50`}
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-medium">
                                                    {questionType.name}
                                                </p>
                                                {questionType.name_ur ? (
                                                    <p
                                                        className="text-xs text-muted-foreground"
                                                        dir="rtl"
                                                    >
                                                        {questionType.name_ur}
                                                    </p>
                                                ) : null}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium">
                                                    {questionType.heading_en}
                                                </p>
                                                {questionType.heading_ur ? (
                                                    <p
                                                        className="text-xs text-muted-foreground"
                                                        dir="rtl"
                                                    >
                                                        {questionType.heading_ur}
                                                    </p>
                                                ) : null}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium">
                                                    {questionType.is_objective
                                                        ? 'Objective'
                                                        : 'Subjective'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {questionType.schema.label}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium">
                                                    {questionType.questions_count}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                {statusBadge(
                                                    questionType.status,
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={`/superadmin/question-types/${questionType.id}`}
                                                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                    >
                                                        <EyeIcon className="size-4" />
                                                    </Link>
                                                    <Link
                                                        href={`/superadmin/question-types/${questionType.id}/edit`}
                                                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                    >
                                                        <PencilIcon className="size-4" />
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeleteTarget(
                                                                questionType,
                                                            )
                                                        }
                                                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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

                    <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm text-muted-foreground">
                            Showing{' '}
                            {filtered.length === 0
                                ? 0
                                : (safePage - 1) * pageSize + 1}
                            -
                            {Math.min(safePage * pageSize, filtered.length)} of{' '}
                            {filtered.length}
                        </p>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => goTo(1)}
                                disabled={safePage === 1}
                                className="rounded-lg p-2 transition-colors hover:bg-accent disabled:opacity-40"
                            >
                                <ChevronsLeftIcon className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => goTo(safePage - 1)}
                                disabled={safePage === 1}
                                className="rounded-lg p-2 transition-colors hover:bg-accent disabled:opacity-40"
                            >
                                <ChevronLeftIcon className="size-4" />
                            </button>
                            <span className="px-2 text-sm text-muted-foreground">
                                Page {safePage} of {totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => goTo(safePage + 1)}
                                disabled={safePage === totalPages}
                                className="rounded-lg p-2 transition-colors hover:bg-accent disabled:opacity-40"
                            >
                                <ChevronRightIcon className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => goTo(totalPages)}
                                disabled={safePage === totalPages}
                                className="rounded-lg p-2 transition-colors hover:bg-accent disabled:opacity-40"
                            >
                                <ChevronsRightIcon className="size-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogTitle>Delete Question Type</DialogTitle>
                    <DialogDescription>
                        Delete{' '}
                        <span className="font-medium text-foreground">
                            {deleteTarget?.name}
                        </span>
                        ? This cannot be undone.
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
                            {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

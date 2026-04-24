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
    have_exercise: boolean;
    have_statement: boolean;
    have_description: boolean;
    have_answer: boolean;
    is_single: boolean;
    is_objective: boolean;
    column_per_row: number;
    status: number;
    created_at: string | null;
    questions_count: number;
    objective_children_count: number;
    objective_type: { id: number; name: string } | null;
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

function enabledBlocks(questionType: QuestionType) {
    return [
        questionType.have_exercise ? 'Exercise' : null,
        questionType.have_statement ? 'Statement' : null,
        questionType.have_description ? 'Description' : null,
        questionType.have_answer ? 'Answer' : null,
    ].filter(Boolean) as string[];
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
        const query = search.toLowerCase();

        return questionTypes.filter((questionType) => {
            const matchesSearch =
                !query ||
                questionType.name.toLowerCase().includes(query) ||
                (questionType.name_ur ?? '').toLowerCase().includes(query) ||
                questionType.heading_en.toLowerCase().includes(query);

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
                                        Format
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Blocks
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Usage
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
                                            colSpan={7}
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
                                                {questionType.name_ur && (
                                                    <p
                                                        className="text-xs text-muted-foreground"
                                                        dir="rtl"
                                                    >
                                                        {questionType.name_ur}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium">
                                                    {questionType.heading_en}
                                                </p>
                                                {questionType.objective_type && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {
                                                            questionType
                                                                .objective_type
                                                                .name
                                                        }
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-muted font-medium"
                                                    >
                                                        {questionType.is_objective
                                                            ? 'Objective'
                                                            : 'Subjective'}
                                                    </Badge>
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-muted font-medium"
                                                    >
                                                        {questionType.is_single
                                                            ? 'Single'
                                                            : 'Multi'}
                                                    </Badge>
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-muted font-medium"
                                                    >
                                                        {
                                                            questionType.column_per_row
                                                        }{' '}
                                                        / row
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {enabledBlocks(
                                                        questionType,
                                                    ).map((block) => (
                                                        <span
                                                            key={block}
                                                            className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                                                        >
                                                            {block}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="space-y-1 text-xs text-muted-foreground">
                                                    <p>
                                                        <span className="font-medium text-foreground">
                                                            {
                                                                questionType.questions_count
                                                            }
                                                        </span>{' '}
                                                        questions
                                                    </p>
                                                    {questionType.objective_children_count >
                                                        0 && (
                                                        <p>
                                                            <span className="font-medium text-foreground">
                                                                {
                                                                    questionType.objective_children_count
                                                                }
                                                            </span>{' '}
                                                            linked types
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {statusBadge(
                                                    questionType.status,
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Link
                                                        href={`/superadmin/question-types/${questionType.id}`}
                                                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                    >
                                                        <EyeIcon className="size-4" />
                                                    </Link>
                                                    <Link
                                                        href={`/superadmin/question-types/${questionType.id}/edit`}
                                                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
                                                        disabled={
                                                            questionType.questions_count >
                                                                0 ||
                                                            questionType.objective_children_count >
                                                                0
                                                        }
                                                        title={
                                                            questionType.questions_count >
                                                                0
                                                                ? 'Remove linked questions first'
                                                                : questionType.objective_children_count >
                                                                    0
                                                                  ? 'Remove linked objective types first'
                                                                : 'Delete'
                                                        }
                                                        className="rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-35"
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

                    <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
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
                                className="rounded p-1.5 transition-colors hover:bg-accent disabled:opacity-30"
                            >
                                <ChevronsLeftIcon className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => goTo(safePage - 1)}
                                disabled={safePage === 1}
                                className="rounded p-1.5 transition-colors hover:bg-accent disabled:opacity-30"
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
                                className="rounded p-1.5 transition-colors hover:bg-accent disabled:opacity-30"
                            >
                                <ChevronRightIcon className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => goTo(totalPages)}
                                disabled={safePage === totalPages}
                                className="rounded p-1.5 transition-colors hover:bg-accent disabled:opacity-30"
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
                    <DialogTitle>Delete Question Type</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete{' '}
                        <span className="font-medium text-foreground">
                            "{deleteTarget?.name}"
                        </span>
                        ?
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
                            {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

QuestionTypes.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Question Types', href: '/superadmin/question-types' },
    ],
};

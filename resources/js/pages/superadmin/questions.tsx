import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
    EyeIcon,
    FileUpIcon,
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
import type { ChapterOption, QuestionTypeOption } from './questions/form';

interface QuestionRow {
    id: number;
    summary_text: string;
    source: string | null;
    source_label?: string | null;
    status: number;
    created_at: string | null;
    question_type: QuestionTypeOption;
    chapter: {
        id: number;
        name: string;
        name_ur: string | null;
        chapter_number: number | null;
        subject: {
            id: number;
            name_eng: string;
            name_ur: string | null;
            subject_type: 'chapter-wise' | 'topic-wise';
        };
        class: {
            id: number;
            name: string;
        };
        pattern: {
            id: number;
            name: string;
            short_name: string | null;
        };
    };
    topic: {
        id: number;
        name: string;
        name_ur: string | null;
    } | null;
    options_count: number;
    correct_options_count: number;
    items_count: number;
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

function truncateText(value: string, maxLength = 84) {
    return value.length > maxLength
        ? `${value.slice(0, maxLength - 1)}...`
        : value;
}

function chapterLabel(chapter: QuestionRow['chapter']) {
    const chapterPart = chapter.chapter_number
        ? `Ch ${chapter.chapter_number}`
        : chapter.name;

    return [
        chapter.subject.name_eng,
        chapterPart,
        chapter.class.name,
        chapter.pattern.short_name ?? chapter.pattern.name,
    ].join(' / ');
}

export default function Questions({
    questions,
    questionTypes,
    chapters,
}: {
    questions: QuestionRow[];
    questionTypes: QuestionTypeOption[];
    chapters: ChapterOption[];
}) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [kindFilter, setKindFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [chapterFilter, setChapterFilter] = useState('all');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<QuestionRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();

        return questions.filter((question) => {
            const matchesSearch =
                query === '' ||
                question.question_type.name.toLowerCase().includes(query) ||
                question.question_type.schema.label
                    .toLowerCase()
                    .includes(query) ||
                (question.topic?.name ?? '').toLowerCase().includes(query) ||
                question.chapter.subject.name_eng
                    .toLowerCase()
                    .includes(query) ||
                question.chapter.name.toLowerCase().includes(query) ||
                (question.source ?? '').toLowerCase().includes(query) ||
                question.summary_text.toLowerCase().includes(query);

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && question.status === 1) ||
                (statusFilter === 'inactive' && question.status === 0);

            const matchesKind =
                kindFilter === 'all' ||
                (kindFilter === 'objective' &&
                    question.question_type.is_objective) ||
                (kindFilter === 'subjective' &&
                    !question.question_type.is_objective);

            const matchesType =
                typeFilter === 'all' ||
                String(question.question_type.id) === typeFilter;

            const matchesChapter =
                chapterFilter === 'all' ||
                String(question.chapter.id) === chapterFilter;

            return (
                matchesSearch &&
                matchesStatus &&
                matchesKind &&
                matchesType &&
                matchesChapter
            );
        });
    }, [
        chapterFilter,
        kindFilter,
        questions,
        search,
        statusFilter,
        typeFilter,
    ]);

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
        router.delete(`/superadmin/questions/${deleteTarget.id}`, {
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    return (
        <>
            <Head title="Questions" />

            <div className="space-y-5 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="h1-semibold">Questions</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {filtered.length} total
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/superadmin/questions/import"
                            className="flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                        >
                            <FileUpIcon className="size-4" />
                            <span className="hidden sm:inline">
                                Bulk Import
                            </span>
                        </Link>
                        <Link
                            href="/superadmin/questions/add"
                            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                        >
                            <PlusIcon size={16} color="currentColor" />
                            <span className="hidden sm:inline">
                                Add Question
                            </span>
                        </Link>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[240px] flex-1">
                        <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search questions..."
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
                            value={typeFilter}
                            onValueChange={(value) => {
                                setTypeFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All types</SelectItem>
                                {questionTypes.map((item) => (
                                    <SelectItem
                                        key={item.id}
                                        value={String(item.id)}
                                    >
                                        {item.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={chapterFilter}
                            onValueChange={(value) => {
                                setChapterFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-52">
                                <SelectValue placeholder="Chapter" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All chapters
                                </SelectItem>
                                {chapters.map((chapter) => (
                                    <SelectItem
                                        key={chapter.id}
                                        value={String(chapter.id)}
                                    >
                                        {chapterLabel({
                                            id: chapter.id,
                                            name: chapter.name,
                                            name_ur: chapter.name_ur,
                                            chapter_number:
                                                chapter.chapter_number,
                                            subject: chapter.subject,
                                            class: chapter.class,
                                            pattern: chapter.pattern,
                                        } as QuestionRow['chapter'])}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

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
                                        Question
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Type
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Chapter
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Source
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Created
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
                                            No questions found
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((question, index) => (
                                        <tr
                                            key={question.id}
                                            className={`transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-accent/50`}
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-medium">
                                                    {truncateText(
                                                        question.summary_text,
                                                    )}
                                                </p>
                                                <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                                                    {question.question_type
                                                        .is_objective ? (
                                                        <span>
                                                            {
                                                                question.correct_options_count
                                                            }{' '}
                                                            /{' '}
                                                            {
                                                                question.options_count
                                                            }{' '}
                                                            correct
                                                        </span>
                                                    ) : null}
                                                    {question.items_count > 1 ? (
                                                        <span>
                                                            {question.items_count}{' '}
                                                            items
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-muted font-medium"
                                                    >
                                                        {
                                                            question
                                                                .question_type
                                                                .name
                                                        }
                                                    </Badge>
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-muted"
                                                    >
                                                        {
                                                            question
                                                                .question_type
                                                                .schema.label
                                                        }
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium">
                                                    {chapterLabel(
                                                        question.chapter,
                                                    )}
                                                </p>
                                                {question.topic ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        {question.topic.name}
                                                    </p>
                                                ) : null}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {question.source_label ||
                                                    question.source ||
                                                    '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {statusBadge(question.status)}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground tabular-nums">
                                                {question.created_at
                                                    ? new Date(
                                                          question.created_at,
                                                      ).toLocaleDateString(
                                                          'en-US',
                                                          {
                                                              month: 'short',
                                                              day: 'numeric',
                                                              year: 'numeric',
                                                          },
                                                      )
                                                    : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Link
                                                        href={`/superadmin/questions/${question.id}`}
                                                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                    >
                                                        <EyeIcon className="size-4" />
                                                    </Link>
                                                    <Link
                                                        href={`/superadmin/questions/${question.id}/edit`}
                                                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                    >
                                                        <PencilIcon className="size-4" />
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeleteTarget(
                                                                question,
                                                            )
                                                        }
                                                        className="rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10"
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
                    <DialogTitle>Delete Question</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete question #
                        {deleteTarget?.id}?
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

Questions.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Questions', href: '/superadmin/questions' },
    ],
};

import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
    EyeIcon,
    FileUpIcon,
    PencilIcon,
    PlusIcon,
    SearchIcon,
    Trash2Icon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import type { QuestionTypeOption, SourceOption } from './form';

interface TopicContext {
    id: number;
    name: string;
    name_ur: string | null;
    status: number;
    questions_count: number;
}

interface ChapterContext {
    id: number;
    name: string;
    name_ur: string | null;
    chapter_number: number | null;
    status: number;
    questions_count: number;
    subject: {
        id: number;
        name_eng: string;
        name_ur: string | null;
        subject_type: 'chapter-wise' | 'topic-wise';
        status: number;
    };
    class: {
        id: number;
        name: string;
        status: number;
    };
    pattern: {
        id: number;
        name: string;
        short_name: string | null;
        status: number;
    };
    topics: TopicContext[];
}

interface QuestionRow {
    id: number;
    summary_text: string;
    source: string | null;
    source_label?: string | null;
    status: number;
    created_at: string | null;
    question_type: QuestionTypeOption;
    topic: {
        id: number;
        name: string;
        name_ur: string | null;
    } | null;
    options_count: number;
    correct_options_count: number;
    items_count: number;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const BLANK_SOURCE_VALUE = '__blank__';

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

function truncateText(value: string, maxLength = 96) {
    return value.length > maxLength
        ? `${value.slice(0, maxLength - 1)}...`
        : value;
}

function sourceFilterValue(question: QuestionRow) {
    return question.source && question.source.length > 0
        ? question.source
        : BLANK_SOURCE_VALUE;
}

function chapterTitle(chapter: ChapterContext) {
    return chapter.chapter_number
        ? `Ch ${chapter.chapter_number} - ${chapter.name}`
        : chapter.name;
}

function patternLabel(pattern: ChapterContext['pattern']) {
    return pattern.short_name
        ? `${pattern.short_name} / ${pattern.name}`
        : pattern.name;
}

interface ScopedTopic {
    id: number;
    name: string;
    name_ur: string | null;
}

export default function ChapterQuestions({
    chapter,
    questions,
    questionTypes,
    sourceOptions,
    scopedTopic = null,
}: {
    chapter: ChapterContext;
    questions: QuestionRow[];
    questionTypes: QuestionTypeOption[];
    sourceOptions: SourceOption[];
    scopedTopic?: ScopedTopic | null;
}) {
    const [search, setSearch] = useState('');
    const [topicFilter, setTopicFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [pageSize, setPageSize] = useState(20);
    const [page, setPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<QuestionRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    const baseHref = `/superadmin/subjects/${chapter.subject.id}/chapters/${chapter.id}/questions`;
    const topicBase = scopedTopic
        ? `/superadmin/subjects/${chapter.subject.id}/chapters/${chapter.id}/topics/${scopedTopic.id}/questions`
        : null;
    const addHref = topicBase ? `${topicBase}/add` : `${baseHref}/add`;
    const importHref = scopedTopic
        ? `${baseHref}/import?topic_id=${scopedTopic.id}`
        : `${baseHref}/import`;
    const isTopicWise = chapter.subject.subject_type === 'topic-wise';

    const typeOptions = useMemo(() => {
        const availableIds = new Set(
            questions.map((question) => question.question_type.id),
        );

        return questionTypes.filter((type) => availableIds.has(type.id));
    }, [questionTypes, questions]);

    const sourceFilterOptions = useMemo(() => {
        const values = new Set(questions.map(sourceFilterValue));

        return [
            ...sourceOptions.filter((source) => values.has(source.value)),
            ...(values.has(BLANK_SOURCE_VALUE)
                ? [{ value: BLANK_SOURCE_VALUE, label: 'No source' }]
                : []),
        ];
    }, [questions, sourceOptions]);

    const filtered = useMemo(() => {
        const normalized = search.trim().toLowerCase();

        return questions.filter((question) => {
            const matchesSearch =
                normalized === '' ||
                question.summary_text.toLowerCase().includes(normalized) ||
                question.question_type.name
                    .toLowerCase()
                    .includes(normalized) ||
                (question.topic?.name ?? '')
                    .toLowerCase()
                    .includes(normalized) ||
                (question.source_label ?? question.source ?? '')
                    .toLowerCase()
                    .includes(normalized);

            const matchesTopic =
                topicFilter === 'all' ||
                String(question.topic?.id ?? '') === topicFilter;

            const matchesType =
                typeFilter === 'all' ||
                String(question.question_type.id) === typeFilter;

            const matchesSource =
                sourceFilter === 'all' ||
                sourceFilterValue(question) === sourceFilter;

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && question.status === 1) ||
                (statusFilter === 'inactive' && question.status === 0);

            return (
                matchesSearch &&
                matchesTopic &&
                matchesType &&
                matchesSource &&
                matchesStatus
            );
        });
    }, [
        questions,
        search,
        sourceFilter,
        statusFilter,
        topicFilter,
        typeFilter,
    ]);

    const hasActiveFilters =
        search.trim() !== '' ||
        (!scopedTopic && topicFilter !== 'all') ||
        typeFilter !== 'all' ||
        sourceFilter !== 'all' ||
        statusFilter !== 'all';

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize,
    );

    const clearFilters = () => {
        setSearch('');
        setTopicFilter('all');
        setTypeFilter('all');
        setSourceFilter('all');
        setStatusFilter('all');
        setPage(1);
    };

    const goTo = (targetPage: number) =>
        setPage(Math.min(Math.max(1, targetPage), totalPages));

    const confirmDelete = () => {
        if (!deleteTarget) {
            return;
        }

        setDeleting(true);
        router.delete(`/superadmin/questions/${deleteTarget.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    return (
        <>
            <Head title={`${chapterTitle(chapter)} Questions`} />

            <div className="space-y-4 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link
                            href={`/superadmin/subjects/${chapter.subject.id}`}
                            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-input transition-colors hover:bg-accent"
                        >
                            <ArrowLeftIcon className="size-4" />
                        </Link>
                        <div className="min-w-0">
                            <h1 className="truncate text-lg font-semibold">
                                {scopedTopic ? scopedTopic.name : chapterTitle(chapter)}
                            </h1>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                <Badge variant="outline" className="bg-muted">
                                    {chapter.subject.name_eng}
                                </Badge>
                                <Badge variant="outline" className="bg-muted">
                                    {chapter.class.name}
                                </Badge>
                                <Badge variant="outline" className="bg-muted">
                                    {patternLabel(chapter.pattern)}
                                </Badge>
                                {scopedTopic ? (
                                    <Badge variant="outline" className="bg-muted">
                                        {chapterTitle(chapter)}
                                    </Badge>
                                ) : null}
                                <Badge variant="outline" className="bg-muted">
                                    {questions.length} question{questions.length !== 1 ? 's' : ''}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href={importHref}>
                                <FileUpIcon className="size-4" />
                                Import
                            </Link>
                        </Button>
                        <Button asChild size="sm">
                            <Link href={addHref}>
                                <PlusIcon className="size-4" />
                                Add
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="rounded-lg border p-3">
                    <div className={`grid gap-2 md:grid-cols-2 ${isTopicWise && !scopedTopic ? 'xl:grid-cols-[minmax(220px,1fr)_10rem_11rem_10rem_8rem_auto_auto]' : 'xl:grid-cols-[minmax(220px,1fr)_11rem_10rem_8rem_auto_auto]'}`}>
                        <div className="relative min-w-0">
                            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search questions"
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                                className="h-9 pl-9"
                            />
                        </div>

                        {isTopicWise && !scopedTopic ? (
                            <Select
                                value={topicFilter}
                                onValueChange={(value) => {
                                    setTopicFilter(value);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Topic" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All topics</SelectItem>
                                    {chapter.topics.map((topic) => (
                                        <SelectItem key={topic.id} value={String(topic.id)}>
                                            {topic.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : null}

                        <Select
                            value={typeFilter}
                            onValueChange={(value) => {
                                setTypeFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All types</SelectItem>
                                {typeOptions.map((type) => (
                                    <SelectItem
                                        key={type.id}
                                        value={String(type.id)}
                                    >
                                        {type.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={sourceFilter}
                            onValueChange={(value) => {
                                setSourceFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Source" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All sources</SelectItem>
                                {sourceFilterOptions.map((source) => (
                                    <SelectItem
                                        key={source.value}
                                        value={source.value}
                                    >
                                        {source.label}
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
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
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
                            <SelectTrigger className="h-9">
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

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={clearFilters}
                            disabled={!hasActiveFilters}
                        >
                            Clear
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-lg border">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                                        Question
                                    </th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                                        Type
                                    </th>
                                    {isTopicWise && !scopedTopic ? (
                                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                                            Topic
                                        </th>
                                    ) : null}
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                                        Source
                                    </th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                                        Status
                                    </th>
                                    <th className="w-24 px-3 py-2.5 text-right font-medium text-muted-foreground" />
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={isTopicWise && !scopedTopic ? 6 : 5}
                                            className="py-12 text-center text-muted-foreground"
                                        >
                                            No questions found
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((question, index) => (
                                        <tr
                                            key={question.id}
                                            className={`transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-accent/50`}
                                        >
                                            <td className="px-3 py-2.5">
                                                <p className="font-medium">
                                                    {truncateText(
                                                        question.summary_text,
                                                    )}
                                                </p>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                {question.question_type.name}
                                            </td>
                                            {isTopicWise && !scopedTopic ? (
                                                <td className="px-3 py-2.5 text-muted-foreground">
                                                    {question.topic?.name ?? '-'}
                                                </td>
                                            ) : null}
                                            <td className="px-3 py-2.5 text-muted-foreground">
                                                {question.source_label ||
                                                    question.source ||
                                                    '-'}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                {statusBadge(question.status)}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center justify-end gap-1">
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

                    <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-2.5">
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
                            <span className="px-2 text-xs text-muted-foreground">
                                {safePage} / {totalPages}
                            </span>
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
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleting}
                        >
                            <Trash2Icon className="size-4" />
                            {deleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

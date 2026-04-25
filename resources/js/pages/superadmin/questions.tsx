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
import type { QuestionTypeOption } from './questions/form';

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

interface PatternFilterOption {
    id: number;
    name: string;
    short_name: string | null;
}

interface ClassFilterOption {
    id: number;
    name: string;
}

interface SubjectFilterOption {
    id: number;
    name_eng: string;
    name_ur: string | null;
}

interface SourceFilterOption {
    value: string;
    label: string;
}

type FacetKey =
    | 'pattern'
    | 'class'
    | 'subject'
    | 'kind'
    | 'type'
    | 'source'
    | 'status';

interface FacetFilters {
    pattern: string;
    class: string;
    subject: string;
    kind: string;
    type: string;
    source: string;
    status: string;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20];
const BLANK_SOURCE_VALUE = '__blank__';
const KIND_FILTER_OPTIONS = [
    { value: 'objective', label: 'Objective' },
    { value: 'subjective', label: 'Subjective' },
] as const;
const STATUS_FILTER_OPTIONS = [
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

function truncateText(value: string, maxLength = 84) {
    return value.length > maxLength
        ? `${value.slice(0, maxLength - 1)}...`
        : value;
}

function patternLabel(pattern: PatternFilterOption | QuestionRow['chapter']['pattern']) {
    return pattern.short_name
        ? `${pattern.short_name} / ${pattern.name}`
        : pattern.name;
}

function chapterLabel(chapter: QuestionRow['chapter']) {
    const chapterPart = chapter.chapter_number
        ? `Ch ${chapter.chapter_number}`
        : chapter.name;

    return [
        chapter.subject.name_eng,
        chapterPart,
        chapter.class.name,
        patternLabel(chapter.pattern),
    ].join(' / ');
}

function sourceFilterValue(question: QuestionRow) {
    return question.source && question.source.length > 0
        ? question.source
        : BLANK_SOURCE_VALUE;
}

function matchesFacetFilters(
    question: QuestionRow,
    filters: FacetFilters,
    excluded: FacetKey[] = [],
) {
    const skip = new Set(excluded);

    const matchesPattern =
        skip.has('pattern') ||
        filters.pattern === 'all' ||
        String(question.chapter.pattern.id) === filters.pattern;

    const matchesClass =
        skip.has('class') ||
        filters.class === 'all' ||
        String(question.chapter.class.id) === filters.class;

    const matchesSubject =
        skip.has('subject') ||
        filters.subject === 'all' ||
        String(question.chapter.subject.id) === filters.subject;

    const matchesKind =
        skip.has('kind') ||
        filters.kind === 'all' ||
        (filters.kind === 'objective' && question.question_type.is_objective) ||
        (filters.kind === 'subjective' && !question.question_type.is_objective);

    const matchesType =
        skip.has('type') ||
        filters.type === 'all' ||
        String(question.question_type.id) === filters.type;

    const matchesSource =
        skip.has('source') ||
        filters.source === 'all' ||
        sourceFilterValue(question) === filters.source;

    const matchesStatus =
        skip.has('status') ||
        filters.status === 'all' ||
        (filters.status === 'active' && question.status === 1) ||
        (filters.status === 'inactive' && question.status === 0);

    return (
        matchesPattern &&
        matchesClass &&
        matchesSubject &&
        matchesKind &&
        matchesType &&
        matchesSource &&
        matchesStatus
    );
}

function matchesSearch(question: QuestionRow, query: string) {
    const normalized = query.trim().toLowerCase();

    if (normalized === '') {
        return true;
    }

    return (
        question.question_type.name.toLowerCase().includes(normalized) ||
        question.question_type.schema.label.toLowerCase().includes(normalized) ||
        question.chapter.subject.name_eng.toLowerCase().includes(normalized) ||
        question.chapter.class.name.toLowerCase().includes(normalized) ||
        question.chapter.pattern.name.toLowerCase().includes(normalized) ||
        (question.chapter.pattern.short_name ?? '')
            .toLowerCase()
            .includes(normalized) ||
        question.chapter.name.toLowerCase().includes(normalized) ||
        (question.topic?.name ?? '').toLowerCase().includes(normalized) ||
        (question.source_label ?? question.source ?? '')
            .toLowerCase()
            .includes(normalized) ||
        question.summary_text.toLowerCase().includes(normalized)
    );
}

export default function Questions({
    questions,
    questionTypes,
}: {
    questions: QuestionRow[];
    questionTypes: QuestionTypeOption[];
}) {
    const [search, setSearch] = useState('');
    const [patternFilter, setPatternFilter] = useState('all');
    const [classFilter, setClassFilter] = useState('all');
    const [subjectFilter, setSubjectFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [kindFilter, setKindFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<QuestionRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    const activeFilters = useMemo<FacetFilters>(
        () => ({
            pattern: patternFilter,
            class: classFilter,
            subject: subjectFilter,
            kind: kindFilter,
            type: typeFilter,
            source: sourceFilter,
            status: statusFilter,
        }),
        [
            classFilter,
            kindFilter,
            patternFilter,
            sourceFilter,
            statusFilter,
            subjectFilter,
            typeFilter,
        ],
    );

    const allPatternOptions = useMemo(() => {
        const patterns = new Map<number, PatternFilterOption>();

        questions.forEach((question) => {
            patterns.set(question.chapter.pattern.id, question.chapter.pattern);
        });

        return Array.from(patterns.values()).sort((left, right) =>
            patternLabel(left).localeCompare(patternLabel(right)),
        );
    }, [questions]);

    const allClassOptions = useMemo(() => {
        const classes = new Map<number, ClassFilterOption>();

        questions.forEach((question) => {
            classes.set(question.chapter.class.id, question.chapter.class);
        });

        return Array.from(classes.values()).sort((left, right) =>
            left.name.localeCompare(right.name),
        );
    }, [questions]);

    const allSubjectOptions = useMemo(() => {
        const subjects = new Map<number, SubjectFilterOption>();

        questions.forEach((question) => {
            subjects.set(question.chapter.subject.id, question.chapter.subject);
        });

        return Array.from(subjects.values()).sort((left, right) =>
            left.name_eng.localeCompare(right.name_eng),
        );
    }, [questions]);

    const allSourceOptions = useMemo(() => {
        const sources = new Map<string, SourceFilterOption>();

        questions.forEach((question) => {
            sources.set(sourceFilterValue(question), {
                value: sourceFilterValue(question),
                label: question.source_label || question.source || 'No source',
            });
        });

        return Array.from(sources.values()).sort((left, right) =>
            left.label.localeCompare(right.label),
        );
    }, [questions]);

    const patternOptions = useMemo(() => {
        const availableIds = new Set(
            questions
                .filter((question) =>
                    matchesFacetFilters(question, activeFilters, ['pattern']),
                )
                .map((question) => question.chapter.pattern.id),
        );

        return allPatternOptions.filter(
            (option) =>
                availableIds.has(option.id) ||
                String(option.id) === patternFilter,
        );
    }, [activeFilters, allPatternOptions, patternFilter, questions]);

    const classOptions = useMemo(() => {
        const availableIds = new Set(
            questions
                .filter((question) =>
                    matchesFacetFilters(question, activeFilters, ['class']),
                )
                .map((question) => question.chapter.class.id),
        );

        return allClassOptions.filter(
            (option) =>
                availableIds.has(option.id) || String(option.id) === classFilter,
        );
    }, [activeFilters, allClassOptions, classFilter, questions]);

    const subjectOptions = useMemo(() => {
        const availableIds = new Set(
            questions
                .filter((question) =>
                    matchesFacetFilters(question, activeFilters, ['subject']),
                )
                .map((question) => question.chapter.subject.id),
        );

        return allSubjectOptions.filter(
            (option) =>
                availableIds.has(option.id) ||
                String(option.id) === subjectFilter,
        );
    }, [activeFilters, allSubjectOptions, questions, subjectFilter]);

    const kindOptions = useMemo(() => {
        const availableKinds = new Set(
            questions
                .filter((question) =>
                    matchesFacetFilters(question, activeFilters, ['kind']),
                )
                .map((question) =>
                    question.question_type.is_objective
                        ? 'objective'
                        : 'subjective',
                ),
        );

        return KIND_FILTER_OPTIONS.filter(
            (option) =>
                availableKinds.has(option.value) || option.value === kindFilter,
        );
    }, [activeFilters, kindFilter, questions]);

    const typeOptions = useMemo(() => {
        const availableIds = new Set(
            questions
                .filter((question) =>
                    matchesFacetFilters(question, activeFilters, ['type']),
                )
                .map((question) => question.question_type.id),
        );

        return questionTypes.filter(
            (option) =>
                availableIds.has(option.id) || String(option.id) === typeFilter,
        );
    }, [activeFilters, questionTypes, questions, typeFilter]);

    const sourceOptions = useMemo(() => {
        const availableValues = new Set(
            questions
                .filter((question) =>
                    matchesFacetFilters(question, activeFilters, ['source']),
                )
                .map((question) => sourceFilterValue(question)),
        );

        return allSourceOptions.filter(
            (option) =>
                availableValues.has(option.value) ||
                option.value === sourceFilter,
        );
    }, [activeFilters, allSourceOptions, questions, sourceFilter]);

    const statusOptions = useMemo(() => {
        const availableStatuses = new Set(
            questions
                .filter((question) =>
                    matchesFacetFilters(question, activeFilters, ['status']),
                )
                .map((question) =>
                    question.status === 1 ? 'active' : 'inactive',
                ),
        );

        return STATUS_FILTER_OPTIONS.filter(
            (option) =>
                availableStatuses.has(option.value) ||
                option.value === statusFilter,
        );
    }, [activeFilters, questions, statusFilter]);

    const filtered = useMemo(() => {
        return questions.filter((question) => {
            return (
                matchesSearch(question, search) &&
                matchesFacetFilters(question, activeFilters)
            );
        });
    }, [activeFilters, questions, search]);

    const hasActiveFilters =
        search.trim() !== '' ||
        patternFilter !== 'all' ||
        classFilter !== 'all' ||
        subjectFilter !== 'all' ||
        kindFilter !== 'all' ||
        typeFilter !== 'all' ||
        sourceFilter !== 'all' ||
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
        setSubjectFilter('all');
        setKindFilter('all');
        setTypeFilter('all');
        setSourceFilter('all');
        setStatusFilter('all');
        setPage(1);
    };

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

                <div className="space-y-4 rounded-xl border p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative min-w-0 flex-1">
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

                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                            <button
                                type="button"
                                onClick={clearFilters}
                                disabled={!hasActiveFilters}
                                className="flex h-10 items-center rounded-lg border border-input px-4 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
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

                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
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
                            value={subjectFilter}
                            onValueChange={(value) => {
                                setSubjectFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Subject" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All subjects</SelectItem>
                                {subjectOptions.map((subject) => (
                                    <SelectItem
                                        key={subject.id}
                                        value={String(subject.id)}
                                    >
                                        {subject.name_eng}
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
                            <SelectTrigger>
                                <SelectValue placeholder="Objective / Subjective" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All objective / subjective
                                </SelectItem>
                                {kindOptions.map((option) => (
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
                            value={typeFilter}
                            onValueChange={(value) => {
                                setTypeFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Question Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All question types
                                </SelectItem>
                                {typeOptions.map((item) => (
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
                            value={sourceFilter}
                            onValueChange={(value) => {
                                setSourceFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Source" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All sources</SelectItem>
                                {sourceOptions.map((source) => (
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
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All statuses
                                </SelectItem>
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
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium">
                                                    {question.question_type.name}
                                                </p>
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

import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    DownloadIcon,
    EyeIcon,
    FileUpIcon,
    UploadIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import AlertError from '@/components/alert-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type {
    ChapterOption,
    MediumOption,
    QuestionTypeOption,
    SourceOption,
} from './form';

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

interface ImportDefaults {
    question_type_id: string;
    chapter_id: string;
    topic_id: string;
    source: string;
    status: string;
    medium_id: string;
}

interface ImportReport {
    status: 'success' | 'error';
    total_rows: number;
    imported_rows: number;
    failed_rows: number;
    unselected_rows?: number;
    duplicate_rows?: number;
    errors: string[];
}

interface PreviewRow {
    row_number: number;
    valid: boolean;
    issues: string[];
    statement_en: string | null;
    statement_ur: string | null;
    description_en: string | null;
    description_ur: string | null;
    answer_en: string | null;
    answer_ur: string | null;
    source: string | null;
    status: number | null;
    options: Array<{
        text_en: string | null;
        text_ur: string | null;
        is_correct: boolean;
        sort_order: number;
    }>;
}

interface ImportPreview {
    status: 'success' | 'error';
    total_rows: number;
    ready_rows: number;
    failed_rows: number;
    duplicate_rows: number;
    valid_row_numbers: number[];
    errors: string[];
    rows: PreviewRow[];
}

interface ImportFormData {
    question_type_id: string;
    chapter_id: string;
    topic_id: string;
    source: string;
    status: string;
    medium_id: string;
    preview_token: string;
    file: File | null;
    [key: string]: File | null | string;
}

function Field({
    label,
    required,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="min-w-0 space-y-1.5">
            <Label className="flex items-center gap-1">
                {label}
                {required ? (
                    <span className="text-xs text-destructive">*</span>
                ) : null}
            </Label>
            {children}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
    );
}

function SectionCard({
    children,
    icon,
    title,
}: {
    children: ReactNode;
    icon: ReactNode;
    title: string;
}) {
    return (
        <section className="w-full min-w-0 space-y-4 rounded-xl border p-5 shadow-sm">
            <div className="flex items-center gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {icon}
                </span>
                <h3 className="text-sm font-semibold">{title}</h3>
            </div>
            <Separator />
            {children}
        </section>
    );
}

function chapterTitle(chapter: ChapterOption) {
    const title = chapter.chapter_number
        ? `Chapter ${chapter.chapter_number}`
        : chapter.name;

    return chapter.group_name ? `${chapter.group_name} / ${title}` : title;
}

function supportsImportForChapter(
    questionType: QuestionTypeOption,
    chapter: ChapterOption | null,
) {
    if (!chapter) {
        return (
            questionType.supports_simple_import ||
            questionType.scope_rules.some((rule) => rule.supports_simple_import)
        );
    }

    const scopedRule = questionType.scope_rules
        .filter(
            (rule) =>
                rule.pattern_id === chapter.pattern.id &&
                (rule.class_id === null ||
                    rule.class_id === chapter.class.id) &&
                (rule.subject_id === null ||
                    rule.subject_id === chapter.subject.id),
        )
        .sort(
            (left, right) =>
                Number(left.class_id !== null) -
                    Number(right.class_id !== null) ||
                Number(left.subject_id !== null) -
                    Number(right.subject_id !== null),
        )
        .at(-1);

    return (
        scopedRule?.supports_simple_import ??
        questionType.supports_simple_import
    );
}

function truncateText(value: string, maxLength = 100) {
    return value.length > maxLength
        ? `${value.slice(0, maxLength - 1)}...`
        : value;
}

function questionPreview(row: PreviewRow) {
    return (
        row.statement_en ||
        row.statement_ur ||
        row.description_en ||
        row.description_ur ||
        row.answer_en ||
        row.answer_ur ||
        'No content'
    );
}

function previewSubline(row: PreviewRow) {
    return (
        row.description_en ||
        row.description_ur ||
        row.statement_ur ||
        row.answer_ur ||
        null
    );
}

function statusBadge(status: number | null) {
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

export default function ImportQuestions({
    questionTypes,
    chapters,
    sourceOptions,
    mediumOptions,
    defaults,
    lockedChapterId,
    backHref = '/superadmin/questions',
    preview,
    previewToken,
    report,
}: {
    questionTypes: QuestionTypeOption[];
    chapters: ChapterOption[];
    sourceOptions: SourceOption[];
    mediumOptions: MediumOption[];
    defaults: ImportDefaults;
    lockedChapterId?: number | null;
    backHref?: string;
    preview: ImportPreview | null;
    previewToken: string | null;
    report: ImportReport | null;
}) {
    const form = useForm<ImportFormData>({
        question_type_id: defaults.question_type_id,
        chapter_id: defaults.chapter_id,
        topic_id: defaults.topic_id,
        source: defaults.source,
        status: defaults.status,
        medium_id: defaults.medium_id,
        preview_token: previewToken ?? '',
        file: null,
    });
    const [activePreview, setActivePreview] = useState<ImportPreview | null>(
        preview,
    );
    const [activePreviewToken, setActivePreviewToken] = useState(
        previewToken ?? '',
    );
    const [isImporting, setIsImporting] = useState(false);
    const [selectedRowNumbers, setSelectedRowNumbers] = useState<Set<number>>(
        () => new Set(preview?.valid_row_numbers ?? []),
    );
    const [visibleRows, setVisibleRows] = useState<PreviewRow[]>(
        preview?.rows ?? [],
    );
    const [previewPage, setPreviewPage] = useState(1);
    const [loadingPreviewPage, setLoadingPreviewPage] = useState(false);
    const isChapterLocked =
        lockedChapterId !== null && lockedChapterId !== undefined;

    const selectedChapter = useMemo(
        () =>
            chapters.find((item) => String(item.id) === form.data.chapter_id) ??
            null,
        [chapters, form.data.chapter_id],
    );
    const selectedQuestionType = useMemo(
        () =>
            questionTypes.find(
                (item) => String(item.id) === form.data.question_type_id,
            ) ?? null,
        [form.data.question_type_id, questionTypes],
    );
    const importUnsupported =
        selectedQuestionType !== null &&
        !supportsImportForChapter(selectedQuestionType, selectedChapter);

    const [patternFilter, setPatternFilter] = useState(() =>
        selectedChapter ? String(selectedChapter.pattern.id) : 'all',
    );
    const [classFilter, setClassFilter] = useState(() =>
        selectedChapter ? String(selectedChapter.class.id) : 'all',
    );
    const [subjectFilter, setSubjectFilter] = useState(() =>
        selectedChapter ? String(selectedChapter.subject.id) : 'all',
    );

    const patternOptions = useMemo(() => {
        const patterns = new Map<number, PatternFilterOption>();

        chapters.forEach((chapter) => {
            if (patterns.has(chapter.pattern.id)) {
                return;
            }

            patterns.set(chapter.pattern.id, {
                id: chapter.pattern.id,
                name: chapter.pattern.name,
                short_name: chapter.pattern.short_name,
            });
        });

        return Array.from(patterns.values()).sort((left, right) =>
            left.name.localeCompare(right.name),
        );
    }, [chapters]);

    const classOptions = useMemo(() => {
        const classes = new Map<number, ClassFilterOption>();

        chapters
            .filter(
                (chapter) =>
                    patternFilter === 'all' ||
                    String(chapter.pattern.id) === patternFilter,
            )
            .forEach((chapter) => {
                if (classes.has(chapter.class.id)) {
                    return;
                }

                classes.set(chapter.class.id, {
                    id: chapter.class.id,
                    name: chapter.class.name,
                });
            });

        return Array.from(classes.values()).sort((left, right) =>
            left.name.localeCompare(right.name),
        );
    }, [chapters, patternFilter]);

    const subjectOptions = useMemo(() => {
        const subjects = new Map<number, SubjectFilterOption>();

        chapters
            .filter(
                (chapter) =>
                    (patternFilter === 'all' ||
                        String(chapter.pattern.id) === patternFilter) &&
                    (classFilter === 'all' ||
                        String(chapter.class.id) === classFilter),
            )
            .forEach((chapter) => {
                if (subjects.has(chapter.subject.id)) {
                    return;
                }

                subjects.set(chapter.subject.id, {
                    id: chapter.subject.id,
                    name_eng: chapter.subject.name_eng,
                    name_ur: chapter.subject.name_ur,
                });
            });

        return Array.from(subjects.values()).sort((left, right) =>
            left.name_eng.localeCompare(right.name_eng),
        );
    }, [chapters, classFilter, patternFilter]);

    const filteredChapters = useMemo(
        () =>
            chapters.filter(
                (chapter) =>
                    (patternFilter === 'all' ||
                        String(chapter.pattern.id) === patternFilter) &&
                    (classFilter === 'all' ||
                        String(chapter.class.id) === classFilter) &&
                    (subjectFilter === 'all' ||
                        String(chapter.subject.id) === subjectFilter),
            ),
        [chapters, classFilter, patternFilter, subjectFilter],
    );

    const usesTopicSelection =
        selectedChapter?.subject.subject_type === 'topic-wise';
    const availableTopics = usesTopicSelection
        ? (selectedChapter?.topics ?? [])
        : [];
    const previewRows = visibleRows;
    const previewPageCount = Math.ceil((activePreview?.total_rows ?? 0) / 25);

    const clearPreview = () => {
        setActivePreview(null);
        setActivePreviewToken('');
        form.setData('preview_token', '');
        setSelectedRowNumbers(new Set());
        setVisibleRows([]);
        setPreviewPage(1);
    };

    useEffect(() => {
        setActivePreview(preview);
        setActivePreviewToken(previewToken ?? '');
        form.setData('preview_token', previewToken ?? '');
        setSelectedRowNumbers(new Set(preview?.valid_row_numbers ?? []));
        setVisibleRows(preview?.rows ?? []);
        setPreviewPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preview, previewToken]);

    useEffect(() => {
        if (
            classFilter !== 'all' &&
            !classOptions.some(
                (schoolClass) => String(schoolClass.id) === classFilter,
            )
        ) {
            setClassFilter('all');
        }
    }, [classFilter, classOptions]);

    useEffect(() => {
        if (
            subjectFilter !== 'all' &&
            !subjectOptions.some(
                (subject) => String(subject.id) === subjectFilter,
            )
        ) {
            setSubjectFilter('all');
        }
    }, [subjectFilter, subjectOptions]);

    useEffect(() => {
        if (
            selectedChapter &&
            !filteredChapters.some(
                (chapter) => chapter.id === selectedChapter.id,
            )
        ) {
            clearPreview();
            form.setData('chapter_id', '');
            form.setData('topic_id', '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredChapters, selectedChapter]);

    useEffect(() => {
        if (
            form.data.topic_id &&
            (!usesTopicSelection ||
                !availableTopics.some(
                    (topic) => String(topic.id) === form.data.topic_id,
                ))
        ) {
            form.setData('topic_id', '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableTopics, form.data.chapter_id, usesTopicSelection]);

    const handlePreviewSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(
            `/superadmin/questions/import/preview${isChapterLocked ? '?chapter_scoped=1' : ''}`,
            {
                preserveScroll: true,
            },
        );
    };

    const handleImport = () => {
        if (
            !activePreviewToken ||
            activePreview?.status !== 'success' ||
            selectedRowNumbers.size === 0
        ) {
            return;
        }

        setIsImporting(true);
        router.post(
            '/superadmin/questions/import',
            {
                question_type_id: form.data.question_type_id,
                chapter_id: form.data.chapter_id,
                topic_id: form.data.topic_id,
                source: form.data.source,
                status: form.data.status,
                medium_id: form.data.medium_id,
                preview_token: activePreviewToken,
                selected_row_numbers: [...selectedRowNumbers],
                chapter_scoped: isChapterLocked ? '1' : '0',
            },
            {
                preserveScroll: true,
                onFinish: () => setIsImporting(false),
            },
        );
    };

    const loadPreviewPage = async (page: number) => {
        if (!activePreviewToken || page < 1 || page > previewPageCount) {
            return;
        }

        setLoadingPreviewPage(true);

        try {
            const response = await fetch(
                `/superadmin/questions/import/preview-rows?preview_token=${encodeURIComponent(activePreviewToken)}&page=${page}`,
                { credentials: 'same-origin' },
            );

            if (!response.ok) {
                throw new Error('Preview expired. Upload the file again.');
            }

            const result = (await response.json()) as {
                rows: PreviewRow[];
                page: number;
            };
            setVisibleRows(result.rows);
            setPreviewPage(result.page);
        } catch {
            clearPreview();
        } finally {
            setLoadingPreviewPage(false);
        }
    };

    const toggleRow = (rowNumber: number) => {
        setSelectedRowNumbers((current) => {
            const next = new Set(current);

            if (next.has(rowNumber)) {
                next.delete(rowNumber);
            } else {
                next.add(rowNumber);
            }

            return next;
        });
    };

    return (
        <>
            <Head title="Bulk Import Questions" />

            <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6 p-4 md:p-6">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        <Link
                            href={backHref}
                            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-input transition-colors hover:bg-accent"
                        >
                            <ArrowLeftIcon className="size-4" />
                        </Link>
                        <div className="min-w-0 space-y-2">
                            <h1 className="h1-semibold">
                                Bulk Import Questions
                            </h1>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="bg-muted">
                                    CSV / XLSX / XLS
                                </Badge>
                                {selectedChapter ? (
                                    <Badge
                                        variant="outline"
                                        className="bg-muted"
                                    >
                                        {selectedChapter.subject.name_eng}
                                    </Badge>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {(['csv', 'xlsx'] as const).map((format) => (
                            <Button
                                key={format}
                                asChild
                                variant="outline"
                                className="sm:shrink-0"
                                disabled={
                                    !selectedQuestionType ||
                                    !selectedChapter ||
                                    importUnsupported
                                }
                            >
                                <a
                                    href={
                                        selectedQuestionType &&
                                        selectedChapter &&
                                        !importUnsupported
                                            ? `/superadmin/questions/import/template?question_type_id=${selectedQuestionType.id}&chapter_id=${selectedChapter.id}&format=${format}`
                                            : undefined
                                    }
                                    aria-disabled={
                                        !selectedQuestionType ||
                                        !selectedChapter ||
                                        importUnsupported
                                    }
                                    onClick={(event) => {
                                        if (
                                            !selectedQuestionType ||
                                            !selectedChapter ||
                                            importUnsupported
                                        ) {
                                            event.preventDefault();
                                        }
                                    }}
                                >
                                    <DownloadIcon className="size-4" />
                                    {format.toUpperCase()} template
                                </a>
                            </Button>
                        ))}
                    </div>
                </div>

                {report ? (
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-5">
                            <div className="rounded-xl border p-4 shadow-sm">
                                <p className="text-xs text-muted-foreground">
                                    Status
                                </p>
                                <p className="mt-1 font-semibold capitalize">
                                    {report.status}
                                </p>
                            </div>
                            <div className="rounded-xl border p-4 shadow-sm">
                                <p className="text-xs text-muted-foreground">
                                    Rows
                                </p>
                                <p className="mt-1 font-semibold">
                                    {report.total_rows}
                                </p>
                            </div>
                            <div className="rounded-xl border p-4 shadow-sm">
                                <p className="text-xs text-muted-foreground">
                                    Imported
                                </p>
                                <p className="mt-1 font-semibold">
                                    {report.imported_rows}
                                </p>
                            </div>
                            <div className="rounded-xl border p-4 shadow-sm">
                                <p className="text-xs text-muted-foreground">
                                    Invalid
                                </p>
                                <p className="mt-1 font-semibold">
                                    {report.failed_rows}
                                </p>
                            </div>
                            <div className="rounded-xl border p-4 shadow-sm">
                                <p className="text-xs text-muted-foreground">
                                    Unselected / duplicates
                                </p>
                                <p className="mt-1 font-semibold">
                                    {report.unselected_rows ?? 0} /{' '}
                                    {report.duplicate_rows ?? 0}
                                </p>
                            </div>
                        </div>

                        {report.errors.length > 0 ? (
                            <AlertError
                                title="Import errors"
                                errors={report.errors}
                            />
                        ) : null}
                    </div>
                ) : null}

                {activePreview ? (
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-5">
                            <div className="rounded-xl border p-4 shadow-sm">
                                <p className="text-xs text-muted-foreground">
                                    Preview
                                </p>
                                <p className="mt-1 font-semibold capitalize">
                                    {activePreview.status}
                                </p>
                            </div>
                            <div className="rounded-xl border p-4 shadow-sm">
                                <p className="text-xs text-muted-foreground">
                                    Rows
                                </p>
                                <p className="mt-1 font-semibold">
                                    {activePreview.total_rows}
                                </p>
                            </div>
                            <div className="rounded-xl border p-4 shadow-sm">
                                <p className="text-xs text-muted-foreground">
                                    Ready
                                </p>
                                <p className="mt-1 font-semibold">
                                    {activePreview.ready_rows}
                                </p>
                            </div>
                            <div className="rounded-xl border p-4 shadow-sm">
                                <p className="text-xs text-muted-foreground">
                                    Issues
                                </p>
                                <p className="mt-1 font-semibold">
                                    {activePreview.failed_rows}
                                </p>
                            </div>
                            <div className="rounded-xl border p-4 shadow-sm">
                                <p className="text-xs text-muted-foreground">
                                    Selected
                                </p>
                                <p className="mt-1 font-semibold">
                                    {selectedRowNumbers.size}
                                </p>
                            </div>
                        </div>

                        {activePreview.errors.length > 0 ? (
                            <AlertError
                                title="Preview issues"
                                errors={activePreview.errors}
                            />
                        ) : null}

                        {previewRows.length > 0 ? (
                            <SectionCard
                                icon={<EyeIcon className="size-4" />}
                                title="Preview"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex flex-wrap gap-2">
                                            <Badge
                                                variant="outline"
                                                className="bg-muted"
                                            >
                                                {previewRows.length} /{' '}
                                                {activePreview.total_rows}
                                            </Badge>
                                            {selectedQuestionType ? (
                                                <Badge
                                                    variant="outline"
                                                    className="bg-muted"
                                                >
                                                    {selectedQuestionType.is_objective
                                                        ? 'Objective'
                                                        : 'Subjective'}
                                                </Badge>
                                            ) : null}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    setSelectedRowNumbers(
                                                        new Set(
                                                            activePreview.valid_row_numbers,
                                                        ),
                                                    )
                                                }
                                            >
                                                Select all valid
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    setSelectedRowNumbers(
                                                        new Set(),
                                                    )
                                                }
                                            >
                                                Clear selection
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="overflow-hidden rounded-xl border">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b bg-muted/40">
                                                        <th className="w-12 px-4 py-3 text-left font-medium text-muted-foreground">
                                                            Use
                                                        </th>
                                                        <th className="w-20 px-4 py-3 text-left font-medium text-muted-foreground">
                                                            Row
                                                        </th>
                                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                                            Question
                                                        </th>
                                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                                            Response
                                                        </th>
                                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                                            Source
                                                        </th>
                                                        <th className="w-32 px-4 py-3 text-left font-medium text-muted-foreground">
                                                            Status
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {previewRows.map(
                                                        (row, index) => (
                                                            <tr
                                                                key={
                                                                    row.row_number
                                                                }
                                                                className={`transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-accent/50`}
                                                            >
                                                                <td className="px-4 py-3">
                                                                    <input
                                                                        type="checkbox"
                                                                        aria-label={`Import row ${row.row_number}`}
                                                                        checked={selectedRowNumbers.has(
                                                                            row.row_number,
                                                                        )}
                                                                        disabled={
                                                                            !row.valid
                                                                        }
                                                                        onChange={() =>
                                                                            toggleRow(
                                                                                row.row_number,
                                                                            )
                                                                        }
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3 font-medium tabular-nums">
                                                                    {
                                                                        row.row_number
                                                                    }
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <p className="font-medium">
                                                                        {truncateText(
                                                                            questionPreview(
                                                                                row,
                                                                            ),
                                                                        )}
                                                                    </p>
                                                                    {row.issues
                                                                        .length >
                                                                    0 ? (
                                                                        <p className="mt-1 text-xs text-destructive">
                                                                            {row.issues.join(
                                                                                ' ',
                                                                            )}
                                                                        </p>
                                                                    ) : null}
                                                                    <details className="mt-2 text-xs">
                                                                        <summary className="cursor-pointer text-primary">
                                                                            View
                                                                            full
                                                                            question
                                                                        </summary>
                                                                        <div className="mt-2 space-y-1 whitespace-pre-wrap break-words">
                                                                            {row.statement_en && (
                                                                                <p>
                                                                                    English:{' '}
                                                                                    {
                                                                                        row.statement_en
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                            {row.statement_ur && (
                                                                                <p dir="rtl">
                                                                                    Urdu:{' '}
                                                                                    {
                                                                                        row.statement_ur
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                            {row.description_en && (
                                                                                <p>
                                                                                    Guidance:{' '}
                                                                                    {
                                                                                        row.description_en
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                            {row.description_ur && (
                                                                                <p dir="rtl">
                                                                                    Guidance:{' '}
                                                                                    {
                                                                                        row.description_ur
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                            {row.answer_en && (
                                                                                <p>
                                                                                    Answer:{' '}
                                                                                    {
                                                                                        row.answer_en
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                            {row.answer_ur && (
                                                                                <p dir="rtl">
                                                                                    Answer:{' '}
                                                                                    {
                                                                                        row.answer_ur
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                            {row.options.map(
                                                                                (
                                                                                    option,
                                                                                ) => (
                                                                                    <div
                                                                                        key={
                                                                                            option.sort_order
                                                                                        }
                                                                                    >
                                                                                        <p>
                                                                                            Option{' '}
                                                                                            {
                                                                                                option.sort_order
                                                                                            }
                                                                                            {option.is_correct
                                                                                                ? ' (correct)'
                                                                                                : ''}

                                                                                            :{' '}
                                                                                            {option.text_en ||
                                                                                                option.text_ur}
                                                                                        </p>
                                                                                        {option.text_en &&
                                                                                            option.text_ur && (
                                                                                                <p dir="rtl">
                                                                                                    {
                                                                                                        option.text_ur
                                                                                                    }
                                                                                                </p>
                                                                                            )}
                                                                                    </div>
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                    </details>
                                                                    {previewSubline(
                                                                        row,
                                                                    ) ? (
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {truncateText(
                                                                                previewSubline(
                                                                                    row,
                                                                                ) ||
                                                                                    '',
                                                                                90,
                                                                            )}
                                                                        </p>
                                                                    ) : null}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {row.options
                                                                        .length >
                                                                    0 ? (
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {row.options.map(
                                                                                (
                                                                                    option,
                                                                                ) => (
                                                                                    <Badge
                                                                                        key={`${row.row_number}-${option.sort_order}`}
                                                                                        variant="outline"
                                                                                        className={
                                                                                            option.is_correct
                                                                                                ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                                                                                : 'bg-muted'
                                                                                        }
                                                                                    >
                                                                                        {truncateText(
                                                                                            option.text_en ||
                                                                                                option.text_ur ||
                                                                                                `Option ${option.sort_order}`,
                                                                                            36,
                                                                                        )}
                                                                                    </Badge>
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="font-medium">
                                                                            {truncateText(
                                                                                row.answer_en ||
                                                                                    row.answer_ur ||
                                                                                    '-',
                                                                                90,
                                                                            )}
                                                                        </p>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-muted-foreground">
                                                                    {row.source ||
                                                                        '-'}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {statusBadge(
                                                                        row.status,
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    {previewPageCount > 1 && (
                                        <div className="flex items-center justify-end gap-3">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                disabled={
                                                    loadingPreviewPage ||
                                                    previewPage <= 1
                                                }
                                                onClick={() =>
                                                    void loadPreviewPage(
                                                        previewPage - 1,
                                                    )
                                                }
                                            >
                                                Previous
                                            </Button>
                                            <span className="text-sm">
                                                Page {previewPage} of{' '}
                                                {previewPageCount}
                                            </span>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                disabled={
                                                    loadingPreviewPage ||
                                                    previewPage >=
                                                        previewPageCount
                                                }
                                                onClick={() =>
                                                    void loadPreviewPage(
                                                        previewPage + 1,
                                                    )
                                                }
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </SectionCard>
                        ) : null}
                    </div>
                ) : null}

                <form
                    onSubmit={handlePreviewSubmit}
                    className="w-full min-w-0 space-y-5"
                >
                    <SectionCard
                        icon={<UploadIcon className="size-4" />}
                        title="Import"
                    >
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <Field
                                label="Question Type"
                                required
                                error={form.errors.question_type_id}
                            >
                                <div className="space-y-2">
                                    <Select
                                        value={
                                            form.data.question_type_id || 'none'
                                        }
                                        onValueChange={(value) => {
                                            clearPreview();
                                            form.setData(
                                                'question_type_id',
                                                value === 'none' ? '' : value,
                                            );
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                Select type
                                            </SelectItem>
                                            {questionTypes.map((item) => {
                                                const importable =
                                                    supportsImportForChapter(
                                                        item,
                                                        selectedChapter,
                                                    );

                                                return (
                                                    <SelectItem
                                                        key={item.id}
                                                        value={String(item.id)}
                                                        disabled={!importable}
                                                    >
                                                        {importable
                                                            ? item.name
                                                            : `${item.name} (manual only)`}
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                    {importUnsupported ? (
                                        <p className="text-xs text-destructive">
                                            This question type needs the manual
                                            schema-driven form.
                                        </p>
                                    ) : null}
                                </div>
                            </Field>

                            {isChapterLocked && selectedChapter ? (
                                <div className="md:col-span-2 xl:col-span-3">
                                    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                                        <Badge
                                            variant="outline"
                                            className="bg-background"
                                        >
                                            {selectedChapter.subject.name_eng}
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="bg-background"
                                        >
                                            {selectedChapter.class.name}
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="bg-background"
                                        >
                                            {selectedChapter.pattern.short_name
                                                ? `${selectedChapter.pattern.short_name} / ${selectedChapter.pattern.name}`
                                                : selectedChapter.pattern.name}
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="bg-background"
                                        >
                                            {chapterTitle(selectedChapter)}
                                        </Badge>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Field label="Pattern">
                                        <Select
                                            value={patternFilter}
                                            onValueChange={setPatternFilter}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="All patterns" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    All patterns
                                                </SelectItem>
                                                {patternOptions.map(
                                                    (pattern) => (
                                                        <SelectItem
                                                            key={pattern.id}
                                                            value={String(
                                                                pattern.id,
                                                            )}
                                                        >
                                                            {pattern.short_name
                                                                ? `${pattern.short_name} / ${pattern.name}`
                                                                : pattern.name}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    <Field label="Class">
                                        <Select
                                            value={classFilter}
                                            onValueChange={setClassFilter}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="All classes" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    All classes
                                                </SelectItem>
                                                {classOptions.map(
                                                    (schoolClass) => (
                                                        <SelectItem
                                                            key={schoolClass.id}
                                                            value={String(
                                                                schoolClass.id,
                                                            )}
                                                        >
                                                            {schoolClass.name}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    <Field label="Subject">
                                        <Select
                                            value={subjectFilter}
                                            onValueChange={setSubjectFilter}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="All subjects" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    All subjects
                                                </SelectItem>
                                                {subjectOptions.map(
                                                    (subject) => (
                                                        <SelectItem
                                                            key={subject.id}
                                                            value={String(
                                                                subject.id,
                                                            )}
                                                        >
                                                            {subject.name_eng}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    <Field
                                        label="Chapter"
                                        required
                                        error={form.errors.chapter_id}
                                    >
                                        <Select
                                            value={
                                                form.data.chapter_id || 'none'
                                            }
                                            disabled={
                                                filteredChapters.length === 0
                                            }
                                            onValueChange={(value) => {
                                                clearPreview();
                                                const nextValue =
                                                    value === 'none'
                                                        ? ''
                                                        : value;
                                                form.setData(
                                                    'chapter_id',
                                                    nextValue,
                                                );
                                                form.setData('topic_id', '');
                                            }}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue
                                                    placeholder={
                                                        filteredChapters.length ===
                                                        0
                                                            ? 'No chapters'
                                                            : 'Select chapter'
                                                    }
                                                />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-80">
                                                <SelectItem value="none">
                                                    Select chapter
                                                </SelectItem>
                                                {filteredChapters.map(
                                                    (chapter) => (
                                                        <SelectItem
                                                            key={chapter.id}
                                                            value={String(
                                                                chapter.id,
                                                            )}
                                                        >
                                                            {chapterTitle(
                                                                chapter,
                                                            )}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                </>
                            )}

                            {usesTopicSelection ? (
                                <Field
                                    label="Topic"
                                    error={form.errors.topic_id}
                                >
                                    <Select
                                        value={form.data.topic_id || 'none'}
                                        disabled={availableTopics.length === 0}
                                        onValueChange={(value) => {
                                            clearPreview();
                                            form.setData(
                                                'topic_id',
                                                value === 'none' ? '' : value,
                                            );
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue
                                                placeholder={
                                                    availableTopics.length === 0
                                                        ? 'No topics'
                                                        : 'Select topic'
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                None
                                            </SelectItem>
                                            {availableTopics.map((topic) => (
                                                <SelectItem
                                                    key={topic.id}
                                                    value={String(topic.id)}
                                                >
                                                    {topic.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            ) : null}

                            <Field label="Source" error={form.errors.source}>
                                <Select
                                    value={form.data.source || 'none'}
                                    onValueChange={(value) => {
                                        clearPreview();
                                        form.setData(
                                            'source',
                                            value === 'none' ? '' : value,
                                        );
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            Select source
                                        </SelectItem>
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
                            </Field>

                            <Field
                                label="Status"
                                required
                                error={form.errors.status}
                            >
                                <Select
                                    value={form.data.status}
                                    onValueChange={(value) => {
                                        clearPreview();
                                        form.setData('status', value);
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">
                                            Active
                                        </SelectItem>
                                        <SelectItem value="0">
                                            Inactive
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Medium" error={form.errors.medium_id}>
                                <Select
                                    value={form.data.medium_id || 'none'}
                                    onValueChange={(value) => {
                                        clearPreview();
                                        form.setData(
                                            'medium_id',
                                            value === 'none' ? '' : value,
                                        );
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select medium" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            Default
                                        </SelectItem>
                                        {mediumOptions.map((medium) => (
                                            <SelectItem
                                                key={medium.id}
                                                value={String(medium.id)}
                                            >
                                                {medium.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <div className="md:col-span-2 xl:col-span-3">
                                <Field
                                    label="File"
                                    required
                                    error={form.errors.file}
                                >
                                    <Input
                                        type="file"
                                        accept=".csv,.txt,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                        onChange={(event) => {
                                            clearPreview();
                                            form.setData(
                                                'file',
                                                event.target.files?.[0] ?? null,
                                            );
                                        }}
                                    />
                                </Field>
                            </div>
                        </div>
                    </SectionCard>

                    <div className="flex items-center justify-end gap-3 pb-2">
                        <Button asChild variant="outline">
                            <Link href={backHref}>Cancel</Link>
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                form.processing ||
                                importUnsupported ||
                                !form.data.question_type_id ||
                                !form.data.chapter_id ||
                                !form.data.file
                            }
                            variant={
                                activePreviewToken &&
                                activePreview?.status === 'success'
                                    ? 'outline'
                                    : 'default'
                            }
                        >
                            <EyeIcon className="size-4" />
                            {form.processing ? 'Previewing...' : 'Preview'}
                        </Button>
                        {activePreviewToken &&
                        activePreview?.status === 'success' ? (
                            <Button
                                type="button"
                                disabled={
                                    isImporting ||
                                    importUnsupported ||
                                    selectedRowNumbers.size === 0
                                }
                                onClick={handleImport}
                            >
                                <FileUpIcon className="size-4" />
                                {isImporting
                                    ? 'Importing...'
                                    : `Import ${selectedRowNumbers.size} questions`}
                            </Button>
                        ) : null}
                    </div>
                </form>
            </div>
        </>
    );
}

ImportQuestions.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Questions', href: '/superadmin/questions' },
        { title: 'Bulk Import' },
    ],
};

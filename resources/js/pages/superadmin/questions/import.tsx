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
import type { ChapterOption, QuestionTypeOption, SourceOption } from './form';

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
}

interface ImportReport {
    status: 'success' | 'error';
    total_rows: number;
    imported_rows: number;
    failed_rows: number;
    errors: string[];
}

interface PreviewRow {
    row_number: number;
    statement_en: string | null;
    statement_ur: string | null;
    description_en: string | null;
    description_ur: string | null;
    answer_en: string | null;
    answer_ur: string | null;
    source: string | null;
    status: number;
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
    errors: string[];
    rows: PreviewRow[];
}

interface ImportFormData {
    question_type_id: string;
    chapter_id: string;
    topic_id: string;
    source: string;
    status: string;
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
    return chapter.chapter_number
        ? `Chapter ${chapter.chapter_number}`
        : chapter.name;
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

export default function ImportQuestions({
    questionTypes,
    chapters,
    sourceOptions,
    defaults,
    preview,
    previewToken,
    report,
}: {
    questionTypes: QuestionTypeOption[];
    chapters: ChapterOption[];
    sourceOptions: SourceOption[];
    defaults: ImportDefaults;
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
        !selectedQuestionType.supports_simple_import;

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
    const previewRows = activePreview?.rows ?? [];

    const clearPreview = () => {
        setActivePreview(null);
        setActivePreviewToken('');
        form.setData('preview_token', '');
    };

    useEffect(() => {
        setActivePreview(preview);
        setActivePreviewToken(previewToken ?? '');
        form.setData('preview_token', previewToken ?? '');
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
        form.post('/superadmin/questions/import/preview', {
            preserveScroll: true,
        });
    };

    const handleImport = () => {
        if (!activePreviewToken || activePreview?.status !== 'success') {
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
                preview_token: activePreviewToken,
            },
            {
                preserveScroll: true,
                onFinish: () => setIsImporting(false),
            },
        );
    };

    return (
        <>
            <Head title="Bulk Import Questions" />

            <div className="mx-auto w-full max-w-5xl min-w-0 space-y-6 p-4 md:p-6">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        <Link
                            href="/superadmin/questions"
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

                    <Button asChild variant="outline" className="sm:shrink-0">
                        <a href="/superadmin/questions/import/template">
                            <DownloadIcon className="size-4" />
                            Download Template
                        </a>
                    </Button>
                </div>

                {report ? (
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-4">
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
                                    Issues
                                </p>
                                <p className="mt-1 font-semibold">
                                    {report.failed_rows}
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
                        <div className="grid gap-4 md:grid-cols-4">
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
                                    </div>

                                    <div className="overflow-hidden rounded-xl border">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b bg-muted/40">
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
                                </div>
                            </SectionCard>
                        ) : null}
                    </div>
                ) : null}

                <form onSubmit={handlePreviewSubmit} className="w-full min-w-0 space-y-5">
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
                                            form.data.question_type_id ||
                                            'none'
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
                                            {questionTypes.map((item) => (
                                                <SelectItem
                                                    key={item.id}
                                                    value={String(item.id)}
                                                    disabled={
                                                        !item.supports_simple_import
                                                    }
                                                >
                                                    {item.supports_simple_import
                                                        ? item.name
                                                        : `${item.name} (manual only)`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Flat bulk import currently supports
                                        standard MCQ, true/false, blank without
                                        options, and standard subjective
                                        questions.
                                    </p>
                                    {importUnsupported ? (
                                        <p className="text-xs text-destructive">
                                            This question type needs the manual
                                            schema-driven form.
                                        </p>
                                    ) : null}
                                </div>
                            </Field>

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
                                        {patternOptions.map((pattern) => (
                                            <SelectItem
                                                key={pattern.id}
                                                value={String(pattern.id)}
                                            >
                                                {pattern.short_name
                                                    ? `${pattern.short_name} / ${pattern.name}`
                                                    : pattern.name}
                                            </SelectItem>
                                        ))}
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
                            </Field>

                            <Field
                                label="Chapter"
                                required
                                error={form.errors.chapter_id}
                            >
                                <Select
                                    value={form.data.chapter_id || 'none'}
                                    disabled={filteredChapters.length === 0}
                                    onValueChange={(value) => {
                                        clearPreview();
                                        const nextValue =
                                            value === 'none' ? '' : value;
                                        form.setData('chapter_id', nextValue);
                                        form.setData('topic_id', '');
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue
                                            placeholder={
                                                filteredChapters.length === 0
                                                    ? 'No chapters'
                                                    : 'Select chapter'
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-80">
                                        <SelectItem value="none">
                                            Select chapter
                                        </SelectItem>
                                        {filteredChapters.map((chapter) => (
                                            <SelectItem
                                                key={chapter.id}
                                                value={String(chapter.id)}
                                            >
                                                {chapterTitle(chapter)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

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
                            <Link href="/superadmin/questions">Cancel</Link>
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
                                disabled={isImporting || importUnsupported}
                                onClick={handleImport}
                            >
                                <FileUpIcon className="size-4" />
                                {isImporting
                                    ? 'Importing...'
                                    : 'Import Questions'}
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

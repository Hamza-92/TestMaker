import { Link } from '@inertiajs/react';
import type { InertiaFormProps } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CheckCircle2Icon,
    CircleIcon,
    CirclePlusIcon,
    FileQuestionIcon,
    LanguagesIcon,
    ListChecksIcon,
    ShieldCheckIcon,
    Trash2Icon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
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
import { cn } from '@/lib/utils';

export interface QuestionTypeOption {
    id: number;
    name: string;
    is_objective: boolean;
    is_single: boolean;
    have_statement: boolean;
    statement_label: string | null;
    have_description: boolean;
    description_label: string | null;
    have_answer: boolean;
    column_per_row: number;
    status: number;
}

export interface TopicOption {
    id: number;
    name: string;
    name_ur: string | null;
    status: number;
}

export interface ChapterOption {
    id: number;
    name: string;
    name_ur: string | null;
    chapter_number: number | null;
    status: number;
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
    };
    pattern: {
        id: number;
        name: string;
        short_name: string | null;
    };
    topics: TopicOption[];
}

export interface QuestionOptionFormData {
    text_en: string;
    text_ur: string;
    is_correct: boolean;
}

export interface SourceOption {
    value: string;
    label: string;
}

export interface QuestionFormData {
    question_type_id: string;
    chapter_id: string;
    topic_id: string;
    statement_en: string;
    statement_ur: string;
    description_en: string;
    description_ur: string;
    answer_en: string;
    answer_ur: string;
    source: string;
    status: string;
    options: QuestionOptionFormData[];
    [key: string]: string | QuestionOptionFormData[];
}

interface QuestionFormProps {
    title: string;
    submitLabel: string;
    backHref: string;
    form: InertiaFormProps<QuestionFormData>;
    questionTypes: QuestionTypeOption[];
    chapters: ChapterOption[];
    sourceOptions: SourceOption[];
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    secondarySubmitLabel?: string;
}

const textareaClassName =
    'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[108px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px]';

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

function createEmptyOption(): QuestionOptionFormData {
    return {
        text_en: '',
        text_ur: '',
        is_correct: false,
    };
}

function createDefaultOptions(): QuestionOptionFormData[] {
    return Array.from({ length: 4 }, () => createEmptyOption());
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
        <div className="space-y-1.5">
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
        <section className="space-y-4 rounded-xl border p-5 shadow-sm">
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

export function QuestionForm({
    title,
    submitLabel,
    backHref,
    form,
    questionTypes,
    chapters,
    sourceOptions,
    onSubmit,
    secondarySubmitLabel,
}: QuestionFormProps) {
    const selectedType = useMemo(
        () =>
            questionTypes.find(
                (item) => String(item.id) === form.data.question_type_id,
            ) ?? null,
        [form.data.question_type_id, questionTypes],
    );

    const selectedChapter = useMemo(
        () =>
            chapters.find((item) => String(item.id) === form.data.chapter_id) ??
            null,
        [chapters, form.data.chapter_id],
    );

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

    useEffect(() => {
        if (!selectedType?.is_objective || form.data.options.length > 0) {
            return;
        }

        form.setData('options', createDefaultOptions());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedType?.id, selectedType?.is_objective]);

    useEffect(() => {
        if (!selectedType?.is_objective || !selectedType.is_single) {
            return;
        }

        const firstCorrectIndex = form.data.options.findIndex(
            (option) => option.is_correct,
        );
        const correctCount = form.data.options.filter(
            (option) => option.is_correct,
        ).length;

        if (correctCount <= 1) {
            return;
        }

        form.setData(
            'options',
            form.data.options.map((option, index) => ({
                ...option,
                is_correct: index === firstCorrectIndex,
            })),
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedType?.id, selectedType?.is_single]);

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
            form.setData('chapter_id', '');
            form.setData('topic_id', '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredChapters, selectedChapter]);

    const setOptionValue = (
        index: number,
        key: keyof QuestionOptionFormData,
        value: boolean | string,
    ) => {
        form.setData(
            'options',
            form.data.options.map((option, optionIndex) =>
                optionIndex === index ? { ...option, [key]: value } : option,
            ),
        );
    };

    const toggleCorrectOption = (index: number) => {
        form.setData(
            'options',
            form.data.options.map((option, optionIndex) => ({
                ...option,
                is_correct: selectedType?.is_single
                    ? optionIndex === index
                    : optionIndex === index
                      ? !option.is_correct
                      : option.is_correct,
            })),
        );
    };

    const addOption = () => {
        form.setData('options', [...form.data.options, createEmptyOption()]);
    };

    const removeOption = (index: number) => {
        if (form.data.options.length <= 2) {
            return;
        }

        form.setData(
            'options',
            form.data.options.filter((_, optionIndex) => optionIndex !== index),
        );
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href={backHref}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-input transition-colors hover:bg-accent"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div className="space-y-2">
                        <h1 className="h1-semibold">{title}</h1>
                        <div className="flex flex-wrap gap-2">
                            {selectedType ? (
                                <Badge variant="outline" className="bg-muted">
                                    {selectedType.is_objective
                                        ? 'Objective'
                                        : 'Subjective'}
                                </Badge>
                            ) : null}
                            {selectedType?.is_objective ? (
                                <Badge variant="outline" className="bg-muted">
                                    {selectedType.is_single
                                        ? 'Single'
                                        : 'Multi'}
                                </Badge>
                            ) : null}
                            {selectedChapter ? (
                                <Badge variant="outline" className="bg-muted">
                                    {selectedChapter.subject.name_eng}
                                </Badge>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
                <SectionCard
                    icon={<FileQuestionIcon className="size-4" />}
                    title="Question"
                >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Field
                            label="Question Type"
                            required
                            error={form.errors.question_type_id}
                        >
                            <Select
                                value={form.data.question_type_id || 'none'}
                                onValueChange={(value) =>
                                    form.setData(
                                        'question_type_id',
                                        value === 'none' ? '' : value,
                                    )
                                }
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
                                        >
                                            {item.name}
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
                                onValueChange={(value) =>
                                    form.setData('status', value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Active</SelectItem>
                                    <SelectItem value="0">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
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
                            <Field label="Topic" error={form.errors.topic_id}>
                                <Select
                                    value={form.data.topic_id || 'none'}
                                    disabled={availableTopics.length === 0}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'topic_id',
                                            value === 'none' ? '' : value,
                                        )
                                    }
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

                        <div className="md:col-span-2 xl:col-span-3">
                            <Field label="Source" error={form.errors.source}>
                                <Select
                                    value={form.data.source || 'none'}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'source',
                                            value === 'none' ? '' : value,
                                        )
                                    }
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
                        </div>
                    </div>
                </SectionCard>

                {selectedType?.have_statement ? (
                    <SectionCard
                        icon={<LanguagesIcon className="size-4" />}
                        title={selectedType.statement_label ?? 'Statement'}
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field
                                label="English"
                                required
                                error={form.errors.statement_en}
                            >
                                <textarea
                                    rows={4}
                                    value={form.data.statement_en}
                                    onChange={(event) =>
                                        form.setData(
                                            'statement_en',
                                            event.target.value,
                                        )
                                    }
                                    className={textareaClassName}
                                />
                            </Field>

                            <Field
                                label="Urdu"
                                error={form.errors.statement_ur}
                            >
                                <textarea
                                    dir="rtl"
                                    rows={4}
                                    value={form.data.statement_ur}
                                    onChange={(event) =>
                                        form.setData(
                                            'statement_ur',
                                            event.target.value,
                                        )
                                    }
                                    className={textareaClassName}
                                />
                            </Field>
                        </div>
                    </SectionCard>
                ) : null}

                {selectedType?.have_description ? (
                    <SectionCard
                        icon={<LanguagesIcon className="size-4" />}
                        title={selectedType.description_label ?? 'Description'}
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field
                                label="English"
                                required
                                error={form.errors.description_en}
                            >
                                <textarea
                                    rows={4}
                                    value={form.data.description_en}
                                    onChange={(event) =>
                                        form.setData(
                                            'description_en',
                                            event.target.value,
                                        )
                                    }
                                    className={textareaClassName}
                                />
                            </Field>

                            <Field
                                label="Urdu"
                                error={form.errors.description_ur}
                            >
                                <textarea
                                    dir="rtl"
                                    rows={4}
                                    value={form.data.description_ur}
                                    onChange={(event) =>
                                        form.setData(
                                            'description_ur',
                                            event.target.value,
                                        )
                                    }
                                    className={textareaClassName}
                                />
                            </Field>
                        </div>
                    </SectionCard>
                ) : null}

                {!selectedType?.is_objective && selectedType?.have_answer ? (
                    <SectionCard
                        icon={<ShieldCheckIcon className="size-4" />}
                        title="Answer"
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field
                                label="English"
                                required
                                error={form.errors.answer_en}
                            >
                                <textarea
                                    rows={4}
                                    value={form.data.answer_en}
                                    onChange={(event) =>
                                        form.setData(
                                            'answer_en',
                                            event.target.value,
                                        )
                                    }
                                    className={textareaClassName}
                                />
                            </Field>

                            <Field label="Urdu" error={form.errors.answer_ur}>
                                <textarea
                                    dir="rtl"
                                    rows={4}
                                    value={form.data.answer_ur}
                                    onChange={(event) =>
                                        form.setData(
                                            'answer_ur',
                                            event.target.value,
                                        )
                                    }
                                    className={textareaClassName}
                                />
                            </Field>
                        </div>
                    </SectionCard>
                ) : null}

                {selectedType?.is_objective ? (
                    <SectionCard
                        icon={<ListChecksIcon className="size-4" />}
                        title="Options"
                    >
                        <div className="space-y-3">
                            {form.errors.options ? (
                                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
                                    {form.errors.options}
                                </div>
                            ) : null}

                            {form.data.options.map((option, index) => (
                                <div
                                    key={`option-${index}`}
                                    className="rounded-xl border p-4"
                                >
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                                {String.fromCharCode(
                                                    65 + index,
                                                )}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleCorrectOption(index)
                                                }
                                                className={cn(
                                                    'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                                                    option.is_correct
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-muted text-muted-foreground',
                                                )}
                                            >
                                                {option.is_correct ? (
                                                    <CheckCircle2Icon className="size-3.5" />
                                                ) : (
                                                    <CircleIcon className="size-3.5" />
                                                )}
                                                Correct
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => removeOption(index)}
                                            disabled={
                                                form.data.options.length <= 2
                                            }
                                            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <Trash2Icon className="size-4" />
                                        </button>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <Field label="English">
                                            <Input
                                                value={option.text_en}
                                                onChange={(event) =>
                                                    setOptionValue(
                                                        index,
                                                        'text_en',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </Field>

                                        <Field label="Urdu">
                                            <Input
                                                dir="rtl"
                                                value={option.text_ur}
                                                onChange={(event) =>
                                                    setOptionValue(
                                                        index,
                                                        'text_ur',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </Field>
                                    </div>
                                </div>
                            ))}

                            <Button
                                type="button"
                                variant="outline"
                                onClick={addOption}
                            >
                                <CirclePlusIcon className="size-4" />
                                Add Option
                            </Button>
                        </div>
                    </SectionCard>
                ) : null}

                <div className="flex items-center justify-end gap-3 pb-2">
                    <Button asChild variant="outline">
                        <Link href={backHref}>Cancel</Link>
                    </Button>
                    {secondarySubmitLabel ? (
                        <Button
                            type="submit"
                            value="save-and-add-new"
                            variant="outline"
                            disabled={
                                form.processing ||
                                !selectedType ||
                                !selectedChapter
                            }
                        >
                            <CirclePlusIcon className="size-4" />
                            {form.processing
                                ? 'Saving...'
                                : secondarySubmitLabel}
                        </Button>
                    ) : null}
                    <Button
                        type="submit"
                        disabled={
                            form.processing || !selectedType || !selectedChapter
                        }
                    >
                        <FileQuestionIcon className="size-4" />
                        {form.processing ? 'Saving...' : submitLabel}
                    </Button>
                </div>
            </form>
        </div>
    );
}

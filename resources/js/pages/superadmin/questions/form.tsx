import { Link } from '@inertiajs/react';
import type { InertiaFormProps } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CheckCircle2Icon,
    CirclePlusIcon,
    FileQuestionIcon,
    ScrollTextIcon,
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
import { Switch } from '@/components/ui/switch';

export interface QuestionSchemaOption {
    key: string;
    kind: 'objective' | 'subjective';
    label: string;
    description: string;
    settings: {
        supports_answer_toggle: boolean;
        supports_single_toggle: boolean;
    };
}

export interface QuestionTypeOption {
    id: number;
    name: string;
    heading_en: string;
    is_objective: boolean;
    is_single: boolean;
    have_answer: boolean;
    supports_simple_import: boolean;
    schema_key: string;
    schema: QuestionSchemaOption;
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

export interface QuestionItemFormData {
    prompt_en: string;
    prompt_ur: string;
    answer_en: string;
    answer_ur: string;
    options: QuestionOptionFormData[];
}

export interface QuestionPairFormData {
    left_en: string;
    left_ur: string;
    right_en: string;
    right_ur: string;
}

export interface QuestionContentFormData {
    prompt_en: string;
    prompt_ur: string;
    guidance_en: string;
    guidance_ur: string;
    answer_en: string;
    answer_ur: string;
    passage_en: string;
    passage_ur: string;
    intro_en: string;
    intro_ur: string;
    correct_boolean: string;
    options: QuestionOptionFormData[];
    items: QuestionItemFormData[];
    pairs: QuestionPairFormData[];
}

export interface SourceOption {
    value: string;
    label: string;
}

export interface QuestionFormData {
    question_type_id: string;
    chapter_id: string;
    topic_id: string;
    source: string;
    status: string;
    content: QuestionContentFormData;
    [key: string]: QuestionContentFormData | string;
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

const textareaClassName =
    'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[108px] w-full rounded-xl border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px]';

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

function createEmptyItem(): QuestionItemFormData {
    return {
        prompt_en: '',
        prompt_ur: '',
        answer_en: '',
        answer_ur: '',
        options: createDefaultOptions(),
    };
}

function createEmptyPair(): QuestionPairFormData {
    return {
        left_en: '',
        left_ur: '',
        right_en: '',
        right_ur: '',
    };
}

export function createEmptyQuestionContent(
    schemaKey = 'subjective_standard',
): QuestionContentFormData {
    return {
        prompt_en: '',
        prompt_ur: '',
        guidance_en: '',
        guidance_ur: '',
        answer_en: '',
        answer_ur: '',
        passage_en: '',
        passage_ur: '',
        intro_en: '',
        intro_ur: '',
        correct_boolean: '',
        options:
            schemaKey === 'objective_true_false' ? [] : createDefaultOptions(),
        items:
            schemaKey === 'objective_passage_mcq' ||
            schemaKey === 'subjective_grouped'
                ? [createEmptyItem()]
                : [],
        pairs: schemaKey === 'subjective_pairs' ? [createEmptyPair()] : [],
    };
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
        <section className="w-full min-w-0 space-y-4 rounded-2xl border border-primary/10 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {icon}
                </span>
                <h3 className="text-sm font-semibold">{title}</h3>
            </div>
            <Separator />
            {children}
        </section>
    );
}

function BuilderCard({
    actions,
    children,
    title,
}: {
    actions?: ReactNode;
    children: ReactNode;
    title: string;
}) {
    return (
        <div className="w-full min-w-0 space-y-4 rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{title}</p>
                {actions}
            </div>
            {children}
        </div>
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
    const selectedSchema = selectedType?.schema ?? null;

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
    const [lastSchemaKey, setLastSchemaKey] = useState(
        selectedType?.schema_key ?? '',
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
        if (!selectedType?.schema_key) {
            return;
        }

        if (selectedType.schema_key === lastSchemaKey) {
            return;
        }

        form.setData('content', createEmptyQuestionContent(selectedType.schema_key));
        setLastSchemaKey(selectedType.schema_key);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedType?.schema_key]);

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

    const errorFor = (path: string) =>
        form.errors[path as keyof typeof form.errors] as string | undefined;

    const setContentValue = (key: keyof QuestionContentFormData, value: unknown) =>
        form.setData('content', {
            ...form.data.content,
            [key]: value,
        });

    const setOptionValue = (
        index: number,
        key: keyof QuestionOptionFormData,
        value: boolean | string,
    ) => {
        setContentValue(
            'options',
            form.data.content.options.map((option, optionIndex) =>
                optionIndex === index ? { ...option, [key]: value } : option,
            ),
        );
    };

    const toggleOptionCorrect = (index: number) => {
        setContentValue(
            'options',
            form.data.content.options.map((option, optionIndex) => ({
                ...option,
                is_correct: selectedType?.is_single
                    ? optionIndex === index
                    : optionIndex === index
                      ? !option.is_correct
                      : option.is_correct,
            })),
        );
    };

    const addOption = () =>
        setContentValue('options', [
            ...form.data.content.options,
            createEmptyOption(),
        ]);

    const removeOption = (index: number) => {
        if (form.data.content.options.length <= 2) {
            return;
        }

        setContentValue(
            'options',
            form.data.content.options.filter((_, optionIndex) => optionIndex !== index),
        );
    };

    const updateItem = (
        index: number,
        value: Partial<QuestionItemFormData>,
    ) => {
        setContentValue(
            'items',
            form.data.content.items.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...value } : item,
            ),
        );
    };

    const addItem = () =>
        setContentValue('items', [...form.data.content.items, createEmptyItem()]);

    const removeItem = (index: number) => {
        if (form.data.content.items.length <= 1) {
            return;
        }

        setContentValue(
            'items',
            form.data.content.items.filter((_, itemIndex) => itemIndex !== index),
        );
    };

    const setItemOptionValue = (
        itemIndex: number,
        optionIndex: number,
        key: keyof QuestionOptionFormData,
        value: boolean | string,
    ) => {
        updateItem(itemIndex, {
            options: form.data.content.items[itemIndex].options.map(
                (option, currentIndex) =>
                    currentIndex === optionIndex
                        ? { ...option, [key]: value }
                        : option,
            ),
        });
    };

    const toggleItemOptionCorrect = (itemIndex: number, optionIndex: number) => {
        updateItem(itemIndex, {
            options: form.data.content.items[itemIndex].options.map(
                (option, currentIndex) => ({
                    ...option,
                    is_correct: selectedType?.is_single
                        ? currentIndex === optionIndex
                        : currentIndex === optionIndex
                          ? !option.is_correct
                          : option.is_correct,
                }),
            ),
        });
    };

    const addItemOption = (itemIndex: number) =>
        updateItem(itemIndex, {
            options: [
                ...form.data.content.items[itemIndex].options,
                createEmptyOption(),
            ],
        });

    const removeItemOption = (itemIndex: number, optionIndex: number) => {
        if (form.data.content.items[itemIndex].options.length <= 2) {
            return;
        }

        updateItem(itemIndex, {
            options: form.data.content.items[itemIndex].options.filter(
                (_, index) => index !== optionIndex,
            ),
        });
    };

    const updatePair = (
        index: number,
        value: Partial<QuestionPairFormData>,
    ) => {
        setContentValue(
            'pairs',
            form.data.content.pairs.map((pair, pairIndex) =>
                pairIndex === index ? { ...pair, ...value } : pair,
            ),
        );
    };

    const addPair = () =>
        setContentValue('pairs', [...form.data.content.pairs, createEmptyPair()]);

    const removePair = (index: number) => {
        if (form.data.content.pairs.length <= 1) {
            return;
        }

        setContentValue(
            'pairs',
            form.data.content.pairs.filter((_, pairIndex) => pairIndex !== index),
        );
    };

    const renderLocalizedEditor = (
        title: string,
        englishKey: keyof QuestionContentFormData,
        urduKey: keyof QuestionContentFormData,
        required = false,
        control: 'textarea' | 'input' = 'textarea',
    ) => (
        <BuilderCard title={title}>
            <div className="grid gap-4 md:grid-cols-2">
                <Field
                    label="English"
                    required={required}
                    error={errorFor(`content.${String(englishKey)}`)}
                >
                    {control === 'input' ? (
                        <Input
                            value={String(form.data.content[englishKey] ?? '')}
                            onChange={(event) =>
                                setContentValue(englishKey, event.target.value)
                            }
                        />
                    ) : (
                        <textarea
                            rows={4}
                            value={String(form.data.content[englishKey] ?? '')}
                            onChange={(event) =>
                                setContentValue(englishKey, event.target.value)
                            }
                            className={textareaClassName}
                        />
                    )}
                </Field>

                <Field
                    label="Urdu"
                    error={errorFor(`content.${String(urduKey)}`)}
                >
                    {control === 'input' ? (
                        <Input
                            dir="rtl"
                            value={String(form.data.content[urduKey] ?? '')}
                            onChange={(event) =>
                                setContentValue(urduKey, event.target.value)
                            }
                        />
                    ) : (
                        <textarea
                            dir="rtl"
                            rows={4}
                            value={String(form.data.content[urduKey] ?? '')}
                            onChange={(event) =>
                                setContentValue(urduKey, event.target.value)
                            }
                            className={textareaClassName}
                        />
                    )}
                </Field>
            </div>
        </BuilderCard>
    );

    const renderOptionsEditor = (
        options: QuestionOptionFormData[],
        onOptionValue: (
            index: number,
            key: keyof QuestionOptionFormData,
            value: boolean | string,
        ) => void,
        onToggleCorrect: (index: number) => void,
        onAdd: () => void,
        onRemove: (index: number) => void,
        prefix = 'content.options',
    ) => (
        <BuilderCard
            title="Answer Options"
            actions={
                <Button type="button" variant="outline" onClick={onAdd}>
                    <CirclePlusIcon className="size-4" />
                    Add option
                </Button>
            }
        >
            <div className="space-y-4">
                {options.map((option, index) => (
                    <div
                        key={`${prefix}-${index}`}
                        className="rounded-2xl border border-border/70 bg-muted/20 p-4"
                    >
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline">
                                    Option {index + 1}
                                </Badge>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-medium">Correct</span>
                                    <Switch
                                        checked={option.is_correct}
                                        onCheckedChange={() =>
                                            onToggleCorrect(index)
                                        }
                                    />
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => onRemove(index)}
                            >
                                <Trash2Icon className="size-4" />
                            </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Field
                                label="English"
                                error={errorFor(`${prefix}.${index}.text_en`)}
                            >
                                <Input
                                    value={option.text_en}
                                    onChange={(event) =>
                                        onOptionValue(
                                            index,
                                            'text_en',
                                            event.target.value,
                                        )
                                    }
                                />
                            </Field>
                            <Field
                                label="Urdu"
                                error={errorFor(`${prefix}.${index}.text_ur`)}
                            >
                                <Input
                                    dir="rtl"
                                    value={option.text_ur}
                                    onChange={(event) =>
                                        onOptionValue(
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
                {errorFor(prefix) ? (
                    <p className="text-xs text-destructive">
                        {errorFor(prefix)}
                    </p>
                ) : null}
            </div>
        </BuilderCard>
    );

    const renderPassageItems = () => (
        <BuilderCard
            title="Passage Questions"
            actions={
                <Button type="button" variant="outline" onClick={addItem}>
                    <CirclePlusIcon className="size-4" />
                    Add sub-question
                </Button>
            }
        >
            <div className="space-y-5">
                {form.data.content.items.map((item, itemIndex) => (
                    <div
                        key={`passage-item-${itemIndex}`}
                        className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <Badge variant="outline">
                                Sub-question {itemIndex + 1}
                            </Badge>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(itemIndex)}
                            >
                                <Trash2Icon className="size-4" />
                            </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Field
                                label="Question (English)"
                                required
                                error={errorFor(
                                    `content.items.${itemIndex}.prompt_en`,
                                )}
                            >
                                <textarea
                                    rows={3}
                                    value={item.prompt_en}
                                    onChange={(event) =>
                                        updateItem(itemIndex, {
                                            prompt_en: event.target.value,
                                        })
                                    }
                                    className={textareaClassName}
                                />
                            </Field>
                            <Field
                                label="Question (Urdu)"
                                error={errorFor(
                                    `content.items.${itemIndex}.prompt_ur`,
                                )}
                            >
                                <textarea
                                    dir="rtl"
                                    rows={3}
                                    value={item.prompt_ur}
                                    onChange={(event) =>
                                        updateItem(itemIndex, {
                                            prompt_ur: event.target.value,
                                        })
                                    }
                                    className={textareaClassName}
                                />
                            </Field>
                        </div>

                        {renderOptionsEditor(
                            item.options,
                            (optionIndex, key, value) =>
                                setItemOptionValue(
                                    itemIndex,
                                    optionIndex,
                                    key,
                                    value,
                                ),
                            (optionIndex) =>
                                toggleItemOptionCorrect(itemIndex, optionIndex),
                            () => addItemOption(itemIndex),
                            (optionIndex) =>
                                removeItemOption(itemIndex, optionIndex),
                            `content.items.${itemIndex}.options`,
                        )}
                    </div>
                ))}
                {errorFor('content.items') ? (
                    <p className="text-xs text-destructive">
                        {errorFor('content.items')}
                    </p>
                ) : null}
            </div>
        </BuilderCard>
    );

    const renderGroupedItems = () => (
        <BuilderCard
            title="Question Items"
            actions={
                <Button type="button" variant="outline" onClick={addItem}>
                    <CirclePlusIcon className="size-4" />
                    Add item
                </Button>
            }
        >
            <div className="space-y-5">
                {form.data.content.items.map((item, itemIndex) => (
                    <div
                        key={`group-item-${itemIndex}`}
                        className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <Badge variant="outline">Item {itemIndex + 1}</Badge>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(itemIndex)}
                            >
                                <Trash2Icon className="size-4" />
                            </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Field
                                label="Prompt (English)"
                                required
                                error={errorFor(
                                    `content.items.${itemIndex}.prompt_en`,
                                )}
                            >
                                <textarea
                                    rows={3}
                                    value={item.prompt_en}
                                    onChange={(event) =>
                                        updateItem(itemIndex, {
                                            prompt_en: event.target.value,
                                        })
                                    }
                                    className={textareaClassName}
                                />
                            </Field>
                            <Field
                                label="Prompt (Urdu)"
                                error={errorFor(
                                    `content.items.${itemIndex}.prompt_ur`,
                                )}
                            >
                                <textarea
                                    dir="rtl"
                                    rows={3}
                                    value={item.prompt_ur}
                                    onChange={(event) =>
                                        updateItem(itemIndex, {
                                            prompt_ur: event.target.value,
                                        })
                                    }
                                    className={textareaClassName}
                                />
                            </Field>
                        </div>

                        {selectedType?.have_answer ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field
                                    label="Answer (English)"
                                    error={errorFor(
                                        `content.items.${itemIndex}.answer_en`,
                                    )}
                                >
                                    <Input
                                        value={item.answer_en}
                                        onChange={(event) =>
                                            updateItem(itemIndex, {
                                                answer_en: event.target.value,
                                            })
                                        }
                                    />
                                </Field>
                                <Field
                                    label="Answer (Urdu)"
                                    error={errorFor(
                                        `content.items.${itemIndex}.answer_ur`,
                                    )}
                                >
                                    <Input
                                        dir="rtl"
                                        value={item.answer_ur}
                                        onChange={(event) =>
                                            updateItem(itemIndex, {
                                                answer_ur: event.target.value,
                                            })
                                        }
                                    />
                                </Field>
                            </div>
                        ) : null}
                    </div>
                ))}
                {errorFor('content.items') ? (
                    <p className="text-xs text-destructive">
                        {errorFor('content.items')}
                    </p>
                ) : null}
            </div>
        </BuilderCard>
    );

    const renderPairs = () => (
        <BuilderCard
            title="Pair Rows"
            actions={
                <Button type="button" variant="outline" onClick={addPair}>
                    <CirclePlusIcon className="size-4" />
                    Add pair
                </Button>
            }
        >
            <div className="space-y-4">
                {form.data.content.pairs.map((pair, pairIndex) => (
                    <div
                        key={`pair-${pairIndex}`}
                        className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <Badge variant="outline">Pair {pairIndex + 1}</Badge>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removePair(pairIndex)}
                            >
                                <Trash2Icon className="size-4" />
                            </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Field
                                label="Left (English)"
                                error={errorFor(
                                    `content.pairs.${pairIndex}.left_en`,
                                )}
                            >
                                <Input
                                    value={pair.left_en}
                                    onChange={(event) =>
                                        updatePair(pairIndex, {
                                            left_en: event.target.value,
                                        })
                                    }
                                />
                            </Field>
                            <Field
                                label="Left (Urdu)"
                                error={errorFor(
                                    `content.pairs.${pairIndex}.left_ur`,
                                )}
                            >
                                <Input
                                    dir="rtl"
                                    value={pair.left_ur}
                                    onChange={(event) =>
                                        updatePair(pairIndex, {
                                            left_ur: event.target.value,
                                        })
                                    }
                                />
                            </Field>
                            <Field
                                label="Right (English)"
                                error={errorFor(
                                    `content.pairs.${pairIndex}.right_en`,
                                )}
                            >
                                <Input
                                    value={pair.right_en}
                                    onChange={(event) =>
                                        updatePair(pairIndex, {
                                            right_en: event.target.value,
                                        })
                                    }
                                />
                            </Field>
                            <Field
                                label="Right (Urdu)"
                                error={errorFor(
                                    `content.pairs.${pairIndex}.right_ur`,
                                )}
                            >
                                <Input
                                    dir="rtl"
                                    value={pair.right_ur}
                                    onChange={(event) =>
                                        updatePair(pairIndex, {
                                            right_ur: event.target.value,
                                        })
                                    }
                                />
                            </Field>
                        </div>
                    </div>
                ))}
                {errorFor('content.pairs') ? (
                    <p className="text-xs text-destructive">
                        {errorFor('content.pairs')}
                    </p>
                ) : null}
            </div>
        </BuilderCard>
    );

    const renderSchemaBuilder = () => {
        if (!selectedSchema) {
            return null;
        }

        switch (selectedSchema.key) {
            case 'objective_mcq':
            case 'objective_blank_choice':
                return (
                    <div className="space-y-5">
                        {renderLocalizedEditor(
                            selectedSchema.key === 'objective_blank_choice'
                                ? 'Blank Statement'
                                : 'Question Statement',
                            'prompt_en',
                            'prompt_ur',
                            true,
                        )}
                        {renderOptionsEditor(
                            form.data.content.options,
                            setOptionValue,
                            toggleOptionCorrect,
                            addOption,
                            removeOption,
                        )}
                    </div>
                );
            case 'objective_true_false':
                return (
                    <div className="space-y-5">
                        {renderLocalizedEditor(
                            'Statement',
                            'prompt_en',
                            'prompt_ur',
                            true,
                        )}
                        <BuilderCard title="Correct Answer">
                            <Field
                                label="Result"
                                required
                                error={errorFor('content.correct_boolean')}
                            >
                                <Select
                                    value={
                                        form.data.content.correct_boolean || 'none'
                                    }
                                    onValueChange={(value) =>
                                        setContentValue(
                                            'correct_boolean',
                                            value === 'none' ? '' : value,
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select answer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            Select answer
                                        </SelectItem>
                                        <SelectItem value="true">True</SelectItem>
                                        <SelectItem value="false">False</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                        </BuilderCard>
                    </div>
                );
            case 'objective_blank_open':
                return (
                    <div className="space-y-5">
                        {renderLocalizedEditor(
                            'Blank Statement',
                            'prompt_en',
                            'prompt_ur',
                            true,
                        )}
                        {renderLocalizedEditor(
                            'Correct Answer',
                            'answer_en',
                            'answer_ur',
                            true,
                            'input',
                        )}
                    </div>
                );
            case 'objective_passage_mcq':
                return (
                    <div className="space-y-5">
                        {renderLocalizedEditor(
                            'Passage',
                            'passage_en',
                            'passage_ur',
                            true,
                        )}
                        {renderPassageItems()}
                    </div>
                );
            case 'subjective_grouped':
                return (
                    <div className="space-y-5">
                        {renderLocalizedEditor(
                            'Shared Instructions',
                            'intro_en',
                            'intro_ur',
                            false,
                        )}
                        {renderGroupedItems()}
                    </div>
                );
            case 'subjective_pairs':
                return (
                    <div className="space-y-5">
                        {renderLocalizedEditor(
                            'Instructions',
                            'prompt_en',
                            'prompt_ur',
                            false,
                        )}
                        {renderPairs()}
                    </div>
                );
            default:
                return (
                    <div className="space-y-5">
                        {renderLocalizedEditor(
                            'Question',
                            'prompt_en',
                            'prompt_ur',
                            true,
                        )}
                        {selectedType?.have_answer
                            ? renderLocalizedEditor(
                                  'Answer',
                                  'answer_en',
                                  'answer_ur',
                                  true,
                              )
                            : null}
                    </div>
                );
        }
    };

    return (
        <div className="mx-auto w-full max-w-6xl min-w-0 space-y-6 p-4 md:p-6">
            <div className="flex min-w-0 items-center gap-4">
                <Link
                    href={backHref}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-input transition-colors hover:bg-accent"
                >
                    <ArrowLeftIcon className="size-4" />
                </Link>
                <div>
                    <h1 className="h1-semibold">{title}</h1>
                </div>
            </div>

            <form onSubmit={onSubmit} className="w-full min-w-0 space-y-5">
                <SectionCard
                    icon={<FileQuestionIcon className="size-4" />}
                    title="Setup"
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
                                <SelectContent className="max-h-80">
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

                {selectedType ? (
                    <SectionCard
                        icon={<ScrollTextIcon className="size-4" />}
                        title="Builder"
                    >
                        {renderSchemaBuilder()}
                    </SectionCard>
                ) : null}

                <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:justify-end">
                    <Button asChild variant="outline">
                        <Link href={backHref}>Cancel</Link>
                    </Button>
                    {secondarySubmitLabel ? (
                        <Button
                            type="submit"
                            variant="outline"
                            name="save_and_add_new"
                            value="save-and-add-new"
                            disabled={form.processing}
                        >
                            <CirclePlusIcon className="size-4" />
                            {secondarySubmitLabel}
                        </Button>
                    ) : null}
                    <Button type="submit" disabled={form.processing}>
                        <CheckCircle2Icon className="size-4" />
                        {form.processing ? 'Saving...' : submitLabel}
                    </Button>
                </div>
            </form>
        </div>
    );
}

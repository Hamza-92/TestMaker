import { Link } from '@inertiajs/react';
import type { InertiaFormProps } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CheckCircle2Icon,
    CirclePlusIcon,
    Trash2Icon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
    group_name: string | null;
    group_heading: string | null;
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
    lockedChapterId?: number | null;
    lockedTopicId?: number | null;
}

const textareaClassName =
    'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-xl border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px] resize-none overflow-hidden';

function AutoTextarea({
    value,
    onChange,
    dir,
}: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    dir?: string;
}) {
    const ref = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }, [value]);

    return (
        <textarea
            ref={ref}
            rows={1}
            value={value}
            onChange={onChange}
            dir={dir}
            className={textareaClassName}
        />
    );
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


function chapterTitle(chapter: ChapterOption) {
    const title = chapter.chapter_number
        ? `Chapter ${chapter.chapter_number}`
        : chapter.name;

    return chapter.group_name ? `${chapter.group_name} / ${title}` : title;
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
    lockedChapterId,
    lockedTopicId,
}: QuestionFormProps) {
    const isChapterLocked =
        lockedChapterId !== null && lockedChapterId !== undefined;
    const isTopicLocked = lockedTopicId !== null && lockedTopicId !== undefined;
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

    const [lastSchemaKey, setLastSchemaKey] = useState(
        selectedType?.schema_key ?? '',
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

        form.setData(
            'content',
            createEmptyQuestionContent(selectedType.schema_key),
        );
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

    const errorFor = (path: string) =>
        form.errors[path as keyof typeof form.errors] as string | undefined;

    const setContentValue = (
        key: keyof QuestionContentFormData,
        value: unknown,
    ) =>
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
                is_correct: optionIndex === index,
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
            form.data.content.options.filter(
                (_, optionIndex) => optionIndex !== index,
            ),
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
        setContentValue('items', [
            ...form.data.content.items,
            createEmptyItem(),
        ]);

    const removeItem = (index: number) => {
        if (form.data.content.items.length <= 1) {
            return;
        }

        setContentValue(
            'items',
            form.data.content.items.filter(
                (_, itemIndex) => itemIndex !== index,
            ),
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

    const toggleItemOptionCorrect = (
        itemIndex: number,
        optionIndex: number,
    ) => {
        updateItem(itemIndex, {
            options: form.data.content.items[itemIndex].options.map(
                (option, currentIndex) => ({
                    ...option,
                    is_correct: currentIndex === optionIndex,
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
        setContentValue('pairs', [
            ...form.data.content.pairs,
            createEmptyPair(),
        ]);

    const removePair = (index: number) => {
        if (form.data.content.pairs.length <= 1) {
            return;
        }

        setContentValue(
            'pairs',
            form.data.content.pairs.filter(
                (_, pairIndex) => pairIndex !== index,
            ),
        );
    };

    const renderLocalizedEditor = (
        englishKey: keyof QuestionContentFormData,
        urduKey: keyof QuestionContentFormData,
        required = false,
        control: 'textarea' | 'input' = 'textarea',
    ) => (
        <div className="grid gap-3 sm:grid-cols-2">
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
                        <AutoTextarea
                            value={String(form.data.content[englishKey] ?? '')}
                            onChange={(event) =>
                                setContentValue(englishKey, event.target.value)
                            }
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
                        <AutoTextarea
                            dir="rtl"
                            value={String(form.data.content[urduKey] ?? '')}
                            onChange={(event) =>
                                setContentValue(urduKey, event.target.value)
                            }
                        />
                    )}
                </Field>
            </div>
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
        <div className="space-y-2">
            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onAdd}
                >
                    <CirclePlusIcon className="size-3.5" />
                    Add option
                </Button>
            </div>
            <div className="overflow-hidden rounded-xl border">
                {/* Header */}
                <div
                    className="grid items-center border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground"
                    style={{ gridTemplateColumns: '2rem 1fr 1fr 4.5rem 2rem' }}
                >
                    <span>#</span>
                    <span>Option (English)</span>
                    <span>Option (Urdu)</span>
                    <span className="text-center">Correct</span>
                    <span />
                </div>

                {/* Rows */}
                {options.map((option, index) => (
                    <div
                        key={`${prefix}-${index}`}
                        className={`grid items-start gap-2 px-3 py-2${index !== 0 ? 'border-t' : ''}`}
                        style={{
                            gridTemplateColumns: '2rem 1fr 1fr 4.5rem 2rem',
                        }}
                    >
                        <span className="pt-2 text-xs font-semibold text-muted-foreground">
                            {String.fromCharCode(65 + index)}
                        </span>

                        <div className="min-w-0">
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
                            {errorFor(`${prefix}.${index}.text_en`) && (
                                <p className="mt-1 text-xs text-destructive">
                                    {errorFor(`${prefix}.${index}.text_en`)}
                                </p>
                            )}
                        </div>

                        <div className="min-w-0">
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
                            {errorFor(`${prefix}.${index}.text_ur`) && (
                                <p className="mt-1 text-xs text-destructive">
                                    {errorFor(`${prefix}.${index}.text_ur`)}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-center pt-2.5">
                            <input
                                type="radio"
                                name={prefix}
                                checked={option.is_correct}
                                onChange={() => onToggleCorrect(index)}
                                className="size-4 cursor-pointer accent-primary"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => onRemove(index)}
                            className="mt-1.5 rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                        >
                            <Trash2Icon className="size-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            {errorFor(prefix) && (
                <p className="text-xs text-destructive">{errorFor(prefix)}</p>
            )}
        </div>
    );

    const renderPassageItems = () => (
        <div className="space-y-3">
            <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <CirclePlusIcon className="size-3.5" />
                    Add sub-question
                </Button>
            </div>
            <div className="space-y-3">
                {form.data.content.items.map((item, itemIndex) => (
                    <div
                        key={`passage-item-${itemIndex}`}
                        className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3"
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

                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field
                                label="Question (English)"
                                required
                                error={errorFor(
                                    `content.items.${itemIndex}.prompt_en`,
                                )}
                            >
                                <AutoTextarea
                                    value={item.prompt_en}
                                    onChange={(event) =>
                                        updateItem(itemIndex, {
                                            prompt_en: event.target.value,
                                        })
                                    }
                                />
                            </Field>
                            <Field
                                label="Question (Urdu)"
                                error={errorFor(
                                    `content.items.${itemIndex}.prompt_ur`,
                                )}
                            >
                                <AutoTextarea
                                    dir="rtl"
                                    value={item.prompt_ur}
                                    onChange={(event) =>
                                        updateItem(itemIndex, {
                                            prompt_ur: event.target.value,
                                        })
                                    }
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
        </div>
    );

    const renderGroupedItems = () => (
        <div className="space-y-3">
            <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <CirclePlusIcon className="size-3.5" />
                    Add item
                </Button>
            </div>
            <div className="space-y-3">
                {form.data.content.items.map((item, itemIndex) => (
                    <div
                        key={`group-item-${itemIndex}`}
                        className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <Badge variant="outline">
                                Item {itemIndex + 1}
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

                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field
                                label="Prompt (English)"
                                required
                                error={errorFor(
                                    `content.items.${itemIndex}.prompt_en`,
                                )}
                            >
                                <AutoTextarea
                                    value={item.prompt_en}
                                    onChange={(event) =>
                                        updateItem(itemIndex, {
                                            prompt_en: event.target.value,
                                        })
                                    }
                                />
                            </Field>
                            <Field
                                label="Prompt (Urdu)"
                                error={errorFor(
                                    `content.items.${itemIndex}.prompt_ur`,
                                )}
                            >
                                <AutoTextarea
                                    dir="rtl"
                                    value={item.prompt_ur}
                                    onChange={(event) =>
                                        updateItem(itemIndex, {
                                            prompt_ur: event.target.value,
                                        })
                                    }
                                />
                            </Field>
                        </div>

                        {selectedType?.have_answer ? (
                            <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
    );

    const renderPairs = () => (
        <div className="space-y-3">
            <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={addPair}>
                    <CirclePlusIcon className="size-3.5" />
                    Add pair
                </Button>
            </div>
            <div className="space-y-3">
                {form.data.content.pairs.map((pair, pairIndex) => (
                    <div
                        key={`pair-${pairIndex}`}
                        className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <Badge variant="outline">
                                Pair {pairIndex + 1}
                            </Badge>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removePair(pairIndex)}
                            >
                                <Trash2Icon className="size-4" />
                            </Button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
    );

    const renderSchemaBuilder = () => {
        if (!selectedSchema) {
            return null;
        }

        switch (selectedSchema.key) {
            case 'objective_mcq':
            case 'objective_blank_choice':
                return (
                    <div className="space-y-4">
                        {renderLocalizedEditor('prompt_en', 'prompt_ur', true)}
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
                    <div className="space-y-4">
                        {renderLocalizedEditor('prompt_en', 'prompt_ur', true)}
                        <Field
                            label="Correct Answer"
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
                                <SelectTrigger className="w-full sm:w-48">
                                    <SelectValue placeholder="Select answer" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Select answer</SelectItem>
                                    <SelectItem value="true">True</SelectItem>
                                    <SelectItem value="false">False</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>
                );
            case 'objective_blank_open':
                return (
                    <div className="space-y-4">
                        {renderLocalizedEditor('prompt_en', 'prompt_ur', true)}
                        {renderLocalizedEditor('answer_en', 'answer_ur', true, 'input')}
                    </div>
                );
            case 'objective_passage_mcq':
                return (
                    <div className="space-y-4">
                        {renderLocalizedEditor('passage_en', 'passage_ur', true)}
                        {renderPassageItems()}
                    </div>
                );
            case 'subjective_grouped':
                return (
                    <div className="space-y-4">
                        {renderLocalizedEditor('intro_en', 'intro_ur')}
                        {renderGroupedItems()}
                    </div>
                );
            case 'subjective_pairs':
                return (
                    <div className="space-y-4">
                        {renderLocalizedEditor('prompt_en', 'prompt_ur')}
                        {renderPairs()}
                    </div>
                );
            default:
                return (
                    <div className="space-y-4">
                        {renderLocalizedEditor('prompt_en', 'prompt_ur', true)}
                        {selectedType?.have_answer
                            ? renderLocalizedEditor('answer_en', 'answer_ur', true)
                            : null}
                    </div>
                );
        }
    };

    return (
        <div className="w-full min-w-0 space-y-6 p-4 md:p-6">
            <div className="flex min-w-0 items-center gap-4">
                <Link
                    href={backHref}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-input transition-colors hover:bg-accent"
                >
                    <ArrowLeftIcon className="size-4" />
                </Link>
                <h1 className="h1-semibold">{title}</h1>
            </div>

            <form onSubmit={onSubmit} className="w-full min-w-0 space-y-4">
                <section className="w-full min-w-0 space-y-4 rounded-2xl border border-primary/10 bg-card p-4 shadow-sm">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

                        {!isChapterLocked && (
                            <Field
                                label="Chapter"
                                required
                                error={form.errors.chapter_id}
                            >
                                <Select
                                    value={form.data.chapter_id || 'none'}
                                    disabled={chapters.length === 0}
                                    onValueChange={(value) => {
                                        form.setData(
                                            'chapter_id',
                                            value === 'none' ? '' : value,
                                        );
                                        form.setData('topic_id', '');
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue
                                            placeholder={
                                                chapters.length === 0
                                                    ? 'No chapters'
                                                    : 'Select chapter'
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-80">
                                        <SelectItem value="none">
                                            Select chapter
                                        </SelectItem>
                                        {chapters.map((chapter) => (
                                            <SelectItem
                                                key={chapter.id}
                                                value={String(chapter.id)}
                                            >
                                                {chapter.subject.name_eng} —{' '}
                                                {chapterTitle(chapter)} ·{' '}
                                                {chapter.class.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        )}

                        {usesTopicSelection && !isTopicLocked && (
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
                        )}

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
                    </div>

                    {selectedType && (
                        <>
                            <Separator />
                            {renderSchemaBuilder()}
                        </>
                    )}
                </section>

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

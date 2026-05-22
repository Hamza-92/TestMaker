import { Head, router } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    BookOpenIcon,
    CheckIcon,
    FileTextIcon,
    GraduationCapIcon,
    LayersIcon,
    Loader2Icon,
    MinusIcon,
    PlusIcon,
    RotateCcwIcon,
    SearchXIcon,
    Trash2Icon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FloatingCombobox } from '@/components/ui/floating-combobox';
import type { ComboboxOptionItem } from '@/components/ui/floating-combobox';
import { cn } from '@/lib/utils';

interface Pattern {
    id: number;
    name: string;
}

interface PatternClass {
    pattern_id: number;
    id: number;
    name: string;
}

interface ClassSubject {
    pattern_id: number;
    class_id: number;
    subject_id: number;
    name: string;
}

interface Topic {
    id: number;
    name: string;
}

interface Chapter {
    id: number;
    name: string;
    chapter_number: number | null;
    group_name: string | null;
    group_heading: string | null;
    topics: Topic[];
}

interface Props {
    patterns: Pattern[];
    patternClasses: PatternClass[];
    classSubjects: ClassSubject[];
    sourceOptions: SourceOption[];
}

interface SourceOption {
    value: string;
    label: string;
}

type StepState = 'active' | 'done' | 'upcoming';
type FormStep = 'chapters' | 'questions';
type SourceFilterKey = string;
type SectionCategory = 'Objective Questions' | 'Subjective Questions';
type QuestionSectionField =
    | 'requiredQuestions'
    | 'marksPerQuestion'
    | 'choiceQuestions';

interface QuestionSelectionSection {
    id: string;
    questionTypeId: number;
    category: SectionCategory;
    title: string;
    availableCount: number;
    requiredQuestions: string;
    marksPerQuestion: string;
    choiceQuestions: string;
}

interface QuestionSelectionState {
    globalFilters: Record<SourceFilterKey, boolean>;
    sections: QuestionSelectionSection[];
    totalMarks: number;
}

interface QuestionTypeCount {
    id: string;
    questionTypeId: number;
    category: SectionCategory;
    title: string;
    availableCount: number;
}

const CHAPTER_ONLY_SELECTION = -1;

const fallbackSourceOptions: SourceOption[] = [
    { value: 'exercise', label: 'Exercise' },
    { value: 'additional', label: 'Additional' },
    { value: 'past paper', label: 'Past Paper' },
];

function normalizeSourceOptions(sourceOptions: SourceOption[]): SourceOption[] {
    return sourceOptions.length > 0 ? sourceOptions : fallbackSourceOptions;
}

function createGlobalFilters(
    sourceOptions: SourceOption[],
): Record<SourceFilterKey, boolean> {
    return Object.fromEntries(
        sourceOptions.map((source) => [source.value, true]),
    );
}

function pluralize(n: number, one: string, many: string) {
    return n === 1 ? `${n} ${one}` : `${n} ${many}`;
}

function toNumber(value: string): number {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
}

function onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
}

function lineTotal(section: QuestionSelectionSection): number {
    return (
        toNumber(section.requiredQuestions) * toNumber(section.marksPerQuestion)
    );
}

function withTotalMarks(state: QuestionSelectionState): QuestionSelectionState {
    return {
        ...state,
        totalMarks: state.sections.reduce(
            (sum, section) => sum + lineTotal(section),
            0,
        ),
    };
}

function categoryBadgeLabel(
    category: SectionCategory,
): 'Objective' | 'Subjective' {
    return category === 'Objective Questions' ? 'Objective' : 'Subjective';
}

function mergeQuestionSections(
    incoming: QuestionTypeCount[],
    existing: QuestionSelectionSection[],
): QuestionSelectionSection[] {
    const existingByType = new Map(
        existing.map((section) => [section.questionTypeId, section]),
    );

    return incoming.map((item, index) => {
        const current = existingByType.get(item.questionTypeId);

        return {
            id: `sec_${String(index + 1).padStart(3, '0')}`,
            questionTypeId: item.questionTypeId,
            category: item.category,
            title: item.title,
            availableCount: item.availableCount,
            requiredQuestions: current?.requiredQuestions ?? '',
            marksPerQuestion: current?.marksPerQuestion ?? '',
            choiceQuestions: current?.choiceQuestions ?? '',
        };
    });
}

function TriCheckbox({
    state,
    onChange,
    label,
    size = 'md',
}: {
    state: 'unchecked' | 'checked' | 'indeterminate';
    onChange: () => void;
    label: string;
    size?: 'sm' | 'md';
}) {
    const checkboxSize = size === 'sm' ? 'size-4' : 'size-[18px]';

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={
                state === 'indeterminate' ? 'mixed' : state === 'checked'
            }
            aria-label={label}
            onClick={onChange}
            className={cn(
                'flex shrink-0 items-center justify-center rounded-[5px] border transition-all',
                checkboxSize,
                state === 'checked'
                    ? 'border-teal-600 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-950'
                    : state === 'indeterminate'
                      ? 'border-teal-600 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-950'
                      : 'border-slate-300 bg-white hover:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-teal-400',
            )}
        >
            {state === 'checked' && (
                <CheckIcon className="size-3" strokeWidth={3} />
            )}
            {state === 'indeterminate' && (
                <MinusIcon className="size-3" strokeWidth={3} />
            )}
        </button>
    );
}

function SourceCheckbox({
    checked,
    label,
    onChange,
}: {
    checked: boolean;
    label: string;
    onChange: () => void;
}) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={onChange}
            className={cn(
                'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors',
                checked
                    ? 'border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100',
            )}
        >
            <span
                className={cn(
                    'flex size-4 items-center justify-center rounded-[5px] border transition-colors',
                    checked
                        ? 'border-teal-600 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-950'
                        : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950',
                )}
            >
                {checked && <CheckIcon className="size-3" strokeWidth={3} />}
            </span>
            <span>{label}</span>
        </button>
    );
}

function StepPill({
    index,
    label,
    state,
}: {
    index: number;
    label: string;
    state: StepState;
}) {
    return (
        <div className="flex items-center gap-2">
            <div
                className={cn(
                    'flex size-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
                    state === 'active' &&
                        'bg-teal-600 text-white ring-4 ring-teal-500/15 dark:bg-teal-500 dark:text-slate-950 dark:ring-teal-400/15',
                    state === 'done' &&
                        'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
                    state === 'upcoming' &&
                        'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
                )}
            >
                {state === 'done' ? (
                    <CheckIcon className="size-3.5" strokeWidth={3} />
                ) : (
                    index
                )}
            </div>
            <span
                className={cn(
                    'text-xs font-medium',
                    state === 'upcoming'
                        ? 'text-slate-400 dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-100',
                )}
            >
                {label}
            </span>
        </div>
    );
}

function CategoryDivider({
    title,
    count,
}: {
    title: SectionCategory;
    count: number;
}) {
    return (
        <div className="mb-3 mt-6 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {title}
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {pluralize(count, 'type', 'types')}
            </span>
        </div>
    );
}

function NumberField({
    value,
    label,
    placeholder,
    onChange,
}: {
    value: string;
    label: string;
    placeholder: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block min-w-0">
            <span className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {label}
            </span>
            <input
                type="number"
                inputMode="numeric"
                min="0"
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(onlyDigits(event.target.value))}
                className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 transition-colors outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-teal-400 dark:focus:ring-teal-400/20"
            />
        </label>
    );
}

export default function GeneratePaper({
    patterns,
    patternClasses,
    classSubjects,
    sourceOptions,
}: Props) {
    const sourceFilters = useMemo(
        () => normalizeSourceOptions(sourceOptions),
        [sourceOptions],
    );
    const [step, setStep] = useState<FormStep>('chapters');
    const [pattern, setPattern] = useState<ComboboxOptionItem | null>(null);
    const [klass, setKlass] = useState<ComboboxOptionItem | null>(null);
    const [subject, setSubject] = useState<ComboboxOptionItem | null>(null);
    const [chapters, setChapters] = useState<Chapter[] | null>(null);
    const [loadingChapters, setLoadingChapters] = useState(false);
    const [selected, setSelected] = useState<Record<number, Set<number>>>({});
    const [loadingQuestionSections, setLoadingQuestionSections] =
        useState(false);
    const [questionSectionError, setQuestionSectionError] = useState<
        string | null
    >(null);
    const [questionSelection, setQuestionSelection] =
        useState<QuestionSelectionState>({
            globalFilters: createGlobalFilters(sourceFilters),
            sections: [],
            totalMarks: 0,
        });

    const patternOptions = useMemo<ComboboxOptionItem[]>(
        () => patterns.map((item) => ({ id: item.id, label: item.name })),
        [patterns],
    );

    const classOptions = useMemo<ComboboxOptionItem[]>(() => {
        if (!pattern) {
            return [];
        }

        return patternClasses
            .filter((item) => item.pattern_id === pattern.id)
            .map((item) => ({ id: item.id, label: item.name }));
    }, [pattern, patternClasses]);

    const subjectOptions = useMemo<ComboboxOptionItem[]>(() => {
        if (!pattern || !klass) {
            return [];
        }

        return classSubjects
            .filter(
                (item) =>
                    item.pattern_id === pattern.id &&
                    item.class_id === klass.id,
            )
            .map((item) => ({ id: item.subject_id, label: item.name }));
    }, [pattern, klass, classSubjects]);

    const selectedChapterIds = useMemo(
        () =>
            Object.entries(selected)
                .filter(([, topicIds]) => topicIds.size > 0)
                .map(([chapterId]) => Number(chapterId)),
        [selected],
    );

    const selectedTopicIds = useMemo(
        () =>
            Object.values(selected)
                .flatMap((topicIds) => [...topicIds])
                .filter((topicId) => topicId > 0),
        [selected],
    );

    const activeSourceValues = useMemo(
        () =>
            sourceFilters
                .filter(
                    (item) =>
                        questionSelection.globalFilters[item.value] ?? true,
                )
                .map((item) => item.value),
        [questionSelection.globalFilters, sourceFilters],
    );

    const selectedChapterCount = selectedChapterIds.length;
    const selectedTopicCount = selectedTopicIds.length;
    const canContinueToQuestions = selectedChapterCount > 0;

    const stepStates: {
        scope: StepState;
        chapters: StepState;
        questions: StepState;
    } = {
        scope: pattern && klass && subject ? 'done' : 'active',
        chapters:
            step === 'questions'
                ? 'done'
                : pattern && klass && subject
                  ? canContinueToQuestions
                      ? 'done'
                      : 'active'
                  : 'upcoming',
        questions: step === 'questions' ? 'active' : 'upcoming',
    };

    const chapterGroups = useMemo(() => {
        if (!chapters) {
            return [] as { heading: string | null; items: Chapter[] }[];
        }

        const groups: { heading: string | null; items: Chapter[] }[] = [];

        for (const chapter of chapters) {
            const heading = chapter.group_heading || chapter.group_name || null;
            const last = groups[groups.length - 1];

            if (last && last.heading === heading) {
                last.items.push(chapter);
            } else {
                groups.push({ heading, items: [chapter] });
            }
        }

        return groups;
    }, [chapters]);

    useEffect(() => {
        if (!pattern || !klass || !subject) {
            return;
        }

        const abortController = new AbortController();
        const params = new URLSearchParams({
            pattern_id: String(pattern.id),
            class_id: String(klass.id),
            subject_id: String(subject.id),
        });

        queueMicrotask(() => {
            if (!abortController.signal.aborted) {
                setLoadingChapters(true);
                setChapters(null);
            }
        });

        fetch(`/papers/generate/chapters?${params.toString()}`, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            signal: abortController.signal,
            credentials: 'same-origin',
        })
            .then((response) =>
                response.ok
                    ? response.json()
                    : Promise.reject(response.statusText),
            )
            .then((data: { chapters: Chapter[] }) => setChapters(data.chapters))
            .catch((error) => {
                if (error?.name !== 'AbortError') {
                    setChapters([]);
                }
            })
            .finally(() => setLoadingChapters(false));

        return () => abortController.abort();
    }, [pattern, klass, subject]);

    useEffect(() => {
        if (step !== 'questions' || selectedChapterIds.length === 0) {
            return;
        }

        const abortController = new AbortController();
        const params = new URLSearchParams();

        selectedChapterIds.forEach((id) =>
            params.append('chapter_ids[]', String(id)),
        );
        selectedTopicIds.forEach((id) =>
            params.append('topic_ids[]', String(id)),
        );
        activeSourceValues.forEach((source) =>
            params.append('sources[]', source),
        );

        queueMicrotask(() => {
            if (!abortController.signal.aborted) {
                setLoadingQuestionSections(true);
                setQuestionSectionError(null);
            }
        });

        fetch(`/papers/generate/question-types?${params.toString()}`, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            signal: abortController.signal,
            credentials: 'same-origin',
        })
            .then((response) =>
                response.ok
                    ? response.json()
                    : Promise.reject(response.statusText),
            )
            .then((data: { sections: QuestionTypeCount[] }) => {
                setQuestionSelection((current) =>
                    withTotalMarks({
                        ...current,
                        sections: mergeQuestionSections(
                            data.sections,
                            current.sections,
                        ),
                    }),
                );
            })
            .catch((error) => {
                if (error?.name !== 'AbortError') {
                    setQuestionSectionError(
                        'Unable to load question counts. Please try again.',
                    );
                    setQuestionSelection((current) =>
                        withTotalMarks({ ...current, sections: [] }),
                    );
                }
            })
            .finally(() => setLoadingQuestionSections(false));

        return () => abortController.abort();
    }, [activeSourceValues, selectedChapterIds, selectedTopicIds, step]);

    function resetQuestionSelection() {
        setQuestionSelection({
            globalFilters: createGlobalFilters(sourceFilters),
            sections: [],
            totalMarks: 0,
        });
        setQuestionSectionError(null);
    }

    function handlePatternChange(value: ComboboxOptionItem | null) {
        setPattern(value);
        setKlass(null);
        setSubject(null);
        setChapters(null);
        setSelected({});
        setStep('chapters');
        resetQuestionSelection();
    }

    function handleClassChange(value: ComboboxOptionItem | null) {
        setKlass(value);
        setSubject(null);
        setChapters(null);
        setSelected({});
        setStep('chapters');
        resetQuestionSelection();
    }

    function handleSubjectChange(value: ComboboxOptionItem | null) {
        setSubject(value);
        setSelected({});
        setStep('chapters');
        resetQuestionSelection();
    }

    function toggleTopic(chapterId: number, topicId: number) {
        setSelected((current) => {
            const next = { ...current };
            const set = new Set(next[chapterId] ?? []);

            if (set.has(topicId)) {
                set.delete(topicId);
            } else {
                set.add(topicId);
            }

            if (set.size === 0) {
                delete next[chapterId];
            } else {
                next[chapterId] = set;
            }

            return next;
        });
    }

    function toggleChapter(chapter: Chapter) {
        setSelected((current) => {
            const next = { ...current };
            const currentSet = next[chapter.id] ?? new Set<number>();

            if (chapter.topics.length === 0) {
                if (currentSet.has(CHAPTER_ONLY_SELECTION)) {
                    delete next[chapter.id];
                } else {
                    next[chapter.id] = new Set([CHAPTER_ONLY_SELECTION]);
                }

                return next;
            }

            const topicIds = chapter.topics.map((topic) => topic.id);
            const allSelected = topicIds.every((id) => currentSet.has(id));

            if (allSelected) {
                delete next[chapter.id];
            } else {
                next[chapter.id] = new Set(topicIds);
            }

            return next;
        });
    }

    function chapterState(
        chapter: Chapter,
    ): 'unchecked' | 'checked' | 'indeterminate' {
        const selectedTopics = selected[chapter.id];

        if (!selectedTopics || selectedTopics.size === 0) {
            return 'unchecked';
        }

        if (chapter.topics.length === 0) {
            return selectedTopics.has(CHAPTER_ONLY_SELECTION)
                ? 'checked'
                : 'unchecked';
        }

        if (selectedTopics.size === chapter.topics.length) {
            return 'checked';
        }

        return 'indeterminate';
    }

    function reset() {
        setStep('chapters');
        setPattern(null);
        setKlass(null);
        setSubject(null);
        setChapters(null);
        setSelected({});
        resetQuestionSelection();
    }

    function handleNext() {
        if (!canContinueToQuestions) {
            return;
        }

        setStep('questions');
    }

    function handleBackToChapters() {
        setStep('chapters');
    }

    function handleGeneratePaper() {
        console.info('Generate paper payload', {
            pattern_id: pattern?.id,
            class_id: klass?.id,
            subject_id: subject?.id,
            chapter_ids: selectedChapterIds,
            topic_ids: selectedTopicIds,
            questionSelection,
        });
    }

    function updateGlobalFilter(key: SourceFilterKey) {
        setQuestionSelection((current) => ({
            ...current,
            globalFilters: {
                ...current.globalFilters,
                [key]: !(current.globalFilters[key] ?? true),
            },
        }));
    }

    function sourceChecked(value: string) {
        return questionSelection.globalFilters[value] ?? true;
    }

    function updateSectionValue(
        sectionId: string,
        field: QuestionSectionField,
        value: string,
    ) {
        setQuestionSelection((current) =>
            withTotalMarks({
                ...current,
                sections: current.sections.map((section) =>
                    section.id === sectionId
                        ? { ...section, [field]: value }
                        : section,
                ),
            }),
        );
    }

    function clearSection(sectionId: string) {
        setQuestionSelection((current) =>
            withTotalMarks({
                ...current,
                sections: current.sections.map((section) =>
                    section.id === sectionId
                        ? {
                              ...section,
                              requiredQuestions: '',
                              marksPerQuestion: '',
                              choiceQuestions: '',
                          }
                        : section,
                ),
            }),
        );
    }

    function addOneQuestion(sectionId: string) {
        setQuestionSelection((current) =>
            withTotalMarks({
                ...current,
                sections: current.sections.map((section) => {
                    if (section.id !== sectionId) {
                        return section;
                    }

                    const nextRequired = Math.min(
                        section.availableCount,
                        toNumber(section.requiredQuestions) + 1,
                    );

                    return {
                        ...section,
                        requiredQuestions: String(nextRequired),
                    };
                }),
            }),
        );
    }

    function renderQuestionCategory(category: SectionCategory) {
        const sections = questionSelection.sections.filter(
            (section) => section.category === category,
        );

        if (sections.length === 0) {
            return null;
        }

        return (
            <div>
                <CategoryDivider title={category} count={sections.length} />
                <div className="space-y-2.5">
                    {sections.map((section) => (
                        <QuestionSelectionCard
                            key={section.id}
                            section={section}
                            onChange={updateSectionValue}
                            onClear={clearSection}
                            onAddOne={addOneQuestion}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            <Head title="Generate Paper" />

            <div className="mx-auto max-w-7xl space-y-6 pb-24">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                        Generate Paper
                    </h1>

                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                        <StepPill
                            index={1}
                            label="Scope"
                            state={stepStates.scope}
                        />
                        <div className="h-px w-5 bg-slate-200 dark:bg-slate-800" />
                        <StepPill
                            index={2}
                            label="Chapters"
                            state={stepStates.chapters}
                        />
                        <div className="h-px w-5 bg-slate-200 dark:bg-slate-800" />
                        <StepPill
                            index={3}
                            label="Questions"
                            state={stepStates.questions}
                        />
                    </div>
                </div>

                {step === 'chapters' && (
                    <>
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/10">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="flex size-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
                                    <LayersIcon className="size-4" />
                                </div>
                                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    Choose the scope
                                </h2>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <FloatingCombobox
                                    label="Pattern"
                                    leadingIcon={FileTextIcon}
                                    options={patternOptions}
                                    value={pattern}
                                    onChange={handlePatternChange}
                                />
                                <FloatingCombobox
                                    label="Class"
                                    leadingIcon={GraduationCapIcon}
                                    options={classOptions}
                                    value={klass}
                                    onChange={handleClassChange}
                                    disabled={!pattern}
                                />
                                <FloatingCombobox
                                    label="Subject"
                                    leadingIcon={BookOpenIcon}
                                    options={subjectOptions}
                                    value={subject}
                                    onChange={handleSubjectChange}
                                    disabled={!klass}
                                />
                            </div>
                        </section>

                        {pattern && klass && subject && (
                            <section>
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                        Chapters &amp; topics
                                    </h2>
                                    {chapters && chapters.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const all: Record<
                                                        number,
                                                        Set<number>
                                                    > = {};

                                                    for (const chapter of chapters) {
                                                        all[chapter.id] =
                                                            chapter.topics
                                                                .length > 0
                                                                ? new Set(
                                                                      chapter.topics.map(
                                                                          (
                                                                              topic,
                                                                          ) =>
                                                                              topic.id,
                                                                      ),
                                                                  )
                                                                : new Set([
                                                                      CHAPTER_ONLY_SELECTION,
                                                                  ]);
                                                    }

                                                    setSelected(all);
                                                }}
                                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                            >
                                                Select all
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelected({})}
                                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {loadingChapters && (
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {Array.from({ length: 6 }).map(
                                            (_, index) => (
                                                <div
                                                    key={index}
                                                    className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60"
                                                />
                                            ),
                                        )}
                                    </div>
                                )}

                                {!loadingChapters &&
                                    chapters &&
                                    chapters.length === 0 && (
                                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 py-16 text-center dark:border-slate-700 dark:bg-slate-900/40">
                                            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700">
                                                <SearchXIcon className="size-5" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                                No chapters found
                                            </p>
                                        </div>
                                    )}

                                {!loadingChapters &&
                                    chapters &&
                                    chapters.length > 0 && (
                                        <div className="space-y-6">
                                            {chapterGroups.map(
                                                (group, index) => (
                                                    <div
                                                        key={`${group.heading ?? 'none'}-${index}`}
                                                    >
                                                        {group.heading && (
                                                            <h3 className="mb-2 text-[11px] font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                                                                {group.heading}
                                                            </h3>
                                                        )}
                                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                                            {group.items.map(
                                                                (chapter) => (
                                                                    <ChapterCard
                                                                        key={
                                                                            chapter.id
                                                                        }
                                                                        chapter={
                                                                            chapter
                                                                        }
                                                                        state={chapterState(
                                                                            chapter,
                                                                        )}
                                                                        selectedTopics={
                                                                            selected[
                                                                                chapter
                                                                                    .id
                                                                            ] ??
                                                                            new Set()
                                                                        }
                                                                        onToggleChapter={() =>
                                                                            toggleChapter(
                                                                                chapter,
                                                                            )
                                                                        }
                                                                        onToggleTopic={(
                                                                            topicId,
                                                                        ) =>
                                                                            toggleTopic(
                                                                                chapter.id,
                                                                                topicId,
                                                                            )
                                                                        }
                                                                    />
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                            </section>
                        )}
                    </>
                )}

                {step === 'questions' && (
                    <section className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/10">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="flex size-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
                                            <FileTextIcon className="size-4" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                                Question Selection
                                            </h2>
                                            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                                                {pattern?.label} /{' '}
                                                {klass?.label} /{' '}
                                                {subject?.label}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center gap-2">
                                        <span className="mr-1 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                            Sources
                                        </span>
                                        {sourceFilters.map((item) => (
                                            <SourceCheckbox
                                                key={item.value}
                                                label={item.label}
                                                checked={sourceChecked(
                                                    item.value,
                                                )}
                                                onChange={() =>
                                                    updateGlobalFilter(
                                                        item.value,
                                                    )
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="grid min-w-52 grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/60">
                                    <div className="rounded-lg bg-white px-3 py-2 dark:bg-slate-900">
                                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                            Active sources
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            {activeSourceValues.length}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-teal-600 px-3 py-2 text-white dark:bg-teal-500 dark:text-slate-950">
                                        <p className="text-[11px] font-medium opacity-80">
                                            Total marks
                                        </p>
                                        <p className="mt-1 text-xl font-semibold leading-none">
                                            {questionSelection.totalMarks}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/10 md:p-5">
                            {loadingQuestionSections && (
                                <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400">
                                    <Loader2Icon className="size-4 animate-spin" />
                                    Loading question counts
                                </div>
                            )}

                            {!loadingQuestionSections &&
                                questionSectionError && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                                        {questionSectionError}
                                    </div>
                                )}

                            {!loadingQuestionSections &&
                                !questionSectionError &&
                                questionSelection.sections.length === 0 && (
                                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 py-14 text-center dark:border-slate-700 dark:bg-slate-950/40">
                                        <SearchXIcon className="mb-3 size-6 text-slate-400" />
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            No question types found for this
                                            selection
                                        </p>
                                    </div>
                                )}

                            {!loadingQuestionSections &&
                                questionSelection.sections.length > 0 && (
                                    <div className="space-y-1">
                                        {renderQuestionCategory(
                                            'Objective Questions',
                                        )}
                                        {renderQuestionCategory(
                                            'Subjective Questions',
                                        )}
                                    </div>
                                )}
                        </div>
                    </section>
                )}
            </div>

            <div className="sticky bottom-0 -mx-4 mt-6 border-t border-slate-200 bg-white/85 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 dark:border-slate-800 dark:bg-slate-900/85">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 px-2 py-1 font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                            <CheckIcon className="size-3" strokeWidth={3} />
                            {pluralize(
                                selectedChapterCount,
                                'chapter',
                                'chapters',
                            )}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                            {pluralize(selectedTopicCount, 'topic', 'topics')}{' '}
                            selected
                        </span>
                    </div>

                    {step === 'chapters' ? (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => router.visit('/dashboard')}
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={reset}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            >
                                <RotateCcwIcon className="size-3.5" />
                                Reset
                            </button>
                            <button
                                type="button"
                                disabled={!canContinueToQuestions}
                                onClick={handleNext}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold transition-colors',
                                    !canContinueToQuestions
                                        ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                        : 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400',
                                )}
                            >
                                Next
                                <ArrowRightIcon className="size-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleBackToChapters}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            >
                                <ArrowLeftIcon className="size-4" />
                                Back
                            </button>
                            <button
                                type="button"
                                disabled={questionSelection.totalMarks === 0}
                                onClick={handleGeneratePaper}
                                className={cn(
                                    'rounded-lg px-5 py-2 text-sm font-semibold transition-colors',
                                    questionSelection.totalMarks === 0
                                        ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                        : 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400',
                                )}
                            >
                                Generate Paper
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function ChapterCard({
    chapter,
    state,
    selectedTopics,
    onToggleChapter,
    onToggleTopic,
}: {
    chapter: Chapter;
    state: 'unchecked' | 'checked' | 'indeterminate';
    selectedTopics: Set<number>;
    onToggleChapter: () => void;
    onToggleTopic: (topicId: number) => void;
}) {
    const isActive = state !== 'unchecked';

    return (
        <div
            className={cn(
                'group rounded-2xl border bg-white p-4 transition-all',
                isActive
                    ? 'border-teal-300 ring-2 ring-teal-500/10 dark:border-teal-500/40 dark:ring-teal-400/10'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700',
                'dark:bg-slate-900',
            )}
        >
            <div className="flex items-start gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                <TriCheckbox
                    state={state}
                    onChange={onToggleChapter}
                    label={`Toggle all topics in ${chapter.name}`}
                />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        {chapter.chapter_number !== null && (
                            <span
                                className={cn(
                                    'rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors',
                                    isActive
                                        ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200'
                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                                )}
                            >
                                CH{' '}
                                {String(chapter.chapter_number).padStart(
                                    2,
                                    '0',
                                )}
                            </span>
                        )}
                        <h3
                            className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100"
                            title={chapter.name}
                        >
                            {chapter.name}
                        </h3>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {chapter.topics.length === 0
                            ? isActive
                                ? 'Chapter selected'
                                : 'No topics'
                            : `${selectedTopics.size} / ${chapter.topics.length} topics`}
                    </p>
                </div>
            </div>

            {chapter.topics.length === 0 ? (
                <p className="px-1 py-3 text-xs text-slate-400 italic dark:text-slate-500">
                    This chapter can be selected directly.
                </p>
            ) : (
                <ul className="scrollbar-slim mt-2 max-h-56 space-y-0.5 overflow-y-auto pr-1">
                    {chapter.topics.map((topic) => {
                        const checked = selectedTopics.has(topic.id);

                        return (
                            <li
                                key={topic.id}
                                className={cn(
                                    'flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors',
                                    checked
                                        ? 'bg-teal-50 text-teal-900 dark:bg-teal-500/10 dark:text-teal-100'
                                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60',
                                )}
                            >
                                <TriCheckbox
                                    state={checked ? 'checked' : 'unchecked'}
                                    onChange={() => onToggleTopic(topic.id)}
                                    label={topic.name}
                                    size="sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => onToggleTopic(topic.id)}
                                    className="min-w-0 flex-1 truncate text-left text-[13px]"
                                >
                                    {topic.name}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

function QuestionSelectionCard({
    section,
    onChange,
    onClear,
    onAddOne,
}: {
    section: QuestionSelectionSection;
    onChange: (
        sectionId: string,
        field: QuestionSectionField,
        value: string,
    ) => void;
    onClear: (sectionId: string) => void;
    onAddOne: (sectionId: string) => void;
}) {
    const total = lineTotal(section);

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {categoryBadgeLabel(section.category)}
                        </span>
                        <span className="rounded-md bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                            {section.availableCount} available
                        </span>
                    </div>
                    <h4 className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {section.title}
                    </h4>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                        {total} marks
                    </span>
                    <button
                        type="button"
                        onClick={() => onClear(section.id)}
                        aria-label={`Clear ${section.title}`}
                        className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                    >
                        <Trash2Icon className="size-4" />
                    </button>
                </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                <NumberField
                    label="Required"
                    value={section.requiredQuestions}
                    placeholder="0"
                    onChange={(value) =>
                        onChange(section.id, 'requiredQuestions', value)
                    }
                />
                <NumberField
                    label="Marks each"
                    value={section.marksPerQuestion}
                    placeholder="0"
                    onChange={(value) =>
                        onChange(section.id, 'marksPerQuestion', value)
                    }
                />
                <NumberField
                    label="Choice"
                    value={section.choiceQuestions}
                    placeholder="0"
                    onChange={(value) =>
                        onChange(section.id, 'choiceQuestions', value)
                    }
                />
                <button
                    type="button"
                    onClick={() => onAddOne(section.id)}
                    aria-label={`Add one ${section.title} question`}
                    title={`Add one ${section.title} question`}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-100 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-200 dark:hover:bg-teal-500/20"
                >
                    <PlusIcon className="size-4" />
                    Add
                </button>
            </div>
        </div>
    );
}

import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    BookOpenIcon,
    CheckIcon,
    ChevronLeftIcon,
    Clock3Icon,
    EyeIcon,
    FileTextIcon,
    GraduationCapIcon,
    Layers3Icon,
    ListChecksIcon,
    LoaderCircleIcon,
    LockKeyholeIcon,
    MinusIcon,
    MonitorUpIcon,
    RefreshCwIcon,
    SearchIcon,
    Settings2Icon,
    ShieldCheckIcon,
    SparklesIcon,
    TimerIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ComboboxOptionItem } from '@/components/ui/floating-combobox';
import { FloatingCombobox } from '@/components/ui/floating-combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface Pattern {
    id: number;
    name: string;
}
interface PatternClassRow {
    pattern_id: number;
    id: number;
    name: string;
}
interface ClassSubjectRow {
    pattern_id: number;
    class_id: number;
    subject_id: number;
    name: string;
}
interface FilterOption {
    value: string;
    label: string;
}
interface TopicOption {
    id: number;
    name: string;
    question_count: number;
}
interface ChapterOption {
    id: number;
    name: string;
    chapter_number: string | number | null;
    group_name: string | null;
    group_heading: string | null;
    question_count: number;
    topics: TopicOption[];
}
interface ChapterGroup {
    heading: string | null;
    items: ChapterOption[];
}
interface QuestionOption {
    id: number;
    prompt: string;
    chapter_name: string | null;
    topic_name: string | null;
    question_type: string | null;
    option_count: number;
    source: string | null;
    source_label: string | null;
    difficulty: string | null;
}

type TimingMode = 'whole_test' | 'per_question' | 'none';
type FocusLossAction = 'allow' | 'warn' | 'submit';
type BuilderStep = 'scope' | 'questions' | 'experience' | 'review';
type SelectionMode = 'automatic' | 'manual';
type SelectionState = 'unchecked' | 'checked' | 'indeterminate';

interface ExistingTest {
    id: number;
    title: string;
    instructions: string | null;
    duration_minutes: number;
    timing_mode: TimingMode;
    question_time_seconds: number | null;
    auto_advance: boolean;
    allow_back_navigation: boolean;
    allow_skip: boolean;
    shuffle_questions: boolean;
    shuffle_options: boolean;
    focus_loss_action: FocusLossAction;
    require_fullscreen: boolean;
    show_result: boolean;
    show_correct_answers: boolean;
    passing_percentage: number;
    available_from: string | null;
    available_until: string | null;
    pattern_id: number;
    class_id: number;
    subject_id: number;
    chapter_ids: number[];
    question_ids: number[];
}
interface Props {
    mode: 'create' | 'edit';
    patterns: Pattern[];
    patternClasses: PatternClassRow[];
    classSubjects: ClassSubjectRow[];
    sourceOptions: FilterOption[];
    difficultyOptions: FilterOption[];
    test?: ExistingTest;
}
interface FormData {
    title: string;
    instructions: string;
    duration_minutes: string;
    timing_mode: TimingMode;
    question_time_seconds: string;
    auto_advance: boolean;
    allow_back_navigation: boolean;
    allow_skip: boolean;
    shuffle_questions: boolean;
    shuffle_options: boolean;
    focus_loss_action: FocusLossAction;
    require_fullscreen: boolean;
    show_result: boolean;
    show_correct_answers: boolean;
    passing_percentage: string;
    available_from: string;
    available_until: string;
    pattern_id: string;
    class_id: string;
    subject_id: string;
    chapter_ids: number[];
    topic_ids: number[];
    question_ids: number[];
}

const STEPS: Array<{ id: BuilderStep; label: string }> = [
    { id: 'scope', label: 'Scope' },
    { id: 'questions', label: 'Questions' },
    { id: 'experience', label: 'Experience' },
    { id: 'review', label: 'Review' },
];

function CheckControl({
    checked,
    mixed = false,
}: {
    checked: boolean;
    mixed?: boolean;
}) {
    return (
        <span
            className={cn(
                'flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors',
                checked || mixed
                    ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-400'
                    : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950',
            )}
        >
            {(checked || mixed) && (
                <CheckIcon className="size-3" strokeWidth={3} />
            )}
        </span>
    );
}

function TriCheckbox({
    state,
    onChange,
    label,
    size = 'md',
}: {
    state: SelectionState;
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
                'flex shrink-0 cursor-pointer items-center justify-center rounded-[5px] border transition-all',
                checkboxSize,
                state === 'checked' || state === 'indeterminate'
                    ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-400'
                    : 'border-slate-300 bg-white hover:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-400',
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

function SectionTitle({
    icon,
    title,
    aside,
}: {
    icon: React.ReactNode;
    title: string;
    aside?: React.ReactNode;
}) {
    return (
        <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    {icon}
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {title}
                </h2>
            </div>
            {aside}
        </div>
    );
}

function ChoiceCard({
    selected,
    icon,
    title,
    description,
    onClick,
}: {
    selected: boolean;
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex min-h-28 flex-col items-start rounded-xl border p-4 text-left transition-all',
                selected
                    ? 'border-brand-300 bg-brand-50/60 ring-2 ring-brand-500/10 dark:border-brand-500/40 dark:bg-brand-500/[0.07]'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700',
            )}
        >
            <span
                className={cn(
                    'mb-3 text-slate-400',
                    selected && 'text-brand-600 dark:text-brand-400',
                )}
            >
                {icon}
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {title}
            </span>
            <span className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {description}
            </span>
        </button>
    );
}

function ToggleRow({
    title,
    description,
    checked,
    onChange,
    disabled = false,
}: {
    title: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex items-start justify-between gap-4 py-3',
                disabled && 'opacity-50',
            )}
        >
            <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {title}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {description}
                </p>
            </div>
            <Switch
                checked={checked}
                onCheckedChange={onChange}
                disabled={disabled}
                className="mt-0.5 shrink-0"
            />
        </div>
    );
}

function FieldError({ message }: { message?: string }) {
    return message ? (
        <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
            {message}
        </p>
    ) : null;
}

function DirectChapterGroup({
    group,
    state,
    selectedChapterIds,
    onToggleGroup,
    onToggleChapter,
}: {
    group: ChapterGroup;
    state: SelectionState;
    selectedChapterIds: number[];
    onToggleGroup: () => void;
    onToggleChapter: (chapter: ChapterOption) => void;
}) {
    const isActive = state !== 'unchecked';
    const heading = group.heading;

    if (heading === null) {
        return (
            <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
                {group.items.map((chapter) => (
                    <DirectChapterRow
                        key={chapter.id}
                        chapter={chapter}
                        checked={selectedChapterIds.includes(chapter.id)}
                        onToggleChapter={onToggleChapter}
                        standalone
                    />
                ))}
            </ul>
        );
    }

    return (
        <div
            className={cn(
                'overflow-hidden rounded-xl border bg-white transition-colors dark:bg-slate-900',
                isActive
                    ? 'border-brand-300 dark:border-brand-500/40'
                    : 'border-slate-200 dark:border-slate-800',
            )}
        >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <TriCheckbox
                    state={state}
                    onChange={onToggleGroup}
                    label={`Toggle all chapters in ${heading}`}
                />
                <h3 className="min-w-0 flex-1 truncate text-xs font-semibold tracking-widest text-slate-500 uppercase dark:text-slate-400">
                    {heading}
                </h3>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {group.items.map((chapter) => (
                    <DirectChapterRow
                        key={chapter.id}
                        chapter={chapter}
                        checked={selectedChapterIds.includes(chapter.id)}
                        onToggleChapter={onToggleChapter}
                    />
                ))}
            </ul>
        </div>
    );
}

function DirectChapterRow({
    chapter,
    checked,
    onToggleChapter,
    standalone = false,
}: {
    chapter: ChapterOption;
    checked: boolean;
    onToggleChapter: (chapter: ChapterOption) => void;
    standalone?: boolean;
}) {
    return (
        <li
            className={cn(
                'flex items-center gap-3 bg-white px-4 py-3 dark:bg-slate-900',
                standalone &&
                    'rounded-xl border transition-colors dark:border-slate-800',
                standalone &&
                    (checked
                        ? 'border-brand-300 dark:border-brand-500/40'
                        : 'border-slate-200'),
            )}
        >
            <TriCheckbox
                state={checked ? 'checked' : 'unchecked'}
                onChange={() => onToggleChapter(chapter)}
                label={`Toggle ${chapter.name}`}
                size="sm"
            />
            <button
                type="button"
                onClick={() => onToggleChapter(chapter)}
                className={cn(
                    'flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left text-sm transition-colors',
                    checked
                        ? 'text-brand-700 dark:text-brand-300'
                        : 'text-slate-700 hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300',
                )}
            >
                {chapter.chapter_number !== null && (
                    <span
                        className={cn(
                            'shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap',
                            checked
                                ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                        )}
                    >
                        CH {String(chapter.chapter_number).padStart(2, '0')}
                    </span>
                )}
                <span className="truncate" title={chapter.name}>
                    {chapter.name}
                </span>
                <span
                    className={cn(
                        'ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums',
                        chapter.question_count > 0
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
                    )}
                    title={`${chapter.question_count} question${chapter.question_count === 1 ? '' : 's'}`}
                >
                    {chapter.question_count}
                </span>
            </button>
        </li>
    );
}

function ChapterTopicCard({
    chapter,
    state,
    selectedTopics,
    onToggleChapter,
    onToggleTopic,
}: {
    chapter: ChapterOption;
    state: SelectionState;
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
                    ? 'border-brand-300 ring-2 ring-brand-500/10 dark:border-brand-500/40 dark:ring-brand-400/10'
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
                                    'shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap transition-colors',
                                    isActive
                                        ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200'
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
                        <span
                            className={cn(
                                'ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums',
                                chapter.question_count > 0
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
                            )}
                            title={`${chapter.question_count} question${chapter.question_count === 1 ? '' : 's'} available`}
                        >
                            {chapter.question_count}
                        </span>
                    </div>
                </div>
            </div>

            {chapter.topics.length === 0 ? (
                <p className="px-1 py-3 text-xs text-slate-400 italic dark:text-slate-500">
                    This chapter can be selected directly.
                </p>
            ) : (
                <ul className="mt-2 space-y-0.5">
                    {chapter.topics.map((topic) => {
                        const checked = selectedTopics.has(topic.id);

                        return (
                            <li
                                key={topic.id}
                                className={cn(
                                    'flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors',
                                    checked
                                        ? 'text-brand-700 dark:text-brand-300'
                                        : 'text-slate-600 dark:text-slate-300',
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
                                    className="min-w-0 flex-1 cursor-pointer truncate text-left text-[13px]"
                                >
                                    {topic.name}
                                </button>
                                <span
                                    className={cn(
                                        'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                                        topic.question_count > 0
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
                                    )}
                                >
                                    {topic.question_count}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export default function OnlineTestEditor({
    mode,
    patterns,
    patternClasses,
    classSubjects,
    sourceOptions,
    difficultyOptions,
    test,
}: Props) {
    const [step, setStep] = useState<BuilderStep>('scope');
    const [selectionMode, setSelectionMode] =
        useState<SelectionMode>('automatic');
    const [chapters, setChapters] = useState<ChapterOption[] | null>(null);
    const [questions, setQuestions] = useState<QuestionOption[]>([]);
    const [chapterLoading, setChapterLoading] = useState(false);
    const [questionLoading, setQuestionLoading] = useState(false);
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [questionSearch, setQuestionSearch] = useState('');
    const [automaticCount, setAutomaticCount] = useState('20');
    const [activeSources, setActiveSources] = useState(() =>
        sourceOptions.map((option) => option.value),
    );
    const [activeDifficulties, setActiveDifficulties] = useState(() =>
        difficultyOptions.map((option) => option.value),
    );
    const { data, setData, post, put, processing, errors } = useForm<FormData>({
        title: test?.title ?? '',
        instructions: test?.instructions ?? '',
        duration_minutes: String(test?.duration_minutes ?? 60),
        timing_mode: test?.timing_mode ?? 'whole_test',
        question_time_seconds: String(test?.question_time_seconds ?? 60),
        auto_advance: test?.auto_advance ?? false,
        allow_back_navigation: test?.allow_back_navigation ?? false,
        allow_skip: test?.allow_skip ?? false,
        shuffle_questions: test?.shuffle_questions ?? true,
        shuffle_options: test?.shuffle_options ?? true,
        focus_loss_action: test?.focus_loss_action ?? 'warn',
        require_fullscreen: test?.require_fullscreen ?? false,
        show_result: test?.show_result ?? true,
        show_correct_answers: test?.show_correct_answers ?? false,
        passing_percentage: String(test?.passing_percentage ?? 40),
        available_from: test?.available_from ?? '',
        available_until: test?.available_until ?? '',
        pattern_id: test?.pattern_id ? String(test.pattern_id) : '',
        class_id: test?.class_id ? String(test.class_id) : '',
        subject_id: test?.subject_id ? String(test.subject_id) : '',
        chapter_ids: test?.chapter_ids ?? [],
        topic_ids: [],
        question_ids: test?.question_ids ?? [],
    });

    const patternOptions = useMemo<ComboboxOptionItem[]>(
        () => patterns.map((item) => ({ id: item.id, label: item.name })),
        [patterns],
    );
    const selectedPattern =
        patternOptions.find((item) => String(item.id) === data.pattern_id) ??
        null;
    const classOptions = useMemo<ComboboxOptionItem[]>(
        () =>
            patternClasses
                .filter((item) => String(item.pattern_id) === data.pattern_id)
                .map((item) => ({ id: item.id, label: item.name })),
        [patternClasses, data.pattern_id],
    );
    const selectedClass =
        classOptions.find((item) => String(item.id) === data.class_id) ?? null;
    const subjectOptions = useMemo<ComboboxOptionItem[]>(
        () =>
            classSubjects
                .filter(
                    (item) =>
                        String(item.pattern_id) === data.pattern_id &&
                        String(item.class_id) === data.class_id,
                )
                .map((item) => ({ id: item.subject_id, label: item.name })),
        [classSubjects, data.pattern_id, data.class_id],
    );
    const selectedSubject =
        subjectOptions.find((item) => String(item.id) === data.subject_id) ??
        null;
    const scopeComplete = Boolean(
        selectedPattern && selectedClass && selectedSubject,
    );
    const selectedQuestions = questions.filter((question) =>
        data.question_ids.includes(question.id),
    );
    const stepIndex = STEPS.findIndex((item) => item.id === step);
    const chapterIdsKey = data.chapter_ids.join(',');
    const topicIdsKey = data.topic_ids.join(',');
    const sourceFilterKey = activeSources.join(',');
    const difficultyFilterKey = activeDifficulties.join(',');
    const filteredQuestions = useMemo(() => {
        const search = questionSearch.trim().toLowerCase();

        return search
            ? questions.filter((question) =>
                  [
                      question.prompt,
                      question.chapter_name,
                      question.topic_name,
                      question.question_type,
                  ]
                      .filter(Boolean)
                      .some((value) =>
                          String(value).toLowerCase().includes(search),
                      ),
              )
            : questions;
    }, [questions, questionSearch]);
    const chapterGroups = useMemo(() => {
        if (!chapters) {
            return [] as ChapterGroup[];
        }

        const groups: ChapterGroup[] = [];

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
    const isChapterWiseSubject =
        chapters !== null &&
        chapters.length > 0 &&
        chapters.every((chapter) => chapter.topics.length === 0);

    useEffect(() => {
        if (!scopeComplete) {
            setChapters(null);

            return;
        }

        const controller = new AbortController();
        const params = new URLSearchParams({
            pattern_id: data.pattern_id,
            class_id: data.class_id,
            subject_id: data.subject_id,
        });
        setChapterLoading(true);
        setCatalogError(null);
        fetch(`/online-tests/catalog/chapters?${params.toString()}`, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
            signal: controller.signal,
        })
            .then((response) =>
                response.ok ? response.json() : Promise.reject(new Error()),
            )
            .then((payload: { chapters: ChapterOption[] }) =>
                setChapters(payload.chapters ?? []),
            )
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    setChapters([]);
                    setCatalogError(
                        'Chapters could not be loaded. Choose the scope again or retry.',
                    );
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setChapterLoading(false);
                }
            });

        return () => controller.abort();
    }, [scopeComplete, data.pattern_id, data.class_id, data.subject_id]);

    useEffect(() => {
        if (step !== 'questions' || data.chapter_ids.length === 0) {
            return;
        }

        const controller = new AbortController();
        const params = new URLSearchParams({
            pattern_id: data.pattern_id,
            class_id: data.class_id,
            subject_id: data.subject_id,
        });
        data.chapter_ids.forEach((id) =>
            params.append('chapter_ids[]', String(id)),
        );
        data.topic_ids.forEach((id) =>
            params.append('topic_ids[]', String(id)),
        );

        if (activeSources.length < sourceOptions.length) {
            activeSources.forEach((value) => params.append('sources[]', value));
        }

        if (activeDifficulties.length < difficultyOptions.length) {
            activeDifficulties.forEach((value) =>
                params.append('difficulties[]', value),
            );
        }

        setQuestionLoading(true);
        setCatalogError(null);
        fetch(`/online-tests/catalog/questions?${params.toString()}`, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
            signal: controller.signal,
        })
            .then((response) =>
                response.ok ? response.json() : Promise.reject(new Error()),
            )
            .then((payload: { questions: QuestionOption[] }) => {
                const incoming = payload.questions ?? [];
                setQuestions(incoming);
                const ids = new Set(incoming.map((question) => question.id));
                const nextQuestionIds = data.question_ids.filter((id) =>
                    ids.has(id),
                );
                const selectionChanged =
                    nextQuestionIds.length !== data.question_ids.length ||
                    nextQuestionIds.some(
                        (id, index) => id !== data.question_ids[index],
                    );

                if (selectionChanged) {
                    setData('question_ids', nextQuestionIds);
                }
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    setQuestions([]);
                    setCatalogError(
                        'Questions could not be loaded for this selection.',
                    );
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setQuestionLoading(false);
                }
            });

        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        step,
        data.pattern_id,
        data.class_id,
        data.subject_id,
        chapterIdsKey,
        topicIdsKey,
        sourceFilterKey,
        difficultyFilterKey,
        sourceOptions.length,
        difficultyOptions.length,
    ]);

    function resetScope(
        level: 'pattern' | 'class' | 'subject',
        value: ComboboxOptionItem | null,
    ) {
        setQuestions([]);
        setCatalogError(null);

        if (level === 'pattern') {
            setData({
                ...data,
                pattern_id: value ? String(value.id) : '',
                class_id: '',
                subject_id: '',
                chapter_ids: [],
                topic_ids: [],
                question_ids: [],
            });

            return;
        }

        if (level === 'class') {
            setData({
                ...data,
                class_id: value ? String(value.id) : '',
                subject_id: '',
                chapter_ids: [],
                topic_ids: [],
                question_ids: [],
            });

            return;
        }

        setData({
            ...data,
            subject_id: value ? String(value.id) : '',
            chapter_ids: [],
            topic_ids: [],
            question_ids: [],
        });
    }
    function chapterTopicIds(chapter: ChapterOption) {
        return chapter.topics.map((topic) => topic.id);
    }
    function selectedChapterTopicIds(chapter: ChapterOption) {
        const topicIds = new Set(chapterTopicIds(chapter));

        return data.topic_ids.filter((id) => topicIds.has(id));
    }
    function chapterState(chapter: ChapterOption): SelectionState {
        const selected = data.chapter_ids.includes(chapter.id);

        if (chapter.topics.length === 0) {
            return selected ? 'checked' : 'unchecked';
        }

        const selectedTopics = selectedChapterTopicIds(chapter);

        if (selected && selectedTopics.length === 0) {
            return 'checked';
        }

        if (selectedTopics.length === 0) {
            return 'unchecked';
        }

        return selectedTopics.length === chapter.topics.length
            ? 'checked'
            : 'indeterminate';
    }
    function allChaptersState(): SelectionState {
        if (!chapters || chapters.length === 0) {
            return 'unchecked';
        }

        const states = chapters.map((chapter) => chapterState(chapter));

        if (states.every((state) => state === 'checked')) {
            return 'checked';
        }

        return states.some((state) => state !== 'unchecked')
            ? 'indeterminate'
            : 'unchecked';
    }
    function chapterGroupState(group: ChapterGroup): SelectionState {
        const states = group.items.map((chapter) => chapterState(chapter));

        if (states.every((state) => state === 'checked')) {
            return 'checked';
        }

        return states.some((state) => state !== 'unchecked')
            ? 'indeterminate'
            : 'unchecked';
    }
    function toggleChapter(chapter: ChapterOption) {
        const state = chapterState(chapter);
        const topicIds = new Set(chapterTopicIds(chapter));
        const nextChapterIds = new Set(data.chapter_ids);
        const nextTopicIds = new Set(
            data.topic_ids.filter((id) => !topicIds.has(id)),
        );

        if (state === 'checked') {
            nextChapterIds.delete(chapter.id);
        } else {
            nextChapterIds.add(chapter.id);
            chapter.topics.forEach((topic) => nextTopicIds.add(topic.id));
        }

        setData({
            ...data,
            chapter_ids: Array.from(nextChapterIds),
            topic_ids: Array.from(nextTopicIds),
            question_ids: [],
        });
    }
    function toggleTopic(chapter: ChapterOption, topicId: number) {
        const topicIds = chapterTopicIds(chapter);
        const chapterTopicSet = new Set(topicIds);
        const nextTopicIds = new Set(data.topic_ids);

        if (
            data.chapter_ids.includes(chapter.id) &&
            selectedChapterTopicIds(chapter).length === 0
        ) {
            topicIds.forEach((id) => nextTopicIds.add(id));
        }

        if (nextTopicIds.has(topicId)) {
            nextTopicIds.delete(topicId);
        } else {
            nextTopicIds.add(topicId);
        }

        const hasChapterTopic = Array.from(nextTopicIds).some((id) =>
            chapterTopicSet.has(id),
        );
        const nextChapterIds = new Set(data.chapter_ids);

        if (hasChapterTopic) {
            nextChapterIds.add(chapter.id);
        } else {
            nextChapterIds.delete(chapter.id);
        }

        setData({
            ...data,
            chapter_ids: Array.from(nextChapterIds),
            topic_ids: Array.from(nextTopicIds),
            question_ids: [],
        });
    }
    function toggleChapterGroup(group: ChapterGroup) {
        const shouldClear = chapterGroupState(group) === 'checked';
        const nextChapterIds = new Set(data.chapter_ids);
        const nextTopicIds = new Set(data.topic_ids);

        for (const chapter of group.items) {
            const topicIds = chapterTopicIds(chapter);

            if (shouldClear) {
                nextChapterIds.delete(chapter.id);
                topicIds.forEach((id) => nextTopicIds.delete(id));
            } else {
                nextChapterIds.add(chapter.id);
                topicIds.forEach((id) => nextTopicIds.add(id));
            }
        }

        setData({
            ...data,
            chapter_ids: Array.from(nextChapterIds),
            topic_ids: Array.from(nextTopicIds),
            question_ids: [],
        });
    }
    function toggleAllChapters() {
        if (!chapters || chapters.length === 0) {
            return;
        }

        if (allChaptersState() === 'checked') {
            setData({
                ...data,
                chapter_ids: [],
                topic_ids: [],
                question_ids: [],
            });

            return;
        }

        setData({
            ...data,
            chapter_ids: chapters.map((chapter) => chapter.id),
            topic_ids: chapters.flatMap((chapter) =>
                chapter.topics.map((topic) => topic.id),
            ),
            question_ids: [],
        });
    }
    function toggleFilter(
        value: string,
        values: string[],
        update: (values: string[]) => void,
    ) {
        if (values.includes(value) && values.length === 1) {
            return;
        }

        update(
            values.includes(value)
                ? values.filter((item) => item !== value)
                : [...values, value],
        );
    }
    function buildAutomaticSelection() {
        const count = Math.max(
            1,
            Math.min(Number(automaticCount) || 1, questions.length),
        );
        setData(
            'question_ids',
            [...questions]
                .sort(() => Math.random() - 0.5)
                .slice(0, count)
                .map((question) => question.id),
        );
    }
    function toggleQuestion(id: number) {
        setData(
            'question_ids',
            data.question_ids.includes(id)
                ? data.question_ids.filter((item) => item !== id)
                : [...data.question_ids, id],
        );
    }
    function chooseTiming(value: TimingMode) {
        setData({
            ...data,
            timing_mode: value,
            allow_back_navigation:
                value === 'per_question' ? false : data.allow_back_navigation,
            allow_skip: value === 'per_question' ? false : data.allow_skip,
        });
    }
    function nextStep() {
        const next = STEPS[stepIndex + 1]?.id;

        if (next) {
            setStep(next);
        }
    }
    function previousStep() {
        const previous = STEPS[stepIndex - 1]?.id;

        if (previous) {
            setStep(previous);
        }
    }
    function submit(event: React.FormEvent) {
        event.preventDefault();

        if (mode === 'create') {
            post('/online-tests');
        } else {
            put(`/online-tests/${test?.id}`);
        }
    }

    function renderScope() {
        return (
            <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900">
                    <SectionTitle
                        icon={<Layers3Icon className="size-4" />}
                        title="Choose the scope"
                    />
                    <div className="grid gap-4 md:grid-cols-3">
                        <FloatingCombobox
                            label="Pattern"
                            leadingIcon={FileTextIcon}
                            options={patternOptions}
                            value={selectedPattern}
                            onChange={(value) => resetScope('pattern', value)}
                        />
                        <FloatingCombobox
                            label="Class"
                            leadingIcon={GraduationCapIcon}
                            options={classOptions}
                            value={selectedClass}
                            onChange={(value) => resetScope('class', value)}
                            disabled={!selectedPattern}
                        />
                        <FloatingCombobox
                            label="Subject"
                            leadingIcon={BookOpenIcon}
                            options={subjectOptions}
                            value={selectedSubject}
                            onChange={(value) => resetScope('subject', value)}
                            disabled={!selectedClass}
                        />
                    </div>
                    <FieldError
                        message={
                            errors.pattern_id ??
                            errors.class_id ??
                            errors.subject_id
                        }
                    />
                </section>

                {scopeComplete && (
                    <section>
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                Chapters &amp; topics
                            </h2>
                            {chapters && chapters.length > 0 && (
                                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                                    <TriCheckbox
                                        state={allChaptersState()}
                                        onChange={toggleAllChapters}
                                        label="Select all chapters and topics"
                                        size="sm"
                                    />{' '}
                                    <button
                                        type="button"
                                        onClick={toggleAllChapters}
                                        className="cursor-pointer text-xs font-medium text-slate-700 transition-colors hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300"
                                    >
                                        Select all
                                    </button>
                                </div>
                            )}
                        </div>
                        {chapterLoading && (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                                    />
                                ))}
                            </div>
                        )}
                        {!chapterLoading && chapters?.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 py-14 text-center dark:border-slate-700 dark:bg-slate-900/40">
                                <BookOpenIcon className="mx-auto size-6 text-slate-400" />
                                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                                    No chapters are available for this scope.
                                </p>
                            </div>
                        )}
                        {!chapterLoading && chapters && chapters.length > 0 && (
                            <>
                                {isChapterWiseSubject ? (
                                    <div className="grid items-start gap-4 lg:grid-cols-2">
                                        {chapterGroups.map((group, index) => (
                                            <DirectChapterGroup
                                                key={`${group.heading ?? 'none'}-${index}`}
                                                group={group}
                                                state={chapterGroupState(group)}
                                                selectedChapterIds={
                                                    data.chapter_ids
                                                }
                                                onToggleGroup={() =>
                                                    toggleChapterGroup(group)
                                                }
                                                onToggleChapter={toggleChapter}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {chapterGroups.map((group, index) => (
                                            <div
                                                key={`${group.heading ?? 'none'}-${index}`}
                                            >
                                                {group.heading && (
                                                    <h3 className="mb-2 text-[11px] font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                                                        {group.heading}
                                                    </h3>
                                                )}
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    {group.items.map(
                                                        (chapter) => (
                                                            <ChapterTopicCard
                                                                key={chapter.id}
                                                                chapter={
                                                                    chapter
                                                                }
                                                                state={chapterState(
                                                                    chapter,
                                                                )}
                                                                selectedTopics={
                                                                    new Set(
                                                                        selectedChapterTopicIds(
                                                                            chapter,
                                                                        ),
                                                                    )
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
                                                                        chapter,
                                                                        topicId,
                                                                    )
                                                                }
                                                            />
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                        <FieldError message={errors.chapter_ids} />
                    </section>
                )}
            </div>
        );
    }

    function renderQuestions() {
        return (
            <div className="space-y-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <SectionTitle
                        icon={<ListChecksIcon className="size-4" />}
                        title="Build the objective section"
                        aside={
                            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                                {data.question_ids.length} selected
                            </span>
                        }
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ChoiceCard
                            selected={selectionMode === 'automatic'}
                            icon={<SparklesIcon className="size-5" />}
                            title="Quick selection"
                            description="Choose a count and let TestMaker create a random set from this scope."
                            onClick={() => setSelectionMode('automatic')}
                        />
                        <ChoiceCard
                            selected={selectionMode === 'manual'}
                            icon={<ListChecksIcon className="size-5" />}
                            title="Select myself"
                            description="Review the available objectives and choose every question yourself."
                            onClick={() => setSelectionMode('manual')}
                        />
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5 dark:border-slate-800">
                        {sourceOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                    toggleFilter(
                                        option.value,
                                        activeSources,
                                        setActiveSources,
                                    )
                                }
                                className={cn(
                                    'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                                    activeSources.includes(option.value)
                                        ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300'
                                        : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400',
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                        <span className="mx-1 hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-800" />
                        {difficultyOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                    toggleFilter(
                                        option.value,
                                        activeDifficulties,
                                        setActiveDifficulties,
                                    )
                                }
                                className={cn(
                                    'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                                    activeDifficulties.includes(option.value)
                                        ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300'
                                        : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400',
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </section>

                {questionLoading ? (
                    <div className="flex min-h-52 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <LoaderCircleIcon className="size-6 animate-spin text-brand-600" />
                    </div>
                ) : questions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 py-14 text-center dark:border-slate-700 dark:bg-slate-900/40">
                        <ListChecksIcon className="mx-auto size-6 text-slate-400" />
                        <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                            No usable single-answer objectives match these
                            filters.
                        </p>
                    </div>
                ) : selectionMode === 'automatic' ? (
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-md">
                                <Label htmlFor="automatic_count">
                                    Number of questions
                                </Label>
                                <div className="mt-1.5 flex gap-2">
                                    <Input
                                        id="automatic_count"
                                        type="number"
                                        min="1"
                                        max={questions.length}
                                        value={automaticCount}
                                        onChange={(event) =>
                                            setAutomaticCount(
                                                event.target.value,
                                            )
                                        }
                                        className="max-w-32"
                                    />
                                    <button
                                        type="button"
                                        onClick={buildAutomaticSelection}
                                        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                                    >
                                        {selectedQuestions.length ? (
                                            <RefreshCwIcon className="size-4" />
                                        ) : (
                                            <SparklesIcon className="size-4" />
                                        )}
                                        {selectedQuestions.length
                                            ? 'Create another set'
                                            : 'Create question set'}
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                    {questions.length} questions are available
                                    in the current pool.
                                </p>
                            </div>
                            {selectedQuestions.length > 0 && (
                                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                    <CheckIcon className="mr-2 inline size-4" />
                                    A set of {selectedQuestions.length}{' '}
                                    questions is ready
                                </div>
                            )}
                        </div>
                        {selectedQuestions.length > 0 && (
                            <div className="mt-5 grid gap-2 border-t border-slate-100 pt-5 md:grid-cols-2 dark:border-slate-800">
                                {selectedQuestions
                                    .slice(0, 8)
                                    .map((question, index) => (
                                        <div
                                            key={question.id}
                                            className="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60"
                                        >
                                            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white text-[11px] font-bold text-slate-500 shadow-sm dark:bg-slate-900">
                                                {index + 1}
                                            </span>
                                            <p className="line-clamp-2 text-xs leading-5 text-slate-700 dark:text-slate-300">
                                                {question.prompt}
                                            </p>
                                        </div>
                                    ))}
                                {selectedQuestions.length > 8 && (
                                    <p className="px-3 py-2 text-xs text-slate-500">
                                        + {selectedQuestions.length - 8} more
                                        questions
                                    </p>
                                )}
                            </div>
                        )}
                    </section>
                ) : (
                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                            <div className="relative max-w-md flex-1">
                                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={questionSearch}
                                    onChange={(event) =>
                                        setQuestionSearch(event.target.value)
                                    }
                                    placeholder="Search questions"
                                    className="pl-9"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    setData(
                                        'question_ids',
                                        data.question_ids.length ===
                                            questions.length
                                            ? []
                                            : questions.map(
                                                  (question) => question.id,
                                              ),
                                    )
                                }
                                className="text-xs font-semibold text-brand-700 dark:text-brand-300"
                            >
                                {data.question_ids.length === questions.length
                                    ? 'Clear all'
                                    : 'Select all'}
                            </button>
                        </div>
                        <div className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                            {filteredQuestions.map((question) => {
                                const checked = data.question_ids.includes(
                                    question.id,
                                );

                                return (
                                    <button
                                        key={question.id}
                                        type="button"
                                        onClick={() =>
                                            toggleQuestion(question.id)
                                        }
                                        className={cn(
                                            'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors',
                                            checked
                                                ? 'bg-brand-50/50 dark:bg-brand-500/[0.05]'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                                        )}
                                    >
                                        <CheckControl checked={checked} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm leading-6 font-medium text-slate-900 dark:text-slate-100">
                                                {question.prompt}
                                            </span>
                                            <span className="mt-1 block text-xs text-slate-500">
                                                {[
                                                    question.chapter_name,
                                                    question.topic_name,
                                                    question.source_label,
                                                    question.difficulty &&
                                                        `${question.difficulty} difficulty`,
                                                    `${question.option_count} options`,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}
                <FieldError message={errors.question_ids} />
            </div>
        );
    }

    function renderExperience() {
        return (
            <div className="grid gap-5 xl:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <SectionTitle
                        icon={<TimerIcon className="size-4" />}
                        title="Timing"
                    />
                    <div className="grid gap-2 sm:grid-cols-3">
                        <ChoiceCard
                            selected={data.timing_mode === 'whole_test'}
                            icon={<Clock3Icon className="size-5" />}
                            title="Test timer"
                            description="One countdown for the entire test."
                            onClick={() => chooseTiming('whole_test')}
                        />
                        <ChoiceCard
                            selected={data.timing_mode === 'per_question'}
                            icon={<TimerIcon className="size-5" />}
                            title="Per question"
                            description="Each MCQ gets its own countdown."
                            onClick={() => chooseTiming('per_question')}
                        />
                        <ChoiceCard
                            selected={data.timing_mode === 'none'}
                            icon={<EyeIcon className="size-5" />}
                            title="Untimed"
                            description="Students work at their own pace."
                            onClick={() => chooseTiming('none')}
                        />
                    </div>
                    {data.timing_mode === 'whole_test' && (
                        <div className="mt-4 max-w-xs">
                            <Label htmlFor="duration_minutes">
                                Test duration in minutes
                            </Label>
                            <Input
                                id="duration_minutes"
                                type="number"
                                min="1"
                                max="300"
                                value={data.duration_minutes}
                                onChange={(event) =>
                                    setData(
                                        'duration_minutes',
                                        event.target.value,
                                    )
                                }
                                className="mt-1.5"
                            />
                            <FieldError message={errors.duration_minutes} />
                        </div>
                    )}
                    {data.timing_mode === 'per_question' && (
                        <div className="mt-4 max-w-xs">
                            <Label htmlFor="question_time_seconds">
                                Seconds for each question
                            </Label>
                            <Input
                                id="question_time_seconds"
                                type="number"
                                min="10"
                                max="3600"
                                value={data.question_time_seconds}
                                onChange={(event) =>
                                    setData(
                                        'question_time_seconds',
                                        event.target.value,
                                    )
                                }
                                className="mt-1.5"
                            />
                            <FieldError
                                message={errors.question_time_seconds}
                            />
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <SectionTitle
                        icon={<ArrowRightIcon className="size-4" />}
                        title="Question flow"
                    />
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        <ToggleRow
                            title="Move on after selection"
                            description="Selecting an option immediately opens the next question."
                            checked={data.auto_advance}
                            onChange={(checked) =>
                                setData('auto_advance', checked)
                            }
                        />
                        <ToggleRow
                            title="Allow previous questions"
                            description={
                                data.timing_mode === 'per_question'
                                    ? 'Unavailable with a per-question timer.'
                                    : 'Students can return to questions they have reached.'
                            }
                            checked={data.allow_back_navigation}
                            onChange={(checked) =>
                                setData('allow_back_navigation', checked)
                            }
                            disabled={data.timing_mode === 'per_question'}
                        />
                        <ToggleRow
                            title="Allow unanswered questions"
                            description={
                                data.timing_mode === 'per_question'
                                    ? 'Per-question timing advances automatically.'
                                    : 'Students can continue without choosing an answer.'
                            }
                            checked={data.allow_skip}
                            onChange={(checked) =>
                                setData('allow_skip', checked)
                            }
                            disabled={data.timing_mode === 'per_question'}
                        />
                        <ToggleRow
                            title="Shuffle question order"
                            description="Each student receives a different question order."
                            checked={data.shuffle_questions}
                            onChange={(checked) =>
                                setData('shuffle_questions', checked)
                            }
                        />
                        <ToggleRow
                            title="Shuffle answer options"
                            description="Option order changes while marking remains correct."
                            checked={data.shuffle_options}
                            onChange={(checked) =>
                                setData('shuffle_options', checked)
                            }
                        />
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <SectionTitle
                        icon={<ShieldCheckIcon className="size-4" />}
                        title="Test integrity"
                    />
                    <div className="grid gap-2 sm:grid-cols-3">
                        <ChoiceCard
                            selected={data.focus_loss_action === 'allow'}
                            icon={<MonitorUpIcon className="size-5" />}
                            title="Allow switching"
                            description="No action when the tab loses focus."
                            onClick={() =>
                                setData('focus_loss_action', 'allow')
                            }
                        />
                        <ChoiceCard
                            selected={data.focus_loss_action === 'warn'}
                            icon={<EyeIcon className="size-5" />}
                            title="Record switching"
                            description="Track tab switches silently for teacher review."
                            onClick={() => setData('focus_loss_action', 'warn')}
                        />
                        <ChoiceCard
                            selected={data.focus_loss_action === 'submit'}
                            icon={<LockKeyholeIcon className="size-5" />}
                            title="Auto-submit"
                            description="Leaving the test ends the attempt."
                            onClick={() =>
                                setData('focus_loss_action', 'submit')
                            }
                        />
                    </div>
                    <div className="mt-3 border-t border-slate-100 dark:border-slate-800">
                        <ToggleRow
                            title="Require fullscreen"
                            description="Students enter fullscreen before answering. Browser security still permits system shortcuts."
                            checked={data.require_fullscreen}
                            onChange={(checked) =>
                                setData('require_fullscreen', checked)
                            }
                        />
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <SectionTitle
                        icon={<Settings2Icon className="size-4" />}
                        title="Availability and results"
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="available_from">
                                Opens at{' '}
                                <span className="font-normal text-slate-400">
                                    (optional)
                                </span>
                            </Label>
                            <Input
                                id="available_from"
                                type="datetime-local"
                                value={data.available_from}
                                onChange={(event) =>
                                    setData(
                                        'available_from',
                                        event.target.value,
                                    )
                                }
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label htmlFor="available_until">
                                Closes at{' '}
                                <span className="font-normal text-slate-400">
                                    (optional)
                                </span>
                            </Label>
                            <Input
                                id="available_until"
                                type="datetime-local"
                                value={data.available_until}
                                onChange={(event) =>
                                    setData(
                                        'available_until',
                                        event.target.value,
                                    )
                                }
                                className="mt-1.5"
                            />
                        </div>
                    </div>
                    <FieldError message={errors.available_until} />
                    <div className="mt-3 divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                        <ToggleRow
                            title="Show score after submission"
                            description="Students see marks and pass status immediately."
                            checked={data.show_result}
                            onChange={(checked) =>
                                setData({
                                    ...data,
                                    show_result: checked,
                                    show_correct_answers: checked
                                        ? data.show_correct_answers
                                        : false,
                                })
                            }
                        />
                        <ToggleRow
                            title="Show correct answers"
                            description="Include an answer review after submission."
                            checked={data.show_correct_answers}
                            onChange={(checked) =>
                                setData('show_correct_answers', checked)
                            }
                            disabled={!data.show_result}
                        />
                    </div>
                    {data.show_result && (
                        <div className="max-w-xs pt-3">
                            <Label htmlFor="passing_percentage">
                                Passing percentage
                            </Label>
                            <Input
                                id="passing_percentage"
                                type="number"
                                min="0"
                                max="100"
                                value={data.passing_percentage}
                                onChange={(event) =>
                                    setData(
                                        'passing_percentage',
                                        event.target.value,
                                    )
                                }
                                className="mt-1.5"
                            />
                        </div>
                    )}
                </section>
            </div>
        );
    }

    function renderReview() {
        const timing =
            data.timing_mode === 'whole_test'
                ? `${data.duration_minutes} minute test timer`
                : data.timing_mode === 'per_question'
                  ? `${data.question_time_seconds} seconds per question`
                  : 'No countdown timer';

        return (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <SectionTitle
                        icon={<FileTextIcon className="size-4" />}
                        title="Test details"
                    />
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="title">Test title</Label>
                            <Input
                                id="title"
                                value={data.title}
                                onChange={(event) =>
                                    setData('title', event.target.value)
                                }
                                placeholder={`${selectedSubject?.label ?? 'Subject'} online test`}
                                className="mt-1.5"
                            />
                            <FieldError message={errors.title} />
                        </div>
                        <div>
                            <Label htmlFor="instructions">
                                Instructions{' '}
                                <span className="font-normal text-slate-400">
                                    (optional)
                                </span>
                            </Label>
                            <textarea
                                id="instructions"
                                rows={6}
                                value={data.instructions}
                                onChange={(event) =>
                                    setData('instructions', event.target.value)
                                }
                                placeholder="Add only instructions specific to this test."
                                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                            />
                            <FieldError message={errors.instructions} />
                        </div>
                    </div>
                </section>
                <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <SectionTitle
                        icon={<ShieldCheckIcon className="size-4" />}
                        title="Ready to save"
                    />
                    <dl className="space-y-4 text-sm">
                        <div>
                            <dt className="text-xs text-slate-500">Scope</dt>
                            <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                                {selectedClass?.label} ·{' '}
                                {selectedSubject?.label}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">
                                Questions
                            </dt>
                            <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                                {data.question_ids.length} single-answer MCQs
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Timing</dt>
                            <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                                {timing}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">
                                Navigation
                            </dt>
                            <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                                {data.allow_back_navigation
                                    ? 'Previous questions allowed'
                                    : 'Forward only'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">
                                Tab switching
                            </dt>
                            <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                                {data.focus_loss_action === 'allow'
                                    ? 'Allowed'
                                    : data.focus_loss_action === 'warn'
                                      ? 'Record silently'
                                      : 'Auto-submit attempt'}
                            </dd>
                        </div>
                    </dl>
                    <div className="mt-5 rounded-xl bg-brand-50 p-3 text-xs leading-5 text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
                        Saving creates a draft. Review it, then publish the
                        student link when ready.
                    </div>
                </aside>
            </div>
        );
    }

    const backHref =
        mode === 'create' ? '/online-tests' : `/online-tests/${test?.id}`;
    const continueDisabled =
        (step === 'scope' && data.chapter_ids.length === 0) ||
        (step === 'questions' && data.question_ids.length === 0);

    return (
        <>
            <Head
                title={
                    mode === 'create'
                        ? 'Create Online Test'
                        : 'Edit Online Test'
                }
            />
            <form onSubmit={submit} className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={backHref}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                            <ArrowLeftIcon className="size-4" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                                {mode === 'create'
                                    ? 'Create Online Test'
                                    : 'Edit Online Test'}
                            </h1>
                            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                                Build the test in four focused steps.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        {STEPS.map((item, index) => {
                            const itemIndex = STEPS.findIndex(
                                (candidate) => candidate.id === item.id,
                            );
                            const state =
                                item.id === step
                                    ? 'active'
                                    : itemIndex < stepIndex
                                      ? 'done'
                                      : 'upcoming';

                            return (
                                <div
                                    key={item.id}
                                    className="flex items-center"
                                >
                                    {index > 0 && (
                                        <div className="mx-0.5 h-px w-3 bg-slate-200 sm:w-5 dark:bg-slate-800" />
                                    )}
                                    <button
                                        type="button"
                                        disabled={itemIndex >= stepIndex}
                                        onClick={() => setStep(item.id)}
                                        className={cn(
                                            'inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold transition-colors',
                                            state === 'active' &&
                                                'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
                                            state === 'done' &&
                                                'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
                                            state === 'upcoming' &&
                                                'text-slate-400 dark:text-slate-600',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex size-5 items-center justify-center rounded-full text-[10px]',
                                                state === 'active' &&
                                                    'bg-brand-600 text-white',
                                                state === 'done' &&
                                                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
                                                state === 'upcoming' &&
                                                    'bg-slate-100 text-slate-400 dark:bg-slate-800',
                                            )}
                                        >
                                            {state === 'done' ? (
                                                <CheckIcon
                                                    className="size-3"
                                                    strokeWidth={3}
                                                />
                                            ) : (
                                                index + 1
                                            )}
                                        </span>
                                        <span className="hidden sm:inline">
                                            {item.label}
                                        </span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {catalogError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                        {catalogError}
                    </div>
                )}
                {step === 'scope' && renderScope()}
                {step === 'questions' && renderQuestions()}
                {step === 'experience' && renderExperience()}
                {step === 'review' && renderReview()}

                <div className="flex items-center justify-between border-t border-slate-200 pt-5 dark:border-slate-800">
                    <div>
                        {step !== 'scope' && (
                            <button
                                type="button"
                                onClick={previousStep}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                <ChevronLeftIcon className="size-4" /> Back
                            </button>
                        )}
                    </div>
                    {step !== 'review' ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            disabled={continueDisabled}
                            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Continue <ArrowRightIcon className="size-4" />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={processing || !data.title.trim()}
                            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {processing ? (
                                <LoaderCircleIcon className="size-4 animate-spin" />
                            ) : mode === 'create' ? (
                                <SparklesIcon className="size-4" />
                            ) : (
                                <Settings2Icon className="size-4" />
                            )}
                            {processing
                                ? 'Saving...'
                                : mode === 'create'
                                  ? 'Create draft'
                                  : 'Save changes'}
                        </button>
                    )}
                </div>
            </form>
        </>
    );
}

import { Head } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    BookOpenIcon,
    CheckIcon,
    FileTextIcon,
    GraduationCapIcon,
    GripVerticalIcon,
    LayersIcon,
    ListChecksIcon,
    Loader2Icon,
    MinusIcon,
    PlusIcon,
    PrinterIcon,
    RotateCcwIcon,
    SaveIcon,
    SearchIcon,
    SearchXIcon,
    SparklesIcon,
    Trash2Icon,
    XIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { FloatingCombobox } from '@/components/ui/floating-combobox';
import type { ComboboxOptionItem } from '@/components/ui/floating-combobox';
import { cn } from '@/lib/utils';
import { ClassicExamHeader } from './paper-layouts/headers/classic-exam-header';
import { QuestionEditModal } from './paper-layouts/questions/question-edit-modal';
import { BoxedObjectiveSection } from './paper-layouts/sections/boxed-objective-section';
import { SectionEditModal } from './paper-layouts/sections/section-edit-modal';
import { TwoColumnSubjectiveSection } from './paper-layouts/sections/two-column-subjective-section';
import type {
    GeneratedPaper,
    GeneratedPaperHeader,
    GeneratedPaperQuestion,
    GeneratedPaperSection,
    PaperImageSize,
    PaperQuestionOption,
} from './paper-layouts/types';

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

interface ChapterGroup {
    heading: string | null;
    items: Chapter[];
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
type SelectionMode = 'automatic' | 'manual';
type SourceFilterKey = string;
type SectionCategory = 'Objective Questions' | 'Subjective Questions';
type QuestionSectionField =
    | 'requiredQuestions'
    | 'marksPerQuestion'
    | 'choiceQuestions';

interface QuestionSelectionRow {
    id: string;
    requiredQuestions: string;
    marksPerQuestion: string;
    choiceQuestions: string;
    selectedQuestionIds: number[];
}

interface QuestionSelectionSection {
    id: string;
    questionTypeId: number;
    category: SectionCategory;
    title: string;
    availableCount: number;
    rows: QuestionSelectionRow[];
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

interface ManualQuestion {
    id: number;
    summaryText: string;
    schemaKey: string;
    isObjective: boolean;
    content: Record<string, unknown>;
    source: string | null;
    sourceLabel: string | null;
    chapter: {
        id: number;
        name: string;
        chapterNumber: number | null;
    };
    topic: {
        id: number;
        name: string;
    } | null;
}

interface ManualPickerRow {
    section: QuestionSelectionSection;
    row: QuestionSelectionRow;
    target: number;
}

interface ManualPickerTarget {
    sectionId: string;
    rowId: string;
}

interface PaperQuestionPickerTarget {
    sectionId: string;
    questionId: string;
}

interface PaperSectionEditorTarget {
    sectionId: string;
}

interface PaperQuestionEditorTarget {
    sectionId: string;
    questionId: string;
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

function toNumber(value: string): number {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
}

function onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
}

function createQuestionRow(id: string): QuestionSelectionRow {
    return {
        id,
        requiredQuestions: '',
        marksPerQuestion: '',
        choiceQuestions: '',
        selectedQuestionIds: [],
    };
}

function rowTarget(row: QuestionSelectionRow): number {
    return toNumber(row.choiceQuestions);
}

function lineTotal(row: QuestionSelectionRow): number {
    return toNumber(row.requiredQuestions) * toNumber(row.marksPerQuestion);
}

function trimmedCount(value: string, maximum: number): string {
    if (value === '') {
        return '';
    }

    return String(Math.min(toNumber(value), Math.max(0, maximum)));
}

function normalizeQuestionRow(
    row: QuestionSelectionRow,
    availableCount: number,
): QuestionSelectionRow {
    const choiceQuestions = trimmedCount(row.choiceQuestions, availableCount);
    const requiredQuestions = trimmedCount(
        row.requiredQuestions,
        toNumber(choiceQuestions),
    );
    const normalized = {
        ...row,
        requiredQuestions,
        marksPerQuestion:
            toNumber(requiredQuestions) === 0 ? '' : row.marksPerQuestion,
        choiceQuestions,
    };

    return {
        ...normalized,
        selectedQuestionIds: normalized.selectedQuestionIds.slice(
            0,
            rowTarget(normalized),
        ),
    };
}

function normalizeSectionRows(
    rows: QuestionSelectionRow[],
    availableCount: number,
): QuestionSelectionRow[] {
    let remaining = availableCount;

    return rows.map((row) => {
        const normalized = normalizeQuestionRow(row, remaining);

        remaining = Math.max(0, remaining - rowTarget(normalized));

        return normalized;
    });
}

function availableForQuestionRow(
    section: QuestionSelectionSection,
    rowId: string,
): number {
    const usedByOtherRows = section.rows.reduce(
        (sum, row) => sum + (row.id === rowId ? 0 : rowTarget(row)),
        0,
    );

    return Math.max(0, section.availableCount - usedByOtherRows);
}

function shuffledQuestions(questions: ManualQuestion[]): ManualQuestion[] {
    return [...questions].sort(() => Math.random() - 0.5);
}

function paperQuestionFromManual(
    question: ManualQuestion,
    id: string,
): GeneratedPaperQuestion {
    return {
        id,
        sourceQuestionId: question.id,
        text: question.summaryText,
        source: question.source,
        sourceLabel: question.sourceLabel,
        chapterLabel: manualQuestionChapterLabel(question),
        topicLabel: question.topic?.name ?? null,
        imageUrl: null,
        imageSize: 'md',
        options: paperOptionsFromManual(question),
        answerLines: question.isObjective ? 0 : 0,
    };
}

function createCustomPaperQuestion(id: string): GeneratedPaperQuestion {
    return {
        id,
        sourceQuestionId: null,
        text: 'New question text',
        source: null,
        sourceLabel: null,
        chapterLabel: null,
        topicLabel: null,
        imageUrl: null,
        imageSize: 'md',
        options: [],
        answerLines: 0,
    };
}

function paperOptionsFromManual(
    question: ManualQuestion,
): PaperQuestionOption[] {
    if (question.schemaKey === 'objective_true_false') {
        return [
            { id: `${question.id}_true`, text: 'True' },
            { id: `${question.id}_false`, text: 'False' },
        ];
    }

    const options = question.content.options;

    if (!Array.isArray(options)) {
        return [];
    }

    return options
        .map((option, index) => {
            if (!option || typeof option !== 'object') {
                return null;
            }

            const value = option as Record<string, unknown>;
            const text = String(value.text_en || value.text_ur || '').trim();

            if (text === '') {
                return null;
            }

            return {
                id: `${question.id}_option_${index}`,
                text,
            };
        })
        .filter((option): option is PaperQuestionOption => option !== null);
}

function paperTotalMarks(paper: GeneratedPaper): number {
    return paper.sections.reduce(
        (sum, section) => sum + section.requiredQuestions * section.marksEach,
        0,
    );
}

function sectionTotal(section: QuestionSelectionSection): number {
    return section.rows.reduce((sum, row) => sum + lineTotal(row), 0);
}

function withTotalMarks(state: QuestionSelectionState): QuestionSelectionState {
    return {
        ...state,
        totalMarks: state.sections.reduce(
            (sum, section) => sum + sectionTotal(section),
            0,
        ),
    };
}

function mergeQuestionSections(
    incoming: QuestionTypeCount[],
    existing: QuestionSelectionSection[],
): QuestionSelectionSection[] {
    const existingByType = new Map(
        existing.map((section) => [section.questionTypeId, section]),
    );
    const incomingByType = new Map(
        incoming.map((section) => [section.questionTypeId, section]),
    );
    const orderedIncoming = [
        ...existing
            .map((section) => incomingByType.get(section.questionTypeId))
            .filter((section): section is QuestionTypeCount =>
                Boolean(section),
            ),
        ...incoming.filter(
            (section) => !existingByType.has(section.questionTypeId),
        ),
    ];

    return orderedIncoming.map((item) => {
        const current = existingByType.get(item.questionTypeId);
        const sectionId = current?.id ?? `sec_type_${item.questionTypeId}`;

        return {
            id: sectionId,
            questionTypeId: item.questionTypeId,
            category: item.category,
            title: item.title,
            availableCount: item.availableCount,
            rows: normalizeSectionRows(
                current?.rows ?? [createQuestionRow(`${sectionId}_row_001`)],
                item.availableCount,
            ),
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
                'flex shrink-0 cursor-pointer items-center justify-center rounded-[5px] border transition-all',
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
                'inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors',
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

function SelectionModeToggle({
    value,
    onChange,
}: {
    value: SelectionMode;
    onChange: (mode: SelectionMode) => void;
}) {
    return (
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950/60">
            <button
                type="button"
                onClick={() => onChange('automatic')}
                className={cn(
                    'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors',
                    value === 'automatic'
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                )}
            >
                <SparklesIcon className="size-3.5" />
                Auto Pick
            </button>
            <button
                type="button"
                onClick={() => onChange('manual')}
                className={cn(
                    'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors',
                    value === 'manual'
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                )}
            >
                <ListChecksIcon className="size-3.5" />
                Pick Manually
            </button>
        </div>
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

function CategoryDivider({ title }: { title: SectionCategory }) {
    return (
        <div className="border-b border-slate-100 pb-2 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {title}
            </h3>
        </div>
    );
}

function NumberField({
    value,
    label,
    placeholder,
    max,
    disabled = false,
    onChange,
}: {
    value: string;
    label: string;
    placeholder: string;
    max?: number;
    disabled?: boolean;
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
                max={max}
                disabled={disabled}
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(onlyDigits(event.target.value))}
                className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 transition-colors outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-teal-400 dark:focus:ring-teal-400/20 dark:disabled:bg-slate-900 dark:disabled:text-slate-600"
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
    const [selectionMode, setSelectionMode] =
        useState<SelectionMode>('automatic');
    const [isFooterSticky, setIsFooterSticky] = useState(false);
    const footerSentinelRef = useRef<HTMLDivElement>(null);
    const questionRowSequence = useRef(0);
    const paperSectionSequence = useRef(0);
    const paperQuestionSequence = useRef(0);
    const [draggedQuestionTypeId, setDraggedQuestionTypeId] = useState<
        string | null
    >(null);
    const [dragOverQuestionTypeId, setDragOverQuestionTypeId] = useState<
        string | null
    >(null);
    const [loadingQuestionSections, setLoadingQuestionSections] =
        useState(false);
    const [questionSectionError, setQuestionSectionError] = useState<
        string | null
    >(null);
    const [manualPickerTarget, setManualPickerTarget] =
        useState<ManualPickerTarget | null>(null);
    const [manualQuestions, setManualQuestions] = useState<ManualQuestion[]>(
        [],
    );
    const [loadingManualQuestions, setLoadingManualQuestions] = useState(false);
    const [manualQuestionError, setManualQuestionError] = useState<
        string | null
    >(null);
    const [manualSearch, setManualSearch] = useState('');
    const [showSelectedManualQuestions, setShowSelectedManualQuestions] =
        useState(false);
    const [generatedPaper, setGeneratedPaper] = useState<GeneratedPaper | null>(
        null,
    );
    const [questionPoolsByType, setQuestionPoolsByType] = useState<
        Record<number, ManualQuestion[]>
    >({});
    const [generatingPaper, setGeneratingPaper] = useState(false);
    const [paperGenerationError, setPaperGenerationError] = useState<
        string | null
    >(null);
    const [paperQuestionPickerTarget, setPaperQuestionPickerTarget] =
        useState<PaperQuestionPickerTarget | null>(null);
    const [paperQuestionSearch, setPaperQuestionSearch] = useState('');
    const [paperSectionEditorTarget, setPaperSectionEditorTarget] =
        useState<PaperSectionEditorTarget | null>(null);
    const [paperQuestionEditorTarget, setPaperQuestionEditorTarget] =
        useState<PaperQuestionEditorTarget | null>(null);
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
    const canContinueToQuestions = selectedChapterCount > 0;
    const manualPickerRows = useMemo(
        () =>
            questionSelection.sections.flatMap((section) =>
                section.rows
                    .map((row) => ({
                        section,
                        row,
                        target: rowTarget(row),
                    }))
                    .filter((item) => item.target > 0),
            ),
        [questionSelection.sections],
    );
    const activeManualPickerRow = useMemo(
        () =>
            manualPickerTarget
                ? (manualPickerRows.find(
                      (item) =>
                          item.section.id === manualPickerTarget.sectionId &&
                          item.row.id === manualPickerTarget.rowId,
                  ) ?? null)
                : null,
        [manualPickerRows, manualPickerTarget],
    );
    const selectedManualQuestionIds = useMemo(
        () =>
            new Set(
                questionSelection.sections.flatMap((section) =>
                    section.rows.flatMap((row) => row.selectedQuestionIds),
                ),
            ),
        [questionSelection.sections],
    );
    const totalManualQuestionsRequired = manualPickerRows.reduce(
        (sum, item) => sum + item.target,
        0,
    );
    const isManualSelectionComplete =
        totalManualQuestionsRequired > 0 &&
        manualPickerRows.every(
            (item) => item.row.selectedQuestionIds.length === item.target,
        );
    const isQuestionSelectionReady =
        manualPickerRows.length > 0 &&
        manualPickerRows.every(
            (item) =>
                toNumber(item.row.requiredQuestions) > 0 &&
                toNumber(item.row.marksPerQuestion) > 0,
        );
    const canGeneratePaper =
        questionSelection.totalMarks > 0 &&
        isQuestionSelectionReady &&
        (selectionMode === 'manual' ? isManualSelectionComplete : true);
    const activeManualQuestionTypeId =
        activeManualPickerRow?.section.questionTypeId ?? null;
    const activeManualSelectedQuestionIds = useMemo(
        () => new Set(activeManualPickerRow?.row.selectedQuestionIds ?? []),
        [activeManualPickerRow?.row.selectedQuestionIds],
    );
    const filteredManualQuestions = useMemo(() => {
        const search = manualSearch.trim().toLowerCase();

        return manualQuestions.filter((question) => {
            const matchesSelected =
                !showSelectedManualQuestions ||
                activeManualSelectedQuestionIds.has(question.id);
            const matchesSearch =
                search === '' ||
                question.summaryText.toLowerCase().includes(search) ||
                question.chapter.name.toLowerCase().includes(search) ||
                question.topic?.name.toLowerCase().includes(search) ||
                question.sourceLabel?.toLowerCase().includes(search);

            return matchesSelected && matchesSearch;
        });
    }, [
        activeManualSelectedQuestionIds,
        manualQuestions,
        manualSearch,
        showSelectedManualQuestions,
    ]);
    const generatedSourceQuestionIds = useMemo(
        () =>
            new Set(
                generatedPaper?.sections.flatMap((section) =>
                    section.questions
                        .map((question) => question.sourceQuestionId)
                        .filter((id): id is number => id !== null),
                ) ?? [],
            ),
        [generatedPaper],
    );
    const activePaperPickerContext = useMemo(() => {
        if (!generatedPaper || !paperQuestionPickerTarget) {
            return null;
        }

        const section = generatedPaper.sections.find(
            (item) => item.id === paperQuestionPickerTarget.sectionId,
        );
        const question = section?.questions.find(
            (item) => item.id === paperQuestionPickerTarget.questionId,
        );

        if (!section || !question || section.questionTypeId === null) {
            return null;
        }

        return { section, question };
    }, [generatedPaper, paperQuestionPickerTarget]);
    const activePaperSectionEditorContext = useMemo(() => {
        if (!generatedPaper || !paperSectionEditorTarget) {
            return null;
        }

        return (
            generatedPaper.sections.find(
                (section) => section.id === paperSectionEditorTarget.sectionId,
            ) ?? null
        );
    }, [generatedPaper, paperSectionEditorTarget]);
    const activePaperQuestionEditorContext = useMemo(() => {
        if (!generatedPaper || !paperQuestionEditorTarget) {
            return null;
        }

        const section = generatedPaper.sections.find(
            (item) => item.id === paperQuestionEditorTarget.sectionId,
        );
        const question = section?.questions.find(
            (item) => item.id === paperQuestionEditorTarget.questionId,
        );

        if (!section || !question) {
            return null;
        }

        return { section, question };
    }, [generatedPaper, paperQuestionEditorTarget]);
    const filteredPaperPickerQuestions = useMemo(() => {
        if (!activePaperPickerContext?.section.questionTypeId) {
            return [];
        }

        const search = paperQuestionSearch.trim().toLowerCase();
        const pool =
            questionPoolsByType[
                activePaperPickerContext.section.questionTypeId
            ] ?? [];

        return pool.filter((question) => {
            const matchesSearch =
                search === '' ||
                question.summaryText.toLowerCase().includes(search) ||
                question.chapter.name.toLowerCase().includes(search) ||
                question.topic?.name.toLowerCase().includes(search) ||
                question.sourceLabel?.toLowerCase().includes(search);

            return matchesSearch;
        });
    }, [
        activePaperPickerContext?.section.questionTypeId,
        paperQuestionSearch,
        questionPoolsByType,
    ]);

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
        const sentinel = footerSentinelRef.current;

        if (!sentinel) {
            return;
        }

        const observer = new IntersectionObserver(([entry]) => {
            setIsFooterSticky(!entry.isIntersecting);
        });

        observer.observe(sentinel);

        return () => observer.disconnect();
    }, []);

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

    useEffect(() => {
        if (
            !manualPickerTarget ||
            activeManualQuestionTypeId === null ||
            selectedChapterIds.length === 0
        ) {
            return;
        }

        const abortController = new AbortController();
        const params = new URLSearchParams({
            question_type_id: String(activeManualQuestionTypeId),
        });

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
                setLoadingManualQuestions(true);
                setManualQuestionError(null);
                setManualQuestions([]);
            }
        });

        fetch(`/papers/generate/questions?${params.toString()}`, {
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
            .then((data: { questions: ManualQuestion[] }) =>
                setManualQuestions(data.questions),
            )
            .catch((error) => {
                if (error?.name !== 'AbortError') {
                    setManualQuestionError(
                        'Unable to load questions. Please try again.',
                    );
                    setManualQuestions([]);
                }
            })
            .finally(() => setLoadingManualQuestions(false));

        return () => abortController.abort();
    }, [
        activeManualQuestionTypeId,
        activeSourceValues,
        manualPickerTarget,
        selectedChapterIds,
        selectedTopicIds,
    ]);

    function resetQuestionSelection() {
        setQuestionSelection({
            globalFilters: createGlobalFilters(sourceFilters),
            sections: [],
            totalMarks: 0,
        });
        setSelectionMode('automatic');
        setManualPickerTarget(null);
        setManualQuestions([]);
        setManualQuestionError(null);
        setManualSearch('');
        setShowSelectedManualQuestions(false);
        setGeneratedPaper(null);
        setQuestionPoolsByType({});
        setGeneratingPaper(false);
        setPaperGenerationError(null);
        setPaperQuestionPickerTarget(null);
        setPaperQuestionSearch('');
        setPaperSectionEditorTarget(null);
        setPaperQuestionEditorTarget(null);
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
        clearManualQuestionSelections();
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
        clearManualQuestionSelections();
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

    function allChaptersState(): 'unchecked' | 'checked' | 'indeterminate' {
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

    function chapterGroupState(
        group: ChapterGroup,
    ): 'unchecked' | 'checked' | 'indeterminate' {
        const states = group.items.map((chapter) => chapterState(chapter));

        if (states.every((state) => state === 'checked')) {
            return 'checked';
        }

        return states.some((state) => state !== 'unchecked')
            ? 'indeterminate'
            : 'unchecked';
    }

    function toggleChapterGroup(group: ChapterGroup) {
        const shouldClear = chapterGroupState(group) === 'checked';

        setSelected((current) => {
            const next = { ...current };

            for (const chapter of group.items) {
                if (shouldClear) {
                    delete next[chapter.id];
                } else {
                    next[chapter.id] =
                        chapter.topics.length > 0
                            ? new Set(chapter.topics.map((topic) => topic.id))
                            : new Set([CHAPTER_ONLY_SELECTION]);
                }
            }

            return next;
        });
    }

    function toggleAllChapters() {
        if (!chapters || chapters.length === 0) {
            return;
        }

        clearManualQuestionSelections();

        if (allChaptersState() === 'checked') {
            setSelected({});

            return;
        }

        const all: Record<number, Set<number>> = {};

        for (const chapter of chapters) {
            all[chapter.id] =
                chapter.topics.length > 0
                    ? new Set(chapter.topics.map((topic) => topic.id))
                    : new Set([CHAPTER_ONLY_SELECTION]);
        }

        setSelected(all);
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

    function handleSelectionModeChange(mode: SelectionMode) {
        setSelectionMode(mode);

        if (mode === 'automatic') {
            setManualPickerTarget(null);
        }
    }

    function openManualQuestionPicker(sectionId: string, rowId: string) {
        const row = manualPickerRows.find(
            (item) => item.section.id === sectionId && item.row.id === rowId,
        );

        if (!row) {
            return;
        }

        setManualSearch('');
        setShowSelectedManualQuestions(false);
        setManualPickerTarget({ sectionId, rowId });
    }

    function closeManualQuestionPicker() {
        setManualPickerTarget(null);
        setManualSearch('');
        setShowSelectedManualQuestions(false);
    }

    function nextPaperQuestionId(prefix = 'paper_q') {
        paperQuestionSequence.current += 1;

        return `${prefix}_${paperQuestionSequence.current}`;
    }

    function nextPaperSectionId(prefix = 'paper_sec') {
        paperSectionSequence.current += 1;

        return `${prefix}_${paperSectionSequence.current}`;
    }

    function questionPoolParams(questionTypeId: number) {
        const params = new URLSearchParams({
            question_type_id: String(questionTypeId),
        });

        selectedChapterIds.forEach((id) =>
            params.append('chapter_ids[]', String(id)),
        );
        selectedTopicIds.forEach((id) =>
            params.append('topic_ids[]', String(id)),
        );
        activeSourceValues.forEach((source) =>
            params.append('sources[]', source),
        );

        return params;
    }

    async function fetchQuestionPool(questionTypeId: number) {
        const response = await fetch(
            `/papers/generate/questions?${questionPoolParams(questionTypeId).toString()}`,
            {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            },
        );

        if (!response.ok) {
            throw new Error('Unable to load questions for paper generation.');
        }

        const data = (await response.json()) as { questions: ManualQuestion[] };

        return data.questions;
    }

    async function handleGeneratePaper() {
        if (!canGeneratePaper || generatingPaper) {
            return;
        }

        setGeneratingPaper(true);
        setPaperGenerationError(null);

        try {
            const activeRows = questionSelection.sections.flatMap((section) =>
                section.rows
                    .map((row) => ({
                        section,
                        row,
                        target: rowTarget(row),
                    }))
                    .filter(
                        (item) =>
                            item.target > 0 &&
                            toNumber(item.row.requiredQuestions) > 0 &&
                            toNumber(item.row.marksPerQuestion) > 0,
                    ),
            );
            const questionTypeIds = [
                ...new Set(
                    activeRows.map((item) => item.section.questionTypeId),
                ),
            ];
            const poolEntries = await Promise.all(
                questionTypeIds.map(async (questionTypeId) => [
                    questionTypeId,
                    await fetchQuestionPool(questionTypeId),
                ]),
            );
            const pools = Object.fromEntries(poolEntries) as Record<
                number,
                ManualQuestion[]
            >;
            const usedQuestionIds = new Set<number>();
            const sections = activeRows.map(({ section, row }) => {
                const pool = pools[section.questionTypeId] ?? [];
                const selectedQuestions =
                    selectionMode === 'manual'
                        ? row.selectedQuestionIds
                              .map((id) =>
                                  pool.find((question) => question.id === id),
                              )
                              .filter((question): question is ManualQuestion =>
                                  Boolean(question),
                              )
                        : shuffledQuestions(
                              pool.filter(
                                  (question) =>
                                      !usedQuestionIds.has(question.id),
                              ),
                          ).slice(0, rowTarget(row));

                if (selectedQuestions.length < rowTarget(row)) {
                    throw new Error(
                        `Not enough questions found for ${section.title}.`,
                    );
                }

                selectedQuestions.forEach((question) =>
                    usedQuestionIds.add(question.id),
                );

                return {
                    id: `${section.id}_${row.id}`,
                    questionTypeId: section.questionTypeId,
                    category: section.category,
                    title: section.title,
                    requiredQuestions: toNumber(row.requiredQuestions),
                    totalQuestions: rowTarget(row),
                    marksEach: toNumber(row.marksPerQuestion),
                    questions: selectedQuestions.map((question) =>
                        paperQuestionFromManual(
                            question,
                            nextPaperQuestionId(),
                        ),
                    ),
                };
            });

            setQuestionPoolsByType(pools);
            setGeneratedPaper({
                id: `paper_${Date.now()}`,
                header: {
                    schoolName: 'School Name',
                    exam: '',
                    className: klass?.label ?? '',
                    section: '',
                    subject: subject?.label ?? '',
                    studentName: '',
                    type: '',
                    date: '',
                    duration: '2 hours',
                    marks: questionSelection.totalMarks,
                    rollNo: '',
                },
                sections,
            });
            setPaperQuestionPickerTarget(null);
        } catch (error) {
            setPaperGenerationError(
                error instanceof Error
                    ? error.message
                    : 'Unable to generate the paper. Please try again.',
            );
        } finally {
            setGeneratingPaper(false);
        }
    }

    function returnToPaperSetup() {
        setGeneratedPaper(null);
        setPaperQuestionPickerTarget(null);
        setPaperQuestionSearch('');
        setPaperGenerationError(null);
        setPaperSectionEditorTarget(null);
        setPaperQuestionEditorTarget(null);
    }

    function updatePaperHeader(
        field: keyof GeneratedPaperHeader,
        value: string,
    ) {
        setGeneratedPaper((current) =>
            current
                ? {
                      ...current,
                      header: {
                          ...current.header,
                          [field]: field === 'marks' ? toNumber(value) : value,
                      },
                  }
                : current,
        );
    }

    function updatePaperQuestionText(
        sectionId: string,
        questionId: string,
        value: string,
    ) {
        setGeneratedPaper((current) =>
            current
                ? {
                      ...current,
                      sections: current.sections.map((section) =>
                          section.id === sectionId
                              ? {
                                    ...section,
                                    questions: section.questions.map(
                                        (question) =>
                                            question.id === questionId
                                                ? { ...question, text: value }
                                                : question,
                                    ),
                                }
                              : section,
                      ),
                  }
                : current,
        );
    }

    function updatePaperQuestionImageSize(
        sectionId: string,
        questionId: string,
        imageSize: PaperImageSize,
    ) {
        setGeneratedPaper((current) =>
            current
                ? {
                      ...current,
                      sections: current.sections.map((section) =>
                          section.id === sectionId
                              ? {
                                    ...section,
                                    questions: section.questions.map(
                                        (question) =>
                                            question.id === questionId
                                                ? { ...question, imageSize }
                                                : question,
                                    ),
                                }
                              : section,
                      ),
                  }
                : current,
        );
    }

    function updatePaperQuestionAnswerLines(
        sectionId: string,
        questionId: string,
        answerLines: number,
    ) {
        setGeneratedPaper((current) =>
            current
                ? {
                      ...current,
                      sections: current.sections.map((section) =>
                          section.id === sectionId
                              ? {
                                    ...section,
                                    questions: section.questions.map(
                                        (question) =>
                                            question.id === questionId
                                                ? {
                                                      ...question,
                                                      answerLines,
                                                  }
                                                : question,
                                    ),
                                }
                              : section,
                      ),
                  }
                : current,
        );
    }

    function openPaperQuestionEditor(sectionId: string, questionId: string) {
        setPaperQuestionEditorTarget({ sectionId, questionId });
    }

    function closePaperQuestionEditor() {
        setPaperQuestionEditorTarget(null);
    }

    function savePaperQuestionEdit(value: string) {
        if (!activePaperQuestionEditorContext) {
            return;
        }

        updatePaperQuestionText(
            activePaperQuestionEditorContext.section.id,
            activePaperQuestionEditorContext.question.id,
            value,
        );
        closePaperQuestionEditor();
    }

    function replacePaperQuestionWithManual(
        sectionId: string,
        questionId: string,
        replacement: ManualQuestion,
    ) {
        setGeneratedPaper((current) =>
            current
                ? {
                      ...current,
                      sections: current.sections.map((section) =>
                          section.id === sectionId
                              ? {
                                    ...section,
                                    questions: section.questions.map(
                                        (question) =>
                                            question.id === questionId
                                                ? {
                                                      ...paperQuestionFromManual(
                                                          replacement,
                                                          question.id,
                                                      ),
                                                      imageSize:
                                                          question.imageSize,
                                                      answerLines:
                                                          question.answerLines,
                                                  }
                                                : question,
                                    ),
                                }
                              : section,
                      ),
                  }
                : current,
        );
    }

    function replacePaperQuestionRandom(sectionId: string, questionId: string) {
        if (!generatedPaper) {
            return;
        }

        const section = generatedPaper.sections.find(
            (item) => item.id === sectionId,
        );
        const currentQuestion = section?.questions.find(
            (item) => item.id === questionId,
        );

        if (!section || !currentQuestion || section.questionTypeId === null) {
            return;
        }

        const usedIds = new Set(generatedSourceQuestionIds);

        if (currentQuestion.sourceQuestionId !== null) {
            usedIds.delete(currentQuestion.sourceQuestionId);
        }

        const candidates = (
            questionPoolsByType[section.questionTypeId] ?? []
        ).filter((question) => !usedIds.has(question.id));
        const replacement = shuffledQuestions(candidates)[0];

        if (replacement) {
            replacePaperQuestionWithManual(sectionId, questionId, replacement);
        }
    }

    function openPaperQuestionPicker(sectionId: string, questionId: string) {
        setPaperQuestionSearch('');
        setPaperQuestionPickerTarget({ sectionId, questionId });
    }

    function closePaperQuestionPicker() {
        setPaperQuestionPickerTarget(null);
        setPaperQuestionSearch('');
    }

    function pickPaperQuestion(replacement: ManualQuestion) {
        if (!activePaperPickerContext) {
            return;
        }

        replacePaperQuestionWithManual(
            activePaperPickerContext.section.id,
            activePaperPickerContext.question.id,
            replacement,
        );
        closePaperQuestionPicker();
    }

    function addRandomPaperQuestion(sectionId: string) {
        if (!generatedPaper) {
            return;
        }

        const section = generatedPaper.sections.find(
            (item) => item.id === sectionId,
        );

        if (!section?.questionTypeId) {
            return;
        }

        const candidates = (
            questionPoolsByType[section.questionTypeId] ?? []
        ).filter((question) => !generatedSourceQuestionIds.has(question.id));
        const nextQuestion = shuffledQuestions(candidates)[0];

        if (!nextQuestion) {
            return;
        }

        const paperQuestion = paperQuestionFromManual(
            nextQuestion,
            nextPaperQuestionId(),
        );

        setGeneratedPaper((current) =>
            current
                ? {
                      ...current,
                      sections: current.sections.map((item) =>
                          item.id === sectionId
                              ? {
                                    ...item,
                                    totalQuestions: item.totalQuestions + 1,
                                    questions: [
                                        ...item.questions,
                                        paperQuestion,
                                    ],
                                }
                              : item,
                      ),
                  }
                : current,
        );
    }

    function addCustomPaperQuestion(sectionId: string) {
        const paperQuestion = createCustomPaperQuestion(
            nextPaperQuestionId('custom_q'),
        );

        setGeneratedPaper((current) =>
            current
                ? {
                      ...current,
                      sections: current.sections.map((section) =>
                          section.id === sectionId
                              ? {
                                    ...section,
                                    totalQuestions: section.totalQuestions + 1,
                                    questions: [
                                        ...section.questions,
                                        paperQuestion,
                                    ],
                                }
                              : section,
                      ),
                  }
                : current,
        );
    }

    function removePaperQuestion(sectionId: string, questionId: string) {
        setGeneratedPaper((current) =>
            current
                ? {
                      ...current,
                      sections: current.sections.map((section) => {
                          if (section.id !== sectionId) {
                              return section;
                          }

                          const questions = section.questions.filter(
                              (question) => question.id !== questionId,
                          );

                          return {
                              ...section,
                              totalQuestions: questions.length,
                              requiredQuestions: Math.min(
                                  section.requiredQuestions,
                                  questions.length,
                              ),
                              questions,
                          };
                      }),
                  }
                : current,
        );
    }

    function openPaperSectionEditor(sectionId: string) {
        setPaperSectionEditorTarget({ sectionId });
    }

    function closePaperSectionEditor() {
        setPaperSectionEditorTarget(null);
    }

    function savePaperSectionEdit(values: {
        title: string;
        requiredQuestions: number;
        marksEach: number;
    }) {
        if (!activePaperSectionEditorContext) {
            return;
        }

        setGeneratedPaper((current) =>
            current
                ? {
                      ...current,
                      sections: current.sections.map((section) =>
                          section.id === activePaperSectionEditorContext.id
                              ? {
                                    ...section,
                                    title: values.title,
                                    requiredQuestions: Math.min(
                                        values.requiredQuestions,
                                        section.questions.length,
                                    ),
                                    marksEach: values.marksEach,
                                }
                              : section,
                      ),
                  }
                : current,
        );
        closePaperSectionEditor();
    }

    function deletePaperSection(sectionId: string) {
        setGeneratedPaper((current) =>
            current
                ? {
                      ...current,
                      sections: current.sections.filter(
                          (section) => section.id !== sectionId,
                      ),
                  }
                : current,
        );
    }

    function addCustomPaperSection() {
        const sectionId = nextPaperSectionId('custom_sec');

        setGeneratedPaper((current) =>
            current
                ? {
                      ...current,
                      sections: [
                          ...current.sections,
                          {
                              id: sectionId,
                              questionTypeId: null,
                              category: 'Subjective Questions',
                              title: 'New question section',
                              requiredQuestions: 1,
                              totalQuestions: 1,
                              marksEach: 0,
                              questions: [
                                  createCustomPaperQuestion(
                                      nextPaperQuestionId('custom_q'),
                                  ),
                              ],
                          },
                      ],
                  }
                : current,
        );
    }

    function toggleManualQuestion(questionId: number) {
        if (!activeManualPickerRow) {
            return;
        }

        const {
            section: activeSection,
            row: activeRow,
            target,
        } = activeManualPickerRow;

        setQuestionSelection((current) => ({
            ...current,
            sections: current.sections.map((section) =>
                section.id === activeSection.id
                    ? {
                          ...section,
                          rows: section.rows.map((row) => {
                              if (row.id !== activeRow.id) {
                                  return row;
                              }

                              const isSelected =
                                  row.selectedQuestionIds.includes(questionId);

                              if (isSelected) {
                                  return {
                                      ...row,
                                      selectedQuestionIds:
                                          row.selectedQuestionIds.filter(
                                              (id) => id !== questionId,
                                          ),
                                  };
                              }

                              if (
                                  selectedManualQuestionIds.has(questionId) ||
                                  row.selectedQuestionIds.length >= target
                              ) {
                                  return row;
                              }

                              return {
                                  ...row,
                                  selectedQuestionIds: [
                                      ...row.selectedQuestionIds,
                                      questionId,
                                  ],
                              };
                          }),
                      }
                    : section,
            ),
        }));
    }

    function updateGlobalFilter(key: SourceFilterKey) {
        setQuestionSelection((current) => ({
            ...current,
            globalFilters: {
                ...current.globalFilters,
                [key]: !(current.globalFilters[key] ?? true),
            },
            sections: current.sections.map((section) => ({
                ...section,
                rows: section.rows.map((row) => ({
                    ...row,
                    selectedQuestionIds: [],
                })),
            })),
        }));
    }

    function clearManualQuestionSelections() {
        setQuestionSelection((current) => ({
            ...current,
            sections: current.sections.map((section) => ({
                ...section,
                rows: section.rows.map((row) => ({
                    ...row,
                    selectedQuestionIds: [],
                })),
            })),
        }));
    }

    function sourceChecked(value: string) {
        return questionSelection.globalFilters[value] ?? true;
    }

    function updateSectionValue(
        sectionId: string,
        rowId: string,
        field: QuestionSectionField,
        value: string,
    ) {
        setQuestionSelection((current) =>
            withTotalMarks({
                ...current,
                sections: current.sections.map((section) =>
                    section.id === sectionId
                        ? {
                              ...section,
                              rows: section.rows.map((row) => {
                                  if (row.id !== rowId) {
                                      return row;
                                  }

                                  return normalizeQuestionRow(
                                      {
                                          ...row,
                                          [field]: value,
                                      },
                                      availableForQuestionRow(section, rowId),
                                  );
                              }),
                          }
                        : section,
                ),
            }),
        );
    }

    function deleteQuestionRow(sectionId: string, rowId: string) {
        setQuestionSelection((current) =>
            withTotalMarks({
                ...current,
                sections: current.sections.map((section) =>
                    section.id === sectionId && section.rows.length > 1
                        ? {
                              ...section,
                              rows: section.rows.filter(
                                  (row) => row.id !== rowId,
                              ),
                          }
                        : section,
                ),
            }),
        );
    }

    function addQuestionRow(sectionId: string) {
        questionRowSequence.current += 1;
        const rowId = `${sectionId}_row_added_${questionRowSequence.current}`;

        setQuestionSelection((current) =>
            withTotalMarks({
                ...current,
                sections: current.sections.map((section) =>
                    section.id === sectionId
                        ? {
                              ...section,
                              rows: [...section.rows, createQuestionRow(rowId)],
                          }
                        : section,
                ),
            }),
        );
    }

    function reorderQuestionTypes(
        category: SectionCategory,
        draggedSectionId: string,
        targetSectionId: string,
    ) {
        if (draggedSectionId === targetSectionId) {
            return;
        }

        setQuestionSelection((current) => {
            const categorySections = current.sections.filter(
                (section) => section.category === category,
            );
            const draggedIndex = categorySections.findIndex(
                (section) => section.id === draggedSectionId,
            );
            const targetIndex = categorySections.findIndex(
                (section) => section.id === targetSectionId,
            );

            if (draggedIndex === -1 || targetIndex === -1) {
                return current;
            }

            const reordered = [...categorySections];
            const [draggedSection] = reordered.splice(draggedIndex, 1);

            reordered.splice(targetIndex, 0, draggedSection);

            let reorderedIndex = 0;

            return {
                ...current,
                sections: current.sections.map((section) =>
                    section.category === category
                        ? reordered[reorderedIndex++]
                        : section,
                ),
            };
        });
    }

    function handleQuestionTypeDragStart(
        event: DragEvent<HTMLDivElement>,
        sectionId: string,
    ) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', sectionId);
        setDraggedQuestionTypeId(sectionId);
    }

    function handleQuestionTypeDragOver(
        event: DragEvent<HTMLDivElement>,
        section: QuestionSelectionSection,
    ) {
        const draggedSectionId =
            event.dataTransfer.getData('text/plain') || draggedQuestionTypeId;
        const draggedSection = questionSelection.sections.find(
            (item) => item.id === draggedSectionId,
        );

        if (!draggedSection || draggedSection.category !== section.category) {
            setDragOverQuestionTypeId(null);

            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDragOverQuestionTypeId(section.id);
    }

    function handleQuestionTypeDrop(
        event: DragEvent<HTMLDivElement>,
        section: QuestionSelectionSection,
    ) {
        event.preventDefault();

        const draggedSectionId =
            event.dataTransfer.getData('text/plain') || draggedQuestionTypeId;

        if (!draggedSectionId) {
            return;
        }

        const draggedSection = questionSelection.sections.find(
            (item) => item.id === draggedSectionId,
        );

        if (draggedSection?.category === section.category) {
            reorderQuestionTypes(
                section.category,
                draggedSectionId,
                section.id,
            );
        }

        setDraggedQuestionTypeId(null);
        setDragOverQuestionTypeId(null);
    }

    function handleQuestionTypeDragEnd() {
        setDraggedQuestionTypeId(null);
        setDragOverQuestionTypeId(null);
    }

    function renderQuestionCategory(category: SectionCategory) {
        const sections = questionSelection.sections.filter(
            (section) => section.category === category,
        );

        if (sections.length === 0) {
            return null;
        }

        return (
            <div className="space-y-2.5">
                <CategoryDivider title={category} />
                <div className="space-y-2.5">
                    {sections.map((section) => (
                        <QuestionSelectionCard
                            key={section.id}
                            section={section}
                            selectionMode={selectionMode}
                            onChange={updateSectionValue}
                            onDeleteRow={deleteQuestionRow}
                            onAddRow={addQuestionRow}
                            onOpenManualPicker={openManualQuestionPicker}
                            isDragging={draggedQuestionTypeId === section.id}
                            isDragTarget={
                                dragOverQuestionTypeId === section.id &&
                                draggedQuestionTypeId !== section.id
                            }
                            onDragStart={handleQuestionTypeDragStart}
                            onDragOver={handleQuestionTypeDragOver}
                            onDrop={handleQuestionTypeDrop}
                            onDragEnd={handleQuestionTypeDragEnd}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            <Head
                title={generatedPaper ? 'Generated Paper' : 'Generate Paper'}
            />

            {generatedPaper ? (
                <>
                    <GeneratedPaperView
                        paper={generatedPaper}
                        totalMarks={paperTotalMarks(generatedPaper)}
                        pickerTarget={activePaperPickerContext}
                        pickerQuestions={filteredPaperPickerQuestions}
                        pickerSearch={paperQuestionSearch}
                        usedQuestionIds={generatedSourceQuestionIds}
                        onBackToSetup={returnToPaperSetup}
                        onHeaderChange={updatePaperHeader}
                        onAddSection={addCustomPaperSection}
                        onQuestionImageSizeChange={updatePaperQuestionImageSize}
                        onQuestionAnswerLinesChange={
                            updatePaperQuestionAnswerLines
                        }
                        onEditSection={openPaperSectionEditor}
                        onDeleteSection={deletePaperSection}
                        onEditQuestion={openPaperQuestionEditor}
                        onRandomQuestion={replacePaperQuestionRandom}
                        onPickQuestion={openPaperQuestionPicker}
                        onAddRandomQuestion={addRandomPaperQuestion}
                        onAddCustomQuestion={addCustomPaperQuestion}
                        onRemoveQuestion={removePaperQuestion}
                        onPickerSearchChange={setPaperQuestionSearch}
                        onPickerSelect={pickPaperQuestion}
                        onPickerClose={closePaperQuestionPicker}
                    />

                    {activePaperQuestionEditorContext && (
                        <QuestionEditModal
                            key={activePaperQuestionEditorContext.question.id}
                            question={activePaperQuestionEditorContext.question}
                            onClose={closePaperQuestionEditor}
                            onSave={savePaperQuestionEdit}
                        />
                    )}

                    {activePaperSectionEditorContext && (
                        <SectionEditModal
                            key={activePaperSectionEditorContext.id}
                            section={activePaperSectionEditorContext}
                            onClose={closePaperSectionEditor}
                            onSave={savePaperSectionEdit}
                        />
                    )}
                </>
            ) : (
                <>
                    <div className="mx-auto max-w-7xl space-y-6">
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
                                            {chapters &&
                                                chapters.length > 0 && (
                                                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                                                        <TriCheckbox
                                                            state={allChaptersState()}
                                                            onChange={
                                                                toggleAllChapters
                                                            }
                                                            label="Select all chapters and topics"
                                                            size="sm"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={
                                                                toggleAllChapters
                                                            }
                                                            className="cursor-pointer text-xs font-medium text-slate-700 transition-colors hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300"
                                                        >
                                                            Select all
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
                                                <>
                                                    {isChapterWiseSubject ? (
                                                        <div className="grid items-start gap-4 lg:grid-cols-2">
                                                            {chapterGroups.map(
                                                                (
                                                                    group,
                                                                    index,
                                                                ) => (
                                                                    <DirectChapterGroup
                                                                        key={`${group.heading ?? 'none'}-${index}`}
                                                                        group={
                                                                            group
                                                                        }
                                                                        state={chapterGroupState(
                                                                            group,
                                                                        )}
                                                                        selected={
                                                                            selected
                                                                        }
                                                                        onToggleGroup={() =>
                                                                            toggleChapterGroup(
                                                                                group,
                                                                            )
                                                                        }
                                                                        onToggleChapter={
                                                                            toggleChapter
                                                                        }
                                                                    />
                                                                ),
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-6">
                                                            {chapterGroups.map(
                                                                (
                                                                    group,
                                                                    index,
                                                                ) => (
                                                                    <div
                                                                        key={`${group.heading ?? 'none'}-${index}`}
                                                                    >
                                                                        {group.heading && (
                                                                            <h3 className="mb-2 text-[11px] font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                                                                                {
                                                                                    group.heading
                                                                                }
                                                                            </h3>
                                                                        )}
                                                                        <div className="grid gap-3 sm:grid-cols-2">
                                                                            {group.items.map(
                                                                                (
                                                                                    chapter,
                                                                                ) => (
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
                                                </>
                                            )}
                                    </section>
                                )}
                            </>
                        )}

                        {step === 'questions' && (
                            <section className="space-y-3">
                                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/10">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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

                                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                                <SelectionModeToggle
                                                    value={selectionMode}
                                                    onChange={
                                                        handleSelectionModeChange
                                                    }
                                                />
                                                <div className="flex flex-wrap items-center gap-2 md:border-l md:border-slate-200 md:pl-3 dark:md:border-slate-800">
                                                    {sourceFilters.map(
                                                        (item) => (
                                                            <SourceCheckbox
                                                                key={item.value}
                                                                label={
                                                                    item.label
                                                                }
                                                                checked={sourceChecked(
                                                                    item.value,
                                                                )}
                                                                onChange={() =>
                                                                    updateGlobalFilter(
                                                                        item.value,
                                                                    )
                                                                }
                                                            />
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="min-w-28 rounded-xl bg-teal-600 px-4 py-3 text-white dark:bg-teal-500 dark:text-slate-950">
                                            <p className="text-[11px] font-medium opacity-80">
                                                Total marks
                                            </p>
                                            <p className="mt-1 text-xl leading-none font-semibold">
                                                {questionSelection.totalMarks}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {paperGenerationError && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                                        {paperGenerationError}
                                    </div>
                                )}

                                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/10">
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
                                        questionSelection.sections.length ===
                                            0 && (
                                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 py-14 text-center dark:border-slate-700 dark:bg-slate-950/40">
                                                <SearchXIcon className="mb-3 size-6 text-slate-400" />
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                    No question types found for
                                                    this selection
                                                </p>
                                            </div>
                                        )}

                                    {!loadingQuestionSections &&
                                        questionSelection.sections.length >
                                            0 && (
                                            <div className="space-y-5">
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

                        {activeManualPickerRow && (
                            <ManualQuestionPickerModal
                                activeRow={activeManualPickerRow}
                                questions={filteredManualQuestions}
                                loading={loadingManualQuestions}
                                error={manualQuestionError}
                                search={manualSearch}
                                showSelectedOnly={showSelectedManualQuestions}
                                selectedQuestionIds={
                                    activeManualSelectedQuestionIds
                                }
                                allSelectedQuestionIds={
                                    selectedManualQuestionIds
                                }
                                onSearchChange={setManualSearch}
                                onSelectedOnlyChange={() =>
                                    setShowSelectedManualQuestions(
                                        (current) => !current,
                                    )
                                }
                                onToggleQuestion={toggleManualQuestion}
                                onClose={closeManualQuestionPicker}
                            />
                        )}
                    </div>

                    <div
                        ref={footerSentinelRef}
                        className="mt-4 h-px"
                        aria-hidden
                    />
                    <div
                        className={cn(
                            'sticky bottom-0 z-20 -mx-4 px-4 md:-mx-6 md:px-6',
                            isFooterSticky
                                ? 'border-y border-slate-200 bg-white/95 py-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95'
                                : 'py-2.5',
                        )}
                    >
                        <div className="mx-auto flex max-w-7xl justify-end">
                            {step === 'chapters' ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={reset}
                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                    >
                                        <RotateCcwIcon className="size-3.5" />
                                        Reset
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canContinueToQuestions}
                                        onClick={handleNext}
                                        className={cn(
                                            'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold transition-colors',
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
                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                    >
                                        <ArrowLeftIcon className="size-4" />
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        disabled={
                                            !canGeneratePaper || generatingPaper
                                        }
                                        onClick={handleGeneratePaper}
                                        className={cn(
                                            'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold transition-colors',
                                            !canGeneratePaper || generatingPaper
                                                ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                                : 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400',
                                        )}
                                    >
                                        {generatingPaper && (
                                            <Loader2Icon className="size-4 animate-spin" />
                                        )}
                                        Generate Paper
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

function ManualQuestionPickerModal({
    activeRow,
    questions,
    loading,
    error,
    search,
    showSelectedOnly,
    selectedQuestionIds,
    allSelectedQuestionIds,
    onSearchChange,
    onSelectedOnlyChange,
    onToggleQuestion,
    onClose,
}: {
    activeRow: ManualPickerRow;
    questions: ManualQuestion[];
    loading: boolean;
    error: string | null;
    search: string;
    showSelectedOnly: boolean;
    selectedQuestionIds: Set<number>;
    allSelectedQuestionIds: Set<number>;
    onSearchChange: (value: string) => void;
    onSelectedOnlyChange: () => void;
    onToggleQuestion: (questionId: number) => void;
    onClose: () => void;
}) {
    const activeSelectedCount = activeRow.row.selectedQuestionIds.length;
    const isActiveRowComplete = activeSelectedCount === activeRow.target;

    useEffect(() => {
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        window.addEventListener('keydown', closeOnEscape);

        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [onClose]);

    return (
        <div
            role="presentation"
            onMouseDown={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="manual-question-picker-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="flex max-h-[min(48rem,calc(100vh-2rem))] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
                                <ListChecksIcon className="size-4" />
                            </div>
                            <div className="min-w-0">
                                <h2
                                    id="manual-question-picker-title"
                                    className="text-base font-semibold text-slate-900 dark:text-slate-100"
                                >
                                    Select questions
                                </h2>
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <div className="flex h-9 items-center justify-center rounded-lg bg-teal-600 px-3 text-sm font-bold text-white dark:bg-teal-500 dark:text-slate-950">
                            {activeSelectedCount}/{activeRow.target}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close question picker"
                            title="Close"
                            className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                            <XIcon className="size-4" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-2.5 border-b border-slate-100 p-4 sm:flex-row sm:items-center dark:border-slate-800">
                    <label className="relative min-w-0 flex-1">
                        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                onSearchChange(event.target.value)
                            }
                            placeholder="Search questions"
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 transition-colors outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-teal-400"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={onSelectedOnlyChange}
                        className={cn(
                            'inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors',
                            showSelectedOnly
                                ? 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-200'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800',
                        )}
                    >
                        <CheckIcon className="size-3.5" />
                        Selected only
                    </button>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                    {loading && (
                        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-12 text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            <Loader2Icon className="size-4 animate-spin" />
                            Loading questions
                        </div>
                    )}

                    {!loading && error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                            {error}
                        </div>
                    )}

                    {!loading && !error && questions.length === 0 && (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
                            <SearchXIcon className="mb-2 size-5 text-slate-400" />
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                No matching questions
                            </p>
                        </div>
                    )}

                    {!loading &&
                        !error &&
                        questions.map((question) => {
                            const checked = selectedQuestionIds.has(
                                question.id,
                            );
                            const selectedElsewhere =
                                !checked &&
                                allSelectedQuestionIds.has(question.id);
                            const reachedLimit =
                                !checked &&
                                activeSelectedCount >= activeRow.target;
                            const disabled = selectedElsewhere || reachedLimit;

                            return (
                                <button
                                    key={question.id}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() =>
                                        onToggleQuestion(question.id)
                                    }
                                    className={cn(
                                        'flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                                        checked
                                            ? 'border-teal-300 bg-teal-50/60 dark:border-teal-500/40 dark:bg-teal-500/10'
                                            : 'border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/30 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-teal-500/30 dark:hover:bg-teal-500/5',
                                        disabled &&
                                            'cursor-not-allowed opacity-50',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[5px] border',
                                            checked
                                                ? 'border-teal-600 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-950'
                                                : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900',
                                        )}
                                    >
                                        {checked && (
                                            <CheckIcon
                                                className="size-3"
                                                strokeWidth={3}
                                            />
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                                            {question.summaryText}
                                        </span>
                                        <span className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                                                {question.sourceLabel ??
                                                    question.source ??
                                                    'No source'}
                                            </span>
                                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                                                {manualQuestionChapterLabel(
                                                    question,
                                                )}
                                            </span>
                                            {question.topic && (
                                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                                                    {question.topic.name}
                                                </span>
                                            )}
                                            {selectedElsewhere && (
                                                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                                                    Used in another row
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {isActiveRowComplete
                            ? 'Selection complete'
                            : `${activeRow.target - activeSelectedCount} more required`}
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 active:bg-teal-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
                    >
                        Done
                    </button>
                </div>
            </section>
        </div>
    );
}

function GeneratedPaperView({
    paper,
    totalMarks,
    pickerTarget,
    pickerQuestions,
    pickerSearch,
    usedQuestionIds,
    onBackToSetup,
    onHeaderChange,
    onAddSection,
    onEditSection,
    onDeleteSection,
    onEditQuestion,
    onQuestionImageSizeChange,
    onQuestionAnswerLinesChange,
    onRandomQuestion,
    onPickQuestion,
    onAddRandomQuestion,
    onAddCustomQuestion,
    onRemoveQuestion,
    onPickerSearchChange,
    onPickerSelect,
    onPickerClose,
}: {
    paper: GeneratedPaper;
    totalMarks: number;
    pickerTarget: {
        section: GeneratedPaperSection;
        question: GeneratedPaperQuestion;
    } | null;
    pickerQuestions: ManualQuestion[];
    pickerSearch: string;
    usedQuestionIds: Set<number>;
    onBackToSetup: () => void;
    onHeaderChange: (field: keyof GeneratedPaperHeader, value: string) => void;
    onAddSection: () => void;
    onEditSection: (sectionId: string) => void;
    onDeleteSection: (sectionId: string) => void;
    onEditQuestion: (sectionId: string, questionId: string) => void;
    onQuestionImageSizeChange: (
        sectionId: string,
        questionId: string,
        imageSize: PaperImageSize,
    ) => void;
    onQuestionAnswerLinesChange: (
        sectionId: string,
        questionId: string,
        value: number,
    ) => void;
    onRandomQuestion: (sectionId: string, questionId: string) => void;
    onPickQuestion: (sectionId: string, questionId: string) => void;
    onAddRandomQuestion: (sectionId: string) => void;
    onAddCustomQuestion: (sectionId: string) => void;
    onRemoveQuestion: (sectionId: string, questionId: string) => void;
    onPickerSearchChange: (value: string) => void;
    onPickerSelect: (question: ManualQuestion) => void;
    onPickerClose: () => void;
}) {
    return (
        <>
            <div data-paper-shell className="mx-auto max-w-[76rem] space-y-3">
                <div className="flex flex-wrap justify-end gap-2 print:hidden">
                    <button
                        type="button"
                        onClick={onAddSection}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    >
                        <PlusIcon className="size-4" />
                        Add Section
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            window.localStorage.setItem(
                                `paper_draft_${paper.id}`,
                                JSON.stringify({
                                    ...paper,
                                    header: {
                                        ...paper.header,
                                        marks: totalMarks,
                                    },
                                }),
                            )
                        }
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    >
                        <SaveIcon className="size-4" />
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950"
                    >
                        <PrinterIcon className="size-4" />
                        Print
                    </button>
                </div>

                <main
                    data-print-paper
                    className="bg-white p-2 text-black shadow-sm shadow-slate-900/10 print:p-0 print:shadow-none"
                >
                    <ClassicExamHeader
                        header={{
                            ...paper.header,
                            marks: totalMarks,
                        }}
                        onChange={onHeaderChange}
                    />
                    <div className="mt-1 space-y-1">
                        {paper.sections.map((section, sectionIndex) =>
                            section.category === 'Objective Questions' ? (
                                <BoxedObjectiveSection
                                    key={section.id}
                                    section={section}
                                    index={sectionIndex}
                                    onEditSection={onEditSection}
                                    onDeleteSection={onDeleteSection}
                                    onAddRandomQuestion={onAddRandomQuestion}
                                    onAddCustomQuestion={onAddCustomQuestion}
                                    onEditQuestion={onEditQuestion}
                                    onRandomQuestion={onRandomQuestion}
                                    onPickQuestion={onPickQuestion}
                                    onRemoveQuestion={onRemoveQuestion}
                                    onAnswerLinesChange={
                                        onQuestionAnswerLinesChange
                                    }
                                    onQuestionImageSizeChange={
                                        onQuestionImageSizeChange
                                    }
                                />
                            ) : (
                                <TwoColumnSubjectiveSection
                                    key={section.id}
                                    section={section}
                                    index={sectionIndex}
                                    onEditSection={onEditSection}
                                    onDeleteSection={onDeleteSection}
                                    onAddRandomQuestion={onAddRandomQuestion}
                                    onAddCustomQuestion={onAddCustomQuestion}
                                    onEditQuestion={onEditQuestion}
                                    onRandomQuestion={onRandomQuestion}
                                    onPickQuestion={onPickQuestion}
                                    onRemoveQuestion={onRemoveQuestion}
                                    onAnswerLinesChange={
                                        onQuestionAnswerLinesChange
                                    }
                                    onQuestionImageSizeChange={
                                        onQuestionImageSizeChange
                                    }
                                />
                            ),
                        )}
                    </div>
                </main>

                <div className="flex justify-end gap-2 print:hidden">
                    <button
                        type="button"
                        onClick={onBackToSetup}
                        className="cursor-pointer border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                        Back
                    </button>
                </div>
            </div>

            {pickerTarget && (
                <PaperQuestionPickerModal
                    target={pickerTarget}
                    questions={pickerQuestions}
                    search={pickerSearch}
                    usedQuestionIds={usedQuestionIds}
                    onSearchChange={onPickerSearchChange}
                    onSelect={onPickerSelect}
                    onClose={onPickerClose}
                />
            )}
        </>
    );
}

function PaperQuestionPickerModal({
    target,
    questions,
    search,
    usedQuestionIds,
    onSearchChange,
    onSelect,
    onClose,
}: {
    target: {
        section: GeneratedPaperSection;
        question: GeneratedPaperQuestion;
    };
    questions: ManualQuestion[];
    search: string;
    usedQuestionIds: Set<number>;
    onSearchChange: (value: string) => void;
    onSelect: (question: ManualQuestion) => void;
    onClose: () => void;
}) {
    useEffect(() => {
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        window.addEventListener('keydown', closeOnEscape);

        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [onClose]);

    return (
        <div
            role="presentation"
            onMouseDown={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="paper-question-picker-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="flex max-h-[min(46rem,calc(100vh-2rem))] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
                    <div className="min-w-0">
                        <h2
                            id="paper-question-picker-title"
                            className="text-base font-semibold text-slate-900 dark:text-slate-100"
                        >
                            Pick replacement question
                        </h2>
                        <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                            {target.section.title}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close picker"
                        title="Close"
                        className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    >
                        <XIcon className="size-4" />
                    </button>
                </div>

                <div className="border-b border-slate-100 p-4 dark:border-slate-800">
                    <label className="relative block">
                        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                onSearchChange(event.target.value)
                            }
                            placeholder="Search questions"
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 transition-colors outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-teal-400"
                        />
                    </label>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                    {questions.length === 0 && (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
                            <SearchXIcon className="mb-2 size-5 text-slate-400" />
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                No matching questions
                            </p>
                        </div>
                    )}

                    {questions.map((question) => {
                        const isCurrent =
                            target.question.sourceQuestionId === question.id;
                        const isUsed =
                            !isCurrent && usedQuestionIds.has(question.id);

                        return (
                            <button
                                key={question.id}
                                type="button"
                                disabled={isUsed}
                                onClick={() => onSelect(question)}
                                className={cn(
                                    'flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                                    isCurrent
                                        ? 'border-teal-300 bg-teal-50/60 dark:border-teal-500/40 dark:bg-teal-500/10'
                                        : 'border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/30 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-teal-500/30 dark:hover:bg-teal-500/5',
                                    isUsed && 'cursor-not-allowed opacity-50',
                                )}
                            >
                                <span
                                    className={cn(
                                        'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[5px] border',
                                        isCurrent
                                            ? 'border-teal-600 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-950'
                                            : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900',
                                    )}
                                >
                                    {isCurrent && (
                                        <CheckIcon
                                            className="size-3"
                                            strokeWidth={3}
                                        />
                                    )}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                                        {question.summaryText}
                                    </span>
                                    <span className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                                            {question.sourceLabel ??
                                                question.source ??
                                                'No source'}
                                        </span>
                                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                                            {manualQuestionChapterLabel(
                                                question,
                                            )}
                                        </span>
                                        {question.topic && (
                                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                                                {question.topic.name}
                                            </span>
                                        )}
                                        {isUsed && (
                                            <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                                                Already in paper
                                            </span>
                                        )}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

function manualQuestionChapterLabel(question: ManualQuestion): string {
    return question.chapter.chapterNumber === null
        ? question.chapter.name
        : `CH ${String(question.chapter.chapterNumber).padStart(2, '0')} ${question.chapter.name}`;
}

function DirectChapterGroup({
    group,
    state,
    selected,
    onToggleGroup,
    onToggleChapter,
}: {
    group: ChapterGroup;
    state: 'unchecked' | 'checked' | 'indeterminate';
    selected: Record<number, Set<number>>;
    onToggleGroup: () => void;
    onToggleChapter: (chapter: Chapter) => void;
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
                        checked={
                            selected[chapter.id]?.has(CHAPTER_ONLY_SELECTION) ??
                            false
                        }
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
                    ? 'border-teal-300 dark:border-teal-500/40'
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
                        checked={
                            selected[chapter.id]?.has(CHAPTER_ONLY_SELECTION) ??
                            false
                        }
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
    chapter: Chapter;
    checked: boolean;
    onToggleChapter: (chapter: Chapter) => void;
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
                        ? 'border-teal-300 dark:border-teal-500/40'
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
                        ? 'text-teal-700 dark:text-teal-300'
                        : 'text-slate-700 hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300',
                )}
            >
                {chapter.chapter_number !== null && (
                    <span
                        className={cn(
                            'shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap',
                            checked
                                ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                        )}
                    >
                        CH {String(chapter.chapter_number).padStart(2, '0')}
                    </span>
                )}
                <span className="truncate" title={chapter.name}>
                    {chapter.name}
                </span>
            </button>
        </li>
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
                                    'shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap transition-colors',
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
                                        ? 'text-teal-700 dark:text-teal-300'
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
    selectionMode,
    onChange,
    onDeleteRow,
    onAddRow,
    onOpenManualPicker,
    isDragging,
    isDragTarget,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}: {
    section: QuestionSelectionSection;
    selectionMode: SelectionMode;
    onChange: (
        sectionId: string,
        rowId: string,
        field: QuestionSectionField,
        value: string,
    ) => void;
    onDeleteRow: (sectionId: string, rowId: string) => void;
    onAddRow: (sectionId: string) => void;
    onOpenManualPicker: (sectionId: string, rowId: string) => void;
    isDragging: boolean;
    isDragTarget: boolean;
    onDragStart: (event: DragEvent<HTMLDivElement>, sectionId: string) => void;
    onDragOver: (
        event: DragEvent<HTMLDivElement>,
        section: QuestionSelectionSection,
    ) => void;
    onDrop: (
        event: DragEvent<HTMLDivElement>,
        section: QuestionSelectionSection,
    ) => void;
    onDragEnd: () => void;
}) {
    const canDeleteRow = section.rows.length > 1;

    return (
        <div
            onDragOver={(event) => onDragOver(event, section)}
            onDrop={(event) => onDrop(event, section)}
            className={cn(
                'rounded-xl border bg-white px-4 py-3 transition-colors dark:bg-slate-950/40',
                isDragging
                    ? 'border-slate-300 opacity-55 dark:border-slate-700'
                    : isDragTarget
                      ? 'border-teal-400 bg-teal-50/40 ring-2 ring-teal-500/10 dark:border-teal-500/60 dark:bg-teal-500/5'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700',
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <div
                        draggable
                        role="button"
                        tabIndex={0}
                        onDragStart={(event) => onDragStart(event, section.id)}
                        onDragEnd={onDragEnd}
                        aria-label={`Drag to reorder ${section.title}`}
                        title={`Drag to reorder ${section.title}`}
                        className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                        <GripVerticalIcon className="size-4" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {section.title}
                    </h4>
                    <span className="rounded-md bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                        {section.availableCount} available
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => onAddRow(section.id)}
                    aria-label={`Add another ${section.title} row`}
                    title={`Add another ${section.title} row`}
                    className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700 transition-colors hover:bg-teal-100 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-200 dark:hover:bg-teal-500/20"
                >
                    <PlusIcon className="size-4" />
                </button>
            </div>

            <div className="mt-3 space-y-3">
                {section.rows.map((row, index) => (
                    <div
                        key={row.id}
                        className="grid gap-2.5 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end dark:border-slate-800"
                    >
                        <NumberField
                            label="Total questions (choice)"
                            value={row.choiceQuestions}
                            placeholder="0"
                            max={availableForQuestionRow(section, row.id)}
                            onChange={(value) =>
                                onChange(
                                    section.id,
                                    row.id,
                                    'choiceQuestions',
                                    value,
                                )
                            }
                        />
                        <NumberField
                            label="Required"
                            value={row.requiredQuestions}
                            placeholder="0"
                            max={toNumber(row.choiceQuestions)}
                            disabled={toNumber(row.choiceQuestions) === 0}
                            onChange={(value) =>
                                onChange(
                                    section.id,
                                    row.id,
                                    'requiredQuestions',
                                    value,
                                )
                            }
                        />
                        <NumberField
                            label="Marks each"
                            value={row.marksPerQuestion}
                            placeholder="0"
                            disabled={toNumber(row.requiredQuestions) === 0}
                            onChange={(value) =>
                                onChange(
                                    section.id,
                                    row.id,
                                    'marksPerQuestion',
                                    value,
                                )
                            }
                        />
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                            {selectionMode === 'manual' && (
                                <button
                                    type="button"
                                    disabled={rowTarget(row) === 0}
                                    onClick={() =>
                                        onOpenManualPicker(section.id, row.id)
                                    }
                                    title={
                                        rowTarget(row) === 0
                                            ? 'Enter a total or required count first'
                                            : `Select questions for row ${index + 1}`
                                    }
                                    className={cn(
                                        'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold whitespace-nowrap transition-colors',
                                        row.selectedQuestionIds.length ===
                                            rowTarget(row) && rowTarget(row) > 0
                                            ? 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-200 dark:hover:bg-teal-500/20'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-500/30 dark:hover:text-teal-300',
                                    )}
                                >
                                    <ListChecksIcon className="size-3.5" />
                                    {row.selectedQuestionIds.length}/
                                    {rowTarget(row)} selected
                                </button>
                            )}
                            <span className="inline-flex h-9 min-w-20 items-center justify-center rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                                {lineTotal(row)} marks
                            </span>
                            <button
                                type="button"
                                disabled={!canDeleteRow}
                                onClick={() => onDeleteRow(section.id, row.id)}
                                aria-label={`Delete row ${index + 1} from ${section.title}`}
                                title={
                                    canDeleteRow
                                        ? `Delete row ${index + 1}`
                                        : 'At least one row is required'
                                }
                                className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 dark:disabled:hover:border-slate-800 dark:disabled:hover:bg-slate-900 dark:disabled:hover:text-slate-400"
                            >
                                <Trash2Icon className="size-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

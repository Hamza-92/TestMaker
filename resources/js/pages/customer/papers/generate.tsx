import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    BookmarkIcon,
    BookOpenIcon,
    CheckIcon,
    ClockIcon,
    FileTextIcon,
    GraduationCapIcon,
    GripVerticalIcon,
    KeyRoundIcon,
    LayersIcon,
    LayoutTemplateIcon,
    ListChecksIcon,
    Loader2Icon,
    MinusIcon,
    PlusIcon,
    PrinterIcon,
    RotateCcwIcon,
    SaveIcon,
    SearchIcon,
    SearchXIcon,
    SettingsIcon,
    ShuffleIcon,
    SparklesIcon,
    Trash2Icon,
    XIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { toast } from 'sonner';
import { Button, Card } from '@/components/tm';
import type { ComboboxOptionItem } from '@/components/ui/floating-combobox';
import { FloatingCombobox } from '@/components/ui/floating-combobox';
import { cn } from '@/lib/utils';
import type { Auth } from '@/types/auth';
import { AnswerKeySheet } from './paper-layouts/answer-key-sheet';
import { ConfirmDialog } from './paper-layouts/confirm-dialog';
import { GoBackDialog } from './paper-layouts/go-back-dialog';
import { BannerExamHeader } from './paper-layouts/headers/banner-exam-header';
import { CenteredExamHeader } from './paper-layouts/headers/centered-exam-header';
import { ClassicExamHeader } from './paper-layouts/headers/classic-exam-header';
import { FormalExamHeader } from './paper-layouts/headers/formal-exam-header';
import { TabularExamHeader } from './paper-layouts/headers/tabular-exam-header';
import { PaperSettingsDrawer } from './paper-layouts/paper-settings-drawer';
import { SET_LABELS, setLabelFor, variantForSet } from './paper-layouts/paper-variant';
import { SaveAsTemplateModal } from './paper-layouts/save-as-template-modal';
import type { SaveAsTemplateValues } from './paper-layouts/save-as-template-modal';
import { SavePaperModal } from './paper-layouts/save-paper-modal';
import type { SavePaperValues } from './paper-layouts/save-paper-modal';
// Lazy-loaded: this modal pulls in browser-only editors (tinymce, mathlive)
// that have no SSR-safe exports. A static import drags them into the SSR
// module graph and crashes server rendering of /papers/generate with
// "mathlive does not provide an export named 'MathfieldElement'". Lazy loading
// keeps them out of SSR — the modal only ever mounts client-side on demand.
const QuestionEditModal = lazy(() =>
    import('./paper-layouts/questions/question-edit-modal').then((module) => ({
        default: module.QuestionEditModal,
    })),
);
import { SectionEditModal } from './paper-layouts/sections/section-edit-modal';
import { pickSectionTemplate } from './paper-layouts/templates';
import {
    clampSectionColumns,
    DEFAULT_PAPER_SETTINGS,
    getPageDimensions,
    normalizePaperSettings
} from './paper-layouts/types';
import type { PaperHeaderTemplate } from './paper-layouts/types';
import type { GeneratedPaper, GeneratedPaperHeader, GeneratedPaperQuestion, GeneratedPaperSection, PaperImageSize, PaperQuestionOption, PaperSettings } from './paper-layouts/types';

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
    name_eng?: string | null;
    name_ur?: string | null;
    question_count?: number;
}

interface Chapter {
    id: number;
    name: string;
    name_eng?: string | null;
    name_ur?: string | null;
    chapter_number: number | null;
    group_name: string | null;
    group_heading: string | null;
    question_count?: number;
    topics: Topic[];
}

interface ChapterGroup {
    heading: string | null;
    items: Chapter[];
}

interface SavedPaperProp {
    id: number;
    name: string;
    is_draft: boolean;
    paper: GeneratedPaper;
    questionPoolsByType: Record<number, ManualQuestion[]>;
    questionSelection: QuestionSelectionState;
    /** Plain-object form of the chapter→topic selection map (Sets are not JSON-serializable). */
    chapterSelection: Record<string, number[]> | null;
    meta: {
        pattern: ComboboxOptionItem;
        klass: ComboboxOptionItem;
        subject: ComboboxOptionItem;
    } | null;
}

function serializeChapterSelection(
    selected: Record<number, Set<number>>,
): Record<number, number[]> {
    const out: Record<number, number[]> = {};

    for (const [key, value] of Object.entries(selected)) {
        out[Number(key)] = [...value];
    }

    return out;
}

function deserializeChapterSelection(
    plain: Record<string, number[]> | null | undefined,
): Record<number, Set<number>> {
    if (!plain) {
        return {};
    }

    const out: Record<number, Set<number>> = {};

    for (const [key, value] of Object.entries(plain)) {
        out[Number(key)] = new Set(value);
    }

    return out;
}

interface AppliedTemplate {
    id: number;
    name: string;
    settings: Partial<PaperSettings>;
    structure: {
        sections: Array<{
            questionTypeId: number | null;
            category: string;
            title: string;
            requiredQuestions: number;
            totalQuestions: number;
            marksEach: number;
            columns?: number;
        }>;
        total_marks?: number;
    };
}

interface Props {
    patterns: Pattern[];
    patternClasses: PatternClass[];
    classSubjects: ClassSubject[];
    sourceOptions: SourceOption[];
    savedPaper?: SavedPaperProp;
    appliedTemplate?: AppliedTemplate;
    initialPatternId?: number | null;
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
    heading?: string;
    availableCount: number;
    /** Default column count (1–5) for this question type, from the DB. */
    columnPerRow: number;
    selectionMode?: SelectionMode;
    rows: QuestionSelectionRow[];
}

function questionSectionSelectionMode(
    section: Pick<QuestionSelectionSection, 'selectionMode'>,
): SelectionMode {
    return section.selectionMode ?? 'automatic';
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
    heading?: string;
    availableCount: number;
    columnPerRow: number;
}

type ContentMedium = 'English' | 'Urdu' | 'Both';

interface ManualQuestion {
    id: number;
    summaryText: string;
    summaryTextEn?: string | null;
    summaryTextUr?: string | null;
    medium?: ContentMedium | null;
    schemaKey: string;
    isObjective: boolean;
    content: Record<string, unknown>;
    source: string | null;
    sourceLabel: string | null;
    difficulty: string | null;
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

interface PaperQuestionPoolFilters {
    chapterIds: number[];
    topicIds: number[];
    sources: string[];
}

interface AddPaperSectionValues {
    questionTypeId: number;
    requiredQuestions: number;
    totalQuestions: number;
    marksEach: number;
    selectedQuestions: ManualQuestion[];
    poolQuestions: ManualQuestion[];
}

const CHAPTER_ONLY_SELECTION = -1;
/**
 * Per-paper localStorage key. Using one key per paper id (and a "new" bucket
 * for unsaved papers) prevents drafts from clobbering each other when the user
 * edits multiple papers in sequence. The "new" bucket is also cleared whenever
 * a new paper is saved, so it doesn't leak into a later session.
 */
function draftKey(paperId: number | null): string {
    return `paper_active_draft:${paperId ?? 'new'}`;
}

interface DraftPayload {
    savedAt: number;
    paper: GeneratedPaper;
    questionPoolsByType: Record<number, ManualQuestion[]>;
    questionSelection: QuestionSelectionState;
    chapterSelection: Record<number, number[]>;
    meta: {
        pattern: ComboboxOptionItem;
        klass: ComboboxOptionItem;
        subject: ComboboxOptionItem;
    };
}

const fallbackSourceOptions: SourceOption[] = [
    { value: 'exercise', label: 'Exercise' },
    { value: 'additional', label: 'Additional' },
    { value: 'past paper', label: 'Past Paper' },
    { value: 'exercise examples', label: 'Exercise Examples' },
    { value: 'conceptual questions', label: 'Conceptual Questions' },
];

function normalizeSourceOptions(sourceOptions: SourceOption[]): SourceOption[] {
    return sourceOptions.length > 0 ? sourceOptions : fallbackSourceOptions;
}

function createGlobalFilters(
    sourceOptions: SourceOption[],
): Record<SourceFilterKey, boolean> {
    return Object.fromEntries(
        sourceOptions.map((source) => [
            source.value,
            source.value === 'exercise',
        ]),
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
    return shuffleItems(questions);
}

function shuffleItems<T>(items: readonly T[]): T[] {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [
            shuffled[swapIndex],
            shuffled[index],
        ];
    }

    return shuffled;
}

function localizedPaperHtml(
    english: unknown,
    urdu: unknown,
    medium: ContentMedium | null | undefined,
    fallback = '',
): string {
    const englishText = typeof english === 'string' ? english.trim() : '';
    const urduText = typeof urdu === 'string' ? urdu.trim() : '';
    const resolvedMedium =
        medium ??
        (englishText !== '' && urduText !== ''
            ? 'Both'
            : urduText !== ''
                ? 'Urdu'
                : 'English');

    if (resolvedMedium === 'English') {
        return englishText || urduText || fallback;
    }

    if (resolvedMedium === 'Urdu') {
        return urduText || englishText || fallback;
    }

    if (englishText !== '' && urduText !== '' && englishText !== urduText) {
        return (
            '<div>' +
            englishText +
            '</div><div dir="rtl">' +
            urduText +
            '</div>'
        );
    }

    return englishText || urduText || fallback;
}

function plainQuestionText(value: string): string {
    const normalizedEntities = value
        .replace(/&(?:nbsp|npsp);/gi, ' ')
        .replace(/&#(?:160|xA0);/gi, ' ')
        .replace(/<[^>]*>/g, ' ');

    if (typeof DOMParser === 'undefined') {
        return normalizedEntities.replace(/\s+/g, ' ').trim();
    }

    const decoded =
        new DOMParser().parseFromString(normalizedEntities, 'text/html').body
            .textContent ?? normalizedEntities;

    return decoded.replace(/\s+/g, ' ').trim();
}

function manualQuestionDisplayTextForMedium(
    question: ManualQuestion,
    medium: 'English' | 'Urdu',
): string {
    const content = question.content as Record<string, unknown> | null;
    const passageKey = medium === 'English' ? 'passage_en' : 'passage_ur';
    const passageValue = content?.[passageKey];
    const passageText =
        typeof passageValue === 'string' ? passageValue.trim() : '';
    const summaryText =
        medium === 'English'
            ? question.summaryTextEn?.trim() ?? ''
            : question.summaryTextUr?.trim() ?? '';

    return plainQuestionText(
        question.schemaKey === 'objective_passage_mcq' && passageText !== ''
            ? passageText
            : summaryText || question.summaryText,
    );
}

function paperQuestionFromManual(
    question: ManualQuestion,
    id: string,
): GeneratedPaperQuestion {
    const passageQuestions = passageQuestionsFromManual(question, id);
    const passageText = passageTextFromManual(question);

    return {
        id,
        sourceQuestionId: question.id,
        text: passageQuestions
            ? passageText
            : localizedPaperHtml(
                question.summaryTextEn,
                question.summaryTextUr,
                question.medium,
                question.summaryText,
            ),
        source: question.source,
        sourceLabel: question.sourceLabel,
        chapterLabel: manualQuestionChapterLabel(question),
        topicLabel: question.topic?.name ?? null,
        imageUrl: null,
        imageSize: 'md',
        options: passageQuestions ? [] : paperOptionsFromManual(question),
        passageQuestions,
        answerLines: question.isObjective ? 0 : 0,
        answerText: answerTextFromManual(question),
    };
}

function passageTextFromManual(question: ManualQuestion): string {
    const content = question.content as Record<string, unknown> | null;

    if (!content) {
        return question.summaryText;
    }

    const passageEn =
        typeof content.passage_en === 'string'
            ? content.passage_en.trim()
            : '';
    const passageUr =
        typeof content.passage_ur === 'string'
            ? content.passage_ur.trim()
            : '';

    return localizedPaperHtml(
        passageEn,
        passageUr,
        question.medium,
        question.summaryText,
    );
}

function manualQuestionDisplayText(question: ManualQuestion): string {
    const value =
        question.schemaKey === 'objective_passage_mcq'
            ? passageTextFromManual(question)
            : question.summaryText;

    return plainQuestionText(value);
}

function passageQuestionsFromManual(
    question: ManualQuestion,
    id: string,
): GeneratedPaperQuestion['passageQuestions'] {
    if (question.schemaKey !== 'objective_passage_mcq') {
        return undefined;
    }

    const content = question.content as Record<string, unknown> | null;
    const items = content?.items;

    if (!Array.isArray(items)) {
        return undefined;
    }

    const passageQuestions = items
        .map((item, index) => {
            if (!item || typeof item !== 'object') {
                return null;
            }

            const itemData = item as Record<string, unknown>;
            const textEn =
                typeof itemData.prompt_en === 'string'
                    ? itemData.prompt_en.trim()
                    : '';
            const textUr =
                typeof itemData.prompt_ur === 'string'
                    ? itemData.prompt_ur.trim()
                    : '';
            const text = localizedPaperHtml(
                textEn,
                textUr,
                question.medium,
            );
            const passageId = id + '_passage_' + index;
            const options = paperOptionsFromContent(
                itemData.options,
                passageId,
                question.medium,
            );

            if (text === '' && options.length === 0) {
                return null;
            }

            return {
                id: passageId,
                text: text || 'Passage question',
                options,
            };
        })
        .filter(
            (
                item,
            ): item is NonNullable<
                GeneratedPaperQuestion['passageQuestions']
            >[number] => item !== null,
        );

    return passageQuestions.length > 0 ? passageQuestions : undefined;
}

function answerTextFromManual(question: ManualQuestion): string | null {
    const content = question.content as Record<string, unknown> | null;

    if (!content) {
return null;
}

    if (question.schemaKey === 'objective_true_false') {
        const flag = String(content.correct_boolean ?? '').toLowerCase();

        if (flag === 'true') {
return 'True';
}

        if (flag === 'false') {
return 'False';
}

        return null;
    }

    const en = typeof content.answer_en === 'string' ? content.answer_en.trim() : '';
    const ur = typeof content.answer_ur === 'string' ? content.answer_ur.trim() : '';
    const answer = localizedPaperHtml(en, ur, question.medium);

    return answer !== '' ? answer : null;
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
        const flag = String((question.content as Record<string, unknown>).correct_boolean ?? '').toLowerCase();

        return [
            { id: `${question.id}_true`, text: 'True', isCorrect: flag === 'true' },
            { id: `${question.id}_false`, text: 'False', isCorrect: flag === 'false' },
        ];
    }

    return paperOptionsFromContent(
        question.content.options,
        question.id + '_option',
        question.medium,
    );
}

function paperOptionsFromContent(
    options: unknown,
    idPrefix: string,
    medium?: ContentMedium | null,
): PaperQuestionOption[] {

    if (!Array.isArray(options)) {
        return [];
    }

    return options
        .map((option, index): PaperQuestionOption | null => {
            if (!option || typeof option !== 'object') {
                return null;
            }

            const value = option as Record<string, unknown>;
            const text = localizedPaperHtml(
                value.text_en,
                value.text_ur,
                medium,
            );

            if (text === '') {
                return null;
            }

            return {
                id: idPrefix + '_' + index,
                text,
                isCorrect: Boolean(value.is_correct),
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
            heading: item.heading || item.title,
            availableCount: item.availableCount,
            columnPerRow: item.columnPerRow,
            selectionMode: current?.selectionMode ?? 'automatic',
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
                    ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-white'
                    : state === 'indeterminate'
                        ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-white'
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
                    ? 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100',
            )}
        >
            <span
                className={cn(
                    'flex size-4 items-center justify-center rounded-[5px] border transition-colors',
                    checked
                        ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-white'
                        : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950',
                )}
            >
                {checked && <CheckIcon className="size-3" strokeWidth={3} />}
            </span>
            <span>{label}</span>
        </button>
    );
}

function MediumSelector({
    value,
    onChange,
}: {
    value: ContentMedium;
    onChange: (medium: ContentMedium) => void;
}) {
    const options: ContentMedium[] = ['Both', 'English', 'Urdu'];

    return (
        <div className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-1 dark:border-slate-800 dark:bg-slate-950/60">
            {options.map((option) => (
                <button
                    key={option}
                    type="button"
                    aria-pressed={value === option}
                    onClick={() => onChange(option)}
                    className={cn(
                        'inline-flex h-7 cursor-pointer items-center rounded-md px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                        value === option
                            ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                    )}
                >
                    {option}
                </button>
            ))}
        </div>
    );
}
function AutoPickSwitch({
    enabled,
    onChange,
}: {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Auto Pick"
            onClick={() => onChange(!enabled)}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-200 hover:bg-brand-50 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10"
        >
            <SparklesIcon className="size-3.5 text-brand-600 dark:text-brand-300" />
            <span>Auto Pick</span>
            <span
                className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                    enabled
                        ? 'bg-brand-600 dark:bg-brand-500'
                        : 'bg-slate-300 dark:bg-slate-700',
                )}
                aria-hidden="true"
            >
                <span
                    className={cn(
                        'size-4 rounded-full bg-white shadow-sm transition-transform dark:bg-slate-100',
                        enabled ? 'translate-x-4' : 'translate-x-0.5',
                    )}
                />
            </span>
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
                    'bg-brand-600 text-white ring-4 ring-brand-500/15 dark:bg-brand-500 dark:text-white dark:ring-brand-400/15',
                    state === 'done' &&
                    'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300',
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

function ScopeOptionCard({
    option,
    icon: Icon,
    index,
    onSelect,
}: {
    option: ComboboxOptionItem;
    icon: LucideIcon;
    index: number;
    onSelect: () => void;
}) {
    return (
        <Card
            padding="none"
            interactive
            className="group tm-appear overflow-hidden"
            style={{ animationDelay: String(Math.min(index, 9) * 28) + 'ms' }}
        >
            <button
                type="button"
                onClick={onSelect}
                className="flex min-h-[62px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
            >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {option.label}
                </span>
                <ArrowRightIcon className="size-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-slate-500" />
            </button>
        </Card>
    );
}

function ScopePicker({
    pattern,
    klass,
    subject,
    patternOptions,
    classOptions,
    subjectOptions,
    onPatternChange,
    onClassChange,
    onSubjectChange,
    chapters,
    allChaptersState,
    onToggleAllChapters,
}: {
    pattern: ComboboxOptionItem | null;
    klass: ComboboxOptionItem | null;
    subject: ComboboxOptionItem | null;
    patternOptions: ComboboxOptionItem[];
    classOptions: ComboboxOptionItem[];
    subjectOptions: ComboboxOptionItem[];
    onPatternChange: (value: ComboboxOptionItem | null) => void;
    onClassChange: (value: ComboboxOptionItem | null) => void;
    onSubjectChange: (value: ComboboxOptionItem | null) => void;
    chapters: Chapter[] | null;
    allChaptersState: () => 'unchecked' | 'checked' | 'indeterminate';
    onToggleAllChapters: () => void;
}) {
    const level = !pattern ? 'pattern' : !klass ? 'class' : !subject ? 'subject' : 'ready';
    const options =
        level === 'pattern'
            ? patternOptions
            : level === 'class'
                ? classOptions
                : subjectOptions;
    const icon =
        level === 'pattern'
            ? FileTextIcon
            : level === 'class'
                ? GraduationCapIcon
                : BookOpenIcon;
    const title =
        level === 'pattern'
            ? 'Choose a pattern'
            : level === 'class'
                ? 'Choose a class'
                : level === 'subject'
                    ? 'Choose a subject'
                    : 'Chapters & topics';
    const select = (option: ComboboxOptionItem) => {
        if (level === 'pattern') {
onPatternChange(option);
} else if (level === 'class') {
onClassChange(option);
} else {
onSubjectChange(option);
}
    };

    return (
        <Card padding="md" className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    {level !== 'pattern' && (
                        <Button
                            type="button"
                            variant="ghost"
                            size={level === 'ready' ? 'sm' : 'icon-sm'}
                            className="-ml-2 shrink-0 cursor-pointer"
                            aria-label="Go back"
                            onClick={() =>
                                level === 'ready'
                                    ? onSubjectChange(null)
                                    : level === 'subject'
                                        ? onClassChange(null)
                                        : onPatternChange(null)
                            }
                        >
                            <ArrowLeftIcon />
                            {level === 'ready' && 'Back'}
                        </Button>
                    )}
                    {title && (
                        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                            {title}
                        </h2>
                    )}
                </div>
                {level === 'ready' &&
                    chapters &&
                    chapters.length > 0 && (
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-full cursor-pointer sm:w-auto"
                            onClick={onToggleAllChapters}
                        >
                            {allChaptersState() === 'checked' ? (
                                <MinusIcon />
                            ) : (
                                <CheckIcon />
                            )}
                            {allChaptersState() === 'checked'
                                ? 'Clear all'
                                : 'Select all'}
                        </Button>
                    )}
            </div>

            {(pattern || klass || subject) && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {[
                        pattern && { value: pattern, clear: onPatternChange },
                        klass && { value: klass, clear: onClassChange },
                        subject && { value: subject, clear: onSubjectChange },
                    ].filter(Boolean).map((item, index) => {
                        const crumb = item as {
                            value: ComboboxOptionItem;
                            clear: (value: ComboboxOptionItem | null) => void;
                        };

                        return (
                            <span key={crumb.value.id} className="inline-flex items-center gap-1.5">
                                {index > 0 && <ArrowRightIcon className="size-3.5 text-slate-400" />}
                                <button
                                    type="button"
                                    onClick={() => crumb.clear(null)}
                                    className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
                                >
                                    <span className="truncate">{crumb.value.label}</span>
                                    <CheckIcon className="size-3.5 shrink-0" strokeWidth={2.5} />
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}


            {level !== 'ready' ? (
                options.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {options.map((option, index) => (
                            <ScopeOptionCard
                                key={option.id}
                                option={option}
                                icon={icon}
                                index={index}
                                onSelect={() => select(option)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                        No options are available for this step.
                    </div>
                )
            ) : null}
        </Card>
    );
}
function CategoryDivider({ title }: { title: SectionCategory }) {
    return (
        <div className="flex items-center gap-3">
            <h3 className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {title}
            </h3>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
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
            <span className="mb-1 block text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {label}
            </span>
            <input autoComplete="off"
                type="number"
                inputMode="numeric"
                min="0"
                max={max}
                disabled={disabled}
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(onlyDigits(event.target.value))}
                className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 transition-colors outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-400/20 dark:disabled:bg-slate-900 dark:disabled:text-slate-600"
            />
        </label>
    );
}

function draftTimeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) {
        return 'just now';
    }

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    return `${Math.floor(hours / 24)}d ago`;
}

function storageAssetUrl(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }

    const path = value.trim();

    if (path === '') {
        return '';
    }

    if (/^(https?:|data:|blob:)/i.test(path) || path.startsWith('/')) {
        return path;
    }

    return `/storage/${path}`;
}

function PaperHeader({
    template,
    header,
    logoUrl,
    address,
    showAddress,
    onChange,
}: {
    template: PaperHeaderTemplate;
    header: Parameters<typeof ClassicExamHeader>[0]['header'];
    logoUrl: string;
    address: string;
    showAddress: boolean;
    onChange: Parameters<typeof ClassicExamHeader>[0]['onChange'];
}) {
    if (template === 'banner') {
        return <BannerExamHeader header={header} onChange={onChange} />;
    }

    if (template === 'formal') {
        return <FormalExamHeader header={header} onChange={onChange} />;
    }

    if (template === 'centered') {
        return <CenteredExamHeader header={header} logoUrl={logoUrl || undefined} address={address} showAddress={showAddress} onChange={onChange} />;
    }

    if (template === 'tabular') {
        return <TabularExamHeader header={header} logoUrl={logoUrl || undefined} address={address} showAddress={showAddress} onChange={onChange} />;
    }

    return <ClassicExamHeader header={header} onChange={onChange} />;
}

export default function GeneratePaper({
    patterns,
    patternClasses,
    classSubjects,
    sourceOptions,
    savedPaper,
    appliedTemplate,
    initialPatternId,
}: Props) {
    const { auth } = usePage().props as { auth: Auth };
    const defaultWatermarkLogoUrl = storageAssetUrl(auth.user.logo);
    const schoolAddress = typeof auth.user.address === 'string' ? auth.user.address : '';
    const showSchoolAddress = Boolean(auth.user.is_show_address);
    const sourceFilters = useMemo(
        () => normalizeSourceOptions(sourceOptions),
        [sourceOptions],
    );
    const [step, setStep] = useState<FormStep>('chapters');
    const [pattern, setPattern] = useState<ComboboxOptionItem | null>(() => {
        const initialPattern = patterns.find(
            (item) => item.id === initialPatternId,
        );

        return initialPattern
            ? { id: initialPattern.id, label: initialPattern.name }
            : null;
    });
    const [klass, setKlass] = useState<ComboboxOptionItem | null>(null);
    const [subject, setSubject] = useState<ComboboxOptionItem | null>(null);
    const [chapters, setChapters] = useState<Chapter[] | null>(null);
    const [chapterMedium, setChapterMedium] = useState<ContentMedium>('English');
    const [loadingChapters, setLoadingChapters] = useState(false);
    const [selected, setSelected] = useState<Record<number, Set<number>>>({});
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
    const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
    const [questionSelection, setQuestionSelection] =
        useState<QuestionSelectionState>({
            globalFilters: createGlobalFilters(sourceFilters),
            sections: [],
            totalMarks: 0,
        });
    const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>(
        'idle',
    );
    const [recoveryDraft, setRecoveryDraft] = useState<DraftPayload | null>(
        null,
    );
    const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedRef = useRef<number | null>(null);
    const isRestoringRef = useRef(false);
    const [pendingTemplate, setPendingTemplate] = useState<AppliedTemplate | null>(
        appliedTemplate ?? null,
    );
    const templateStructureAppliedRef = useRef(false);
    const templateSettingsAppliedRef = useRef(false);
    const [isSaveAsTemplateOpen, setIsSaveAsTemplateOpen] = useState(false);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [saveTemplateError, setSaveTemplateError] = useState<string | null>(null);
    const [activeSetIndex, setActiveSetIndex] = useState(0);
    const [numSets, setNumSets] = useState(1);
    const [viewMode, setViewMode] = useState<'paper' | 'answer_key'>('paper');
    const [printAllSets, setPrintAllSets] = useState(false);
    const [savedPaperId, setSavedPaperId] = useState<number | null>(null);
    const [savedPaperName, setSavedPaperName] = useState('');
    const [savedPaperIsDraft, setSavedPaperIsDraft] = useState(false);
    const [isSavePaperModalOpen, setIsSavePaperModalOpen] = useState(false);
    const [isSavingPaper, setIsSavingPaper] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [savePaperError, setSavePaperError] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

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
                        questionSelection.globalFilters[item.value] ??
                        item.value === 'exercise',
                )
                .map((item) => item.value),
        [questionSelection.globalFilters, sourceFilters],
    );

    const selectedChapterCount = selectedChapterIds.length;
    const canContinueToQuestions = selectedChapterCount > 0;
    const questionSelectionRows = useMemo(
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
    const manualPickerRows = useMemo(
        () =>
            questionSelectionRows.filter(
                (item) =>
                    questionSectionSelectionMode(item.section) === 'manual',
            ),
        [questionSelectionRows],
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
                manualPickerRows.flatMap((item) => item.row.selectedQuestionIds),
            ),
        [manualPickerRows],
    );
    const isManualSelectionComplete = manualPickerRows.every(
        (item) => item.row.selectedQuestionIds.length === item.target,
    );
    const isQuestionSelectionReady =
        questionSelectionRows.length > 0 &&
        questionSelectionRows.every(
            (item) =>
                toNumber(item.row.requiredQuestions) > 0 &&
                toNumber(item.row.marksPerQuestion) > 0,
        );
    const canGeneratePaper =
        questionSelection.totalMarks > 0 &&
        isQuestionSelectionReady &&
        isManualSelectionComplete;
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

    const renderChapterCard = (chapter: Chapter) => (
        <ChapterCard
            key={chapter.id}
            chapter={chapter}
            medium={chapterMedium}
            state={chapterState(chapter)}
            selectedTopics={selected[chapter.id] ?? new Set()}
            onToggleChapter={() => toggleChapter(chapter)}
            onToggleTopic={(topicId) => toggleTopic(chapter.id, topicId)}
        />
    );

    const renderDirectChapterGroup = (
        group: ChapterGroup,
        index: number,
    ) => (
        <DirectChapterGroup
            key={`${group.heading ?? 'none'}-${index}`}
            group={group}
            medium={chapterMedium}
            state={chapterGroupState(group)}
            selected={selected}
            onToggleGroup={() => toggleChapterGroup(group)}
            onToggleChapter={toggleChapter}
        />
    );

    const directChapterColumns = useMemo<
        [ChapterGroup[], ChapterGroup[]]
    >(() => {
        const columns: [ChapterGroup[], ChapterGroup[]] = [[], []];

        if (chapterGroups.length === 0) {
            return columns;
        }

        const estimatedGroupHeight = (group: ChapterGroup) =>
            48 + group.items.length * 44;
        const firstGroup = chapterGroups[0];
        const heights: [number, number] = [
            estimatedGroupHeight(firstGroup),
            0,
        ];
        let activeColumn: 0 | 1 = 1;

        columns[0].push(firstGroup);

        for (const group of chapterGroups.slice(1)) {
            const groupHeight = estimatedGroupHeight(group);
            const otherColumn: 0 | 1 = activeColumn === 0 ? 1 : 0;

            if (heights[activeColumn] + groupHeight > heights[otherColumn]) {
                activeColumn = otherColumn;

            }

            columns[activeColumn].push(group);
            heights[activeColumn] += groupHeight;
        }

        return columns;
    }, [chapterGroups]);

    const topicWiseColumns = useMemo<[Chapter[], Chapter[]]>(() => {
        const topicWiseChapters = chapterGroups.flatMap(
            (group) => group.items,
        );
        const columns: [Chapter[], Chapter[]] = [[], []];
        const heights: [number, number] = [0, 0];
        let activeColumn: 0 | 1 = 0;

        for (const chapter of topicWiseChapters) {
            const chapterHeight =
                68 + Math.max(chapter.topics.length, 1) * 34;
            const otherColumn: 0 | 1 = activeColumn === 0 ? 1 : 0;

            if (
                columns[0].length > 0 &&
                heights[activeColumn] + chapterHeight > heights[otherColumn]
            ) {
                activeColumn = otherColumn;
            }

            columns[activeColumn].push(chapter);
            heights[activeColumn] += chapterHeight;
        }

        return columns;
    }, [chapterGroups]);


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
            .then((data: { chapters: Chapter[]; medium?: ContentMedium }) => {
                setChapters(data.chapters);
                setChapterMedium(data.medium ?? 'English');
            })
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
        params.set('medium', chapterMedium);

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
            !pendingTemplate ||
            templateStructureAppliedRef.current ||
            questionSelection.sections.length === 0
        ) {
            return;
        }

        const structureByType = new Map<number, AppliedTemplate['structure']['sections'][number]>();

        for (const section of pendingTemplate.structure.sections) {
            if (typeof section.questionTypeId === 'number') {
                structureByType.set(section.questionTypeId, section);
            }
        }

        if (structureByType.size === 0) {
            return;
        }

        setQuestionSelection((current) =>
            withTotalMarks({
                ...current,
                sections: current.sections.map((section) => {
                    const match = structureByType.get(section.questionTypeId);

                    if (!match) {
return section;
}

                    const rows = section.rows.length > 0 ? [...section.rows] : [createQuestionRow(String(questionRowSequence.current++))];
                    const firstRow = rows[0];
                    rows[0] = normalizeQuestionRow(
                        {
                            ...firstRow,
                            requiredQuestions: String(match.requiredQuestions ?? ''),
                            marksPerQuestion: String(match.marksEach ?? ''),
                            choiceQuestions: String(match.totalQuestions ?? match.requiredQuestions ?? ''),
                        },
                        section.availableCount,
                    );

                    return {
                        ...section,
                        columnPerRow: match.columns ?? section.columnPerRow,
                        rows,
                    };
                }),
            }),
        );

        templateStructureAppliedRef.current = true;
    }, [pendingTemplate, questionSelection.sections.length]);

    useEffect(() => {
        if (
            !pendingTemplate ||
            templateSettingsAppliedRef.current ||
            !generatedPaper
        ) {
            return;
        }

        setGeneratedPaper((current) =>
            current
                ? {
                    ...current,
                    settings: normalizePaperSettings({
                        ...current.settings,
                        ...pendingTemplate.settings,
                    }),
                }
                : current,
        );
        templateSettingsAppliedRef.current = true;
    }, [pendingTemplate, generatedPaper]);

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
        params.set('medium', chapterMedium);

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

    useEffect(() => {
        try {
            // Look up the draft for the paper we're editing (or the "new" bucket
            // if this is a fresh paper). savedPaper.id is read directly from the
            // prop because the savedPaperId state hook hasn't been set yet on
            // the first effect tick.
            const raw = localStorage.getItem(draftKey(savedPaper?.id ?? null));

            if (raw) {
                setRecoveryDraft(JSON.parse(raw) as DraftPayload);
            }
        } catch {
            // ignore corrupted draft
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // Only autosave when the user has actually changed something. Without
        // this gate the mount-time restore of a saved paper would itself trip
        // the autosave timer and immediately overwrite any genuine unsaved
        // changes already sitting in localStorage with the server's last-saved
        // state — silently destroying recovery data.
        if (!isDirty) {
            return;
        }

        if (!generatedPaper || !pattern || !klass || !subject) {
            return;
        }

        setDraftStatus('saving');

        if (autoSaveRef.current) {
            clearTimeout(autoSaveRef.current);
        }

        autoSaveRef.current = setTimeout(() => {
            try {
                localStorage.setItem(
                    draftKey(savedPaperId),
                    JSON.stringify({
                        savedAt: Date.now(),
                        paper: generatedPaper,
                        questionPoolsByType,
                        questionSelection,
                        chapterSelection: serializeChapterSelection(selected),
                        meta: { pattern, klass, subject },
                    } satisfies DraftPayload),
                );
                setDraftStatus('saved');
            } catch {
                setDraftStatus('idle');
            }
        }, 1500);

        return () => {
            if (autoSaveRef.current) {
                clearTimeout(autoSaveRef.current);
            }
        };
    }, [
        isDirty,
        generatedPaper,
        questionPoolsByType,
        questionSelection,
        selected,
        pattern,
        klass,
        subject,
        savedPaperId,
    ]);

    useEffect(() => {
        if (draftStatus !== 'saved') {
            return;
        }

        const timer = setTimeout(() => setDraftStatus('idle'), 3000);

        return () => clearTimeout(timer);
    }, [draftStatus]);

    useEffect(() => {
        if (!savedPaper) {
            return;
        }

        isRestoringRef.current = true;
        // Backfill / migrate settings: handles the original single-fontFamily
        // shape and any missing/unrecognized fields.
        setGeneratedPaper({
            ...savedPaper.paper,
            settings: normalizePaperSettings(savedPaper.paper.settings),
        });
        setQuestionPoolsByType(savedPaper.questionPoolsByType ?? {});
        setQuestionSelection(
            savedPaper.questionSelection ?? {
                globalFilters: {},
                sections: [],
                totalMarks: 0,
            },
        );
        setSelected(deserializeChapterSelection(savedPaper.chapterSelection));

        if (savedPaper.meta) {
            setPattern(savedPaper.meta.pattern ?? null);
            setKlass(savedPaper.meta.klass ?? null);
            setSubject(savedPaper.meta.subject ?? null);
        }

        setSavedPaperId(savedPaper.id);
        setSavedPaperName(savedPaper.name);
        setSavedPaperIsDraft(savedPaper.is_draft);
        lastSavedRef.current = Date.now();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (generatedPaper === null) {
            return;
        }

        // Mount-time and post-save restores set isRestoringRef so the freshly
        // applied server state doesn't get mis-flagged as dirty. Any other
        // change to generatedPaper is the user editing — mark it dirty so the
        // autosave effect can persist it to localStorage.
        if (isRestoringRef.current) {
            isRestoringRef.current = false;

            return;
        }

        setIsDirty(true);
    }, [generatedPaper]);

    function resetQuestionSelection() {
        setQuestionSelection({
            globalFilters: createGlobalFilters(sourceFilters),
            sections: [],
            totalMarks: 0,
        });
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

    function handleAutoPickChange(sectionId: string, enabled: boolean) {
        setQuestionSelection((current) => ({
            ...current,
            sections: current.sections.map((section) =>
                section.id === sectionId
                    ? {
                        ...section,
                        selectionMode: enabled ? 'automatic' : 'manual',
                    }
                    : section,
            ),
        }));

        if (enabled && manualPickerTarget?.sectionId === sectionId) {
            closeManualQuestionPicker();
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

    function questionPoolParams(
        questionTypeId: number,
        filters?: PaperQuestionPoolFilters,
    ) {
        const params = new URLSearchParams({
            question_type_id: String(questionTypeId),
        });
        const chapterIds = filters?.chapterIds ?? selectedChapterIds;
        const topicIds = filters?.topicIds ?? selectedTopicIds;
        const sources = filters?.sources ?? activeSourceValues;
        chapterIds.forEach((id) => params.append('chapter_ids[]', String(id)));
        topicIds.forEach((id) => params.append('topic_ids[]', String(id)));
        sources.forEach((source) => params.append('sources[]', source));
        params.set('medium', chapterMedium);

        return params;
    }

    async function fetchQuestionPool(
        questionTypeId: number,
        filters?: PaperQuestionPoolFilters,
    ) {
        const response = await fetch(
            `/papers/generate/questions?${questionPoolParams(questionTypeId, filters).toString()}`,
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

    async function searchPaperQuestionPool(
        questionTypeId: number,
        filters: PaperQuestionPoolFilters,
    ) {
        return fetchQuestionPool(questionTypeId, filters);
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
                    questionSectionSelectionMode(section) === 'manual'
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
                    title: section.heading || section.title,
                    requiredQuestions: toNumber(row.requiredQuestions),
                    totalQuestions: rowTarget(row),
                    marksEach: toNumber(row.marksPerQuestion),
                    questions: selectedQuestions.map((question) =>
                        paperQuestionFromManual(
                            question,
                            nextPaperQuestionId(),
                        ),
                    ),
                    columns: clampSectionColumns(section.columnPerRow, 1),
                };
            });

            setQuestionPoolsByType(pools);
            setGeneratedPaper({
                id: `paper_${Date.now()}`,
                header: {
                    schoolName: (auth.user.school_name as string) || auth.user.name || 'School Name',
                    exam: '',
                    className: klass?.label ?? '',
                    section: '',
                    subject: subject?.label ?? '',
                    studentName: '',
                    type: '',
                    date: '',
                    duration: '2 hours',
                    marks: questionSelection.totalMarks,
                    passingMarks: 0,
                    rollNo: '',
                },
                sections,
                settings: { ...DEFAULT_PAPER_SETTINGS },
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
        if (autoSaveRef.current) {
            clearTimeout(autoSaveRef.current);
        }

        setGeneratedPaper(null);
        setPaperQuestionPickerTarget(null);
        setPaperQuestionSearch('');
        setPaperGenerationError(null);
        setPaperSectionEditorTarget(null);
        setPaperQuestionEditorTarget(null);
        setDraftStatus('idle');
        setSavedPaperId(null);
        setSavedPaperName('');
        setSavedPaperIsDraft(false);
        setIsDirty(false);
        setIsSavePaperModalOpen(false);
        setIsSavingPaper(false);
        setIsSavingDraft(false);
        setSavePaperError(null);
        lastSavedRef.current = null;
        isRestoringRef.current = false;
    }

    function saveDraft() {
        if (!generatedPaper || !pattern || !klass || !subject) {
            return;
        }

        try {
            localStorage.setItem(
                draftKey(savedPaperId),
                JSON.stringify({
                    savedAt: Date.now(),
                    paper: generatedPaper,
                    questionPoolsByType,
                    questionSelection,
                    chapterSelection: serializeChapterSelection(selected),
                    meta: { pattern, klass, subject },
                } satisfies DraftPayload),
            );
        } catch {
            // localStorage unavailable
        }
    }

    function clearDraft() {
        // Clear the active paper's draft, plus the "new" bucket — that one
        // accumulates edits before the first save and becomes stale the
        // moment the paper gets an id.
        localStorage.removeItem(draftKey(savedPaperId));
        localStorage.removeItem(draftKey(null));
        setRecoveryDraft(null);
    }

    // Used by the recovery banner's Dismiss button. Removes the persisted
    // draft so it doesn't pop up again on the next reload.
    function dismissRecoveryDraft() {
        try {
            localStorage.removeItem(draftKey(savedPaperId));
        } catch {
            // localStorage unavailable
        }

        setRecoveryDraft(null);
    }

    function restoreDraft(draft: DraftPayload) {
        setGeneratedPaper({
            ...draft.paper,
            settings: normalizePaperSettings(draft.paper.settings),
        });
        setQuestionPoolsByType(draft.questionPoolsByType);
        setQuestionSelection(draft.questionSelection);
        setSelected(deserializeChapterSelection(draft.chapterSelection));
        setPattern(draft.meta.pattern);
        setKlass(draft.meta.klass);
        setSubject(draft.meta.subject);
        setRecoveryDraft(null);
    }

    // Toolbar "Save as Draft" — persists current state to the server as a
    // draft and stays on the page. Differs from `saveDraftAndBack` which
    // also navigates back to setup after saving.
    async function saveAsDraft() {
        if (isSavingDraft) {
            return;
        }

        setIsSavingDraft(true);

        const ok = await saveDraftToServer();

        setIsSavingDraft(false);

        if (ok) {
            // DB now has the latest state — flush dirty flag and wipe the
            // localStorage recovery copy so a later reload doesn't dangle a
            // stale "Unsaved changes" banner.
            isRestoringRef.current = true;
            setIsDirty(false);
            lastSavedRef.current = Date.now();
            clearDraft();
            toast.success('Draft saved');
        } else {
            toast.error(savePaperError ?? 'Could not save draft. Try again.');
        }
    }

    async function saveDraftAndBack() {
        if (isSavingDraft) {
            return;
        }

        setIsSavingDraft(true);
        saveDraft();

        const ok = await saveDraftToServer();

        setIsSavingDraft(false);

        if (ok) {
            toast.success('Draft saved');
            returnToPaperSetup();
        } else {
            toast.error(
                savePaperError ??
                'Could not save draft. Your work is still here.',
            );
        }
    }

    function discardAndBack() {
        clearDraft();
        returnToPaperSetup();
    }

    async function saveDraftToServer(): Promise<boolean> {
        if (!generatedPaper || !pattern || !klass || !subject) {
            return false;
        }

        const csrfToken =
            (
                document.querySelector(
                    'meta[name="csrf-token"]',
                ) as HTMLMetaElement
            )?.content ?? '';

        const payload = {
            name: defaultPaperName() || 'Untitled Draft',
            is_draft: true,
            subject: generatedPaper.header.subject || null,
            class_name: generatedPaper.header.className || null,
            total_marks: paperTotalMarks(generatedPaper),
            paper_data: {
                paper: generatedPaper,
                questionPoolsByType,
                questionSelection,
                chapterSelection: serializeChapterSelection(selected),
                meta: { pattern, klass, subject },
            },
        };

        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken,
            'X-Requested-With': 'XMLHttpRequest',
        };

        setSavePaperError(null);

        try {
            // Three branches:
            //   - Existing record → PUT (covers both is_draft=true and is_draft=false;
            //     the payload sets is_draft=true so a saved paper gets demoted to draft).
            //   - No record yet → POST and capture the new id so subsequent saves update
            //     the same row instead of creating duplicates.
            const response =
                savedPaperId !== null
                    ? await fetch(`/papers/${savedPaperId}`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify(payload),
                        credentials: 'same-origin',
                    })
                    : await fetch('/papers', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(payload),
                        credentials: 'same-origin',
                    });

            if (!response.ok) {
                throw new Error(
                    `Server returned ${response.status} ${response.statusText}`,
                );
            }

            if (savedPaperId === null) {
                const data = (await response.json()) as { id: number };

                setSavedPaperId(data.id);
            }

            setSavedPaperIsDraft(true);

            return true;
        } catch (error) {
            setSavePaperError(
                error instanceof Error
                    ? error.message
                    : 'Failed to save draft.',
            );

            return false;
        }
    }

    async function savePaperToServer(values: SavePaperValues) {
        if (!generatedPaper || isSavingPaper) {
            return;
        }

        setIsSavingPaper(true);
        setSavePaperError(null);

        const csrfToken =
            (
                document.querySelector(
                    'meta[name="csrf-token"]',
                ) as HTMLMetaElement
            )?.content ?? '';

        const updatedPaper: GeneratedPaper = {
            ...generatedPaper,
            header: {
                ...generatedPaper.header,
                exam: values.examType,
                section: values.section,
                date: values.date,
                duration: values.timeAllowed,
                marks: Number(values.examMarks) || generatedPaper.header.marks,
                passingMarks: Number(values.passingMarks) || 0,
            },
        };

        const payload = {
            name: values.name,
            is_draft: false,
            subject: updatedPaper.header.subject || null,
            class_name: updatedPaper.header.className || null,
            total_marks: paperTotalMarks(updatedPaper),
            paper_data: {
                paper: updatedPaper,
                questionPoolsByType,
                questionSelection,
                chapterSelection: serializeChapterSelection(selected),
                meta: { pattern, klass, subject },
            },
        };

        try {
            let newId = savedPaperId;

            if (newId !== null) {
                const res = await fetch(`/papers/${newId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify(payload),
                    credentials: 'same-origin',
                });

                if (!res.ok) {
                    throw new Error('Failed to save paper.');
                }
            } else {
                const res = await fetch('/papers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify(payload),
                    credentials: 'same-origin',
                });

                if (!res.ok) {
                    throw new Error('Failed to save paper.');
                }

                const data = (await res.json()) as { id: number };
                newId = data.id;
                setSavedPaperId(newId);
            }

            // Apply the header changes to the paper view
            isRestoringRef.current = true;
            setGeneratedPaper(updatedPaper);
            setSavedPaperName(values.name);
            setSavedPaperIsDraft(false);
            lastSavedRef.current = Date.now();
            setIsDirty(false);
            setIsSavePaperModalOpen(false);
            clearDraft();
        } catch (error) {
            setSavePaperError(
                error instanceof Error
                    ? error.message
                    : 'Failed to save paper.',
            );
        } finally {
            setIsSavingPaper(false);
        }
    }

    function defaultPaperName(): string {
        if (!generatedPaper) {
            return '';
        }

        return (
            [
                generatedPaper.header.exam,
                generatedPaper.header.subject,
                generatedPaper.header.className,
            ]
                .filter(Boolean)
                .join(' – ') || 'My Paper'
        );
    }

    async function saveAsTemplateToServer(values: SaveAsTemplateValues) {
        if (!generatedPaper || isSavingTemplate) {
return;
}

        setIsSavingTemplate(true);
        setSaveTemplateError(null);

        const csrfToken =
            (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
                ?.content ?? '';

        const structure = {
            sections: generatedPaper.sections.map((section) => ({
                questionTypeId: section.questionTypeId,
                category: section.category,
                title: section.title,
                requiredQuestions: section.requiredQuestions,
                totalQuestions: section.totalQuestions,
                marksEach: section.marksEach,
                columns: section.columns ?? null,
            })),
        };

        try {
            const res = await fetch('/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    name: values.name,
                    description: values.description || null,
                    settings: generatedPaper.settings,
                    structure,
                }),
                credentials: 'same-origin',
            });

            if (!res.ok) {
                throw new Error(`Server returned ${res.status}`);
            }

            setIsSaveAsTemplateOpen(false);
            toast.success('Template saved');
        } catch (error) {
            setSaveTemplateError(
                error instanceof Error ? error.message : 'Failed to save template.',
            );
        } finally {
            setIsSavingTemplate(false);
        }
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

    function updatePaperSettings(patch: Partial<PaperSettings>) {
        setGeneratedPaper((current) =>
            current
                ? {
                    ...current,
                    // Spread DEFAULT first so any field missing from an
                    // older in-memory settings object gets backfilled, then
                    // the loaded settings, then the patch wins.
                    settings: {
                        ...DEFAULT_PAPER_SETTINGS,
                        ...(current.settings ?? {}),
                        ...patch,
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

    function updatePaperQuestionAnswerLineSpacing(
        sectionId: string,
        questionId: string,
        answerLineSpacing: number,
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
                                                answerLineSpacing,
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

    function movePaperSection(sectionId: string, direction: -1 | 1) {
        setGeneratedPaper((current) => {
            if (!current) {
                return current;
            }

            const currentIndex = current.sections.findIndex(
                (section) => section.id === sectionId,
            );
            const nextIndex = currentIndex + direction;

            if (
                currentIndex === -1 ||
                nextIndex < 0 ||
                nextIndex >= current.sections.length
            ) {
                return current;
            }

            const sections = [...current.sections];
            const [section] = sections.splice(currentIndex, 1);
            sections.splice(nextIndex, 0, section);

            return {
                ...current,
                sections,
            };
        });
    }

    function updatePaperSectionColumns(sectionId: string, value: number) {
        setGeneratedPaper((current) =>
            current
                ? {
                    ...current,
                    sections: current.sections.map((section) =>
                        section.id === sectionId
                            ? {
                                ...section,
                                columns: clampSectionColumns(value),
                            }
                            : section,
                    ),
                }
                : current,
        );
    }

    function shufflePaperSection(sectionId: string) {
        setGeneratedPaper((current) =>
            current
                ? {
                    ...current,
                    sections: current.sections.map((section) =>
                        section.id === sectionId
                            ? {
                                ...section,
                                questions: shuffleItems(
                                    section.questions,
                                ).map((question) => ({
                                    ...question,
                                    options:
                                        section.category ===
                                            'Objective Questions'
                                            ? shuffleItems(question.options)
                                            : question.options,
                                    passageQuestions:
                                        section.category ===
                                            'Objective Questions' &&
                                            question.passageQuestions
                                            ? shuffleItems(
                                                question.passageQuestions,
                                            ).map(
                                                (passageQuestion) => ({
                                                    ...passageQuestion,
                                                    options: shuffleItems(
                                                        passageQuestion.options,
                                                    ),
                                                }),
                                            )
                                            : question.passageQuestions,
                                })),
                            }
                            : section,
                    ),
                }
                : current,
        );
    }

    function openAddPaperSectionModal() {
        setIsAddSectionModalOpen(true);
    }

    function closeAddPaperSectionModal() {
        setIsAddSectionModalOpen(false);
    }

    async function addPaperSection(values: AddPaperSectionValues) {
        const questionType = questionSelection.sections.find(
            (section) => section.questionTypeId === values.questionTypeId,
        );

        if (!questionType) {
            throw new Error('Select a question type first.');
        }

        const totalQuestions = Math.max(1, values.totalQuestions);
        const requiredQuestions = Math.min(
            Math.max(1, values.requiredQuestions),
            totalQuestions,
        );
        const marksEach = Math.max(0, values.marksEach);
        const selectedQuestions = values.selectedQuestions.filter(
            (question) => !generatedSourceQuestionIds.has(question.id),
        );

        if (selectedQuestions.length < totalQuestions) {
            throw new Error(
                `Select ${totalQuestions} unused questions for ${questionType.title}.`,
            );
        }

        setQuestionPoolsByType((current) => ({
            ...current,
            [values.questionTypeId]: values.poolQuestions,
        }));

        const newSection: GeneratedPaperSection = {
            id: nextPaperSectionId('paper_sec'),
            questionTypeId: questionType.questionTypeId,
            category: questionType.category,
            title: questionType.heading || questionType.title,
            requiredQuestions,
            totalQuestions,
            marksEach,
            questions: selectedQuestions.map((question) =>
                paperQuestionFromManual(question, nextPaperQuestionId()),
            ),
            columns: clampSectionColumns(questionType.columnPerRow, 1),
        };

        setGeneratedPaper((current) =>
            current
                ? {
                    ...current,
                    sections: [...current.sections, newSection],
                }
                : current,
        );
        closeAddPaperSectionModal();
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
                [key]: !(
                    current.globalFilters[key] ?? key === 'exercise'
                ),
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
        return (
            questionSelection.globalFilters[value] ?? value === 'exercise'
        );
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
                            autoPick={questionSectionSelectionMode(section) === 'automatic'}
                            onAutoPickChange={handleAutoPickChange}
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
                    {recoveryDraft && (
                        <div className="mb-3 flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10 print:hidden">
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                                    <ClockIcon className="size-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                                        Unsaved changes from your last session
                                    </p>
                                    <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                                        Auto-saved{' '}
                                        {draftTimeAgo(recoveryDraft.savedAt)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => restoreDraft(recoveryDraft)}
                                    className="cursor-pointer rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
                                >
                                    Restore Changes
                                </button>
                                <button
                                    type="button"
                                    onClick={dismissRecoveryDraft}
                                    className="cursor-pointer rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-500/30 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-500/10"
                                >
                                    Discard
                                </button>
                            </div>
                        </div>
                    )}
                    <GeneratedPaperView
                        paper={variantForSet(generatedPaper, activeSetIndex)}
                        rawPaper={generatedPaper}
                        activeSetIndex={activeSetIndex}
                        numSets={numSets}
                        viewMode={viewMode}
                        onActiveSetChange={setActiveSetIndex}
                        onNumSetsChange={setNumSets}
                        onViewModeChange={setViewMode}
                        printAllSets={printAllSets}
                        onPrintAllSets={() => {
                            setPrintAllSets(true);
                            setTimeout(() => {
                                window.print();
                                setPrintAllSets(false);
                            }, 50);
                        }}
                        totalMarks={paperTotalMarks(generatedPaper)}
                        defaultWatermarkLogoUrl={defaultWatermarkLogoUrl}
                        schoolAddress={schoolAddress}
                        showSchoolAddress={showSchoolAddress}
                        pickerTarget={activePaperPickerContext}
                        pickerQuestions={filteredPaperPickerQuestions}
                        pickerSearch={paperQuestionSearch}
                        usedQuestionIds={generatedSourceQuestionIds}
                        savedPaperId={savedPaperId}
                        isDraft={savedPaperIsDraft}
                        isDirty={isDirty}
                        isSavingPaper={isSavingPaper}
                        isSavingDraft={isSavingDraft}
                        onOpenSavePaperModal={() =>
                            setIsSavePaperModalOpen(true)
                        }
                        onOpenSaveAsTemplate={() => {
                            setSaveTemplateError(null);
                            setIsSaveAsTemplateOpen(true);
                        }}
                        onSaveDraft={() => void saveAsDraft()}
                        onGoBack={returnToPaperSetup}
                        onSaveDraftAndBack={() => void saveDraftAndBack()}
                        onDiscardAndBack={discardAndBack}
                        onHeaderChange={updatePaperHeader}
                        settings={{
                            ...DEFAULT_PAPER_SETTINGS,
                            ...(generatedPaper.settings ?? {}),
                        }}
                        onSettingsChange={updatePaperSettings}
                        onAddSection={openAddPaperSectionModal}
                        onQuestionImageSizeChange={updatePaperQuestionImageSize}
                        onQuestionAnswerLinesChange={
                            updatePaperQuestionAnswerLines
                        }
                        onQuestionAnswerLineSpacingChange={
                            updatePaperQuestionAnswerLineSpacing
                        }
                        onEditSection={openPaperSectionEditor}
                        onDeleteSection={deletePaperSection}
                        onMoveSection={movePaperSection}
                        onShuffleQuestions={shufflePaperSection}
                        onEditQuestion={openPaperQuestionEditor}
                        onRandomQuestion={replacePaperQuestionRandom}
                        onPickQuestion={openPaperQuestionPicker}
                        onAddRandomQuestion={addRandomPaperQuestion}
                        onAddCustomQuestion={addCustomPaperQuestion}
                        onRemoveQuestion={removePaperQuestion}
                        onColumnsChange={updatePaperSectionColumns}
                        onPickerSearchChange={setPaperQuestionSearch}
                        onPickerSelect={pickPaperQuestion}
                        onPickerClose={closePaperQuestionPicker}
                    />

                    {activePaperQuestionEditorContext && (
                        <Suspense fallback={null}>
                            <QuestionEditModal
                                key={activePaperQuestionEditorContext.question.id}
                                question={
                                    activePaperQuestionEditorContext.question
                                }
                                onClose={closePaperQuestionEditor}
                                onSave={savePaperQuestionEdit}
                            />
                        </Suspense>
                    )}

                    {activePaperSectionEditorContext && (
                        <SectionEditModal
                            key={activePaperSectionEditorContext.id}
                            section={activePaperSectionEditorContext}
                            onClose={closePaperSectionEditor}
                            onSave={savePaperSectionEdit}
                        />
                    )}

                    {isSavePaperModalOpen && generatedPaper && (
                        <SavePaperModal
                            initial={{
                                name: savedPaperName || defaultPaperName(),
                                examType: generatedPaper.header.exam,
                                section: generatedPaper.header.section,
                                date: generatedPaper.header.date,
                                timeAllowed: generatedPaper.header.duration,
                                examMarks: String(
                                    paperTotalMarks(generatedPaper) ||
                                    generatedPaper.header.marks ||
                                    '',
                                ),
                                passingMarks: String(
                                    generatedPaper.header.passingMarks || '',
                                ),
                            }}
                            isUpdate={savedPaperId !== null}
                            isSaving={isSavingPaper}
                            error={savePaperError}
                            onSave={savePaperToServer}
                            onCancel={() => {
                                setIsSavePaperModalOpen(false);
                                setSavePaperError(null);
                            }}
                        />
                    )}

                    {isAddSectionModalOpen && (
                        <AddPaperSectionModal
                            questionTypes={questionSelection.sections}
                            chapters={chapters ?? []}
                            sourceOptions={sourceFilters}
                            initialChapterIds={selectedChapterIds}
                            initialTopicIds={selectedTopicIds}
                            initialSources={activeSourceValues}
                            usedQuestionIds={generatedSourceQuestionIds}
                            onSearchQuestions={searchPaperQuestionPool}
                            onClose={closeAddPaperSectionModal}
                            onSubmit={addPaperSection}
                        />
                    )}

                    {isSaveAsTemplateOpen && generatedPaper && (
                        <SaveAsTemplateModal
                            defaultName={savedPaperName || defaultPaperName() || 'My Template'}
                            isSaving={isSavingTemplate}
                            error={saveTemplateError}
                            onSave={saveAsTemplateToServer}
                            onCancel={() => {
                                setIsSaveAsTemplateOpen(false);
                                setSaveTemplateError(null);
                            }}
                        />
                    )}
                </>
            ) : (
                <>
                    <div className="w-full space-y-6">
                        {recoveryDraft && (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-500/30 dark:bg-brand-500/10">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                                        <BookmarkIcon className="size-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-brand-900 dark:text-brand-100">
                                            Unsaved draft found
                                        </p>
                                        <p className="mt-0.5 text-xs text-brand-700 dark:text-brand-300">
                                            {recoveryDraft.meta.subject.label}{' '}
                                            &middot;{' '}
                                            {recoveryDraft.meta.klass.label}{' '}
                                            &middot;{' '}
                                            <ClockIcon className="mb-0.5 inline size-3" />{' '}
                                            {draftTimeAgo(
                                                recoveryDraft.savedAt,
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            restoreDraft(recoveryDraft)
                                        }
                                        className="cursor-pointer rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400"
                                    >
                                        Restore Draft
                                    </button>
                                    <button
                                        type="button"
                                        onClick={dismissRecoveryDraft}
                                        className="cursor-pointer rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50 dark:border-brand-500/30 dark:bg-transparent dark:text-brand-300 dark:hover:bg-brand-500/10"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        )}

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
                                <ScopePicker
                                    pattern={pattern}
                                    klass={klass}
                                    subject={subject}
                                    patternOptions={patternOptions}
                                    classOptions={classOptions}
                                    subjectOptions={subjectOptions}
                                    onPatternChange={handlePatternChange}
                                    onClassChange={handleClassChange}
                                    onSubjectChange={handleSubjectChange}
                                    chapters={chapters}
                                    allChaptersState={allChaptersState}
                                    onToggleAllChapters={toggleAllChapters}
                                />

                                {pattern && klass && subject && (
                                    <section className="space-y-4">
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
                                                        <>
                                                            <div className="space-y-4 lg:hidden">
                                                                {chapterGroups.map(
                                                                    renderDirectChapterGroup,
                                                                )}
                                                            </div>
                                                            <div className="hidden gap-4 lg:grid lg:grid-cols-2">
                                                                <div className="space-y-4">
                                                                    {directChapterColumns[0].map(
                                                                        renderDirectChapterGroup,
                                                                    )}
                                                                </div>
                                                                <div className="space-y-4">
                                                                    {directChapterColumns[1].map(
                                                                        renderDirectChapterGroup,
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="space-y-4 lg:hidden">
                                                                {chapterGroups
                                                                    .flatMap((group) => group.items)
                                                                    .map(renderChapterCard)}
                                                            </div>
                                                            <div className="hidden gap-4 lg:grid lg:grid-cols-2">
                                                                <div className="space-y-4">
                                                                    {topicWiseColumns[0].map(renderChapterCard)}
                                                                </div>
                                                                <div className="space-y-4">
                                                                    {topicWiseColumns[1].map(renderChapterCard)}
                                                                </div>
                                                            </div>
                                                        </>
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
                                                <div className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                                    <FileTextIcon className="size-4" />
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                                        Question Selection
                                                    </h2>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {[pattern, klass, subject].map(
                                                            (item) =>
                                                                item && (
                                                                    <span
                                                                        key={item.id}
                                                                        className="inline-flex h-7 max-w-full items-center rounded-md bg-brand-50 px-2 text-[11px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                                                                    >
                                                                        <span className="truncate">
                                                                            {item.label}
                                                                        </span>
                                                                    </span>
                                                                ),
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                                <MediumSelector
                                                    value={chapterMedium}
                                                    onChange={setChapterMedium}
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

                                        <div className="min-w-28 rounded-xl bg-brand-600 px-4 py-3 text-white dark:bg-brand-500 dark:text-white">
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

                                <div className="space-y-5">
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
                                            <div className="space-y-5 pt-2">
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
                                medium={chapterMedium}
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
                        <div className="flex w-full justify-end">
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
                                                : 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400',
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
                                                : 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400',
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
    medium,
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
    medium: ContentMedium;
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
    const isBilingual = medium === 'Both';
    const singleMedium = medium === 'Urdu' ? 'Urdu' : 'English';

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
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6"
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="manual-question-picker-title"
                className="flex max-h-[min(52rem,calc(100vh-1.5rem))] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/15 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3.5 sm:px-5 dark:border-slate-800">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                            <ListChecksIcon className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2
                                    id="manual-question-picker-title"
                                    className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100"
                                >
                                    Select questions
                                </h2>
                                <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {activeRow.section.title}
                                </span>
                            </div>

                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <span className="inline-flex h-9 items-center rounded-lg bg-brand-50 px-3 text-sm font-semibold tabular-nums text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                            {activeSelectedCount}/{activeRow.target}
                        </span>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close question picker"
                            title="Close"
                            className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                            <XIcon className="size-4" />
                        </button>
                    </div>
                </header>

                <div className="flex flex-col gap-2.5 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800 dark:bg-slate-950/35">
                    <label className="relative min-w-0 flex-1">
                        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            autoComplete="off"
                            type="search"
                            value={search}
                            onChange={(event) =>
                                onSearchChange(event.target.value)
                            }
                            placeholder="Search questions"
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-[13px] font-medium text-slate-900 transition-colors outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-brand-400"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={onSelectedOnlyChange}
                        className={cn(
                            'inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30',
                            showSelectedOnly
                                ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800',
                        )}
                    >
                        <CheckIcon className="size-3.5" />
                        Selected only
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/55 p-3 sm:p-4 dark:bg-slate-950/25">
                    {loading && (
                        <div className="flex min-h-40 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                            <Loader2Icon className="size-4 animate-spin" />
                            Loading questions
                        </div>
                    )}

                    {!loading && error && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                            {error}
                        </div>
                    )}

                    {!loading && !error && questions.length === 0 && (
                        <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center dark:border-slate-700 dark:bg-slate-900">
                            <SearchXIcon className="mb-2 size-5 text-slate-400" />
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                No matching questions
                            </p>
                        </div>
                    )}

                    {!loading && !error && questions.length > 0 && (
                        <div className="space-y-2">
                            {questions.map((question) => {
                                const checked = selectedQuestionIds.has(
                                    question.id,
                                );
                                const selectedElsewhere =
                                    !checked &&
                                    allSelectedQuestionIds.has(question.id);
                                const reachedLimit =
                                    !checked &&
                                    activeSelectedCount >= activeRow.target;
                                const disabled =
                                    selectedElsewhere || reachedLimit;
                                const displayMedium = isBilingual
                                    ? 'English'
                                    : singleMedium;

                                return (
                                    <button
                                        key={question.id}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() =>
                                            onToggleQuestion(question.id)
                                        }
                                        className={cn(
                                            'group flex w-full cursor-pointer items-start gap-3 rounded-xl border border-l-4 bg-white p-3 text-left transition-[border-color,box-shadow,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:bg-slate-900',
                                            checked
                                                ? 'border-brand-300 border-l-brand-600 bg-brand-50/45 shadow-sm shadow-brand-900/5 dark:border-brand-500/45 dark:border-l-brand-400 dark:bg-brand-500/10'
                                                : 'border-slate-200 border-l-slate-200 hover:border-brand-200 hover:shadow-sm dark:border-slate-800 dark:border-l-slate-800 dark:hover:border-brand-500/35',
                                            disabled &&
                                            'cursor-not-allowed opacity-50',
                                        )}
                                    >

                                        <span className="min-w-0 flex-1">
                                            <span
                                                className={cn(
                                                    'grid min-w-0 gap-3',
                                                    isBilingual &&
                                                    'md:grid-cols-2',
                                                )}
                                            >
                                                <span className="min-w-0">

                                                    <span
                                                        dir={displayMedium === 'Urdu' ? 'rtl' : 'ltr'}
                                                        className={cn(
                                                            'block text-[13px] font-medium leading-5 text-slate-800 dark:text-slate-100',
                                                            displayMedium === 'Urdu' && 'text-right',
                                                        )}
                                                    >
                                                        {manualQuestionDisplayTextForMedium(
                                                            question,
                                                            displayMedium,
                                                        )}
                                                    </span>
                                                </span>
                                                {isBilingual && (
                                                    <span
                                                        dir="rtl"
                                                        className="min-w-0 text-right md:border-l md:border-slate-200 md:pl-3 dark:md:border-slate-700"
                                                    >

                                                        <span className="block text-[13px] font-medium leading-6 text-slate-800 dark:text-slate-100">
                                                            {manualQuestionDisplayTextForMedium(
                                                                question,
                                                                'Urdu',
                                                            )}
                                                        </span>
                                                    </span>
                                                )}
                                            </span>
                                            <span className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                                                    {manualQuestionChapterLabel(
                                                        question,
                                                    )}
                                                </span>
                                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                                                    {question.sourceLabel ??
                                                        question.source ??
                                                        'No source'}
                                                </span>
                                                {selectedElsewhere && (
                                                    <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                                                        Used elsewhere
                                                    </span>
                                                )}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-5 dark:border-slate-800 dark:bg-slate-900">
                    <p
                        aria-live="polite"
                        className="text-xs font-medium text-slate-500 dark:text-slate-400"
                    >
                        {isActiveRowComplete
                            ? 'Selection complete'
                            : `${activeRow.target - activeSelectedCount} more required`}
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:bg-brand-500 dark:hover:bg-brand-400"
                    >
                        Done
                    </button>
                </footer>
            </section>
        </div>
    );
}
type AddSectionTab = 'show' | 'picked' | 'chapters';

function AddPaperSectionModal({
    questionTypes,
    chapters,
    sourceOptions,
    initialChapterIds,
    initialTopicIds,
    initialSources,
    usedQuestionIds,
    onSearchQuestions,
    onClose,
    onSubmit,
}: {
    questionTypes: QuestionSelectionSection[];
    chapters: Chapter[];
    sourceOptions: SourceOption[];
    initialChapterIds: number[];
    initialTopicIds: number[];
    initialSources: string[];
    usedQuestionIds: Set<number>;
    onSearchQuestions: (
        questionTypeId: number,
        filters: PaperQuestionPoolFilters,
    ) => Promise<ManualQuestion[]>;
    onClose: () => void;
    onSubmit: (values: AddPaperSectionValues) => Promise<void>;
}) {
    const [questionTypeId, setQuestionTypeId] = useState(
        questionTypes[0] ? String(questionTypes[0].questionTypeId) : '',
    );
    const [sourceValue, setSourceValue] = useState(
        initialSources.length === 1 ? initialSources[0] : '__all__',
    );
    const [totalQuestions, setTotalQuestions] = useState('1');
    const [requiredQuestions, setRequiredQuestions] = useState('1');
    const [marksEach, setMarksEach] = useState('1');
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>(
        [],
    );
    const [resultQuestions, setResultQuestions] = useState<ManualQuestion[]>(
        [],
    );
    const [activeTab, setActiveTab] = useState<AddSectionTab>('show');
    const [hasSearched, setHasSearched] = useState(false);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [questionLoadError, setQuestionLoadError] = useState<string | null>(
        null,
    );
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [localChapterIds, setLocalChapterIds] = useState<Set<number>>(
        () => new Set(initialChapterIds),
    );
    const [localTopicIds, setLocalTopicIds] = useState<Set<number>>(
        () => new Set(initialTopicIds),
    );
    const typeOptions = useMemo<ComboboxOptionItem[]>(
        () =>
            questionTypes.map((type) => ({
                id: type.questionTypeId,
                label: type.title,
                hint: type.category,
            })),
        [questionTypes],
    );
    const availableSources = sourceOptions.length
        ? sourceOptions
        : fallbackSourceOptions;
    const sourceComboboxOptions = useMemo<ComboboxOptionItem[]>(
        () => [
            { id: '__all__', label: 'All sources' },
            ...availableSources.map((source) => ({
                id: source.value,
                label: source.label,
            })),
        ],
        [availableSources],
    );
    const selectedTypeOption = useMemo(
        () =>
            typeOptions.find(
                (option) => String(option.id) === questionTypeId,
            ) ?? null,
        [questionTypeId, typeOptions],
    );
    const selectedSourceOption = useMemo(
        () =>
            sourceComboboxOptions.find(
                (option) => String(option.id) === sourceValue,
            ) ?? null,
        [sourceComboboxOptions, sourceValue],
    );
    const selectedType = useMemo(
        () =>
            questionTypes.find(
                (type) => type.questionTypeId === toNumber(questionTypeId),
            ) ?? null,
        [questionTypeId, questionTypes],
    );
    const selectedSources =
        sourceValue === ''
            ? []
            : sourceValue === '__all__'
                ? availableSources.map((source) => source.value)
                : [sourceValue];
    const modalChapterIds = useMemo(
        () =>
            chapters
                .filter((chapter) =>
                    chapter.topics.length === 0
                        ? localChapterIds.has(chapter.id)
                        : chapter.topics.some((topic) =>
                            localTopicIds.has(topic.id),
                        ),
                )
                .map((chapter) => chapter.id),
        [chapters, localChapterIds, localTopicIds],
    );
    const modalTopicIds = useMemo(
        () =>
            chapters.flatMap((chapter) =>
                chapter.topics
                    .filter((topic) => localTopicIds.has(topic.id))
                    .map((topic) => topic.id),
            ),
        [chapters, localTopicIds],
    );
    const filterSignature = `${questionTypeId}|${sourceValue}|${modalChapterIds.join(',')}|${modalTopicIds.join(',')}`;
    const unusedQuestions = useMemo(
        () =>
            resultQuestions.filter(
                (question) => !usedQuestionIds.has(question.id),
            ),
        [resultQuestions, usedQuestionIds],
    );
    const filteredQuestions = unusedQuestions;
    const selectedQuestions = useMemo(
        () =>
            selectedQuestionIds
                .map((id) =>
                    resultQuestions.find((question) => question.id === id),
                )
                .filter((question): question is ManualQuestion =>
                    Boolean(question),
                ),
        [resultQuestions, selectedQuestionIds],
    );
    const questionsByChapter = useMemo(() => {
        const groups = new Map<string, ManualQuestion[]>();

        filteredQuestions.forEach((question) => {
            const label = manualQuestionChapterLabel(question);
            groups.set(label, [...(groups.get(label) ?? []), question]);
        });

        return [...groups.entries()];
    }, [filteredQuestions]);
    const availableQuestionLimit = hasSearched
        ? filteredQuestions.length
        : (selectedType?.availableCount ?? 0);
    const totalNumber = toNumber(totalQuestions);
    const requiredNumber = toNumber(requiredQuestions);
    const marksNumber = toNumber(marksEach);
    const canSearch =
        selectedType !== null &&
        selectedSources.length > 0 &&
        modalChapterIds.length > 0 &&
        !loadingQuestions;
    const canSubmit =
        selectedType !== null &&
        totalNumber > 0 &&
        requiredNumber > 0 &&
        marksNumber > 0 &&
        availableQuestionLimit > 0 &&
        totalNumber <= availableQuestionLimit &&
        selectedQuestions.length === totalNumber &&
        !submitting;

    useEffect(() => {
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        window.addEventListener('keydown', closeOnEscape);

        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [onClose]);

    useEffect(() => {
        setHasSearched(false);
        setResultQuestions([]);
        setSelectedQuestionIds([]);
        setQuestionLoadError(null);
        setSubmitError(null);
    }, [filterSignature]);

    useEffect(() => {
        setSelectedQuestionIds((current) => current.slice(0, totalNumber));
        setRequiredQuestions((current) =>
            boundedQuestionCount(current, Math.max(0, totalNumber)),
        );
    }, [totalNumber]);

    useEffect(() => {
        setTotalQuestions((current) =>
            boundedQuestionCount(current, availableQuestionLimit),
        );
        setSelectedQuestionIds((current) =>
            current.slice(0, availableQuestionLimit),
        );
    }, [availableQuestionLimit]);

    function boundedQuestionCount(value: string, maximum: number): string {
        const digits = onlyDigits(value);

        if (digits === '' || maximum <= 0) {
            return '';
        }

        return String(Math.min(Math.max(1, Number(digits)), maximum));
    }

    function updateTotalQuestions(value: string) {
        const nextTotal = boundedQuestionCount(value, availableQuestionLimit);

        setTotalQuestions(nextTotal);
        setRequiredQuestions((current) =>
            boundedQuestionCount(current, toNumber(nextTotal)),
        );
    }

    function updateRequiredQuestions(value: string) {
        setRequiredQuestions(
            boundedQuestionCount(value, Math.max(0, totalNumber)),
        );
    }

    function toggleChapter(chapter: Chapter) {
        if (chapter.topics.length === 0) {
            setLocalChapterIds((current) => {
                const next = new Set(current);

                if (next.has(chapter.id)) {
                    next.delete(chapter.id);
                } else {
                    next.add(chapter.id);
                }

                return next;
            });

            return;
        }

        const chapterTopicIds = chapter.topics.map((topic) => topic.id);
        const allSelected = chapterTopicIds.every((id) =>
            localTopicIds.has(id),
        );

        setLocalTopicIds((current) => {
            const next = new Set(current);

            chapterTopicIds.forEach((id) => {
                if (allSelected) {
                    next.delete(id);
                } else {
                    next.add(id);
                }
            });

            return next;
        });
    }

    function toggleTopic(topicId: number) {
        setLocalTopicIds((current) => {
            const next = new Set(current);

            if (next.has(topicId)) {
                next.delete(topicId);
            } else {
                next.add(topicId);
            }

            return next;
        });
    }

    function toggleQuestion(questionId: number) {
        setSelectedQuestionIds((current) => {
            if (current.includes(questionId)) {
                return current.filter((id) => id !== questionId);
            }

            if (current.length >= totalNumber) {
                return current;
            }

            return [...current, questionId];
        });
    }

    async function searchQuestions() {
        if (!selectedType || !canSearch) {
            return [] as ManualQuestion[];
        }

        setLoadingQuestions(true);
        setQuestionLoadError(null);
        setSubmitError(null);

        try {
            const questions = await onSearchQuestions(
                selectedType.questionTypeId,
                {
                    chapterIds: modalChapterIds,
                    topicIds: modalTopicIds,
                    sources: selectedSources,
                },
            );

            setResultQuestions(questions);
            setHasSearched(true);
            setActiveTab('show');

            return questions;
        } catch (error) {
            setQuestionLoadError(
                error instanceof Error
                    ? error.message
                    : 'Unable to load questions.',
            );
            setResultQuestions([]);
            setHasSearched(true);

            return [];
        } finally {
            setLoadingQuestions(false);
        }
    }

    async function selectRandomQuestions() {
        const questions = hasSearched
            ? filteredQuestions
            : await searchQuestions();
        const candidates = questions.filter(
            (question) => !usedQuestionIds.has(question.id),
        );
        const targetCount = Math.min(totalNumber, candidates.length);

        if (targetCount <= 0) {
            setSubmitError(
                'No matching unused questions are available for these filters.',
            );

            return;
        }

        const picked = shuffledQuestions(candidates).slice(0, targetCount);

        setTotalQuestions(String(targetCount));
        setRequiredQuestions((current) =>
            boundedQuestionCount(current, targetCount),
        );
        setSelectedQuestionIds(picked.map((question) => question.id));
        setActiveTab('picked');
        setSubmitError(null);
    }

    async function handleSubmit() {
        if (!selectedType || !canSubmit) {
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        try {
            await onSubmit({
                questionTypeId: selectedType.questionTypeId,
                requiredQuestions: requiredNumber,
                totalQuestions: totalNumber,
                marksEach: marksNumber,
                selectedQuestions,
                poolQuestions: resultQuestions,
            });
        } catch (error) {
            setSubmitError(
                error instanceof Error
                    ? error.message
                    : 'Unable to add section.',
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div
            role="presentation"
            onMouseDown={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3"
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-paper-section-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="flex h-[min(46rem,calc(100vh-1.5rem))] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="border-b border-slate-200 p-4 dark:border-slate-800">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <h2
                                id="add-paper-section-title"
                                className="text-base font-semibold text-slate-900 dark:text-slate-100"
                            >
                                Add section
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close add section"
                            className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                            <XIcon className="size-4" />
                        </button>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-[1.55fr_1.25fr_.75fr_.75fr_.75fr_auto]">
                        <FloatingCombobox
                            label="Type"
                            leadingIcon={FileTextIcon}
                            options={typeOptions}
                            value={selectedTypeOption}
                            onChange={(option) =>
                                setQuestionTypeId(
                                    option ? String(option.id) : '',
                                )
                            }
                            disabled={questionTypes.length === 0}
                            disabledHint="No question types available"
                        />

                        <FloatingCombobox
                            label="Source"
                            leadingIcon={LayersIcon}
                            options={sourceComboboxOptions}
                            value={selectedSourceOption}
                            onChange={(option) =>
                                setSourceValue(
                                    option ? String(option.id) : '__all__',
                                )
                            }
                        />

                        <FloatingField label="Choice">
                            <input autoComplete="off"
                                type="number"
                                min={1}
                                max={availableQuestionLimit || undefined}
                                value={totalQuestions}
                                onChange={(event) =>
                                    updateTotalQuestions(event.target.value)
                                }
                                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 pt-2 text-sm font-medium text-slate-900 transition-colors outline-none hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:border-brand-400 dark:focus:ring-brand-400/15"
                            />
                        </FloatingField>

                        <FloatingField label="Required">
                            <input autoComplete="off"
                                type="number"
                                min={1}
                                max={totalNumber || undefined}
                                value={requiredQuestions}
                                onChange={(event) =>
                                    updateRequiredQuestions(event.target.value)
                                }
                                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 pt-2 text-sm font-medium text-slate-900 transition-colors outline-none hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:border-brand-400 dark:focus:ring-brand-400/15"
                            />
                        </FloatingField>

                        <FloatingField label="Marks">
                            <input autoComplete="off"
                                type="number"
                                min={1}
                                value={marksEach}
                                onChange={(event) =>
                                    setMarksEach(onlyDigits(event.target.value))
                                }
                                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 pt-2 text-sm font-medium text-slate-900 transition-colors outline-none hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:border-brand-400 dark:focus:ring-brand-400/15"
                            />
                        </FloatingField>

                        <button
                            type="button"
                            disabled={!canSearch}
                            onClick={searchQuestions}
                            className={cn(
                                'inline-flex h-12 cursor-pointer items-center justify-center gap-2 self-end rounded-xl px-5 text-sm font-semibold transition-colors',
                                canSearch
                                    ? 'bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400'
                                    : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
                            )}
                        >
                            {loadingQuestions ? (
                                <Loader2Icon className="size-4 animate-spin" />
                            ) : (
                                <SearchIcon className="size-4" />
                            )}
                            Search
                        </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <AddSectionTabButton
                            active={activeTab === 'show'}
                            onClick={() => setActiveTab('show')}
                        >
                            Show {hasSearched ? filteredQuestions.length : 0}
                        </AddSectionTabButton>
                        <AddSectionTabButton
                            active={activeTab === 'picked'}
                            onClick={() => setActiveTab('picked')}
                        >
                            Picked Q.{selectedQuestionIds.length}
                        </AddSectionTabButton>
                        <AddSectionTabButton
                            active={activeTab === 'chapters'}
                            onClick={() => setActiveTab('chapters')}
                        >
                            Chapters &amp; topics
                        </AddSectionTabButton>
                        <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                            Marks ({requiredNumber}=
                            {requiredNumber * marksNumber})
                        </span>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-4 dark:bg-slate-950/30">
                    {activeTab === 'show' && (
                        <QuestionResultPanel
                            hasSearched={hasSearched}
                            loading={loadingQuestions}
                            error={questionLoadError}
                            groups={questionsByChapter}
                            selectedQuestionIds={selectedQuestionIds}
                            selectedLimit={totalNumber}
                            onToggleQuestion={toggleQuestion}
                        />
                    )}

                    {activeTab === 'picked' && (
                        <QuestionPickedPanel
                            questions={selectedQuestions}
                            selectedLimit={totalNumber}
                            onToggleQuestion={toggleQuestion}
                        />
                    )}

                    {activeTab === 'chapters' && (
                        <ChapterTopicFilterPanel
                            chapters={chapters}
                            localChapterIds={localChapterIds}
                            localTopicIds={localTopicIds}
                            onToggleChapter={toggleChapter}
                            onToggleTopic={toggleTopic}
                        />
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-sm font-medium text-red-600 dark:text-red-300">
                        {submitError}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            disabled={!canSearch || totalNumber <= 0}
                            onClick={selectRandomQuestions}
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200"
                        >
                            <SparklesIcon className="size-4" />
                            Select randomly
                        </button>
                        <button
                            type="button"
                            disabled={!canSubmit}
                            onClick={handleSubmit}
                            className={cn(
                                'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                                canSubmit
                                    ? 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400'
                                    : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
                            )}
                        >
                            {submitting && (
                                <Loader2Icon className="size-4 animate-spin" />
                            )}
                            Add to paper
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

function FloatingField({
    children,
    label,
}: {
    children: ReactNode;
    label: string;
}) {
    return (
        <label className="group/field relative block">
            <span className="pointer-events-none absolute -top-2 left-3 z-10 bg-white px-1 text-[11px] font-medium text-slate-600 transition-colors group-focus-within/field:text-brand-600 dark:bg-slate-900 dark:text-slate-300 dark:group-focus-within/field:text-brand-400">
                {label}
            </span>
            {children}
        </label>
    );
}

function AddSectionTabButton({
    active,
    children,
    onClick,
}: {
    active: boolean;
    children: ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'relative inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors',
                active
                    ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500 dark:text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
        >
            {children}
        </button>
    );
}

function QuestionResultPanel({
    hasSearched,
    loading,
    error,
    groups,
    selectedQuestionIds,
    selectedLimit,
    onToggleQuestion,
}: {
    hasSearched: boolean;
    loading: boolean;
    error: string | null;
    groups: Array<[string, ManualQuestion[]]>;
    selectedQuestionIds: number[];
    selectedLimit: number;
    onToggleQuestion: (questionId: number) => void;
}) {
    if (loading) {
        return (
            <EmptyQuestionState
                icon={<Loader2Icon className="size-8 animate-spin" />}
                title="Loading questions"
            />
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {error}
            </div>
        );
    }

    if (!hasSearched) {
        return (
            <EmptyQuestionState
                icon={<SearchIcon className="size-8" />}
                title="Adjust filters and search to see records."
            />
        );
    }

    if (groups.length === 0) {
        return (
            <EmptyQuestionState
                icon={<SearchXIcon className="size-8" />}
                title="No questions found for these filters."
            />
        );
    }

    return (
        <div className="space-y-4">
            {groups.map(([chapterLabel, questions]) => (
                <section
                    key={chapterLabel}
                    className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                >
                    <div className="mb-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-950/60">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {chapterLabel}
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {questions.map((question) => (
                            <QuestionSearchRow
                                key={question.id}
                                question={question}
                                checked={selectedQuestionIds.includes(
                                    question.id,
                                )}
                                disabled={
                                    !selectedQuestionIds.includes(
                                        question.id,
                                    ) &&
                                    selectedQuestionIds.length >= selectedLimit
                                }
                                onToggle={() => onToggleQuestion(question.id)}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

function QuestionPickedPanel({
    questions,
    selectedLimit,
    onToggleQuestion,
}: {
    questions: ManualQuestion[];
    selectedLimit: number;
    onToggleQuestion: (questionId: number) => void;
}) {
    if (questions.length === 0) {
        return (
            <EmptyQuestionState
                icon={<ListChecksIcon className="size-8" />}
                title={`Pick ${selectedLimit || 0} questions to add this section.`}
            />
        );
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-brand-50 px-4 py-3 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                <h3 className="text-sm font-semibold">Picked questions</h3>
                <span className="text-sm font-bold">
                    {questions.length}/{selectedLimit}
                </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {questions.map((question) => (
                    <QuestionSearchRow
                        key={question.id}
                        question={question}
                        checked
                        disabled={false}
                        onToggle={() => onToggleQuestion(question.id)}
                    />
                ))}
            </div>
        </div>
    );
}

function QuestionSearchRow({
    checked,
    disabled,
    question,
    onToggle,
}: {
    checked: boolean;
    disabled: boolean;
    question: ManualQuestion;
    onToggle: () => void;
}) {
    const options = paperOptionsFromManual(question);

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onToggle}
            className={cn(
                'block w-full cursor-pointer px-4 py-3 text-left transition-colors',
                checked
                    ? 'bg-brand-50/70 dark:bg-brand-500/10'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-950/60',
                disabled && 'cursor-not-allowed opacity-50',
            )}
        >
            <div className="flex items-start gap-3">
                <span
                    className={cn(
                        'mt-1 flex size-4 shrink-0 items-center justify-center rounded-[5px] border',
                        checked
                            ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-white'
                            : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900',
                    )}
                >
                    {checked && (
                        <CheckIcon className="size-3" strokeWidth={3} />
                    )}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {manualQuestionDisplayText(question)}
                    </span>
                    {options.length > 0 && (
                        <span className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 xl:grid-cols-4 dark:text-slate-300">
                            {options.map((option) => (
                                <span key={option.id}>
                                    {plainQuestionText(option.text)}
                                </span>
                            ))}
                        </span>
                    )}
                    <span className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                            {question.sourceLabel ??
                                question.source ??
                                'No source'}
                        </span>
                    </span>
                </span>
            </div>
        </button>
    );
}

function ChapterTopicFilterPanel({
    chapters,
    localChapterIds,
    localTopicIds,
    onToggleChapter,
    onToggleTopic,
}: {
    chapters: Chapter[];
    localChapterIds: Set<number>;
    localTopicIds: Set<number>;
    onToggleChapter: (chapter: Chapter) => void;
    onToggleTopic: (topicId: number) => void;
}) {
    if (chapters.length === 0) {
        return (
            <EmptyQuestionState
                icon={<SearchXIcon className="size-8" />}
                title="No chapters available."
            />
        );
    }

    return (
        <div className="grid gap-3 lg:grid-cols-2">
            {chapters.map((chapter) => {
                const chapterTopicIds = chapter.topics.map((topic) => topic.id);
                const checked =
                    chapter.topics.length === 0
                        ? localChapterIds.has(chapter.id)
                        : chapterTopicIds.length > 0 &&
                        chapterTopicIds.every((id) => localTopicIds.has(id));
                const partial =
                    chapter.topics.length > 0 &&
                    !checked &&
                    chapterTopicIds.some((id) => localTopicIds.has(id));

                return (
                    <section
                        key={chapter.id}
                        className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                    >
                        <button
                            type="button"
                            onClick={() => onToggleChapter(chapter)}
                            className="flex w-full cursor-pointer items-center gap-3 text-left"
                        >
                            <span
                                className={cn(
                                    'flex size-4 shrink-0 items-center justify-center rounded-[5px] border',
                                    checked || partial
                                        ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-white'
                                        : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900',
                                )}
                            >
                                {(checked || partial) && (
                                    <CheckIcon
                                        className="size-3"
                                        strokeWidth={3}
                                    />
                                )}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {chapter.chapter_number !== null &&
                                        `CH ${String(chapter.chapter_number).padStart(2, '0')} `}
                                    {chapter.name}
                                </span>
                                {chapter.topics.length > 0 && (
                                    <span className="mt-0.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                                        {
                                            chapter.topics.filter((topic) =>
                                                localTopicIds.has(topic.id),
                                            ).length
                                        }{' '}
                                        selected
                                    </span>
                                )}
                            </span>
                        </button>

                        {chapter.topics.length > 0 && (
                            <div className="mt-3 grid gap-2 pl-7">
                                {chapter.topics.map((topic) => {
                                    const topicChecked = localTopicIds.has(
                                        topic.id,
                                    );

                                    return (
                                        <button
                                            key={topic.id}
                                            type="button"
                                            onClick={() =>
                                                onToggleTopic(topic.id)
                                            }
                                            className="flex cursor-pointer items-center gap-2 text-left text-sm text-slate-700 transition-colors hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300"
                                        >
                                            <span
                                                className={cn(
                                                    'flex size-4 shrink-0 items-center justify-center rounded-[5px] border',
                                                    topicChecked
                                                        ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-white'
                                                        : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900',
                                                )}
                                            >
                                                {topicChecked && (
                                                    <CheckIcon
                                                        className="size-3"
                                                        strokeWidth={3}
                                                    />
                                                )}
                                            </span>
                                            {topic.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                );
            })}
        </div>
    );
}

function EmptyQuestionState({
    icon,
    title,
}: {
    icon: ReactNode;
    title: string;
}) {
    return (
        <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
            <div className="mb-3">{icon}</div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {title}
            </p>
        </div>
    );
}

function GeneratedPaperView({
    paper,
    rawPaper,
    activeSetIndex,
    numSets,
    viewMode,
    onActiveSetChange,
    onNumSetsChange,
    onViewModeChange,
    printAllSets,
    onPrintAllSets,
    totalMarks,
    defaultWatermarkLogoUrl,
    schoolAddress,
    showSchoolAddress,
    pickerTarget,
    pickerQuestions,
    pickerSearch,
    usedQuestionIds,
    savedPaperId,
    isDraft,
    isDirty,
    isSavingPaper,
    isSavingDraft,
    onOpenSavePaperModal,
    onOpenSaveAsTemplate,
    onSaveDraft,
    onGoBack,
    onSaveDraftAndBack,
    onDiscardAndBack,
    onHeaderChange,
    settings,
    onSettingsChange,
    onAddSection,
    onEditSection,
    onDeleteSection,
    onMoveSection,
    onShuffleQuestions,
    onEditQuestion,
    onQuestionImageSizeChange,
    onQuestionAnswerLinesChange,
    onQuestionAnswerLineSpacingChange,
    onRandomQuestion,
    onPickQuestion,
    onAddRandomQuestion,
    onAddCustomQuestion,
    onRemoveQuestion,
    onColumnsChange,
    onPickerSearchChange,
    onPickerSelect,
    onPickerClose,
}: {
    paper: GeneratedPaper;
    rawPaper: GeneratedPaper;
    activeSetIndex: number;
    numSets: number;
    viewMode: 'paper' | 'answer_key';
    onActiveSetChange: (index: number) => void;
    onNumSetsChange: (count: number) => void;
    onViewModeChange: (mode: 'paper' | 'answer_key') => void;
    printAllSets: boolean;
    onPrintAllSets: () => void;
    totalMarks: number;
    defaultWatermarkLogoUrl: string;
    schoolAddress: string;
    showSchoolAddress: boolean;
    pickerTarget: {
        section: GeneratedPaperSection;
        question: GeneratedPaperQuestion;
    } | null;
    pickerQuestions: ManualQuestion[];
    pickerSearch: string;
    usedQuestionIds: Set<number>;
    savedPaperId: number | null;
    isDraft: boolean;
    isDirty: boolean;
    isSavingPaper: boolean;
    isSavingDraft: boolean;
    onOpenSavePaperModal: () => void;
    onOpenSaveAsTemplate: () => void;
    onSaveDraft: () => void;
    onGoBack: () => void;
    onSaveDraftAndBack: () => void;
    onDiscardAndBack: () => void;
    onHeaderChange: (field: keyof GeneratedPaperHeader, value: string) => void;
    settings: PaperSettings;
    onSettingsChange: (patch: Partial<PaperSettings>) => void;
    onAddSection: () => void;
    onEditSection: (sectionId: string) => void;
    onDeleteSection: (sectionId: string) => void;
    onMoveSection: (sectionId: string, direction: -1 | 1) => void;
    onShuffleQuestions: (sectionId: string) => void;
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
    onQuestionAnswerLineSpacingChange: (
        sectionId: string,
        questionId: string,
        value: number,
    ) => void;
    onRandomQuestion: (sectionId: string, questionId: string) => void;
    onPickQuestion: (sectionId: string, questionId: string) => void;
    onAddRandomQuestion: (sectionId: string) => void;
    onAddCustomQuestion: (sectionId: string) => void;
    onRemoveQuestion: (sectionId: string, questionId: string) => void;
    onColumnsChange: (sectionId: string, value: number) => void;
    onPickerSearchChange: (value: string) => void;
    onPickerSelect: (question: ManualQuestion) => void;
    onPickerClose: () => void;
}) {
    const [isConfirmingBack, setIsConfirmingBack] = useState(false);
    const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);

    // Compose a per-character font-family cascade — Latin glyphs get the
    // English font, Urdu glyphs fall through to the Urdu font automatically.
    const englishStack: Record<string, string> = {
        sans: '"Montserrat", system-ui, -apple-system, sans-serif',
        serif: 'Cambria, Georgia, "Times New Roman", serif',
        mono: 'ui-monospace, "Cascadia Code", Consolas, "Liberation Mono", monospace',
    };
    const urduStack: Record<string, string> = {
        'jameel-noori':
            '"Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", "Urdu Typesetting", serif',
        'noto-nastaliq':
            '"Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", "Urdu Typesetting", serif',
        'mehr-nastaliq':
            '"Mehr Nastaliq Web", "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif',
    };
    const pageDims = getPageDimensions(
        settings.paperSize,
        settings.orientation,
    );
    const paperShellStyle = {
        fontFamily: `${englishStack[settings.englishFont]}, ${urduStack[settings.urduFont]}`,
        color: settings.textColor,
        width: `${pageDims.width}mm`,
        minHeight: `${pageDims.height}mm`,
        paddingTop: `${settings.marginTop}mm`,
        paddingRight: `${settings.marginRight}mm`,
        paddingBottom: `${settings.marginBottom}mm`,
        paddingLeft: `${settings.marginLeft}mm`,
        '--paper-header-size': `${settings.headerSize}px`,
        '--paper-header-line-height': settings.headerLineHeight,
        '--paper-heading-size': `${settings.headingSize}px`,
        '--paper-heading-line-height': settings.headingLineHeight,
        '--paper-question-size': `${settings.questionSize}px`,
        '--paper-question-line-height': settings.questionLineHeight,
        '--paper-header-border-width': `${settings.headerBorderWidth}px`,
        '--paper-header-border-style': settings.headerBorderStyle,
        '--paper-heading-border-width': `${settings.headingBorderWidth}px`,
        '--paper-heading-border-style': settings.headingBorderStyle,
        '--paper-question-border-width': `${settings.questionBorderWidth}px`,
        '--paper-question-border-style': settings.questionBorderStyle,
    } as React.CSSProperties;

    // ── Print-time @page rules ────────────────────────────────────────────
    // React 19 hoists this <style> to <head>, so it wins over the print
    // fallback in app.css whenever a paper is on screen.
    const pageNumberContent = (() => {
        if (!settings.pageNumbersEnabled) {
            return null;
        }

        if (settings.pageNumberFormat === 'n-of-m') {
            return '"" counter(page) " of " counter(pages)';
        }

        if (settings.pageNumberFormat === 'page-n') {
            return '"Page " counter(page)';
        }

        return 'counter(page)';
    })();
    const pageNumberSlot = (() => {
        if (settings.pageNumberPosition === 'header-right') {
            return '@top-right';
        }

        if (settings.pageNumberPosition === 'footer-right') {
            return '@bottom-right';
        }

        return '@bottom-center';
    })();
    const pageRule = [
        `@page { size: ${pageDims.width}mm ${pageDims.height}mm; margin: ${settings.marginTop}mm ${settings.marginRight}mm ${settings.marginBottom}mm ${settings.marginLeft}mm;`,
        pageNumberContent
            ? `${pageNumberSlot} { content: ${pageNumberContent}; font-size: 10pt; }`
            : '',
        '}',
    ].join(' ');

    const watermarkOpacity =
        Math.max(0, Math.min(100, settings.watermarkOpacity)) / 100;
    const activeWatermarkLogoUrl =
        settings.watermarkLogoUrl.trim() || defaultWatermarkLogoUrl;
    const shouldShowTextWatermark =
        settings.watermarkType === 'text' &&
        settings.watermarkText.trim() !== '';
    const shouldShowLogoWatermark =
        settings.watermarkType === 'logo' && activeWatermarkLogoUrl !== '';

    function handleBackClick() {
        if (savedPaperId !== null && !isDirty) {
            onGoBack();
        } else {
            setIsConfirmingBack(true);
        }
    }

    return (
        <>
            <div data-paper-shell className="w-full space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/papers"
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                        >
                            <BookmarkIcon className="size-4" />
                            My Papers
                        </Link>
                        <button
                            type="button"
                            onClick={onAddSection}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                        >
                            <PlusIcon className="size-4" />
                            Add Section
                        </button>
                        <div className="inline-flex rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                            <button
                                type="button"
                                onClick={() => onViewModeChange('paper')}
                                className={cn(
                                    'inline-flex cursor-pointer items-center gap-1.5 rounded-l-lg px-3 py-2 text-sm font-medium transition-colors',
                                    viewMode === 'paper'
                                        ? 'bg-brand-600 text-white'
                                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
                                )}
                            >
                                <FileTextIcon className="size-4" />
                                Paper
                            </button>
                            <button
                                type="button"
                                onClick={() => onViewModeChange('answer_key')}
                                className={cn(
                                    'inline-flex cursor-pointer items-center gap-1.5 rounded-r-lg px-3 py-2 text-sm font-medium transition-colors',
                                    viewMode === 'answer_key'
                                        ? 'bg-brand-600 text-white'
                                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
                                )}
                            >
                                <KeyRoundIcon className="size-4" />
                                Answer Key
                            </button>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
                            <ShuffleIcon className="size-4 text-slate-400" />
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Sets
                            </span>
                            <select
                                value={numSets}
                                onChange={(e) => {
                                    const next = Number(e.target.value);
                                    onNumSetsChange(next);

                                    if (activeSetIndex >= next) {
onActiveSetChange(next - 1);
}
                                }}
                                className="cursor-pointer border-none bg-transparent text-sm font-semibold text-slate-700 outline-none dark:text-slate-200"
                            >
                                {[1, 2, 3].map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                            {numSets > 1 && (
                                <div className="flex items-center gap-0.5 border-l border-slate-200 pl-2 dark:border-slate-800">
                                    {SET_LABELS.slice(0, numSets).map((label, index) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => onActiveSetChange(index)}
                                            className={cn(
                                                'inline-flex size-6 items-center justify-center rounded text-xs font-bold transition-colors',
                                                activeSetIndex === index
                                                    ? 'bg-brand-600 text-white'
                                                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
                                            )}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {isDraft && savedPaperId !== null && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                                <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                                Draft
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onSaveDraft}
                            disabled={isSavingDraft || isSavingPaper}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                        >
                            {isSavingDraft ? (
                                <>
                                    <Loader2Icon className="size-4 animate-spin" />
                                    Saving…
                                </>
                            ) : (
                                <>
                                    <BookmarkIcon className="size-4" />
                                    Save as Draft
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onOpenSavePaperModal}
                            disabled={isSavingPaper || isSavingDraft}
                            className={cn(
                                'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                                savedPaperId !== null && !isDirty
                                    ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400'
                                    : savedPaperId !== null && isDirty
                                        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
                            )}
                        >
                            {isSavingPaper ? (
                                <>
                                    <Loader2Icon className="size-4 animate-spin" />
                                    Saving…
                                </>
                            ) : savedPaperId !== null && !isDirty ? (
                                <>
                                    <CheckIcon className="size-4" />
                                    Saved
                                </>
                            ) : savedPaperId !== null && isDirty ? (
                                <>
                                    <SaveIcon className="size-4" />
                                    Save Paper
                                    <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                                </>
                            ) : (
                                <>
                                    <SaveIcon className="size-4" />
                                    Save Paper
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onOpenSaveAsTemplate}
                            title="Save as template"
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            <LayoutTemplateIcon className="size-4" />
                            Save as Template
                        </button>
                        <button
                            type="button"
                            onClick={() => (numSets > 1 ? onPrintAllSets() : window.print())}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:text-white"
                        >
                            <PrinterIcon className="size-4" />
                            {numSets > 1 ? `Print ${numSets} Sets` : 'Print'}
                        </button>
                    </div>
                </div>

                <style>{pageRule}</style>
                {/* Print-only repeat-header rule. With `position: fixed`,
                    Chromium-based browsers re-paint the element at the top of
                    every printed page. The padding-top on main keeps the
                    first-page content from sliding under the fixed header. */}
                {settings.repeatHeaderOnEachPage && (
                    <style>{`@media print {
                        [data-paper-header-frame] {
                            position: fixed;
                            top: 0;
                            left: ${settings.marginLeft}mm;
                            right: ${settings.marginRight}mm;
                            background: #fff;
                            z-index: 10;
                        }
                    }`}</style>
                )}
                <main
                    data-print-paper
                    style={paperShellStyle}
                    className="relative mx-auto overflow-hidden bg-white shadow-sm shadow-slate-900/10 print:overflow-visible print:shadow-none"
                >
                    {/* Watermark — sits behind everything; hidden when inactive. */}
                    {(shouldShowTextWatermark || shouldShowLogoWatermark) && (
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
                            style={{
                                opacity: watermarkOpacity,
                            }}
                        >
                            {shouldShowTextWatermark ? (
                                <span
                                    className="text-center font-bold uppercase select-none"
                                    style={{
                                        fontSize: '5.5rem',
                                        transform: 'rotate(-30deg)',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {settings.watermarkText}
                                </span>
                            ) : (
                                <img
                                    src={activeWatermarkLogoUrl}
                                    alt=""
                                    draggable={false}
                                    className="max-h-[45%] max-w-[45%] object-contain select-none"
                                />
                            )}
                        </div>
                    )}
                    <div className="relative z-10">
                        <PaperHeader
                            template={settings.headerTemplate}
                            header={{
                                ...paper.header,
                                marks: totalMarks,
                                type:
                                    viewMode === 'answer_key'
                                        ? `Answer Key${numSets > 1 ? ` — Set ${setLabelFor(activeSetIndex)}` : ''}`
                                        : paper.header.type,
                            }}
                            logoUrl={defaultWatermarkLogoUrl}
                            address={schoolAddress}
                            showAddress={showSchoolAddress}
                            onChange={
                                viewMode === 'answer_key'
                                    ? () => { }
                                    : onHeaderChange
                            }
                        />
                        <div
                            className="flex flex-col"
                            style={{
                                marginTop: `${settings.sectionSpacing}mm`,
                                gap: `${settings.sectionSpacing}mm`,
                            }}
                        >
                            {viewMode === 'answer_key' ? (
                                <AnswerKeySheet
                                    paper={paper}
                                    setIndex={activeSetIndex}
                                    settings={settings}
                                    style={{}}
                                />
                            ) : (
                                paper.sections.map((section, sectionIndex) => {
                                    const Template = pickSectionTemplate(
                                        settings.questionLayout,
                                        section.category,
                                    );

                                    return (
                                        <Template
                                            key={section.id}
                                            section={section}
                                            index={sectionIndex}
                                            numberingFormat={
                                                settings.questionNumberingFormat
                                            }
                                            canMoveUp={sectionIndex > 0}
                                            canMoveDown={
                                                sectionIndex <
                                                paper.sections.length - 1
                                            }
                                            onEditSection={onEditSection}
                                            onDeleteSection={onDeleteSection}
                                            onMoveUp={(sectionId) =>
                                                onMoveSection(sectionId, -1)
                                            }
                                            onMoveDown={(sectionId) =>
                                                onMoveSection(sectionId, 1)
                                            }
                                            onShuffleQuestions={
                                                onShuffleQuestions
                                            }
                                            onAddRandomQuestion={
                                                onAddRandomQuestion
                                            }
                                            onAddCustomQuestion={
                                                onAddCustomQuestion
                                            }
                                            onEditQuestion={onEditQuestion}
                                            onRandomQuestion={onRandomQuestion}
                                            onPickQuestion={onPickQuestion}
                                            onRemoveQuestion={onRemoveQuestion}
                                            onAnswerLinesChange={
                                                onQuestionAnswerLinesChange
                                            }
                                            onAnswerLineSpacingChange={
                                                onQuestionAnswerLineSpacingChange
                                            }
                                            onQuestionImageSizeChange={
                                                onQuestionImageSizeChange
                                            }
                                            onColumnsChange={onColumnsChange}
                                        />
                                    );
                                })
                            )}
                        </div>
                    </div>
                </main>

                {printAllSets && numSets > 1 && (
                    <div className="hidden print:block">
                        {Array.from({ length: numSets }).map((_, index) => {
                            if (index === activeSetIndex) {
return null;
}

                            const variantPaper = variantForSet(rawPaper, index);

                            return (
                                <main
                                    key={`variant-${index}`}
                                    data-print-paper
                                    style={{ ...paperShellStyle, breakBefore: 'page' }}
                                    className="relative mx-auto overflow-hidden bg-white print:overflow-visible print:shadow-none"
                                >
                                    <div className="relative z-10">
                                        <PaperHeader
                                            template={settings.headerTemplate}
                                            header={{
                                                ...variantPaper.header,
                                                marks: totalMarks,
                                                type:
                                                    viewMode === 'answer_key'
                                                        ? `Answer Key — Set ${setLabelFor(index)}`
                                                        : variantPaper.header
                                                            .type
                                                            ? `Set ${setLabelFor(index)} · ${variantPaper.header.type}`
                                                            : `Set ${setLabelFor(index)}`,
                                            }}
                                            logoUrl={defaultWatermarkLogoUrl}
                                            address={schoolAddress}
                                            showAddress={showSchoolAddress}
                                            onChange={() => { }}
                                        />
                                        <div
                                            className="flex flex-col"
                                            style={{
                                                marginTop: `${settings.sectionSpacing}mm`,
                                                gap: `${settings.sectionSpacing}mm`,
                                            }}
                                        >
                                            {viewMode === 'answer_key' ? (
                                                <AnswerKeySheet
                                                    paper={variantPaper}
                                                    setIndex={index}
                                                    settings={settings}
                                                    style={{}}
                                                />
                                            ) : (
                                                variantPaper.sections.map((section, sectionIndex) => {
                                                    const Template = pickSectionTemplate(
                                                        settings.questionLayout,
                                                        section.category,
                                                    );

                                                    return (
                                                        <Template
                                                            key={section.id}
                                                            section={section}
                                                            index={sectionIndex}
                                                            numberingFormat={settings.questionNumberingFormat}
                                                            canMoveUp={false}
                                                            canMoveDown={false}
                                                            onEditSection={() => { }}
                                                            onDeleteSection={() => { }}
                                                            onMoveUp={() => { }}
                                                            onMoveDown={() => { }}
                                                            onShuffleQuestions={() => { }}
                                                            onAddRandomQuestion={() => { }}
                                                            onAddCustomQuestion={() => { }}
                                                            onEditQuestion={() => { }}
                                                            onRandomQuestion={() => { }}
                                                            onPickQuestion={() => { }}
                                                            onRemoveQuestion={() => { }}
                                                            onAnswerLinesChange={() => { }}
                                                            onAnswerLineSpacingChange={() => { }}
                                                            onQuestionImageSizeChange={() => { }}
                                                            onColumnsChange={() => { }}
                                                        />
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </main>
                            );
                        })}
                    </div>
                )}

                <div className="flex justify-end gap-2 print:hidden">
                    <button
                        type="button"
                        onClick={handleBackClick}
                        disabled={isSavingDraft}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                        {isSavingDraft && (
                            <Loader2Icon className="size-4 animate-spin" />
                        )}
                        {isSavingDraft ? 'Saving Draft…' : 'Back'}
                    </button>
                </div>

                {isConfirmingBack && (
                    <GoBackDialog
                        onSaveDraft={() => {
                            setIsConfirmingBack(false);
                            onSaveDraftAndBack();
                        }}
                        onDiscard={() => {
                            setIsConfirmingBack(false);
                            onDiscardAndBack();
                        }}
                        onCancel={() => setIsConfirmingBack(false)}
                    />
                )}
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

            {/* Floating right-edge gear → opens the live paper settings drawer. */}
            <button
                type="button"
                onClick={() => setIsSettingsDrawerOpen(true)}
                aria-label="Open paper settings"
                title="Paper settings"
                className="fixed top-1/2 right-3 z-30 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-lg shadow-slate-900/10 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-300 print:hidden"
            >
                <SettingsIcon className="size-5" />
            </button>

            <PaperSettingsDrawer
                open={isSettingsDrawerOpen}
                settings={settings}
                defaultWatermarkLogoUrl={defaultWatermarkLogoUrl}
                onChange={onSettingsChange}
                onClose={() => setIsSettingsDrawerOpen(false)}
            />
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
    const [pendingReplacement, setPendingReplacement] =
        useState<ManualQuestion | null>(null);

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
                        <input autoComplete="off"
                            type="search"
                            value={search}
                            onChange={(event) =>
                                onSearchChange(event.target.value)
                            }
                            placeholder="Search questions"
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 transition-colors outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-brand-400"
                        />
                    </label>
                </div>

                {pendingReplacement && (
                    <ConfirmDialog
                        variant="warning"
                        title="Replace Question"
                        message="Are you sure you want to replace this question with the selected one?"
                        confirmLabel="Replace"
                        onConfirm={() => {
                            onSelect(pendingReplacement);
                            setPendingReplacement(null);
                        }}
                        onCancel={() => setPendingReplacement(null)}
                    />
                )}

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
                                disabled={isUsed || isCurrent}
                                onClick={() => setPendingReplacement(question)}
                                className={cn(
                                    'flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                                    isCurrent
                                        ? 'border-brand-300 bg-brand-50/60 dark:border-brand-500/40 dark:bg-brand-500/10'
                                        : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/30 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5',
                                    isUsed && 'cursor-not-allowed opacity-50',
                                )}
                            >
                                <span
                                    className={cn(
                                        'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[5px] border',
                                        isCurrent
                                            ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-white'
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
                                        {manualQuestionDisplayText(question)}
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

function BilingualPickerName({
    english,
    urdu,
    medium,
    className,
}: {
    english?: string | null;
    urdu?: string | null;
    medium: ContentMedium;
    className?: string;
}) {
    const englishName = (english ?? '').trim();
    const urduName = (urdu ?? '').trim();
    const englishValue = englishName || urduName;
    const urduValue = urduName || englishName;

    if (medium === 'Both' && englishName && urduName) {
        return (
            <span
                className={cn(
                    'flex min-w-0 flex-1 items-center justify-between gap-6',
                    className,
                )}
            >
                <span className="min-w-0 flex-1 truncate" title={englishName}>
                    {englishName}
                </span>
                <span
                    dir="rtl"
                    className="min-w-0 flex-1 truncate text-right"
                    title={urduName}
                >
                    {urduName}
                </span>
            </span>
        );
    }

    if (medium === 'Urdu') {
        return (
            <span
                dir="rtl"
                className={cn('min-w-0 flex-1 truncate text-right', className)}
                title={urduValue}
            >
                {urduValue}
            </span>
        );
    }

    return (
        <span
            className={cn('min-w-0 flex-1 truncate', className)}
            title={englishValue}
        >
            {englishValue}
        </span>
    );
}
function DirectChapterGroup({
    group,
    medium,
    state,
    selected,
    onToggleGroup,
    onToggleChapter,
}: {
    group: ChapterGroup;
    medium: ContentMedium;
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
                        medium={medium}
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
                'overflow-hidden rounded-xl border bg-white shadow-sm shadow-slate-900/[0.02] transition-all dark:bg-slate-900 dark:shadow-black/10',
                isActive
                    ? 'border-brand-300 ring-1 ring-brand-500/10 dark:border-brand-500/40 dark:ring-brand-400/10'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.04] dark:border-slate-800 dark:hover:border-slate-700 dark:hover:shadow-black/20',
            )}
        >
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 transition-colors dark:border-slate-800 dark:bg-slate-950/30">
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
                        medium={medium}
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
    medium,
    checked,
    onToggleChapter,
    standalone = false,
}: {
    chapter: Chapter;
    medium: ContentMedium;
    checked: boolean;
    onToggleChapter: (chapter: Chapter) => void;
    standalone?: boolean;
}) {
    return (
        <li
            className={cn(
                'flex min-h-11 items-center gap-3 bg-white px-4 py-2.5 transition-colors dark:bg-slate-900',
                standalone &&
                'rounded-xl border shadow-sm shadow-slate-900/[0.02] transition-all dark:border-slate-800 dark:shadow-black/10',
                standalone &&
                (checked
                    ? 'border-brand-300 ring-1 ring-brand-500/10 dark:border-brand-500/40 dark:ring-brand-400/10'
                    : 'border-slate-200'),
                checked
                    ? 'bg-brand-50/70 hover:bg-brand-100/70 dark:bg-brand-500/10 dark:hover:bg-brand-500/15'
                    : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/50',
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
                <BilingualPickerName
                    english={chapter.name_eng ?? chapter.name}
                    urdu={chapter.name_ur}
                    medium={medium}
                />
            </button>
        </li>
    );
}

function ChapterCard({
    chapter,
    medium,
    state,
    selectedTopics,
    onToggleChapter,
    onToggleTopic,
}: {
    chapter: Chapter;
    medium: ContentMedium;
    state: 'unchecked' | 'checked' | 'indeterminate';
    selectedTopics: Set<number>;
    onToggleChapter: () => void;
    onToggleTopic: (topicId: number) => void;
}) {
    const isActive = state !== 'unchecked';

    return (
        <div
            className={cn(
                'overflow-hidden rounded-xl border bg-white shadow-sm shadow-slate-900/[0.02] transition-all dark:shadow-black/10',
                isActive
                    ? 'border-brand-300 ring-1 ring-brand-500/10 dark:border-brand-500/40 dark:ring-brand-400/10'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.04] dark:border-slate-800 dark:hover:border-slate-700 dark:hover:shadow-black/20',
                'dark:bg-slate-900',
            )}
        >
            <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30">
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
                        <h3 className="flex min-w-0 flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                            <BilingualPickerName
                                english={chapter.name_eng ?? chapter.name}
                                urdu={chapter.name_ur}
                                medium={medium}
                            />
                        </h3>
                    </div>
                </div>
            </div>

            {chapter.topics.length > 0 ? (
                <ul className="divide-y divide-slate-100 px-2 py-1 dark:divide-slate-800">
                    {chapter.topics.map((topic) => {
                        const checked = selectedTopics.has(topic.id);

                        return (
                            <li
                                key={topic.id}
                                className={cn(
                                    'flex min-h-10 items-center gap-2.5 rounded-lg px-2 transition-colors',
                                    checked
                                        ? 'bg-brand-50/70 text-brand-700 hover:bg-brand-100/70 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/15'
                                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50',
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
                                    className="flex min-w-0 flex-1 cursor-pointer items-center text-left text-[13px]"
                                >
                                    <BilingualPickerName
                                        english={topic.name_eng ?? topic.name}
                                        urdu={topic.name_ur}
                                        medium={medium}
                                    />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : null}
        </div>
    );
}

function QuestionSelectionCard({
    section,
    autoPick,
    onAutoPickChange,
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
    autoPick: boolean;
    onAutoPickChange: (sectionId: string, enabled: boolean) => void;
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
                'rounded-xl border bg-white px-5 py-4 transition-colors dark:bg-slate-950/40',
                isDragging
                    ? 'border-slate-300 opacity-55 dark:border-slate-700'
                    : isDragTarget
                        ? 'border-brand-400 bg-brand-50/40 ring-2 ring-brand-500/10 dark:border-brand-500/60 dark:bg-brand-500/5'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.04] dark:border-slate-800 dark:hover:border-slate-700 dark:hover:shadow-black/20',
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
                        className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg bg-slate-50 text-brand-500 transition-colors hover:bg-brand-50 hover:text-brand-700 active:cursor-grabbing dark:bg-slate-800 dark:text-brand-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-200"
                    >
                        <GripVerticalIcon className="size-4" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {section.title}
                    </h4>
                    <span className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                        {section.availableCount} available
                    </span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <AutoPickSwitch
                        enabled={autoPick}
                        onChange={(enabled) =>
                            onAutoPickChange(section.id, enabled)
                        }
                    />
                    <button
                        type="button"
                        onClick={() => onAddRow(section.id)}
                        aria-label={'Add another ' + section.title + ' row'}
                        title={'Add another ' + section.title + ' row'}
                        className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 dark:border-brand-500/30 dark:bg-slate-900 dark:text-brand-200 dark:hover:bg-brand-500/10"
                    >
                        <PlusIcon className="size-3.5" />
                        Add row
                    </button>
                </div>
            </div>

            <div className="mt-4 space-y-4">
                {section.rows.map((row, index) => (
                    <div
                        key={row.id}
                        className="grid gap-2.5 border-t border-slate-100 pt-4 first:border-t-0 first:pt-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end dark:border-slate-800"
                    >
                        <NumberField
                            label="Choice"
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
                            {!autoPick && (
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
                                            ? 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200 dark:hover:bg-brand-500/20'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-500/30 dark:hover:text-brand-300',
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

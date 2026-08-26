import {
    Combobox,
    ComboboxButton,
    ComboboxOption,
    ComboboxOptions,
} from '@headlessui/react';

import { Head, usePage } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    BookmarkIcon,
    BookOpenIcon,
    ChevronDownIcon,
    CheckIcon,
    ClockIcon,
    FileTextIcon,
    GraduationCapIcon,
    GripVerticalIcon,
    KeyRoundIcon,
    LayersIcon,
    LayoutTemplateIcon,
    ListChecksIcon,
    Link2Icon,
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
import {
    SET_LABELS,
    setLabelFor,
    variantForSet,
} from './paper-layouts/paper-variant';
import { QuestionContent } from './paper-layouts/questions/question-content';
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
import { MultipartSection } from './paper-layouts/sections/multipart-section';
import { SectionEditModal } from './paper-layouts/sections/section-edit-modal';
import { pickSectionTemplate } from './paper-layouts/templates';
import {
    clampSectionColumns,
    DEFAULT_PAPER_SETTINGS,
    getPageDimensions,
    PAPER_URDU_FONT_METRICS,
    normalizePaperSettings,
    resolveOrGroupLabel,
} from './paper-layouts/types';
import type { PaperHeaderTemplate } from './paper-layouts/types';
import type {
    GeneratedPaper,
    GeneratedPaperHeader,
    GeneratedPaperQuestion,
    GeneratedPaperSection,
    PaperImageSize,
    PaperQuestionOption,
    PaperSettings,
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

function sectionHeadingNumber(
    sections: GeneratedPaperSection[],
    sectionIndex: number,
): number | null {
    const section = sections[sectionIndex];

    if (section.orRole === 'alternative') {
        return null;
    }

    if (section.category === 'Objective Questions') {
        return sections.findIndex(
            (candidate) =>
                candidate.category === 'Objective Questions' &&
                candidate.orRole !== 'alternative',
        ) === sectionIndex
            ? 1
            : null;
    }

    return (
        2 +
        sections
            .slice(0, sectionIndex)
            .filter(
                (candidate) =>
                    candidate.category === 'Subjective Questions' &&
                    candidate.orRole !== 'alternative',
            ).length
    );
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
            orPairingId?: number | null;
            orQuestionTypeId?: number | null;
            orGroupTypeIds?: number[] | null;
            orRole?: 'primary' | 'alternative' | null;
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
    /** Legacy two-way OR selections. Kept for old drafts/templates. */
    orSelectedQuestionIds?: number[];
    /** Selected question IDs keyed by each alternative question type. */
    orSelectedQuestionIdsByType?: Record<string, number[]>;
}

interface MultipartTypeOption {
    id: number;
    name: string;
    nameUrdu?: string | null;
    headingEnglish?: string | null;
    headingUrdu?: string | null;
}

interface MultipartConfig {
    id: number;
    maxParts: number;
    choiceCount: number;
    headingEnglish?: string | null;
    headingUrdu?: string | null;
    partTypes: MultipartTypeOption[];
}

interface MultipartPartRow {
    id: string;
    questionTypeId: number | null;
    choiceQuestions: string;
    requiredQuestions: string;
    marksPerQuestion: string;
    selectedQuestionIds: number[];
}

interface MultipartSelectionState {
    id: string;
    configId: number;
    rows: MultipartPartRow[];
    selectionMode: SelectionMode;
    /** Compatibility values retained until multipart generation is finalized. */
    partTypeIds: number[];
    questionCount: string;
    choiceCount: string;
    marksPerPart: string;
}
interface QuestionTypePairing {
    id: number;
    questionTypeIds: number[];
}

interface OrTypeOption {
    id: number;
    label: string;
    disabled?: boolean;
}

interface QuestionSelectionSection {
    id: string;
    questionTypeId: number;
    category: SectionCategory;
    title: string;
    titleEnglish?: string | null;
    titleUrdu?: string | null;
    heading?: string;
    headingEnglish?: string | null;
    headingUrdu?: string | null;
    availableCount: number;
    /** Default column count (1–5) for this question type, from the DB. */
    columnPerRow: number;
    sortOrder?: number | null;
    selectionMode?: SelectionMode;
    orPairingId?: number | null;
    /** Legacy single alternative type. */
    orQuestionTypeId?: number | null;
    /** All question types in this OR group, including this section. */
    orGroupTypeIds?: number[];
    /** Alternative members for the primary section in this OR group. */
    orAlternativeQuestionTypeIds?: number[];
    rows: QuestionSelectionRow[];
}

function orAlternativeTypeIds(
    section: Pick<
        QuestionSelectionSection,
        | 'questionTypeId'
        | 'orQuestionTypeId'
        | 'orAlternativeQuestionTypeIds'
        | 'orGroupTypeIds'
    >,
): number[] {
    if (Array.isArray(section.orAlternativeQuestionTypeIds)) {
        return section.orAlternativeQuestionTypeIds.filter(
            (id) => id !== section.questionTypeId,
        );
    }

    if (Array.isArray(section.orGroupTypeIds)) {
        return section.orGroupTypeIds.filter(
            (id) => id !== section.questionTypeId,
        );
    }

    return typeof section.orQuestionTypeId === 'number'
        ? [section.orQuestionTypeId]
        : [];
}

function orGroupTypeIds(
    section: Pick<
        QuestionSelectionSection,
        'questionTypeId' | 'orQuestionTypeId' | 'orGroupTypeIds'
    >,
): number[] {
    return Array.from(
        new Set([section.questionTypeId, ...orAlternativeTypeIds(section)]),
    );
}

function rowOrSelectedQuestionIds(
    row: QuestionSelectionRow,
    typeId: number,
): number[] {
    return (
        row.orSelectedQuestionIdsByType?.[String(typeId)] ??
        row.orSelectedQuestionIds ??
        []
    );
}
function englishQuestionTypeTitle(
    section: Pick<QuestionSelectionSection, 'title' | 'titleEnglish'>,
): string {
    return section.titleEnglish?.trim() || section.title;
}

function questionSectionSelectionMode(
    section: Pick<QuestionSelectionSection, 'selectionMode'>,
): SelectionMode {
    return section.selectionMode ?? 'automatic';
}
interface QuestionSelectionState {
    multipart?: MultipartSelectionState[];
    multipartChoiceCount?: number | null;
    globalFilters: Record<SourceFilterKey, boolean>;
    sections: QuestionSelectionSection[];
    totalMarks: number;
}

interface QuestionTypeCount {
    id: string;
    questionTypeId: number;
    category: SectionCategory;
    title: string;
    titleEnglish?: string | null;
    titleUrdu?: string | null;
    heading?: string;
    headingEnglish?: string | null;
    headingUrdu?: string | null;
    availableCount: number;
    columnPerRow: number;
    sortOrder?: number | null;
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
    optionsOnly?: boolean;
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

type ManualPickerSide = 'primary' | 'alternative';

interface ManualPickerRow {
    multipartSelectionId?: string;
    section: QuestionSelectionSection;
    row: QuestionSelectionRow;
    target: number;
    side: ManualPickerSide;
    alternativeTypeId?: number;
    questionTypeId: number;
    selectedQuestionIds: number[];
    title: string;
}

interface ManualPickerTarget {
    sectionId: string;
    rowId: string;
    side: ManualPickerSide;
    alternativeTypeId?: number;
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

function createMultipartPartRow(
    id: string,
    questionTypeId: number | null,
): MultipartPartRow {
    return {
        id,
        questionTypeId,
        // Every multipart part represents exactly one question.
        choiceQuestions: '1',
        requiredQuestions: '1',
        marksPerQuestion: '',
        selectedQuestionIds: [],
    };
}

function currentMultipartSelection(
    current: MultipartSelectionState | undefined,
    config: MultipartConfig,
    selectionId: string,
): MultipartSelectionState {
    const allowed = new Set(config.partTypes.map((type) => type.id));
    const existingRows =
        current?.configId === config.id && Array.isArray(current.rows)
            ? current.rows
                  .filter(
                      (row) =>
                          row.questionTypeId === null ||
                          allowed.has(row.questionTypeId),
                  )
                  .map((row) => ({
                      ...row,
                      choiceQuestions: '1',
                      requiredQuestions: '1',
                  }))
            : [];
    const rows =
        existingRows.length >= 2
            ? existingRows.slice(0, config.maxParts)
            : [1, 2].map((index) =>
                  createMultipartPartRow(`multipart_part_${index}`, null),
              );
    const partTypeIds = rows
        .map((row) => row.questionTypeId)
        .filter((id): id is number => typeof id === 'number');
    const firstConfiguredRow = rows.find((row) => row.questionTypeId !== null);

    return {
        id: current?.id ?? selectionId,
        configId: config.id,
        rows,
        selectionMode:
            current?.configId === config.id
                ? current.selectionMode
                : 'automatic',
        partTypeIds,
        questionCount: '1',
        choiceCount: '1',
        marksPerPart: firstConfiguredRow?.marksPerQuestion ?? '',
    };
}
function normalizeQuestionSelection(value: unknown): QuestionSelectionState {
    const fallback: QuestionSelectionState = {
        globalFilters: {},
        sections: [],
        multipart: undefined,
        multipartChoiceCount: null,
        totalMarks: 0,
    };

    if (!value || typeof value !== 'object') {
        return fallback;
    }

    const source = value as Partial<QuestionSelectionState> & {
        multipart?: MultipartSelectionState | MultipartSelectionState[] | null;
    };
    const rawMultipart = source.multipart;
    const multipart = rawMultipart
        ? (Array.isArray(rawMultipart) ? rawMultipart : [rawMultipart]).map(
              (selection, index) => ({
                  ...selection,
                  id: selection.id || `multipart_${index + 1}`,
                  rows: Array.isArray(selection.rows) ? selection.rows : [],
              }),
          )
        : undefined;

    return {
        globalFilters:
            source.globalFilters && typeof source.globalFilters === 'object'
                ? source.globalFilters
                : {},
        sections: Array.isArray(source.sections) ? source.sections : [],
        multipart,
        multipartChoiceCount:
            typeof source.multipartChoiceCount === 'number' &&
            Number.isFinite(source.multipartChoiceCount)
                ? Math.max(1, Math.floor(source.multipartChoiceCount))
                : null,
        totalMarks:
            typeof source.totalMarks === 'number' &&
            Number.isFinite(source.totalMarks)
                ? source.totalMarks
                : 0,
    };
}

function createQuestionRow(id: string): QuestionSelectionRow {
    return {
        id,
        requiredQuestions: '',
        marksPerQuestion: '',
        choiceQuestions: '',
        selectedQuestionIds: [],
        orSelectedQuestionIds: [],
        orSelectedQuestionIdsByType: {},
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
        orSelectedQuestionIds: (normalized.orSelectedQuestionIds ?? []).slice(
            0,
            rowTarget(normalized),
        ),
        orSelectedQuestionIdsByType: Object.fromEntries(
            Object.entries(normalized.orSelectedQuestionIdsByType ?? {}).map(
                ([typeId, ids]) => [
                    typeId,
                    (ids ?? []).slice(0, rowTarget(normalized)),
                ],
            ),
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
    forceBilingual = false,
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

    if (
        englishText !== '' &&
        urduText !== '' &&
        (forceBilingual || englishText !== urduText)
    ) {
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

function RichTextLabel({
    value,
    className,
}: {
    value: string | null | undefined;
    className?: string;
}) {
    if (!value) {
        return null;
    }

    return (
        <QuestionContent as="span" inline value={value} className={className} />
    );
}

function manualQuestionDisplayHtmlForMedium(
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
            ? (question.summaryTextEn?.trim() ?? '')
            : (question.summaryTextUr?.trim() ?? '');

    return question.schemaKey === 'objective_passage_mcq' && passageText !== ''
        ? passageText
        : summaryText || question.summaryText;
}

function sameStatementFromManual(question: ManualQuestion): string | null {
    if (question.schemaKey !== 'subjective_same_statement') {
        return null;
    }

    const content = question.content as Record<string, unknown> | null;
    const sharedEn =
        typeof content?.shared_en === 'string' ? content.shared_en.trim() : '';
    const sharedUr =
        typeof content?.shared_ur === 'string' ? content.shared_ur.trim() : '';

    if (question.medium === 'Urdu') {
        return sharedUr !== ''
            ? localizedPaperHtml('', sharedUr, 'Urdu')
            : sharedEn !== ''
              ? localizedPaperHtml(sharedEn, '', 'English')
              : null;
    }

    const shared = sharedEn || sharedUr;

    return shared === '' ? null : localizedPaperHtml(shared, '', 'English');
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
        optionsOnly: question.optionsOnly,
        text: question.optionsOnly
            ? ''
            : passageQuestions
              ? passageText
              : localizedPaperHtml(
                    question.summaryTextEn,
                    question.summaryTextUr,
                    question.medium,
                    question.summaryText,
                    question.schemaKey === 'subjective_same_statement',
                ),
        sameStatement: sameStatementFromManual(question),
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
        typeof content.passage_en === 'string' ? content.passage_en.trim() : '';
    const passageUr =
        typeof content.passage_ur === 'string' ? content.passage_ur.trim() : '';

    return localizedPaperHtml(
        passageEn,
        passageUr,
        question.medium,
        question.summaryText,
    );
}

function manualQuestionDisplayHtml(question: ManualQuestion): string {
    return question.schemaKey === 'objective_passage_mcq'
        ? passageTextFromManual(question)
        : question.summaryText;
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
            const text = localizedPaperHtml(textEn, textUr, question.medium);
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

    if (question.optionsOnly) {
        return null;
    }

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

    const en =
        typeof content.answer_en === 'string' ? content.answer_en.trim() : '';
    const ur =
        typeof content.answer_ur === 'string' ? content.answer_ur.trim() : '';
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
        const flag = String(
            (question.content as Record<string, unknown>).correct_boolean ?? '',
        ).toLowerCase();

        return [
            {
                id: `${question.id}_true`,
                text: 'True',
                isCorrect: flag === 'true',
            },
            {
                id: `${question.id}_false`,
                text: 'False',
                isCorrect: flag === 'false',
            },
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

function multipartSelectionMarks(selection: MultipartSelectionState): number {
    return selection.rows.reduce(
        (sum, row) => sum + toNumber(row.marksPerQuestion),
        0,
    );
}

function multipartChoiceMarks(state: QuestionSelectionState): number {
    const selections = state.multipart ?? [];
    const marks = selections.map(multipartSelectionMarks);

    if (marks.length === 0) {
        return 0;
    }

    const choiceCount = state.multipartChoiceCount;
    const requiredCount =
        typeof choiceCount === 'number'
            ? Math.max(1, Math.min(choiceCount, marks.length))
            : marks.length;
    const allMarksMatch = marks.every((value) => value === marks[0]);

    return requiredCount < marks.length && allMarksMatch
        ? requiredCount * marks[0]
        : marks.reduce((sum, value) => sum + value, 0);
}

function multipartChoiceMarksMismatch(state: QuestionSelectionState): boolean {
    const selections = state.multipart ?? [];
    const choiceCount = state.multipartChoiceCount;

    if (
        typeof choiceCount !== 'number' ||
        choiceCount >= selections.length ||
        selections.length === 0
    ) {
        return false;
    }

    const marks = selections.map(multipartSelectionMarks);

    return (
        marks.every((value) => value > 0) &&
        marks.some((value) => value !== marks[0])
    );
}

function paperTotalMarks(paper: GeneratedPaper): number {
    const countedMultipartGroups = new Set<string>();

    return paper.sections.reduce((sum, section) => {
        if (section.orRole === 'alternative') {
            return sum;
        }

        if (!section.multipart) {
            return sum + section.requiredQuestions * section.marksEach;
        }

        const groupId = section.multipart.groupId;

        if (!groupId) {
            return (
                sum +
                section.multipart.rows.length *
                    section.multipart.choiceCount *
                    section.multipart.marksEach
            );
        }

        if (countedMultipartGroups.has(groupId)) {
            return sum;
        }

        countedMultipartGroups.add(groupId);
        const groupSections = paper.sections.filter(
            (candidate) => candidate.multipart?.groupId === groupId,
        );
        const marks = groupSections.map(
            (candidate) => candidate.multipart?.marksEach ?? 0,
        );
        const allMarksMatch = marks.every((value) => value === marks[0]);
        const choiceCount = groupSections[0]?.multipart?.groupChoiceCount;

        if (
            typeof choiceCount === 'number' &&
            choiceCount > 0 &&
            choiceCount < marks.length &&
            allMarksMatch
        ) {
            return sum + choiceCount * marks[0];
        }

        return sum + marks.reduce((total, value) => total + value, 0);
    }, 0);
}

function sectionTotal(section: QuestionSelectionSection): number {
    return section.rows.reduce((sum, row) => sum + lineTotal(row), 0);
}

function withTotalMarks(state: QuestionSelectionState): QuestionSelectionState {
    const alternativeTypeIds = new Set(
        state.sections.flatMap((section) => orAlternativeTypeIds(section)),
    );

    return {
        ...state,
        totalMarks:
            state.sections.reduce(
                (sum, section) =>
                    alternativeTypeIds.has(section.questionTypeId)
                        ? sum
                        : sum + sectionTotal(section),
                0,
            ) + multipartChoiceMarks(state),
    };
}
function sortIncomingQuestionTypes(
    sections: QuestionTypeCount[],
): QuestionTypeCount[] {
    return [...sections].sort((left, right) => {
        if (left.category !== right.category) {
            return left.category === 'Objective Questions' ? -1 : 1;
        }

        const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;

        return (
            leftOrder - rightOrder || left.questionTypeId - right.questionTypeId
        );
    });
}
function mergeQuestionSections(
    incoming: QuestionTypeCount[],
    existing: QuestionSelectionSection[],
    pairings: QuestionTypePairing[],
): QuestionSelectionSection[] {
    const existingByType = new Map(
        existing.map((section) => [section.questionTypeId, section]),
    );
    const orderedIncoming = sortIncomingQuestionTypes(incoming);
    const incomingIds = new Set(
        orderedIncoming.map((section) => section.questionTypeId),
    );
    const groupById = new Map(pairings.map((group) => [group.id, group]));

    const merged = orderedIncoming.map((item) => {
        const current = existingByType.get(item.questionTypeId);
        const sectionId = current?.id ?? `sec_type_${item.questionTypeId}`;
        const group =
            typeof current?.orPairingId === 'number'
                ? groupById.get(current.orPairingId)
                : null;
        const memberIds =
            group?.questionTypeIds ?? current?.orGroupTypeIds ?? [];
        const keepsGroup =
            group !== null &&
            group !== undefined &&
            memberIds.includes(item.questionTypeId) &&
            memberIds.every((id) => incomingIds.has(id));
        const alternativeIds = keepsGroup
            ? memberIds.filter((id) => id !== item.questionTypeId)
            : [];

        return {
            id: sectionId,
            questionTypeId: item.questionTypeId,
            category: item.category,
            title: item.title,
            titleEnglish: item.titleEnglish,
            titleUrdu: item.titleUrdu,
            heading: item.heading || item.title,
            headingEnglish: item.headingEnglish,
            headingUrdu: item.headingUrdu,
            availableCount: item.availableCount,
            columnPerRow: item.columnPerRow,
            sortOrder: item.sortOrder,
            selectionMode: current?.selectionMode ?? 'automatic',
            orPairingId: keepsGroup ? group?.id : null,
            orQuestionTypeId: keepsGroup ? (alternativeIds[0] ?? null) : null,
            orGroupTypeIds: keepsGroup ? memberIds : undefined,
            orAlternativeQuestionTypeIds: keepsGroup
                ? alternativeIds
                : undefined,
            rows: normalizeSectionRows(
                current?.rows ?? [createQuestionRow(`${sectionId}_row_001`)],
                item.availableCount,
            ),
        };
    });

    const mergedByType = new Map(
        merged.map((section) => [section.questionTypeId, section]),
    );

    return merged.map((section) => {
        const memberIds = orGroupTypeIds(section);
        const groupIsActive =
            typeof section.orPairingId === 'number' &&
            memberIds.length > 1 &&
            memberIds.every((id) => mergedByType.has(id));
        const availableCount = groupIsActive
            ? Math.min(
                  ...memberIds.map(
                      (id) =>
                          mergedByType.get(id)?.availableCount ??
                          section.availableCount,
                  ),
              )
            : section.availableCount;

        return {
            ...section,
            rows: normalizeSectionRows(section.rows, availableCount),
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
                        'inline-flex h-7 cursor-pointer items-center rounded-md px-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none',
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
                className="flex min-h-[62px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none focus-visible:ring-inset"
            >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {option.displayLabel ?? (
                        <QuestionContent
                            as="span"
                            inline
                            value={option.label}
                        />
                    )}
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
    const level = !pattern
        ? 'pattern'
        : !klass
          ? 'class'
          : !subject
            ? 'subject'
            : 'ready';
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
                {level === 'ready' && chapters && chapters.length > 0 && (
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
                    ]
                        .filter(Boolean)
                        .map((item, index) => {
                            const crumb = item as {
                                value: ComboboxOptionItem;
                                clear: (
                                    value: ComboboxOptionItem | null,
                                ) => void;
                            };

                            return (
                                <span
                                    key={crumb.value.id}
                                    className="inline-flex items-center gap-1.5"
                                >
                                    {index > 0 && (
                                        <ArrowRightIcon className="size-3.5 text-slate-400" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => crumb.clear(null)}
                                        className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
                                    >
                                        <span className="truncate">
                                            {crumb.value.displayLabel ?? (
                                                <QuestionContent
                                                    as="span"
                                                    inline
                                                    value={crumb.value.label}
                                                />
                                            )}
                                        </span>
                                        <CheckIcon
                                            className="size-3.5 shrink-0"
                                            strokeWidth={2.5}
                                        />
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
function CategoryDivider({
    title,
    action,
}: {
    title: string;
    action?: ReactNode;
}) {
    return (
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <div className="h-px bg-slate-200 dark:bg-slate-800" />
            <h3 className="text-center text-sm font-bold tracking-wide text-slate-700 uppercase dark:text-slate-200">
                {title}
            </h3>
            <div className="flex min-w-0 items-center gap-3">
                <div className="h-px min-w-0 flex-1 bg-slate-200 dark:bg-slate-800" />
                {action}
            </div>
        </div>
    );
}

function MultipartChoiceControl({
    value,
    count,
    onChange,
}: {
    value: number | null;
    count: number;
    onChange: (value: string) => void;
}) {
    const selectedValue = value === null ? 'all' : String(value);
    const selectedLabel = value === null ? 'All' : 'Any ' + value;

    return (
        <label className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Choice</span>
            <Combobox
                value={selectedValue}
                onChange={(next: string | null) =>
                    onChange(next === null || next === 'all' ? '' : next)
                }
            >
                <div className="relative">
                    <ComboboxButton
                        aria-label="Multipart question choice"
                        className="group/choice flex h-7 min-w-20 cursor-pointer items-center justify-between gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 transition-colors outline-none hover:border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
                    >
                        <span>{selectedLabel}</span>
                        <ChevronDownIcon className="size-3.5 shrink-0 text-slate-400 transition-transform group-data-open/choice:rotate-180 dark:text-slate-500" />
                    </ComboboxButton>
                    <ComboboxOptions
                        transition
                        className="absolute top-full right-0 z-[70] mt-1.5 max-h-60 min-w-24 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10 transition duration-100 ease-out outline-none data-closed:scale-95 data-closed:opacity-0 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40"
                    >
                        <ComboboxOption
                            value="all"
                            className={({ focus, selected }) =>
                                cn(
                                    'flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors',
                                    focus
                                        ? 'bg-brand-50 text-brand-900 dark:bg-brand-500/10 dark:text-brand-100'
                                        : 'text-slate-700 dark:text-slate-300',
                                    selected &&
                                        'font-semibold text-brand-800 dark:text-brand-200',
                                )
                            }
                        >
                            {({ selected }) => (
                                <>
                                    <span>All</span>
                                    {selected && (
                                        <CheckIcon className="size-3.5 text-brand-600 dark:text-brand-400" />
                                    )}
                                </>
                            )}
                        </ComboboxOption>
                        {Array.from({ length: count }, (_, index) => {
                            const choice = index + 1;

                            return (
                                <ComboboxOption
                                    key={choice}
                                    value={String(choice)}
                                    className={({ focus, selected }) =>
                                        cn(
                                            'flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors',
                                            focus
                                                ? 'bg-brand-50 text-brand-900 dark:bg-brand-500/10 dark:text-brand-100'
                                                : 'text-slate-700 dark:text-slate-300',
                                            selected &&
                                                'font-semibold text-brand-800 dark:text-brand-200',
                                        )
                                    }
                                >
                                    {({ selected }) => (
                                        <>
                                            <span>Any {choice}</span>
                                            {selected && (
                                                <CheckIcon className="size-3.5 text-brand-600 dark:text-brand-400" />
                                            )}
                                        </>
                                    )}
                                </ComboboxOption>
                            );
                        })}
                    </ComboboxOptions>
                </div>
            </Combobox>
        </label>
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
            <input
                autoComplete="off"
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
    paddingX,
    paddingY,
    onChange,
}: {
    template: PaperHeaderTemplate;
    header: Parameters<typeof ClassicExamHeader>[0]['header'];
    logoUrl: string;
    address: string;
    showAddress: boolean;
    paddingX: number;
    paddingY: number;
    onChange: Parameters<typeof ClassicExamHeader>[0]['onChange'];
}) {
    if (template === 'banner') {
        return (
            <BannerExamHeader
                header={header}
                logoUrl={logoUrl || undefined}
                paddingX={paddingX}
                paddingY={paddingY}
                onChange={onChange}
            />
        );
    }

    if (template === 'formal') {
        return (
            <FormalExamHeader
                header={header}
                logoUrl={logoUrl || undefined}
                paddingX={paddingX}
                paddingY={paddingY}
                onChange={onChange}
            />
        );
    }

    if (template === 'centered') {
        return (
            <CenteredExamHeader
                header={header}
                logoUrl={logoUrl || undefined}
                address={address}
                showAddress={showAddress}
                paddingX={paddingX}
                paddingY={paddingY}
                onChange={onChange}
            />
        );
    }

    if (template === 'tabular') {
        return (
            <TabularExamHeader
                header={header}
                logoUrl={logoUrl || undefined}
                address={address}
                showAddress={showAddress}
                paddingX={paddingX}
                paddingY={paddingY}
                onChange={onChange}
            />
        );
    }

    return (
        <ClassicExamHeader
            header={header}
            logoUrl={logoUrl || undefined}
            paddingX={paddingX}
            paddingY={paddingY}
            onChange={onChange}
        />
    );
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
    const schoolAddress =
        typeof auth.user.address === 'string' ? auth.user.address : '';
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
    const [chapterMedium, setChapterMedium] =
        useState<ContentMedium>('English');
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
            multipart: undefined,
            multipartChoiceCount: null,
            totalMarks: 0,
        });
    const [multipartConfig, setMultipartConfig] =
        useState<MultipartConfig | null>(null);
    const [questionTypePairings, setQuestionTypePairings] = useState<
        QuestionTypePairing[]
    >([]);
    const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>(
        'idle',
    );
    const [recoveryDraft, setRecoveryDraft] = useState<DraftPayload | null>(
        null,
    );
    const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedRef = useRef<number | null>(null);
    const isRestoringRef = useRef(false);
    const [pendingTemplate] = useState<AppliedTemplate | null>(
        appliedTemplate ?? null,
    );
    const templateStructureAppliedRef = useRef(false);
    const templateSettingsAppliedRef = useRef(false);
    const [isSaveAsTemplateOpen, setIsSaveAsTemplateOpen] = useState(false);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [saveTemplateError, setSaveTemplateError] = useState<string | null>(
        null,
    );
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
        () =>
            patterns.map((item) => ({
                id: item.id,
                label: item.name,
                searchLabel: plainQuestionText(item.name),
                displayLabel: (
                    <QuestionContent as="span" inline value={item.name} />
                ),
            })),
        [patterns],
    );

    const classOptions = useMemo<ComboboxOptionItem[]>(() => {
        if (!pattern) {
            return [];
        }

        return patternClasses
            .filter((item) => item.pattern_id === pattern.id)
            .map((item) => ({
                id: item.id,
                label: item.name,
                searchLabel: plainQuestionText(item.name),
                displayLabel: (
                    <QuestionContent as="span" inline value={item.name} />
                ),
            }));
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
            .map((item) => ({
                id: item.subject_id,
                label: item.name,
                searchLabel: plainQuestionText(item.name),
                displayLabel: (
                    <QuestionContent as="span" inline value={item.name} />
                ),
            }));
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
    const foldedAlternativeTypeIds = useMemo(
        () =>
            new Set(
                questionSelection.sections.flatMap((section) =>
                    orAlternativeTypeIds(section),
                ),
            ),
        [questionSelection.sections],
    );
    const questionSelectionRows = useMemo(
        () =>
            questionSelection.sections
                .filter(
                    (section) =>
                        !foldedAlternativeTypeIds.has(section.questionTypeId),
                )
                .flatMap((section) =>
                    section.rows
                        .map((row) => ({
                            section,
                            row,
                            target: rowTarget(row),
                        }))
                        .filter((item) => item.target > 0),
                ),
        [foldedAlternativeTypeIds, questionSelection.sections],
    );
    const manualPickerRows = useMemo(() => {
        const standardRows = questionSelectionRows.flatMap(
            (item): ManualPickerRow[] => {
                if (questionSectionSelectionMode(item.section) !== 'manual') {
                    return [];
                }

                const rows: ManualPickerRow[] = [
                    {
                        ...item,
                        side: 'primary',
                        questionTypeId: item.section.questionTypeId,
                        selectedQuestionIds: item.row.selectedQuestionIds,
                        title: englishQuestionTypeTitle(item.section),
                    },
                ];

                return rows.concat(
                    orAlternativeTypeIds(item.section).map(
                        (alternativeTypeId) => {
                            const alternative = questionSelection.sections.find(
                                (section) =>
                                    section.questionTypeId ===
                                    alternativeTypeId,
                            );

                            return {
                                ...item,
                                side: 'alternative',
                                alternativeTypeId,
                                questionTypeId: alternativeTypeId,
                                selectedQuestionIds: rowOrSelectedQuestionIds(
                                    item.row,
                                    alternativeTypeId,
                                ),
                                title: alternative
                                    ? englishQuestionTypeTitle(alternative)
                                    : 'OR alternative',
                            };
                        },
                    ),
                );
            },
        );

        const multipartSelections = questionSelection.multipart ?? [];
        const multipartRows = multipartSelections.flatMap(
            (selection): ManualPickerRow[] => {
                if (selection.selectionMode !== 'manual') {
                    return [];
                }

                return selection.rows.flatMap((part): ManualPickerRow[] => {
                    if (part.questionTypeId === null || rowTarget(part) === 0) {
                        return [];
                    }

                    const type = multipartConfig?.partTypes.find(
                        (candidate) => candidate.id === part.questionTypeId,
                    );
                    const syntheticRow = {
                        id: part.id,
                        requiredQuestions: part.requiredQuestions,
                        marksPerQuestion: part.marksPerQuestion,
                        choiceQuestions: part.choiceQuestions,
                        selectedQuestionIds: part.selectedQuestionIds,
                    } satisfies QuestionSelectionRow;
                    const syntheticSection = {
                        id: `multipart_${selection.id}_${part.id}`,
                        questionTypeId: part.questionTypeId,
                        category: 'Subjective Questions',
                        title: type?.name ?? 'Multipart part',
                        titleEnglish: type?.name ?? 'Multipart part',
                        titleUrdu: type?.nameUrdu ?? null,
                        heading: type?.name ?? 'Multipart part',
                        headingEnglish: type?.name ?? 'Multipart part',
                        headingUrdu: type?.nameUrdu ?? null,
                        availableCount: rowTarget(part),
                        columnPerRow: 1,
                        selectionMode: 'manual' as SelectionMode,
                        rows: [syntheticRow],
                    } satisfies QuestionSelectionSection;

                    return [
                        {
                            multipartSelectionId: selection.id,
                            section: syntheticSection,
                            row: syntheticRow,
                            target: rowTarget(part),
                            side: 'primary',
                            questionTypeId: part.questionTypeId,
                            selectedQuestionIds: part.selectedQuestionIds,
                            title: type?.name ?? 'Multipart part',
                        },
                    ];
                });
            },
        );

        return [...standardRows, ...multipartRows];
    }, [
        multipartConfig,
        questionSelection.multipart,
        questionSelection.sections,
        questionSelectionRows,
    ]);
    const activeManualPickerRow = useMemo(
        () =>
            manualPickerTarget
                ? (manualPickerRows.find(
                      (item) =>
                          item.section.id === manualPickerTarget.sectionId &&
                          item.row.id === manualPickerTarget.rowId &&
                          item.side === manualPickerTarget.side &&
                          item.alternativeTypeId ===
                              manualPickerTarget.alternativeTypeId,
                  ) ?? null)
                : null,
        [manualPickerRows, manualPickerTarget],
    );
    const selectedManualQuestionIds = useMemo(
        () =>
            new Set(
                manualPickerRows.flatMap((item) => item.selectedQuestionIds),
            ),
        [manualPickerRows],
    );
    const isManualSelectionComplete = manualPickerRows.every(
        (item) => item.selectedQuestionIds.length === item.target,
    );
    const standardSelectionReady =
        questionSelectionRows.length > 0 &&
        questionSelectionRows.every(
            (item) =>
                toNumber(item.row.requiredQuestions) > 0 &&
                toNumber(item.row.marksPerQuestion) > 0,
        );
    const multipartSelections = questionSelection.multipart ?? [];
    const multipartReady =
        !multipartConfig ||
        multipartSelections.every(
            (selection) =>
                selection.rows.length >= 2 &&
                selection.rows.every(
                    (row) =>
                        typeof row.questionTypeId === 'number' &&
                        toNumber(row.marksPerQuestion) > 0,
                ),
        );
    const multipartChoiceHasMismatch =
        multipartChoiceMarksMismatch(questionSelection);
    const isQuestionSelectionReady =
        (standardSelectionReady || multipartSelections.length > 0) &&
        multipartReady;
    const canGeneratePaper =
        questionSelection.totalMarks > 0 &&
        isQuestionSelectionReady &&
        isManualSelectionComplete &&
        multipartReady &&
        !multipartChoiceHasMismatch;
    const activeManualQuestionTypeId =
        activeManualPickerRow?.questionTypeId ?? null;
    const activeManualSelectedQuestionIds = useMemo(
        () => new Set(activeManualPickerRow?.selectedQuestionIds ?? []),
        [activeManualPickerRow?.selectedQuestionIds],
    );
    const filteredManualQuestions = useMemo(() => {
        const search = manualSearch.trim().toLowerCase();

        return manualQuestions.filter((question) => {
            const matchesSelected =
                !showSelectedManualQuestions ||
                activeManualSelectedQuestionIds.has(question.id);
            const matchesSearch =
                search === '' ||
                plainQuestionText(question.summaryText)
                    .toLowerCase()
                    .includes(search) ||
                plainQuestionText(question.chapter.name)
                    .toLowerCase()
                    .includes(search) ||
                (question.topic
                    ? plainQuestionText(question.topic.name)
                          .toLowerCase()
                          .includes(search)
                    : false) ||
                (question.sourceLabel
                    ? plainQuestionText(question.sourceLabel)
                          .toLowerCase()
                          .includes(search)
                    : false);

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
                plainQuestionText(question.summaryText)
                    .toLowerCase()
                    .includes(search) ||
                plainQuestionText(question.chapter.name)
                    .toLowerCase()
                    .includes(search) ||
                (question.topic
                    ? plainQuestionText(question.topic.name)
                          .toLowerCase()
                          .includes(search)
                    : false) ||
                (question.sourceLabel
                    ? plainQuestionText(question.sourceLabel)
                          .toLowerCase()
                          .includes(search)
                    : false);

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

    const renderDirectChapterGroup = (group: ChapterGroup, index: number) => (
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
        const heights: [number, number] = [estimatedGroupHeight(firstGroup), 0];
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
        const topicWiseChapters = chapterGroups.flatMap((group) => group.items);
        const columns: [Chapter[], Chapter[]] = [[], []];
        const heights: [number, number] = [0, 0];
        let activeColumn: 0 | 1 = 0;

        for (const chapter of topicWiseChapters) {
            const chapterHeight = 68 + Math.max(chapter.topics.length, 1) * 34;
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
            .then(
                (data: {
                    sections: QuestionTypeCount[];
                    groups?: QuestionTypePairing[];
                    multipart?: MultipartConfig | null;
                }) => {
                    const pairings = data.groups ?? [];
                    setQuestionTypePairings(pairings);
                    setMultipartConfig(data.multipart ?? null);
                    setQuestionSelection((current) =>
                        withTotalMarks({
                            ...current,
                            multipart: data.multipart
                                ? current.multipart?.length
                                    ? current.multipart.map(
                                          (selection, index) =>
                                              currentMultipartSelection(
                                                  selection,
                                                  data.multipart as MultipartConfig,
                                                  selection.id ||
                                                      `multipart_${index + 1}`,
                                              ),
                                      )
                                    : [
                                          currentMultipartSelection(
                                              undefined,
                                              data.multipart,
                                              'multipart_1',
                                          ),
                                      ]
                                : undefined,
                            sections: mergeQuestionSections(
                                data.sections,
                                current.sections,
                                pairings,
                            ),
                        }),
                    );
                },
            )
            .catch((error) => {
                if (error?.name !== 'AbortError') {
                    setQuestionSectionError(
                        'Unable to load question counts. Please try again.',
                    );
                    setQuestionTypePairings([]);
                    setMultipartConfig(null);
                    setQuestionSelection((current) =>
                        withTotalMarks({ ...current, sections: [] }),
                    );
                }
            })
            .finally(() => setLoadingQuestionSections(false));

        return () => abortController.abort();
    }, [
        activeSourceValues,
        chapterMedium,
        selectedChapterIds,
        selectedTopicIds,
        step,
    ]);

    useEffect(() => {
        if (
            !pendingTemplate ||
            templateStructureAppliedRef.current ||
            questionSelection.sections.length === 0
        ) {
            return;
        }

        const structureByType = new Map<
            number,
            AppliedTemplate['structure']['sections'][number]
        >();

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

                    const rows =
                        section.rows.length > 0
                            ? [...section.rows]
                            : [
                                  createQuestionRow(
                                      String(questionRowSequence.current++),
                                  ),
                              ];
                    const firstRow = rows[0];
                    rows[0] = normalizeQuestionRow(
                        {
                            ...firstRow,
                            requiredQuestions: String(
                                match.requiredQuestions ?? '',
                            ),
                            marksPerQuestion: String(match.marksEach ?? ''),
                            choiceQuestions: String(
                                match.totalQuestions ??
                                    match.requiredQuestions ??
                                    '',
                            ),
                        },
                        section.availableCount,
                    );

                    const pairing =
                        typeof match.orPairingId === 'number'
                            ? questionTypePairings.find(
                                  (candidate) =>
                                      candidate.id === match.orPairingId,
                              )
                            : undefined;
                    const savedGroupTypeIds = Array.isArray(
                        match.orGroupTypeIds,
                    )
                        ? match.orGroupTypeIds.filter(
                              (typeId): typeId is number =>
                                  Number.isInteger(typeId),
                          )
                        : [];
                    const groupTypeIds =
                        savedGroupTypeIds.length > 1
                            ? savedGroupTypeIds
                            : (pairing?.questionTypeIds ?? []);
                    const validPairing =
                        typeof match.orPairingId === 'number' &&
                        groupTypeIds.length > 1 &&
                        groupTypeIds.includes(section.questionTypeId) &&
                        (match.orRole === 'primary' ||
                            match.orRole === 'alternative');
                    const alternativeTypeIds = validPairing
                        ? groupTypeIds.filter(
                              (typeId) => typeId !== section.questionTypeId,
                          )
                        : [];

                    return {
                        ...section,
                        columnPerRow: match.columns ?? section.columnPerRow,
                        orPairingId: validPairing
                            ? match.orPairingId
                            : section.orPairingId,
                        orQuestionTypeId: validPairing
                            ? (match.orQuestionTypeId ??
                              alternativeTypeIds[0] ??
                              null)
                            : section.orQuestionTypeId,
                        orGroupTypeIds: validPairing
                            ? groupTypeIds
                            : section.orGroupTypeIds,
                        orAlternativeQuestionTypeIds: validPairing
                            ? alternativeTypeIds
                            : section.orAlternativeQuestionTypeIds,
                        rows,
                    };
                }),
            }),
        );

        templateStructureAppliedRef.current = true;
    }, [
        pendingTemplate,
        questionSelection.sections.length,
        questionTypePairings,
    ]);

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
        chapterMedium,
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
            normalizeQuestionSelection(savedPaper.questionSelection),
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
            multipart: undefined,
            multipartChoiceCount: null,
            totalMarks: 0,
        });
        setQuestionTypePairings([]);
        setMultipartConfig(null);
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

    function handleMultipartAutoPickChange(
        selectionId: string,
        enabled: boolean,
    ) {
        setQuestionSelection((current) => ({
            ...current,
            multipart: current.multipart?.map((selection) =>
                selection.id === selectionId
                    ? {
                          ...selection,
                          selectionMode: enabled ? 'automatic' : 'manual',
                      }
                    : selection,
            ),
        }));

        if (
            enabled &&
            manualPickerTarget?.sectionId.startsWith(
                `multipart_${selectionId}_`,
            )
        ) {
            closeManualQuestionPicker();
        }
    }
    function addMultipartCard() {
        if (!multipartConfig) {
            return;
        }

        setQuestionSelection((current) => {
            const selections = current.multipart ?? [];
            const selectionId = `multipart_${Date.now()}_${selections.length + 1}`;

            return withTotalMarks({
                ...current,
                multipart: [
                    ...selections,
                    currentMultipartSelection(
                        undefined,
                        multipartConfig,
                        selectionId,
                    ),
                ],
            });
        });
    }
    function handleMultipartChoiceChange(value: string) {
        setQuestionSelection((current) =>
            withTotalMarks({
                ...current,
                multipartChoiceCount:
                    value === '' ? null : Math.max(1, Number(value)),
            }),
        );
    }
    function openManualQuestionPicker(
        sectionId: string,
        rowId: string,
        side: ManualPickerSide = 'primary',
        alternativeTypeId?: number,
    ) {
        const row = manualPickerRows.find(
            (item) =>
                item.section.id === sectionId &&
                item.row.id === rowId &&
                item.side === side &&
                item.alternativeTypeId === alternativeTypeId,
        );

        if (!row) {
            return;
        }

        setManualSearch('');
        setShowSelectedManualQuestions(false);
        setManualPickerTarget({ sectionId, rowId, side, alternativeTypeId });
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
            const alternativeTypeIds = new Set(
                questionSelection.sections.flatMap((section) =>
                    orAlternativeTypeIds(section),
                ),
            );
            const activeRows = questionSelection.sections
                .filter(
                    (section) =>
                        !alternativeTypeIds.has(section.questionTypeId),
                )
                .flatMap((section) =>
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
            const multipartTypeIds = multipartConfig
                ? [
                      ...new Set(
                          (questionSelection.multipart ?? []).flatMap(
                              (selection) => selection.partTypeIds,
                          ),
                      ),
                  ]
                : [];
            const questionTypeIds = [
                ...new Set([
                    ...activeRows.flatMap((item) => [
                        item.section.questionTypeId,
                        ...orAlternativeTypeIds(item.section),
                    ]),
                    ...multipartTypeIds,
                ]),
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
            const sectionsByType = new Map(
                questionSelection.sections.map((section) => [
                    section.questionTypeId,
                    section,
                ]),
            );
            const orLabel =
                chapterMedium === 'Urdu'
                    ? '\u06cc\u0627'
                    : chapterMedium === 'Both'
                      ? 'OR / \u06cc\u0627'
                      : 'OR';

            function selectQuestions(
                questionTypeId: number,
                manualIds: number[],
                target: number,
                title: string,
                mode: SelectionMode,
            ): ManualQuestion[] {
                const pool = pools[questionTypeId] ?? [];
                const selectedQuestions =
                    mode === 'manual'
                        ? manualIds
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
                          ).slice(0, target);

                if (selectedQuestions.length < target) {
                    throw new Error(
                        'Not enough questions found for ' +
                            plainQuestionText(title) +
                            '.',
                    );
                }

                selectedQuestions.forEach((question) =>
                    usedQuestionIds.add(question.id),
                );

                return selectedQuestions;
            }

            function generatedSectionFromSelection(
                sourceSection: QuestionSelectionSection,
                row: QuestionSelectionRow,
                selectedQuestions: ManualQuestion[],
                id: string,
                metadata: Pick<
                    GeneratedPaperSection,
                    | 'orGroupId'
                    | 'orPairingId'
                    | 'orQuestionTypeId'
                    | 'orGroupTypeIds'
                    | 'orRole'
                    | 'orLabel'
                >,
            ): GeneratedPaperSection {
                return {
                    id,
                    questionTypeId: sourceSection.questionTypeId,
                    category: sourceSection.category,
                    title: sourceSection.heading || sourceSection.title,
                    titleEnglish:
                        chapterMedium !== 'Urdu'
                            ? sourceSection.headingEnglish ||
                              sourceSection.titleEnglish ||
                              sourceSection.title
                            : null,
                    titleUrdu:
                        chapterMedium !== 'English'
                            ? sourceSection.headingUrdu ||
                              sourceSection.titleUrdu ||
                              sourceSection.title
                            : null,
                    requiredQuestions: toNumber(row.requiredQuestions),
                    totalQuestions: rowTarget(row),
                    marksEach: toNumber(row.marksPerQuestion),
                    questions: selectedQuestions.map((question) =>
                        paperQuestionFromManual(
                            question,
                            nextPaperQuestionId(),
                        ),
                    ),
                    columns: clampSectionColumns(sourceSection.columnPerRow, 1),
                    ...metadata,
                };
            }

            const standardSections = activeRows.flatMap(
                ({ section, row }): GeneratedPaperSection[] => {
                    const mode = questionSectionSelectionMode(section);
                    const primaryQuestions = selectQuestions(
                        section.questionTypeId,
                        row.selectedQuestionIds,
                        rowTarget(row),
                        section.title,
                        mode,
                    );
                    const alternativeIds = orAlternativeTypeIds(section);
                    const alternatives = alternativeIds
                        .map((typeId) => sectionsByType.get(typeId))
                        .filter(
                            (
                                candidate,
                            ): candidate is QuestionSelectionSection =>
                                candidate !== undefined,
                        );

                    if (
                        alternatives.length === 0 ||
                        typeof section.orPairingId !== 'number'
                    ) {
                        return [
                            generatedSectionFromSelection(
                                section,
                                row,
                                primaryQuestions,
                                section.id + '_' + row.id,
                                {
                                    orGroupId: null,
                                    orPairingId: null,
                                    orQuestionTypeId: null,
                                    orGroupTypeIds: null,
                                    orRole: null,
                                    orLabel: null,
                                },
                            ),
                        ];
                    }

                    const groupId = 'or_' + section.id + '_' + row.id;
                    const groupTypeIds = [
                        section.questionTypeId,
                        ...alternatives.map(
                            (alternative) => alternative.questionTypeId,
                        ),
                    ];
                    const generatedAlternatives = alternatives.map(
                        (alternative) =>
                            generatedSectionFromSelection(
                                alternative,
                                row,
                                selectQuestions(
                                    alternative.questionTypeId,
                                    rowOrSelectedQuestionIds(
                                        row,
                                        alternative.questionTypeId,
                                    ),
                                    rowTarget(row),
                                    alternative.title,
                                    mode,
                                ),
                                section.id +
                                    '_' +
                                    row.id +
                                    '_or_' +
                                    alternative.questionTypeId,
                                {
                                    orGroupId: groupId,
                                    orPairingId: section.orPairingId,
                                    orQuestionTypeId: section.questionTypeId,
                                    orGroupTypeIds: groupTypeIds,
                                    orRole: 'alternative',
                                    orLabel,
                                },
                            ),
                    );

                    return [
                        generatedSectionFromSelection(
                            section,
                            row,
                            primaryQuestions,
                            section.id + '_' + row.id,
                            {
                                orGroupId: groupId,
                                orPairingId: section.orPairingId,
                                orQuestionTypeId:
                                    alternatives[0].questionTypeId,
                                orGroupTypeIds: groupTypeIds,
                                orRole: 'primary',
                                orLabel,
                            },
                        ),
                        ...generatedAlternatives,
                    ];
                },
            );
            const multipartSelections = multipartConfig
                ? (questionSelection.multipart ?? [])
                : [];
            const multipartSections: GeneratedPaperSection[] = multipartConfig
                ? multipartSelections.map((selection) => {
                      const configuredParts = selection.rows.filter(
                          (part) => typeof part.questionTypeId === 'number',
                      );
                      const parts = configuredParts.map((part, partIndex) => {
                          const type = multipartConfig.partTypes.find(
                              (item) => item.id === part.questionTypeId,
                          );
                          const selectedQuestions = selectQuestions(
                              part.questionTypeId as number,
                              part.selectedQuestionIds,
                              1,
                              type?.name ?? 'Multipart question type',
                              selection.selectionMode,
                          );

                          return {
                              key: String.fromCharCode(65 + partIndex),
                              typeId: part.questionTypeId,
                              typeTitle: type?.name ?? 'Question',
                              typeTitleEnglish:
                                  type?.headingEnglish || type?.name,
                              typeTitleUrdu:
                                  type?.headingUrdu || type?.nameUrdu,
                              marksEach: toNumber(part.marksPerQuestion),
                              question: paperQuestionFromManual(
                                  selectedQuestions[0],
                                  nextPaperQuestionId('multipart_q'),
                              ),
                          };
                      });
                      const marksEach = parts.reduce(
                          (sum, part) => sum + part.marksEach,
                          0,
                      );

                      return {
                          id: `multipart_${selection.id}`,
                          questionTypeId: null,
                          category: 'Subjective Questions',
                          title:
                              multipartConfig.headingEnglish ||
                              'Multipart questions',
                          titleEnglish:
                              chapterMedium !== 'Urdu'
                                  ? multipartConfig.headingEnglish ||
                                    'Multipart questions'
                                  : null,
                          titleUrdu:
                              chapterMedium !== 'English'
                                  ? multipartConfig.headingUrdu
                                  : null,
                          requiredQuestions: parts.length,
                          totalQuestions: 1,
                          marksEach,
                          questions: [],
                          columns: 1,
                          multipart: {
                              choiceCount: 1,
                              marksEach,
                              groupId: 'multipart_group',
                              groupChoiceCount:
                                  typeof questionSelection.multipartChoiceCount ===
                                  'number'
                                      ? questionSelection.multipartChoiceCount
                                      : null,
                              groupQuestionCount: multipartSelections.length,
                              headingEnglish: multipartConfig.headingEnglish,
                              headingUrdu: multipartConfig.headingUrdu,
                              rows: [{ parts }],
                          },
                          orGroupId: null,
                          orPairingId: null,
                          orQuestionTypeId: null,
                          orGroupTypeIds: null,
                          orRole: null,
                          orLabel: null,
                      };
                  })
                : [];
            const sections: GeneratedPaperSection[] = [
                ...standardSections,
                ...multipartSections,
            ];
            setQuestionPoolsByType(pools);
            setGeneratedPaper({
                id: `paper_${Date.now()}`,
                header: {
                    schoolName:
                        (auth.user.school_name as string) ||
                        auth.user.name ||
                        'School Name',
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
        setQuestionSelection(
            normalizeQuestionSelection(draft.questionSelection),
        );
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
            (
                document.querySelector(
                    'meta[name="csrf-token"]',
                ) as HTMLMetaElement
            )?.content ?? '';

        const structure = {
            sections: generatedPaper.sections.map((section) => ({
                questionTypeId: section.questionTypeId,
                category: section.category,
                title: section.title,
                requiredQuestions: section.requiredQuestions,
                totalQuestions: section.totalQuestions,
                marksEach: section.marksEach,
                columns: section.columns ?? null,
                orPairingId: section.orPairingId ?? null,
                orQuestionTypeId: section.orQuestionTypeId ?? null,
                orGroupTypeIds: section.orGroupTypeIds ?? null,
                orRole: section.orRole ?? null,
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
                error instanceof Error
                    ? error.message
                    : 'Failed to save template.',
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

        const target = generatedPaper.sections.find(
            (section) => section.id === sectionId,
        );

        if (!target?.questionTypeId) {
            return;
        }

        const affectedSections = target.orGroupId
            ? generatedPaper.sections.filter(
                  (section) => section.orGroupId === target.orGroupId,
              )
            : [target];
        const reservedQuestionIds = new Set(generatedSourceQuestionIds);
        const additions = new Map<string, GeneratedPaperQuestion>();

        for (const section of affectedSections) {
            if (!section.questionTypeId) {
                return;
            }

            const candidates = (
                questionPoolsByType[section.questionTypeId] ?? []
            ).filter((question) => !reservedQuestionIds.has(question.id));
            const nextQuestion = shuffledQuestions(candidates)[0];

            if (!nextQuestion) {
                toast.error(
                    target.orGroupId
                        ? 'Both OR alternatives need an unused question before the choice count can increase.'
                        : 'No unused questions are available for this section.',
                );

                return;
            }

            reservedQuestionIds.add(nextQuestion.id);
            additions.set(
                section.id,
                paperQuestionFromManual(nextQuestion, nextPaperQuestionId()),
            );
        }

        setGeneratedPaper((current) =>
            current
                ? {
                      ...current,
                      sections: current.sections.map((section) => {
                          const addition = additions.get(section.id);

                          return addition
                              ? {
                                    ...section,
                                    totalQuestions: section.totalQuestions + 1,
                                    questions: [...section.questions, addition],
                                }
                              : section;
                      }),
                  }
                : current,
        );
    }

    function addCustomPaperQuestion(sectionId: string) {
        setGeneratedPaper((current) => {
            if (!current) {
                return current;
            }

            const target = current.sections.find(
                (section) => section.id === sectionId,
            );

            if (!target) {
                return current;
            }

            return {
                ...current,
                sections: current.sections.map((section) => {
                    const belongsToTarget =
                        section.id === target.id ||
                        (target.orGroupId &&
                            section.orGroupId === target.orGroupId);

                    return belongsToTarget
                        ? {
                              ...section,
                              totalQuestions: section.totalQuestions + 1,
                              questions: [
                                  ...section.questions,
                                  createCustomPaperQuestion(
                                      nextPaperQuestionId('custom_q'),
                                  ),
                              ],
                          }
                        : section;
                }),
            };
        });
    }

    function removePaperQuestion(sectionId: string, questionId: string) {
        setGeneratedPaper((current) => {
            if (!current) {
                return current;
            }

            const target = current.sections.find(
                (section) => section.id === sectionId,
            );
            const questionIndex = target?.questions.findIndex(
                (question) => question.id === questionId,
            );

            if (!target || questionIndex === undefined || questionIndex < 0) {
                return current;
            }

            return {
                ...current,
                sections: current.sections.map((section) => {
                    const belongsToTarget =
                        section.id === target.id ||
                        (target.orGroupId &&
                            section.orGroupId === target.orGroupId);

                    if (!belongsToTarget) {
                        return section;
                    }

                    const questions = section.questions.filter(
                        (_, index) => index !== questionIndex,
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
            };
        });
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
                      sections: current.sections.map((section) => {
                          const sameOrGroup =
                              activePaperSectionEditorContext.orGroupId &&
                              section.orGroupId ===
                                  activePaperSectionEditorContext.orGroupId;
                          const isEditedSection =
                              section.id === activePaperSectionEditorContext.id;

                          if (!isEditedSection && !sameOrGroup) {
                              return section;
                          }

                          return {
                              ...section,
                              title: isEditedSection
                                  ? values.title
                                  : section.title,
                              requiredQuestions: Math.min(
                                  values.requiredQuestions,
                                  section.questions.length,
                              ),
                              marksEach: values.marksEach,
                          };
                      }),
                  }
                : current,
        );
        closePaperSectionEditor();
    }

    function deletePaperSection(sectionId: string) {
        setGeneratedPaper((current) => {
            if (!current) {
                return current;
            }

            const target = current.sections.find(
                (section) => section.id === sectionId,
            );
            const groupId = target?.orGroupId;

            return {
                ...current,
                sections: current.sections.filter((section) =>
                    groupId
                        ? section.orGroupId !== groupId
                        : section.id !== sectionId,
                ),
            };
        });
    }

    function movePaperSection(sectionId: string, direction: -1 | 1) {
        setGeneratedPaper((current) => {
            if (!current) {
                return current;
            }

            const target = current.sections.find(
                (section) => section.id === sectionId,
            );

            if (!target || target.orRole === 'alternative') {
                return current;
            }

            const blocks = current.sections.reduce<GeneratedPaperSection[][]>(
                (groups, section) => {
                    const groupKey = section.orGroupId ?? section.id;
                    const lastGroup = groups.at(-1);
                    const lastKey =
                        lastGroup?.[0]?.orGroupId ?? lastGroup?.[0]?.id;

                    if (lastGroup && lastKey === groupKey) {
                        lastGroup.push(section);
                    } else {
                        groups.push([section]);
                    }

                    return groups;
                },
                [],
            );
            const targetKey = target.orGroupId ?? target.id;
            const currentIndex = blocks.findIndex(
                (block) => (block[0]?.orGroupId ?? block[0]?.id) === targetKey,
            );
            const nextIndex = currentIndex + direction;

            if (
                currentIndex === -1 ||
                nextIndex < 0 ||
                nextIndex >= blocks.length
            ) {
                return current;
            }

            const reordered = [...blocks];
            [reordered[currentIndex], reordered[nextIndex]] = [
                reordered[nextIndex],
                reordered[currentIndex],
            ];

            return {
                ...current,
                sections: reordered.flat(),
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
                                                  ).map((passageQuestion) => ({
                                                      ...passageQuestion,
                                                      options: shuffleItems(
                                                          passageQuestion.options,
                                                      ),
                                                  }))
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
            titleEnglish:
                chapterMedium !== 'Urdu'
                    ? questionType.headingEnglish ||
                      questionType.titleEnglish ||
                      questionType.title
                    : null,
            titleUrdu:
                chapterMedium !== 'English'
                    ? questionType.headingUrdu ||
                      questionType.titleUrdu ||
                      questionType.title
                    : null,
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
            side,
            alternativeTypeId,
        } = activeManualPickerRow;

        if (
            activeSection.id.startsWith('multipart_') &&
            activeManualPickerRow.multipartSelectionId
        ) {
            const selectionId = activeManualPickerRow.multipartSelectionId;

            setQuestionSelection((current) =>
                withTotalMarks({
                    ...current,
                    multipart: current.multipart?.map((selection) =>
                        selection.id === selectionId
                            ? {
                                  ...selection,
                                  rows: selection.rows.map((part) =>
                                      part.id === activeRow.id
                                          ? {
                                                ...part,
                                                selectedQuestionIds:
                                                    part.selectedQuestionIds.includes(
                                                        questionId,
                                                    )
                                                        ? part.selectedQuestionIds.filter(
                                                              (id) =>
                                                                  id !==
                                                                  questionId,
                                                          )
                                                        : [
                                                              ...part.selectedQuestionIds,
                                                              questionId,
                                                          ],
                                            }
                                          : part,
                                  ),
                              }
                            : selection,
                    ),
                }),
            );

            return;
        }

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

                              const selectedIds =
                                  side === 'alternative' &&
                                  typeof alternativeTypeId === 'number'
                                      ? rowOrSelectedQuestionIds(
                                            row,
                                            alternativeTypeId,
                                        )
                                      : row.selectedQuestionIds;
                              const isSelected =
                                  selectedIds.includes(questionId);

                              if (isSelected) {
                                  const nextIds = selectedIds.filter(
                                      (id) => id !== questionId,
                                  );

                                  if (
                                      side === 'alternative' &&
                                      typeof alternativeTypeId === 'number'
                                  ) {
                                      const nextByType = {
                                          ...(row.orSelectedQuestionIdsByType ??
                                              {}),
                                          [String(alternativeTypeId)]: nextIds,
                                      };

                                      return {
                                          ...row,
                                          orSelectedQuestionIdsByType:
                                              nextByType,
                                          orSelectedQuestionIds:
                                              orAlternativeTypeIds(
                                                  activeSection,
                                              )[0] === alternativeTypeId
                                                  ? nextIds
                                                  : row.orSelectedQuestionIds,
                                      };
                                  }

                                  return {
                                      ...row,
                                      selectedQuestionIds: nextIds,
                                  };
                              }

                              if (
                                  selectedManualQuestionIds.has(questionId) ||
                                  selectedIds.length >= target
                              ) {
                                  return row;
                              }

                              const nextIds = [...selectedIds, questionId];

                              if (
                                  side === 'alternative' &&
                                  typeof alternativeTypeId === 'number'
                              ) {
                                  const nextByType = {
                                      ...(row.orSelectedQuestionIdsByType ??
                                          {}),
                                      [String(alternativeTypeId)]: nextIds,
                                  };

                                  return {
                                      ...row,
                                      orSelectedQuestionIdsByType: nextByType,
                                      orSelectedQuestionIds:
                                          orAlternativeTypeIds(
                                              activeSection,
                                          )[0] === alternativeTypeId
                                              ? nextIds
                                              : row.orSelectedQuestionIds,
                                  };
                              }

                              return { ...row, selectedQuestionIds: nextIds };
                          }),
                      }
                    : section,
            ),
        }));
    }
    function updateOrGroupTypes(sectionId: string, selectedTypeIds: number[]) {
        const selectedIds = Array.from(new Set(selectedTypeIds));

        if (selectedIds.length < 2) {
            updateOrPairing(sectionId, null);

            return;
        }

        setQuestionSelection((current) => {
            const primary = current.sections.find(
                (section) => section.id === sectionId,
            );

            if (!primary) {
                return current;
            }

            const normalizedIds = Array.from(
                new Set([primary.questionTypeId, ...selectedIds]),
            );
            const group = questionTypePairings.find((candidate) =>
                normalizedIds.every((typeId) =>
                    candidate.questionTypeIds.includes(typeId),
                ),
            );

            if (!group) {
                return current;
            }

            const groupMemberIds = new Set(group.questionTypeIds);
            const groupMembers = current.sections.filter((section) =>
                groupMemberIds.has(section.questionTypeId),
            );
            const currentGroupId = primary.orPairingId;
            const conflicts = groupMembers.some(
                (section) =>
                    section.id !== primary.id &&
                    typeof section.orPairingId === 'number' &&
                    section.orPairingId !== currentGroupId,
            );

            if (
                groupMembers.length !== group.questionTypeIds.length ||
                groupMembers.some(
                    (section) => section.category !== 'Subjective Questions',
                ) ||
                conflicts
            ) {
                return current;
            }

            const selectedMemberIds = normalizedIds.filter((typeId) =>
                groupMemberIds.has(typeId),
            );
            const alternativeIds = selectedMemberIds.filter(
                (typeId) => typeId !== primary.questionTypeId,
            );
            const availableCount = Math.min(
                ...selectedMemberIds.map(
                    (typeId) =>
                        current.sections.find(
                            (section) => section.questionTypeId === typeId,
                        )?.availableCount ?? 0,
                ),
            );
            const clearGroupState = (section: QuestionSelectionSection) => ({
                ...section,
                orPairingId: null,
                orQuestionTypeId: null,
                orGroupTypeIds: undefined,
                orAlternativeQuestionTypeIds: undefined,
                rows: section.rows.map((row) => ({
                    ...row,
                    orSelectedQuestionIds: [],
                    orSelectedQuestionIdsByType: {},
                })),
            });
            const nextByType = Object.fromEntries(
                alternativeIds.map((typeId) => [String(typeId), []]),
            );

            return withTotalMarks({
                ...current,
                sections: current.sections
                    .map((section) =>
                        groupMemberIds.has(section.questionTypeId) ||
                        (typeof currentGroupId === 'number' &&
                            section.orPairingId === currentGroupId)
                            ? clearGroupState(section)
                            : section,
                    )
                    .map((section) =>
                        section.id === primary.id
                            ? {
                                  ...section,
                                  orPairingId: group.id,
                                  orQuestionTypeId: alternativeIds[0] ?? null,
                                  orGroupTypeIds: selectedMemberIds,
                                  orAlternativeQuestionTypeIds: alternativeIds,
                                  rows: normalizeSectionRows(
                                      section.rows,
                                      availableCount,
                                  ).map((row) => ({
                                      ...row,
                                      orSelectedQuestionIds: [],
                                      orSelectedQuestionIdsByType: nextByType,
                                  })),
                              }
                            : section,
                    ),
            });
        });
    }
    function updateOrPairing(sectionId: string, pairingId: number | null) {
        if (
            manualPickerTarget?.sectionId === sectionId &&
            manualPickerTarget.side === 'alternative'
        ) {
            closeManualQuestionPicker();
        }

        setQuestionSelection((current) => {
            const primary = current.sections.find(
                (section) => section.id === sectionId,
            );

            if (!primary) {
                return current;
            }

            const currentMemberIds = new Set(orGroupTypeIds(primary));
            const clearGroupState = (section: QuestionSelectionSection) => ({
                ...section,
                orPairingId: null,
                orQuestionTypeId: null,
                orGroupTypeIds: undefined,
                orAlternativeQuestionTypeIds: undefined,
                rows: section.rows.map((row) => ({
                    ...row,
                    orSelectedQuestionIds: [],
                    orSelectedQuestionIdsByType: {},
                })),
            });

            if (pairingId === null) {
                return withTotalMarks({
                    ...current,
                    sections: current.sections.map((section) =>
                        section.id === primary.id ||
                        currentMemberIds.has(section.questionTypeId) ||
                        section.orPairingId === primary.orPairingId
                            ? clearGroupState(section)
                            : section,
                    ),
                });
            }

            const group = questionTypePairings.find(
                (candidate) => candidate.id === pairingId,
            );
            const memberIds = group?.questionTypeIds ?? [];
            const members = memberIds.map((id) =>
                current.sections.find(
                    (section) => section.questionTypeId === id,
                ),
            );

            if (
                !group ||
                memberIds.length < 2 ||
                members.some(
                    (section) =>
                        !section || section.category !== 'Subjective Questions',
                )
            ) {
                return current;
            }

            const memberIdSet = new Set(memberIds);
            const conflicts = current.sections.some(
                (section) =>
                    memberIdSet.has(section.questionTypeId) &&
                    typeof section.orPairingId === 'number' &&
                    section.orPairingId !== pairingId,
            );

            if (conflicts) {
                return current;
            }

            const availableCount = Math.min(
                ...members.map((section) => section?.availableCount ?? 0),
            );
            const alternativeIds = memberIds.filter(
                (id) => id !== primary.questionTypeId,
            );
            const nextByType = Object.fromEntries(
                alternativeIds.map((typeId) => [String(typeId), []]),
            );

            return withTotalMarks({
                ...current,
                sections: current.sections
                    .map((section) => {
                        const isMember = memberIdSet.has(
                            section.questionTypeId,
                        );
                        const isCurrentGroup =
                            section.orPairingId === primary.orPairingId &&
                            typeof primary.orPairingId === 'number';

                        if (isMember || isCurrentGroup) {
                            return clearGroupState(section);
                        }

                        return section;
                    })
                    .map((section) =>
                        section.id === primary.id
                            ? {
                                  ...section,
                                  orPairingId: group.id,
                                  orQuestionTypeId: alternativeIds[0] ?? null,
                                  orGroupTypeIds: memberIds,
                                  orAlternativeQuestionTypeIds: alternativeIds,
                                  rows: normalizeSectionRows(
                                      section.rows,
                                      availableCount,
                                  ).map((row) => ({
                                      ...row,
                                      orSelectedQuestionIds: [],
                                      orSelectedQuestionIdsByType: nextByType,
                                  })),
                              }
                            : section,
                    ),
            });
        });
    }
    function updateGlobalFilter(key: SourceFilterKey) {
        setQuestionSelection((current) => ({
            ...current,
            globalFilters: {
                ...current.globalFilters,
                [key]: !(current.globalFilters[key] ?? key === 'exercise'),
            },
            sections: current.sections.map((section) => ({
                ...section,
                rows: section.rows.map((row) => ({
                    ...row,
                    selectedQuestionIds: [],
                    orSelectedQuestionIds: [],
                    orSelectedQuestionIdsByType: {},
                })),
            })),
            multipart: current.multipart?.map((selection) => ({
                ...selection,
                rows: selection.rows.map((part) => ({
                    ...part,
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
                    orSelectedQuestionIds: [],
                    orSelectedQuestionIdsByType: {},
                })),
            })),
            multipart: current.multipart?.map((selection) => ({
                ...selection,
                rows: selection.rows.map((part) => ({
                    ...part,
                    selectedQuestionIds: [],
                })),
            })),
        }));
    }

    function sourceChecked(value: string) {
        return questionSelection.globalFilters[value] ?? value === 'exercise';
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

                                  const alternative =
                                      typeof section.orQuestionTypeId ===
                                      'number'
                                          ? current.sections.find(
                                                (candidate) =>
                                                    candidate.questionTypeId ===
                                                    section.orQuestionTypeId,
                                            )
                                          : null;
                                  const effectiveSection = alternative
                                      ? {
                                            ...section,
                                            availableCount: Math.min(
                                                section.availableCount,
                                                alternative.availableCount,
                                            ),
                                        }
                                      : section;

                                  return normalizeQuestionRow(
                                      {
                                          ...row,
                                          [field]: value,
                                      },
                                      availableForQuestionRow(
                                          effectiveSection,
                                          rowId,
                                      ),
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
            (section) =>
                section.category === category &&
                !foldedAlternativeTypeIds.has(section.questionTypeId),
        );
        const sectionsByType = new Map(
            questionSelection.sections.map((section) => [
                section.questionTypeId,
                section,
            ]),
        );

        if (sections.length === 0) {
            return null;
        }

        return (
            <div className="space-y-2.5">
                <CategoryDivider title={category} />
                <div className="space-y-2.5">
                    {sections.map((section) => {
                        const orTypeOptions: OrTypeOption[] =
                            category === 'Subjective Questions'
                                ? (() => {
                                      const candidateGroups =
                                          questionTypePairings.filter(
                                              (group) => {
                                                  if (
                                                      !group.questionTypeIds.includes(
                                                          section.questionTypeId,
                                                      )
                                                  ) {
                                                      return false;
                                                  }

                                                  const members =
                                                      group.questionTypeIds
                                                          .map((typeId) =>
                                                              sectionsByType.get(
                                                                  typeId,
                                                              ),
                                                          )
                                                          .filter(
                                                              (
                                                                  candidate,
                                                              ): candidate is QuestionSelectionSection =>
                                                                  candidate !==
                                                                  undefined,
                                                          );

                                                  return (
                                                      members.length ===
                                                          group.questionTypeIds
                                                              .length &&
                                                      !members.some(
                                                          (candidate) =>
                                                              typeof candidate.orPairingId ===
                                                                  'number' &&
                                                              candidate.orPairingId !==
                                                                  section.orPairingId,
                                                      )
                                                  );
                                              },
                                          );
                                      const selectedTypeIds = new Set(
                                          orGroupTypeIds(section),
                                      );
                                      const optionIds = new Set<number>();

                                      candidateGroups.forEach((group) => {
                                          group.questionTypeIds.forEach(
                                              (typeId) => {
                                                  if (
                                                      typeId !==
                                                      section.questionTypeId
                                                  ) {
                                                      optionIds.add(typeId);
                                                  }
                                              },
                                          );
                                      });

                                      return Array.from(optionIds)
                                          .map((typeId) => {
                                              const member =
                                                  sectionsByType.get(typeId);

                                              if (!member) {
                                                  return null;
                                              }

                                              const canSelect =
                                                  candidateGroups.some(
                                                      (group) => {
                                                          const proposed =
                                                              new Set([
                                                                  ...selectedTypeIds,
                                                                  typeId,
                                                              ]);

                                                          return Array.from(
                                                              proposed,
                                                          ).every(
                                                              (candidateId) =>
                                                                  group.questionTypeIds.includes(
                                                                      candidateId,
                                                                  ),
                                                          );
                                                      },
                                                  );

                                              return {
                                                  id: typeId,
                                                  label: plainQuestionText(
                                                      englishQuestionTypeTitle(
                                                          member,
                                                      ),
                                                  ),
                                                  disabled:
                                                      !selectedTypeIds.has(
                                                          typeId,
                                                      ) && !canSelect,
                                              } satisfies OrTypeOption;
                                          })
                                          .filter(
                                              (
                                                  option,
                                              ): option is {
                                                  id: number;
                                                  label: string;
                                                  disabled: boolean;
                                              } => option !== null,
                                          )
                                          .sort((left, right) =>
                                              left.label.localeCompare(
                                                  right.label,
                                              ),
                                          );
                                  })()
                                : [];
                        const alternativeSections = orAlternativeTypeIds(
                            section,
                        )
                            .map((typeId) => sectionsByType.get(typeId))
                            .filter(
                                (
                                    candidate,
                                ): candidate is QuestionSelectionSection =>
                                    candidate !== undefined,
                            );

                        return (
                            <QuestionSelectionCard
                                key={section.id}
                                section={section}
                                alternativeSections={alternativeSections}
                                orTypeOptions={orTypeOptions}
                                selectedOrTypeIds={orGroupTypeIds(section)}
                                autoPick={
                                    questionSectionSelectionMode(section) ===
                                    'automatic'
                                }
                                onAutoPickChange={handleAutoPickChange}
                                onOrGroupTypesChange={updateOrGroupTypes}
                                onChange={updateSectionValue}
                                onDeleteRow={deleteQuestionRow}
                                onAddRow={addQuestionRow}
                                onOpenManualPicker={openManualQuestionPicker}
                                isDragging={
                                    draggedQuestionTypeId === section.id
                                }
                                isDragTarget={
                                    dragOverQuestionTypeId === section.id &&
                                    draggedQuestionTypeId !== section.id
                                }
                                onDragStart={handleQuestionTypeDragStart}
                                onDragOver={handleQuestionTypeDragOver}
                                onDrop={handleQuestionTypeDrop}
                                onDragEnd={handleQuestionTypeDragEnd}
                            />
                        );
                    })}
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
                                key={
                                    activePaperQuestionEditorContext.question.id
                                }
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
                            defaultName={
                                savedPaperName ||
                                defaultPaperName() ||
                                'My Template'
                            }
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
                                            <RichTextLabel
                                                value={
                                                    recoveryDraft.meta.subject
                                                        .label
                                                }
                                            />{' '}
                                            &middot;{' '}
                                            <RichTextLabel
                                                value={
                                                    recoveryDraft.meta.klass
                                                        .label
                                                }
                                            />{' '}
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
                                                                    .flatMap(
                                                                        (
                                                                            group,
                                                                        ) =>
                                                                            group.items,
                                                                    )
                                                                    .map(
                                                                        renderChapterCard,
                                                                    )}
                                                            </div>
                                                            <div className="hidden gap-4 lg:grid lg:grid-cols-2">
                                                                <div className="space-y-4">
                                                                    {topicWiseColumns[0].map(
                                                                        renderChapterCard,
                                                                    )}
                                                                </div>
                                                                <div className="space-y-4">
                                                                    {topicWiseColumns[1].map(
                                                                        renderChapterCard,
                                                                    )}
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
                                                        {[
                                                            pattern,
                                                            klass,
                                                            subject,
                                                        ].map(
                                                            (item) =>
                                                                item && (
                                                                    <span
                                                                        key={
                                                                            item.id
                                                                        }
                                                                        className="inline-flex h-7 max-w-full items-center rounded-md bg-brand-50 px-2 text-[11px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                                                                    >
                                                                        <span className="truncate">
                                                                            {
                                                                                item.label
                                                                            }
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
                                        !multipartConfig &&
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
                                        !questionSectionError &&
                                        renderQuestionCategory(
                                            'Objective Questions',
                                        )}
                                    {!loadingQuestionSections &&
                                        !questionSectionError &&
                                        renderQuestionCategory(
                                            'Subjective Questions',
                                        )}

                                    {!loadingQuestionSections &&
                                    !questionSectionError &&
                                    multipartConfig &&
                                    questionSelection.multipart?.length ? (
                                        <div className="space-y-2.5">
                                            <CategoryDivider
                                                title="Multi Part Questions"
                                                action={
                                                    <div className="flex items-center gap-2">
                                                        <MultipartChoiceControl
                                                            value={
                                                                questionSelection.multipartChoiceCount ??
                                                                null
                                                            }
                                                            count={
                                                                questionSelection
                                                                    .multipart
                                                                    .length
                                                            }
                                                            onChange={
                                                                handleMultipartChoiceChange
                                                            }
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={
                                                                addMultipartCard
                                                            }
                                                            aria-label="Add another multipart card"
                                                            title="Add another multipart card"
                                                            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg border border-brand-200 bg-white text-brand-700 transition-colors hover:bg-brand-50 dark:border-brand-500/30 dark:bg-slate-900 dark:text-brand-200 dark:hover:bg-slate-500/10"
                                                        >
                                                            <PlusIcon className="size-3.5" />
                                                        </button>
                                                    </div>
                                                }
                                            />
                                            {multipartChoiceHasMismatch && (
                                                <p className="-mt-1 text-xs text-rose-600 dark:text-rose-400">
                                                    Multipart questions must
                                                    have the same total marks
                                                    when a choice is selected.
                                                </p>
                                            )}
                                            {questionSelection.multipart.map(
                                                (multipart) => (
                                                    <MultipartSelectionCard
                                                        key={multipart.id}
                                                        config={multipartConfig}
                                                        value={multipart}
                                                        onChange={(
                                                            nextMultipart,
                                                        ) =>
                                                            setQuestionSelection(
                                                                (current) =>
                                                                    withTotalMarks(
                                                                        {
                                                                            ...current,
                                                                            multipart:
                                                                                current.multipart?.map(
                                                                                    (
                                                                                        selection,
                                                                                    ) =>
                                                                                        selection.id ===
                                                                                        multipart.id
                                                                                            ? nextMultipart
                                                                                            : selection,
                                                                                ),
                                                                        },
                                                                    ),
                                                            )
                                                        }
                                                        onAutoPickChange={(
                                                            enabled,
                                                        ) =>
                                                            handleMultipartAutoPickChange(
                                                                multipart.id,
                                                                enabled,
                                                            )
                                                        }
                                                        onOpenManualPicker={(
                                                            rowId,
                                                        ) =>
                                                            openManualQuestionPicker(
                                                                `multipart_${multipart.id}_${rowId}`,
                                                                rowId,
                                                            )
                                                        }
                                                    />
                                                ),
                                            )}
                                        </div>
                                    ) : null}
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
    const activeSelectedCount = activeRow.selectedQuestionIds.length;
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
                                    {activeRow.side === 'alternative'
                                        ? 'OR: '
                                        : ''}
                                    <RichTextLabel value={activeRow.title} />
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <span className="inline-flex h-9 items-center rounded-lg bg-brand-50 px-3 text-sm font-semibold text-brand-700 tabular-nums dark:bg-brand-500/10 dark:text-brand-300">
                            {activeSelectedCount}/{activeRow.target}
                        </span>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close question picker"
                            title="Close"
                            className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
                            'inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:outline-none',
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
                                            'group flex w-full cursor-pointer items-start gap-3 rounded-xl border border-l-4 bg-white p-3 text-left transition-[border-color,box-shadow,opacity] focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:outline-none dark:bg-slate-900',
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
                                                        dir={
                                                            displayMedium ===
                                                            'Urdu'
                                                                ? 'rtl'
                                                                : 'ltr'
                                                        }
                                                        className={cn(
                                                            'block text-[13px] leading-5 font-medium text-slate-800 dark:text-slate-100',
                                                            displayMedium ===
                                                                'Urdu' &&
                                                                'text-right',
                                                        )}
                                                    >
                                                        <RichTextLabel
                                                            value={manualQuestionDisplayHtmlForMedium(
                                                                question,
                                                                displayMedium,
                                                            )}
                                                        />
                                                    </span>
                                                </span>
                                                {isBilingual && (
                                                    <span
                                                        dir="rtl"
                                                        className="min-w-0 text-right md:border-l md:border-slate-200 md:pl-3 dark:md:border-slate-700"
                                                    >
                                                        <span className="block text-[13px] leading-6 font-medium text-slate-800 dark:text-slate-100">
                                                            <RichTextLabel
                                                                value={manualQuestionDisplayHtmlForMedium(
                                                                    question,
                                                                    'Urdu',
                                                                )}
                                                            />
                                                        </span>
                                                    </span>
                                                )}
                                            </span>
                                            <span className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                                                    <RichTextLabel
                                                        value={manualQuestionChapterLabel(
                                                            question,
                                                        )}
                                                    />
                                                </span>
                                                {question.topic && (
                                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                                                        <RichTextLabel
                                                            value={
                                                                question.topic
                                                                    .name
                                                            }
                                                        />
                                                    </span>
                                                )}
                                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                                                    <RichTextLabel
                                                        value={
                                                            question.sourceLabel ??
                                                            question.source ??
                                                            'No source'
                                                        }
                                                    />
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
                        className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:outline-none active:bg-brand-800 dark:bg-brand-500 dark:hover:bg-brand-400"
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
                searchLabel: plainQuestionText(type.title),
                displayLabel: (
                    <QuestionContent as="span" inline value={type.title} />
                ),
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
                            <input
                                autoComplete="off"
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
                            <input
                                autoComplete="off"
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
                            <input
                                autoComplete="off"
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
                            <RichTextLabel value={chapterLabel} />
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
                        <RichTextLabel
                            value={manualQuestionDisplayHtml(question)}
                        />
                    </span>
                    {options.length > 0 && (
                        <span className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 xl:grid-cols-4 dark:text-slate-300">
                            {options.map((option) => (
                                <span key={option.id}>
                                    <RichTextLabel value={option.text} />
                                </span>
                            ))}
                        </span>
                    )}
                    <span className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {question.topic && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                                <RichTextLabel value={question.topic.name} />
                            </span>
                        )}
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                            <RichTextLabel
                                value={
                                    question.sourceLabel ??
                                    question.source ??
                                    'No source'
                                }
                            />
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
                                    <RichTextLabel value={chapter.name} />
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
                                            <RichTextLabel value={topic.name} />
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

function OrGroupDivider({
    label,
    settings,
    orientation = 'horizontal',
}: {
    label: string;
    settings: PaperSettings;
    orientation?: 'horizontal' | 'vertical';
}) {
    const showLine = settings.orGroupDividerStyle === 'line';
    const showBadge = settings.orGroupDividerStyle === 'badge';
    const marker = (
        <span
            className={cn(
                'shrink-0 font-bold',
                showBadge && 'rounded-full border px-1.5 py-0.5',
                !showBadge && 'px-1',
            )}
            style={showBadge ? { borderColor: settings.textColor } : undefined}
        >
            {label}
        </span>
    );
    const sharedStyle = {
        color: settings.textColor,
        fontSize: String(settings.headingSize) + 'px',
        lineHeight: settings.headingLineHeight,
    };

    if (orientation === 'vertical') {
        return (
            <div
                role="separator"
                aria-label="OR alternative"
                className="flex min-h-[2rem] items-stretch justify-center self-stretch"
                style={sharedStyle}
            >
                <div className="flex flex-col items-center justify-center">
                    {showLine && (
                        <span
                            className="w-px flex-1"
                            style={{ backgroundColor: settings.textColor }}
                        />
                    )}
                    {marker}
                    {showLine && (
                        <span
                            className="w-px flex-1"
                            style={{ backgroundColor: settings.textColor }}
                        />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            role="separator"
            aria-label="OR alternative"
            className="flex items-center justify-center gap-2 py-0.5"
            style={sharedStyle}
        >
            {showLine && (
                <span
                    className="h-px flex-1"
                    style={{ backgroundColor: settings.textColor }}
                />
            )}
            {marker}
            {showLine && (
                <span
                    className="h-px flex-1"
                    style={{ backgroundColor: settings.textColor }}
                />
            )}
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
    const [isSetsMenuOpen, setIsSetsMenuOpen] = useState(false);
    const setsMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isSetsMenuOpen) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (!setsMenuRef.current?.contains(event.target as Node)) {
                setIsSetsMenuOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);

        return () =>
            document.removeEventListener('pointerdown', handlePointerDown);
    }, [isSetsMenuOpen]);

    // Compose a per-character font-family cascade — Latin glyphs get the
    // English font, Urdu glyphs fall through to the Urdu font automatically.
    const englishStack: Record<string, string> = {
        sans: '"Montserrat", system-ui, -apple-system, sans-serif',
        serif: 'Cambria, Georgia, "Times New Roman", serif',
        mono: 'ui-monospace, "Cascadia Code", Consolas, "Liberation Mono", monospace',
    };
    const urduStack: Record<string, string> = {
        'jameel-noori':
            '"Jameel Noori Nastaleeq", "Urdu Typesetting", "Noto Nastaliq Urdu", serif',
        'noto-nastaliq':
            '"Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", "Urdu Typesetting", serif',
        'mehr-nastaliq':
            '"Mehr Nastaliq Web", "Arabic Typesetting", "Urdu Typesetting", serif',
    };
    const pageDims = getPageDimensions(
        settings.paperSize,
        settings.orientation,
    );
    const urduMetrics = PAPER_URDU_FONT_METRICS[settings.urduFont];
    const paperShellStyle = {
        fontFamily: `${englishStack[settings.englishFont]}, ${urduStack[settings.urduFont]}`,
        color: settings.textColor,
        width: `${pageDims.width}mm`,
        minHeight: `${pageDims.height}mm`,
        paddingTop: `${settings.marginTop}mm`,
        paddingRight: `${settings.marginRight}mm`,
        paddingBottom: `${settings.marginBottom}mm`,
        '--paper-header-padding-x': String(settings.headerPaddingX) + 'px',
        '--paper-urdu-font': urduStack[settings.urduFont],
        '--paper-urdu-vertical-offset': `${urduMetrics.verticalOffsetEm}em`,
        '--paper-urdu-header-size': `${settings.headerSize * urduMetrics.sizeScale}px`,
        '--paper-urdu-header-line-height':
            settings.headerLineHeight * urduMetrics.lineHeightScale,
        '--paper-urdu-heading-size': `${settings.headingSize * urduMetrics.sizeScale}px`,
        '--paper-urdu-heading-line-height':
            settings.headingLineHeight * urduMetrics.lineHeightScale,
        '--paper-urdu-question-size': `${settings.questionSize * urduMetrics.sizeScale}px`,
        '--paper-urdu-question-line-height':
            settings.questionLineHeight * urduMetrics.lineHeightScale,
        '--paper-header-padding-y': String(settings.headerPaddingY) + 'px',
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

    function renderPaperSection(
        targetPaper: GeneratedPaper,
        section: GeneratedPaperSection,
        sectionIndex: number,
        interactive: boolean,
        canMoveUp: boolean,
        canMoveDown: boolean,
    ): ReactNode {
        if (section.multipart) {
            const firstMultipartIndex = targetPaper.sections.findIndex(
                (candidate) =>
                    candidate.multipart !== null &&
                    candidate.multipart !== undefined,
            );

            return (
                <MultipartSection
                    section={section}
                    headingNumber={sectionHeadingNumber(
                        targetPaper.sections,
                        sectionIndex,
                    )}
                    showHeading={sectionIndex === firstMultipartIndex}
                />
            );
        }

        const Template = pickSectionTemplate(
            settings.questionLayout,
            section.category,
        );

        return (
            <Template
                section={section}
                index={sectionIndex}
                headingNumber={sectionHeadingNumber(
                    targetPaper.sections,
                    sectionIndex,
                )}
                numberingFormat={settings.questionNumberingFormat}
                canMoveUp={interactive && canMoveUp}
                canMoveDown={interactive && canMoveDown}
                onEditSection={interactive ? onEditSection : () => {}}
                onDeleteSection={interactive ? onDeleteSection : () => {}}
                onMoveUp={
                    interactive
                        ? (sectionId) => onMoveSection(sectionId, -1)
                        : () => {}
                }
                onMoveDown={
                    interactive
                        ? (sectionId) => onMoveSection(sectionId, 1)
                        : () => {}
                }
                onShuffleQuestions={interactive ? onShuffleQuestions : () => {}}
                onAddRandomQuestion={
                    interactive ? onAddRandomQuestion : () => {}
                }
                onAddCustomQuestion={
                    interactive ? onAddCustomQuestion : () => {}
                }
                onEditQuestion={interactive ? onEditQuestion : () => {}}
                onRandomQuestion={interactive ? onRandomQuestion : () => {}}
                onPickQuestion={interactive ? onPickQuestion : () => {}}
                onRemoveQuestion={interactive ? onRemoveQuestion : () => {}}
                onAnswerLinesChange={
                    interactive ? onQuestionAnswerLinesChange : () => {}
                }
                onAnswerLineSpacingChange={
                    interactive ? onQuestionAnswerLineSpacingChange : () => {}
                }
                onQuestionImageSizeChange={
                    interactive ? onQuestionImageSizeChange : () => {}
                }
                onColumnsChange={interactive ? onColumnsChange : () => {}}
            />
        );
    }

    function renderPaperSections(
        targetPaper: GeneratedPaper,
        interactive: boolean,
    ): ReactNode[] {
        const logicalSections = targetPaper.sections.filter(
            (section) => section.orRole !== 'alternative',
        );

        return targetPaper.sections.map((section, sectionIndex) => {
            if (section.orRole === 'alternative') {
                return null;
            }

            const logicalIndex = logicalSections.findIndex(
                (candidate) => candidate.id === section.id,
            );
            const primary = renderPaperSection(
                targetPaper,
                section,
                sectionIndex,
                interactive,
                logicalIndex > 0,
                logicalIndex >= 0 && logicalIndex < logicalSections.length - 1,
            );
            const groupSections =
                section.orRole === 'primary' && section.orGroupId
                    ? targetPaper.sections.filter(
                          (candidate) =>
                              candidate.orGroupId === section.orGroupId,
                      )
                    : [];

            if (groupSections.length < 2) {
                return (
                    <div key={section.id} className="contents">
                        {primary}
                    </div>
                );
            }

            const renderedGroupSections = groupSections.map((groupSection) =>
                groupSection.id === section.id
                    ? primary
                    : renderPaperSection(
                          targetPaper,
                          groupSection,
                          targetPaper.sections.findIndex(
                              (candidate) => candidate.id === groupSection.id,
                          ),
                          interactive,
                          false,
                          false,
                      ),
            );
            const label = resolveOrGroupLabel(settings, section.orLabel);
            const sideBySide = settings.orGroupLayout === 'side-by-side';
            const groupChildren = renderedGroupSections.flatMap(
                (renderedSection, index) =>
                    index === renderedGroupSections.length - 1
                        ? [
                              <div
                                  key={`or-member-${index}`}
                                  className="min-w-0"
                              >
                                  {renderedSection}
                              </div>,
                          ]
                        : [
                              <div
                                  key={`or-member-${index}`}
                                  className="min-w-0"
                              >
                                  {renderedSection}
                              </div>,
                              <OrGroupDivider
                                  key={`or-divider-${index}`}
                                  label={label}
                                  settings={settings}
                                  orientation={
                                      sideBySide ? 'vertical' : 'horizontal'
                                  }
                              />,
                          ],
            );

            return (
                <div
                    key={section.orGroupId ?? section.id}
                    data-or-group
                    data-or-layout={settings.orGroupLayout}
                    className={cn(
                        sideBySide ? 'grid items-stretch' : 'flex flex-col',
                    )}
                    style={
                        sideBySide
                            ? {
                                  gridTemplateColumns: renderedGroupSections
                                      .map((_, index) =>
                                          index ===
                                          renderedGroupSections.length - 1
                                              ? 'minmax(0, 1fr)'
                                              : 'minmax(0, 1fr) auto',
                                      )
                                      .join(' '),
                                  columnGap: `${settings.orGroupGap}mm`,
                              }
                            : { rowGap: `${settings.orGroupGap}mm` }
                    }
                >
                    {groupChildren}
                </div>
            );
        });
    }
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
                <div className="flex flex-wrap items-center justify-between gap-1.5 print:hidden">
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={onAddSection}
                            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                        >
                            <PlusIcon className="size-3.5" />
                            Add Section
                        </button>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={viewMode === 'answer_key'}
                            onClick={() =>
                                onViewModeChange(
                                    viewMode === 'answer_key'
                                        ? 'paper'
                                        : 'answer_key',
                                )
                            }
                            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            <KeyRoundIcon className="size-3.5 text-slate-400" />
                            <span>Answer Key</span>
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors',
                                    viewMode === 'answer_key'
                                        ? 'bg-brand-600'
                                        : 'bg-slate-200 dark:bg-slate-700',
                                )}
                            >
                                <span
                                    className={cn(
                                        'size-3.5 rounded-full bg-white shadow-sm transition-transform',
                                        viewMode === 'answer_key'
                                            ? 'translate-x-3.5'
                                            : 'translate-x-0',
                                    )}
                                />
                            </span>
                        </button>
                        <div ref={setsMenuRef} className="relative">
                            <button
                                type="button"
                                aria-haspopup="menu"
                                aria-expanded={isSetsMenuOpen}
                                onClick={() =>
                                    setIsSetsMenuOpen((open) => !open)
                                }
                                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                <ShuffleIcon className="size-3.5 text-slate-400" />
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Sets
                                </span>
                                <span>{numSets}</span>
                                <ChevronDownIcon
                                    className={cn(
                                        'size-3 text-slate-400 transition-transform',
                                        isSetsMenuOpen && 'rotate-180',
                                    )}
                                />
                            </button>
                            {isSetsMenuOpen && (
                                <div
                                    role="menu"
                                    className="absolute top-full left-0 z-30 mt-1.5 min-w-36 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900"
                                >
                                    <div className="space-y-0.5">
                                        {[1, 2, 3].map((n) => (
                                            <button
                                                key={n}
                                                type="button"
                                                role="menuitem"
                                                onClick={() => {
                                                    onNumSetsChange(n);

                                                    if (activeSetIndex >= n) {
                                                        onActiveSetChange(
                                                            n - 1,
                                                        );
                                                    }
                                                }}
                                                className={cn(
                                                    'flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold transition-colors',
                                                    numSets === n
                                                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                                                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
                                                )}
                                            >
                                                <span>{n}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {numSets > 1 && (
                                        <>
                                            <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                                            <div className="flex items-center gap-1">
                                                {SET_LABELS.slice(
                                                    0,
                                                    numSets,
                                                ).map((label, index) => (
                                                    <button
                                                        key={label}
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={() =>
                                                            onActiveSetChange(
                                                                index,
                                                            )
                                                        }
                                                        className={cn(
                                                            'flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-xs font-semibold transition-colors',
                                                            activeSetIndex ===
                                                                index
                                                                ? 'bg-brand-600 text-white'
                                                                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
                                                        )}
                                                    >
                                                        <span>{label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        {isDraft && savedPaperId !== null && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                                <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                                Draft
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={onSaveDraft}
                            disabled={isSavingDraft || isSavingPaper}
                            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                        >
                            {isSavingDraft ? (
                                <>
                                    <Loader2Icon className="size-4 animate-spin" />
                                    Saving…
                                </>
                            ) : (
                                <>
                                    <BookmarkIcon className="size-3.5" />
                                    Save as Draft
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onOpenSavePaperModal}
                            disabled={isSavingPaper || isSavingDraft}
                            className={cn(
                                'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
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
                                    <CheckIcon className="size-3.5" />
                                    Saved
                                </>
                            ) : savedPaperId !== null && isDirty ? (
                                <>
                                    <SaveIcon className="size-3.5" />
                                    Save Paper
                                    <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                                </>
                            ) : (
                                <>
                                    <SaveIcon className="size-3.5" />
                                    Save Paper
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onOpenSaveAsTemplate}
                            title="Save as template"
                            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            <LayoutTemplateIcon className="size-3.5" />
                            Save as Template
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                numSets > 1 ? onPrintAllSets() : window.print()
                            }
                            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:text-white"
                        >
                            <PrinterIcon className="size-3.5" />
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
                                    ? () => {}
                                    : onHeaderChange
                            }
                            paddingX={settings.headerPaddingX}
                            paddingY={settings.headerPaddingY}
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
                                renderPaperSections(paper, true)
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
                                    style={{
                                        ...paperShellStyle,
                                        breakBefore: 'page',
                                    }}
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
                                            onChange={() => {}}
                                            paddingX={settings.headerPaddingX}
                                            paddingY={settings.headerPaddingY}
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
                                                renderPaperSections(
                                                    variantPaper,
                                                    false,
                                                )
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
                            <RichTextLabel value={target.section.title} />
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
                            autoComplete="off"
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
                                        <RichTextLabel
                                            value={manualQuestionDisplayHtml(
                                                question,
                                            )}
                                        />
                                    </span>
                                    <span className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                                            <RichTextLabel
                                                value={
                                                    question.sourceLabel ??
                                                    question.source ??
                                                    'No source'
                                                }
                                            />
                                        </span>
                                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                                            <RichTextLabel
                                                value={manualQuestionChapterLabel(
                                                    question,
                                                )}
                                            />
                                        </span>
                                        {question.topic && (
                                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                                                <RichTextLabel
                                                    value={question.topic.name}
                                                />
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
                <span
                    className="min-w-0 flex-1 truncate"
                    title={plainQuestionText(englishName)}
                >
                    <RichTextLabel value={englishName} />
                </span>
                <span
                    dir="rtl"
                    className="min-w-0 flex-1 truncate text-right"
                    title={plainQuestionText(urduName)}
                >
                    <RichTextLabel value={urduName} />
                </span>
            </span>
        );
    }

    if (medium === 'Urdu') {
        return (
            <span
                dir="rtl"
                className={cn('min-w-0 flex-1 truncate text-right', className)}
                title={plainQuestionText(urduValue)}
            >
                <RichTextLabel value={urduValue} />
            </span>
        );
    }

    return (
        <span
            className={cn('min-w-0 flex-1 truncate', className)}
            title={plainQuestionText(englishValue)}
        >
            <RichTextLabel value={englishValue} />
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
                label={`Toggle ${plainQuestionText(chapter.name)}`}
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
                    label={`Toggle all topics in ${plainQuestionText(chapter.name)}`}
                />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
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
                                    label={plainQuestionText(topic.name)}
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

function OrTypeMultiSelect({
    options,
    selectedTypeIds,
    onChange,
}: {
    options: OrTypeOption[];
    selectedTypeIds: number[];
    onChange: (typeIds: number[]) => void;
}) {
    const detailsRef = useRef<HTMLDetailsElement>(null);
    const selected = new Set(selectedTypeIds);

    useEffect(() => {
        const handleOutsidePointer = (event: PointerEvent) => {
            const details = detailsRef.current;

            if (
                details?.open &&
                event.target instanceof Node &&
                !details.contains(event.target)
            ) {
                details.open = false;
            }
        };

        document.addEventListener('pointerdown', handleOutsidePointer);

        return () =>
            document.removeEventListener('pointerdown', handleOutsidePointer);
    }, []);
    const selectedLabels = options
        .filter((option) => selected.has(option.id))
        .map((option) => option.label);
    const buttonLabel =
        selectedTypeIds.length > 1
            ? `${selectedTypeIds.length} OR types selected`
            : 'Select OR types';

    return (
        <details
            ref={detailsRef}
            className="group relative min-w-[15rem] flex-1 sm:w-64 sm:flex-none"
        >
            <summary
                className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors group-open:border-brand-500 group-open:ring-2 group-open:ring-brand-500/20 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:group-open:border-brand-400 dark:group-open:ring-brand-400/20 dark:hover:border-slate-700 [&::-webkit-details-marker]:hidden"
                aria-label="Select question types for the OR group"
                title={
                    selectedLabels.join(' OR ') ||
                    'Select question types for the OR group'
                }
            >
                <Link2Icon className="size-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <span className="min-w-0 flex-1 truncate text-left">
                    {buttonLabel}
                </span>
                <ChevronDownIcon className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
                <div className="mt-1 max-h-64 overflow-y-auto">
                    {options.map((option) => {
                        const checked = selected.has(option.id);

                        return (
                            <label
                                key={option.id}
                                className={cn(
                                    'flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm transition-colors',
                                    checked
                                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
                                    option.disabled &&
                                        !checked &&
                                        'cursor-not-allowed opacity-40',
                                )}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={option.disabled && !checked}
                                    onChange={() => {
                                        if (checked) {
                                            onChange(
                                                selectedTypeIds.filter(
                                                    (typeId) =>
                                                        typeId !== option.id,
                                                ),
                                            );
                                        } else if (!option.disabled) {
                                            onChange([
                                                ...selectedTypeIds,
                                                option.id,
                                            ]);
                                        }
                                    }}
                                    className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
                                />
                                <span className="min-w-0 flex-1 truncate">
                                    {option.label}
                                </span>
                                {checked && (
                                    <CheckIcon className="size-4 shrink-0 text-brand-600 dark:text-brand-400" />
                                )}
                            </label>
                        );
                    })}
                </div>
            </div>
        </details>
    );
}
function MultipartSelectionCard({
    config,
    value,
    onChange,
    onAutoPickChange,
    onOpenManualPicker,
}: {
    config: MultipartConfig;
    value: MultipartSelectionState;
    onChange: (value: MultipartSelectionState) => void;
    onAutoPickChange: (enabled: boolean) => void;
    onOpenManualPicker: (rowId: string) => void;
}) {
    const typeOptions = config.partTypes.map((type) => ({
        id: type.id,
        label: type.name,
    }));
    const canAddPart = value.rows.length < config.maxParts;
    const canDeletePart = value.rows.length > 2;

    const updateRows = (rows: MultipartPartRow[]) => {
        const configuredRows = rows.filter(
            (row) => typeof row.questionTypeId === 'number',
        );
        const firstConfiguredRow = configuredRows[0];

        onChange({
            ...value,
            rows,
            partTypeIds: configuredRows.map(
                (row) => row.questionTypeId as number,
            ),
            questionCount: '1',
            choiceCount: '1',
            marksPerPart: firstConfiguredRow?.marksPerQuestion ?? '',
        });
    };

    const updateRow = (rowId: string, patch: Partial<MultipartPartRow>) => {
        updateRows(
            value.rows.map((row) =>
                row.id === rowId ? { ...row, ...patch } : row,
            ),
        );
    };

    const addPart = () => {
        if (!canAddPart) {
            return;
        }

        const nextIndex = value.rows.length + 1;
        updateRows([
            ...value.rows,
            createMultipartPartRow(`multipart_part_${nextIndex}`, null),
        ]);
    };

    const deletePart = (rowId: string) => {
        if (!canDeletePart) {
            return;
        }

        updateRows(value.rows.filter((row) => row.id !== rowId));
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 transition-colors hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.04] dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700 dark:hover:shadow-black/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-brand-500 dark:bg-slate-800 dark:text-brand-300">
                        <LayersIcon className="size-4" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Multi Part Questions
                    </h4>
                </div>
                <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                    <AutoPickSwitch
                        enabled={value.selectionMode === 'automatic'}
                        onChange={onAutoPickChange}
                    />
                    <button
                        type="button"
                        onClick={addPart}
                        disabled={!canAddPart}
                        aria-label="Add multipart part"
                        title={
                            canAddPart ? 'Add part' : 'Maximum parts reached'
                        }
                        className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-brand-200 bg-white text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-brand-500/30 dark:bg-slate-900 dark:text-brand-200 dark:hover:bg-brand-500/10"
                    >
                        <PlusIcon className="size-4" />
                    </button>
                </div>
            </div>

            <div className="mt-4 space-y-4">
                {value.rows.map((row, index) => (
                    <div
                        key={row.id}
                        className="grid gap-2.5 border-t border-slate-100 pt-4 first:border-t-0 first:pt-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto] lg:items-end dark:border-slate-800"
                    >
                        <div className="min-w-0">
                            <FloatingCombobox
                                label="Question Type"
                                value={
                                    typeOptions.find(
                                        (option) =>
                                            Number(option.id) ===
                                            row.questionTypeId,
                                    ) ?? null
                                }
                                options={typeOptions}
                                compact
                                onChange={(option) =>
                                    updateRow(row.id, {
                                        questionTypeId: option
                                            ? Number(option.id)
                                            : null,
                                    })
                                }
                                placeholder="Select type"
                            />
                        </div>
                        <NumberField
                            label="Marks"
                            value={row.marksPerQuestion}
                            placeholder="0"
                            onChange={(value) =>
                                updateRow(row.id, { marksPerQuestion: value })
                            }
                        />
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                            {value.selectionMode === 'manual' && (
                                <button
                                    type="button"
                                    disabled={row.questionTypeId === null}
                                    onClick={() => onOpenManualPicker(row.id)}
                                    title={
                                        rowTarget(row) === 0
                                            ? 'Select a question manually'
                                            : 'Select questions manually'
                                    }
                                    className={cn(
                                        'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold whitespace-nowrap transition-colors',
                                        row.selectedQuestionIds.length ===
                                            rowTarget(row) && rowTarget(row) > 0
                                            ? 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
                                    )}
                                >
                                    <ListChecksIcon className="size-3.5" />
                                    {row.selectedQuestionIds.length}/
                                    {rowTarget(row)} selected
                                </button>
                            )}
                            <span className="inline-flex h-9 min-w-20 items-center justify-center rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                                {lineTotal({
                                    id: row.id,
                                    requiredQuestions: row.requiredQuestions,
                                    marksPerQuestion: row.marksPerQuestion,
                                    choiceQuestions: row.choiceQuestions,
                                    selectedQuestionIds: [],
                                })}{' '}
                                marks
                            </span>
                            <button
                                type="button"
                                disabled={!canDeletePart}
                                onClick={() => deletePart(row.id)}
                                aria-label={`Delete multipart part ${index + 1}`}
                                title={
                                    canDeletePart
                                        ? 'Delete part'
                                        : 'At least two parts are required'
                                }
                                className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10"
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
function QuestionSelectionCard({
    section,
    alternativeSections,
    orTypeOptions,
    selectedOrTypeIds,
    autoPick,
    onAutoPickChange,
    onOrGroupTypesChange,
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
    alternativeSections: QuestionSelectionSection[];
    orTypeOptions: OrTypeOption[];
    selectedOrTypeIds: number[];
    autoPick: boolean;
    onAutoPickChange: (sectionId: string, enabled: boolean) => void;
    onOrGroupTypesChange: (sectionId: string, typeIds: number[]) => void;
    onChange: (
        sectionId: string,
        rowId: string,
        field: QuestionSectionField,
        value: string,
    ) => void;
    onDeleteRow: (sectionId: string, rowId: string) => void;
    onAddRow: (sectionId: string) => void;
    onOpenManualPicker: (
        sectionId: string,
        rowId: string,
        side?: ManualPickerSide,
        alternativeTypeId?: number,
    ) => void;
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
    const typeHeading = englishQuestionTypeTitle(section);
    const hasAlternatives = alternativeSections.length > 0;
    const effectiveAvailableCount = hasAlternatives
        ? Math.min(
              section.availableCount,
              ...alternativeSections.map(
                  (alternative) => alternative.availableCount,
              ),
          )
        : section.availableCount;
    const availabilitySection =
        effectiveAvailableCount === section.availableCount
            ? section
            : { ...section, availableCount: effectiveAvailableCount };

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
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <div
                        draggable
                        role="button"
                        tabIndex={0}
                        onDragStart={(event) => onDragStart(event, section.id)}
                        onDragEnd={onDragEnd}
                        aria-label={`Drag to reorder ${plainQuestionText(typeHeading)}`}
                        title={`Drag to reorder ${plainQuestionText(typeHeading)}`}
                        className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg bg-slate-50 text-brand-500 transition-colors hover:bg-brand-50 hover:text-brand-700 active:cursor-grabbing dark:bg-slate-800 dark:text-brand-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-200"
                    >
                        <GripVerticalIcon className="size-4" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <RichTextLabel value={typeHeading} />
                    </h4>
                    <span className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                        {effectiveAvailableCount} available
                        {hasAlternatives ? ' per type' : ''}
                    </span>
                </div>
                <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                    {section.category === 'Subjective Questions' &&
                        orTypeOptions.length > 0 && (
                            <OrTypeMultiSelect
                                options={orTypeOptions}
                                selectedTypeIds={selectedOrTypeIds}
                                onChange={(typeIds) =>
                                    onOrGroupTypesChange(section.id, typeIds)
                                }
                            />
                        )}
                    <AutoPickSwitch
                        enabled={autoPick}
                        onChange={(enabled) =>
                            onAutoPickChange(section.id, enabled)
                        }
                    />
                    <button
                        type="button"
                        onClick={() => onAddRow(section.id)}
                        aria-label={
                            'Add another ' +
                            plainQuestionText(typeHeading) +
                            ' row'
                        }
                        title={
                            'Add another ' +
                            plainQuestionText(typeHeading) +
                            ' row'
                        }
                        className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-brand-200 bg-white text-brand-700 transition-colors hover:bg-brand-50 dark:border-brand-500/30 dark:bg-slate-900 dark:text-brand-200 dark:hover:bg-brand-500/10"
                    >
                        <PlusIcon className="size-4" />
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
                            max={availableForQuestionRow(
                                availabilitySection,
                                row.id,
                            )}
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
                            label="Marks"
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
                                    {hasAlternatives && 'Main '}
                                    {row.selectedQuestionIds.length}/
                                    {rowTarget(row)} selected
                                </button>
                            )}
                            {!autoPick &&
                                alternativeSections.map((alternative) => {
                                    const selectedIds =
                                        rowOrSelectedQuestionIds(
                                            row,
                                            alternative.questionTypeId,
                                        );
                                    const alternativeTitle = plainQuestionText(
                                        englishQuestionTypeTitle(alternative),
                                    );

                                    return (
                                        <button
                                            key={alternative.questionTypeId}
                                            type="button"
                                            disabled={rowTarget(row) === 0}
                                            onClick={() =>
                                                onOpenManualPicker(
                                                    section.id,
                                                    row.id,
                                                    'alternative',
                                                    alternative.questionTypeId,
                                                )
                                            }
                                            title={
                                                rowTarget(row) === 0
                                                    ? 'Enter a total or required count first'
                                                    : `Select ${alternativeTitle} questions for row ${index + 1}`
                                            }
                                            className={cn(
                                                'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold whitespace-nowrap transition-colors',
                                                selectedIds.length ===
                                                    rowTarget(row) &&
                                                    rowTarget(row) > 0
                                                    ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-violet-500/30 dark:hover:text-violet-300',
                                            )}
                                        >
                                            <Link2Icon className="size-3.5" />
                                            OR {alternativeTitle}{' '}
                                            {selectedIds.length}/
                                            {rowTarget(row)}
                                        </button>
                                    );
                                })}
                            <span className="inline-flex h-9 min-w-20 items-center justify-center rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                                {lineTotal(row)} marks
                            </span>
                            <button
                                type="button"
                                disabled={!canDeleteRow}
                                onClick={() => onDeleteRow(section.id, row.id)}
                                aria-label={`Delete row ${index + 1} from ${plainQuestionText(typeHeading)}`}
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

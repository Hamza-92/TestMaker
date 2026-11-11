import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    BookOpenIcon,
    CheckIcon,
    FileTextIcon,
    GraduationCapIcon,
    SearchIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { OrPartnerOption } from '@/components/qat/or-partner-select';
import { QatPastPaperCheckbox } from '@/components/qat/past-paper-checkbox';
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/tm';
import { FloatingCombobox } from '@/components/ui/floating-combobox';
import type { ComboboxOptionItem } from '@/components/ui/floating-combobox';
import { Switch } from '@/components/ui/switch';
import { useCustomerSidebar } from '@/layouts/customer/customer-layout';
import { QuestionContent } from '@/pages/customer/papers/paper-layouts/questions/question-content';
import { QatQuestionStatement } from '@/pages/customer/qat/question';
import type { QatQuestion } from '@/pages/customer/qat/question';

type QatClass = {
    id: number;
    name: string;
    academic_year: string;
    subject_count: number;
};
type QatSubject = {
    id: number;
    qat_class_id: number;
    name: string;
    class_name: string;
    academic_year: string;
    chapter_count: number;
};
type QatChapter = {
    id: number;
    qat_subject_id: number;
    name: string;
    months: number[];
    month_names?: Record<number, string>;
};
type QatMonthSyllabus = {
    qat_subject_id: number;
    month: number;
    description: string;
};
type PoolType = {
    id: number;
    name: string;
    is_objective: boolean;
    total: number;
    or_partner_id: number | null;
};
type Pool = {
    hidden_type_ids: number[];
    types: PoolType[];
    questions: {
        data: QatQuestion[];
        total: number;
    };
};
type QatTemplate = {
    id: number;
    qat_subject_id: number;
    name: string;
    category: string | null;
    minutes: number;
    has_hidden_types?: boolean;
    sections: {
        question_type_id: number;
        quantity: number;
        required_questions?: number;
        marks: number;
    }[];
};
type ManualChoice = { question: QatQuestion; marks: number };
type OrPair = { type_id: number; partner_id: number };
type AutoSection = {
    question_type_id: number;
    quantity: number;
    required_questions: number;
    marks: number;
    name?: string;
};

type GenerationSelections = {
    selection_method?: 'manual' | 'template';
    name: string;
    class_ids: number[];
    subject_id: number;
    academic_year: string;
    syllabus: 'custom' | 'qat';
    chapter_ids: number[];
    months: number[];
    minutes: number;
    template_id: number | null;
    sections: QatTemplate['sections'];
    variants: number;
    allow_repeat: boolean;
    past_paper?: boolean;
    manual_questions: { id: number; marks: number }[];
    or_pairs?: OrPair[];
};

function normalizedSections(sections: QatTemplate['sections']) {
    return sections
        .filter((row) => row.quantity > 0)
        .map((row) => ({
            question_type_id: row.question_type_id,
            quantity: row.quantity,
            required_questions: row.required_questions ?? row.quantity,
            marks: row.marks,
        }))
        .sort((a, b) => a.question_type_id - b.question_type_id);
}

const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];
const inputClass =
    'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const selectAllClass =
    'inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/10';
const questionMetaBadgeClass =
    'rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200';

function csrf(): string {
    return (
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
            ?.content ?? ''
    );
}

function firstError(body: unknown): string {
    if (body && typeof body === 'object') {
        const response = body as {
            message?: string;
            errors?: Record<string, string[]>;
        };
        const detail = Object.values(response.errors ?? {})[0]?.[0];

        return (
            detail ?? response.message ?? 'The request could not be completed.'
        );
    }

    return 'The request could not be completed.';
}

export type QatGenerationFormProps = {
    mode: 'auto' | 'manual';
    classes: QatClass[];
    subjects: QatSubject[];
    chapters: QatChapter[];
    monthSyllabi: QatMonthSyllabus[];
    templates: QatTemplate[];
    questionTypeNames: Record<number, string>;
    initialSelections?: GenerationSelections | null;
};

export type QatClassSubjectSelection = {
    classOptions: ComboboxOptionItem[];
    subjectOptions: ComboboxOptionItem[];
    classId: number | null;
    subjectId: number | null;
    onClassChange: (id: number | null) => void;
    onSubjectChange: (id: number | null) => void;
};

export type QatSyllabusSelection = {
    mode: 'auto' | 'manual';
    subjectSelected: boolean;
    years: string[];
    year: string;
    monthOptions: { id: number; label: string }[];
    month: number | null;
    descriptions: {
        month: number;
        label: string;
        chapterCount: number;
        books: { id: number; description: string }[];
    }[];
    chapters: QatChapter[];
    chapterIds: number[];
    onYearChange: (year: string) => void;
    onMonthChange: (month: number | null) => void;
    onChapterChange: (id: number) => void;
    onAllChaptersChange: (checked: boolean) => void;
};

export type QatGenerationViewState = QatClassSubjectSelection & {
    selectionMethod: 'manual' | 'template';
    onSelectionMethodChange: (method: 'manual' | 'template') => void;
    syllabus: QatSyllabusSelection;
    template: QatTemplateSelection;
    review: QatReviewSelection;
    manualPicker: QatManualSelection;
    summary: QatSelectionSummary;
};

export type QatSelectionSummary = {
    mode: 'auto' | 'manual';
    className: string;
    subjectName: string;
    chapterCount: number;
    minutes: number;
    questionCount: number;
    totalMarks: number;
    templateName: string | null;
    variants: number;
    months: string[];
};

export type QatManualSelection = {
    subjectSelected: boolean;
    chaptersSelected: boolean;
    loading: boolean;
    error: string;
    types: PoolType[];
    orOptions: OrPartnerOption[];
    pairError: string;
    onPairChange: (typeId: number, partnerId: number | null) => void;
    questions: QatQuestion[];
    selected: Record<number, number>;
    search: string;
    typeFilter: string;
    selectedOnly: boolean;
    onSearchChange: (value: string) => void;
    onTypeChange: (value: string) => void;
    onSelectedOnlyChange: (value: boolean) => void;
    onToggle: (id: number) => void;
    onMarksChange: (id: number, marks: number) => void;
};

export type QatReviewSelection = {
    name: string;
    minutes: number;
    variants: number;
    allowRepeat: boolean;
    pastPaper: boolean;
    isPefPattern: boolean;
    loading: boolean;
    orOptions: OrPartnerOption[];
    onPairChange: (typeId: number, partnerId: number | null) => void;
    rows: {
        id: number;
        name: string;
        count: number;
        required: number;
        marks: number;
        available: number;
    }[];
    totalQuestions: number;
    totalMarks: number;
    variantsHaveEnoughQuestions: boolean;
    canGenerate: boolean;
    saving: boolean;
    error: string;
    sidebarCollapsed: boolean;
    onNameChange: (value: string) => void;
    onMinutesChange: (value: number) => void;
    onVariantsChange: (value: number) => void;
    onAllowRepeatChange: (value: boolean) => void;
    onPastPaperChange: (value: boolean) => void;
    onSectionChange: (
        id: number,
        field: 'quantity' | 'required_questions' | 'marks',
        value: number,
    ) => void;
    onClear: () => void;
    canResetDefault: boolean;
    onResetDefault: () => void;
    onGenerate: () => Promise<void>;
};

export type QatTemplateSelection = {
    subjectSelected: boolean;
    syllabusSelected: boolean;
    loading: boolean;
    error: string;
    selectedId: number | null;
    options: {
        id: number;
        name: string;
        category: string | null;
        minutes: number;
        ready: boolean;
        rows: {
            id: number;
            name: string;
            total: number;
            required: number;
            marks: number;
        }[];
    }[];
    onSelect: (id: number) => void;
};

export default function QatGenerationForm({
    mode,
    classes,
    subjects,
    chapters,
    monthSyllabi,
    templates,
    questionTypeNames,
    initialSelections = null,
    render,
}: QatGenerationFormProps & {
    render?: (selection: QatGenerationViewState) => ReactNode;
}) {
    const { collapsed: sidebarCollapsed } = useCustomerSidebar();
    const [selectionMethod, setSelectionMethod] = useState<
        'manual' | 'template'
    >(initialSelections?.selection_method ?? 'manual');
    const manualTemplate = mode === 'manual' && selectionMethod === 'template';
    const usesDistribution = mode === 'auto' || manualTemplate;
    const [classIds, setClassIds] = useState<number[]>(
        initialSelections?.class_ids ?? [],
    );
    const [subjectIds, setSubjectIds] = useState<number[]>(
        initialSelections ? [initialSelections.subject_id] : [],
    );
    const [chapterIds, setChapterIds] = useState<number[]>(
        initialSelections?.chapter_ids ?? [],
    );
    const syllabus = mode === 'auto' ? 'qat' : 'custom';
    const [qatYear, setQatYear] = useState(
        initialSelections?.academic_year ?? '',
    );
    const [months, setMonths] = useState<number[]>(
        mode === 'auto' ? (initialSelections?.months ?? []) : [],
    );
    const [pool, setPool] = useState<Pool | null>(null);
    const [poolScopeKey, setPoolScopeKey] = useState('');
    const [poolBusy, setPoolBusy] = useState(false);
    const [poolError, setPoolError] = useState('');
    const [questionSearch, setQuestionSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [selectedOnly, setSelectedOnly] = useState(false);
    const [orPairs, setOrPairs] = useState<OrPair[]>(
        initialSelections?.or_pairs ?? [],
    );
    const [templateId, setTemplateId] = useState<number | null>(
        initialSelections?.template_id ?? null,
    );
    const [autoSections, setAutoSections] = useState<AutoSection[]>(() =>
        normalizedSections(initialSelections?.sections ?? []),
    );
    const [manualChoices, setManualChoices] = useState<
        Record<number, ManualChoice>
    >({});
    const [templateChoices, setTemplateChoices] = useState<
        Record<number, ManualChoice>
    >({});
    const manual = manualTemplate ? templateChoices : manualChoices;
    const setManual = manualTemplate ? setTemplateChoices : setManualChoices;
    const [templateRevision, setTemplateRevision] = useState(0);
    const lastTemplatePick = useRef('');
    const restoringTemplateChoices = useRef(
        initialSelections?.selection_method === 'template' &&
            initialSelections.manual_questions.length > 0,
    );
    const [name, setName] = useState(
        initialSelections?.name ?? 'QAT Practice Paper',
    );
    const [minutes, setMinutes] = useState(initialSelections?.minutes ?? 40);
    const [variants, setVariants] = useState(initialSelections?.variants ?? 1);
    const [allowRepeat, setAllowRepeat] = useState(
        initialSelections?.allow_repeat ?? false,
    );
    const [pastPaper, setPastPaper] = useState(
        initialSelections?.past_paper ?? false,
    );
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const selectedClasses = classes.filter((item) =>
        classIds.includes(item.id),
    );
    const selectedSubjects = subjects.filter(
        (item) =>
            subjectIds.includes(item.id) &&
            classIds.includes(item.qat_class_id),
    );
    const classOptions = classes.map((item) => ({
        id: item.id,
        label: item.name,
        hint: item.academic_year,
    }));
    const subjectOptions = subjects
        .filter((item) => classIds.includes(item.qat_class_id))
        .map((item) => ({ id: item.id, label: item.name }));
    const availableYears = [
        ...new Set(selectedSubjects.map((item) => item.academic_year)),
    ];
    const activeYear = availableYears.includes(qatYear)
        ? qatYear
        : (availableYears[0] ?? '');
    const targetSubjects =
        syllabus === 'qat'
            ? selectedSubjects.filter(
                  (item) => item.academic_year === activeYear,
              )
            : selectedSubjects;
    const selectedChapters = chapters.filter(
        (item) =>
            chapterIds.includes(item.id) &&
            subjectIds.includes(item.qat_subject_id),
    );
    const subjectChapters = chapters.filter(
        (item) => item.qat_subject_id === targetSubjects[0]?.id,
    );
    const selectedSubjectIds = targetSubjects.map((item) => item.id);
    const monthChoices = [
        ...new Set(
            chapters
                .filter((item) =>
                    selectedSubjectIds.includes(item.qat_subject_id),
                )
                .flatMap((item) => item.months),
        ),
    ].sort((a, b) => a - b);
    const selectedMonthDescriptions = months
        .filter((month) => monthChoices.includes(month))
        .map((month) => ({
            month,
            books: targetSubjects.flatMap((subject) => {
                const description = monthSyllabi
                    .find(
                        (item) =>
                            item.qat_subject_id === subject.id &&
                            item.month === month,
                    )
                    ?.description.trim();

                return description
                    ? [
                          {
                              id: subject.id,
                              description,
                          },
                      ]
                    : [];
            }),
        }));
    const coverage =
        syllabus === 'custom'
            ? selectedChapters
            : chapters
                  .filter(
                      (item) =>
                          selectedSubjectIds.includes(item.qat_subject_id) &&
                          item.months.some((month) => months.includes(month)),
                  )
                  .map((item) => ({
                      ...item,
                      name: item.month_names?.[months[0]] ?? item.name,
                  }));
    const targetSubject = targetSubjects[0] ?? null;
    const resolvedSubjectId = targetSubject?.id ?? null;
    const targetCoverage = coverage.filter(
        (item) => item.qat_subject_id === targetSubject?.id,
    );
    const availableTemplates = templates.filter(
        (item) => item.qat_subject_id === targetSubject?.id,
    );
    const selectedTemplate =
        availableTemplates.find((item) => item.id === templateId) ?? null;
    const paperMinutes = minutes;
    const targetChapterKey = targetCoverage.map((item) => item.id).join(',');
    const monthKey = months.join(',');
    const questionScopeKey = `${resolvedSubjectId ?? ''}|${targetChapterKey}|${syllabus}|${monthKey}|${mode}|${pastPaper}`;
    const restoreScopeKey = useRef(questionScopeKey);
    const pendingManualChoices = useRef(
        initialSelections?.manual_questions ?? [],
    );
    const currentPool = poolScopeKey === questionScopeKey ? pool : null;
    const poolTypes = currentPool?.types ?? [];
    const typesById = useMemo(
        () =>
            new Map((currentPool?.types ?? []).map((type) => [type.id, type])),
        [currentPool],
    );
    const activePairs = useMemo(
        () =>
            orPairs.filter(
                (pair) =>
                    typesById.get(pair.type_id)?.or_partner_id ===
                    pair.partner_id,
            ),
        [orPairs, typesById],
    );
    const partnersByPrimary = useMemo(
        () =>
            new Map(activePairs.map((pair) => [pair.type_id, pair.partner_id])),
        [activePairs],
    );
    const suppressedTypes = useMemo(
        () => new Set(activePairs.map((pair) => pair.partner_id)),
        [activePairs],
    );
    const orOptions = poolTypes.flatMap((type) => {
        const partner = typesById.get(type.or_partner_id ?? 0);

        if (!partner || suppressedTypes.has(type.id)) {
            return [];
        }

        return [
            {
                typeId: type.id,
                typeName: type.name,
                partnerId: partner.id,
                partnerName: partner.name,
                selected: partnersByPrimary.get(type.id) === partner.id,
            },
        ];
    });
    const filterTypeId = typesById.has(Number(typeFilter))
        ? Number(typeFilter)
        : 0;
    const filterPartnerId = partnersByPrimary.get(filterTypeId);
    const typeRanks = useMemo(
        () =>
            new Map((pool?.types ?? []).map((type, index) => [type.id, index])),
        [pool],
    );
    const selectedManual = useMemo(
        () =>
            Object.values(manual).sort(
                (left, right) =>
                    (typeRanks.get(left.question.question_type_id) ??
                        Number.MAX_SAFE_INTEGER) -
                    (typeRanks.get(right.question.question_type_id) ??
                        Number.MAX_SAFE_INTEGER),
            ),
        [manual, typeRanks],
    );
    const searchTerm = questionSearch.trim().toLocaleLowerCase();
    const questionSearchIndex = useMemo(
        () =>
            new Map(
                (pool?.questions.data ?? []).map((question) => [
                    question.id,
                    JSON.stringify({
                        statement_en: question.statement_en,
                        statement_ur: question.statement_ur,
                        description_en: question.description_en,
                        description_ur: question.description_ur,
                        content: question.content,
                        chapter_name: question.chapter_name,
                        topic_name: question.topic_name,
                        type_name: question.type_name,
                    }).toLocaleLowerCase(),
                ]),
            ),
        [pool],
    );
    const listedQuestions = useMemo(
        () =>
            selectedOnly
                ? selectedManual.map(({ question }) => question)
                : (pool?.questions.data ?? []).filter(
                      (question) =>
                          (!filterTypeId ||
                              question.question_type_id === filterTypeId ||
                              question.question_type_id === filterPartnerId) &&
                          (!searchTerm ||
                              questionSearchIndex
                                  .get(question.id)
                                  ?.includes(searchTerm)),
                  ),
        [
            selectedOnly,
            selectedManual,
            pool,
            filterTypeId,
            filterPartnerId,
            searchTerm,
            questionSearchIndex,
        ],
    );
    const allAutoRows = useMemo(
        () =>
            [
                ...autoSections.filter(
                    (row) =>
                        !currentPool?.hidden_type_ids.includes(
                            row.question_type_id,
                        ),
                ),
                ...(currentPool?.types ?? [])
                    .filter(
                        (type) =>
                            !autoSections.some(
                                (row) => row.question_type_id === type.id,
                            ),
                    )
                    .map((type) => ({
                        question_type_id: type.id,
                        quantity: 0,
                        required_questions: 0,
                        marks: type.is_objective ? 1 : 2,
                        name: type.name,
                    })),
            ]
                .map((section) => {
                    const type = typesById.get(section.question_type_id);

                    return {
                        ...section,
                        id: section.question_type_id,
                        name:
                            type?.name ??
                            questionTypeNames[section.question_type_id] ??
                            section.name ??
                            'Unavailable question type',
                        available: type?.total ?? 0,
                    };
                })
                .sort(
                    (left, right) =>
                        (typeRanks.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
                        (typeRanks.get(right.id) ?? Number.MAX_SAFE_INTEGER),
                ),
        [autoSections, currentPool, questionTypeNames, typeRanks, typesById],
    );
    const autoRows = useMemo(
        () =>
            allAutoRows
                .filter((row) => !suppressedTypes.has(row.id))
                .map((row) => {
                    const partnerId = partnersByPrimary.get(row.id);
                    const partner =
                        partnerId === undefined
                            ? null
                            : typesById.get(partnerId);

                    return partner
                        ? {
                              ...row,
                              available: Math.min(row.available, partner.total),
                          }
                        : row;
                }),
        [allAutoRows, partnersByPrimary, suppressedTypes, typesById],
    );
    const activeAutoRows = useMemo(
        () => autoRows.filter((row) => row.quantity > 0),
        [autoRows],
    );
    const distributionPairs = useMemo(
        () =>
            activePairs.filter((pair) =>
                activeAutoRows.some((row) => row.id === pair.type_id),
            ),
        [activeAutoRows, activePairs],
    );
    const expandedAutoRows = useMemo(
        () => [
            ...activeAutoRows,
            ...distributionPairs.flatMap((pair) => {
                const row = activeAutoRows.find(
                    (item) => item.id === pair.type_id,
                );

                return row ? [{ ...row, id: pair.partner_id }] : [];
            }),
        ],
        [activeAutoRows, distributionPairs],
    );
    const isPefPattern =
        selectedTemplate !== null &&
        !selectedTemplate.has_hidden_types &&
        distributionPairs.length === 0 &&
        minutes === selectedTemplate.minutes &&
        JSON.stringify(normalizedSections(autoRows)) ===
            JSON.stringify(normalizedSections(selectedTemplate.sections));
    const templateHasEnoughQuestions =
        activeAutoRows.length > 0 &&
        autoRows.every(
            (row) => Number.isInteger(row.quantity) && row.quantity >= 0,
        ) &&
        activeAutoRows.every(
            (row) =>
                row.available >= row.quantity &&
                Number.isInteger(row.quantity) &&
                row.quantity <= 100 &&
                Number.isInteger(row.required_questions) &&
                row.required_questions >= 1 &&
                row.required_questions <= row.quantity &&
                row.marks >= 0.5 &&
                row.marks <= 20,
        ) &&
        activeAutoRows.reduce((sum, row) => sum + row.quantity, 0) <= 100;
    const variantsHaveEnoughQuestions =
        activeAutoRows.length > 0 &&
        activeAutoRows.every(
            (row) =>
                row.available >= row.quantity * (allowRepeat ? 1 : variants),
        );
    const choicesByType = new Map<number, ManualChoice[]>();

    for (const choice of selectedManual) {
        const id = choice.question.question_type_id;
        const items = choicesByType.get(id) ?? [];
        items.push(choice);
        choicesByType.set(id, items);
    }

    const manualPairError =
        activePairs
            .map(({ type_id, partner_id }) => {
                const primary = choicesByType.get(type_id) ?? [];
                const alternative = choicesByType.get(partner_id) ?? [];
                const names = `${typesById.get(type_id)?.name} and ${typesById.get(partner_id)?.name}`;

                if (primary.length !== alternative.length) {
                    return `Select the same number of questions for ${names}.`;
                }

                if (
                    primary.some(
                        (item, index) =>
                            Math.abs(item.marks - alternative[index].marks) >
                            0.00001,
                    )
                ) {
                    return `Match the marks for each pair of ${names} questions.`;
                }

                return '';
            })
            .find(Boolean) ?? '';
    const manualRows = [...choicesByType]
        .filter(([id]) => !suppressedTypes.has(id))
        .map(([typeId, items]) => {
            const partner = typesById.get(partnersByPrimary.get(typeId) ?? 0);
            const name = items[0].question.type_name;

            return {
                id: typeId,
                name: partner ? `${name} OR ${partner.name}` : name,
                count: items.length,
                marks: items.reduce((total, item) => total + item.marks, 0),
            };
        });
    const reviewRows = usesDistribution
        ? autoRows.map((type) => ({
              id: type.id,
              name: type.name,
              count: type.quantity,
              required: type.required_questions ?? type.quantity,
              marks: Number(
                  (
                      (type.required_questions ?? type.quantity) * type.marks
                  ).toFixed(2),
              ),
          }))
        : manualRows.map((row) => ({ ...row, required: row.count }));
    const totalQuestions = usesDistribution
        ? autoRows.reduce((total, type) => total + type.quantity, 0)
        : manualRows.reduce((total, row) => total + row.count, 0);
    const totalMarks = Number(
        (usesDistribution
            ? autoRows.reduce(
                  (total, type) =>
                      total +
                      (type.required_questions ?? type.quantity) * type.marks,
                  0,
              )
            : manualRows.reduce((total, row) => total + row.marks, 0)
        ).toFixed(2),
    );
    useEffect(() => {
        if (questionScopeKey !== restoreScopeKey.current) {
            pendingManualChoices.current = [];
            restoringTemplateChoices.current = false;
        }

        setPool(null);
        setPoolScopeKey('');
        setManualChoices({});
        setTemplateChoices({});
        lastTemplatePick.current = '';
        setSelectedOnly(false);
        setPoolBusy(false);
        setPoolError('');
    }, [questionScopeKey]);

    useEffect(() => {
        if (!manualTemplate || poolScopeKey !== questionScopeKey || !pool) {
            return;
        }

        const key = `${questionScopeKey}|${templateRevision}`;

        if (lastTemplatePick.current === key) {
            return;
        }

        lastTemplatePick.current = key;

        if (restoringTemplateChoices.current) {
            restoringTemplateChoices.current = false;

            return;
        }

        setTemplateChoices((current) => {
            const next: Record<number, ManualChoice> = {};

            for (const row of expandedAutoRows) {
                const candidates = pool.questions.data.filter(
                    (question) => question.question_type_id === row.id,
                );

                if (candidates.length < row.quantity) {
                    return {};
                }

                const existing = candidates
                    .filter((question) => current[question.id])
                    .slice(0, row.quantity);
                const remaining = candidates.filter(
                    (question) =>
                        !existing.some((item) => item.id === question.id),
                );

                for (let index = remaining.length - 1; index > 0; index--) {
                    const other = Math.floor(Math.random() * (index + 1));
                    [remaining[index], remaining[other]] = [
                        remaining[other],
                        remaining[index],
                    ];
                }

                for (const question of [
                    ...existing,
                    ...remaining.slice(0, row.quantity - existing.length),
                ]) {
                    next[question.id] = { question, marks: row.marks };
                }
            }

            return next;
        });
    }, [
        manualTemplate,
        pool,
        poolScopeKey,
        questionScopeKey,
        templateRevision,
        expandedAutoRows,
    ]);

    useEffect(() => {
        if (
            !resolvedSubjectId ||
            targetChapterKey === '' ||
            poolScopeKey === questionScopeKey
        ) {
            return;
        }

        const abort = new AbortController();
        const timer = window.setTimeout(async () => {
            setPoolBusy(true);
            setPoolError('');

            try {
                const response = await fetch('/qa-tests/questions', {
                    method: 'POST',
                    signal: abort.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrf(),
                    },
                    body: JSON.stringify({
                        subject_id: resolvedSubjectId,
                        syllabus,
                        chapter_ids:
                            syllabus === 'custom'
                                ? targetChapterKey.split(',').map(Number)
                                : [],
                        months:
                            syllabus === 'qat'
                                ? monthKey.split(',').map(Number)
                                : [],
                        include_questions: mode === 'manual',
                        past_paper: pastPaper,
                    }),
                });
                const contentType = response.headers.get('content-type') ?? '';

                if (!contentType.includes('application/json')) {
                    throw new Error(
                        response.status === 419
                            ? 'Your session expired. Refresh the page and try again.'
                            : 'Could not load QAT questions. Refresh the page and try again.',
                    );
                }

                const body = await response.json().catch(() => {
                    throw new Error(
                        'Could not read the QAT questions response. Refresh the page and try again.',
                    );
                });

                if (!response.ok) {
                    throw new Error(firstError(body));
                }

                if (abort.signal.aborted) {
                    return;
                }

                setPool(body as Pool);
                setPoolScopeKey(questionScopeKey);

                if (
                    pendingManualChoices.current.length &&
                    questionScopeKey === restoreScopeKey.current
                ) {
                    const marksById = new Map(
                        pendingManualChoices.current.map((choice) => [
                            choice.id,
                            choice.marks,
                        ]),
                    );
                    (initialSelections?.selection_method === 'template'
                        ? setTemplateChoices
                        : setManualChoices)(
                        Object.fromEntries(
                            (body as Pool).questions.data
                                .filter((question) =>
                                    marksById.has(question.id),
                                )
                                .map((question) => [
                                    question.id,
                                    {
                                        question,
                                        marks: marksById.get(question.id)!,
                                    },
                                ]),
                        ),
                    );
                    pendingManualChoices.current = [];
                }
            } catch (error) {
                if (!abort.signal.aborted) {
                    setPoolError(
                        error instanceof Error
                            ? error.message
                            : 'Could not load questions.',
                    );
                }
            } finally {
                if (!abort.signal.aborted) {
                    setPoolBusy(false);
                }
            }
        }, 180);

        return () => {
            abort.abort();
            window.clearTimeout(timer);
        };
    }, [
        resolvedSubjectId,
        targetChapterKey,
        syllabus,
        monthKey,
        mode,
        pastPaper,
        questionScopeKey,
        poolScopeKey,
        initialSelections?.selection_method,
    ]);

    function updateAutoSection(
        id: number,
        field: 'quantity' | 'required_questions' | 'marks',
        value: number,
    ) {
        setTemplateRevision((revision) => revision + 1);
        const rows = allAutoRows.map((row) => ({
            question_type_id: row.id,
            quantity: row.quantity,
            required_questions: row.required_questions,
            marks: row.marks,
            name: row.name,
        }));
        setAutoSections(
            rows.map((row) => {
                if (row.question_type_id !== id) {
                    return row;
                }

                if (field === 'quantity') {
                    return {
                        ...row,
                        quantity: value,
                        required_questions:
                            row.quantity === 0
                                ? value
                                : Math.min(row.required_questions, value),
                    };
                }

                return {
                    ...row,
                    [field]:
                        field === 'marks'
                            ? value / Math.max(row.required_questions, 1)
                            : value,
                };
            }),
        );
    }

    function toggleClass(id: number | null) {
        if (classIds[0] === id) {
            return;
        }

        setClassIds(id === null ? [] : [id]);
        setSubjectIds([]);
        setChapterIds([]);
        setMonths([]);
        setTemplateId(null);
        setAutoSections([]);
        setOrPairs([]);
        setTypeFilter('');
        setQuestionSearch('');
    }

    function toggleSubject(id: number | null) {
        if (subjectIds[0] === id) {
            return;
        }

        setSubjectIds(id === null ? [] : [id]);
        setChapterIds([]);
        setMonths([]);
        const firstTemplate =
            mode === 'auto' || selectionMethod === 'template'
                ? templates.find((template) => template.qat_subject_id === id)
                : undefined;
        applyTemplate(firstTemplate ?? null);
        setTypeFilter('');
        setQuestionSearch('');
    }

    function applyTemplate(template: QatTemplate | null) {
        setTemplateRevision((revision) => revision + 1);
        setTemplateId(template?.id ?? null);
        setAutoSections(normalizedSections(template?.sections ?? []));
        setOrPairs([]);

        if (template || mode === 'auto') {
            setMinutes(template?.minutes ?? 40);
        }
    }

    function updateOrPair(typeId: number, partnerId: number | null) {
        setOrPairs((current) => {
            const remaining = current.filter(
                (pair) =>
                    ![typeId, partnerId].includes(pair.type_id) &&
                    ![typeId, partnerId].includes(pair.partner_id),
            );

            return partnerId === null
                ? remaining
                : [...remaining, { type_id: typeId, partner_id: partnerId }];
        });

        if (partnerId !== null) {
            setTypeFilter(String(typeId));
        }

        setTemplateRevision((revision) => revision + 1);
    }

    function toggleChapter(id: number) {
        setChapterIds((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id],
        );
    }

    function toggleChapterGroup(ids: number[], checked: boolean) {
        setChapterIds((current) =>
            checked
                ? [...new Set([...current, ...ids])]
                : current.filter((id) => !ids.includes(id)),
        );
    }

    const canGenerate =
        classIds.length === 1 &&
        subjectIds.length === 1 &&
        targetCoverage.length > 0 &&
        totalQuestions > 0 &&
        (mode !== 'manual' ||
            (totalQuestions <= 100 &&
                selectedManual.every(
                    (item) =>
                        Number.isFinite(item.marks) &&
                        item.marks >= 0.5 &&
                        item.marks <= 20,
                ))) &&
        !poolBusy &&
        !poolError &&
        poolScopeKey === questionScopeKey &&
        (!usesDistribution ||
            (templateHasEnoughQuestions && variantsHaveEnoughQuestions)) &&
        (usesDistribution || !manualPairError) &&
        (!manualTemplate ||
            (selectedManual.length ===
                expandedAutoRows.reduce((sum, row) => sum + row.quantity, 0) &&
                expandedAutoRows.every((row) => {
                    const items = selectedManual.filter(
                        (item) => item.question.question_type_id === row.id,
                    );

                    return (
                        items.length === row.quantity &&
                        items.every(
                            (item) =>
                                Math.abs(item.marks - row.marks) < 0.00001,
                        )
                    );
                }))) &&
        name.trim().length > 0 &&
        paperMinutes >= 10 &&
        paperMinutes <= 240;

    async function generate() {
        if (!targetSubject || !canGenerate || saving) {
            return;
        }

        setSaving(true);
        setSaveError('');

        try {
            const response = await fetch('/qa-tests/papers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrf(),
                },
                body: JSON.stringify({
                    name: name.trim(),
                    mode,
                    selection_method: usesDistribution ? 'template' : 'manual',
                    class_ids: classIds,
                    subject_id: targetSubject.id,
                    syllabus,
                    chapter_ids:
                        syllabus === 'custom'
                            ? targetCoverage.map((item) => item.id)
                            : [],
                    months: syllabus === 'qat' ? months : [],
                    minutes: paperMinutes,
                    template_id: usesDistribution ? selectedTemplate?.id : null,
                    or_pairs: usesDistribution
                        ? distributionPairs
                        : activePairs.filter((pair) =>
                              choicesByType.has(pair.type_id),
                          ),
                    sections: usesDistribution
                        ? normalizedSections(activeAutoRows)
                        : [],
                    variants: mode === 'auto' ? variants : 1,
                    allow_repeat: mode === 'auto' && allowRepeat,
                    past_paper: pastPaper,
                    manual_questions:
                        mode === 'manual'
                            ? selectedManual.map(({ question, marks }) => ({
                                  id: question.id,
                                  marks,
                              }))
                            : [],
                }),
            });
            const body = await response.json();

            if (!response.ok) {
                throw new Error(firstError(body));
            }

            router.visit(body.preview_url);
        } catch (error) {
            setSaveError(
                error instanceof Error
                    ? error.message
                    : 'Could not generate the paper.',
            );
        } finally {
            setSaving(false);
        }
    }

    const summaryHasCurrentQuestions = poolScopeKey === questionScopeKey;
    const summaryTotalMarks = summaryHasCurrentQuestions ? totalMarks : 0;

    if (render) {
        return render({
            selectionMethod,
            onSelectionMethodChange: (method) => {
                setSelectionMethod(method);

                if (
                    method === 'template' &&
                    !selectedTemplate &&
                    autoSections.length === 0
                ) {
                    applyTemplate(availableTemplates[0] ?? null);
                }
            },
            classOptions,
            subjectOptions,
            classId: classIds[0] ?? null,
            subjectId: subjectIds[0] ?? null,
            onClassChange: toggleClass,
            onSubjectChange: toggleSubject,
            summary: {
                mode,
                className: selectedClasses[0]?.name ?? 'Not selected',
                subjectName: targetSubject?.name ?? 'Not selected',
                chapterCount: targetCoverage.length,
                minutes,
                questionCount: summaryHasCurrentQuestions ? totalQuestions : 0,
                totalMarks: summaryTotalMarks,
                templateName: usesDistribution
                    ? (selectedTemplate?.name ?? null)
                    : null,
                variants,
                months:
                    mode === 'auto'
                        ? months
                              .filter((month) => monthChoices.includes(month))
                              .map((month) => MONTHS[month - 1])
                        : [],
            },
            manualPicker: {
                subjectSelected: targetSubject !== null,
                chaptersSelected: targetCoverage.length > 0,
                loading:
                    targetCoverage.length > 0 &&
                    !poolError &&
                    (poolBusy || !summaryHasCurrentQuestions),
                error: poolError,
                types: poolTypes
                    .filter((type) => !suppressedTypes.has(type.id))
                    .map((type) => {
                        const partner = typesById.get(
                            partnersByPrimary.get(type.id) ?? 0,
                        );

                        return partner
                            ? {
                                  ...type,
                                  name: `${type.name} OR ${partner.name}`,
                                  total: type.total + partner.total,
                              }
                            : type;
                    }),
                orOptions,
                pairError: manualPairError,
                onPairChange: updateOrPair,
                questions: summaryHasCurrentQuestions ? listedQuestions : [],
                selected: summaryHasCurrentQuestions
                    ? Object.fromEntries(
                          selectedManual.map(({ question, marks }) => [
                              question.id,
                              marks,
                          ]),
                      )
                    : {},
                search: questionSearch,
                typeFilter: filterTypeId ? String(filterTypeId) : '',
                selectedOnly,
                onSearchChange: setQuestionSearch,
                onTypeChange: setTypeFilter,
                onSelectedOnlyChange: setSelectedOnly,
                onToggle: (id) => {
                    const question = pool?.questions.data.find(
                        (item) => item.id === id,
                    );

                    if (!question || !summaryHasCurrentQuestions) {
                        return;
                    }

                    setManual((current) => {
                        const next = { ...current };

                        if (next[id]) {
                            delete next[id];
                        } else {
                            next[id] = {
                                question,
                                marks: question.is_objective ? 1 : 2,
                            };
                        }

                        return next;
                    });
                },
                onMarksChange: (id, marks) =>
                    setManual((current) => {
                        if (!current[id]) {
                            return current;
                        }

                        return {
                            ...current,
                            [id]: { ...current[id], marks: marks || 1 },
                        };
                    }),
            },
            review: {
                name,
                minutes,
                variants,
                allowRepeat,
                pastPaper,
                isPefPattern,
                loading: poolBusy,
                orOptions,
                onPairChange: updateOrPair,
                rows:
                    poolScopeKey === questionScopeKey
                        ? reviewRows.map((row) => ({
                              ...row,
                              available:
                                  autoRows.find((item) => item.id === row.id)
                                      ?.available ?? 0,
                          }))
                        : [],
                totalQuestions: summaryHasCurrentQuestions ? totalQuestions : 0,
                totalMarks: summaryTotalMarks,
                variantsHaveEnoughQuestions,
                canGenerate,
                saving,
                error: saveError,
                sidebarCollapsed,
                onNameChange: setName,
                onMinutesChange: setMinutes,
                onVariantsChange: setVariants,
                onAllowRepeatChange: setAllowRepeat,
                onPastPaperChange: setPastPaper,
                onSectionChange: updateAutoSection,
                onClear: () => {
                    setTemplateId(null);
                    setAutoSections([]);
                    setOrPairs([]);
                    setTemplateRevision((revision) => revision + 1);
                    setMinutes(40);
                },
                canResetDefault:
                    usesDistribution &&
                    availableTemplates.length > 0 &&
                    !isPefPattern,
                onResetDefault: () =>
                    applyTemplate(
                        selectedTemplate ?? availableTemplates[0] ?? null,
                    ),
                onGenerate: generate,
            },
            template: {
                subjectSelected: targetSubject !== null,
                syllabusSelected: targetCoverage.length > 0,
                loading:
                    targetCoverage.length > 0 &&
                    !poolError &&
                    (poolBusy || poolScopeKey !== questionScopeKey),
                error: poolError,
                selectedId: selectedTemplate?.id ?? null,
                options: availableTemplates.map((template) => ({
                    id: template.id,
                    name: template.name,
                    category: template.category,
                    minutes: template.minutes,
                    ready: template.sections.every(
                        (section) =>
                            (typesById.get(section.question_type_id)?.total ??
                                0) >= section.quantity,
                    ),
                    rows: template.sections
                        .map((section) => ({
                            id: section.question_type_id,
                            name:
                                typesById.get(section.question_type_id)?.name ??
                                questionTypeNames[section.question_type_id] ??
                                'Unavailable question type',
                            total: section.quantity,
                            required:
                                section.required_questions ?? section.quantity,
                            marks: section.marks,
                        }))
                        .sort(
                            (left, right) =>
                                (typeRanks.get(left.id) ??
                                    Number.MAX_SAFE_INTEGER) -
                                (typeRanks.get(right.id) ??
                                    Number.MAX_SAFE_INTEGER),
                        ),
                })),
                onSelect: (id) => {
                    const template = availableTemplates.find(
                        (item) => item.id === id,
                    );

                    if (!template) {
                        return;
                    }

                    applyTemplate(template);
                },
            },
            syllabus: {
                mode,
                subjectSelected: targetSubject !== null,
                years: availableYears,
                year: activeYear,
                monthOptions: monthChoices.map((month) => ({
                    id: month,
                    label: MONTHS[month - 1],
                })),
                month: months[0] ?? null,
                descriptions: selectedMonthDescriptions.map((description) => ({
                    ...description,
                    label: MONTHS[description.month - 1],
                    chapterCount: targetCoverage.filter((chapter) =>
                        chapter.months.includes(description.month),
                    ).length,
                })),
                chapters: subjectChapters,
                chapterIds,
                onYearChange: (year) => {
                    setQatYear(year);
                    setMonths([]);
                },
                onMonthChange: (month) =>
                    setMonths(month === null ? [] : [month]),
                onChapterChange: toggleChapter,
                onAllChaptersChange: (checked) =>
                    toggleChapterGroup(
                        subjectChapters.map((chapter) => chapter.id),
                        checked,
                    ),
            },
        });
    }

    return (
        <div className="w-full space-y-4 pb-20">
            <Head title={`${mode === 'auto' ? 'Auto' : 'Manual'} QAT paper`} />
            <Button asChild variant="ghost" size="sm" className="-ml-3">
                <Link href="/qa-tests">
                    <ArrowLeftIcon /> QAT Tests
                </Link>
            </Button>
            <PageHeader
                title={
                    mode === 'auto'
                        ? 'Auto paper generation'
                        : 'Manual paper generation'
                }
            />
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                <Card padding="md" className="min-w-0 space-y-4">
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold">
                            Choose your class &amp; subject
                        </h2>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Class
                                </span>
                                <FloatingCombobox
                                    label="Class"
                                    hideLabel
                                    compact
                                    placeholder="Search classes"
                                    leadingIcon={GraduationCapIcon}
                                    options={classOptions}
                                    value={
                                        classOptions.find(
                                            (item) => item.id === classIds[0],
                                        ) ?? null
                                    }
                                    onChange={(item) =>
                                        toggleClass(
                                            item ? Number(item.id) : null,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Subject
                                </span>
                                <FloatingCombobox
                                    label="Subject"
                                    hideLabel
                                    compact
                                    placeholder="Search subjects"
                                    leadingIcon={BookOpenIcon}
                                    disabled={!classIds.length}
                                    options={subjectOptions}
                                    value={
                                        subjectOptions.find(
                                            (item) => item.id === subjectIds[0],
                                        ) ?? null
                                    }
                                    onChange={(item) =>
                                        toggleSubject(
                                            item ? Number(item.id) : null,
                                        )
                                    }
                                />
                            </div>
                        </div>
                        {!classes.length && (
                            <EmptyState
                                icon={GraduationCapIcon}
                                title="No classes available"
                            />
                        )}
                        {classIds.length > 0 && !subjectOptions.length && (
                            <EmptyState
                                icon={BookOpenIcon}
                                title="No subjects available"
                            />
                        )}
                        {mode === 'manual' && targetSubject && (
                            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/30">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="text-sm font-semibold">
                                        Chapters
                                    </h3>
                                    <label className={selectAllClass}>
                                        <input
                                            type="checkbox"
                                            className="size-4 accent-brand-600"
                                            checked={
                                                subjectChapters.length > 0 &&
                                                subjectChapters.every(
                                                    (chapter) =>
                                                        chapterIds.includes(
                                                            chapter.id,
                                                        ),
                                                )
                                            }
                                            disabled={!subjectChapters.length}
                                            onChange={(event) =>
                                                toggleChapterGroup(
                                                    subjectChapters.map(
                                                        (chapter) => chapter.id,
                                                    ),
                                                    event.target.checked,
                                                )
                                            }
                                        />
                                        Select all
                                    </label>
                                </div>
                                <div className="grid gap-1 sm:grid-cols-2">
                                    {subjectChapters.map((chapter) => (
                                        <label
                                            key={chapter.id}
                                            className="flex cursor-pointer items-start gap-2 rounded-md p-2 text-sm transition-colors hover:bg-white dark:hover:bg-slate-800"
                                        >
                                            <input
                                                type="checkbox"
                                                className="mt-0.5 size-4 shrink-0 accent-brand-600"
                                                checked={chapterIds.includes(
                                                    chapter.id,
                                                )}
                                                onChange={() =>
                                                    toggleChapter(chapter.id)
                                                }
                                            />
                                            <span className="min-w-0 break-words">
                                                {chapter.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                {!subjectChapters.length && (
                                    <p className="text-sm text-slate-500">
                                        No chapters available for this subject.
                                    </p>
                                )}
                            </div>
                        )}
                    </section>

                    {mode === 'auto' && targetSubject && (
                        <section className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                            <h2 className="text-lg font-semibold">
                                Choose your syllabus
                            </h2>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Academic year
                                    <select
                                        className={inputClass}
                                        value={activeYear}
                                        onChange={(event) => {
                                            setQatYear(event.target.value);
                                            setMonths([]);
                                        }}
                                    >
                                        {availableYears.map((year) => (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Preparation month
                                    <select
                                        className={inputClass}
                                        value={months[0] ?? ''}
                                        disabled={!monthChoices.length}
                                        onChange={(event) =>
                                            setMonths(
                                                event.target.value
                                                    ? [
                                                          Number(
                                                              event.target
                                                                  .value,
                                                          ),
                                                      ]
                                                    : [],
                                            )
                                        }
                                    >
                                        <option value="">Select month</option>
                                        {monthChoices.map((month) => (
                                            <option key={month} value={month}>
                                                {MONTHS[month - 1]}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            {selectedMonthDescriptions.length > 0 && (
                                <div
                                    aria-live="polite"
                                    className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3 dark:border-brand-500/30 dark:bg-brand-500/5"
                                >
                                    {selectedMonthDescriptions.map(
                                        ({ month, books }) => (
                                            <div
                                                key={month}
                                                className="space-y-2"
                                            >
                                                <h3 className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                                                    {MONTHS[month - 1]} Syllabus
                                                </h3>
                                                {books.length ? (
                                                    books.map((book) => (
                                                        <div
                                                            key={book.id}
                                                            dir="auto"
                                                            className="max-w-full overflow-x-auto text-sm text-slate-700 dark:text-slate-200"
                                                        >
                                                            <QuestionContent
                                                                value={
                                                                    book.description
                                                                }
                                                                className="break-words [&_h2]:text-lg [&_h2]:font-semibold [&_p+p]:mt-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 dark:[&_td]:border-slate-600 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:font-semibold dark:[&_th]:border-slate-600"
                                                            />
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                                        No description has been
                                                        added for this month.
                                                    </p>
                                                )}
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}
                            {!monthChoices.length && (
                                <p className="text-sm text-amber-700">
                                    No month mappings have been added for this
                                    subject.
                                </p>
                            )}
                        </section>
                    )}

                    {coverage.length > 0 && (
                        <>
                            {mode === 'auto' && (
                                <h2 className="border-t border-slate-200 pt-4 text-lg font-semibold dark:border-slate-700">
                                    Choose a paper template
                                </h2>
                            )}
                            {poolError && (
                                <p
                                    role="alert"
                                    className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
                                >
                                    {poolError}
                                </p>
                            )}
                            {poolBusy && (
                                <p className="text-sm text-slate-500">
                                    Loading QAT questions…
                                </p>
                            )}
                            {!poolBusy &&
                                poolScopeKey === questionScopeKey &&
                                pool &&
                                mode === 'auto' && (
                                    <div className="space-y-3">
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {availableTemplates.map(
                                                (template) => {
                                                    const rows =
                                                        template.sections
                                                            .map((section) => ({
                                                                ...section,
                                                                type: typesById.get(
                                                                    section.question_type_id,
                                                                ),
                                                            }))
                                                            .sort(
                                                                (left, right) =>
                                                                    (typeRanks.get(
                                                                        left.question_type_id,
                                                                    ) ??
                                                                        Number.MAX_SAFE_INTEGER) -
                                                                    (typeRanks.get(
                                                                        right.question_type_id,
                                                                    ) ??
                                                                        Number.MAX_SAFE_INTEGER),
                                                            );
                                                    const ready = rows.every(
                                                        (row) =>
                                                            (row.type?.total ??
                                                                0) >=
                                                            row.quantity,
                                                    );

                                                    return (
                                                        <button
                                                            key={template.id}
                                                            type="button"
                                                            aria-pressed={
                                                                selectedTemplate?.id ===
                                                                template.id
                                                            }
                                                            onClick={() => {
                                                                setTemplateId(
                                                                    template.id,
                                                                );
                                                                setAutoSections(
                                                                    normalizedSections(
                                                                        template.sections,
                                                                    ),
                                                                );
                                                                setMinutes(
                                                                    template.minutes,
                                                                );
                                                            }}
                                                            className={`rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${selectedTemplate?.id === template.id ? 'border-brand-500 bg-brand-50 shadow-sm dark:bg-brand-500/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    {template.category && (
                                                                        <Badge tone="info">
                                                                            {
                                                                                template.category
                                                                            }
                                                                        </Badge>
                                                                    )}
                                                                    <h3 className="mt-2 font-semibold">
                                                                        {
                                                                            template.name
                                                                        }
                                                                    </h3>
                                                                    <p className="mt-1 text-xs text-slate-500">
                                                                        {
                                                                            template.minutes
                                                                        }{' '}
                                                                        min ·{' '}
                                                                        {rows.reduce(
                                                                            (
                                                                                sum,
                                                                                row,
                                                                            ) =>
                                                                                sum +
                                                                                row.quantity,
                                                                            0,
                                                                        )}{' '}
                                                                        total
                                                                        questions
                                                                    </p>
                                                                </div>
                                                                <span
                                                                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${selectedTemplate?.id === template.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'}`}
                                                                >
                                                                    {selectedTemplate?.id ===
                                                                        template.id && (
                                                                        <CheckIcon className="size-3" />
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-xs dark:border-slate-700">
                                                                {rows.map(
                                                                    (row) => (
                                                                        <div
                                                                            key={
                                                                                row.question_type_id
                                                                            }
                                                                            className="flex justify-between gap-2"
                                                                        >
                                                                            <span>
                                                                                {row
                                                                                    .type
                                                                                    ?.name ??
                                                                                    questionTypeNames[
                                                                                        row
                                                                                            .question_type_id
                                                                                    ] ??
                                                                                    'Unavailable question type'}{' '}
                                                                                ·{' '}
                                                                                {
                                                                                    row.quantity
                                                                                }{' '}
                                                                                total
                                                                                ·{' '}
                                                                                {row.required_questions ??
                                                                                    row.quantity}{' '}
                                                                                required
                                                                                ×{' '}
                                                                                {
                                                                                    row.marks
                                                                                }
                                                                            </span>
                                                                            <strong>
                                                                                {(row.required_questions ??
                                                                                    row.quantity) *
                                                                                    row.marks}
                                                                            </strong>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                            <div className="mt-3 flex justify-between text-sm font-semibold">
                                                                <span>
                                                                    Total marks
                                                                </span>
                                                                <span>
                                                                    {rows.reduce(
                                                                        (
                                                                            sum,
                                                                            row,
                                                                        ) =>
                                                                            sum +
                                                                            (row.required_questions ??
                                                                                row.quantity) *
                                                                                row.marks,
                                                                        0,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            {!ready && (
                                                                <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                                                                    Not enough
                                                                    questions in
                                                                    the selected
                                                                    syllabus for
                                                                    this
                                                                    template.
                                                                </p>
                                                            )}
                                                        </button>
                                                    );
                                                },
                                            )}
                                        </div>
                                        {!availableTemplates.length && (
                                            <EmptyState
                                                icon={FileTextIcon}
                                                title="No templates for this book"
                                            />
                                        )}
                                    </div>
                                )}
                            {poolScopeKey === questionScopeKey &&
                                (mode === 'auto' || pool !== null) && (
                                    <>
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                                            <h2 className="text-lg font-semibold">
                                                {mode === 'auto'
                                                    ? 'Review paper'
                                                    : 'Selected questions overview'}
                                            </h2>
                                            {mode === 'auto' && (
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => {
                                                            setTemplateId(null);
                                                            setAutoSections([]);
                                                            setMinutes(40);
                                                        }}
                                                    >
                                                        Clear
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <label className="space-y-1 text-xs font-semibold text-slate-600">
                                                Paper name
                                                <input
                                                    className={inputClass}
                                                    value={name}
                                                    maxLength={150}
                                                    onChange={(event) =>
                                                        setName(
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            </label>
                                            <label className="space-y-1 text-xs font-semibold text-slate-600">
                                                Duration (minutes)
                                                <input
                                                    type="number"
                                                    min="10"
                                                    max="240"
                                                    className={inputClass}
                                                    value={minutes}
                                                    onChange={(event) =>
                                                        setMinutes(
                                                            Number(
                                                                event.target
                                                                    .value,
                                                            ),
                                                        )
                                                    }
                                                />
                                            </label>
                                        </div>
                                        {mode === 'auto' && (
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <fieldset className="space-y-1">
                                                    <legend className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                        Paper variants
                                                    </legend>
                                                    <div className="inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                                                        {[1, 2, 3, 4].map(
                                                            (count) => (
                                                                <button
                                                                    key={count}
                                                                    type="button"
                                                                    aria-pressed={
                                                                        variants ===
                                                                        count
                                                                    }
                                                                    onClick={() =>
                                                                        setVariants(
                                                                            count,
                                                                        )
                                                                    }
                                                                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:px-4 ${variants === count ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500 hover:bg-white/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-slate-100'}`}
                                                                >
                                                                    {count}{' '}
                                                                    {count === 1
                                                                        ? 'Paper'
                                                                        : 'Papers'}
                                                                </button>
                                                            ),
                                                        )}
                                                    </div>
                                                </fieldset>
                                                <label className="flex items-end gap-2 pb-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={allowRepeat}
                                                        onChange={(event) =>
                                                            setAllowRepeat(
                                                                event.target
                                                                    .checked,
                                                            )
                                                        }
                                                        className="size-4 accent-brand-600"
                                                    />
                                                    Allow repeats between
                                                    variants
                                                </label>
                                                <QatPastPaperCheckbox
                                                    checked={pastPaper}
                                                    onChange={setPastPaper}
                                                />
                                            </div>
                                        )}
                                        {mode === 'auto' &&
                                            totalQuestions > 0 &&
                                            !variantsHaveEnoughQuestions && (
                                                <p className="text-sm text-amber-700 dark:text-amber-400">
                                                    This syllabus does not have
                                                    enough questions for the
                                                    selected number of paper
                                                    variants.
                                                </p>
                                            )}
                                        <div className="space-y-2">
                                            {mode === 'auto' && (
                                                <h3 className="text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                    {isPefPattern
                                                        ? 'PEF Pattern'
                                                        : 'Non PEF Pattern'}
                                                </h3>
                                            )}
                                            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                                                <div className="grid grid-cols-[minmax(0,1fr)_70px_70px_70px] gap-2 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 dark:bg-slate-800/50">
                                                    <span>Question type</span>
                                                    <span className="text-right">
                                                        Total
                                                    </span>
                                                    <span className="text-right">
                                                        Required
                                                    </span>
                                                    <span className="text-right">
                                                        Marks
                                                    </span>
                                                </div>
                                                {reviewRows.map((row) => (
                                                    <div
                                                        key={row.id}
                                                        className="grid grid-cols-[minmax(0,1fr)_70px_70px_70px] gap-2 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-700"
                                                    >
                                                        <span className="truncate">
                                                            {row.name}
                                                        </span>
                                                        {mode === 'auto' ? (
                                                            <>
                                                                <input
                                                                    aria-label={`${row.name} total`}
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    step="1"
                                                                    className={`${inputClass} px-2 text-right`}
                                                                    value={
                                                                        row.count ||
                                                                        ''
                                                                    }
                                                                    placeholder="0"
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        updateAutoSection(
                                                                            row.id,
                                                                            'quantity',
                                                                            Number(
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            ),
                                                                        )
                                                                    }
                                                                />
                                                                <input
                                                                    aria-label={`${row.name} required`}
                                                                    type="number"
                                                                    min={
                                                                        row.count >
                                                                        0
                                                                            ? 1
                                                                            : 0
                                                                    }
                                                                    max={
                                                                        row.count
                                                                    }
                                                                    step="1"
                                                                    disabled={
                                                                        row.count ===
                                                                        0
                                                                    }
                                                                    className={`${inputClass} px-2 text-right disabled:opacity-50`}
                                                                    value={
                                                                        row.required ||
                                                                        ''
                                                                    }
                                                                    placeholder="0"
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        updateAutoSection(
                                                                            row.id,
                                                                            'required_questions',
                                                                            Number(
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            ),
                                                                        )
                                                                    }
                                                                />
                                                                <input
                                                                    aria-label={`${row.name} marks`}
                                                                    type="number"
                                                                    min={
                                                                        row.required *
                                                                        0.5
                                                                    }
                                                                    max={
                                                                        row.required *
                                                                        20
                                                                    }
                                                                    step="0.5"
                                                                    disabled={
                                                                        row.count ===
                                                                        0
                                                                    }
                                                                    className={`${inputClass} px-2 text-right disabled:opacity-50`}
                                                                    value={
                                                                        row.marks ||
                                                                        ''
                                                                    }
                                                                    placeholder="0"
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        updateAutoSection(
                                                                            row.id,
                                                                            'marks',
                                                                            Number(
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            ),
                                                                        )
                                                                    }
                                                                />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <strong className="text-right">
                                                                    {row.count}
                                                                </strong>
                                                                <strong className="text-right">
                                                                    {
                                                                        row.required
                                                                    }
                                                                </strong>
                                                                <strong className="text-right">
                                                                    {row.marks}
                                                                </strong>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                                <div className="grid grid-cols-[minmax(0,1fr)_70px_70px_70px] gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800/50">
                                                    <span>Total</span>
                                                    <span className="text-right">
                                                        {totalQuestions}
                                                    </span>
                                                    <span className="text-right">
                                                        {reviewRows.reduce(
                                                            (sum, row) =>
                                                                sum +
                                                                row.required,
                                                            0,
                                                        )}
                                                    </span>
                                                    <span className="text-right">
                                                        {totalMarks}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {saveError && (
                                            <p
                                                role="alert"
                                                className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
                                            >
                                                {saveError}
                                            </p>
                                        )}
                                    </>
                                )}
                            {pool &&
                                poolScopeKey === questionScopeKey &&
                                mode === 'manual' &&
                                (!poolBusy || selectedOnly) && (
                                    <section
                                        className="space-y-3"
                                        aria-labelledby="qat-manual-questions"
                                    >
                                        <h2
                                            id="qat-manual-questions"
                                            className="border-t border-slate-200 pt-4 text-lg font-semibold dark:border-slate-700"
                                        >
                                            Pick questions manually
                                        </h2>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="relative w-full sm:w-72">
                                                <SearchIcon className="absolute left-3 top-2.5 size-4 text-slate-400" />
                                                <input
                                                    className={`${inputClass} pl-9`}
                                                    value={questionSearch}
                                                    disabled={selectedOnly}
                                                    onChange={(event) =>
                                                        setQuestionSearch(
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Search questions"
                                                />
                                            </div>
                                            <select
                                                className={`${inputClass} sm:w-52`}
                                                aria-label="Filter question type"
                                                value={typeFilter}
                                                disabled={selectedOnly}
                                                onChange={(event) =>
                                                    setTypeFilter(
                                                        event.target.value,
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    All question types
                                                </option>
                                                {pool.types.map((type) => (
                                                    <option
                                                        key={type.id}
                                                        value={type.id}
                                                    >
                                                        {type.name} (
                                                        {type.total})
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm transition-colors hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500/50 sm:ml-auto">
                                                <label
                                                    htmlFor="qat-selected-only"
                                                    className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-200"
                                                >
                                                    Selected only
                                                </label>
                                                <Switch
                                                    id="qat-selected-only"
                                                    aria-label="Selected only"
                                                    checked={selectedOnly}
                                                    onCheckedChange={
                                                        setSelectedOnly
                                                    }
                                                    className="data-[state=checked]:bg-brand-600"
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-[60vh] space-y-2 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-slate-50/30 p-2 dark:border-slate-700 dark:bg-slate-900/30">
                                            {listedQuestions.map((question) => (
                                                <div
                                                    key={question.id}
                                                    className={`rounded-xl border p-3 ${manual[question.id] ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 dark:border-slate-700'}`}
                                                >
                                                    <label className="flex cursor-pointer items-start gap-3">
                                                        <input
                                                            type="checkbox"
                                                            className="mt-1 size-4 shrink-0 accent-brand-600"
                                                            checked={
                                                                !!manual[
                                                                    question.id
                                                                ]
                                                            }
                                                            onChange={() =>
                                                                setManual(
                                                                    (
                                                                        current,
                                                                    ) => {
                                                                        const next =
                                                                            {
                                                                                ...current,
                                                                            };

                                                                        if (
                                                                            next[
                                                                                question
                                                                                    .id
                                                                            ]
                                                                        ) {
                                                                            delete next[
                                                                                question
                                                                                    .id
                                                                            ];
                                                                        } else {
                                                                            next[
                                                                                question.id
                                                                            ] =
                                                                                {
                                                                                    question,
                                                                                    marks: question.is_objective
                                                                                        ? 1
                                                                                        : 2,
                                                                                };
                                                                        }

                                                                        return next;
                                                                    },
                                                                )
                                                            }
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <QatQuestionStatement
                                                                question={
                                                                    question
                                                                }
                                                            />
                                                            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                                                <span className="rounded-md border border-brand-300 bg-brand-100 px-1.5 py-0.5 text-brand-800 shadow-sm dark:border-brand-500/50 dark:bg-brand-500/20 dark:text-brand-200">
                                                                    {
                                                                        question.type_name
                                                                    }
                                                                </span>
                                                                <span
                                                                    className={
                                                                        questionMetaBadgeClass
                                                                    }
                                                                >
                                                                    Chapter:{' '}
                                                                    {
                                                                        question.chapter_name
                                                                    }
                                                                </span>
                                                                {question.topic_name && (
                                                                    <span
                                                                        className={
                                                                            questionMetaBadgeClass
                                                                        }
                                                                    >
                                                                        Topic:{' '}
                                                                        {
                                                                            question.topic_name
                                                                        }
                                                                    </span>
                                                                )}
                                                                {question.source_label && (
                                                                    <span
                                                                        className={
                                                                            questionMetaBadgeClass
                                                                        }
                                                                    >
                                                                        Source:{' '}
                                                                        {
                                                                            question.source_label
                                                                        }
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </label>
                                                    {manual[question.id] && (
                                                        <div className="mt-2 flex items-center gap-2 pl-7">
                                                            <label
                                                                htmlFor={`qat-marks-${question.id}`}
                                                                className="text-xs font-semibold text-slate-600 dark:text-slate-300"
                                                            >
                                                                Marks:
                                                            </label>
                                                            <input
                                                                id={`qat-marks-${question.id}`}
                                                                type="number"
                                                                min="0.5"
                                                                max="20"
                                                                step="0.5"
                                                                className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                                                value={
                                                                    manual[
                                                                        question
                                                                            .id
                                                                    ].marks
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    setManual(
                                                                        (
                                                                            current,
                                                                        ) => ({
                                                                            ...current,
                                                                            [question.id]:
                                                                                {
                                                                                    question,
                                                                                    marks:
                                                                                        Number(
                                                                                            event
                                                                                                .target
                                                                                                .value,
                                                                                        ) ||
                                                                                        1,
                                                                                },
                                                                        }),
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {!listedQuestions.length && (
                                                <EmptyState
                                                    icon={FileTextIcon}
                                                    title={
                                                        selectedOnly
                                                            ? 'No selected questions'
                                                            : 'No matching questions'
                                                    }
                                                />
                                            )}
                                        </div>
                                    </section>
                                )}
                        </>
                    )}
                </Card>
                <aside
                    className="order-first min-w-0 lg:sticky lg:top-0 lg:order-last"
                    aria-label="Paper summary"
                >
                    <Card padding="none" className="overflow-hidden">
                        <div className="bg-gradient-to-br from-brand-600 to-brand-700 p-4 text-white">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                                        <FileTextIcon className="size-5" />
                                    </span>
                                    <h2 className="whitespace-nowrap font-semibold">
                                        Paper summary
                                    </h2>
                                </div>
                                <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                                    {mode === 'auto' ? 'Auto' : 'Manual'}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-4 p-4">
                            <dl className="space-y-2.5 text-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <dt className="shrink-0 text-slate-500 dark:text-slate-400">
                                        Class
                                    </dt>
                                    <dd className="min-w-0 text-right font-semibold text-slate-900 dark:text-slate-100">
                                        {selectedClasses[0]?.name ??
                                            'Not selected'}
                                    </dd>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                    <dt className="shrink-0 text-slate-500 dark:text-slate-400">
                                        Book
                                    </dt>
                                    <dd className="min-w-0 text-right font-semibold text-slate-900 dark:text-slate-100">
                                        {targetSubject?.name ?? 'Not selected'}
                                    </dd>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                    <dt className="shrink-0 text-slate-500 dark:text-slate-400">
                                        Syllabus
                                    </dt>
                                    <dd className="text-right font-semibold text-slate-900 dark:text-slate-100">
                                        {targetSubject
                                            ? syllabus === 'qat'
                                                ? 'QAT monthly'
                                                : 'Custom'
                                            : 'Not selected'}
                                    </dd>
                                </div>
                                {mode === 'manual' && (
                                    <div className="flex items-start justify-between gap-3">
                                        <dt className="shrink-0 text-slate-500 dark:text-slate-400">
                                            Chapters
                                        </dt>
                                        <dd className="font-semibold text-slate-900 dark:text-slate-100">
                                            {targetCoverage.length}
                                        </dd>
                                    </div>
                                )}
                                {mode === 'auto' && (
                                    <div className="flex items-start justify-between gap-3">
                                        <dt className="shrink-0 text-slate-500 dark:text-slate-400">
                                            Template
                                        </dt>
                                        <dd className="min-w-0 text-right font-semibold text-slate-900 dark:text-slate-100">
                                            {selectedTemplate?.name ??
                                                'Not selected'}
                                        </dd>
                                    </div>
                                )}
                                <div className="flex items-start justify-between gap-3">
                                    <dt className="shrink-0 text-slate-500 dark:text-slate-400">
                                        Duration
                                    </dt>
                                    <dd className="font-semibold text-slate-900 dark:text-slate-100">
                                        {`${paperMinutes} min`}
                                    </dd>
                                </div>
                                {mode === 'auto' && (
                                    <div className="flex items-start justify-between gap-3">
                                        <dt className="shrink-0 text-slate-500 dark:text-slate-400">
                                            Variants
                                        </dt>
                                        <dd className="font-semibold text-slate-900 dark:text-slate-100">
                                            {variants}{' '}
                                            {variants === 1
                                                ? 'paper'
                                                : 'papers'}
                                        </dd>
                                    </div>
                                )}
                            </dl>

                            {targetSubject &&
                                syllabus === 'qat' &&
                                targetCoverage.length > 0 && (
                                    <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                                        <div className="flex flex-wrap gap-1.5">
                                            {months
                                                .filter((month) =>
                                                    monthChoices.includes(
                                                        month,
                                                    ),
                                                )
                                                .map((month) => (
                                                    <span
                                                        key={month}
                                                        className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                                                    >
                                                        {MONTHS[month - 1]}
                                                    </span>
                                                ))}
                                        </div>
                                    </div>
                                )}

                            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                                <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3 dark:bg-brand-500/10">
                                    <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                                        Total marks
                                    </span>
                                    <strong className="text-2xl text-brand-700 dark:text-brand-300">
                                        {summaryTotalMarks}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </Card>
                </aside>
            </div>
            <div
                className={`fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(15,23,42,0.04)] backdrop-blur transition-[left] duration-200 dark:border-slate-800 dark:bg-slate-900/95 md:px-6 ${sidebarCollapsed ? 'md:left-16' : 'md:left-60'} print:hidden`}
            >
                <Button asChild variant="secondary">
                    <Link href="/qa-tests">
                        <ArrowLeftIcon /> Back
                    </Link>
                </Button>
                <Button
                    variant="primary"
                    onClick={generate}
                    disabled={saving || !canGenerate}
                >
                    {saving ? 'Generating…' : 'Generate paper'}
                    <ArrowRightIcon />
                </Button>
            </div>
        </div>
    );
}

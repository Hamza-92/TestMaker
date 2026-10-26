import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    BookOpenIcon,
    CheckIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    FileTextIcon,
    GraduationCapIcon,
    SearchIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/tm';
import { Switch } from '@/components/ui/switch';
import { QatQuestionStatement } from './question';
import type { QatQuestion } from './question';

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
};
type PoolType = {
    id: number;
    name: string;
    is_objective: boolean;
    total: number;
};
type Pool = {
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
    sections: { question_type_id: number; quantity: number; marks: number }[];
};
type ManualChoice = { question: QatQuestion; marks: number };

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
const STEPS = [
    'Classes',
    'Books & chapters',
    'Syllabus',
    'Questions',
    'Review',
    'Preview',
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

function StepCardHeader({
    index,
    label,
    summary,
    active,
    available,
    onClick,
}: {
    index: number;
    label: string;
    summary: string;
    active: boolean;
    available: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            aria-expanded={active}
            disabled={active || !available}
            onClick={onClick}
            className={`flex w-full items-center gap-3 text-left ${active ? 'border-b border-slate-200 pb-4 dark:border-slate-700' : 'px-5 py-4 transition-colors'} ${!active && available ? 'hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500 dark:hover:bg-slate-800/60' : ''}`}
        >
            <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${active ? 'bg-brand-600 text-white' : available ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}
            >
                {!active && available ? (
                    <CheckIcon className="size-4" />
                ) : (
                    index + 1
                )}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {label}
                </span>
                {!active && (
                    <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                        {summary}
                    </span>
                )}
            </span>
            {active ? (
                <ChevronDownIcon className="size-4 shrink-0 text-brand-600" />
            ) : (
                <ChevronRightIcon className="size-4 shrink-0 text-slate-400" />
            )}
        </button>
    );
}

export default function QatCreate({
    mode,
    classes,
    subjects,
    chapters,
    templates,
}: {
    mode: 'auto' | 'manual';
    classes: QatClass[];
    subjects: QatSubject[];
    chapters: QatChapter[];
    templates: QatTemplate[];
}) {
    const [step, setStep] = useState(0);
    const [furthestStep, setFurthestStep] = useState(0);
    const hasMounted = useRef(false);
    const [classIds, setClassIds] = useState<number[]>([]);
    const [subjectIds, setSubjectIds] = useState<number[]>([]);
    const [chapterIds, setChapterIds] = useState<number[]>([]);
    const [classSearch, setClassSearch] = useState('');
    const [syllabus, setSyllabus] = useState<'custom' | 'qat'>('custom');
    const [qatYear, setQatYear] = useState('');
    const [months, setMonths] = useState<number[]>([]);
    const [targetSubjectId, setTargetSubjectId] = useState<number | null>(null);
    const [pool, setPool] = useState<Pool | null>(null);
    const [poolScopeKey, setPoolScopeKey] = useState('');
    const [poolBusy, setPoolBusy] = useState(false);
    const [poolError, setPoolError] = useState('');
    const [questionSearch, setQuestionSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [selectedOnly, setSelectedOnly] = useState(false);
    const [templateId, setTemplateId] = useState<number | null>(null);
    const [manual, setManual] = useState<Record<number, ManualChoice>>({});
    const [name, setName] = useState('QAT Practice Paper');
    const [minutes, setMinutes] = useState(40);
    const [variants, setVariants] = useState(1);
    const [allowRepeat, setAllowRepeat] = useState(false);
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
    const selectableSubjectIds = subjects
        .filter((item) => classIds.includes(item.qat_class_id))
        .map((item) => item.id);
    const selectableChapterIds = chapters
        .filter((item) => selectableSubjectIds.includes(item.qat_subject_id))
        .map((item) => item.id);
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
    const coverage =
        syllabus === 'custom'
            ? selectedChapters
            : chapters.filter(
                  (item) =>
                      selectedSubjectIds.includes(item.qat_subject_id) &&
                      item.months.some((month) => months.includes(month)),
              );
    const targetSubject =
        targetSubjects.find((item) => item.id === targetSubjectId) ??
        targetSubjects[0] ??
        null;
    const resolvedSubjectId = targetSubject?.id ?? null;
    const targetClass = classes.find(
        (item) => item.id === targetSubject?.qat_class_id,
    );
    const targetCoverage = coverage.filter(
        (item) => item.qat_subject_id === targetSubject?.id,
    );
    const availableTemplates = templates.filter(
        (item) => item.qat_subject_id === targetSubject?.id,
    );
    const selectedTemplate =
        availableTemplates.find((item) => item.id === templateId) ?? null;
    const paperMinutes =
        mode === 'auto' ? (selectedTemplate?.minutes ?? 0) : minutes;
    const stepLabels =
        mode === 'auto'
            ? [
                  'Classes',
                  'Books & chapters',
                  'Syllabus',
                  'Template',
                  'Review',
                  'Preview',
              ]
            : STEPS;
    const targetChapterKey = targetCoverage.map((item) => item.id).join(',');
    const monthKey = months.join(',');
    const questionScopeKey = `${resolvedSubjectId ?? ''}|${targetChapterKey}|${syllabus}|${monthKey}|${mode}`;
    const typeRanks = new Map(
        (pool?.types ?? []).map((type, index) => [type.id, index]),
    );
    const selectedManual = Object.values(manual).sort(
        (left, right) =>
            (typeRanks.get(left.question.question_type_id) ??
                Number.MAX_SAFE_INTEGER) -
            (typeRanks.get(right.question.question_type_id) ??
                Number.MAX_SAFE_INTEGER),
    );
    const searchTerm = questionSearch.trim().toLocaleLowerCase();
    const listedQuestions = selectedOnly
        ? selectedManual.map(({ question }) => question)
        : (pool?.questions.data ?? []).filter(
              (question) =>
                  (!typeFilter ||
                      question.question_type_id === Number(typeFilter)) &&
                  (!searchTerm ||
                      JSON.stringify({
                          statement_en: question.statement_en,
                          statement_ur: question.statement_ur,
                          description_en: question.description_en,
                          description_ur: question.description_ur,
                          content: question.content,
                          chapter_name: question.chapter_name,
                          topic_name: question.topic_name,
                          type_name: question.type_name,
                      })
                          .toLocaleLowerCase()
                          .includes(searchTerm)),
          );
    const autoRows = (selectedTemplate?.sections ?? [])
        .map((section) => {
            const type = pool?.types.find(
                (item) => item.id === section.question_type_id,
            );

            return {
                ...section,
                id: section.question_type_id,
                name: type?.name ?? `Question type ${section.question_type_id}`,
                available: type?.total ?? 0,
            };
        })
        .sort(
            (left, right) =>
                (typeRanks.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
                (typeRanks.get(right.id) ?? Number.MAX_SAFE_INTEGER),
        );
    const templateHasEnoughQuestions =
        autoRows.length > 0 &&
        autoRows.every((row) => row.available >= row.quantity);
    const variantsHaveEnoughQuestions =
        autoRows.length > 0 &&
        autoRows.every(
            (row) =>
                row.available >= row.quantity * (allowRepeat ? 1 : variants),
        );
    const manualRows = [
        ...new Set(
            selectedManual.map(({ question }) => question.question_type_id),
        ),
    ].map((typeId) => {
        const items = selectedManual.filter(
            ({ question }) => question.question_type_id === typeId,
        );

        return {
            id: typeId,
            name: items[0]?.question.type_name ?? 'Question type',
            count: items.length,
            marks: items.reduce((total, item) => total + item.marks, 0),
        };
    });
    const reviewRows =
        mode === 'auto'
            ? autoRows.map((type) => ({
                  id: type.id,
                  name: type.name,
                  count: type.quantity,
                  marks: type.quantity * type.marks,
              }))
            : manualRows;
    const totalQuestions =
        mode === 'auto'
            ? autoRows.reduce((total, type) => total + type.quantity, 0)
            : selectedManual.length;
    const totalMarks =
        mode === 'auto'
            ? autoRows.reduce(
                  (total, type) => total + type.quantity * type.marks,
                  0,
              )
            : selectedManual.reduce((total, item) => total + item.marks, 0);
    const stepSummaries = [
        `${selectedClasses.length} ${selectedClasses.length === 1 ? 'class' : 'classes'} selected`,
        `${selectedSubjects.length} books · ${selectedChapters.length} chapters`,
        syllabus === 'qat'
            ? `QAT monthly · ${months.length} ${months.length === 1 ? 'month' : 'months'}`
            : `Custom · ${coverage.length} chapters`,
        mode === 'auto'
            ? (selectedTemplate?.name ?? 'Choose a template')
            : `${selectedManual.length} questions selected`,
        `${totalQuestions} questions · ${totalMarks} marks`,
    ];

    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;

            return;
        }

        const frame = window.requestAnimationFrame(() => {
            document
                .getElementById(`qat-step-${step}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        return () => window.cancelAnimationFrame(frame);
    }, [step]);

    useEffect(() => {
        setPool(null);
        setPoolScopeKey('');
        setManual({});
        setSelectedOnly(false);
    }, [questionScopeKey]);

    useEffect(() => {
        if (
            step < 3 ||
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

                setPool(body as Pool);
                setPoolScopeKey(questionScopeKey);
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
        step,
        resolvedSubjectId,
        targetChapterKey,
        syllabus,
        monthKey,
        mode,
        questionScopeKey,
        poolScopeKey,
    ]);

    function toggleClass(id: number) {
        if (classIds.includes(id)) {
            const removed = subjects
                .filter((item) => item.qat_class_id === id)
                .map((item) => item.id);
            setSubjectIds((current) =>
                current.filter((item) => !removed.includes(item)),
            );
            setChapterIds((current) =>
                current.filter(
                    (item) =>
                        !removed.includes(
                            chapters.find((chapter) => chapter.id === item)
                                ?.qat_subject_id ?? -1,
                        ),
                ),
            );

            if (removed.includes(targetSubjectId ?? -1)) {
                setTargetSubjectId(null);
            }
        }

        setClassIds((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id],
        );
    }

    function toggleVisibleClasses(checked: boolean) {
        const visibleIds = visibleClasses.map((item) => item.id);

        if (checked) {
            setClassIds((current) => [...new Set([...current, ...visibleIds])]);

            return;
        }

        const removedSubjects = subjects
            .filter((item) => visibleIds.includes(item.qat_class_id))
            .map((item) => item.id);

        setClassIds((current) =>
            current.filter((id) => !visibleIds.includes(id)),
        );
        setSubjectIds((current) =>
            current.filter((id) => !removedSubjects.includes(id)),
        );
        setChapterIds((current) =>
            current.filter(
                (id) =>
                    !removedSubjects.includes(
                        chapters.find((chapter) => chapter.id === id)
                            ?.qat_subject_id ?? -1,
                    ),
            ),
        );

        if (removedSubjects.includes(targetSubjectId ?? -1)) {
            setTargetSubjectId(null);
        }
    }

    function toggleSubject(id: number) {
        if (subjectIds.includes(id)) {
            setChapterIds((current) =>
                current.filter(
                    (item) =>
                        chapters.find((chapter) => chapter.id === item)
                            ?.qat_subject_id !== id,
                ),
            );

            if (targetSubjectId === id) {
                setTargetSubjectId(null);
            }
        }

        setSubjectIds((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id],
        );
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

    function toggleAllBooksAndChapters(checked: boolean) {
        setSubjectIds((current) =>
            checked
                ? [...new Set([...current, ...selectableSubjectIds])]
                : current.filter((id) => !selectableSubjectIds.includes(id)),
        );
        toggleChapterGroup(selectableChapterIds, checked);

        if (
            !checked &&
            targetSubjectId !== null &&
            selectableSubjectIds.includes(targetSubjectId)
        ) {
            setTargetSubjectId(null);
        }
    }

    function changeTarget(id: number) {
        setTargetSubjectId(id);
        setPool(null);
        setPoolScopeKey('');
        setManual({});
        setTypeFilter('');
        setQuestionSearch('');
    }

    function nextAllowed(): boolean {
        if (step === 0) {
            return classIds.length > 0;
        }

        if (step === 1) {
            return selectedSubjects.length > 0;
        }

        if (step === 2) {
            return coverage.length > 0;
        }

        if (step === 3) {
            return (
                targetCoverage.length > 0 &&
                totalQuestions > 0 &&
                (mode !== 'auto' || templateHasEnoughQuestions) &&
                !poolBusy &&
                !poolError
            );
        }

        return true;
    }

    function canOpenStep(index: number): boolean {
        if (index === 0) {
            return true;
        }

        if (index > furthestStep || index > 4) {
            return false;
        }

        if (index === 1) {
            return classIds.length > 0;
        }

        if (index === 2) {
            return selectedSubjects.length > 0;
        }

        if (index === 3) {
            return coverage.length > 0;
        }

        return (
            targetCoverage.length > 0 &&
            totalQuestions > 0 &&
            (mode !== 'auto' || templateHasEnoughQuestions) &&
            !poolBusy &&
            !poolError
        );
    }

    function nextStep() {
        if (!nextAllowed()) {
            return;
        }

        if (
            step === 2 &&
            targetSubject &&
            targetSubjectId !== targetSubject.id
        ) {
            setTargetSubjectId(targetSubject.id);
        }

        const next = Math.min(step + 1, 4);
        setFurthestStep((current) => Math.max(current, next));
        setStep(next);
    }

    async function generate() {
        if (
            !targetSubject ||
            !nextAllowed() ||
            (mode === 'auto' &&
                (!selectedTemplate || !templateHasEnoughQuestions))
        ) {
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
                    class_ids: classIds,
                    subject_id: targetSubject.id,
                    syllabus,
                    chapter_ids:
                        syllabus === 'custom'
                            ? targetCoverage.map((item) => item.id)
                            : [],
                    months: syllabus === 'qat' ? months : [],
                    minutes: paperMinutes,
                    template_id: mode === 'auto' ? selectedTemplate?.id : null,
                    variants: mode === 'auto' ? variants : 1,
                    allow_repeat: mode === 'auto' && allowRepeat,
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

    const visibleClasses = useMemo(
        () =>
            classes.filter((item) =>
                item.name
                    .toLocaleLowerCase()
                    .includes(classSearch.trim().toLocaleLowerCase()),
            ),
        [classes, classSearch],
    );

    return (
        <div className="w-full space-y-6">
            <Head
                title={`${mode === 'auto' ? 'Auto' : 'Manual'} QAT paper · ${stepLabels[step]}`}
            />
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
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0 space-y-5">
                    <Card padding="lg" className="min-w-0">
                        <nav
                            aria-label="Paper generation steps"
                            className="overflow-x-auto py-2"
                        >
                            <ol className="flex min-w-[780px] items-start">
                                {stepLabels.map((label, index) => (
                                    <li
                                        key={label}
                                        aria-current={
                                            index === step ? 'step' : undefined
                                        }
                                        className="relative flex min-w-0 flex-1 flex-col items-center text-center"
                                    >
                                        {index < stepLabels.length - 1 && (
                                            <span
                                                aria-hidden="true"
                                                className="absolute left-[calc(50%+16px)] top-3 h-px w-[calc(100%-32px)] bg-slate-200 dark:bg-slate-700"
                                            />
                                        )}
                                        <span className="flex w-32 flex-col items-center gap-1">
                                            <button
                                                type="button"
                                                aria-label={`Go to ${label}`}
                                                disabled={
                                                    index === step ||
                                                    !canOpenStep(index)
                                                }
                                                onClick={() => setStep(index)}
                                                className={`relative z-10 flex size-6 items-center justify-center rounded-full text-xs font-semibold ${index === step ? 'cursor-default bg-brand-600 text-white' : canOpenStep(index) ? 'cursor-pointer bg-brand-100 text-brand-700 transition-all hover:bg-brand-200 hover:ring-4 hover:ring-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:bg-brand-500/20 dark:text-brand-300 dark:hover:bg-brand-500/30' : 'cursor-default bg-slate-100 text-slate-400 dark:bg-slate-800'}`}
                                            >
                                                {index !== step &&
                                                canOpenStep(index) ? (
                                                    <CheckIcon className="size-3.5" />
                                                ) : (
                                                    index + 1
                                                )}
                                            </button>
                                            <span
                                                className={`whitespace-nowrap text-[11px] font-medium ${index === step ? 'text-brand-700 dark:text-brand-300' : canOpenStep(index) ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}
                                            >
                                                {label}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    </Card>
                    {stepLabels.slice(0, step).map((label, index) => (
                        <Card
                            key={label}
                            id={`qat-step-${index}`}
                            padding="none"
                            className="min-w-0 scroll-mt-6 overflow-hidden"
                        >
                            <StepCardHeader
                                index={index}
                                label={label}
                                summary={stepSummaries[index]}
                                active={false}
                                available={canOpenStep(index)}
                                onClick={() => setStep(index)}
                            />
                        </Card>
                    ))}
                    <Card
                        id={`qat-step-${step}`}
                        padding="lg"
                        className="min-w-0 scroll-mt-6 space-y-5"
                    >
                        <StepCardHeader
                            index={step}
                            label={stepLabels[step]}
                            summary={stepSummaries[step]}
                            active
                            available
                        />
                        {step === 0 && (
                            <>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-semibold">
                                            Choose your classes
                                        </h2>
                                    </div>
                                    <label className={selectAllClass}>
                                        <input
                                            type="checkbox"
                                            className="size-4 accent-brand-600"
                                            checked={
                                                visibleClasses.length > 0 &&
                                                visibleClasses.every((item) =>
                                                    classIds.includes(item.id),
                                                )
                                            }
                                            disabled={!visibleClasses.length}
                                            onChange={(event) =>
                                                toggleVisibleClasses(
                                                    event.target.checked,
                                                )
                                            }
                                        />
                                        Select all
                                    </label>
                                </div>
                                <div className="relative w-full sm:max-w-xs">
                                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        className={`${inputClass} pl-9`}
                                        aria-label="Search classes"
                                        placeholder="Search classes"
                                        value={classSearch}
                                        onChange={(event) =>
                                            setClassSearch(event.target.value)
                                        }
                                    />
                                </div>
                                {visibleClasses.length ? (
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                        {visibleClasses.map((item) => (
                                            <label
                                                key={item.id}
                                                className={`tm-lift flex h-20 cursor-pointer items-center gap-2 rounded-xl border p-3 ${classIds.includes(item.id) ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="size-4 accent-brand-600"
                                                    checked={classIds.includes(
                                                        item.id,
                                                    )}
                                                    onChange={() =>
                                                        toggleClass(item.id)
                                                    }
                                                />
                                                <span className="min-w-0">
                                                    <strong className="block truncate text-sm">
                                                        {item.name}
                                                    </strong>
                                                    <small className="text-slate-500">
                                                        {item.subject_count}{' '}
                                                        {item.subject_count ===
                                                        1
                                                            ? 'book'
                                                            : 'books'}
                                                    </small>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        icon={GraduationCapIcon}
                                        title="No classes available"
                                    />
                                )}
                            </>
                        )}

                        {step === 1 && (
                            <>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-semibold">
                                            Select books & chapters
                                        </h2>
                                    </div>
                                    <label className={selectAllClass}>
                                        <input
                                            type="checkbox"
                                            className="size-4 accent-brand-600"
                                            checked={
                                                selectableSubjectIds.length >
                                                    0 &&
                                                selectableSubjectIds.every(
                                                    (id) =>
                                                        subjectIds.includes(id),
                                                ) &&
                                                selectableChapterIds.every(
                                                    (id) =>
                                                        chapterIds.includes(id),
                                                )
                                            }
                                            disabled={
                                                !selectableSubjectIds.length
                                            }
                                            onChange={(event) =>
                                                toggleAllBooksAndChapters(
                                                    event.target.checked,
                                                )
                                            }
                                        />
                                        Select all books &amp; chapters
                                    </label>
                                </div>
                                <div className="space-y-4">
                                    {selectedClasses.map((klass) => {
                                        const books = subjects.filter(
                                            (item) =>
                                                item.qat_class_id === klass.id,
                                        );

                                        return (
                                            <section
                                                key={klass.id}
                                                className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                                            >
                                                <div className="flex items-center justify-between bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                                                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                                                        <GraduationCapIcon className="size-4 text-brand-600" />{' '}
                                                        {klass.name}
                                                    </h3>
                                                    <span className="text-xs text-slate-500">
                                                        {books.length} books
                                                    </span>
                                                </div>
                                                {books.map((book) => {
                                                    const bookChapters =
                                                        chapters.filter(
                                                            (item) =>
                                                                item.qat_subject_id ===
                                                                book.id,
                                                        );
                                                    const checked =
                                                        subjectIds.includes(
                                                            book.id,
                                                        );

                                                    return (
                                                        <div
                                                            key={book.id}
                                                            className="border-t border-slate-200 px-4 py-4 dark:border-slate-700"
                                                        >
                                                            <label className="flex cursor-pointer items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    className="size-4 accent-brand-600"
                                                                    checked={
                                                                        checked
                                                                    }
                                                                    onChange={() =>
                                                                        toggleSubject(
                                                                            book.id,
                                                                        )
                                                                    }
                                                                />
                                                                <BookOpenIcon className="size-4 text-brand-600" />
                                                                <span className="min-w-0 flex-1">
                                                                    <strong className="block text-sm">
                                                                        {
                                                                            book.name
                                                                        }
                                                                    </strong>
                                                                    <small className="text-slate-500">
                                                                        {
                                                                            bookChapters.length
                                                                        }{' '}
                                                                        chapters
                                                                    </small>
                                                                </span>
                                                                <Badge tone="neutral">
                                                                    {
                                                                        bookChapters.filter(
                                                                            (
                                                                                item,
                                                                            ) =>
                                                                                chapterIds.includes(
                                                                                    item.id,
                                                                                ),
                                                                        ).length
                                                                    }
                                                                    /
                                                                    {
                                                                        bookChapters.length
                                                                    }
                                                                </Badge>
                                                            </label>
                                                            {checked && (
                                                                <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/40">
                                                                    <div className="mb-3 flex items-center justify-between">
                                                                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                                            Chapters
                                                                        </span>
                                                                        <label
                                                                            className={
                                                                                selectAllClass
                                                                            }
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                className="size-4 accent-brand-600"
                                                                                checked={
                                                                                    bookChapters.length >
                                                                                        0 &&
                                                                                    bookChapters.every(
                                                                                        (
                                                                                            item,
                                                                                        ) =>
                                                                                            chapterIds.includes(
                                                                                                item.id,
                                                                                            ),
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    !bookChapters.length
                                                                                }
                                                                                onChange={(
                                                                                    event,
                                                                                ) =>
                                                                                    toggleChapterGroup(
                                                                                        bookChapters.map(
                                                                                            (
                                                                                                item,
                                                                                            ) =>
                                                                                                item.id,
                                                                                        ),
                                                                                        event
                                                                                            .target
                                                                                            .checked,
                                                                                    )
                                                                                }
                                                                            />
                                                                            Select
                                                                            all
                                                                        </label>
                                                                    </div>
                                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                                        {bookChapters.map(
                                                                            (
                                                                                chapter,
                                                                            ) => (
                                                                                <label
                                                                                    key={
                                                                                        chapter.id
                                                                                    }
                                                                                    className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-sm hover:bg-white dark:hover:bg-slate-800"
                                                                                >
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="size-4 accent-brand-600"
                                                                                        checked={chapterIds.includes(
                                                                                            chapter.id,
                                                                                        )}
                                                                                        onChange={() =>
                                                                                            toggleChapter(
                                                                                                chapter.id,
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                    <span className="truncate">
                                                                                        {
                                                                                            chapter.name
                                                                                        }
                                                                                    </span>
                                                                                </label>
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </section>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        Choose your syllabus
                                    </h2>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => setSyllabus('custom')}
                                        className={`rounded-xl border p-4 text-left ${syllabus === 'custom' ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'}`}
                                    >
                                        <strong className="block text-sm">
                                            Custom syllabus
                                        </strong>
                                        <span className="mt-1 block text-xs text-slate-500">
                                            Use the chapters chosen in the
                                            previous step.
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSyllabus('qat')}
                                        className={`rounded-xl border p-4 text-left ${syllabus === 'qat' ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'}`}
                                    >
                                        <strong className="block text-sm">
                                            QAT monthly syllabus
                                        </strong>
                                        <span className="mt-1 block text-xs text-slate-500">
                                            Use chapters mapped to selected
                                            preparation months.
                                        </span>
                                    </button>
                                </div>
                                {syllabus === 'qat' && (
                                    <div className="space-y-3">
                                        <label className="block max-w-xs space-y-1 text-xs font-semibold text-slate-600">
                                            Academic year
                                            <select
                                                className={inputClass}
                                                value={activeYear}
                                                onChange={(event) => {
                                                    setQatYear(
                                                        event.target.value,
                                                    );
                                                    setMonths([]);
                                                }}
                                            >
                                                {availableYears.map((year) => (
                                                    <option
                                                        key={year}
                                                        value={year}
                                                    >
                                                        {year}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <h3 className="text-sm font-semibold">
                                                    Preparation months
                                                </h3>
                                                <p className="text-xs text-slate-500">
                                                    Only months mapped to your
                                                    chosen books are available.
                                                </p>
                                            </div>
                                            <label className={selectAllClass}>
                                                <input
                                                    type="checkbox"
                                                    className="size-4 accent-brand-600"
                                                    checked={
                                                        monthChoices.length >
                                                            0 &&
                                                        monthChoices.every(
                                                            (month) =>
                                                                months.includes(
                                                                    month,
                                                                ),
                                                        )
                                                    }
                                                    disabled={
                                                        !monthChoices.length
                                                    }
                                                    onChange={(event) =>
                                                        setMonths(
                                                            event.target.checked
                                                                ? monthChoices
                                                                : [],
                                                        )
                                                    }
                                                />
                                                Select all months
                                            </label>
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                            {monthChoices.map((month) => (
                                                <button
                                                    type="button"
                                                    key={month}
                                                    onClick={() =>
                                                        setMonths((current) =>
                                                            current.includes(
                                                                month,
                                                            )
                                                                ? current.filter(
                                                                      (item) =>
                                                                          item !==
                                                                          month,
                                                                  )
                                                                : [
                                                                      ...current,
                                                                      month,
                                                                  ].sort(
                                                                      (a, b) =>
                                                                          a - b,
                                                                  ),
                                                        )
                                                    }
                                                    className={`rounded-lg border px-3 py-2 text-sm ${months.includes(month) ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/10' : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'}`}
                                                >
                                                    {MONTHS[month - 1]}
                                                </button>
                                            ))}
                                        </div>
                                        {!monthChoices.length && (
                                            <p className="text-sm text-amber-700">
                                                No month mappings have been
                                                added for these books.
                                            </p>
                                        )}
                                    </div>
                                )}
                                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold">
                                            Current syllabus coverage
                                        </h3>
                                        <Badge tone="info">
                                            {coverage.length} chapters
                                        </Badge>
                                    </div>
                                    {coverage.length ? (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {coverage.map((chapter) => (
                                                <Badge
                                                    key={chapter.id}
                                                    tone="neutral"
                                                >
                                                    {
                                                        selectedSubjects.find(
                                                            (subject) =>
                                                                subject.id ===
                                                                chapter.qat_subject_id,
                                                        )?.name
                                                    }{' '}
                                                    · {chapter.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mt-3 text-sm text-slate-500">
                                            {syllabus === 'qat'
                                                ? 'Select a month with mapped chapters.'
                                                : 'Return to Books & chapters and select chapters.'}
                                        </p>
                                    )}
                                </div>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        {mode === 'auto'
                                            ? 'Choose a paper template'
                                            : 'Pick questions manually'}
                                    </h2>
                                </div>
                                <div className="grid gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:grid-cols-2">
                                    <label className="space-y-1 text-xs font-semibold text-slate-600">
                                        Target class
                                        <select
                                            className={inputClass}
                                            value={targetClass?.id ?? ''}
                                            onChange={(event) =>
                                                changeTarget(
                                                    targetSubjects.find(
                                                        (item) =>
                                                            item.qat_class_id ===
                                                            Number(
                                                                event.target
                                                                    .value,
                                                            ),
                                                    )?.id ?? 0,
                                                )
                                            }
                                        >
                                            {selectedClasses
                                                .filter((item) =>
                                                    targetSubjects.some(
                                                        (subject) =>
                                                            subject.qat_class_id ===
                                                            item.id,
                                                    ),
                                                )
                                                .map((item) => (
                                                    <option
                                                        key={item.id}
                                                        value={item.id}
                                                    >
                                                        {item.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </label>
                                    <label className="space-y-1 text-xs font-semibold text-slate-600">
                                        Book / subject
                                        <select
                                            className={inputClass}
                                            value={targetSubject?.id ?? ''}
                                            onChange={(event) =>
                                                changeTarget(
                                                    Number(event.target.value),
                                                )
                                            }
                                        >
                                            {targetSubjects
                                                .filter(
                                                    (item) =>
                                                        item.qat_class_id ===
                                                        targetClass?.id,
                                                )
                                                .map((item) => (
                                                    <option
                                                        key={item.id}
                                                        value={item.id}
                                                    >
                                                        {item.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </label>
                                </div>
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
                                {!poolBusy && pool && mode === 'auto' && (
                                    <div className="space-y-3">
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {availableTemplates.map(
                                                (template) => {
                                                    const rows =
                                                        template.sections
                                                            .map((section) => ({
                                                                ...section,
                                                                type: pool.types.find(
                                                                    (type) =>
                                                                        type.id ===
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
                                                            onClick={() =>
                                                                setTemplateId(
                                                                    template.id,
                                                                )
                                                            }
                                                            className={`rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${selectedTemplate?.id === template.id ? 'border-brand-500 bg-brand-50 shadow-sm dark:bg-brand-500/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}
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
                                                                                    `Question type ${row.question_type_id}`}{' '}
                                                                                ·{' '}
                                                                                {
                                                                                    row.quantity
                                                                                }{' '}
                                                                                ×{' '}
                                                                                {
                                                                                    row.marks
                                                                                }
                                                                            </span>
                                                                            <strong>
                                                                                {row.quantity *
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
                                                                            row.quantity *
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
                                                hint="Ask your administrator to add an active QAT template."
                                            />
                                        )}
                                    </div>
                                )}
                                {pool &&
                                    mode === 'manual' &&
                                    (!poolBusy || selectedOnly) && (
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <div className="relative w-full sm:w-72">
                                                    <SearchIcon className="absolute left-3 top-2.5 size-4 text-slate-400" />
                                                    <input
                                                        className={`${inputClass} pl-9`}
                                                        value={questionSearch}
                                                        disabled={selectedOnly}
                                                        onChange={(event) =>
                                                            setQuestionSearch(
                                                                event.target
                                                                    .value,
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
                                            <div className="max-h-[60vh] space-y-3 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-slate-50/30 p-2 dark:border-slate-700 dark:bg-slate-900/30">
                                                {listedQuestions.map(
                                                    (question) => (
                                                        <div
                                                            key={question.id}
                                                            className={`rounded-xl border p-4 ${manual[question.id] ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 dark:border-slate-700'}`}
                                                        >
                                                            <label className="flex cursor-pointer items-start gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    className="mt-1 size-4 shrink-0 accent-brand-600"
                                                                    checked={
                                                                        !!manual[
                                                                            question
                                                                                .id
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
                                                            {manual[
                                                                question.id
                                                            ] && (
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
                                                                            ]
                                                                                .marks
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
                                                    ),
                                                )}
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
                                        </div>
                                    )}
                            </>
                        )}

                        {step === 4 && (
                            <>
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        Review paper
                                    </h2>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                                        <small className="text-slate-500">
                                            Subjects
                                        </small>
                                        <strong className="mt-1 block text-xl">
                                            {selectedSubjects.length}
                                        </strong>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                                        <small className="text-slate-500">
                                            Questions
                                        </small>
                                        <strong className="mt-1 block text-xl">
                                            {totalQuestions}
                                        </strong>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                                        <small className="text-slate-500">
                                            Total marks
                                        </small>
                                        <strong className="mt-1 block text-xl">
                                            {totalMarks}
                                        </strong>
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="space-y-1 text-xs font-semibold text-slate-600">
                                        Paper name
                                        <input
                                            className={inputClass}
                                            value={name}
                                            maxLength={150}
                                            onChange={(event) =>
                                                setName(event.target.value)
                                            }
                                        />
                                    </label>
                                    {mode === 'auto' ? (
                                        <div className="space-y-1 text-xs font-semibold text-slate-600">
                                            Duration
                                            <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                {paperMinutes} minutes ·{' '}
                                                {selectedTemplate?.name}
                                            </div>
                                        </div>
                                    ) : (
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
                                                            event.target.value,
                                                        ),
                                                    )
                                                }
                                            />
                                        </label>
                                    )}
                                </div>
                                {mode === 'auto' && (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <fieldset className="space-y-1">
                                            <legend className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                Paper variants
                                            </legend>
                                            <div className="inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                                                {[1, 2, 3, 4].map((count) => (
                                                    <button
                                                        key={count}
                                                        type="button"
                                                        aria-pressed={
                                                            variants === count
                                                        }
                                                        onClick={() =>
                                                            setVariants(count)
                                                        }
                                                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:px-4 ${variants === count ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500 hover:bg-white/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-slate-100'}`}
                                                    >
                                                        {count}{' '}
                                                        {count === 1
                                                            ? 'Paper'
                                                            : 'Papers'}
                                                    </button>
                                                ))}
                                            </div>
                                        </fieldset>
                                        <label className="flex items-end gap-2 pb-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={allowRepeat}
                                                onChange={(event) =>
                                                    setAllowRepeat(
                                                        event.target.checked,
                                                    )
                                                }
                                                className="size-4 accent-brand-600"
                                            />
                                            Allow repeats between variants
                                        </label>
                                    </div>
                                )}
                                {mode === 'auto' &&
                                    !variantsHaveEnoughQuestions && (
                                        <p className="text-sm text-amber-700 dark:text-amber-400">
                                            This syllabus does not have enough
                                            questions for the selected number of
                                            paper variants.
                                        </p>
                                    )}
                                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="grid grid-cols-[minmax(0,1fr)_90px_90px] gap-2 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 dark:bg-slate-800/50">
                                        <span>Question type</span>
                                        <span className="text-right">
                                            Questions
                                        </span>
                                        <span className="text-right">
                                            Marks
                                        </span>
                                    </div>
                                    {reviewRows.map((row) => (
                                        <div
                                            key={row.id}
                                            className="grid grid-cols-[minmax(0,1fr)_90px_90px] gap-2 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-700"
                                        >
                                            <span className="truncate">
                                                {row.name}
                                            </span>
                                            <strong className="text-right">
                                                {row.count}
                                            </strong>
                                            <strong className="text-right">
                                                {row.marks}
                                            </strong>
                                        </div>
                                    ))}
                                    <div className="grid grid-cols-[minmax(0,1fr)_90px_90px] gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800/50">
                                        <span>Total</span>
                                        <span className="text-right">
                                            {totalQuestions}
                                        </span>
                                        <span className="text-right">
                                            {totalMarks}
                                        </span>
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

                        <div className="flex items-center justify-between border-t border-slate-200 pt-5 dark:border-slate-700">
                            <Button
                                variant="secondary"
                                asChild={step === 0}
                                onClick={
                                    step === 0
                                        ? undefined
                                        : () =>
                                              setStep((current) => current - 1)
                                }
                            >
                                {step === 0 ? (
                                    <Link href="/qa-tests">
                                        <ArrowLeftIcon /> Previous
                                    </Link>
                                ) : (
                                    <>
                                        <ArrowLeftIcon /> Previous
                                    </>
                                )}
                            </Button>
                            {step === 4 ? (
                                <Button
                                    variant="primary"
                                    onClick={generate}
                                    disabled={
                                        saving ||
                                        !name.trim() ||
                                        paperMinutes < 10 ||
                                        paperMinutes > 240 ||
                                        (mode === 'auto' &&
                                            !variantsHaveEnoughQuestions)
                                    }
                                >
                                    {saving ? 'Generating…' : 'Generate paper'}{' '}
                                    <ArrowRightIcon />
                                </Button>
                            ) : (
                                <Button
                                    variant="primary"
                                    onClick={nextStep}
                                    disabled={!nextAllowed()}
                                >
                                    Next <ArrowRightIcon />
                                </Button>
                            )}
                        </div>
                    </Card>
                    {stepLabels.slice(step + 1, 5).map((label, offset) => {
                        const index = step + offset + 1;

                        return (
                            <Card
                                key={label}
                                id={`qat-step-${index}`}
                                padding="none"
                                className="min-w-0 scroll-mt-6 overflow-hidden"
                            >
                                <StepCardHeader
                                    index={index}
                                    label={label}
                                    summary={stepSummaries[index]}
                                    active={false}
                                    available={canOpenStep(index)}
                                    onClick={() => setStep(index)}
                                />
                            </Card>
                        );
                    })}
                </div>
                <Card className="space-y-4 lg:sticky lg:top-6">
                    <div>
                        <h2 className="text-sm font-semibold">Paper summary</h2>
                        <p className="mt-1 text-xs text-slate-500">
                            Step {step + 1} of 6
                        </p>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Mode</span>
                            <strong>
                                {mode === 'auto' ? 'Auto' : 'Manual'}
                            </strong>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Classes</span>
                            <strong>{selectedClasses.length}</strong>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Books</span>
                            <strong>{selectedSubjects.length}</strong>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Chapters</span>
                            <strong>{coverage.length}</strong>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Syllabus</span>
                            <strong>
                                {syllabus === 'qat' ? 'QAT monthly' : 'Custom'}
                            </strong>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Questions</span>
                            <strong>{totalQuestions}</strong>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Marks</span>
                            <strong>{totalMarks}</strong>
                        </div>
                    </div>
                    {selectedClasses.length > 0 && (
                        <div className="flex flex-wrap gap-1 border-t border-slate-200 pt-3 dark:border-slate-700">
                            {selectedClasses.map((item) => (
                                <Badge key={item.id} tone="info">
                                    {item.name}
                                </Badge>
                            ))}
                        </div>
                    )}
                    {targetSubject && step >= 3 && (
                        <p className="text-xs text-slate-500">
                            Target: {targetClass?.name} · {targetSubject.name}
                        </p>
                    )}
                </Card>
            </div>
        </div>
    );
}

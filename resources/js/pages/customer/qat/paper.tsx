import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CheckIcon,
    ChevronDownIcon,
    DownloadIcon,
    FileTextIcon,
    KeyRoundIcon,
    LayoutGridIcon,
    Loader2Icon,
    PrinterIcon,
    SaveIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/tm';
import { Switch } from '@/components/ui/switch';
import { useCustomerSidebar } from '@/layouts/customer/customer-layout';
import { QuestionContent } from '../papers/paper-layouts/questions/question-content';
import {
    DEFAULT_PAPER_SETTINGS,
    PAPER_URDU_FONT_METRICS,
} from '../papers/paper-layouts/types';
import { QatObjectiveQuestion, QatQuestionContent } from './question';
import type { QatObjectiveSettings, QatQuestion } from './question';

const toolbarHoverClass =
    'border border-sky-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/10 dark:hover:text-brand-300';

const objectiveLayouts = [
    { value: 'beside', label: 'Beside the statement' },
    { value: 'four-per-row', label: 'Four options per row below' },
    { value: 'two-per-row', label: 'Two options per row below' },
] as const;
const objectiveSettingsKey = 'qat-objective-settings';

function loadObjectiveSettings(): QatObjectiveSettings {
    try {
        const stored = JSON.parse(
            localStorage.getItem(objectiveSettingsKey) ?? '{}',
        );

        return {
            layout:
                objectiveLayouts.find(
                    (option) => option.value === stored?.layout,
                )?.value ?? 'beside',
            borders: stored?.borders !== false,
        };
    } catch {
        return { layout: 'beside', borders: true };
    }
}

function QatObjectiveLayoutMenu({
    settings,
    onChange,
}: {
    settings: QatObjectiveSettings;
    onChange: (settings: QatObjectiveSettings) => void;
}) {
    return (
        <Popover>
            <PopoverButton
                as={Button}
                variant="secondary"
                size="sm"
                className={`h-10 rounded-lg ${toolbarHoverClass}`}
            >
                <LayoutGridIcon
                    aria-hidden="true"
                    className="text-violet-500"
                />
                Objective layout
                <ChevronDownIcon aria-hidden="true" className="opacity-60" />
            </PopoverButton>
            <PopoverPanel
                anchor={{ to: 'bottom end', gap: 8, padding: 12 }}
                className="z-50 w-64 max-w-[calc(100vw-1.5rem)] rounded-xl border border-sky-200 bg-white p-2 text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 print:hidden"
            >
                <fieldset>
                    <legend className="sr-only">
                        Objective option placement
                    </legend>
                    {objectiveLayouts.map(({ value, label }) => (
                        <label
                            key={value}
                            className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-sky-50 dark:hover:bg-slate-800 ${settings.layout === value ? 'bg-violet-50 font-semibold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200' : ''}`}
                        >
                            <input
                                type="radio"
                                name="qat-objective-layout"
                                value={value}
                                checked={settings.layout === value}
                                onChange={() =>
                                    onChange({ ...settings, layout: value })
                                }
                                className="size-4 shrink-0 accent-violet-600"
                            />
                            {label}
                        </label>
                    ))}
                </fieldset>
                <label
                    htmlFor="qat-option-borders"
                    className="mt-2 flex cursor-pointer items-center justify-between gap-2 border-t border-sky-100 px-3 pb-1 pt-3 text-sm font-medium dark:border-slate-700"
                >
                    Option borders
                    <Switch
                        id="qat-option-borders"
                        checked={settings.borders}
                        onCheckedChange={(borders) =>
                            onChange({ ...settings, borders })
                        }
                        className="data-[state=checked]:bg-violet-600"
                    />
                </label>
            </PopoverPanel>
        </Popover>
    );
}

type PaperQuestion = QatQuestion & {
    marks: number;
    or_question?: QatQuestion & { marks: number };
};

type PaperSection = {
    question_type_id: number;
    title: string;
    heading_en?: string | null;
    heading_ur?: string | null;
    or_heading_en?: string | null;
    or_heading_ur?: string | null;
    required_questions?: number;
    questions: PaperQuestion[];
};

type QatPaperView = {
    id: number | null;
    name: string;
    mode: 'auto' | 'manual';
    class_name: string;
    subject_name: string;
    total_marks: number;
    question_count: number;
    created_at?: string;
    paper_data: {
        academic_year: string;
        syllabus: 'custom' | 'qat';
        months: number[];
        minutes: number;
        variant: string | null;
        chapters?: {
            id: number;
            name: string;
            chapter_number: number | null;
        }[];
        sections: PaperSection[];
    };
};

type SchoolDetails = {
    name: string;
    logo: string | null;
};

const qatQuestionSize = DEFAULT_PAPER_SETTINGS.questionSize;
const qatQuestionLineHeight = DEFAULT_PAPER_SETTINGS.questionLineHeight;
const qatUrduMetrics = PAPER_URDU_FONT_METRICS[DEFAULT_PAPER_SETTINGS.urduFont];

function csrf(): string {
    return (
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
            ?.content ?? ''
    );
}

function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
        return `${minutes} Minutes`;
    }

    return `${hours} ${hours === 1 ? 'Hour' : 'Hours'}${remainingMinutes ? ` ${remainingMinutes} Minutes` : ''}`;
}

function storageAssetUrl(value: string | null): string {
    const path = value?.trim() ?? '';

    if (!path) {
        return '';
    }

    if (/^(https?:|data:|blob:)/i.test(path) || path.startsWith('/')) {
        return path;
    }

    return `/storage/${path}`;
}

function romanSection(number: number): string {
    const numerals: [number, string][] = [
        [100, 'C'],
        [90, 'XC'],
        [50, 'L'],
        [40, 'XL'],
        [10, 'X'],
        [9, 'IX'],
        [5, 'V'],
        [4, 'IV'],
        [1, 'I'],
    ];
    let remaining = number;
    let result = '';

    for (const [value, numeral] of numerals) {
        while (remaining >= value) {
            result += numeral;
            remaining -= value;
        }
    }

    return result;
}

function QatSectionHeading({ number }: { number: number }) {
    return (
        <h2
            data-paper-heading
            data-paper-section-heading
            className="qat-section-heading break-after-avoid text-center text-sm font-bold"
        >
            Section {romanSection(number)}
        </h2>
    );
}

function QatTypeHeading({
    section,
    number,
}: {
    section: PaperSection;
    number: number;
}) {
    const english = section.heading_en?.trim() || section.title;
    const urdu = section.heading_ur?.trim() || '';
    const alternateEnglish = section.or_heading_en?.trim();
    const alternateUrdu = section.or_heading_ur?.trim();
    const count = section.questions.length;
    const required = Math.min(section.required_questions ?? count, count);
    const marksEach = Number(section.questions[0]?.marks ?? 0);
    const sameMarks = section.questions.every(
        (question) => Number(question.marks) === marksEach,
    );
    const marks = Number(
        (sameMarks
            ? required * marksEach
            : section.questions.reduce(
                  (total, question) => total + Number(question.marks),
                  0,
              )
        ).toFixed(2),
    );
    const marksLabel = sameMarks
        ? `(${required}x${marksEach}=${marks})`
        : `(${marks} Marks)`;

    return (
        <div
            data-paper-heading
            className={
                urdu || alternateUrdu
                    ? 'qat-type-heading grid break-after-avoid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border border-brand-300 bg-brand-100 px-1.5 py-1 text-xs font-bold text-brand-950'
                    : 'qat-type-heading flex break-after-avoid items-center justify-between gap-3 border border-brand-300 bg-brand-100 px-1.5 py-1 text-xs font-bold text-brand-950'
            }
        >
            <div dir="ltr" lang="en" className="min-w-0 text-left">
                <span className="whitespace-nowrap">Q.{number}:-</span>{' '}
                <QuestionContent value={english} inline />
                {alternateEnglish && alternateEnglish !== english && (
                    <div>
                        OR <QuestionContent value={alternateEnglish} inline />
                    </div>
                )}
            </div>
            <div className="shrink-0 text-center">
                <span dir="ltr" className="block whitespace-nowrap">
                    {marksLabel}
                </span>
            </div>
            {(urdu || alternateUrdu) && (
                <div dir="rtl" lang="ur" className="min-w-0 text-right">
                    <span className="whitespace-nowrap">
                        سوال نمبر {number}:-
                    </span>{' '}
                    {urdu && <QuestionContent value={urdu} inline />}
                    {alternateUrdu && alternateUrdu !== urdu && (
                        <div>
                            یا <QuestionContent value={alternateUrdu} inline />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function QatPaperQuestion({
    question,
    number,
    showAnswers,
    objectiveSettings,
}: {
    question: PaperQuestion;
    number: string;
    showAnswers: boolean;
    objectiveSettings: QatObjectiveSettings;
}) {
    const alternative = question.or_question;
    const renderQuestion = (item: QatQuestion) =>
        item.is_objective ? (
            <QatObjectiveQuestion
                question={item}
                number={number}
                showAnswers={showAnswers}
                settings={objectiveSettings}
            />
        ) : (
            <QatQuestionContent question={item} number={number} />
        );

    return (
        <div
            data-paper-question
            className={`qat-question px-2 ${alternative ? 'break-inside-avoid' : ''}`}
        >
            {renderQuestion(question)}
            {alternative && (
                <>
                    <div className="my-1 flex items-center justify-center gap-2 text-xs font-bold">
                        <span lang="en">OR</span>
                        {(question.statement_ur ||
                            alternative.statement_ur) && (
                            <span lang="ur" dir="rtl">
                                یا
                            </span>
                        )}
                    </div>
                    {renderQuestion(alternative)}
                </>
            )}
        </div>
    );
}

export default function QatPaper({
    paper: initialPaper,
    variants = [],
    previewId = null,
    backUrl = '/qa-tests',
    showAnswerKey = false,
    schoolDetails,
}: {
    paper: QatPaperView;
    variants?: QatPaperView[];
    previewId?: string | null;
    backUrl?: string;
    showAnswerKey?: boolean;
    schoolDetails: SchoolDetails;
}) {
    const { collapsed: sidebarCollapsed } = useCustomerSidebar();
    const [activeVariant, setActiveVariant] = useState(0);
    const [saving, setSaving] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [showAnswers, setShowAnswers] = useState(showAnswerKey);
    const [objectiveSettings, setObjectiveSettings] = useState(
        loadObjectiveSettings,
    );
    const [actionError, setActionError] = useState('');
    const paperVariants = variants.length ? variants : [initialPaper];
    const paper = paperVariants[activeVariant] ?? initialPaper;
    const variantLabel = `Paper ${paper.paper_data.variant ?? String.fromCharCode(65 + activeVariant)}`;
    const schoolLogoUrl = storageAssetUrl(schoolDetails.logo);
    const objectiveSections = paper.paper_data.sections
        .map((section) => ({
            ...section,
            questions: section.questions.filter(
                (question) => question.is_objective,
            ),
        }))
        .filter((section) => section.questions.length > 0);
    const subjectiveSections = paper.paper_data.sections
        .map((section) => ({
            ...section,
            questions: section.questions.filter(
                (question) => !question.is_objective,
            ),
        }))
        .filter((section) => section.questions.length > 0);
    const objectiveQuestions = objectiveSections.flatMap(
        (section) => section.questions,
    );
    const hasObjectiveOptions =
        objectiveQuestions.length > 0 ||
        subjectiveSections.some((section) =>
            section.questions.some(
                (question) => question.or_question?.is_objective,
            ),
        );
    const chapters = paper.paper_data.chapters ?? [];
    const chapterNumbers = [
        ...new Set(
            chapters
                .map((chapter) => chapter.chapter_number)
                .filter(
                    (number): number is number =>
                        number !== null &&
                        Number.isInteger(number) &&
                        number > 0,
                ),
        ),
    ].sort((left, right) => left - right);
    const unnumberedChapterNames = chapters
        .filter(
            (chapter) => !chapter.chapter_number || chapter.chapter_number < 1,
        )
        .map((chapter) => chapter.name);
    const chapterLabels = chapters.length
        ? [...chapterNumbers.map(String), ...new Set(unnumberedChapterNames)]
        : [
              ...new Set(
                  paper.paper_data.sections.flatMap((section) =>
                      section.questions.map(
                          (question) => question.chapter_name,
                      ),
                  ),
              ),
          ];

    async function savePaper() {
        if (!previewId || saving) {
            return;
        }

        setSaving(true);
        setActionError('');

        try {
            const response = await fetch(
                `/qa-tests/previews/${previewId}/save`,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrf(),
                    },
                },
            );

            if (
                !(response.headers.get('content-type') ?? '').includes(
                    'application/json',
                )
            ) {
                throw new Error(
                    response.status === 419
                        ? 'Your session expired. Refresh the page and try again.'
                        : 'Could not save the paper. Refresh the page and try again.',
                );
            }

            const body = await response.json();

            if (!response.ok) {
                throw new Error(body.message ?? 'Could not save the paper.');
            }

            router.visit(body.paper_url);
        } catch (error) {
            setActionError(
                error instanceof Error
                    ? error.message
                    : 'Could not save the paper.',
            );
            setSaving(false);
        }
    }

    async function downloadPdf() {
        if (downloading) {
            return;
        }

        const sheet = document.getElementById('qat-print-sheet');

        if (!sheet) {
            return;
        }

        setDownloading(true);
        setActionError('');

        try {
            const [{ downloadPaperPdf }, { DEFAULT_PAPER_SETTINGS }] =
                await Promise.all([
                    import('../papers/paper-layouts/download-paper-pdf'),
                    import('../papers/paper-layouts/types'),
                ]);
            await downloadPaperPdf({
                papers: [sheet],
                settings: {
                    ...DEFAULT_PAPER_SETTINGS,
                    paperSize: 'A4',
                    marginTop: 10,
                    marginRight: 10,
                    marginBottom: 10,
                    marginLeft: 10,
                },
                name: paper.name,
            });
        } catch (error) {
            setActionError(
                error instanceof Error
                    ? error.message
                    : 'Could not download the PDF.',
            );
        } finally {
            setDownloading(false);
        }
    }

    return (
        <div className="w-full space-y-4 pb-20 print:space-y-0 print:pb-0">
            <Head title={paper.name} />
            <style>{`
                @page { size: A4; margin: 10mm; }
                #qat-print-sheet { font-family: "Times New Roman", Times, serif; }
                #qat-print-sheet .qat-objective-question, #qat-print-sheet .qat-question .space-y-2.text-sm { font-size: ${qatQuestionSize}px; line-height: ${qatQuestionLineHeight}; }
                #qat-print-sheet .qat-question [lang="ur"], #qat-print-sheet .qat-question [lang="ur"] .paper-rich-text :not(.katex, .katex *) { font-family: "Jameel Noori Nastaleeq", "Urdu Typesetting", "Noto Nastaliq Urdu", serif !important; font-size: ${qatQuestionSize * qatUrduMetrics.sizeScale}px !important; line-height: ${qatQuestionLineHeight * qatUrduMetrics.lineHeightScale} !important; }
                #qat-print-sheet .qat-question [lang="ur"] { transform: translateY(${qatUrduMetrics.verticalOffsetEm}em); }
                #qat-print-sheet .qat-question-number { font-family: "Times New Roman", Times, serif; font-size: ${qatQuestionSize}px; line-height: ${qatQuestionLineHeight}; transform: none; }
                #qat-print-sheet .qat-section-heading { font-size: ${DEFAULT_PAPER_SETTINGS.sectionHeadingSize}px; line-height: ${DEFAULT_PAPER_SETTINGS.sectionHeadingLineHeight}; }
                #qat-print-sheet .qat-type-heading { font-size: ${DEFAULT_PAPER_SETTINGS.headingSize}px; line-height: ${DEFAULT_PAPER_SETTINGS.headingLineHeight}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                #qat-print-sheet .qat-type-heading [lang="ur"], #qat-print-sheet .qat-type-heading [lang="ur"] .paper-rich-text :not(.katex, .katex *) { font-family: "Jameel Noori Nastaleeq", "Urdu Typesetting", "Noto Nastaliq Urdu", serif !important; font-size: ${DEFAULT_PAPER_SETTINGS.headingSize * qatUrduMetrics.sizeScale}px !important; line-height: ${DEFAULT_PAPER_SETTINGS.headingLineHeight * qatUrduMetrics.lineHeightScale} !important; }
                #qat-print-sheet .paper-rich-text img, #qat-print-sheet .qat-objective-question img { max-width: 100%; height: auto; }
                #qat-print-sheet .qat-objective-options .paper-rich-text img { display: inline-block; vertical-align: middle; break-inside: avoid; }
                [data-qat-correct-option] { background-color: #dcfce7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                @media print {
                    body * { visibility: hidden !important; }
                    #qat-print-sheet, #qat-print-sheet * { visibility: visible !important; }
                    #qat-print-sheet { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; min-height: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; background: white !important; color: black !important; }
                    #qat-print-sheet .qat-question { break-inside: avoid; page-break-inside: avoid; }
                }
            `}</style>
            <div
                aria-label="Paper controls"
                className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-white to-violet-50 p-3 shadow-sm dark:border-sky-900/60 dark:from-sky-950 dark:via-slate-900 dark:to-violet-950 print:hidden"
            >
                <div
                    className="flex flex-wrap gap-1 rounded-xl border border-sky-100 bg-sky-100/50 p-1 dark:border-slate-700 dark:bg-slate-800/80"
                    role="group"
                    aria-label="Paper variants"
                >
                    {paperVariants.map((variant, index) => (
                        <button
                            key={index}
                            type="button"
                            aria-pressed={activeVariant === index}
                            onClick={() => setActiveVariant(index)}
                            className={`min-h-9 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${activeVariant === index ? 'bg-gradient-to-r from-indigo-500 to-brand-600 text-white shadow-sm hover:from-indigo-600 hover:to-brand-700' : 'text-slate-500 hover:bg-white hover:text-brand-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-sky-300'}`}
                        >
                            Paper{' '}
                            {variant.paper_data.variant ??
                                String.fromCharCode(65 + index)}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {hasObjectiveOptions && (
                        <QatObjectiveLayoutMenu
                            settings={objectiveSettings}
                            onChange={(settings) => {
                                setObjectiveSettings(settings);

                                try {
                                    localStorage.setItem(
                                        objectiveSettingsKey,
                                        JSON.stringify(settings),
                                    );
                                } catch {
                                    // The current paper still uses the selected settings.
                                }
                            }}
                        />
                    )}
                    <label
                        htmlFor="qat-answer-key"
                        className={`relative inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-xs font-semibold ${toolbarHoverClass}`}
                    >
                        <KeyRoundIcon
                            aria-hidden="true"
                            className="size-4 text-amber-500"
                        />
                        Answer key
                        <Switch
                            id="qat-answer-key"
                            aria-label="Answer key"
                            checked={showAnswers}
                            onCheckedChange={setShowAnswers}
                            className="data-[state=checked]:bg-emerald-500"
                        />
                    </label>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => window.print()}
                        className={`h-10 rounded-lg ${toolbarHoverClass}`}
                    >
                        <PrinterIcon className="text-sky-500" /> Print
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => void savePaper()}
                        disabled={!previewId || saving}
                        className={`h-10 rounded-lg ${toolbarHoverClass}`}
                    >
                        {saving ? (
                            <Loader2Icon className="animate-spin" />
                        ) : previewId ? (
                            <SaveIcon className="text-violet-500" />
                        ) : (
                            <CheckIcon className="text-emerald-500" />
                        )}
                        {saving ? 'Saving…' : previewId ? 'Save' : 'Saved'}
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => void downloadPdf()}
                        disabled={downloading}
                        className={`h-10 rounded-lg ${toolbarHoverClass}`}
                    >
                        {downloading ? (
                            <Loader2Icon className="animate-spin" />
                        ) : (
                            <DownloadIcon className="text-emerald-500" />
                        )}
                        {downloading ? 'Preparing PDF…' : 'Download PDF'}
                    </Button>
                </div>
            </div>
            {actionError && (
                <p
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 print:hidden"
                >
                    {actionError}
                </p>
            )}
            <section
                aria-label="Paper board"
                className="min-w-0 overflow-hidden rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-100/70 via-slate-100 to-violet-100/60 shadow-sm dark:border-sky-900/60 dark:from-[#142c42] dark:via-slate-950 dark:to-[#28213e] print:overflow-visible print:rounded-none print:border-0 print:bg-none print:shadow-none"
            >
                <div className="flex items-center justify-between gap-3 border-b border-sky-200/60 bg-white/60 px-4 py-3 text-xs dark:border-sky-900/60 dark:bg-slate-900/50 print:hidden">
                    <h2 className="flex items-center gap-2 font-semibold text-[#425b7b] dark:text-slate-300">
                        <FileTextIcon
                            aria-hidden="true"
                            className="size-4 text-brand-500"
                        />
                        Paper preview
                    </h2>
                    <span className="rounded-md border border-sky-100 bg-white/80 px-2 py-1 text-[11px] font-semibold text-brand-600 dark:border-sky-900 dark:bg-slate-900 dark:text-sky-300">
                        A4 · {variantLabel}
                    </span>
                </div>
                <div
                    role="region"
                    aria-label="Paper sheet"
                    tabIndex={0}
                    className="overflow-x-auto p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 sm:p-6 print:overflow-visible print:p-0"
                >
                    <div className="mx-auto w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm print:w-full print:overflow-visible print:shadow-none">
                        <article
                            id="qat-print-sheet"
                            className="min-h-[297mm] bg-white px-[10mm] py-[10mm] text-slate-900 print:min-h-0"
                        >
                            <header className="break-inside-avoid">
                                <div className="mb-3 flex items-center justify-center gap-3 text-center">
                                    {schoolLogoUrl && (
                                        <img
                                            src={schoolLogoUrl}
                                            alt=""
                                            className="h-8 w-8 shrink-0 object-contain"
                                        />
                                    )}
                                    <div className="text-lg font-bold leading-tight">
                                        {schoolDetails.name}
                                    </div>
                                </div>
                                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-end gap-2 pb-1 text-xs font-semibold">
                                    <span className="text-left">
                                        <strong>Total Time:</strong>{' '}
                                        {formatDuration(
                                            paper.paper_data.minutes,
                                        )}
                                    </span>
                                    <h1 className="text-center font-bold">
                                        {paper.subject_name} ({paper.class_name}
                                        )
                                    </h1>
                                    <span className="text-right">
                                        <strong>Total Marks:</strong>{' '}
                                        {paper.total_marks}
                                    </span>
                                </div>
                                <table
                                    role="presentation"
                                    className="w-full table-fixed border-collapse border border-slate-900 text-xs"
                                >
                                    <tbody>
                                        <tr>
                                            <td className="w-1/2 border border-slate-900 px-2 py-2">
                                                <div className="flex items-end gap-2">
                                                    <span className="shrink-0 font-bold">
                                                        Roll No:
                                                    </span>
                                                    <span
                                                        className="h-4 min-w-0 flex-1 border-b border-slate-700"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="shrink-0 font-bold">
                                                        Section:
                                                    </span>
                                                    <span
                                                        className="h-4 min-w-0 flex-1 border-b border-slate-700"
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                            </td>
                                            <td className="w-1/2 border border-slate-900 px-2 py-2">
                                                <div className="flex items-end gap-2">
                                                    <span className="shrink-0 font-bold">
                                                        Signature of Supervisor:
                                                    </span>
                                                    <span
                                                        className="h-4 min-w-0 flex-1 border-b border-slate-700"
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-900 px-2 py-2">
                                                <div className="flex items-end gap-2">
                                                    <span className="shrink-0 font-bold">
                                                        Name:
                                                    </span>
                                                    <span
                                                        className="h-4 min-w-0 flex-1 border-b border-slate-700"
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                            </td>
                                            <td className="border border-slate-900 px-2 py-2">
                                                <div className="flex items-end gap-2">
                                                    <span className="shrink-0 font-bold">
                                                        Father&apos;s Name:
                                                    </span>
                                                    <span
                                                        className="h-4 min-w-0 flex-1 border-b border-slate-700"
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td
                                                colSpan={2}
                                                className="border border-slate-900 px-2 py-2"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <span className="shrink-0 font-bold">
                                                        Chapters:
                                                    </span>
                                                    <div
                                                        dir="auto"
                                                        className="min-w-0 break-words"
                                                    >
                                                        <QuestionContent
                                                            value={chapterLabels
                                                                .filter(Boolean)
                                                                .join(', ')}
                                                            inline
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </header>
                            <div className="mt-3 space-y-3">
                                {objectiveQuestions.length > 0 && (
                                    <section>
                                        <QatSectionHeading number={1} />
                                        <div className="mt-2 space-y-4">
                                            {objectiveSections.map(
                                                (section, sectionIndex) => {
                                                    const preceding =
                                                        objectiveSections
                                                            .slice(
                                                                0,
                                                                sectionIndex,
                                                            )
                                                            .reduce(
                                                                (
                                                                    total,
                                                                    previous,
                                                                ) =>
                                                                    total +
                                                                    previous
                                                                        .questions
                                                                        .length,
                                                                0,
                                                            );

                                                    return (
                                                        <div
                                                            key={`${section.question_type_id}-${sectionIndex}`}
                                                            className="space-y-3"
                                                        >
                                                            <QatTypeHeading
                                                                section={
                                                                    section
                                                                }
                                                                number={
                                                                    sectionIndex +
                                                                    1
                                                                }
                                                            />
                                                            {section.questions.map(
                                                                (
                                                                    question,
                                                                    index,
                                                                ) => (
                                                                    <QatPaperQuestion
                                                                        key={
                                                                            question.id
                                                                        }
                                                                        question={
                                                                            question
                                                                        }
                                                                        number={String(
                                                                            preceding +
                                                                                index +
                                                                                1,
                                                                        )}
                                                                        showAnswers={
                                                                            showAnswers
                                                                        }
                                                                        objectiveSettings={
                                                                            objectiveSettings
                                                                        }
                                                                    />
                                                                ),
                                                            )}
                                                        </div>
                                                    );
                                                },
                                            )}
                                        </div>
                                    </section>
                                )}
                                {subjectiveSections.map(
                                    (section, sectionIndex) => {
                                        const sectionNumber =
                                            sectionIndex +
                                            (objectiveQuestions.length ? 2 : 1);

                                        return (
                                            <section
                                                key={`${section.question_type_id}-${sectionIndex}`}
                                            >
                                                <QatSectionHeading
                                                    number={sectionNumber}
                                                />
                                                <QatTypeHeading
                                                    section={section}
                                                    number={
                                                        objectiveSections.length +
                                                        sectionIndex +
                                                        1
                                                    }
                                                />
                                                <div className="mt-2 space-y-2">
                                                    {section.questions.map(
                                                        (question, index) => (
                                                            <QatPaperQuestion
                                                                key={
                                                                    question.id
                                                                }
                                                                question={
                                                                    question
                                                                }
                                                                number={romanSection(
                                                                    index + 1,
                                                                ).toLowerCase()}
                                                                showAnswers={
                                                                    showAnswers
                                                                }
                                                                objectiveSettings={
                                                                    objectiveSettings
                                                                }
                                                            />
                                                        ),
                                                    )}
                                                </div>
                                            </section>
                                        );
                                    },
                                )}
                            </div>
                        </article>
                    </div>
                </div>
            </section>
            <div
                className={`fixed inset-x-0 bottom-0 z-20 border-t border-sky-100 bg-white px-4 py-3 shadow-sm transition-[left] duration-200 dark:border-slate-800 dark:bg-slate-900 md:px-6 ${sidebarCollapsed ? 'md:left-16' : 'md:left-60'} print:hidden`}
            >
                <Button
                    asChild
                    variant="secondary"
                    className={`h-10 rounded-lg ${toolbarHoverClass}`}
                >
                    <Link href={backUrl}>
                        <ArrowLeftIcon /> Back
                    </Link>
                </Button>
            </div>
        </div>
    );
}

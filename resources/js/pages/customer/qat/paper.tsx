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
    SlidersHorizontalIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useQatTrial } from '@/components/qat/trial-status';
import { Button } from '@/components/tm';
import { Switch } from '@/components/ui/switch';
import { useCustomerSidebar } from '@/layouts/customer/customer-layout';
import { QuestionContent } from '../papers/paper-layouts/questions/question-content';
import {
    DEFAULT_PAPER_SETTINGS,
    getPageDimensions,
    PAPER_URDU_FONT_METRICS,
} from '../papers/paper-layouts/types';
import {
    loadQatObjectiveSettings,
    loadQatPaperSettings,
    qatEnglishFonts,
    QatObjectiveControls,
    QatPaperSettingsDrawer,
    qatUrduFonts,
    storeQatObjectiveSettings,
    storeQatPaperSettings,
} from './paper-settings';
import { QatObjectiveQuestion, QatQuestionContent } from './question';
import type { QatMedium, QatObjectiveSettings, QatQuestion } from './question';

const toolbarHoverClass =
    'border border-sky-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/10 dark:hover:text-brand-300';

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
                <QatObjectiveControls settings={settings} onChange={onChange} />
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

type PaperSectionGroup = {
    label_en?: string | null;
    label_ur?: string | null;
    sections: PaperSection[];
};

type PaperSectionLayout = {
    show_objective_section: boolean;
    objective_label_en?: string | null;
    objective_label_ur?: string | null;
    groups: (Pick<PaperSectionGroup, 'label_en' | 'label_ur'> & {
        question_type_ids: number[];
    })[];
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
        medium?: QatMedium;
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
        section_layout?: PaperSectionLayout | null;
    };
};

type SchoolDetails = {
    name: string;
    logo: string | null;
};

function csrf(): string {
    return (
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
            ?.content ?? ''
    );
}

function formatDuration(minutes: number, urdu: boolean): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (urdu) {
        return [
            hours ? `${hours} گھنٹے` : '',
            remainingMinutes ? `${remainingMinutes} منٹ` : '',
        ]
            .filter(Boolean)
            .join(' ');
    }

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

function QatSectionHeading({
    number,
    medium,
    labelEnglish,
    labelUrdu,
}: {
    number: number;
    medium: QatMedium;
    labelEnglish?: string | null;
    labelUrdu?: string | null;
}) {
    const numeral = romanSection(number);
    const showUrdu =
        medium === 'Urdu' ||
        (medium === 'Both' && Boolean(labelEnglish || labelUrdu));

    return (
        <h2
            data-paper-heading
            data-paper-section-heading
            className="qat-section-heading flex break-after-avoid flex-wrap items-baseline justify-center gap-x-3 text-center text-sm font-bold"
        >
            {medium !== 'Urdu' && (
                <span dir="ltr" lang="en">
                    {labelEnglish || (
                        <>
                            Section <bdi>{numeral}</bdi>
                        </>
                    )}
                </span>
            )}
            {showUrdu && (
                <span dir="rtl" lang="ur">
                    {labelUrdu || (
                        <>
                            حصہ <bdi>{numeral}</bdi>
                        </>
                    )}
                </span>
            )}
        </h2>
    );
}

function groupSubjectiveSections(
    sections: PaperSection[],
    layout?: PaperSectionLayout | null,
): PaperSectionGroup[] {
    if (!layout) {
        return sections.map((section) => ({ sections: [section] }));
    }

    const unassigned = new Set(sections);
    const groups: PaperSectionGroup[] = [];

    for (const group of layout.groups) {
        const members = sections.filter(
            (section) =>
                unassigned.has(section) &&
                group.question_type_ids.includes(section.question_type_id),
        );

        if (members.length) {
            members.forEach((section) => unassigned.delete(section));
            groups.push({
                label_en: group.label_en,
                label_ur: group.label_ur,
                sections: members,
            });
        }
    }

    if (unassigned.size > 0) {
        groups.push({ sections: [...unassigned] });
    }

    return groups;
}

function QatTypeHeading({
    section,
    number,
    medium,
}: {
    section: PaperSection;
    number: number;
    medium: QatMedium;
}) {
    const urduOnly = medium === 'Urdu';
    const english = section.heading_en?.trim() || section.title;
    const urdu = medium === 'English' ? '' : section.heading_ur?.trim() || '';
    const alternateEnglish = section.or_heading_en?.trim();
    const alternateUrdu =
        medium === 'English' ? '' : section.or_heading_ur?.trim();
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
        : `(${marks} ${urduOnly ? 'نمبر' : 'Marks'})`;

    return (
        <div
            data-paper-heading
            className={
                !urduOnly && (urdu || alternateUrdu)
                    ? 'qat-type-heading grid break-after-avoid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border border-brand-300 bg-brand-100 px-1.5 py-1 text-xs font-bold text-brand-950'
                    : 'qat-type-heading flex break-after-avoid items-center justify-between gap-3 border border-brand-300 bg-brand-100 px-1.5 py-1 text-xs font-bold text-brand-950'
            }
        >
            {!urduOnly && (
                <div dir="ltr" lang="en" className="min-w-0 text-left">
                    <span className="whitespace-nowrap">Q.{number}:-</span>{' '}
                    <QuestionContent value={english} inline />
                    {alternateEnglish && alternateEnglish !== english && (
                        <div>
                            OR{' '}
                            <QuestionContent value={alternateEnglish} inline />
                        </div>
                    )}
                </div>
            )}
            <div className="shrink-0 text-center">
                <span dir="ltr" className="block whitespace-nowrap">
                    {marksLabel}
                </span>
            </div>
            {(urduOnly || urdu || alternateUrdu) && (
                <div
                    dir="rtl"
                    lang="ur"
                    className={`min-w-0 text-right ${urduOnly ? 'order-first' : ''}`}
                >
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
    medium,
}: {
    question: PaperQuestion;
    number: string;
    showAnswers: boolean;
    objectiveSettings: QatObjectiveSettings;
    medium: QatMedium;
}) {
    const alternative = question.or_question;
    const renderQuestion = (item: QatQuestion) =>
        item.is_objective ? (
            <QatObjectiveQuestion
                question={item}
                number={number}
                showAnswers={showAnswers}
                settings={objectiveSettings}
                displayMedium={medium}
            />
        ) : (
            <QatQuestionContent
                question={item}
                number={number}
                displayMedium={medium}
            />
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
                        {medium !== 'Urdu' && <span lang="en">OR</span>}
                        {(medium === 'Urdu' ||
                            (medium === 'Both' &&
                                (question.statement_ur ||
                                    alternative.statement_ur))) && (
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
    finalTrialPreview = false,
    schoolDetails,
}: {
    paper: QatPaperView;
    variants?: QatPaperView[];
    previewId?: string | null;
    backUrl?: string;
    showAnswerKey?: boolean;
    finalTrialPreview?: boolean;
    schoolDetails: SchoolDetails;
}) {
    const { collapsed: sidebarCollapsed } = useCustomerSidebar();
    const trial = useQatTrial();
    const [activeVariant, setActiveVariant] = useState(0);
    const [saving, setSaving] = useState(false);
    const [savedInPreview, setSavedInPreview] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [showAnswers, setShowAnswers] = useState(showAnswerKey);
    const [paperSettings, setPaperSettings] = useState(loadQatPaperSettings);
    const [objectiveSettings, setObjectiveSettings] = useState(
        loadQatObjectiveSettings,
    );
    const [actionError, setActionError] = useState('');

    const { width, height } = getPageDimensions(
        paperSettings.paperSize,
        paperSettings.orientation,
    );
    const pageMargins = `${paperSettings.marginTop}mm ${paperSettings.marginRight}mm ${paperSettings.marginBottom}mm ${paperSettings.marginLeft}mm`;
    const englishFont = qatEnglishFonts[paperSettings.englishFont].family;
    const urduFont = qatUrduFonts[paperSettings.urduFont].family;
    const urduMetrics = PAPER_URDU_FONT_METRICS[paperSettings.urduFont];
    const {
        questionSize,
        questionLineHeight,
        headingSize,
        sectionHeadingSize,
    } = paperSettings;
    const paperVariants = variants.length ? variants : [initialPaper];
    const paper = paperVariants[activeVariant] ?? initialPaper;
    const medium = paper.paper_data.medium ?? 'Both';
    const urduPaper = medium === 'Urdu';
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
    const sectionLayout = paper.paper_data.section_layout;
    const showObjectiveHeading =
        objectiveQuestions.length > 0 &&
        sectionLayout?.show_objective_section !== false;
    const subjectiveGroups = groupSubjectiveSections(
        subjectiveSections,
        sectionLayout,
    );
    const subjectiveTypeNumbers = new Map(
        subjectiveGroups
            .flatMap(({ sections }) => sections)
            .map((section, index) => [
                section,
                objectiveSections.length + index + 1,
            ]),
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
        if (!previewId || saving || savedInPreview) {
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

            if (response.status === 423 && body.redirect_url) {
                router.visit(body.redirect_url, { replace: true });

                return;
            }

            if (!response.ok) {
                throw new Error(body.message ?? 'Could not save the paper.');
            }

            if (body.stay_on_preview) {
                setSavedInPreview(true);
                setSaving(false);

                return;
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

    function changeObjectiveSettings(settings: QatObjectiveSettings) {
        setObjectiveSettings(settings);
        storeQatObjectiveSettings(settings);
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
            const { downloadPaperPdf } =
                await import('../papers/paper-layouts/download-paper-pdf');
            await downloadPaperPdf({
                papers: [sheet],
                settings: { ...DEFAULT_PAPER_SETTINGS, ...paperSettings },
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
                @page { size: ${width}mm ${height}mm; margin: ${pageMargins}; }
                [data-qat-sheet] { font-family: ${englishFont}; }
                [data-qat-sheet][lang="ur"] > header, [data-qat-sheet][lang="ur"] .qat-section-heading, [data-qat-sheet] .qat-section-heading [lang="ur"] { font-family: ${urduFont}; }
                [data-qat-sheet] .qat-objective-question, [data-qat-sheet] .qat-question .space-y-2.text-sm { font-size: ${questionSize}px; line-height: ${questionLineHeight}; }
                [data-qat-sheet] .qat-question [lang="ur"], [data-qat-sheet] .qat-question [lang="ur"] .paper-rich-text :not(.katex, .katex *) { font-family: ${urduFont} !important; font-size: ${questionSize * urduMetrics.sizeScale}px !important; line-height: ${questionLineHeight * urduMetrics.lineHeightScale} !important; }
                [data-qat-sheet] .qat-question [lang="ur"] { transform: translateY(${urduMetrics.verticalOffsetEm}em); }
                [data-qat-sheet] .qat-question-number { font-family: ${englishFont}; font-size: ${questionSize}px; line-height: ${questionLineHeight}; transform: none; }
                [data-qat-sheet] .qat-section-heading { font-size: ${sectionHeadingSize}px; line-height: ${DEFAULT_PAPER_SETTINGS.sectionHeadingLineHeight}; }
                [data-qat-sheet] .qat-type-heading { font-size: ${headingSize}px; line-height: ${DEFAULT_PAPER_SETTINGS.headingLineHeight}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                [data-qat-sheet] .qat-type-heading [lang="ur"], [data-qat-sheet] .qat-type-heading [lang="ur"] .paper-rich-text :not(.katex, .katex *) { font-family: ${urduFont} !important; font-size: ${headingSize * urduMetrics.sizeScale}px !important; line-height: ${DEFAULT_PAPER_SETTINGS.headingLineHeight * urduMetrics.lineHeightScale} !important; }
                [data-qat-sheet] .paper-rich-text img, [data-qat-sheet] .qat-objective-question img { max-width: 100%; height: auto; }
                [data-qat-sheet] .qat-objective-options .paper-rich-text img { display: inline-block; vertical-align: middle; break-inside: avoid; }
                [data-qat-correct-option] { background-color: #dcfce7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                @media print {
                    body * { visibility: hidden !important; }
                    [data-qat-sheet], [data-qat-sheet] * { visibility: visible !important; }
                    [data-qat-sheet] { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; min-height: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; background: white !important; color: black !important; }
                    [data-qat-sheet] .qat-question { break-inside: avoid; page-break-inside: avoid; }
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
                    <QatPaperSettingsDrawer
                        trigger={
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className={`h-10 rounded-lg ${toolbarHoverClass}`}
                            >
                                <SlidersHorizontalIcon
                                    aria-hidden="true"
                                    className="text-brand-500"
                                />
                                Settings
                            </Button>
                        }
                        medium={medium}
                        settings={paperSettings}
                        onChange={(settings) => {
                            setPaperSettings(settings);
                            storeQatPaperSettings(settings);
                        }}
                        objectiveSettings={
                            hasObjectiveOptions ? objectiveSettings : undefined
                        }
                        onObjectiveChange={changeObjectiveSettings}
                    />
                    {hasObjectiveOptions && (
                        <QatObjectiveLayoutMenu
                            settings={objectiveSettings}
                            onChange={changeObjectiveSettings}
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
                        disabled={!previewId || saving || savedInPreview}
                        className={`h-10 rounded-lg ${toolbarHoverClass}`}
                    >
                        {saving ? (
                            <Loader2Icon className="animate-spin" />
                        ) : previewId && !savedInPreview ? (
                            <SaveIcon className="text-violet-500" />
                        ) : (
                            <CheckIcon className="text-emerald-500" />
                        )}
                        {saving
                            ? 'Saving…'
                            : previewId && !savedInPreview
                              ? 'Save'
                              : 'Saved'}
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
                        {paperSettings.paperSize} · {variantLabel}
                    </span>
                </div>
                <div
                    role="region"
                    aria-label="Paper sheet"
                    tabIndex={0}
                    className="overflow-x-auto p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 sm:p-6 print:overflow-visible print:p-0"
                >
                    <div
                        className="mx-auto shrink-0 overflow-hidden bg-white shadow-sm print:!w-full print:overflow-visible print:shadow-none"
                        style={{ width: `${width}mm` }}
                    >
                        <article
                            id="qat-print-sheet"
                            data-qat-sheet=""
                            dir={urduPaper ? 'rtl' : 'ltr'}
                            lang={
                                medium === 'Both'
                                    ? undefined
                                    : urduPaper
                                      ? 'ur'
                                      : 'en'
                            }
                            className="relative bg-white text-slate-900"
                            style={{
                                minHeight: `${height}mm`,
                                padding: pageMargins,
                            }}
                        >
                            {trial && (
                                <div
                                    aria-hidden="true"
                                    data-paper-watermark=""
                                    className="pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-hidden print:fixed"
                                >
                                    <span className="-rotate-[28deg] whitespace-nowrap font-sans text-5xl font-black uppercase tracking-wider text-slate-500/20">
                                        QAT Trial
                                    </span>
                                </div>
                            )}
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
                                    <span className="text-start">
                                        <strong>
                                            {urduPaper
                                                ? 'کل وقت:'
                                                : 'Total Time:'}
                                        </strong>{' '}
                                        {formatDuration(
                                            paper.paper_data.minutes,
                                            urduPaper,
                                        )}
                                    </span>
                                    <h1 className="text-center font-bold">
                                        {paper.subject_name} (
                                        <bdi>{paper.class_name}</bdi>)
                                    </h1>
                                    <span className="text-end">
                                        <strong>
                                            {urduPaper
                                                ? 'کل نمبر:'
                                                : 'Total Marks:'}
                                        </strong>{' '}
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
                                                        {urduPaper
                                                            ? 'رول نمبر:'
                                                            : 'Roll No:'}
                                                    </span>
                                                    <span
                                                        className="h-4 min-w-0 flex-1 border-b border-slate-700"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="shrink-0 font-bold">
                                                        {urduPaper
                                                            ? 'سیکشن:'
                                                            : 'Section:'}
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
                                                        {urduPaper
                                                            ? 'نگران کے دستخط:'
                                                            : 'Signature of Supervisor:'}
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
                                                        {urduPaper
                                                            ? 'نام:'
                                                            : 'Name:'}
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
                                                        {urduPaper
                                                            ? 'والد کا نام:'
                                                            : "Father's Name:"}
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
                                                        {urduPaper
                                                            ? 'اسباق:'
                                                            : 'Chapters:'}
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
                                        {showObjectiveHeading && (
                                            <QatSectionHeading
                                                number={1}
                                                medium={medium}
                                                labelEnglish={
                                                    sectionLayout?.objective_label_en
                                                }
                                                labelUrdu={
                                                    sectionLayout?.objective_label_ur
                                                }
                                            />
                                        )}
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
                                                                medium={medium}
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
                                                                        medium={
                                                                            medium
                                                                        }
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
                                {subjectiveGroups.map((group, index) => (
                                    <section
                                        key={group.sections[0].question_type_id}
                                    >
                                        <QatSectionHeading
                                            medium={medium}
                                            number={
                                                index +
                                                (showObjectiveHeading ? 2 : 1)
                                            }
                                            labelEnglish={group.label_en}
                                            labelUrdu={group.label_ur}
                                        />
                                        <div className="space-y-3">
                                            {group.sections.map((section) => (
                                                <div
                                                    key={
                                                        section.question_type_id
                                                    }
                                                >
                                                    <QatTypeHeading
                                                        medium={medium}
                                                        section={section}
                                                        number={
                                                            subjectiveTypeNumbers.get(
                                                                section,
                                                            )!
                                                        }
                                                    />
                                                    <div className="mt-2 space-y-2">
                                                        {section.questions.map(
                                                            (
                                                                question,
                                                                index,
                                                            ) => (
                                                                <QatPaperQuestion
                                                                    medium={
                                                                        medium
                                                                    }
                                                                    key={
                                                                        question.id
                                                                    }
                                                                    question={
                                                                        question
                                                                    }
                                                                    number={romanSection(
                                                                        index +
                                                                            1,
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
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                ))}
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
                        <ArrowLeftIcon />{' '}
                        {finalTrialPreview ? 'Back to Home' : 'Back'}
                    </Link>
                </Button>
            </div>
        </div>
    );
}

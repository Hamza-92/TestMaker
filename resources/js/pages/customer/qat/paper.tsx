import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CheckIcon,
    DownloadIcon,
    KeyRoundIcon,
    Loader2Icon,
    PrinterIcon,
    SaveIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Button, Card, PageHeader } from '@/components/tm';
import { Switch } from '@/components/ui/switch';
import { QuestionContent } from '../papers/paper-layouts/questions/question-content';
import {
    DEFAULT_PAPER_SETTINGS,
    PAPER_URDU_FONT_METRICS,
} from '../papers/paper-layouts/types';
import { QatObjectiveQuestion, QatQuestionContent } from './question';
import type { QatQuestion } from './question';

const toolbarHoverClass =
    'hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/10 dark:hover:text-brand-300';

type PaperSection = {
    question_type_id: number;
    title: string;
    heading_en?: string | null;
    heading_ur?: string | null;
    required_questions?: number;
    questions: (QatQuestion & { marks: number })[];
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
                urdu
                    ? 'qat-type-heading grid break-after-avoid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border border-brand-300 bg-brand-100 px-1.5 py-1 text-xs font-bold text-brand-950'
                    : 'qat-type-heading flex break-after-avoid items-center justify-between gap-3 border border-brand-300 bg-brand-100 px-1.5 py-1 text-xs font-bold text-brand-950'
            }
        >
            <div dir="ltr" lang="en" className="min-w-0 text-left">
                <span className="whitespace-nowrap">Q.{number}:-</span>{' '}
                <QuestionContent value={english} inline />
            </div>
            <div className="shrink-0 text-center">
                <span dir="ltr" className="block whitespace-nowrap">
                    {marksLabel}
                </span>
            </div>
            {urdu && (
                <div dir="rtl" lang="ur" className="min-w-0 text-right">
                    <span className="whitespace-nowrap">
                        سوال نمبر {number}:-
                    </span>{' '}
                    <QuestionContent value={urdu} inline />
                </div>
            )}
        </div>
    );
}

export default function QatPaper({
    paper: initialPaper,
    variants = [],
    previewId = null,
    backUrl = '/qa-tests',
    schoolDetails,
}: {
    paper: QatPaperView;
    variants?: QatPaperView[];
    previewId?: string | null;
    backUrl?: string;
    schoolDetails: SchoolDetails;
}) {
    const [activeVariant, setActiveVariant] = useState(0);
    const [saving, setSaving] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [showAnswers, setShowAnswers] = useState(false);
    const [actionError, setActionError] = useState('');
    const paperVariants = variants.length ? variants : [initialPaper];
    const paper = paperVariants[activeVariant] ?? initialPaper;
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
        <div className="w-full space-y-5">
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
            <div className="print:hidden">
                <PageHeader
                    title={paper.name}
                    meta={`${paper.question_count} questions · ${paper.total_marks} marks`}
                />
            </div>
            <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 print:hidden">
                <div
                    className="flex flex-wrap gap-1.5"
                    role="group"
                    aria-label="Paper variants"
                >
                    {paperVariants.map((variant, index) => (
                        <button
                            key={index}
                            type="button"
                            aria-pressed={activeVariant === index}
                            onClick={() => setActiveVariant(index)}
                            className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${toolbarHoverClass} ${activeVariant === index ? 'border-slate-900 bg-slate-900 text-white dark:border-brand-500 dark:bg-brand-600' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                        >
                            Paper{' '}
                            {variant.paper_data.variant ??
                                String.fromCharCode(65 + index)}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <label
                        htmlFor="qat-answer-key"
                        className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition-colors dark:border-slate-700 dark:text-slate-200 ${toolbarHoverClass}`}
                    >
                        <KeyRoundIcon className="size-4" />
                        Answer key
                        <Switch
                            id="qat-answer-key"
                            checked={showAnswers}
                            onCheckedChange={setShowAnswers}
                        />
                    </label>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => window.print()}
                        className={toolbarHoverClass}
                    >
                        <PrinterIcon /> Print
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => void savePaper()}
                        disabled={!previewId || saving}
                        className={toolbarHoverClass}
                    >
                        {saving ? (
                            <Loader2Icon className="animate-spin" />
                        ) : previewId ? (
                            <SaveIcon />
                        ) : (
                            <CheckIcon />
                        )}
                        {saving ? 'Saving…' : previewId ? 'Save' : 'Saved'}
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => void downloadPdf()}
                        disabled={downloading}
                        className={`border border-transparent ${toolbarHoverClass}`}
                    >
                        {downloading ? (
                            <Loader2Icon className="animate-spin" />
                        ) : (
                            <DownloadIcon />
                        )}
                        {downloading ? 'Preparing PDF…' : 'Download PDF'}
                    </Button>
                </div>
            </div>
            {actionError && (
                <p
                    role="alert"
                    className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 print:hidden"
                >
                    {actionError}
                </p>
            )}
            <Card className="mx-auto max-w-[210mm] overflow-hidden p-0 print:overflow-visible">
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
                                {formatDuration(paper.paper_data.minutes)}
                            </span>
                            <h1 className="text-center font-bold">
                                {paper.subject_name} ({paper.class_name})
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
                                            const preceding = objectiveSections
                                                .slice(0, sectionIndex)
                                                .reduce(
                                                    (total, previous) =>
                                                        total +
                                                        previous.questions
                                                            .length,
                                                    0,
                                                );

                                            return (
                                                <div
                                                    key={`${section.question_type_id}-${sectionIndex}`}
                                                    className="space-y-3"
                                                >
                                                    <QatTypeHeading
                                                        section={section}
                                                        number={
                                                            sectionIndex + 1
                                                        }
                                                    />
                                                    {section.questions.map(
                                                        (question, index) => (
                                                            <div
                                                                key={
                                                                    question.id
                                                                }
                                                                data-paper-question
                                                                className="qat-question px-2"
                                                            >
                                                                <QatObjectiveQuestion
                                                                    showAnswers={
                                                                        showAnswers
                                                                    }
                                                                    question={
                                                                        question
                                                                    }
                                                                    number={
                                                                        preceding +
                                                                        index +
                                                                        1
                                                                    }
                                                                />
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            );
                                        },
                                    )}
                                </div>
                            </section>
                        )}
                        {subjectiveSections.map((section, sectionIndex) => {
                            const sectionNumber =
                                sectionIndex +
                                (objectiveQuestions.length ? 2 : 1);

                            return (
                                <section
                                    key={`${section.question_type_id}-${sectionIndex}`}
                                >
                                    <QatSectionHeading number={sectionNumber} />
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
                                                <div
                                                    key={question.id}
                                                    data-paper-question
                                                    className="qat-question px-2"
                                                >
                                                    <QatQuestionContent
                                                        question={question}
                                                        number={romanSection(
                                                            index + 1,
                                                        ).toLowerCase()}
                                                    />
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                </article>
            </Card>
            <div className="sticky bottom-0 z-20 -mx-4 border-y border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:-mx-6 md:px-6 print:hidden">
                <div className="flex justify-end">
                    <Button asChild variant="secondary">
                        <Link href={backUrl}>
                            <ArrowLeftIcon /> Back
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

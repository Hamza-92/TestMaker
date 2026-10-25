import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CheckIcon,
    DownloadIcon,
    Loader2Icon,
    PrinterIcon,
    SaveIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Button, Card, PageHeader } from '@/components/tm';
import {
    DEFAULT_PAPER_SETTINGS,
    PAPER_URDU_FONT_METRICS,
} from '../papers/paper-layouts/types';
import { QatObjectiveQuestion, QatQuestionContent } from './question';
import type { QatQuestion } from './question';

type PaperSection = {
    question_type_id: number;
    title: string;
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
        sections: PaperSection[];
    };
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

export default function QatPaper({
    paper: initialPaper,
    variants = [],
    previewId = null,
}: {
    paper: QatPaperView;
    variants?: QatPaperView[];
    previewId?: string | null;
}) {
    const [activeVariant, setActiveVariant] = useState(0);
    const [saving, setSaving] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [actionError, setActionError] = useState('');
    const paper = variants[activeVariant] ?? initialPaper;
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
    const objectiveMarks = objectiveQuestions.reduce(
        (total, question) => total + Number(question.marks),
        0,
    );

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
                #qat-print-sheet .paper-rich-text img, #qat-print-sheet .qat-objective-question img { max-width: 100%; height: auto; }
                #qat-print-sheet .qat-objective-options .paper-rich-text img { display: inline-block; vertical-align: middle; break-inside: avoid; }
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
            <div className="sticky top-0 z-20 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 print:hidden">
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => window.print()}
                >
                    <PrinterIcon /> Print
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void savePaper()}
                    disabled={!previewId || saving}
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
                >
                    {downloading ? (
                        <Loader2Icon className="animate-spin" />
                    ) : (
                        <DownloadIcon />
                    )}
                    {downloading ? 'Preparing PDF…' : 'Download PDF'}
                </Button>
            </div>
            {actionError && (
                <p
                    role="alert"
                    className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 print:hidden"
                >
                    {actionError}
                </p>
            )}
            {variants.length > 1 && (
                <div
                    className="flex flex-wrap gap-2 print:hidden"
                    aria-label="Paper variants"
                >
                    {variants.map((variant, index) => (
                        <Button
                            key={index}
                            type="button"
                            size="sm"
                            variant={
                                activeVariant === index
                                    ? 'primary'
                                    : 'secondary'
                            }
                            onClick={() => setActiveVariant(index)}
                        >
                            Paper{' '}
                            {variant.paper_data.variant ??
                                String.fromCharCode(65 + index)}
                        </Button>
                    ))}
                </div>
            )}
            <Card className="mx-auto max-w-[210mm] overflow-hidden p-0 print:overflow-visible">
                <article
                    id="qat-print-sheet"
                    className="min-h-[297mm] bg-white px-[10mm] py-[10mm] text-slate-900 print:min-h-0"
                >
                    <header className="break-inside-avoid">
                        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-end gap-2 pb-1 text-xs font-semibold">
                            <span className="text-left">
                                Total Time:{' '}
                                {formatDuration(paper.paper_data.minutes)}
                            </span>
                            <h1 className="text-center font-bold">
                                {paper.subject_name} ({paper.class_name})
                            </h1>
                            <span className="text-right">
                                Total Marks: {paper.total_marks}
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
                                            <span className="shrink-0">
                                                Roll No:
                                            </span>
                                            <span
                                                className="h-4 min-w-0 flex-1 border-b border-slate-700"
                                                aria-hidden="true"
                                            />
                                            <span className="shrink-0">
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
                                            <span className="shrink-0">
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
                                            <span className="shrink-0">
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
                                            <span className="shrink-0">
                                                Father&apos;s Name:
                                            </span>
                                            <span
                                                className="h-4 min-w-0 flex-1 border-b border-slate-700"
                                                aria-hidden="true"
                                            />
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </header>
                    <div className="mt-6 space-y-6">
                        {objectiveQuestions.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between border-b border-slate-700 pb-1 text-sm font-bold">
                                    <h2>Section I — Objective Questions</h2>
                                    <span>{objectiveMarks} marks</span>
                                </div>
                                <div className="mt-3 space-y-4">
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
                                                    {objectiveSections.length >
                                                        1 && (
                                                        <h3 className="text-xs font-bold">
                                                            {section.title}
                                                        </h3>
                                                    )}
                                                    {section.questions.map(
                                                        (question, index) => (
                                                            <div
                                                                key={
                                                                    question.id
                                                                }
                                                                className="qat-question"
                                                            >
                                                                <QatObjectiveQuestion
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
                            const preceding = subjectiveSections
                                .slice(0, sectionIndex)
                                .reduce(
                                    (total, previous) =>
                                        total + previous.questions.length,
                                    objectiveQuestions.length,
                                );
                            const sectionNumber =
                                sectionIndex +
                                (objectiveQuestions.length ? 2 : 1);

                            return (
                                <section
                                    key={`${section.question_type_id}-${sectionIndex}`}
                                >
                                    <div className="flex items-center justify-between border-b border-slate-700 pb-1 text-sm font-bold">
                                        <h2>
                                            Section{' '}
                                            {romanSection(sectionNumber)} —{' '}
                                            {section.title}
                                        </h2>
                                        <span>
                                            {section.questions.reduce(
                                                (total, question) =>
                                                    total +
                                                    Number(question.marks),
                                                0,
                                            )}{' '}
                                            marks
                                        </span>
                                    </div>
                                    <div className="mt-3 space-y-5">
                                        {section.questions.map(
                                            (question, index) => (
                                                <div
                                                    key={question.id}
                                                    className="qat-question flex items-start gap-3"
                                                >
                                                    <span className="shrink-0 text-sm font-semibold">
                                                        Q{preceding + index + 1}
                                                        .
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <QatQuestionContent
                                                            question={question}
                                                        />
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                    <footer className="mt-10 border-t border-slate-300 pt-2 text-center text-xs text-slate-500">
                        End of paper · QAT practice
                    </footer>
                </article>
            </Card>
            <div className="sticky bottom-0 z-20 -mx-4 border-y border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:-mx-6 md:px-6 print:hidden">
                <div className="flex justify-end">
                    <Button asChild variant="secondary">
                        <Link href="/qa-tests">
                            <ArrowLeftIcon /> Back
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

import { Head, Link } from '@inertiajs/react';
import { ArrowLeftIcon, PrinterIcon } from 'lucide-react';
import { Badge, Button, Card, PageHeader } from '@/components/tm';
import { QatQuestionContent } from './question';
import type { QatQuestion } from './question';

type PaperSection = {
    question_type_id: number;
    title: string;
    questions: (QatQuestion & { marks: number })[];
};

type SavedQatPaper = {
    id: number;
    name: string;
    mode: 'auto' | 'manual';
    class_name: string;
    subject_name: string;
    total_marks: number;
    question_count: number;
    created_at: string;
    paper_data: {
        academic_year: string;
        syllabus: 'custom' | 'qat';
        months: number[];
        minutes: number;
        variant: string | null;
        sections: PaperSection[];
    };
};

export default function QatPaper({ paper }: { paper: SavedQatPaper }) {
    return (
        <div className="w-full space-y-5">
            <Head title={paper.name} />
            <style>{`
                @page { size: A4; margin: 12mm; }
                @media print {
                    body * { visibility: hidden !important; }
                    #qat-print-sheet, #qat-print-sheet * { visibility: visible !important; }
                    #qat-print-sheet { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; min-height: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; background: white !important; color: black !important; }
                    #qat-print-sheet .qat-question { break-inside: avoid; page-break-inside: avoid; }
                }
            `}</style>
            <div className="print:hidden">
                <Button asChild variant="ghost" size="sm" className="-ml-3">
                    <Link href="/qa-tests">
                        <ArrowLeftIcon /> QAT Tests
                    </Link>
                </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                <PageHeader
                    title={paper.name}
                    meta={`${paper.question_count} questions · ${paper.total_marks} marks`}
                />
                <Button variant="primary" onClick={() => window.print()}>
                    <PrinterIcon /> Print / Save PDF
                </Button>
            </div>
            <Card className="mx-auto max-w-[210mm] overflow-hidden p-0 print:overflow-visible">
                <article
                    id="qat-print-sheet"
                    className="min-h-[297mm] bg-white px-[13mm] py-[14mm] text-slate-900 print:min-h-0"
                >
                    <header className="border-b-2 border-slate-900 pb-3 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                            Test Maker · QAT Practice
                        </p>
                        <h1 className="mt-1 text-xl font-bold">{paper.name}</h1>
                        <p className="mt-1 text-xs text-slate-600">
                            {paper.paper_data.academic_year}
                        </p>
                    </header>
                    <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 border-b border-slate-300 pb-3 text-xs sm:grid-cols-4">
                        <div>
                            <strong>Class:</strong> {paper.class_name}
                        </div>
                        <div>
                            <strong>Subject:</strong> {paper.subject_name}
                        </div>
                        <div>
                            <strong>Time:</strong> {paper.paper_data.minutes}{' '}
                            min
                        </div>
                        <div>
                            <strong>Marks:</strong> {paper.total_marks}
                        </div>
                        <div className="col-span-2">
                            <strong>Name:</strong> __________________________
                        </div>
                        <div className="col-span-2">
                            <strong>Roll No:</strong> __________________
                        </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs print:hidden">
                        <Badge tone="info">
                            {paper.mode === 'auto' ? 'Automatic' : 'Manual'}
                        </Badge>
                        <Badge tone="neutral">
                            {paper.paper_data.syllabus === 'qat'
                                ? 'QAT monthly syllabus'
                                : 'Custom syllabus'}
                        </Badge>
                        {paper.paper_data.variant && (
                            <Badge tone="neutral">
                                Paper {paper.paper_data.variant}
                            </Badge>
                        )}
                    </div>
                    <p className="mt-4 text-xs">
                        Instructions: Attempt all questions. Read each question
                        carefully.
                    </p>
                    <div className="mt-5 space-y-6">
                        {paper.paper_data.sections.map(
                            (section, sectionIndex) => (
                                <section
                                    key={`${section.question_type_id}-${sectionIndex}`}
                                >
                                    <div className="flex items-center justify-between border-b border-slate-700 pb-1 text-sm font-bold">
                                        <h2>{section.title}</h2>
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
                                            (question, questionIndex) => {
                                                const number =
                                                    paper.paper_data.sections
                                                        .slice(0, sectionIndex)
                                                        .reduce(
                                                            (total, previous) =>
                                                                total +
                                                                previous
                                                                    .questions
                                                                    .length,
                                                            0,
                                                        ) +
                                                    questionIndex +
                                                    1;

                                                return (
                                                    <div
                                                        key={question.id}
                                                        className="qat-question flex items-start gap-3"
                                                    >
                                                        <span className="shrink-0 text-sm font-semibold">
                                                            Q{number}.
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <QatQuestionContent
                                                                question={
                                                                    question
                                                                }
                                                            />
                                                        </div>
                                                        <span className="shrink-0 text-xs font-semibold">
                                                            [{question.marks}]
                                                        </span>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                </section>
                            ),
                        )}
                    </div>
                    <footer className="mt-10 border-t border-slate-300 pt-2 text-center text-xs text-slate-500">
                        End of paper · QAT practice
                    </footer>
                </article>
            </Card>
        </div>
    );
}

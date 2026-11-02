import { Head, Link } from '@inertiajs/react';
import { ArrowLeftIcon, ChevronRightIcon } from 'lucide-react';
import { QatClassSubjectCard } from '@/components/qat/class-subject-card';
import { QatGenerationActions } from '@/components/qat/generation-actions';
import QatGenerationForm from '@/components/qat/generation-form';
import type { QatGenerationFormProps } from '@/components/qat/generation-form';
import { QatGenerationHeader } from '@/components/qat/generation-header';
import { QatManualOverviewCard } from '@/components/qat/manual-overview-card';
import { QatManualQuestionsCard } from '@/components/qat/manual-questions-card';
import { QatManualSummaryCard } from '@/components/qat/manual-summary-card';
import { QatReviewCard } from '@/components/qat/review-card';
import { QatSyllabusCard } from '@/components/qat/syllabus-card';
import { QatTemplateCard } from '@/components/qat/template-card';

export default function QatCreate(props: QatGenerationFormProps) {
    const { mode } = props;
    const title = `${mode === 'auto' ? 'Auto' : 'Manual'} paper generation`;

    return (
        <div className="w-full space-y-4 pb-20">
            <Head title={title} />
            <nav
                aria-label="Breadcrumb"
                className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400"
            >
                <Link
                    href="/qa-tests"
                    className="-ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-1 transition-colors hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                >
                    <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
                    QAT Tests
                </Link>
                <ChevronRightIcon className="size-3" aria-hidden="true" />
                <span
                    aria-current="page"
                    className="text-slate-700 dark:text-slate-200"
                >
                    {title}
                </span>
            </nav>
            <QatGenerationHeader mode={mode} />
            <QatGenerationForm
                {...props}
                render={(selection) =>
                    mode === 'manual' ? (
                        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                            <div className="min-w-0 lg:col-start-1">
                                <QatClassSubjectCard {...selection} />
                            </div>
                            <div className="min-w-0 lg:col-start-1">
                                <QatSyllabusCard {...selection.syllabus} />
                            </div>
                            <div className="min-w-0 lg:col-start-1">
                                <QatManualOverviewCard {...selection.review} />
                            </div>
                            <QatManualSummaryCard {...selection.summary} />
                            <div className="min-w-0 lg:col-start-1">
                                <QatManualQuestionsCard
                                    {...selection.manualPicker}
                                />
                            </div>
                            <QatGenerationActions {...selection.review} />
                        </div>
                    ) : (
                        <>
                            <QatClassSubjectCard {...selection} />
                            <QatSyllabusCard {...selection.syllabus} />
                            {mode === 'auto' && (
                                <>
                                    <QatTemplateCard {...selection.template} />
                                    <QatReviewCard {...selection.review} />
                                </>
                            )}
                        </>
                    )
                }
            />
        </div>
    );
}

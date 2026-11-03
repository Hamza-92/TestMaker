import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ChevronRightIcon,
    Layers3Icon,
    PenLineIcon,
} from 'lucide-react';
import { QatClassSubjectCard } from '@/components/qat/class-subject-card';
import { QatGenerationActions } from '@/components/qat/generation-actions';
import QatGenerationForm from '@/components/qat/generation-form';
import type { QatGenerationFormProps } from '@/components/qat/generation-form';
import { QatGenerationHeader } from '@/components/qat/generation-header';
import { QatManualOverviewCard } from '@/components/qat/manual-overview-card';
import { QatManualQuestionsCard } from '@/components/qat/manual-questions-card';
import { QatReviewCard } from '@/components/qat/review-card';
import { QatSummaryCard } from '@/components/qat/selection-summary-card';
import { QatSyllabusCard } from '@/components/qat/syllabus-card';
import { QatTemplateCard } from '@/components/qat/template-card';

export default function QatCreate(props: QatGenerationFormProps) {
    const { mode } = props;
    const title = `${mode === 'auto' ? 'Auto' : 'Manual'} paper generation`;

    return (
        <div className="relative w-full space-y-4 pb-20">
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
                render={(selection) => (
                    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                        <div className="min-w-0 lg:col-start-1">
                            <QatClassSubjectCard {...selection} />
                        </div>
                        <div className="min-w-0 lg:col-start-1">
                            <QatSyllabusCard {...selection.syllabus} />
                        </div>
                        <div className="min-w-0 lg:col-start-1">
                            {mode === 'manual' && (
                                <fieldset className="relative mb-4 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-sky-50 p-4 dark:border-violet-900/50 dark:from-violet-950/30 dark:to-sky-950/30">
                                    <legend className="sr-only">
                                        Question selection method
                                    </legend>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <span className="text-sm font-semibold text-[#112650] dark:text-slate-100">
                                            Question selection
                                        </span>
                                        <div className="grid w-full grid-cols-2 rounded-xl border border-violet-100 bg-white p-1 dark:border-slate-700 dark:bg-slate-900 sm:flex sm:w-auto">
                                            {(
                                                [
                                                    {
                                                        id: 'manual',
                                                        label: 'Pick questions manually',
                                                        icon: PenLineIcon,
                                                    },
                                                    {
                                                        id: 'template',
                                                        label: 'Use a template',
                                                        icon: Layers3Icon,
                                                    },
                                                ] as const
                                            ).map(
                                                ({ id, label, icon: Icon }) => (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        aria-pressed={
                                                            selection.selectionMethod ===
                                                            id
                                                        }
                                                        onClick={() =>
                                                            selection.onSelectionMethodChange(
                                                                id,
                                                            )
                                                        }
                                                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${selection.selectionMethod === id ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-violet-50 hover:text-violet-700 dark:text-slate-400 dark:hover:bg-violet-950/50 dark:hover:text-violet-300'}`}
                                                    >
                                                        <Icon
                                                            aria-hidden="true"
                                                            className="size-3.5"
                                                        />
                                                        {label}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                </fieldset>
                            )}
                            {mode === 'manual' ? (
                                selection.selectionMethod === 'template' ? (
                                    <QatTemplateCard {...selection.template} />
                                ) : (
                                    <QatManualOverviewCard
                                        {...selection.review}
                                    />
                                )
                            ) : (
                                <QatTemplateCard {...selection.template} />
                            )}
                        </div>
                        <QatSummaryCard {...selection.summary} />
                        <div className="min-w-0 lg:col-start-1">
                            {mode === 'manual' ? (
                                selection.selectionMethod === 'template' ? (
                                    <QatReviewCard
                                        {...selection.review}
                                        showVariants={false}
                                        showActions={false}
                                    />
                                ) : (
                                    <QatManualQuestionsCard
                                        {...selection.manualPicker}
                                    />
                                )
                            ) : (
                                <QatReviewCard {...selection.review} />
                            )}
                        </div>
                        {mode === 'manual' && (
                            <QatGenerationActions {...selection.review} />
                        )}
                    </div>
                )}
            />
        </div>
    );
}

import {
    BookOpenIcon,
    CalendarDaysIcon,
    Clock3Icon,
    FileTextIcon,
    GraduationCapIcon,
    Layers3Icon,
    ListChecksIcon,
    NotebookPenIcon,
    StarIcon,
} from 'lucide-react';
import type { QatSelectionSummary } from '@/components/qat/generation-form';

export function QatSummaryCard({
    mode,
    className,
    subjectName,
    chapterCount,
    minutes,
    questionCount,
    totalMarks,
    templateName,
    variants,
    months,
}: QatSelectionSummary) {
    const rows = [
        { icon: GraduationCapIcon, label: 'Class', value: className },
        { icon: BookOpenIcon, label: 'Book', value: subjectName },
        {
            icon: NotebookPenIcon,
            label: 'Syllabus',
            value: mode === 'auto' ? 'QAT monthly' : 'Custom',
        },
        { icon: Layers3Icon, label: 'Chapters', value: chapterCount },
        ...(mode === 'auto' || templateName !== null
            ? [
                  {
                      icon: FileTextIcon,
                      label: 'Template',
                      value: templateName ?? 'Not selected',
                  },
              ]
            : []),
        {
            icon: Clock3Icon,
            label: 'Duration',
            value: minutes ? `${minutes} min` : '—',
        },
        ...(mode === 'auto'
            ? [
                  {
                      icon: Layers3Icon,
                      label: 'Variants',
                      value: `${variants} ${variants === 1 ? 'paper' : 'papers'}`,
                  },
              ]
            : []),
        { icon: ListChecksIcon, label: 'Questions', value: questionCount },
    ];

    return (
        <aside
            aria-labelledby="qat-summary-title"
            className="min-w-0 self-start overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm dark:border-sky-900/50 dark:bg-slate-900 lg:sticky lg:top-0 lg:col-start-2 lg:row-span-4 lg:row-start-1"
        >
            <div className="flex items-center gap-2.5 bg-gradient-to-r from-sky-500 via-brand-600 to-indigo-600 px-4 py-4 text-white">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <FileTextIcon aria-hidden="true" className="size-5" />
                </span>
                <h2
                    id="qat-summary-title"
                    className="min-w-0 flex-1 text-sm font-bold leading-6"
                >
                    Paper summary
                </h2>
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold">
                    {mode === 'auto' ? 'Auto' : 'Manual'}
                </span>
            </div>
            <div className="space-y-3 px-4 pb-4 pt-2">
                <div className="space-y-3">
                    <dl className="divide-y divide-sky-50 dark:divide-slate-800">
                        {rows.map(({ icon: Icon, label, value }) => (
                            <div
                                key={label}
                                className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-3 py-1.5"
                            >
                                <dt className="flex items-center gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                    <Icon
                                        aria-hidden="true"
                                        className="size-4 shrink-0 text-brand-400"
                                    />
                                    {label}
                                </dt>
                                <dd className="min-w-0 break-words text-right text-xs font-semibold leading-5 text-[#112650] dark:text-slate-100">
                                    {value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                    {months.length > 0 && (
                        <div
                            aria-label="Preparation month"
                            className="flex flex-wrap gap-2"
                        >
                            {months.map((month) => (
                                <span
                                    key={month}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-100 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-brand-600 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300"
                                >
                                    <CalendarDaysIcon
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                    {month}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <div
                    aria-live="polite"
                    className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50 to-blue-50 px-3 py-3 text-brand-600 dark:border-sky-900 dark:from-sky-950/70 dark:to-indigo-950/40 dark:text-sky-300"
                >
                    <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <StarIcon aria-hidden="true" className="size-4" />
                        Total marks
                    </span>
                    <strong className="text-2xl tabular-nums">
                        {totalMarks}
                    </strong>
                </div>
            </div>
        </aside>
    );
}

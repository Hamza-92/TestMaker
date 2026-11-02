import {
    BookOpenIcon,
    Clock3Icon,
    FileTextIcon,
    GraduationCapIcon,
    Layers3Icon,
    ListChecksIcon,
    NotebookPenIcon,
    StarIcon,
} from 'lucide-react';
import type { QatSelectionSummary } from '@/components/qat/generation-form';

export function QatManualSummaryCard({
    className,
    subjectName,
    chapterCount,
    minutes,
    questionCount,
    totalMarks,
}: QatSelectionSummary) {
    const rows = [
        { icon: GraduationCapIcon, label: 'Class', value: className },
        { icon: BookOpenIcon, label: 'Book', value: subjectName },
        { icon: NotebookPenIcon, label: 'Syllabus', value: 'Custom' },
        { icon: Layers3Icon, label: 'Chapters', value: chapterCount },
        {
            icon: Clock3Icon,
            label: 'Duration',
            value: minutes ? `${minutes} min` : '—',
        },
        { icon: ListChecksIcon, label: 'Questions', value: questionCount },
    ];

    return (
        <aside
            aria-labelledby="qat-manual-summary-title"
            className="min-w-0 self-start overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_6px_24px_-10px_rgba(37,99,235,0.15)] dark:border-sky-900/50 dark:bg-slate-900 lg:sticky lg:top-0 lg:col-start-2 lg:row-span-4 lg:row-start-1"
        >
            <div className="flex items-center gap-2.5 bg-gradient-to-r from-sky-500 via-brand-600 to-indigo-600 px-4 py-4 text-white">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <FileTextIcon aria-hidden="true" className="size-5" />
                </span>
                <h2
                    id="qat-manual-summary-title"
                    className="min-w-0 flex-1 text-sm font-bold"
                >
                    Paper summary
                </h2>
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold">
                    Manual
                </span>
            </div>
            <div className="space-y-4 p-4">
                <dl className="space-y-3">
                    {rows.map(({ icon: Icon, label, value }) => (
                        <div
                            key={label}
                            className="flex items-start justify-between gap-3 text-xs"
                        >
                            <dt className="flex shrink-0 items-center gap-2 text-slate-500 dark:text-slate-400">
                                <Icon
                                    aria-hidden="true"
                                    className="size-4 text-brand-400"
                                />
                                {label}
                            </dt>
                            <dd className="min-w-0 break-words text-right font-semibold text-[#112650] dark:text-slate-100">
                                {value}
                            </dd>
                        </div>
                    ))}
                </dl>
                <div
                    aria-live="polite"
                    className="flex items-center justify-between gap-3 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50 to-blue-50 px-3 py-3 text-brand-600 dark:border-sky-900 dark:from-sky-950/70 dark:to-indigo-950/40 dark:text-sky-300"
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

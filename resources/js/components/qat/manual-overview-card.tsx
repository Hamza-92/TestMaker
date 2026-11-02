import {
    Clock3Icon,
    FileTextIcon,
    ListChecksIcon,
    SigmaIcon,
} from 'lucide-react';
import type { QatReviewSelection } from '@/components/qat/generation-form';

const inputClass =
    'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

export function QatManualOverviewCard({
    name,
    minutes,
    rows,
    totalQuestions,
    totalMarks,
    error,
    onNameChange,
    onMinutesChange,
}: QatReviewSelection) {
    return (
        <section
            aria-labelledby="qat-manual-overview-title"
            className="min-w-0 overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50/70 shadow-[0_6px_24px_-10px_rgba(59,130,246,0.18)] dark:border-sky-900/50 dark:from-[#152c48] dark:via-slate-900 dark:to-[#1b2445]"
        >
            <div className="flex items-center gap-3 px-5 py-4 sm:gap-4 sm:px-6">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/50 bg-gradient-to-br from-sky-400 via-brand-600 to-indigo-600 text-xl font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)]">
                    3
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                    <h2
                        id="qat-manual-overview-title"
                        className="text-lg font-bold leading-snug tracking-tight text-[#112650] dark:text-slate-50 sm:text-xl"
                    >
                        Selected questions overview
                    </h2>
                    <p className="text-xs font-medium leading-relaxed text-[#526985] dark:text-slate-400 sm:text-[13px]">
                        Set your paper name and duration
                    </p>
                </div>
                <img
                    src="/images/qat/review-paper.webp"
                    alt=""
                    aria-hidden="true"
                    width={800}
                    height={176}
                    decoding="async"
                    className="pointer-events-none h-12 w-20 shrink-0 select-none object-contain object-right sm:h-14 sm:w-40"
                />
            </div>
            <div className="space-y-4 px-5 pb-5 pt-1 sm:px-6">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <label
                            htmlFor="qat-manual-name"
                            className="flex items-center gap-1.5 text-xs font-semibold text-[#425b7b] dark:text-slate-300"
                        >
                            <FileTextIcon
                                aria-hidden="true"
                                className="size-4 text-brand-500"
                            />
                            Paper name
                        </label>
                        <input
                            id="qat-manual-name"
                            value={name}
                            maxLength={150}
                            onChange={(event) =>
                                onNameChange(event.target.value)
                            }
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label
                            htmlFor="qat-manual-duration"
                            className="flex items-center gap-1.5 text-xs font-semibold text-[#425b7b] dark:text-slate-300"
                        >
                            <Clock3Icon
                                aria-hidden="true"
                                className="size-4 text-brand-500"
                            />
                            Duration (minutes)
                        </label>
                        <input
                            id="qat-manual-duration"
                            type="number"
                            min={10}
                            max={240}
                            value={minutes || ''}
                            onChange={(event) =>
                                onMinutesChange(Number(event.target.value))
                            }
                            className={inputClass}
                        />
                    </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-sky-200/80 bg-white dark:border-sky-900 dark:bg-slate-900">
                    <h3 className="flex items-center gap-2 border-b border-sky-100 bg-gradient-to-r from-sky-100/80 to-violet-50 px-4 py-3 text-sm font-bold text-[#112650] dark:border-sky-900 dark:from-sky-950/80 dark:to-violet-950/40 dark:text-slate-100">
                        <ListChecksIcon
                            aria-hidden="true"
                            className="size-4 text-brand-500"
                        />
                        Question distribution
                    </h3>
                    {rows.length ? (
                        <table className="relative w-full text-left text-xs">
                            <caption className="sr-only">
                                Selected question types, question counts and
                                total marks
                            </caption>
                            <thead className="bg-slate-50 text-[#425b7b] dark:bg-slate-800/70 dark:text-slate-300">
                                <tr>
                                    <th
                                        scope="col"
                                        className="px-4 py-3 font-semibold"
                                    >
                                        Question type
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-2 py-3 text-center font-semibold"
                                    >
                                        Questions
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-4 py-3 text-right font-semibold"
                                    >
                                        Marks
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="border-t border-slate-100 dark:border-slate-800"
                                    >
                                        <th
                                            scope="row"
                                            className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200"
                                        >
                                            {row.name}
                                        </th>
                                        <td className="px-2 py-3 text-center font-semibold tabular-nums">
                                            {row.count}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                                            {Number(row.marks.toFixed(2))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t border-sky-100 bg-sky-50 font-bold text-[#112650] dark:border-sky-900 dark:bg-sky-950/40 dark:text-slate-100">
                                <tr>
                                    <th scope="row" className="px-4 py-3">
                                        <span className="flex items-center gap-1.5">
                                            <SigmaIcon
                                                aria-hidden="true"
                                                className="size-4 text-brand-500"
                                            />
                                            Total
                                        </span>
                                    </th>
                                    <td className="px-2 py-3 text-center tabular-nums">
                                        {totalQuestions}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-brand-600 dark:text-sky-300">
                                        {totalMarks}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    ) : (
                        <p className="px-4 py-5 text-xs text-slate-500 dark:text-slate-400">
                            Choose questions below to build your paper.
                        </p>
                    )}
                </div>
                {error && (
                    <p
                        role="alert"
                        className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
                    >
                        {error}
                    </p>
                )}
            </div>
        </section>
    );
}

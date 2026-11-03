import { Link } from '@inertiajs/react';
import {
    AlertCircleIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    BadgeCheckIcon,
    CheckCircle2Icon,
    ClipboardListIcon,
    Clock3Icon,
    FileTextIcon,
    Layers3Icon,
    LoaderCircleIcon,
    SigmaIcon,
    StarIcon,
    Trash2Icon,
} from 'lucide-react';
import type { QatReviewSelection } from '@/components/qat/generation-form';
import { QatStepHeader } from '@/components/qat/step-header';

const fieldClass =
    'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition-colors hover:border-sky-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-sky-700';
const rowTones = [
    { background: 'bg-rose-50/45 dark:bg-rose-950/10', icon: 'text-rose-500' },
    {
        background: 'bg-amber-50/45 dark:bg-amber-950/10',
        icon: 'text-amber-500',
    },
    {
        background: 'bg-violet-50/45 dark:bg-violet-950/10',
        icon: 'text-violet-500',
    },
];

export function QatReviewCard({
    name,
    minutes,
    variants,
    allowRepeat,
    isPefPattern,
    loading,
    rows,
    totalQuestions,
    totalMarks,
    variantsHaveEnoughQuestions,
    canGenerate,
    saving,
    error,
    sidebarCollapsed,
    onNameChange,
    onMinutesChange,
    onVariantsChange,
    onAllowRepeatChange,
    onSectionChange,
    onClear,
    onGenerate,
}: QatReviewSelection) {
    return (
        <>
            <section
                aria-labelledby="qat-review-title"
                className="relative isolate overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50/70 shadow-sm dark:border-sky-900/50 dark:from-[#152c48] dark:via-slate-900 dark:to-[#1b2445]"
            >
                <QatStepHeader
                    id="qat-review-title"
                    step={4}
                    title="Review paper"
                    description="Set paper details and question distribution"
                    image="/images/qat/review-paper.webp"
                />
                <div className="space-y-5 px-5 pb-5 pt-1 sm:pl-[5.25rem] sm:pr-6">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onClear}
                            disabled={saving}
                            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-white/90 px-3 py-2 text-xs font-semibold text-brand-600 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-300 dark:hover:bg-sky-950/70"
                        >
                            <Trash2Icon
                                aria-hidden="true"
                                className="size-3.5"
                            />{' '}
                            Clear
                        </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                        <div className="space-y-1.5">
                            <label
                                htmlFor="qat-paper-name"
                                className="flex items-center gap-1.5 text-xs font-semibold text-[#425b7b] dark:text-slate-300"
                            >
                                <FileTextIcon
                                    aria-hidden="true"
                                    className="size-4 text-brand-500"
                                />
                                Paper name
                            </label>
                            <input
                                id="qat-paper-name"
                                className={fieldClass}
                                value={name}
                                maxLength={150}
                                onChange={(event) =>
                                    onNameChange(event.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label
                                htmlFor="qat-paper-duration"
                                className="flex items-center gap-1.5 text-xs font-semibold text-[#425b7b] dark:text-slate-300"
                            >
                                <Clock3Icon
                                    aria-hidden="true"
                                    className="size-4 text-brand-500"
                                />
                                Duration (minutes)
                            </label>
                            <input
                                id="qat-paper-duration"
                                type="number"
                                min={10}
                                max={240}
                                className={fieldClass}
                                value={minutes || ''}
                                onChange={(event) =>
                                    onMinutesChange(Number(event.target.value))
                                }
                            />
                        </div>
                    </div>
                    <div className="grid items-end gap-4 sm:grid-cols-2 sm:gap-5">
                        <fieldset className="min-w-0 space-y-2">
                            <legend className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#425b7b] dark:text-slate-300">
                                <Layers3Icon
                                    aria-hidden="true"
                                    className="size-4 text-brand-500"
                                />
                                Paper variants
                            </legend>
                            <div className="grid grid-cols-4 gap-1 rounded-xl border border-sky-100 bg-slate-100/80 p-1 dark:border-slate-700 dark:bg-slate-800/80">
                                {[1, 2, 3, 4].map((count) => (
                                    <button
                                        key={count}
                                        type="button"
                                        aria-pressed={variants === count}
                                        onClick={() => onVariantsChange(count)}
                                        className={`min-h-9 whitespace-nowrap rounded-lg px-1.5 py-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:text-xs ${variants === count ? 'bg-gradient-to-r from-indigo-500 to-brand-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-sky-300'}`}
                                    >
                                        {count}{' '}
                                        {count === 1 ? 'Paper' : 'Papers'}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-sky-100 bg-white/70 px-3 py-2.5 text-xs font-medium text-slate-600 transition-colors focus-within:ring-2 focus-within:ring-brand-500/20 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-sky-700">
                            <input
                                type="checkbox"
                                checked={allowRepeat}
                                onChange={(event) =>
                                    onAllowRepeatChange(event.target.checked)
                                }
                                className="size-4 shrink-0 accent-brand-600"
                            />
                            Allow repeats between variants
                        </label>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-sky-200/80 bg-white dark:border-sky-900 dark:bg-slate-900">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-100/80 via-sky-50 to-violet-50 px-4 py-3 dark:border-sky-900 dark:from-sky-950/80 dark:via-slate-800 dark:to-violet-950/40">
                            <div className="flex items-center gap-2.5">
                                <span className="flex size-9 items-center justify-center rounded-lg bg-white/80 text-brand-600 shadow-sm dark:bg-slate-900 dark:text-sky-400">
                                    <ClipboardListIcon
                                        aria-hidden="true"
                                        className="size-5"
                                    />
                                </span>
                                <h3 className="text-sm font-bold text-[#112650] dark:text-slate-100">
                                    Question distribution
                                </h3>
                            </div>
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold ${isPefPattern ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'}`}
                            >
                                {isPefPattern ? (
                                    <BadgeCheckIcon
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                ) : (
                                    <AlertCircleIcon
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                )}
                                {isPefPattern
                                    ? 'PEF Pattern'
                                    : 'Non PEF Pattern'}
                            </span>
                        </div>
                        {rows.length ? (
                            <div className="overflow-x-auto">
                                <table className="relative w-full min-w-[480px] table-fixed text-left text-sm">
                                    <caption className="sr-only">
                                        Question distribution: total questions,
                                        required questions and section marks
                                    </caption>
                                    <colgroup>
                                        <col />
                                        <col className="w-[88px] sm:w-28" />
                                        <col className="w-[88px] sm:w-28" />
                                        <col className="w-[88px] sm:w-28" />
                                    </colgroup>
                                    <thead className="bg-slate-50/90 text-xs text-[#425b7b] dark:bg-slate-800/70 dark:text-slate-300">
                                        <tr>
                                            <th
                                                scope="col"
                                                className="px-4 py-3 font-semibold"
                                            >
                                                Question type
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-2 py-3 font-semibold"
                                            >
                                                <span className="flex items-center justify-center gap-1.5">
                                                    <FileTextIcon
                                                        aria-hidden="true"
                                                        className="size-3.5 text-brand-500"
                                                    />
                                                    Total
                                                </span>
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-2 py-3 font-semibold"
                                            >
                                                <span className="flex items-center justify-center gap-1.5">
                                                    <CheckCircle2Icon
                                                        aria-hidden="true"
                                                        className="size-3.5 text-emerald-500"
                                                    />
                                                    Required
                                                </span>
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-2 py-3 font-semibold"
                                            >
                                                <span className="flex items-center justify-center gap-1.5">
                                                    <StarIcon
                                                        aria-hidden="true"
                                                        className="size-3.5 text-violet-500"
                                                    />
                                                    Marks
                                                </span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, index) => {
                                            const tone =
                                                rowTones[
                                                    index % rowTones.length
                                                ];

                                            return (
                                                <tr
                                                    key={row.id}
                                                    className={`border-t border-slate-100 dark:border-slate-800 ${tone.background}`}
                                                >
                                                    <th
                                                        scope="row"
                                                        className="px-4 py-3 text-xs font-semibold text-[#112650] dark:text-slate-100"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <FileTextIcon
                                                                aria-hidden="true"
                                                                className={`size-4 shrink-0 ${tone.icon}`}
                                                            />
                                                            {row.name}
                                                        </span>
                                                    </th>
                                                    <td className="px-2 py-2.5">
                                                        <input
                                                            aria-label={`${row.name} total`}
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            step={1}
                                                            value={
                                                                row.count || ''
                                                            }
                                                            placeholder="0"
                                                            className={`${fieldClass} h-9 px-2 text-center tabular-nums`}
                                                            onChange={(event) =>
                                                                onSectionChange(
                                                                    row.id,
                                                                    'quantity',
                                                                    Number(
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    ),
                                                                )
                                                            }
                                                        />
                                                        {row.count >
                                                            row.available && (
                                                            <span className="mt-1 block text-center text-[10px] text-amber-800 dark:text-amber-300">
                                                                {row.available}{' '}
                                                                available
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-2.5">
                                                        <input
                                                            aria-label={`${row.name} required`}
                                                            type="number"
                                                            min={
                                                                row.count > 0
                                                                    ? 1
                                                                    : 0
                                                            }
                                                            max={row.count}
                                                            step={1}
                                                            disabled={
                                                                row.count === 0
                                                            }
                                                            value={
                                                                row.required ||
                                                                ''
                                                            }
                                                            placeholder="0"
                                                            className={`${fieldClass} h-9 px-2 text-center tabular-nums`}
                                                            onChange={(event) =>
                                                                onSectionChange(
                                                                    row.id,
                                                                    'required_questions',
                                                                    Number(
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    ),
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2.5">
                                                        <input
                                                            aria-label={`${row.name} marks`}
                                                            type="number"
                                                            min={
                                                                row.required *
                                                                0.5
                                                            }
                                                            max={
                                                                row.required *
                                                                20
                                                            }
                                                            step={0.5}
                                                            disabled={
                                                                row.count === 0
                                                            }
                                                            value={
                                                                row.marks || ''
                                                            }
                                                            placeholder="0"
                                                            className={`${fieldClass} h-9 px-2 text-center tabular-nums`}
                                                            onChange={(event) =>
                                                                onSectionChange(
                                                                    row.id,
                                                                    'marks',
                                                                    Number(
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    ),
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="border-t border-sky-100 bg-sky-50 text-sm font-bold text-[#112650] dark:border-sky-900 dark:bg-sky-950/40 dark:text-slate-100">
                                        <tr>
                                            <th
                                                scope="row"
                                                className="px-4 py-3"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <SigmaIcon
                                                        aria-hidden="true"
                                                        className="size-5 text-brand-500"
                                                    />
                                                    Total
                                                </span>
                                            </th>
                                            <td className="px-2 py-3 text-center tabular-nums">
                                                {totalQuestions}
                                            </td>
                                            <td className="px-2 py-3 text-center tabular-nums">
                                                {rows.reduce(
                                                    (sum, row) =>
                                                        sum + row.required,
                                                    0,
                                                )}
                                            </td>
                                            <td className="px-2 py-3 text-center tabular-nums text-brand-600 dark:text-sky-300">
                                                {totalMarks}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            <p
                                role="status"
                                className="px-4 py-5 text-xs text-slate-500 dark:text-slate-400"
                            >
                                {loading
                                    ? 'Loading question distribution…'
                                    : 'Select a syllabus to set the question distribution.'}
                            </p>
                        )}
                    </div>
                    {totalQuestions > 0 && !variantsHaveEnoughQuestions && (
                        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                            <AlertCircleIcon
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0"
                            />
                            This syllabus does not have enough questions for the
                            selected number of paper variants.
                        </p>
                    )}
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
            <div
                className={`fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-sky-100 bg-white px-4 py-3 shadow-sm transition-[left] duration-200 dark:border-slate-800 dark:bg-slate-900 md:px-6 ${sidebarCollapsed ? 'md:left-16' : 'md:left-60'} print:hidden`}
            >
                <Link
                    href="/qa-tests"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    <ArrowLeftIcon aria-hidden="true" className="size-4" />
                    Back
                </Link>
                <button
                    type="button"
                    onClick={onGenerate}
                    disabled={saving || !canGenerate}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:from-indigo-600 hover:to-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                    {saving ? (
                        <LoaderCircleIcon
                            aria-hidden="true"
                            className="size-4 animate-spin motion-reduce:animate-none"
                        />
                    ) : (
                        <FileTextIcon aria-hidden="true" className="size-4" />
                    )}
                    {saving ? 'Generating…' : 'Generate paper'}
                    <ArrowRightIcon aria-hidden="true" className="size-4" />
                </button>
            </div>
        </>
    );
}

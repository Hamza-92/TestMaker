import {
    BookOpenIcon,
    CalendarDaysIcon,
    ChevronDownIcon,
    Layers3Icon,
} from 'lucide-react';
import type { QatSyllabusSelection } from '@/components/qat/generation-form';
import { QuestionContent } from '@/pages/customer/papers/paper-layouts/questions/question-content';

const selectClass =
    'h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-9 text-sm font-medium text-slate-900 outline-none transition-colors hover:border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-emerald-700 dark:disabled:bg-slate-900/40';

export function QatSyllabusCard({
    mode,
    subjectSelected,
    years,
    year,
    monthOptions,
    month,
    descriptions,
    chapters,
    chapterIds,
    onYearChange,
    onMonthChange,
    onChapterChange,
    onAllChaptersChange,
}: QatSyllabusSelection) {
    const isAuto = mode === 'auto';
    const allChaptersSelected =
        chapters.length > 0 &&
        chapters.every((chapter) => chapterIds.includes(chapter.id));

    return (
        <section
            aria-labelledby="qat-syllabus-title"
            className="relative isolate overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-[#f7fdfa] to-[#e9fbf2] shadow-[0_6px_24px_-10px_rgba(16,185,129,0.18)] dark:border-emerald-900/50 dark:from-[#10382f] dark:via-slate-900 dark:to-[#133c35]"
        >
            <img
                src={
                    isAuto
                        ? '/images/qat/syllabus-calendar.webp'
                        : '/images/qat/generation-header.webp'
                }
                alt=""
                aria-hidden="true"
                decoding="async"
                className="pointer-events-none absolute right-0 top-20 h-48 w-full max-w-xl select-none object-contain object-right-top opacity-50 dark:opacity-30 sm:top-0 sm:w-[55%] sm:opacity-100"
            />
            <div className="relative z-10 flex items-center gap-4 px-5 py-4 sm:px-6 sm:pr-[25%]">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/50 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-700 text-xl font-bold text-white shadow-[0_4px_12px_rgba(16,185,129,0.25)] dark:border-emerald-300/20">
                    2
                </span>
                <div className="min-w-0 space-y-1">
                    <h2
                        id="qat-syllabus-title"
                        className="text-lg font-bold leading-snug tracking-tight text-[#112650] dark:text-slate-50 sm:text-xl"
                    >
                        {isAuto
                            ? 'Choose your syllabus'
                            : 'Choose your chapters'}
                    </h2>
                    <p className="text-xs font-medium leading-relaxed text-[#526985] dark:text-slate-400 sm:text-[13px]">
                        {isAuto
                            ? 'Select the academic year and preparation month'
                            : 'Select the chapters to include in your paper'}
                    </p>
                </div>
            </div>
            <div className="relative z-10 space-y-4 px-5 pb-5 pt-1 sm:pl-[5.25rem] sm:pr-6">
                {isAuto ? (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                            <div className="min-w-0 space-y-1.5">
                                <label
                                    htmlFor="qat-academic-year"
                                    className="block text-xs font-semibold text-[#425b7b] dark:text-slate-300"
                                >
                                    Academic year
                                </label>
                                <div className="relative">
                                    <CalendarDaysIcon
                                        aria-hidden="true"
                                        className="pointer-events-none absolute left-3 top-3.5 size-4 text-emerald-600 dark:text-emerald-400"
                                    />
                                    <select
                                        id="qat-academic-year"
                                        className={selectClass}
                                        value={year}
                                        disabled={
                                            !subjectSelected || !years.length
                                        }
                                        onChange={(event) =>
                                            onYearChange(event.target.value)
                                        }
                                    >
                                        {!years.length && (
                                            <option value="">
                                                Select a subject first
                                            </option>
                                        )}
                                        {years.map((value) => (
                                            <option key={value} value={value}>
                                                {value}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon
                                        aria-hidden="true"
                                        className="pointer-events-none absolute right-3 top-3.5 size-4 text-slate-400"
                                    />
                                </div>
                            </div>
                            <div className="min-w-0 space-y-1.5">
                                <label
                                    htmlFor="qat-preparation-month"
                                    className="block text-xs font-semibold text-[#425b7b] dark:text-slate-300"
                                >
                                    Preparation month
                                </label>
                                <div className="relative">
                                    <CalendarDaysIcon
                                        aria-hidden="true"
                                        className="pointer-events-none absolute left-3 top-3.5 size-4 text-emerald-600 dark:text-emerald-400"
                                    />
                                    <select
                                        id="qat-preparation-month"
                                        className={selectClass}
                                        value={month ?? ''}
                                        disabled={
                                            !subjectSelected ||
                                            !monthOptions.length
                                        }
                                        onChange={(event) =>
                                            onMonthChange(
                                                event.target.value
                                                    ? Number(event.target.value)
                                                    : null,
                                            )
                                        }
                                    >
                                        <option value="">
                                            {subjectSelected
                                                ? 'Select month'
                                                : 'Select a subject first'}
                                        </option>
                                        {monthOptions.map((option) => (
                                            <option
                                                key={option.id}
                                                value={option.id}
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon
                                        aria-hidden="true"
                                        className="pointer-events-none absolute right-3 top-3.5 size-4 text-slate-400"
                                    />
                                </div>
                            </div>
                        </div>
                        {subjectSelected && !monthOptions.length && (
                            <p
                                role="status"
                                className="rounded-lg border border-emerald-100 bg-white/80 px-3 py-2.5 text-xs text-slate-600 dark:border-emerald-900 dark:bg-slate-900/80 dark:text-slate-400"
                            >
                                No monthly syllabus is available for this
                                subject yet.
                            </p>
                        )}
                        <div aria-live="polite" className="space-y-3">
                            {descriptions.map((description) => (
                                <div
                                    key={description.month}
                                    className="overflow-hidden rounded-xl border border-emerald-200/70 bg-white/90 shadow-sm dark:border-emerald-800/70 dark:bg-slate-900/90"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-sky-50/70 px-4 py-3 dark:border-emerald-900 dark:from-emerald-950/50 dark:to-slate-800/70">
                                        <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300">
                                            <BookOpenIcon
                                                aria-hidden="true"
                                                className="size-4"
                                            />
                                            {description.label} Syllabus
                                        </h3>
                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                                            <Layers3Icon
                                                aria-hidden="true"
                                                className="size-3.5"
                                            />
                                            {description.chapterCount}{' '}
                                            {description.chapterCount === 1
                                                ? 'chapter'
                                                : 'chapters'}
                                        </span>
                                    </div>
                                    <div className="space-y-3 p-4">
                                        {description.books.length ? (
                                            description.books.map((book) => (
                                                <div
                                                    key={book.id}
                                                    dir="auto"
                                                    className="max-w-full overflow-x-auto text-sm text-slate-700 dark:text-slate-200"
                                                >
                                                    <QuestionContent
                                                        value={book.description}
                                                        className="break-words leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_p+p]:mt-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-emerald-100 [&_td]:p-2 dark:[&_td]:border-slate-700 [&_th]:border [&_th]:border-emerald-100 [&_th]:bg-emerald-50/70 [&_th]:p-2 [&_th]:font-semibold dark:[&_th]:border-slate-700 dark:[&_th]:bg-emerald-950/30"
                                                    />
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                No syllabus description is
                                                available for this month.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : subjectSelected ? (
                    <>
                        <div className="flex justify-end">
                            <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-emerald-200 bg-white/90 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm transition-colors focus-within:ring-2 focus-within:ring-emerald-500/20 hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900/90 dark:text-emerald-300 dark:hover:bg-emerald-950/60">
                                <input
                                    type="checkbox"
                                    className="size-4 accent-emerald-600"
                                    aria-label="Select all chapters"
                                    checked={allChaptersSelected}
                                    disabled={!chapters.length}
                                    onChange={(event) =>
                                        onAllChaptersChange(
                                            event.target.checked,
                                        )
                                    }
                                />
                                Select all chapters
                            </label>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {chapters.map((chapter) => (
                                <label
                                    key={chapter.id}
                                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-emerald-500/20 ${chapterIds.includes(chapter.id) ? 'border-emerald-400 bg-emerald-50/95 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-100' : 'border-emerald-100 bg-white/90 text-slate-700 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-emerald-700'}`}
                                >
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 size-4 shrink-0 accent-emerald-600"
                                        checked={chapterIds.includes(
                                            chapter.id,
                                        )}
                                        onChange={() =>
                                            onChapterChange(chapter.id)
                                        }
                                    />
                                    <span className="min-w-0 break-words">
                                        {chapter.name}
                                    </span>
                                </label>
                            ))}
                        </div>
                        {!chapters.length && (
                            <p
                                role="status"
                                className="text-xs text-slate-500 dark:text-slate-400"
                            >
                                No chapters are available for this subject yet.
                            </p>
                        )}
                    </>
                ) : (
                    <p className="rounded-lg border border-emerald-100 bg-white/80 px-3 py-3 text-xs text-slate-500 dark:border-emerald-900 dark:bg-slate-900/80 dark:text-slate-400">
                        Select a subject to see its chapters.
                    </p>
                )}
            </div>
        </section>
    );
}

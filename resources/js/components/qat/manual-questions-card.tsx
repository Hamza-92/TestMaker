import {
    AlertCircleIcon,
    ListFilterIcon,
    LoaderCircleIcon,
    SearchIcon,
} from 'lucide-react';
import type { QatManualSelection } from '@/components/qat/generation-form';
import { Switch } from '@/components/ui/switch';
import { QatQuestionStatement } from '@/pages/customer/qat/question';

const badgeClass =
    'rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300';

export function QatManualQuestionsCard({
    subjectSelected,
    chaptersSelected,
    loading,
    error,
    types,
    questions,
    selected,
    search,
    typeFilter,
    selectedOnly,
    onSearchChange,
    onTypeChange,
    onSelectedOnlyChange,
    onToggle,
    onMarksChange,
}: QatManualSelection) {
    const ready = subjectSelected && chaptersSelected && !loading && !error;

    return (
        <section
            aria-labelledby="qat-manual-picker-title"
            className="min-w-0 overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-[#fcfaff] to-indigo-50/60 shadow-[0_6px_24px_-10px_rgba(139,92,246,0.18)] dark:border-violet-900/50 dark:from-[#2b1c46] dark:via-slate-900 dark:to-[#24223d]"
        >
            <div className="flex items-center gap-3 px-5 py-4 sm:gap-4 sm:px-6">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/50 bg-gradient-to-br from-violet-400 via-violet-600 to-purple-800 text-xl font-bold text-white shadow-[0_4px_12px_rgba(139,92,246,0.25)]">
                    4
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                    <h2
                        id="qat-manual-picker-title"
                        className="text-lg font-bold leading-snug tracking-tight text-[#112650] dark:text-slate-50 sm:text-xl"
                    >
                        Pick your questions
                    </h2>
                    <p className="text-xs font-medium leading-relaxed text-[#526985] dark:text-slate-400 sm:text-[13px]">
                        Choose questions and set their marks
                    </p>
                </div>
                <img
                    src="/images/qat/templates.webp"
                    alt=""
                    aria-hidden="true"
                    width={800}
                    height={346}
                    decoding="async"
                    className="pointer-events-none h-12 w-20 shrink-0 select-none object-contain object-right sm:h-14 sm:w-40"
                />
            </div>
            <div className="space-y-4 px-5 pb-5 pt-1 sm:px-6">
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative w-full sm:w-52">
                        <SearchIcon
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3 top-3 size-4 text-violet-400"
                        />
                        <input
                            aria-label="Search questions"
                            placeholder="Search questions"
                            value={search}
                            disabled={!ready || selectedOnly}
                            onChange={(event) =>
                                onSearchChange(event.target.value)
                            }
                            className="h-10 w-full rounded-lg border border-violet-200 bg-white pl-9 pr-3 text-xs outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                    </div>
                    <select
                        aria-label="Filter question type"
                        value={typeFilter}
                        disabled={!ready || selectedOnly}
                        onChange={(event) => onTypeChange(event.target.value)}
                        className="h-10 w-full rounded-lg border border-violet-200 bg-white px-3 text-xs outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:w-40"
                    >
                        <option value="">All question types</option>
                        {types.map((type) => (
                            <option key={type.id} value={type.id}>
                                {type.name} ({type.total})
                            </option>
                        ))}
                    </select>
                    <div className="flex h-10 items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 shadow-sm transition-colors hover:border-violet-400 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-600 dark:hover:bg-violet-950/50 sm:ml-auto">
                        <label
                            htmlFor="qat-manual-selected-only"
                            className="cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300"
                        >
                            Selected only
                        </label>
                        <Switch
                            id="qat-manual-selected-only"
                            aria-label="Selected only"
                            checked={selectedOnly}
                            disabled={!ready}
                            onCheckedChange={onSelectedOnlyChange}
                            className="data-[state=checked]:bg-violet-600"
                        />
                    </div>
                </div>
                {error ? (
                    <div
                        role="alert"
                        className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
                    >
                        <AlertCircleIcon
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0"
                        />
                        {error}
                    </div>
                ) : !ready ? (
                    <p
                        role="status"
                        className="flex items-center gap-2 rounded-xl border border-violet-100 bg-white/80 p-5 text-xs text-slate-500 dark:border-violet-900 dark:bg-slate-900/70 dark:text-slate-400"
                    >
                        {loading && (
                            <LoaderCircleIcon
                                aria-hidden="true"
                                className="size-4 animate-spin text-violet-500 motion-reduce:animate-none"
                            />
                        )}
                        {loading
                            ? 'Loading questions…'
                            : subjectSelected
                              ? 'Select chapters to see their questions.'
                              : 'Select a class and subject to see questions.'}
                    </p>
                ) : (
                    <div
                        role="region"
                        aria-label="Available questions"
                        tabIndex={0}
                        className="max-h-[60vh] space-y-2.5 overflow-y-auto overscroll-contain rounded-xl border border-violet-100 bg-white/50 p-2 outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-violet-900/70 dark:bg-slate-950/20 sm:p-3"
                    >
                        {questions.map((question) => {
                            const checked = Object.hasOwn(
                                selected,
                                question.id,
                            );

                            return (
                                <div
                                    key={question.id}
                                    className={`rounded-xl border p-3 transition-colors ${checked ? 'border-brand-400 bg-sky-50 shadow-sm dark:border-brand-500 dark:bg-sky-950/40' : 'border-slate-200 bg-white hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-700'}`}
                                >
                                    <label className="flex cursor-pointer items-start gap-2.5">
                                        <input
                                            type="checkbox"
                                            aria-label={`Select question ${question.id}`}
                                            checked={checked}
                                            onChange={() =>
                                                onToggle(question.id)
                                            }
                                            className="mt-1 size-4 shrink-0 accent-brand-600"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <QatQuestionStatement
                                                question={question}
                                            />
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                <span className="rounded-md border border-brand-200 bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-800 dark:border-brand-500/50 dark:bg-brand-500/20 dark:text-brand-200">
                                                    {question.type_name}
                                                </span>
                                                <span className={badgeClass}>
                                                    {question.chapter_name}
                                                </span>
                                                {question.topic_name && (
                                                    <span
                                                        className={badgeClass}
                                                    >
                                                        {question.topic_name}
                                                    </span>
                                                )}
                                                {question.source_label && (
                                                    <span
                                                        className={badgeClass}
                                                    >
                                                        {question.source_label}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                    {checked && (
                                        <div className="mt-2 flex items-center gap-2 pl-[26px]">
                                            <label
                                                htmlFor={`qat-manual-marks-${question.id}`}
                                                className="text-xs font-semibold text-slate-600 dark:text-slate-300"
                                            >
                                                Marks:
                                            </label>
                                            <input
                                                id={`qat-manual-marks-${question.id}`}
                                                aria-label={`Question ${question.id} marks`}
                                                type="number"
                                                min={0.5}
                                                max={20}
                                                step={0.5}
                                                value={selected[question.id]}
                                                onChange={(event) =>
                                                    onMarksChange(
                                                        question.id,
                                                        Number(
                                                            event.target.value,
                                                        ),
                                                    )
                                                }
                                                className="h-8 w-20 rounded-lg border border-sky-200 bg-white px-2 text-xs font-medium outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {!questions.length && (
                            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                                <ListFilterIcon
                                    aria-hidden="true"
                                    className="size-7 text-violet-300 dark:text-violet-600"
                                />
                                {selectedOnly
                                    ? 'No questions selected yet.'
                                    : search || typeFilter
                                      ? 'No questions match your filters.'
                                      : 'No questions are available for these chapters.'}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

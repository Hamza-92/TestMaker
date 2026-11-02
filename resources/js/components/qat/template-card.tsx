import {
    AlertCircleIcon,
    CheckIcon,
    Clock3Icon,
    FileStackIcon,
    FileTextIcon,
    LoaderCircleIcon,
    SparklesIcon,
} from 'lucide-react';
import type { QatTemplateSelection } from '@/components/qat/generation-form';

export function QatTemplateCard({
    subjectSelected,
    syllabusSelected,
    loading,
    error,
    selectedId,
    options,
    onSelect,
}: QatTemplateSelection) {
    return (
        <section
            aria-labelledby="qat-template-title"
            className="relative isolate overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 via-[#fcfaff] to-[#f0ecff] shadow-[0_6px_24px_-10px_rgba(139,92,246,0.18)] dark:border-violet-900/50 dark:from-[#2b1c46] dark:via-slate-900 dark:to-[#282040]"
        >
            <div className="relative z-10 flex items-center gap-3 px-5 py-4 sm:gap-4 sm:px-6">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/50 bg-gradient-to-br from-violet-400 via-violet-600 to-purple-800 text-xl font-bold text-white shadow-[0_4px_12px_rgba(139,92,246,0.25)] dark:border-violet-300/20">
                    3
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                    <h2
                        id="qat-template-title"
                        className="text-lg font-bold leading-snug tracking-tight text-[#112650] dark:text-slate-50 sm:text-xl"
                    >
                        Choose a paper template
                    </h2>
                    <p className="text-xs font-medium leading-relaxed text-[#526985] dark:text-slate-400 sm:text-[13px]">
                        Select a pattern for your test paper
                    </p>
                </div>
                <img
                    src="/images/qat/templates.webp"
                    alt=""
                    aria-hidden="true"
                    width={800}
                    height={346}
                    decoding="async"
                    className="pointer-events-none h-12 w-20 shrink-0 select-none object-contain object-right sm:h-14 sm:w-48"
                />
            </div>
            <div
                aria-busy={loading}
                className="relative z-10 px-5 pb-5 pt-1 sm:pl-[5.25rem] sm:pr-6"
            >
                {!subjectSelected || !syllabusSelected ? (
                    <TemplateStatus>
                        <FileStackIcon
                            aria-hidden="true"
                            className="size-5 shrink-0 text-violet-500"
                        />
                        {subjectSelected
                            ? 'Select a preparation month with a syllabus to view templates.'
                            : 'Select a class and subject to view templates.'}
                    </TemplateStatus>
                ) : error ? (
                    <div
                        role="alert"
                        className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                    >
                        <AlertCircleIcon
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0"
                        />
                        {error}
                    </div>
                ) : loading ? (
                    <div role="status">
                        <TemplateStatus>
                            <LoaderCircleIcon
                                aria-hidden="true"
                                className="size-5 shrink-0 animate-spin text-violet-500 motion-reduce:animate-none"
                            />
                            Loading paper templates…
                        </TemplateStatus>
                    </div>
                ) : !options.length ? (
                    <TemplateStatus>
                        <FileStackIcon
                            aria-hidden="true"
                            className="size-5 shrink-0 text-violet-500"
                        />
                        No templates are available for this subject yet.
                    </TemplateStatus>
                ) : (
                    <div className="grid gap-3 xl:grid-cols-2">
                        {options.map((template) => {
                            const selected = selectedId === template.id;
                            const total = template.rows.reduce(
                                (sum, row) => sum + row.total,
                                0,
                            );
                            const marks = Number(
                                template.rows
                                    .reduce(
                                        (sum, row) =>
                                            sum + row.required * row.marks,
                                        0,
                                    )
                                    .toFixed(2),
                            );

                            return (
                                <button
                                    key={template.id}
                                    type="button"
                                    aria-label={template.name}
                                    aria-pressed={selected}
                                    onClick={() => onSelect(template.id)}
                                    className={`group flex min-w-0 flex-col rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 motion-reduce:transition-none ${selected ? 'border-violet-500 bg-gradient-to-br from-white to-violet-100/70 shadow-[0_4px_16px_-6px_rgba(124,58,237,0.3)] dark:border-violet-400 dark:from-slate-900 dark:to-violet-950/70' : 'border-violet-200/80 bg-white/90 hover:border-violet-400 hover:bg-violet-50 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/90 dark:hover:border-violet-600 dark:hover:bg-violet-950/40'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span
                                            className={`flex size-11 shrink-0 items-center justify-center rounded-xl border ${selected ? 'border-violet-200 bg-violet-100 text-violet-600 dark:border-violet-700 dark:bg-violet-500/20 dark:text-violet-300' : 'border-violet-100 bg-violet-50 text-violet-500 dark:border-violet-900 dark:bg-violet-950/60 dark:text-violet-400'}`}
                                        >
                                            <FileTextIcon
                                                aria-hidden="true"
                                                className="size-6"
                                            />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            {template.category && (
                                                <span className="mb-1 inline-block max-w-full break-words rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                                                    {template.category}
                                                </span>
                                            )}
                                            <h3 className="break-words text-sm font-bold text-[#112650] dark:text-slate-100 sm:text-base">
                                                {template.name}
                                            </h3>
                                            <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock3Icon
                                                        aria-hidden="true"
                                                        className="size-3.5"
                                                    />
                                                    {template.minutes} min
                                                </span>
                                                <span>
                                                    {total}{' '}
                                                    {total === 1
                                                        ? 'question'
                                                        : 'questions'}
                                                </span>
                                            </span>
                                        </div>
                                        <span
                                            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${selected ? 'border-violet-600 bg-violet-600 text-white dark:border-violet-400 dark:bg-violet-500' : 'border-violet-200 bg-white group-hover:border-violet-400 dark:border-slate-600 dark:bg-slate-900'}`}
                                        >
                                            {selected && (
                                                <CheckIcon
                                                    aria-hidden="true"
                                                    className="size-3.5"
                                                />
                                            )}
                                        </span>
                                    </div>
                                    <div className="mt-4 space-y-2 rounded-lg border border-violet-100 bg-white/70 p-3 dark:border-violet-900/70 dark:bg-slate-950/30">
                                        {template.rows.map((row) => (
                                            <div
                                                key={row.id}
                                                className="flex items-center justify-between gap-3 text-xs"
                                            >
                                                <div className="min-w-0">
                                                    <span className="break-words font-semibold text-slate-700 dark:text-slate-200">
                                                        {row.name}
                                                    </span>
                                                    <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                                                        {row.total} total ·{' '}
                                                        {row.required} required
                                                        × {row.marks}
                                                    </span>
                                                </div>
                                                <strong className="shrink-0 tabular-nums text-violet-800 dark:text-violet-300">
                                                    {Number(
                                                        (
                                                            row.required *
                                                            row.marks
                                                        ).toFixed(2),
                                                    )}
                                                </strong>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-violet-100/80 px-3 py-2 text-xs font-semibold text-violet-900 dark:bg-violet-500/15 dark:text-violet-200">
                                        <span className="inline-flex items-center gap-1.5">
                                            <SparklesIcon
                                                aria-hidden="true"
                                                className="size-3.5"
                                            />
                                            Total marks
                                        </span>
                                        <span className="text-lg font-bold tabular-nums">
                                            {marks}
                                        </span>
                                    </div>
                                    {!template.ready && (
                                        <span className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                                            <AlertCircleIcon
                                                aria-hidden="true"
                                                className="mt-0.5 size-3.5 shrink-0"
                                            />
                                            Not enough questions in this
                                            syllabus for this template.
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}

function TemplateStatus({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-violet-100 bg-white/80 p-4 text-xs leading-relaxed text-slate-500 dark:border-violet-900/70 dark:bg-slate-900/80 dark:text-slate-400">
            {children}
        </div>
    );
}

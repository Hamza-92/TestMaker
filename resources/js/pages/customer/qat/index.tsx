import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRightIcon,
    FileTextIcon,
    LoaderCircleIcon,
    PenLineIcon,
    SearchIcon,
    XIcon,
    ZapIcon,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Pagination } from '@/components/tm';
import type { PageMeta } from '@/components/tm';

type SavedPaper = {
    id: number;
    name: string;
    mode: 'auto' | 'manual';
    class_names: string | null;
    subject_name: string | null;
    total_marks: number;
    question_count: number;
    updated_at: string;
    author_name: string | null;
};

function formatDate(value: string): string {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
          });
}

export default function QatIndex({
    papers,
    filters,
}: {
    papers: PageMeta & { data: SavedPaper[] };
    filters: { q: string };
}) {
    const [search, setSearch] = useState(filters.q);
    const [busy, setBusy] = useState(false);

    function navigate(page = 1, q = filters.q) {
        router.get(
            '/qa-tests',
            { q: q || undefined, page: page > 1 ? page : undefined },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setBusy(true),
                onFinish: () => setBusy(false),
            },
        );
    }

    function submitSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!busy) {
            navigate(1, search.trim());
        }
    }

    function clearSearch() {
        setSearch('');
        navigate(1, '');
    }

    return (
        <div className="w-full space-y-7 pb-4">
            <Head title="QAT practice papers on the PEF pattern" />
            <header className="relative isolate overflow-hidden rounded-[24px] border border-sky-100 bg-gradient-to-br from-white via-[#f2f8ff] to-[#edf9f4] px-6 py-6 dark:border-slate-800 dark:from-slate-900 dark:via-[#15243e] dark:to-[#15332e] sm:px-8">
                <Sprinkles className="absolute inset-0 -z-10 size-full text-sky-400/60 dark:text-sky-400/40" />
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[26px] font-bold leading-[1.25] tracking-tight text-brand-600 dark:text-sky-400 sm:text-[32px] xl:text-[36px]">
                            <span className="block">QAT practice papers</span>
                            <span className="block">on the PEF pattern</span>
                        </h1>
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 154 10"
                            className="mt-3 h-2 w-32 text-amber-400"
                        >
                            <path
                                d="M3 7C38 1 84 1 151 4M16 9C61 5 107 5 139 7"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                    <img
                        src="/images/qat/generation-header.webp"
                        alt=""
                        aria-hidden="true"
                        width={960}
                        height={487}
                        fetchPriority="high"
                        decoding="async"
                        className="mx-auto h-40 w-full max-w-72 shrink-0 select-none object-contain sm:w-[32%] sm:max-w-none"
                    />
                </div>
                <p className="relative mt-5 w-full text-[13px] leading-6 text-[#526985] dark:text-slate-300">
                    Testmaker creates Quality Assurance Test (QAT) practice
                    papers for PEF partner schools (NSP, FAS, EVS, PSRP, NSSE).
                    It provides papers for Classes 3–7 based on the PEF pattern.
                    Papers are available chapter-wise, with answer keys, in both
                    English and Urdu.
                </p>
            </header>

            <div
                className="grid gap-4 md:grid-cols-2"
                aria-label="Create a QAT paper"
            >
                <GenerationCard mode="auto" />
                <GenerationCard mode="manual" />
            </div>

            <section
                aria-labelledby="saved-qat-papers"
                aria-busy={busy}
                className="space-y-5"
            >
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h2
                            id="saved-qat-papers"
                            className="text-xl font-bold tracking-tight text-[#112650] dark:text-slate-100 sm:text-2xl"
                        >
                            Saved papers
                            <span className="text-brand-500">.</span>
                        </h2>
                        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                            {papers.total} {filters.q ? 'matching' : 'saved'}{' '}
                            {papers.total === 1 ? 'paper' : 'papers'}
                        </p>
                    </div>
                    <form
                        role="search"
                        onSubmit={submitSearch}
                        className="flex w-full items-center gap-2 sm:w-auto"
                    >
                        <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
                            <SearchIcon
                                aria-hidden="true"
                                className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400"
                            />
                            <input
                                aria-label="Search saved QAT papers"
                                placeholder="Search papers, class or subject"
                                maxLength={150}
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-xs text-slate-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                            {(search || filters.q) && (
                                <button
                                    type="button"
                                    aria-label="Clear search"
                                    disabled={busy}
                                    onClick={clearSearch}
                                    className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-sky-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 dark:hover:bg-slate-800"
                                >
                                    <XIcon
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={busy}
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60"
                        >
                            {busy && (
                                <LoaderCircleIcon
                                    aria-hidden="true"
                                    className="size-3.5 animate-spin motion-reduce:animate-none"
                                />
                            )}
                            Search
                        </button>
                    </form>
                </div>
                {papers.data.length ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {papers.data.map((paper) => (
                            <SavedPaperCard key={paper.id} paper={paper} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center rounded-2xl border border-sky-100 bg-white px-5 py-9 text-center dark:border-slate-800 dark:bg-slate-900">
                        <img
                            src="/images/qat/templates.webp"
                            alt=""
                            aria-hidden="true"
                            width={800}
                            height={346}
                            loading="lazy"
                            decoding="async"
                            className="mb-4 h-28 w-56 select-none object-contain"
                        />
                        <h3 className="text-lg font-bold text-[#112650] dark:text-slate-100">
                            {filters.q
                                ? 'No matching QAT papers'
                                : 'Your paper collection starts here'}
                        </h3>
                        <p className="mt-2 max-w-sm text-xs leading-6 text-slate-500 dark:text-slate-400">
                            {filters.q
                                ? 'Try another paper name, class or subject.'
                                : 'Create a paper above, then save it to keep it here.'}
                        </p>
                        {filters.q && (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={clearSearch}
                                className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-brand-600 transition-colors hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                )}
                <Pagination
                    meta={papers}
                    label="papers"
                    onPageChange={(page) => navigate(page)}
                />
            </section>
        </div>
    );
}

function GenerationCard({ mode }: { mode: 'auto' | 'manual' }) {
    const auto = mode === 'auto';
    const Icon = auto ? ZapIcon : PenLineIcon;

    return (
        <Link
            href={`/qa-tests/create/${mode}`}
            className={`group relative isolate overflow-hidden rounded-[22px] border p-6 outline-none transition-[border-color,box-shadow] hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${auto ? 'border-blue-600 bg-gradient-to-br from-[#087bf8] via-[#0754ed] to-[#253bc2] text-white hover:border-blue-400' : 'border-violet-200 bg-gradient-to-br from-[#faf5ff] via-[#f0eaff] to-[#e7e1fc] text-[#2d2353] hover:border-violet-400 dark:border-violet-800/60 dark:from-[#2b2045] dark:via-[#251e3e] dark:to-[#332653] dark:text-violet-100'}`}
        >
            <Sprinkles
                className={`pointer-events-none absolute inset-0 -z-10 size-full ${auto ? 'text-white/35' : 'text-violet-400/45'}`}
            />
            <img
                src={
                    auto
                        ? '/images/qat/landing-checklist.webp'
                        : '/images/qat/templates.webp'
                }
                alt=""
                aria-hidden="true"
                width={auto ? 640 : 800}
                height={auto ? 400 : 346}
                decoding="async"
                className={`pointer-events-none absolute bottom-0 right-0 -z-10 h-36 select-none object-contain object-right-bottom sm:h-40 ${auto ? 'w-[40%] opacity-95' : 'w-[44%]'}`}
            />
            <div className="mb-4 flex items-center justify-between">
                <span
                    className={`flex size-10 items-center justify-center rounded-xl ${auto ? 'bg-white/15 text-white' : 'bg-white/80 text-violet-600 dark:bg-white/10 dark:text-violet-300'}`}
                >
                    <Icon aria-hidden="true" className="size-5" />
                </span>
                <span
                    className={`flex size-8 items-center justify-center rounded-full border transition-colors ${auto ? 'border-white/30 group-hover:bg-white/15' : 'border-violet-300/70 text-violet-600 group-hover:bg-white/60 dark:text-violet-300 dark:group-hover:bg-white/10'}`}
                >
                    <ArrowRightIcon aria-hidden="true" className="size-4" />
                </span>
            </div>
            <h2 className="relative max-w-[85%] text-xl font-bold leading-tight tracking-tight sm:text-[23px]">
                {auto ? 'Auto paper generation' : 'Manual paper generation'}
            </h2>
            <p
                className={`relative mt-2 max-w-[58%] text-xs leading-6 ${auto ? 'text-blue-100' : 'text-[#75688e] dark:text-violet-200/70'}`}
            >
                {auto
                    ? 'Create a paper from a PEF template in just a few clicks.'
                    : 'Choose your questions. Make the paper your own.'}
            </p>
            <span
                className={`relative mt-5 inline-flex items-center gap-2 text-xs font-bold ${auto ? 'text-white' : 'text-violet-700 dark:text-violet-300'}`}
            >
                {auto ? 'Let’s create a paper' : 'Start choosing questions'}
                <ArrowRightIcon aria-hidden="true" className="size-3.5" />
            </span>
        </Link>
    );
}

function SavedPaperCard({ paper }: { paper: SavedPaper }) {
    const auto = paper.mode === 'auto';

    return (
        <Link
            href={`/qa-tests/papers/${paper.id}`}
            aria-label={`Open ${paper.name}`}
            className={`group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white p-5 outline-none transition-[border-color,box-shadow] hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:bg-slate-900 dark:focus-visible:ring-offset-slate-950 ${auto ? 'border-sky-100 hover:border-sky-300 dark:border-slate-800 dark:hover:border-sky-700' : 'border-violet-100 hover:border-violet-300 dark:border-slate-800 dark:hover:border-violet-700'}`}
        >
            <div
                aria-hidden="true"
                className={`absolute left-5 right-5 top-0 h-0.5 rounded-b-full ${auto ? 'bg-gradient-to-r from-sky-400 via-blue-500 to-sky-100 dark:to-sky-950' : 'bg-gradient-to-r from-violet-400 via-purple-400 to-violet-100 dark:to-violet-950'}`}
            />
            <div className="mb-4 flex items-center gap-2.5">
                <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${auto ? 'bg-sky-50 text-brand-500 dark:bg-sky-500/10 dark:text-sky-400' : 'bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400'}`}
                >
                    <FileTextIcon aria-hidden="true" className="size-[18px]" />
                </span>
                <span
                    className={`text-[10px] font-bold uppercase tracking-[0.12em] ${auto ? 'text-brand-500 dark:text-sky-400' : 'text-violet-500 dark:text-violet-400'}`}
                >
                    {auto ? 'Auto paper' : 'Manual paper'}
                </span>
            </div>
            <h3
                title={paper.name}
                className="line-clamp-2 break-words text-[15px] font-bold leading-6 text-[#112650] dark:text-slate-100"
            >
                {paper.name}
            </h3>
            <p className="mt-1.5 break-words text-xs leading-5 text-slate-500 dark:text-slate-400">
                {[paper.subject_name, paper.class_names]
                    .filter(Boolean)
                    .join(' · ')}
            </p>
            <div className="mb-4 mt-5 flex items-baseline gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                    <strong className="mr-1 text-base font-semibold tabular-nums text-[#112650] dark:text-slate-200">
                        {paper.question_count}
                    </strong>{' '}
                    questions
                </span>
                <span
                    className="h-4 w-px self-center bg-slate-200 dark:bg-slate-700"
                    aria-hidden="true"
                />
                <span>
                    <strong className="mr-1 text-base font-semibold tabular-nums text-[#112650] dark:text-slate-200">
                        {paper.total_marks}
                    </strong>{' '}
                    marks
                </span>
            </div>
            {paper.author_name && (
                <p
                    title={paper.author_name}
                    className="mb-3 truncate text-[10px] text-slate-400 dark:text-slate-500"
                >
                    By {paper.author_name}
                </p>
            )}
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {formatDate(paper.updated_at)}
                </span>
                <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${auto ? 'text-brand-600 dark:text-sky-400' : 'text-violet-600 dark:text-violet-400'}`}
                >
                    Open paper
                    <ArrowRightIcon aria-hidden="true" className="size-3.5" />
                </span>
            </div>
        </Link>
    );
}

function Sprinkles({ className }: { className: string }) {
    return (
        <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 1000 300"
            preserveAspectRatio="xMidYMid slice"
            className={className}
            fill="none"
        >
            <path
                d="M774 27v12m-6-6h12M918 167v10m-5-5h10M652 234v10m-5-5h10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="m861 38 2 7 7 2-7 2-2 7-2-7-7-2 7-2zM957 234l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"
                fill="currentColor"
            />
            <circle cx="697" cy="75" r="3" fill="currentColor" />
            <circle cx="978" cy="91" r="3" fill="currentColor" />
            <circle cx="800" cy="251" r="2" fill="currentColor" />
            <circle
                cx="578"
                cy="29"
                r="4"
                stroke="currentColor"
                strokeWidth="1.5"
            />
            <path
                d="m721 168 5-5m-46 116 6-2M928 26l4 5"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
            />
            <path
                d="M970 290c-31-11-39-42-22-49 16-8 28 16 11 27"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    );
}

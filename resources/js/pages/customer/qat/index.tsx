import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowUpRightIcon,
    BookmarkIcon,
    CalendarIcon,
    ClipboardListIcon,
    FileTextIcon,
    GraduationCapIcon,
    PenLineIcon,
    SparklesIcon,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
    Badge,
    Button,
    Card,
    cardVariants,
    EmptyState,
    PageHeader,
    Pagination,
} from '@/components/tm';
import type { PageMeta } from '@/components/tm';
import { cn } from '@/lib/utils';

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
    return new Date(value).toLocaleDateString(undefined, {
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

    function navigate(page = 1, q = filters.q) {
        router.get(
            '/qa-tests',
            { q: q || undefined, page: page > 1 ? page : undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function submitSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        navigate(1, search.trim());
    }

    return (
        <div className="w-full space-y-6">
            <Head title="QAT Tests" />
            <PageHeader
                title="QAT Tests"
                meta={`${papers.total} saved ${papers.total === 1 ? 'paper' : 'papers'}`}
            />

            <div className="grid gap-4 md:grid-cols-2">
                <Link
                    href="/qa-tests/create/auto"
                    className={cn(
                        cardVariants({ padding: 'lg', interactive: true }),
                        'group flex flex-col gap-4 outline-none transition-colors hover:border-brand-300 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:hover:border-brand-500/50 dark:focus-visible:ring-offset-slate-950',
                    )}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex size-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                            <SparklesIcon className="size-5" />
                        </div>
                        <ArrowUpRightIcon className="size-5 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600 dark:group-hover:text-brand-400" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            Auto paper generation
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Select QAT classes, then use the configured paper
                            format to choose questions.
                        </p>
                    </div>
                </Link>
                <Link
                    href="/qa-tests/create/manual"
                    className={cn(
                        cardVariants({ padding: 'lg', interactive: true }),
                        'group flex flex-col gap-4 outline-none transition-colors hover:border-brand-300 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:hover:border-brand-500/50 dark:focus-visible:ring-offset-slate-950',
                    )}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex size-11 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <PenLineIcon className="size-5" />
                        </div>
                        <ArrowUpRightIcon className="size-5 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600 dark:group-hover:text-brand-400" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            Manual paper generation
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Select QAT classes and choose the questions for your
                            paper yourself.
                        </p>
                    </div>
                </Link>
            </div>

            <section className="space-y-4" aria-labelledby="saved-qat-papers">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2
                            id="saved-qat-papers"
                            className="text-base font-semibold text-slate-900 dark:text-slate-100"
                        >
                            Saved papers
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            QAT papers saved by your school
                        </p>
                    </div>
                    <form onSubmit={submitSearch} className="flex gap-2">
                        <input
                            aria-label="Search saved QAT papers"
                            className="h-9 w-56 max-w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900"
                            placeholder="Search papers"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                        <Button type="submit">Search</Button>
                    </form>
                </div>

                {papers.data.length === 0 ? (
                    <EmptyState
                        icon={ClipboardListIcon}
                        title={
                            filters.q
                                ? 'No matching QAT papers'
                                : 'No QAT papers yet'
                        }
                        hint={
                            filters.q
                                ? 'Try a different paper name, class, or subject.'
                                : 'Generated QAT papers will appear here.'
                        }
                    />
                ) : (
                    <div className="space-y-3">
                        {papers.data.map((paper) => (
                            <Card
                                key={paper.id}
                                className="flex flex-wrap items-center justify-between gap-4"
                            >
                                <div className="flex min-w-0 items-center gap-3.5">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                        <BookmarkIcon className="size-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                {paper.name}
                                            </p>
                                            <Badge tone="neutral">
                                                {paper.mode === 'auto'
                                                    ? 'Auto'
                                                    : 'Manual'}
                                            </Badge>
                                            {paper.author_name && (
                                                <Badge tone="neutral">
                                                    {paper.author_name}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                            {paper.subject_name && (
                                                <span className="flex items-center gap-1">
                                                    <FileTextIcon className="size-3.5" />
                                                    {paper.subject_name}
                                                </span>
                                            )}
                                            {paper.class_names && (
                                                <span className="flex items-center gap-1">
                                                    <GraduationCapIcon className="size-3.5" />
                                                    {paper.class_names}
                                                </span>
                                            )}
                                            <span>
                                                {paper.question_count} questions
                                            </span>
                                            {paper.total_marks > 0 && (
                                                <Badge tone="neutral">
                                                    {paper.total_marks} marks
                                                </Badge>
                                            )}
                                            <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                                                <CalendarIcon className="size-3.5" />
                                                {formatDate(paper.updated_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
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

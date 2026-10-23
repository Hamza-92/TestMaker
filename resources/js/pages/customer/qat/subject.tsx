import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    BookOpenIcon,
    ClipboardCheckIcon,
    SparklesIcon,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
    Badge,
    Button,
    Card,
    Checkbox,
    PageHeader,
    Pagination,
} from '@/components/tm';
import type { PageMeta } from '@/components/tm';

type Subject = {
    id: number;
    academic_year: string;
    class_name: string;
    subject_name: string;
};
type Chapter = {
    id: number;
    name: string;
    chapter_number: number | null;
    months: number[];
    question_count: number;
};
type Question = {
    id: number;
    chapter_id: number;
    chapter_name: string;
    topic_name: string | null;
    type_name: string;
    summary: string;
    preview_items: string[];
    preview_options: string[];
};
type Option = { id: number; name: string };
type Filters = {
    month?: number | string;
    chapter?: number | string;
    type?: number | string;
    q?: string;
};

const selectClass =
    'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';

function monthName(month: number): string {
    return new Intl.DateTimeFormat('en', { month: 'long' }).format(
        new Date(2026, month - 1, 1),
    );
}

export default function QatSubject({
    subject,
    chapters,
    months,
    types,
    typeCounts,
    questions,
    filters,
    availableCount,
}: {
    subject: Subject;
    chapters: Chapter[];
    months: number[];
    types: Option[];
    typeCounts: Record<string, number>;
    questions: PageMeta & { data: Question[] };
    filters: Filters;
    availableCount: number;
}) {
    const [mode, setMode] = useState<'manual' | 'auto'>('manual');
    const [selected, setSelected] = useState<number[]>([]);
    const [search, setSearch] = useState(filters.q ?? '');
    const base = `/qat-tests/subjects/${subject.id}`;

    function navigate(next: Filters, page = 1) {
        router.get(
            base,
            {
                month: next.month || undefined,
                chapter: next.chapter || undefined,
                type: next.type || undefined,
                q: next.q || undefined,
                page,
            },
            { preserveState: true, preserveScroll: true },
        );
    }

    function toggleQuestion(id: number) {
        setSelected((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id],
        );
    }

    function changeMonth(value: string) {
        setSelected([]);
        navigate({ month: value, chapter: '', type: '', q: '' });
        setSearch('');
    }

    function submitSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        navigate({ ...filters, q: search.trim() });
    }

    return (
        <div className="w-full space-y-6">
            <Head title={`${subject.subject_name} · QAT Tests`} />
            <Button asChild variant="ghost" size="sm" className="-ml-3">
                <Link href="/qat-tests">
                    <ArrowLeftIcon /> QAT Tests
                </Link>
            </Button>
            <PageHeader
                title={`${subject.class_name} · ${subject.subject_name}`}
                meta={`${subject.academic_year} · ${availableCount} available questions`}
            />

            <Card className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <BookOpenIcon className="size-4 text-brand-600" />
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        QAT syllabus
                    </h2>
                    <Badge tone="info">{subject.academic_year}</Badge>
                </div>
                <div className="max-w-sm">
                    <label
                        htmlFor="qat-month"
                        className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
                    >
                        Preparation month
                    </label>
                    <select
                        id="qat-month"
                        className={selectClass}
                        value={filters.month ?? ''}
                        onChange={(event) => changeMonth(event.target.value)}
                    >
                        <option value="">All months</option>
                        {months.map((month) => (
                            <option key={month} value={month}>
                                {monthName(month)}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {chapters.map((chapter) => (
                        <button
                            key={chapter.id}
                            type="button"
                            onClick={() =>
                                navigate({
                                    ...filters,
                                    chapter:
                                        String(filters.chapter ?? '') ===
                                        String(chapter.id)
                                            ? ''
                                            : chapter.id,
                                })
                            }
                            className={`rounded-lg border p-3 text-left transition-colors ${
                                String(filters.chapter ?? '') ===
                                String(chapter.id)
                                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                                    : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'
                            }`}
                        >
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                                {chapter.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {chapter.months.map(monthName).join(', ') ||
                                    'No month assigned'}{' '}
                                · {chapter.question_count} questions
                            </div>
                        </button>
                    ))}
                </div>
                {!chapters.length && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        No active chapters are available in your access scope.
                    </p>
                )}
            </Card>

            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant={mode === 'manual' ? 'primary' : 'secondary'}
                    onClick={() => setMode('manual')}
                >
                    <ClipboardCheckIcon /> Manual selection
                </Button>
                <Button
                    type="button"
                    variant={mode === 'auto' ? 'primary' : 'secondary'}
                    onClick={() => setMode('auto')}
                >
                    <SparklesIcon /> Automatic selection
                </Button>
            </div>

            {mode === 'auto' ? (
                <Card className="space-y-4">
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                        Question availability
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        These counts use the selected QAT month and your access
                        scope. Automatic paper generation will use the fixed QAT
                        section rules once they are configured.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {types.map((type) => (
                            <div
                                key={type.id}
                                className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                            >
                                <div className="text-sm font-medium">
                                    {type.name}
                                </div>
                                <div className="mt-1 text-2xl font-semibold tabular-nums">
                                    {typeCounts[String(type.id)] ?? 0}
                                </div>
                            </div>
                        ))}
                    </div>
                    {!types.length && (
                        <p className="text-sm text-slate-500">
                            No active questions are available for this month.
                        </p>
                    )}
                </Card>
            ) : (
                <div className="space-y-4">
                    <Card className="flex flex-wrap items-end gap-3">
                        <div className="min-w-48 flex-1">
                            <label
                                htmlFor="qat-type"
                                className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
                            >
                                Question type
                            </label>
                            <select
                                id="qat-type"
                                className={selectClass}
                                value={filters.type ?? ''}
                                onChange={(event) =>
                                    navigate({
                                        ...filters,
                                        type: event.target.value,
                                    })
                                }
                            >
                                <option value="">All types</option>
                                {types.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <form
                            onSubmit={submitSearch}
                            className="flex min-w-56 flex-[2] gap-2"
                        >
                            <input
                                aria-label="Search QAT questions"
                                className={selectClass}
                                placeholder="Search questions"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                            <Button type="submit">Search</Button>
                        </form>
                    </Card>
                    <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-500 dark:text-slate-400">
                            {questions.total} matching · {selected.length}{' '}
                            selected
                        </span>
                        {selected.length > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelected([])}
                            >
                                Clear selection
                            </Button>
                        )}
                    </div>
                    <div className="space-y-2">
                        {questions.data.map((question) => (
                            <Card
                                key={question.id}
                                padding="sm"
                                className="flex items-start gap-3"
                            >
                                <Checkbox
                                    checked={selected.includes(question.id)}
                                    onCheckedChange={() =>
                                        toggleQuestion(question.id)
                                    }
                                    label={`Select question ${question.id}`}
                                    className="mt-1"
                                />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge tone="neutral">
                                            {question.type_name}
                                        </Badge>
                                        <span className="text-xs text-slate-500">
                                            {question.chapter_name}
                                            {question.topic_name
                                                ? ` · ${question.topic_name}`
                                                : ''}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                        {question.summary ||
                                            `Question #${question.id}`}
                                    </p>
                                    {question.preview_items.length > 0 && (
                                        <ol className="list-inside list-decimal space-y-1 text-xs text-slate-600 dark:text-slate-300">
                                            {question.preview_items.map(
                                                (item, index) => (
                                                    <li key={index}>{item}</li>
                                                ),
                                            )}
                                        </ol>
                                    )}
                                    {question.preview_options.length > 0 && (
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                                            {question.preview_options.map(
                                                (option, index) => (
                                                    <span key={index}>
                                                        {String.fromCharCode(
                                                            65 + index,
                                                        )}
                                                        . {option}
                                                    </span>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                        {!questions.data.length && (
                            <Card className="text-sm text-slate-500 dark:text-slate-400">
                                No questions match this QAT scope and filter.
                            </Card>
                        )}
                    </div>
                    <Pagination
                        meta={questions}
                        label="questions"
                        onPageChange={(page) => navigate(filters, page)}
                    />
                    {selected.length > 0 && (
                        <Card className="text-sm text-slate-600 dark:text-slate-300">
                            {selected.length} questions selected in this
                            browsing session. Paper layout and saving will be
                            added with the fixed QAT format.
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}

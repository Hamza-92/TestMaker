import { Head, Link } from '@inertiajs/react';
import { Clock3Icon, EyeIcon, PlusIcon, SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TestRow {
    id: number;
    title: string;
    status: 'draft' | 'published' | 'closed';
    duration_minutes: number;
    question_count: number;
    attempt_count: number;
    creator_name: string | null;
    subject_name: string | null;
    class_name: string | null;
    published_at: string | null;
    updated_at: string | null;
}

const STATUS_STYLE: Record<TestRow['status'], string> = {
    draft: 'border-amber-200 bg-amber-50 text-amber-700',
    published: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    closed: 'border-slate-200 bg-slate-50 text-slate-600',
};

function fmt(date: string | null) {
    if (!date) return '—';

    return new Date(date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function OnlineTestsIndex({
    tests,
    isOwner,
}: {
    tests: TestRow[];
    isOwner: boolean;
}) {
    return (
        <>
            <Head title="Online Tests" />

            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                            Online Tests
                        </h1>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            Create timed MCQ tests and share them with students.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/online-tests/create">
                            <PlusIcon className="size-4" />
                            Create Test
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            Total Tests
                        </p>
                        <p className="mt-2 text-2xl font-semibold">
                            {tests.length}
                        </p>
                    </div>
                    <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            Published
                        </p>
                        <p className="mt-2 text-2xl font-semibold">
                            {
                                tests.filter(
                                    (test) => test.status === 'published',
                                ).length
                            }
                        </p>
                    </div>
                    <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            Student Attempts
                        </p>
                        <p className="mt-2 text-2xl font-semibold">
                            {tests.reduce(
                                (sum, test) => sum + test.attempt_count,
                                0,
                            )}
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    {tests.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                            <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                <SparklesIcon className="size-6 text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                No online tests yet. Create your first draft to
                                get started.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {tests.map((test) => (
                                <div
                                    key={test.id}
                                    className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                                {test.title}
                                            </p>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    STATUS_STYLE[test.status]
                                                }
                                            >
                                                {test.status}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                            {[
                                                test.subject_name,
                                                test.class_name,
                                                isOwner
                                                    ? test.creator_name
                                                    : null,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Clock3Icon className="size-3.5" />
                                                {test.duration_minutes} minutes
                                            </span>
                                            <span>
                                                {test.question_count} questions
                                            </span>
                                            <span>
                                                {test.attempt_count} attempts
                                            </span>
                                            <span>
                                                Updated {fmt(test.updated_at)}
                                            </span>
                                        </div>
                                    </div>

                                    <Button asChild variant="outline">
                                        <Link href={`/online-tests/${test.id}`}>
                                            <EyeIcon className="size-4" />
                                            Open
                                        </Link>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

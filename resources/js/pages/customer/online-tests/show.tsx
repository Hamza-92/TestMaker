import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ArrowRightLeftIcon,
    CopyIcon,
    EditIcon,
    EyeIcon,
    ExternalLinkIcon,
    Link2Icon,
    LockIcon,
    RocketIcon,
    ShieldAlertIcon,
    ShieldCheckIcon,
    ShuffleIcon,
    TimerIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TestQuestion {
    id: number;
    prompt: string;
    option_count: number;
    sort_order: number;
}

interface AttemptRow {
    id: number;
    student_name: string;
    student_class: string;
    roll_number: string;
    status: string;
    score: number;
    total_questions: number;
    focus_loss_count: number;
    started_at: string | null;
    submitted_at: string | null;
}

interface TestData {
    id: number;
    title: string;
    instructions: string | null;
    status: 'draft' | 'published' | 'closed';
    duration_minutes: number;
    timing_mode: 'whole_test' | 'per_question' | 'none';
    question_time_seconds: number | null;
    auto_advance: boolean;
    allow_back_navigation: boolean;
    allow_skip: boolean;
    shuffle_questions: boolean;
    shuffle_options: boolean;
    focus_loss_action: 'allow' | 'warn' | 'submit';
    require_fullscreen: boolean;
    show_result: boolean;
    show_correct_answers: boolean;
    passing_percentage: number;
    available_from: string | null;
    available_until: string | null;
    creator_name: string | null;
    pattern_name: string | null;
    class_name: string | null;
    subject_name: string | null;
    question_count: number;
    attempt_count: number;
    public_link: string | null;
    published_at: string | null;
    closed_at: string | null;
    can_edit: boolean;
}

const STATUS_STYLE: Record<TestData['status'], string> = {
    draft: 'border-amber-200 bg-amber-50 text-amber-700',
    published: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    closed: 'border-slate-200 bg-slate-50 text-slate-600',
};

function fmt(date: string | null) {
    if (!date) {
        return '—';
    }

    return new Date(date).toLocaleString();
}

export default function ShowOnlineTest({
    test,
    questions,
    attempts,
}: {
    test: TestData;
    questions: TestQuestion[];
    attempts: AttemptRow[];
}) {
    const [copied, setCopied] = useState(false);

    async function copyLink() {
        if (!test.public_link) {
            return;
        }

        await navigator.clipboard.writeText(test.public_link);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    }

    function postAction(path: string) {
        router.post(path, {}, { preserveScroll: true });
    }

    return (
        <>
            <Head title={test.title} />

            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <Link
                            href="/online-tests"
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                            <ArrowLeftIcon className="size-4" />
                        </Link>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                                    {test.title}
                                </h1>
                                <Badge
                                    variant="outline"
                                    className={STATUS_STYLE[test.status]}
                                >
                                    {test.status}
                                </Badge>
                            </div>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {[
                                    test.subject_name,
                                    test.class_name,
                                    test.creator_name,
                                ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {test.can_edit && (
                            <Button variant="outline" asChild>
                                <Link href={`/online-tests/${test.id}/edit`}>
                                    <EditIcon className="size-4" />
                                    Edit Draft
                                </Link>
                            </Button>
                        )}
                        {test.status === 'draft' && (
                            <Button
                                onClick={() =>
                                    postAction(
                                        `/online-tests/${test.id}/publish`,
                                    )
                                }
                            >
                                <RocketIcon className="size-4" />
                                Publish
                            </Button>
                        )}
                        {test.status === 'published' && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        postAction(
                                            `/online-tests/${test.id}/unpublish`,
                                        )
                                    }
                                >
                                    <LockIcon className="size-4" />
                                    Back to Draft
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        postAction(
                                            `/online-tests/${test.id}/close`,
                                        )
                                    }
                                >
                                    Close Test
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            Timing
                        </p>
                        <p className="mt-2 text-lg font-semibold">
                            {test.timing_mode === 'whole_test'
                                ? `${test.duration_minutes} min`
                                : test.timing_mode === 'per_question'
                                  ? `${test.question_time_seconds} sec / MCQ`
                                  : 'Untimed'}
                        </p>
                    </div>
                    <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            Questions
                        </p>
                        <p className="mt-2 text-2xl font-semibold">
                            {test.question_count}
                        </p>
                    </div>
                    <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            Attempts
                        </p>
                        <p className="mt-2 text-2xl font-semibold">
                            {test.attempt_count}
                        </p>
                    </div>
                    <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            Published
                        </p>
                        <p className="mt-2 text-sm font-medium">
                            {fmt(test.published_at)}
                        </p>
                    </div>
                </div>

                {test.instructions && (
                    <section className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            Instructions
                        </h2>
                        <p className="mt-2 text-sm whitespace-pre-wrap text-slate-600 dark:text-slate-300">
                            {test.instructions}
                        </p>
                    </section>
                )}

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Test Experience
                    </h2>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                            <TimerIcon className="size-4 text-brand-600" />
                            <p className="mt-2 text-sm font-semibold">
                                {test.auto_advance
                                    ? 'Auto next'
                                    : 'Student confirms next'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {test.allow_back_navigation
                                    ? 'Previous questions allowed'
                                    : 'Forward only'}
                                {test.allow_skip ? ' · Skipping allowed' : ''}
                            </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                            <ShuffleIcon className="size-4 text-brand-600" />
                            <p className="mt-2 text-sm font-semibold">
                                Randomization
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {test.shuffle_questions
                                    ? 'Questions shuffled'
                                    : 'Fixed question order'}{' '}
                                ·{' '}
                                {test.shuffle_options
                                    ? 'Options shuffled'
                                    : 'Fixed options'}
                            </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                            <ShieldCheckIcon className="size-4 text-brand-600" />
                            <p className="mt-2 text-sm font-semibold">
                                {test.focus_loss_action === 'allow'
                                    ? 'Tab switching allowed'
                                    : test.focus_loss_action === 'warn'
                                      ? 'Tab switching recorded'
                                      : 'Tab switch submits'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {test.require_fullscreen
                                    ? 'Fullscreen required'
                                    : 'Fullscreen optional'}
                            </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                            <ArrowRightLeftIcon className="size-4 text-brand-600" />
                            <p className="mt-2 text-sm font-semibold">
                                {test.show_result
                                    ? `Results at ${test.passing_percentage}% pass`
                                    : 'Results hidden'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {test.show_correct_answers
                                    ? 'Answer review visible'
                                    : 'Answer review hidden'}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                Share Link
                            </h2>
                            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                                Publish the test to generate a student link.
                            </p>
                        </div>
                        {test.status === 'published' && (
                            <Button
                                variant="outline"
                                onClick={() =>
                                    postAction(
                                        `/online-tests/${test.id}/regenerate-link`,
                                    )
                                }
                            >
                                <Link2Icon className="size-4" />
                                Regenerate
                            </Button>
                        )}
                    </div>

                    {test.public_link ? (
                        <div className="mt-4 flex flex-col gap-3 md:flex-row">
                            <input
                                readOnly
                                value={test.public_link}
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                            />
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={copyLink}
                                >
                                    <CopyIcon className="size-4" />
                                    {copied ? 'Copied' : 'Copy'}
                                </Button>
                                <Button type="button" asChild>
                                    <a
                                        href={test.public_link}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <ExternalLinkIcon className="size-4" />
                                        Open
                                    </a>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-slate-500">
                            No public link yet.
                        </p>
                    )}
                </section>

                <section className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Questions
                    </h2>
                    <div className="mt-4 space-y-2">
                        {questions.map((question) => (
                            <div
                                key={question.id}
                                className="rounded-lg border p-3 text-sm"
                            >
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                    Q{question.sort_order}. {question.prompt}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {question.option_count} options
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Student Attempts
                    </h2>
                    <div className="mt-4 space-y-2">
                        {attempts.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                No attempts yet.
                            </p>
                        ) : (
                            attempts.map((attempt) => (
                                <div
                                    key={attempt.id}
                                    className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="min-w-0">
                                        <p className="font-medium text-slate-900 dark:text-slate-100">
                                            {attempt.student_name} ·{' '}
                                            {attempt.roll_number}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {attempt.student_class} ·{' '}
                                            {attempt.score}/
                                            {attempt.total_questions} ·{' '}
                                            {attempt.status}
                                        </p>
                                        <div
                                            className={cn(
                                                'mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold',
                                                attempt.focus_loss_count > 0
                                                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30'
                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                                            )}
                                        >
                                            <ShieldAlertIcon className="size-3.5" />
                                            {attempt.focus_loss_count > 0
                                                ? `${attempt.focus_loss_count} tab switch${attempt.focus_loss_count === 1 ? '' : 'es'} recorded`
                                                : 'No tab switches'}
                                        </div>
                                    </div>
                                    <Button asChild variant="outline">
                                        <Link
                                            href={`/online-tests/attempts/${attempt.id}`}
                                        >
                                            <EyeIcon className="size-4" />
                                            View Attempt
                                        </Link>
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </>
    );
}

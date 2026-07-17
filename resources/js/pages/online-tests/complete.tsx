import { Head } from '@inertiajs/react';
import {
    CheckCircle2Icon,
    CircleXIcon,
    Clock3Icon,
    EyeOffIcon,
    FileCheck2Icon,
    MedalIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PublicTestShell, TestBrand } from './test-shell';

interface ReviewItem {
    number: number;
    prompt: string;
    selected_answer: string | null;
    correct_answer: string | null;
    is_correct: boolean;
}

export default function OnlineTestComplete({
    test,
    attempt,
    review,
}: {
    test: {
        title: string;
        show_result: boolean;
        show_correct_answers: boolean;
        passing_percentage: number;
    };
    attempt: {
        student_name: string;
        student_class: string;
        roll_number: string;
        status: string;
        score: number | null;
        total_questions: number | null;
        percentage: number | null;
        passed: boolean | null;
        submitted_at: string | null;
    };
    review: ReviewItem[];
}) {
    return (
        <PublicTestShell>
            <Head title={`Completed · ${test.title}`} />
            <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
                <TestBrand />
                <span className="text-xs font-semibold text-slate-500">
                    Attempt complete
                </span>
            </header>

            <main className="mx-auto max-w-5xl px-4 pt-6 pb-16 sm:px-6 sm:pt-12">
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.06] dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-slate-100 bg-gradient-to-br from-brand-50 to-white px-6 py-9 text-center sm:px-10 dark:border-slate-800 dark:from-brand-950/40 dark:to-slate-900">
                        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                            <FileCheck2Icon className="size-7" />
                        </span>
                        <p className="mt-5 text-xs font-bold tracking-widest text-emerald-600 uppercase">
                            Submitted successfully
                        </p>
                        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
                            {test.title}
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            {attempt.student_name} · {attempt.student_class} ·
                            Roll {attempt.roll_number}
                        </p>
                    </div>

                    {test.show_result && attempt.percentage !== null ? (
                        <div className="grid gap-0 sm:grid-cols-[1fr_1.3fr]">
                            <div className="flex flex-col items-center justify-center border-b border-slate-100 p-8 sm:border-r sm:border-b-0 dark:border-slate-800">
                                <div
                                    className={cn(
                                        'flex size-32 flex-col items-center justify-center rounded-full border-[10px]',
                                        attempt.passed
                                            ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-500/15 dark:bg-emerald-500/10 dark:text-emerald-300'
                                            : 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-500/15 dark:bg-amber-500/10 dark:text-amber-300',
                                    )}
                                >
                                    <span className="text-3xl font-black">
                                        {attempt.percentage}%
                                    </span>
                                    <span className="text-[10px] font-bold uppercase">
                                        Score
                                    </span>
                                </div>
                                <div
                                    className={cn(
                                        'mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold',
                                        attempt.passed
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
                                    )}
                                >
                                    {attempt.passed ? (
                                        <MedalIcon className="size-4" />
                                    ) : (
                                        <CircleXIcon className="size-4" />
                                    )}
                                    {attempt.passed
                                        ? 'Passed'
                                        : 'Needs improvement'}
                                </div>
                            </div>
                            <div className="p-7 sm:p-9">
                                <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                                    Result summary
                                </h2>
                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                                        <p className="text-2xl font-black">
                                            {attempt.score}/
                                            {attempt.total_questions}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Correct answers
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                                        <p className="text-2xl font-black">
                                            {test.passing_percentage}%
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Passing score
                                        </p>
                                    </div>
                                </div>
                                <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500">
                                    <Clock3Icon className="mt-0.5 size-4 shrink-0" />{' '}
                                    Your response has been recorded. You can
                                    close this page safely.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center sm:p-10">
                            <EyeOffIcon className="mx-auto size-7 text-slate-400" />
                            <h2 className="mt-3 text-lg font-bold">
                                Your response has been recorded
                            </h2>
                            <p className="mt-2 text-sm text-slate-500">
                                Your teacher has chosen to release results
                                separately.
                            </p>
                        </div>
                    )}
                </section>

                {review.length > 0 && (
                    <section className="mt-8">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold">Answer review</h2>
                            <span className="text-xs text-slate-500">
                                {
                                    review.filter((item) => item.is_correct)
                                        .length
                                }{' '}
                                correct
                            </span>
                        </div>
                        <div className="space-y-3">
                            {review.map((item) => (
                                <div
                                    key={item.number}
                                    className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                                >
                                    <div className="flex items-start gap-3">
                                        <span
                                            className={cn(
                                                'flex size-8 shrink-0 items-center justify-center rounded-lg',
                                                item.is_correct
                                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'
                                                    : 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
                                            )}
                                        >
                                            {item.is_correct ? (
                                                <CheckCircle2Icon className="size-4" />
                                            ) : (
                                                <CircleXIcon className="size-4" />
                                            )}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm leading-6 font-semibold">
                                                {item.number}. {item.prompt}
                                            </p>
                                            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                                                <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                    Your answer:{' '}
                                                    <strong>
                                                        {item.selected_answer ??
                                                            'Not answered'}
                                                    </strong>
                                                </p>
                                                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                                    Correct answer:{' '}
                                                    <strong>
                                                        {item.correct_answer}
                                                    </strong>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </PublicTestShell>
    );
}

import { Head, Link } from '@inertiajs/react';
import { ArrowLeftIcon, ShieldAlertIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface QuestionReview {
    id: number;
    prompt_en: string | null;
    prompt_ur: string | null;
    selected_option_key: string | null;
    is_correct: boolean | null;
    options: Array<{
        key: string;
        label: string;
        text_en: string | null;
        text_ur: string | null;
        is_selected: boolean;
        is_correct: boolean;
    }>;
}

export default function AttemptShow({
    test,
    attempt,
    questions,
}: {
    test: {
        id: number;
        title: string;
        subject_name: string | null;
        creator_name: string | null;
        focus_loss_action: 'allow' | 'warn' | 'submit';
    };
    attempt: {
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
    };
    questions: QuestionReview[];
}) {
    return (
        <>
            <Head title={`${attempt.student_name} — ${test.title}`} />

            <div className="w-full space-y-6">
                <div className="flex items-start gap-3">
                    <Link
                        href={`/online-tests/${test.id}`}
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                            {attempt.student_name}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {attempt.student_class} · {attempt.roll_number} ·{' '}
                            {attempt.score}/{attempt.total_questions}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_280px]">
                    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{attempt.status}</Badge>
                            <Badge variant="outline">{test.title}</Badge>
                            {test.subject_name && (
                                <Badge variant="outline">
                                    {test.subject_name}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <div
                        className={cn(
                            'rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900',
                            attempt.focus_loss_count > 0
                                ? 'border-amber-200 dark:border-amber-500/30'
                                : 'border-slate-200 dark:border-slate-800',
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <span
                                className={cn(
                                    'flex size-9 items-center justify-center rounded-xl',
                                    attempt.focus_loss_count > 0
                                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                                )}
                            >
                                <ShieldAlertIcon className="size-4" />
                            </span>
                            <div>
                                <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                                    Student Activity
                                </p>
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                    {attempt.focus_loss_count} tab switch
                                    {attempt.focus_loss_count === 1 ? '' : 'es'}
                                </p>
                            </div>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            Policy:{' '}
                            {test.focus_loss_action === 'allow'
                                ? 'allowed'
                                : test.focus_loss_action === 'warn'
                                  ? 'record silently'
                                  : 'auto-submit on switch'}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {questions.map((question, index) => (
                        <section
                            key={question.id}
                            className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                    Question {index + 1}
                                </h2>
                                <Badge
                                    variant="outline"
                                    className={
                                        question.is_correct
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-red-200 bg-red-50 text-red-700'
                                    }
                                >
                                    {question.is_correct ? 'Correct' : 'Wrong'}
                                </Badge>
                            </div>

                            <p className="mt-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                                {question.prompt_en ??
                                    question.prompt_ur ??
                                    'Question'}
                            </p>

                            <div className="mt-4 space-y-2">
                                {question.options.map((option) => (
                                    <div
                                        key={option.key}
                                        className={[
                                            'rounded-lg border p-3 text-sm',
                                            option.is_correct
                                                ? 'border-emerald-200 bg-emerald-50'
                                                : option.is_selected
                                                  ? 'border-red-200 bg-red-50'
                                                  : 'border-slate-200',
                                        ].join(' ')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">
                                                {option.label}.
                                            </span>
                                            <span>
                                                {option.text_en ??
                                                    option.text_ur ??
                                                    'Option'}
                                            </span>
                                            {option.is_selected && (
                                                <Badge variant="outline">
                                                    Selected
                                                </Badge>
                                            )}
                                            {option.is_correct && (
                                                <Badge variant="outline">
                                                    Correct
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </>
    );
}

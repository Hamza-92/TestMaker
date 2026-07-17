import { Head, router } from '@inertiajs/react';
import {
    AlertTriangleIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    CheckIcon,
    Clock3Icon,
    ExpandIcon,
    FileCheck2Icon,
    TimerIcon,
    UserIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { PublicTestShell, TestBrand } from './test-shell';

interface TestData {
    title: string;
    timing_mode: 'whole_test' | 'per_question' | 'none';
    duration_minutes: number;
    question_time_seconds: number | null;
    question_count: number;
    auto_advance: boolean;
    allow_back_navigation: boolean;
    allow_skip: boolean;
    focus_loss_action: 'allow' | 'warn' | 'submit';
    require_fullscreen: boolean;
}
interface AttemptData {
    attempt_token: string;
    student_name: string;
    student_class: string;
    roll_number: string;
    current_index: number;
    furthest_index: number;
    answered_indices: number[];
    selected_option_key: string | null;
    expires_at: string | null;
    question_expires_at: string | null;
}
interface QuestionData {
    id: number;
    number: number;
    prompt_en: string | null;
    prompt_ur: string | null;
    chapter_name: string | null;
    topic_name: string | null;
    options: Array<{
        key: string;
        label: string;
        text_en: string | null;
        text_ur: string | null;
    }>;
}

function secondsLeft(expiresAt: string | null) {
    if (!expiresAt) {
        return null;
    }

    return Math.max(
        0,
        Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000),
    );
}

function formatTimer(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return hours > 0
        ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function OnlineTestAttempt({
    test,
    attempt,
    question,
}: {
    test: TestData;
    attempt: AttemptData;
    question: QuestionData;
}) {
    const timerTarget = attempt.question_expires_at ?? attempt.expires_at;
    const [selection, setSelection] = useState({
        questionId: question.id,
        key: attempt.selected_option_key ?? '',
    });
    const [timerState, setTimerState] = useState(() => ({
        target: timerTarget,
        value: secondsLeft(timerTarget),
    }));
    const [submitting, setSubmitting] = useState(false);
    const [fullscreenError, setFullscreenError] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(
        () =>
            typeof document !== 'undefined' &&
            Boolean(document.fullscreenElement),
    );
    const timeoutSentFor = useRef<number | null>(null);
    const focusReportSent = useRef(false);

    const selectedKey =
        selection.questionId === question.id
            ? selection.key
            : (attempt.selected_option_key ?? '');
    const timeLeft =
        timerState.target === timerTarget
            ? timerState.value
            : secondsLeft(timerTarget);

    useEffect(() => {
        if (!timerTarget) {
            return;
        }

        const interval = window.setInterval(() => {
            const next = secondsLeft(timerTarget);
            setTimerState({ target: timerTarget, value: next });

            if (next !== 0 || timeoutSentFor.current === question.id) {
                return;
            }

            timeoutSentFor.current = question.id;
            window.clearInterval(interval);

            if (test.timing_mode === 'per_question') {
                router.post(
                    `/take-test/attempt/${attempt.attempt_token}/timeout`,
                    { question_id: question.id },
                );
            } else {
                router.post(
                    `/take-test/attempt/${attempt.attempt_token}/submit`,
                );
            }
        }, 500);

        return () => window.clearInterval(interval);
    }, [timerTarget, test.timing_mode, attempt.attempt_token, question.id]);

    useEffect(() => {
        const handleFullscreen = () =>
            setIsFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', handleFullscreen);

        return () =>
            document.removeEventListener('fullscreenchange', handleFullscreen);
    }, []);

    useEffect(() => {
        if (test.focus_loss_action === 'allow') {
            return;
        }

        const handleVisibility = () => {
            if (!document.hidden) {
                focusReportSent.current = false;

                return;
            }

            if (focusReportSent.current) {
                return;
            }

            focusReportSent.current = true;
            router.post(
                `/take-test/attempt/${attempt.attempt_token}/focus-loss`,
                {},
                {
                    preserveState: true,
                    preserveScroll: true,
                },
            );
        };

        document.addEventListener('visibilitychange', handleVisibility);

        return () =>
            document.removeEventListener('visibilitychange', handleVisibility);
    }, [test.focus_loss_action, attempt.attempt_token]);

    function sendAnswer(key: string, direction: 'next' | 'stay' = 'next') {
        if (submitting) {
            return;
        }

        setSubmitting(true);
        router.post(
            `/take-test/attempt/${attempt.attempt_token}/answer`,
            {
                question_id: question.id,
                selected_option_key: key || null,
                direction,
            },
            { onFinish: () => setSubmitting(false) },
        );
    }

    function selectOption(key: string) {
        if (submitting) {
            return;
        }

        setSelection({ questionId: question.id, key });

        if (test.auto_advance) {
            window.setTimeout(() => sendAnswer(key), 240);
        }
    }

    function navigate(index: number) {
        if (submitting || index === attempt.current_index) {
            return;
        }

        router.post(`/take-test/attempt/${attempt.attempt_token}/navigate`, {
            index,
        });
    }

    function submitTest() {
        if (
            window.confirm(
                'Submit your test now? You cannot return after submission.',
            )
        ) {
            router.post(`/take-test/attempt/${attempt.attempt_token}/submit`);
        }
    }

    async function enterFullscreen() {
        try {
            await document.documentElement.requestFullscreen();
            setFullscreenError(false);
        } catch {
            setFullscreenError(true);
        }
    }

    const progress = Math.round((question.number / test.question_count) * 100);
    const timerUrgent =
        timeLeft !== null &&
        timeLeft <= (test.timing_mode === 'per_question' ? 10 : 60);
    const canContinue = Boolean(selectedKey) || test.allow_skip;

    return (
        <PublicTestShell>
            <Head title={`${test.title} · Question ${question.number}`} />

            <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950/80">
                <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
                        <div className="hidden sm:block">
                            <TestBrand />
                        </div>
                        <div className="min-w-0 flex-1 sm:ml-4">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                {test.title}
                            </p>
                            <div className="mt-1 h-1.5 max-w-xl overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div
                                    className="h-full rounded-full bg-brand-600 transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                        {timeLeft !== null && (
                            <div
                                className={cn(
                                    'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 font-mono text-sm font-bold tabular-nums',
                                    timerUrgent
                                        ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
                                        : 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
                                )}
                            >
                                {test.timing_mode === 'per_question' ? (
                                    <TimerIcon className="size-4" />
                                ) : (
                                    <Clock3Icon className="size-4" />
                                )}
                                {formatTimer(timeLeft)}
                            </div>
                        )}
                    </div>
                </header>

                <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:py-8">
                    <section>
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold tracking-wider text-brand-600 uppercase">
                                    Question {question.number} of{' '}
                                    {test.question_count}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {[
                                        question.chapter_name,
                                        question.topic_name,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <UserIcon className="size-3.5" />{' '}
                                {attempt.student_name}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            {question.prompt_en && (
                                <h1 className="text-lg leading-8 font-semibold text-slate-950 sm:text-xl dark:text-white">
                                    {question.prompt_en}
                                </h1>
                            )}
                            {question.prompt_ur && (
                                <p
                                    dir="rtl"
                                    className={cn(
                                        'text-xl leading-10 text-slate-900 dark:text-slate-100',
                                        question.prompt_en &&
                                            'mt-4 border-t border-slate-100 pt-4 dark:border-slate-800',
                                    )}
                                >
                                    {question.prompt_ur}
                                </p>
                            )}

                            <div className="mt-7 grid gap-3">
                                {question.options.map((option) => {
                                    const checked = selectedKey === option.key;

                                    return (
                                        <button
                                            key={option.key}
                                            type="button"
                                            disabled={submitting}
                                            onClick={() =>
                                                selectOption(option.key)
                                            }
                                            className={cn(
                                                'group flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all sm:p-5',
                                                checked
                                                    ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-500/10 dark:border-brand-500 dark:bg-brand-500/10'
                                                    : 'border-slate-200 hover:border-brand-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-brand-500/30 dark:hover:bg-slate-800/50',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'flex size-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold transition-colors',
                                                    checked
                                                        ? 'border-brand-600 bg-brand-600 text-white'
                                                        : 'border-slate-200 bg-slate-50 text-slate-500 group-hover:border-brand-200 group-hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800',
                                                )}
                                            >
                                                {checked ? (
                                                    <CheckIcon
                                                        className="size-4"
                                                        strokeWidth={3}
                                                    />
                                                ) : (
                                                    option.label
                                                )}
                                            </span>
                                            <span className="min-w-0 flex-1 pt-1 text-sm leading-6 font-medium text-slate-800 sm:text-base dark:text-slate-200">
                                                {option.text_en && (
                                                    <span className="block">
                                                        {option.text_en}
                                                    </span>
                                                )}
                                                {option.text_ur && (
                                                    <span
                                                        dir="rtl"
                                                        className={cn(
                                                            'block text-right text-lg leading-8',
                                                            option.text_en &&
                                                                'mt-2 text-slate-600 dark:text-slate-300',
                                                        )}
                                                    >
                                                        {option.text_ur}
                                                    </span>
                                                )}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3">
                            <button
                                type="button"
                                disabled={
                                    !test.allow_back_navigation ||
                                    attempt.current_index === 0 ||
                                    submitting
                                }
                                onClick={() =>
                                    navigate(attempt.current_index - 1)
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:invisible dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                            >
                                <ArrowLeftIcon className="size-4" /> Previous
                            </button>
                            {!test.auto_advance && (
                                <button
                                    type="button"
                                    disabled={!canContinue || submitting}
                                    onClick={() => sendAnswer(selectedKey)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {question.number === test.question_count
                                        ? 'Finish test'
                                        : selectedKey
                                          ? 'Save and continue'
                                          : 'Skip question'}{' '}
                                    <ArrowRightIcon className="size-4" />
                                </button>
                            )}
                        </div>
                    </section>

                    <aside className="hidden lg:block">
                        <div className="sticky top-24 space-y-4">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-bold">
                                        Question map
                                    </h2>
                                    <span className="text-xs text-slate-500">
                                        {attempt.answered_indices.length}/
                                        {test.question_count}
                                    </span>
                                </div>
                                <div className="mt-4 grid grid-cols-5 gap-2">
                                    {Array.from({
                                        length: test.question_count,
                                    }).map((_, index) => {
                                        const current =
                                            index === attempt.current_index;
                                        const answered =
                                            attempt.answered_indices.includes(
                                                index,
                                            );
                                        const reachable =
                                            index <= attempt.furthest_index;

                                        return (
                                            <button
                                                key={index}
                                                type="button"
                                                disabled={
                                                    !test.allow_back_navigation ||
                                                    !reachable ||
                                                    current
                                                }
                                                onClick={() => navigate(index)}
                                                className={cn(
                                                    'flex aspect-square items-center justify-center rounded-lg border text-xs font-bold transition-colors',
                                                    current &&
                                                        'border-brand-600 bg-brand-600 text-white',
                                                    !current &&
                                                        answered &&
                                                        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
                                                    !current &&
                                                        !answered &&
                                                        reachable &&
                                                        'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                                                    !reachable &&
                                                        'border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-700',
                                                )}
                                            >
                                                {index + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                                    <FileCheck2Icon className="size-4 text-brand-600" />{' '}
                                    Attempt in progress
                                </div>
                                <p className="mt-2 leading-5">
                                    Roll no. {attempt.roll_number} ·{' '}
                                    {attempt.student_class}
                                </p>
                                <button
                                    type="button"
                                    onClick={submitTest}
                                    className="mt-4 w-full rounded-lg border border-rose-200 px-3 py-2 font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300"
                                >
                                    Submit test now
                                </button>
                            </div>
                        </div>
                    </aside>
                </main>
            </div>

            {test.require_fullscreen && !isFullscreen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl dark:bg-slate-900">
                        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                            <ExpandIcon className="size-6" />
                        </span>
                        <h2 className="mt-4 text-xl font-bold">
                            Fullscreen required
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Return to fullscreen to continue this test. Exiting
                            fullscreen may also be recorded by your teacher.
                        </p>
                        <button
                            type="button"
                            onClick={enterFullscreen}
                            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700"
                        >
                            <ExpandIcon className="size-4" /> Enter fullscreen
                        </button>
                        {fullscreenError && (
                            <p className="mt-3 text-xs text-amber-600">
                                <AlertTriangleIcon className="mr-1 inline size-3.5" />
                                Your browser declined fullscreen. Try again.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </PublicTestShell>
    );
}

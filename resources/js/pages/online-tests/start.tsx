import { Head, useForm } from '@inertiajs/react';
import {
    ArrowRightIcon,
    CalendarClockIcon,
    CheckCircle2Icon,
    Clock3Icon,
    FileTextIcon,
    HashIcon,
    LockKeyholeIcon,
    ShieldAlertIcon,
    TimerIcon,
    UserIcon,
    UsersIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PublicTestShell, TestBrand } from './test-shell';

interface TestSummary {
    title: string;
    instructions: string | null;
    timing_mode: 'whole_test' | 'per_question' | 'none';
    duration_minutes: number;
    question_time_seconds: number | null;
    question_count: number;
    allow_back_navigation: boolean;
    allow_skip: boolean;
    shuffle_questions: boolean;
    focus_loss_action: 'allow' | 'warn' | 'submit';
    require_fullscreen: boolean;
}

export default function OnlineTestStart({
    test,
    availability,
    shareToken,
}: {
    test: TestSummary;
    availability: {
        status: 'open' | 'upcoming' | 'closed';
        message: string | null;
    };
    shareToken: string;
}) {
    const { data, setData, post, processing, errors } = useForm({
        student_name: '',
        student_class: '',
        roll_number: '',
    });

    const timing =
        test.timing_mode === 'whole_test'
            ? `${test.duration_minutes} minutes total`
            : test.timing_mode === 'per_question'
              ? `${test.question_time_seconds} seconds per question`
              : 'No countdown timer';
    const testError = (errors as Record<string, string | undefined>).test;

    async function submit(event: React.FormEvent) {
        event.preventDefault();

        if (
            test.require_fullscreen &&
            document.fullscreenEnabled &&
            !document.fullscreenElement
        ) {
            try {
                await document.documentElement.requestFullscreen();
            } catch {
                // The attempt page offers fullscreen again if the browser declines here.
            }
        }

        post(`/take-test/${shareToken}/start`);
    }

    return (
        <PublicTestShell>
            <Head title={test.title} />
            <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
                <TestBrand />
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                    <LockKeyholeIcon className="size-3.5 text-brand-600" />{' '}
                    Secure test link
                </span>
            </header>

            <main className="mx-auto grid max-w-6xl gap-8 px-4 pt-5 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:items-start lg:pt-12">
                <section className="pt-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                        <FileTextIcon className="size-3.5" /> Online assessment
                    </span>
                    <h1 className="mt-5 max-w-2xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
                        {test.title}
                    </h1>
                    {test.instructions && (
                        <p className="mt-4 max-w-2xl text-sm leading-7 whitespace-pre-line text-slate-600 dark:text-slate-300">
                            {test.instructions}
                        </p>
                    )}

                    <div className="mt-7 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                            <FileTextIcon className="size-5 text-brand-600" />
                            <p className="mt-3 text-xl font-bold">
                                {test.question_count}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                                MCQ questions
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                            {test.timing_mode === 'per_question' ? (
                                <TimerIcon className="size-5 text-brand-600" />
                            ) : (
                                <Clock3Icon className="size-5 text-brand-600" />
                            )}
                            <p className="mt-3 text-sm font-bold">{timing}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Timing
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                            <ShieldAlertIcon className="size-5 text-brand-600" />
                            <p className="mt-3 text-sm font-bold">
                                {test.focus_loss_action === 'allow'
                                    ? 'Standard'
                                    : 'Monitored'}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Test mode
                            </p>
                        </div>
                    </div>

                    <div className="mt-7 rounded-2xl border border-slate-200 bg-white/70 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                        <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                            Before you begin
                        </p>
                        <ul className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 dark:text-slate-300">
                            <li className="flex gap-2.5">
                                <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                                {test.allow_back_navigation
                                    ? 'You may revisit reached questions.'
                                    : 'Questions move forward only.'}
                            </li>
                            <li className="flex gap-2.5">
                                <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                                {test.allow_skip
                                    ? 'Unanswered questions may be skipped.'
                                    : 'Choose an answer before continuing.'}
                            </li>
                            {test.shuffle_questions && (
                                <li className="flex gap-2.5">
                                    <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                                    Question order is randomized.
                                </li>
                            )}
                            {test.require_fullscreen && (
                                <li className="flex gap-2.5">
                                    <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                                    Fullscreen is required during the test.
                                </li>
                            )}
                            {test.focus_loss_action === 'warn' && (
                                <li className="flex gap-2.5">
                                    <ShieldAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
                                    Leaving this tab is recorded.
                                </li>
                            )}
                            {test.focus_loss_action === 'submit' && (
                                <li className="flex gap-2.5">
                                    <ShieldAlertIcon className="mt-0.5 size-4 shrink-0 text-rose-500" />
                                    Leaving this tab submits the test.
                                </li>
                            )}
                        </ul>
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/[0.06] sm:p-7 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                            Student details
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Your information must match the class record.
                        </p>
                    </div>

                    {availability.status !== 'open' ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
                            <CalendarClockIcon className="mx-auto size-7 text-amber-600" />
                            <p className="mt-3 text-sm font-semibold text-amber-900 dark:text-amber-200">
                                {availability.message}
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="space-y-4">
                            {testError && (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                                    {testError}
                                </div>
                            )}
                            <div>
                                <Label htmlFor="student_name">Full name</Label>
                                <div className="relative mt-1.5">
                                    <UserIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        id="student_name"
                                        autoComplete="name"
                                        value={data.student_name}
                                        onChange={(event) =>
                                            setData(
                                                'student_name',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Enter your full name"
                                        className="h-11 pl-9"
                                    />
                                </div>
                                {errors.student_name && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {errors.student_name}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="student_class">
                                    Class / section
                                </Label>
                                <div className="relative mt-1.5">
                                    <UsersIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        id="student_class"
                                        value={data.student_class}
                                        onChange={(event) =>
                                            setData(
                                                'student_class',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="e.g. 10-A"
                                        className="h-11 pl-9"
                                    />
                                </div>
                                {errors.student_class && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {errors.student_class}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="roll_number">Roll number</Label>
                                <div className="relative mt-1.5">
                                    <HashIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        id="roll_number"
                                        value={data.roll_number}
                                        onChange={(event) =>
                                            setData(
                                                'roll_number',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Enter your roll number"
                                        className="h-11 pl-9"
                                    />
                                </div>
                                {errors.roll_number && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {errors.roll_number}
                                    </p>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={processing}
                                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:opacity-60"
                            >
                                {processing ? 'Starting test...' : 'Start test'}{' '}
                                <ArrowRightIcon className="size-4" />
                            </button>
                            <p className="text-center text-[11px] leading-5 text-slate-400">
                                Your attempt begins immediately after you press
                                Start test.
                            </p>
                        </form>
                    )}
                </section>
            </main>
        </PublicTestShell>
    );
}

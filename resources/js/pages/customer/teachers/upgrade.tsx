import { Head } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CheckCircle2Icon,
    CrownIcon,
    HeadsetIcon,
    MailIcon,
    PhoneIcon,
    SparklesIcon,
    UsersIcon,
} from 'lucide-react';
import { Link } from '@inertiajs/react';

interface Support {
    email: string | null;
    phone: string | null;
}

interface Props {
    reason: 'no_subscription' | 'plan_excludes_teachers';
    planName: string | null;
    accountType: 'trial' | 'paid' | null;
    expiresAt: string | null;
    features: string[];
    support: Support;
}

function formatDate(iso: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function TeachersUpgrade({
    reason,
    planName,
    accountType,
    expiresAt,
    features,
    support,
}: Props) {
    const isTrial = accountType === 'trial';
    const heading =
        reason === 'no_subscription'
            ? 'Activate a plan to add teachers'
            : 'Teacher management is not on your plan';
    const subheading =
        reason === 'no_subscription'
            ? "You don't have an active subscription yet. Once you're on a plan that includes teachers, this page is where you'll invite and manage them."
            : `Your current plan${planName ? ` (${planName})` : ''} doesn't include teacher accounts. Upgrade to invite teachers, assign them subjects, and control what they can do.`;

    return (
        <>
            <Head title="Teachers · Upgrade required" />

            <div className="w-full space-y-6">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <UsersIcon className="size-4" />
                    <span>Teachers</span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="relative flex flex-col gap-5 border-b border-slate-200 bg-gradient-to-br from-brand-50 via-white to-white p-6 dark:border-slate-800 dark:from-brand-500/10 dark:via-slate-900 dark:to-slate-900 sm:flex-row sm:items-center sm:gap-6">
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25">
                            <CrownIcon className="size-7" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                                    <SparklesIcon className="size-3" />
                                    Upgrade Required
                                </span>
                                {isTrial && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-800 dark:bg-violet-500/15 dark:text-violet-300">
                                        Trial Account
                                    </span>
                                )}
                                {planName && (
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        Current: {planName}
                                    </span>
                                )}
                                {expiresAt && (
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        Renews {formatDate(expiresAt)}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                                {heading}
                            </h1>
                            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                {subheading}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 p-6 lg:grid-cols-5">
                        <div className="lg:col-span-3">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                What you'll get
                            </p>
                            <ul className="space-y-2.5">
                                {features.map((feature) => (
                                    <li
                                        key={feature}
                                        className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200"
                                    >
                                        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="lg:col-span-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                                <div className="mb-3 flex items-center gap-2">
                                    <div className="flex size-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                                        <HeadsetIcon className="size-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            Talk to us
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            We'll upgrade your plan for you.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {support.email && (
                                        <a
                                            href={`mailto:${support.email}?subject=${encodeURIComponent(
                                                'Upgrade request: teacher management',
                                            )}`}
                                            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
                                        >
                                            <MailIcon className="size-4 text-slate-400" />
                                            <span className="truncate">{support.email}</span>
                                        </a>
                                    )}
                                    {support.phone && (
                                        <a
                                            href={`tel:${support.phone}`}
                                            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
                                        >
                                            <PhoneIcon className="size-4 text-slate-400" />
                                            <span className="truncate">{support.phone}</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col justify-between gap-3 border-t border-slate-200 bg-slate-50/40 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40 sm:flex-row sm:items-center">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            <ArrowLeftIcon className="size-4" />
                            Back to Dashboard
                        </Link>
                        {support.email && (
                            <a
                                href={`mailto:${support.email}?subject=${encodeURIComponent(
                                    'Upgrade request: teacher management',
                                )}`}
                                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
                            >
                                <SparklesIcon className="size-4" />
                                Request Upgrade
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

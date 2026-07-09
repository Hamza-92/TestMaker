import { Head, Link } from '@inertiajs/react';
import { ArrowLeftIcon, LockIcon, SparklesIcon } from 'lucide-react';

interface Action {
    href: string;
    label: string;
}

interface Props {
    title?: string;
    message: string;
    heading?: string;
    primary?: Action | null;
    secondary?: Action | null;
}

export default function Blocked({
    title = 'Feature unavailable',
    heading = 'Not on your plan',
    message,
    primary = { href: '/dashboard', label: 'Back to Dashboard' },
    secondary = null,
}: Props) {
    return (
        <>
            <Head title={title} />

            <div className="mx-auto flex max-w-2xl flex-col items-center py-16 text-center">
                <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                    <LockIcon className="size-7" />
                </div>

                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    {heading}
                </p>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {title}
                </h1>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {message}
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    {primary && (
                        <Link
                            href={primary.href}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            <ArrowLeftIcon className="size-4" />
                            {primary.label}
                        </Link>
                    )}
                    {secondary && (
                        <Link
                            href={secondary.href}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
                        >
                            <SparklesIcon className="size-4" />
                            {secondary.label}
                        </Link>
                    )}
                </div>
            </div>
        </>
    );
}

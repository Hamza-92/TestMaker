import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Clock3 } from 'lucide-react';

type Props = {
    title: string;
    description: string;
};

export default function ComingSoon({ title, description }: Props) {
    return (
        <>
            <Head title={`${title} | Coming soon`} />

            <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center">
                <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-12">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        <Clock3 className="size-7" />
                    </div>
                    <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">Coming soon</p>
                    <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
                    <Link href="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                        <ArrowLeft className="size-4" />
                        Back to dashboard
                    </Link>
                </section>
            </div>
        </>
    );
}




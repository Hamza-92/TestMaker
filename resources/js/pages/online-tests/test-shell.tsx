import { GraduationCapIcon } from 'lucide-react';
import { useEffect } from 'react';

export function TestBrand() {
    return (
        <div className="inline-flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/20">
                <GraduationCapIcon className="size-5" />
            </span>
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                TestMaker
            </span>
        </div>
    );
}

export function PublicTestShell({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        document.body.classList.add('theme-customer');

        return () => document.body.classList.remove('theme-customer');
    }, []);

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top_left,var(--color-brand-100),transparent_48%)] opacity-80 dark:bg-[radial-gradient(circle_at_top_left,var(--color-brand-950),transparent_48%)]" />
            <div className="pointer-events-none absolute top-24 right-[-8rem] size-80 rounded-full border-[48px] border-brand-100/50 dark:border-brand-900/20" />
            <div className="relative">{children}</div>
        </div>
    );
}

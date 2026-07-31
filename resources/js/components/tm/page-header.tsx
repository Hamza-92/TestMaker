import { cn } from '@/lib/utils';

/**
 * Title row for a page.
 *
 * There is deliberately no `description` prop. A subtitle that restates
 * the title is noise; if a page needs context, it belongs in `meta` as a
 * short fact ("12 saved · 3 drafts"), not a sentence.
 */
export function PageHeader({
    title,
    meta,
    actions,
    className,
}: {
    title: string;
    /** Short factual line under the title. Numbers, not prose. */
    meta?: React.ReactNode;
    /** Primary action(s), right-aligned. */
    actions?: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            data-slot="tm-page-header"
            className={cn(
                'flex flex-wrap items-center justify-between gap-3',
                className,
            )}
        >
            <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {title}
                </h1>
                {meta && (
                    <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                        {meta}
                    </p>
                )}
            </div>

            {actions && (
                <div className="flex shrink-0 items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}

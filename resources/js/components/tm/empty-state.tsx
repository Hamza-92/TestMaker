import { cn } from '@/lib/utils';

/**
 * Empty state.
 *
 * `hint` is optional and should stay unused unless it says something the
 * title and the action button cannot. "No papers yet" + a [New Paper]
 * button already explains itself; adding "Generate a paper to see it
 * here" is the kind of line we are cutting everywhere.
 */
export function EmptyState({
    icon: Icon,
    title,
    hint,
    action,
    className,
}: {
    icon: React.ElementType;
    title: string;
    /** Only when it adds information the title and action do not. */
    hint?: string;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            data-slot="tm-empty-state"
            className={cn(
                'flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900',
                className,
            )}
        >
            <div className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <Icon className="size-5" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {title}
            </h3>

            {hint && (
                <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                    {hint}
                </p>
            )}

            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

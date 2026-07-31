import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

/**
 * Bulk-action bar, shown for as long as selection mode is on — including
 * at zero selected, where it is the only affordance for leaving the mode.
 *
 * Sits inline above the list rather than floating over the page, so it
 * never covers a row the user is about to act on and needs no z-index
 * juggling against the sticky header.
 */
export function SelectionBar({
    count,
    onExit,
    selectAll,
    children,
    className,
}: {
    count: number;
    /** Leaves selection mode entirely. */
    onExit: () => void;
    /** Select-all / clear toggle, folded in so the list needs no extra row. */
    selectAll?: {
        total: number;
        allSelected: boolean;
        onToggle: (all: boolean) => void;
    };
    /** Action buttons. Disable them yourself while nothing is selected. */
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            role="region"
            aria-label="Bulk actions"
            className={cn(
                'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 dark:border-brand-500/30 dark:bg-brand-500/10',
                className,
            )}
        >
            <span
                aria-live="polite"
                className="text-[13px] font-semibold text-brand-800 tabular-nums dark:text-brand-200"
            >
                {count} selected
            </span>

            {selectAll && selectAll.total > 0 && (
                <button
                    type="button"
                    onClick={() => selectAll.onToggle(!selectAll.allSelected)}
                    className="cursor-pointer text-[13px] font-medium text-brand-700 underline-offset-2 outline-none hover:underline focus-visible:underline dark:text-brand-300"
                >
                    {selectAll.allSelected
                        ? 'Clear'
                        : `Select all ${selectAll.total}`}
                </button>
            )}

            <span
                aria-hidden="true"
                className="hidden h-4 w-px bg-brand-200 sm:block dark:bg-brand-500/30"
            />

            <div className="flex flex-wrap items-center gap-1.5">
                {children}
            </div>

            <Button
                variant="ghost"
                size="sm"
                onClick={onExit}
                className="ml-auto"
            >
                <XIcon />
                Done
            </Button>
        </div>
    );
}

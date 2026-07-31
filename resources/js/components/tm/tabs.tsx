import { cn } from '@/lib/utils';
import { CONTROL_H } from './input';

export interface TabItem<T extends string> {
    value: T;
    label: string;
    /** Optional count pill. Omit rather than passing 0 if it is not useful. */
    count?: number;
}

/**
 * Segmented control.
 *
 * Sized to CONTROL_H so it lines up with inputs and buttons sitting beside
 * it, and it hugs its labels instead of stretching — a full-width page
 * would otherwise leave two tab labels floating in the middle of a very
 * wide bar.
 */
export function Tabs<T extends string>({
    items,
    value,
    onChange,
    className,
}: {
    items: TabItem<T>[];
    value: T;
    onChange: (value: T) => void;
    className?: string;
}) {
    return (
        <div
            role="tablist"
            data-slot="tm-tabs"
            className={cn(
                'inline-flex w-auto shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900',
                CONTROL_H,
                className,
            )}
        >
            {items.map((item) => {
                const active = item.value === value;

                return (
                    <button
                        key={item.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(item.value)}
                        className={cn(
                            'flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[13px] font-medium whitespace-nowrap transition-colors outline-none',
                            'focus-visible:ring-2 focus-visible:ring-brand-500',
                            active
                                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
                        )}
                    >
                        {item.label}
                        {item.count !== undefined && (
                            <span
                                className={cn(
                                    'rounded px-1.5 text-[11px] font-semibold tabular-nums',
                                    active
                                        ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
                                        : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
                                )}
                            >
                                {item.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

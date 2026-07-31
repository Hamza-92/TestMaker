import { SearchIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Text input.
 *
 * Focus colours are written out rather than read from the `--ring` token:
 * that token is the dark navy used by the superadmin/auth side, so any
 * scaffold input dropped on a customer page focuses in the wrong colour.
 *
 * Height is CONTROL_H so inputs, tabs and buttons always line up.
 */
export const CONTROL_H = 'h-9';

const FIELD = [
    CONTROL_H,
    'w-full min-w-0 rounded-lg border border-slate-200 bg-white text-sm text-slate-900',
    'transition-colors outline-none placeholder:text-slate-400',
    'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
    'dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:ring-brand-400/25',
].join(' ');

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
    return (
        <input
            data-slot="tm-input"
            className={cn(FIELD, 'px-3', className)}
            {...props}
        />
    );
}

/**
 * Search field with a leading icon and a clear button once it has a value.
 * `onValueChange` keeps call sites free of `e.target.value` plumbing.
 */
export function SearchInput({
    value,
    onValueChange,
    className,
    ...props
}: Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
    value: string;
    onValueChange: (value: string) => void;
}) {
    return (
        <div className={cn('relative', className)}>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />

            <input
                type="search"
                data-slot="tm-search"
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                className={cn(
                    FIELD,
                    'pl-9',
                    value ? 'pr-9' : 'pr-3',
                    // Chrome's native clear button would sit next to ours.
                    '[&::-webkit-search-cancel-button]:hidden',
                )}
                {...props}
            />

            {value && (
                <button
                    type="button"
                    onClick={() => onValueChange('')}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                    <XIcon className="size-3.5" />
                </button>
            )}
        </div>
    );
}

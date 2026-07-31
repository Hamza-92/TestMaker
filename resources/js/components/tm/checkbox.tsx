import { CheckIcon, MinusIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Selection checkbox.
 *
 * Renders a real <input type="checkbox"> (sr-only) so it stays keyboard
 * reachable and announces its state, with the visual box drawn alongside.
 *
 * `indeterminate` drives the header "select all" when only some rows on
 * the page are selected.
 */
export function Checkbox({
    checked,
    indeterminate = false,
    onCheckedChange,
    className,
    label,
    ...props
}: Omit<React.ComponentProps<'input'>, 'type' | 'onChange' | 'checked'> & {
    checked: boolean;
    indeterminate?: boolean;
    onCheckedChange: (checked: boolean) => void;
    /** Accessible name; visually hidden. */
    label: string;
}) {
    return (
        <label
            className={cn(
                'relative inline-flex shrink-0 cursor-pointer items-center',
                className,
            )}
        >
            <input
                type="checkbox"
                checked={checked}
                aria-label={label}
                onChange={(e) => onCheckedChange(e.target.checked)}
                className="peer sr-only"
                {...props}
            />

            <span
                aria-hidden="true"
                className={cn(
                    'flex size-4 items-center justify-center rounded border transition-colors',
                    'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-1',
                    checked || indeterminate
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-600 dark:bg-slate-900',
                )}
            >
                {indeterminate ? (
                    <MinusIcon className="size-3" strokeWidth={3} />
                ) : (
                    checked && <CheckIcon className="size-3" strokeWidth={3} />
                )}
            </span>
        </label>
    );
}

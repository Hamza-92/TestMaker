import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Status pill. Solid, flat tints — the colour is the meaning, so a badge
 * should never be given a tone just to add visual interest.
 *
 *   neutral   counts, metadata, "by <author>"
 *   draft     work in progress            (amber)
 *   saved     committed / published       (emerald)
 *   info      informational               (blue)
 *   template  reusable template           (violet)
 *   danger    error / over limit          (rose)
 */
export const badgeVariants = cva(
    'inline-flex shrink-0 items-center gap-1 rounded-full font-medium whitespace-nowrap',
    {
        variants: {
            tone: {
                neutral:
                    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                draft: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
                saved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
                info: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
                template:
                    'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
                danger: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
            },
            size: {
                sm: 'px-2 py-0.5 text-[11px]',
                md: 'px-2.5 py-0.5 text-xs',
            },
        },
        defaultVariants: { tone: 'neutral', size: 'sm' },
    },
);

export function Badge({
    className,
    tone,
    size,
    ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
    return (
        <span
            data-slot="tm-badge"
            className={cn(badgeVariants({ tone, size }), className)}
            {...props}
        />
    );
}

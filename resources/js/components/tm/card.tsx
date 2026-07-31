import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * The one surface primitive. Replaces the hand-rolled
 * `rounded-* + border + bg-white` block that was copied into 21 files.
 *
 *   padding="none"  when the card owns its own internal layout
 *   interactive     adds hover feedback for rows that are clickable
 */
export const cardVariants = cva(
    'rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
    {
        variants: {
            padding: {
                none: '',
                sm: 'px-4 py-3',
                md: 'px-5 py-4',
                lg: 'p-6',
            },
            /**
             * Lifts on hover and casts a soft shadow tinted by --tm-accent
             * (see .tm-lift in app.css). It deliberately does not change the
             * background — that fights with row states like "selected", which
             * own the fill.
             */
            interactive: {
                true: 'tm-lift hover:border-slate-300 dark:hover:border-slate-700',
                false: '',
            },
        },
        defaultVariants: { padding: 'md', interactive: false },
    },
);

export function Card({
    className,
    padding,
    interactive,
    ...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardVariants>) {
    return (
        <div
            data-slot="tm-card"
            className={cn(cardVariants({ padding, interactive }), className)}
            {...props}
        />
    );
}

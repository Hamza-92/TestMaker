import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Solid-fill button. No gradients anywhere by design.
 *
 * Variants map to intent, not to looks:
 *   primary    the one main action on a screen (blue)
 *   secondary  everything else that needs a visible edge
 *   ghost      low-emphasis / icon actions in dense rows
 *   danger     destructive confirmation only
 *
 * Use `asChild` to render an Inertia <Link> with button styling:
 *   <Button asChild><Link href="/x">Go</Link></Button>
 */
export const buttonVariants = cva(
    [
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg',
        'font-semibold whitespace-nowrap transition-colors duration-150 outline-none',
        'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        'focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950',
        'disabled:pointer-events-none disabled:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    ].join(' '),
    {
        variants: {
            variant: {
                primary:
                    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 dark:bg-brand-500 dark:hover:bg-brand-400',
                secondary:
                    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
                ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800',
            },
            size: {
                sm: 'h-8 px-3 text-xs [&_svg]:size-3.5',
                md: 'h-9 px-4 text-sm [&_svg]:size-4',
                'icon-sm': 'size-8 [&_svg]:size-3.5',
                icon: 'size-9 [&_svg]:size-4',
            },
        },
        defaultVariants: { variant: 'secondary', size: 'md' },
    },
);

export function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
    const Comp = asChild ? Slot : 'button';

    return (
        <Comp
            data-slot="tm-button"
            className={cn(buttonVariants({ variant, size }), className)}
            {...props}
        />
    );
}

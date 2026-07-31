import { AlertTriangleIcon, CheckIcon, InfoIcon, XIcon } from 'lucide-react';
import { toast as sonner } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Toasts.
 *
 * Sonner stays underneath as the engine — it handles stacking, timers,
 * pause-on-hover and swipe-to-dismiss, which are not worth rewriting. What
 * it renders is ours, so toasts match Card/Badge instead of looking like a
 * third-party widget.
 *
 * Tones reuse the kit's colour vocabulary: emerald success, rose error,
 * amber warning, blue info. Solid tints, no gradients.
 */
export type ToastTone = 'success' | 'error' | 'warning' | 'info';

const TONES: Record<
    ToastTone,
    { dot: string; rail: string; icon: React.ElementType }
> = {
    success: {
        dot: 'bg-emerald-500 text-white',
        rail: 'bg-emerald-500',
        icon: CheckIcon,
    },
    error: {
        dot: 'bg-rose-500 text-white',
        rail: 'bg-rose-500',
        icon: XIcon,
    },
    warning: {
        dot: 'bg-amber-500 text-white',
        rail: 'bg-amber-500',
        icon: AlertTriangleIcon,
    },
    info: {
        dot: 'bg-brand-600 text-white',
        rail: 'bg-brand-600',
        icon: InfoIcon,
    },
};

export interface ToastOptions {
    description?: string;
    /** Milliseconds. Errors default to longer, since they are read not glanced. */
    duration?: number;
    action?: { label: string; onClick: () => void };
}

function ToastBody({
    tone,
    title,
    description,
    action,
    onDismiss,
}: {
    tone: ToastTone;
    title: string;
    onDismiss: () => void;
} & Pick<ToastOptions, 'description' | 'action'>) {
    const { dot, rail, icon: Icon } = TONES[tone];

    return (
        <div className="relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white py-3.5 pr-3.5 pl-[18px] shadow-[0_8px_30px_-8px_rgb(15_23_42_/_0.25),0_2px_6px_-2px_rgb(15_23_42_/_0.1)] dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-[0_8px_30px_-8px_rgb(0_0_0_/_0.6)]">
            {/* Accent rail carries the tone without a heavy coloured block. */}
            <span
                aria-hidden="true"
                className={cn('absolute inset-y-0 left-0 w-[3px]', rail)}
            />

            <span
                className={cn(
                    'mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full',
                    dot,
                )}
            >
                <Icon className="size-2.5" strokeWidth={3.5} />
            </span>

            <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[13.5px] leading-[1.35] font-semibold tracking-[-0.006em] text-slate-900 dark:text-slate-50">
                    {title}
                </p>

                {description && (
                    <p className="text-[12.5px] leading-[1.45] text-slate-500 dark:text-slate-400">
                        {description}
                    </p>
                )}

                {action && (
                    <button
                        type="button"
                        onClick={() => {
                            action.onClick();
                            onDismiss();
                        }}
                        className="!mt-2.5 cursor-pointer rounded-md bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-700 transition-colors outline-none hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        {action.label}
                    </button>
                )}
            </div>

            <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss"
                className="-mr-1 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-300 transition-colors outline-none hover:bg-slate-100 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
                <XIcon className="size-3.5" strokeWidth={2.5} />
            </button>
        </div>
    );
}

function show(tone: ToastTone, title: string, options: ToastOptions = {}) {
    return sonner.custom(
        (id) => (
            <ToastBody
                tone={tone}
                title={title}
                description={options.description}
                action={options.action}
                onDismiss={() => sonner.dismiss(id)}
            />
        ),
        { duration: options.duration ?? (tone === 'error' ? 6000 : 4000) },
    );
}

export const notify = {
    success: (title: string, options?: ToastOptions) =>
        show('success', title, options),
    error: (title: string, options?: ToastOptions) =>
        show('error', title, options),
    warning: (title: string, options?: ToastOptions) =>
        show('warning', title, options),
    info: (title: string, options?: ToastOptions) =>
        show('info', title, options),
    dismiss: sonner.dismiss,
};

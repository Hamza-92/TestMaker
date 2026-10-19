import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    className?: string;
}

export function Modal({
    open,
    onOpenChange,
    title,
    children,
    footer,
    className,
}: ModalProps) {
    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content
                    className={cn(
                        'fixed left-1/2 top-1/2 z-50 flex max-h-[min(92dvh,760px)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 dark:border-slate-700 dark:bg-slate-900',
                        className,
                    )}
                >
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
                        <DialogPrimitive.Title className="text-base font-semibold text-slate-950 dark:text-white">
                            {title}
                        </DialogPrimitive.Title>
                        <DialogPrimitive.Description className="sr-only">
                            Review the details and available actions.
                        </DialogPrimitive.Description>
                        <DialogPrimitive.Close className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-brand-500 dark:hover:bg-slate-800 dark:hover:text-white">
                            <XIcon className="size-4" aria-hidden="true" />
                            <span className="sr-only">Close</span>
                        </DialogPrimitive.Close>
                    </div>
                    <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
                        {children}
                    </div>
                    {footer && (
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
                            {footer}
                        </div>
                    )}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

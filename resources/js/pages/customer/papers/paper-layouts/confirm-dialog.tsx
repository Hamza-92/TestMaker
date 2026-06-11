import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';
import { useEffect } from 'react';

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'default';
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') onCancel();
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onCancel]);

    return (
        <div
            role="presentation"
            onMouseDown={onCancel}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4"
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="flex flex-col items-center px-6 pt-8 pb-6 text-center">
                    {variant === 'danger' && (
                        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                            <AlertTriangleIcon className="size-6" />
                        </div>
                    )}
                    {variant === 'warning' && (
                        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                            <RefreshCwIcon className="size-6" />
                        </div>
                    )}
                    <h2
                        id="confirm-dialog-title"
                        className="text-base font-semibold text-slate-950 dark:text-slate-100"
                    >
                        {title}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {message}
                    </p>
                </div>
                <div className="flex justify-center gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="cursor-pointer rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={
                            variant === 'danger'
                                ? 'cursor-pointer rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500'
                                : variant === 'warning'
                                  ? 'cursor-pointer rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400'
                                  : 'cursor-pointer rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400'
                        }
                    >
                        {confirmLabel}
                    </button>
                </div>
            </section>
        </div>
    );
}

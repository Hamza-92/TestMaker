import { BookmarkIcon, PrinterIcon, Trash2Icon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface GoBackDialogProps {
    onSaveDraft: () => void;
    onDiscard: () => void;
    onCancel: () => void;
}

export function GoBackDialog({
    onSaveDraft,
    onDiscard,
    onCancel,
}: GoBackDialogProps) {
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
onCancel();
}
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
                aria-labelledby="go-back-dialog-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="px-6 pt-6 pb-4 text-center">
                    <h2
                        id="go-back-dialog-title"
                        className="text-base font-semibold text-slate-950 dark:text-slate-100"
                    >
                        Going back to setup?
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        What would you like to do with this paper?
                    </p>
                </div>

                <div className="space-y-2 px-4 pb-4">
                    <OptionButton
                        icon={<BookmarkIcon className="size-4.5" />}
                        iconClass="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                        label="Save as Draft"
                        description="Continue editing later"
                        onClick={onSaveDraft}
                    />
                    <OptionButton
                        icon={<PrinterIcon className="size-4.5" />}
                        iconClass="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                        label="Print Paper"
                        description="Print before going back"
                        onClick={() => {
                            onCancel();
                            window.print();
                        }}
                    />
                    <OptionButton
                        icon={<Trash2Icon className="size-4.5" />}
                        iconClass="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                        label="Discard Changes"
                        description="Go back without saving"
                        danger
                        onClick={onDiscard}
                    />
                </div>

                <div className="flex justify-center border-t border-slate-200 px-6 py-3 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="cursor-pointer rounded-lg px-5 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                    >
                        Cancel
                    </button>
                </div>
            </section>
        </div>
    );
}

function OptionButton({
    icon,
    iconClass,
    label,
    description,
    onClick,
    danger = false,
}: {
    icon: ReactNode;
    iconClass: string;
    label: string;
    description: string;
    onClick: () => void;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                danger
                    ? 'border-rose-100 bg-rose-50/40 hover:border-rose-200 hover:bg-rose-50 dark:border-rose-900/30 dark:bg-rose-500/5 dark:hover:bg-rose-500/10'
                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700 dark:hover:bg-slate-800/60',
            )}
        >
            <div
                className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                    iconClass,
                )}
            >
                {icon}
            </div>
            <div className="min-w-0">
                <p
                    className={cn(
                        'text-sm font-medium',
                        danger
                            ? 'text-rose-700 dark:text-rose-300'
                            : 'text-slate-800 dark:text-slate-100',
                    )}
                >
                    {label}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {description}
                </p>
            </div>
        </button>
    );
}

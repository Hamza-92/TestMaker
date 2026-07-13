import { LayoutTemplateIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface SaveAsTemplateValues {
    name: string;
    description: string;
}

interface Props {
    defaultName: string;
    isSaving: boolean;
    error: string | null;
    onSave: (values: SaveAsTemplateValues) => void;
    onCancel: () => void;
}

export function SaveAsTemplateModal({
    defaultName,
    isSaving,
    error,
    onSave,
    onCancel,
}: Props) {
    const [values, setValues] = useState<SaveAsTemplateValues>({
        name: defaultName,
        description: '',
    });
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        nameRef.current?.focus();
        nameRef.current?.select();
    }, []);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onCancel();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCancel]);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!values.name.trim() || isSaving) return;
        onSave({ name: values.name.trim(), description: values.description.trim() });
    }

    return (
        <div
            role="presentation"
            onMouseDown={onCancel}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4"
        >
            <section
                role="dialog"
                aria-modal="true"
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        <LayoutTemplateIcon className="size-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            Save as Template
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Reuse this paper's structure and settings without the questions.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-4 px-6 py-5">
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                            Template Name
                        </span>
                        <input
                            ref={nameRef}
                            type="text"
                            value={values.name}
                            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                            disabled={isSaving}
                            className={inputClass}
                        />
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                            Description
                        </span>
                        <input
                            type="text"
                            value={values.description}
                            onChange={(e) =>
                                setValues((v) => ({ ...v, description: e.target.value }))
                            }
                            disabled={isSaving}
                            className={inputClass}
                            placeholder="Short description"
                        />
                    </label>

                    {error && (
                        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
                    )}

                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSaving}
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!values.name.trim() || isSaving}
                            className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving ? 'Saving…' : 'Save Template'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

const inputClass = cn(
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors',
    'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60',
    'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-brand-400',
);

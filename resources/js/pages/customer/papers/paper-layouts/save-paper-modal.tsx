import { BookmarkIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface SavePaperValues {
    name: string;
    section: string;
    examType: string;
    date: string;
    passingMarks: string;
    examMarks: string;
    timeAllowed: string;
}

interface SavePaperModalProps {
    initial: SavePaperValues;
    isUpdate: boolean;
    isSaving: boolean;
    error: string | null;
    onSave: (values: SavePaperValues) => void;
    onCancel: () => void;
}

export function SavePaperModal({
    initial,
    isUpdate,
    isSaving,
    error,
    onSave,
    onCancel,
}: SavePaperModalProps) {
    const [values, setValues] = useState<SavePaperValues>(initial);
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        nameRef.current?.focus();
        nameRef.current?.select();
    }, []);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') onCancel();
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onCancel]);

    function set(field: keyof SavePaperValues) {
        return (e: React.ChangeEvent<HTMLInputElement>) =>
            setValues((prev) => ({ ...prev, [field]: e.target.value }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!values.name.trim() || isSaving) return;
        onSave({ ...values, name: values.name.trim() });
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
                aria-labelledby="save-paper-modal-title"
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
                        <BookmarkIcon className="size-5" />
                    </div>
                    <div>
                        <h2
                            id="save-paper-modal-title"
                            className="text-base font-semibold text-slate-900 dark:text-slate-100"
                        >
                            {isUpdate ? 'Update Paper' : 'Save Paper'}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {isUpdate
                                ? 'Edit paper details and save changes.'
                                : 'Fill in the details below to save this paper.'}
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {/* Paper Name — full width */}
                    <Field label="Paper Name" required>
                        <input
                            ref={nameRef}
                            type="text"
                            value={values.name}
                            onChange={set('name')}
                            placeholder="e.g. Physics Annual Exam 2025"
                            disabled={isSaving}
                            className={inputClass}
                        />
                    </Field>

                    {/* Row: Exam Type | Section Name */}
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Exam Type">
                            <input
                                type="text"
                                value={values.examType}
                                onChange={set('examType')}
                                placeholder="e.g. Annual Exam"
                                disabled={isSaving}
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Section Name">
                            <input
                                type="text"
                                value={values.section}
                                onChange={set('section')}
                                placeholder="e.g. A"
                                disabled={isSaving}
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    {/* Row: Paper Date | Time Allowed */}
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Paper Date">
                            <input
                                type="date"
                                value={values.date}
                                onChange={set('date')}
                                onClick={(e) => {
                                    try {
                                        (e.target as HTMLInputElement).showPicker();
                                    } catch {
                                        // showPicker not supported in this browser
                                    }
                                }}
                                disabled={isSaving}
                                className={cn(inputClass, 'cursor-pointer')}
                            />
                        </Field>
                        <Field label="Time Allowed">
                            <input
                                type="text"
                                value={values.timeAllowed}
                                onChange={set('timeAllowed')}
                                placeholder="e.g. 2 Hours"
                                disabled={isSaving}
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    {/* Row: Exam Marks | Passing Marks */}
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Exam Marks">
                            <input
                                type="number"
                                min={0}
                                value={values.examMarks}
                                onChange={set('examMarks')}
                                placeholder="Total marks"
                                disabled={isSaving}
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Passing Marks">
                            <input
                                type="number"
                                min={0}
                                value={values.passingMarks}
                                onChange={set('passingMarks')}
                                placeholder="Minimum to pass"
                                disabled={isSaving}
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    {error && (
                        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSaving}
                            className="flex-1 cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!values.name.trim() || isSaving}
                            className="flex-1 cursor-pointer rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
                        >
                            {isSaving ? 'Saving…' : isUpdate ? 'Update' : 'Save Paper'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-teal-400';

function Field({
    label,
    required,
    children,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                {label}
                {required && <span className="ml-0.5 text-rose-500">*</span>}
            </label>
            {children}
        </div>
    );
}

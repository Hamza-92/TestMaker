import { XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { GeneratedPaperSection } from '../types';

interface SectionEditModalProps {
    section: GeneratedPaperSection;
    onClose: () => void;
    onSave: (values: {
        title: string;
        requiredQuestions: number;
        marksEach: number;
    }) => void;
}

export function SectionEditModal({
    section,
    onClose,
    onSave,
}: SectionEditModalProps) {
    const [title, setTitle] = useState(section.title);
    const [requiredQuestions, setRequiredQuestions] = useState(
        String(section.requiredQuestions || ''),
    );
    const [marksEach, setMarksEach] = useState(String(section.marksEach || ''));

    useEffect(() => {
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        window.addEventListener('keydown', closeOnEscape);

        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [onClose]);

    return (
        <div
            role="presentation"
            onMouseDown={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="section-edit-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                    <h2
                        id="section-edit-title"
                        className="text-lg font-semibold text-slate-950 dark:text-slate-100"
                    >
                        Edit Section
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close section editor"
                        className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    >
                        <XIcon className="size-4" />
                    </button>
                </div>

                <div className="space-y-4 p-5">
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                            Title
                        </span>
                        <input autoComplete="off"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                                Required
                            </span>
                            <input autoComplete="off"
                                type="number"
                                min="0"
                                max={section.questions.length}
                                value={requiredQuestions}
                                onChange={(event) =>
                                    setRequiredQuestions(
                                        event.target.value.replace(/\D/g, ''),
                                    )
                                }
                                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                                Marks each
                            </span>
                            <input autoComplete="off"
                                type="number"
                                min="0"
                                value={marksEach}
                                onChange={(event) =>
                                    setMarksEach(
                                        event.target.value.replace(/\D/g, ''),
                                    )
                                }
                                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                            />
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            onSave({
                                title,
                                requiredQuestions: Math.min(
                                    Number(requiredQuestions) || 0,
                                    section.questions.length,
                                ),
                                marksEach: Number(marksEach) || 0,
                            })
                        }
                        className="cursor-pointer rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
                    >
                        Update
                    </button>
                </div>
            </section>
        </div>
    );
}

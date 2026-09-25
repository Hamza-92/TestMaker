import { ExternalLinkIcon, KeyboardIcon, XIcon } from 'lucide-react';
import { MathfieldElement } from 'mathlive';
import { useCallback, useEffect, useRef, useState } from 'react';
import 'mathlive/fonts.css';
import 'mathlive/static.css';
import { renderLatex } from './question-html';

const imathEqEditorUrl =
    'https://www.imatheq.com/imatheq/com/imatheq/math-equation-editor-latex-mathml.html';

interface EquationDialogProps {
    initialLatex: string;
    initialDisplayMode: boolean;
    onClose: () => void;
    onSave: (latex: string, displayMode: boolean) => void;
}

export function EquationDialog({
    initialLatex,
    initialDisplayMode,
    onClose,
    onSave,
}: EquationDialogProps) {
    const hostRef = useRef<HTMLDivElement>(null);
    const mathfieldRef = useRef<MathfieldElement | null>(null);
    const [latex, setLatex] = useState(initialLatex);
    const [displayMode, setDisplayMode] = useState(initialDisplayMode);
    const [showImathEqEditor, setShowImathEqEditor] = useState(false);

    const updateLatex = useCallback((nextLatex: string) => {
        setLatex(nextLatex);

        if (mathfieldRef.current && mathfieldRef.current.value !== nextLatex) {
            mathfieldRef.current.value = nextLatex;
        }
    }, []);

    useEffect(() => {
        const host = hostRef.current;

        if (!host) {
            return;
        }

        const mathfield = new MathfieldElement();
        mathfield.value = initialLatex;
        mathfield.className =
            'min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xl shadow-sm outline-none focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950';
        mathfield.mathVirtualKeyboardPolicy = 'manual';
        mathfield.setAttribute('smart-fence', 'on');
        mathfield.addEventListener('input', () => {
            updateLatex(mathfield.value);
        });

        mathfieldRef.current = mathfield;
        host.append(mathfield);
        mathfield.focus();

        return () => {
            mathfield.remove();
            mathfieldRef.current = null;
        };
    }, [initialLatex, updateLatex]);

    function toggleVirtualKeyboard() {
        const keyboard = window.mathVirtualKeyboard;

        mathfieldRef.current?.focus();

        if (!keyboard) {
            return;
        }

        if (keyboard.visible) {
            keyboard.hide({ animate: true });
        } else {
            keyboard.show({ animate: true });
        }
    }

    return (
        <div
            role="presentation"
            onMouseDown={onClose}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4"
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="equation-dialog-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="flex max-h-[min(54rem,calc(100vh-2rem))] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                    <h3
                        id="equation-dialog-title"
                        className="text-base font-semibold text-slate-950 dark:text-slate-100"
                    >
                        Equation
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowImathEqEditor(true)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200"
                        >
                            <ExternalLinkIcon className="size-4" />
                            Extended editor
                        </button>
                        <button
                            type="button"
                            onClick={toggleVirtualKeyboard}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-200"
                        >
                            <KeyboardIcon className="size-4" />
                            Keyboard
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close equation editor"
                            className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                            <XIcon className="size-4" />
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                    <div
                        ref={hostRef}
                        className="overflow-hidden rounded-xl bg-slate-50 p-2 dark:bg-slate-950/60"
                    />

                    <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                            LaTeX
                        </span>
                        <textarea
                            value={latex}
                            onChange={(event) =>
                                updateLatex(event.target.value)
                            }
                            rows={3}
                            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 transition-colors outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                    </label>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                            <input
                                autoComplete="off"
                                type="checkbox"
                                checked={displayMode}
                                onChange={(event) =>
                                    setDisplayMode(event.target.checked)
                                }
                                className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            />
                            Display as separate equation line
                        </label>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                            Preview
                        </p>
                        <div
                            className="paper-rich-text text-slate-950 dark:text-slate-100"
                            dangerouslySetInnerHTML={{
                                __html: renderLatex(latex, displayMode),
                            }}
                        />
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
                        disabled={latex.trim() === ''}
                        onClick={() => onSave(latex, displayMode)}
                        className="cursor-pointer rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                    >
                        Insert Equation
                    </button>
                </div>
            </section>

            {showImathEqEditor && (
                <ImathEqHelperModal
                    onClose={() => setShowImathEqEditor(false)}
                />
            )}
        </div>
    );
}

function ImathEqHelperModal({ onClose }: { onClose: () => void }) {
    return (
        <div
            role="presentation"
            onMouseDown={onClose}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="imatheq-dialog-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="flex max-h-[min(52rem,calc(100vh-2rem))] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                    <div>
                        <h3
                            id="imatheq-dialog-title"
                            className="text-base font-semibold text-slate-950 dark:text-slate-100"
                        >
                            iMathEQ Extended Editor
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Copy the LaTeX from iMathEQ, close this window, and
                            paste it into the LaTeX field.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={imathEqEditorUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200"
                        >
                            <ExternalLinkIcon className="size-4" />
                            New tab
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close iMathEQ editor"
                            className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                            <XIcon className="size-4" />
                        </button>
                    </div>
                </div>

                <iframe
                    title="iMathEQ online equation editor"
                    src={imathEqEditorUrl}
                    className="min-h-[34rem] w-full flex-1 border-0 bg-white"
                />
            </section>
        </div>
    );
}

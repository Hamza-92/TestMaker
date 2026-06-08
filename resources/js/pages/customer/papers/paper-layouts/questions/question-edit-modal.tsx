import { Editor } from '@tinymce/tinymce-react';
import { ExternalLinkIcon, KeyboardIcon, XIcon } from 'lucide-react';
import { MathfieldElement } from 'mathlive';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor as TinyMCEEditor } from 'tinymce';
import 'tinymce/tinymce';
import 'tinymce/icons/default';
import 'tinymce/models/dom';
import 'tinymce/themes/silver';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/autoresize';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/code';
import 'tinymce/plugins/codesample';
import 'tinymce/plugins/directionality';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/help';
import 'tinymce/plugins/image';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/nonbreaking';
import 'tinymce/plugins/pagebreak';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/quickbars';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/table';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/visualchars';
import 'tinymce/plugins/wordcount';
import 'mathlive/fonts.css';
import 'mathlive/static.css';
import type { GeneratedPaperQuestion } from '../types';
import {
    createEquationHtml,
    questionTextToEditorHtml,
    renderLatex,
    sanitizeQuestionHtml,
} from './question-html';

interface QuestionEditModalProps {
    question: GeneratedPaperQuestion;
    onClose: () => void;
    onSave: (value: string) => void;
}

interface EquationDialogState {
    latex: string;
    displayMode: boolean;
}

const imathEqEditorUrl =
    'https://www.imatheq.com/imatheq/com/imatheq/math-equation-editor-latex-mathml.html';

const editorPlugins = [
    'advlist',
    'anchor',
    'autolink',
    'autoresize',
    'charmap',
    'code',
    'codesample',
    'directionality',
    'fullscreen',
    'help',
    'image',
    'link',
    'lists',
    'nonbreaking',
    'pagebreak',
    'preview',
    'quickbars',
    'searchreplace',
    'table',
    'visualblocks',
    'visualchars',
    'wordcount',
];

const editorToolbar = [
    'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough subscript superscript',
    'forecolor backcolor removeformat | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent',
    'link image table charmap codesample | ltr rtl | equation | code preview fullscreen help',
].join(' | ');

export function QuestionEditModal({
    question,
    onClose,
    onSave,
}: QuestionEditModalProps) {
    const editorRef = useRef<TinyMCEEditor | null>(null);
    const editingEquationRef = useRef<HTMLElement | null>(null);
    const [value, setValue] = useState(() =>
        questionTextToEditorHtml(question.text),
    );
    const [equationDialog, setEquationDialog] =
        useState<EquationDialogState | null>(null);

    useEffect(() => {
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === 'Escape' && !equationDialog) {
                onClose();
            }
        }

        window.addEventListener('keydown', closeOnEscape);

        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [equationDialog, onClose]);

    function openEquationDialog(element?: HTMLElement) {
        editingEquationRef.current = element ?? null;
        setEquationDialog({
            latex: element?.dataset.latex ?? '',
            displayMode: element?.dataset.display === 'block',
        });
    }

    function saveEquation(latex: string, displayMode: boolean) {
        const editor = editorRef.current;
        const html = createEquationHtml({ latex, displayMode });

        if (!editor) {
            setEquationDialog(null);

            return;
        }

        const existingElement = editingEquationRef.current;

        editor.undoManager.transact(() => {
            if (existingElement && editor.getBody().contains(existingElement)) {
                existingElement.outerHTML = html;
            } else {
                editor.insertContent(html);
            }
        });

        setValue(sanitizeQuestionHtml(editor.getContent()));
        editingEquationRef.current = null;
        setEquationDialog(null);
    }

    function handleSave() {
        const editorContent = editorRef.current?.getContent() ?? value;

        onSave(sanitizeQuestionHtml(editorContent));
    }

    return (
        <div
            role="presentation"
            onMouseDown={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 print:hidden"
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="question-edit-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="flex max-h-[min(48rem,calc(100vh-2rem))] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                    <h2
                        id="question-edit-title"
                        className="text-lg font-semibold text-slate-950 dark:text-slate-100"
                    >
                        Update Question
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close editor"
                        className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    >
                        <XIcon className="size-4" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    <Editor
                        licenseKey="gpl"
                        initialValue={value}
                        onInit={(_event, editor) => {
                            editorRef.current = editor;
                        }}
                        onEditorChange={(content) =>
                            setValue(sanitizeQuestionHtml(content))
                        }
                        init={{
                            branding: false,
                            browser_spellcheck: true,
                            content_css:
                                '/vendor/tinymce/skins/content/default/content.min.css',
                            content_style: editorContentStyle,
                            contextmenu:
                                'link image table | inserttable cell row column deletetable | equation',
                            extended_valid_elements:
                                'span[class|style|data-latex|data-display|contenteditable|title|aria-hidden|role]',
                            font_family_formats:
                                'Arial=arial,helvetica,sans-serif;Montserrat=Montserrat,arial,sans-serif;Times New Roman=times new roman,times,serif;Georgia=georgia,palatino,serif;Courier New=courier new,courier,monospace;Noto Nastaliq Urdu=Noto Nastaliq Urdu,serif',
                            font_size_formats:
                                '8pt 9pt 10pt 11pt 12pt 14pt 16pt 18pt 20pt 24pt 28pt 32pt 36pt',
                            height: 460,
                            image_advtab: true,
                            menubar: 'edit insert format table tools view help',
                            paste_data_images: true,
                            plugins: editorPlugins,
                            promotion: false,
                            quickbars_insert_toolbar:
                                'quicktable image equation codesample',
                            quickbars_selection_toolbar:
                                'bold italic underline | quicklink h2 h3 blockquote | equation',
                            skin_url: '/vendor/tinymce/skins/ui/oxide',
                            toolbar: editorToolbar,
                            toolbar_mode: 'wrap',
                            valid_children: '+span[span|sup|sub]',
                            setup: (editor) => {
                                editor.ui.registry.addButton('equation', {
                                    text: 'fx',
                                    tooltip: 'Insert equation',
                                    onAction: () => openEquationDialog(),
                                });

                                editor.ui.registry.addMenuItem('equation', {
                                    text: 'Insert equation',
                                    onAction: () => openEquationDialog(),
                                });

                                editor.on('DblClick', (event) => {
                                    const target = event.target as Node;
                                    const element = editor.dom.getParent(
                                        target,
                                        '.tm-equation',
                                    ) as HTMLElement | null;

                                    if (element) {
                                        openEquationDialog(element);
                                    }
                                });
                            },
                        }}
                    />
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
                        onClick={handleSave}
                        className="cursor-pointer rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
                    >
                        Update
                    </button>
                </div>
            </section>

            {equationDialog && (
                <EquationDialog
                    initialLatex={equationDialog.latex}
                    initialDisplayMode={equationDialog.displayMode}
                    onClose={() => {
                        editingEquationRef.current = null;
                        setEquationDialog(null);
                    }}
                    onSave={saveEquation}
                />
            )}
        </div>
    );
}

function EquationDialog({
    initialLatex,
    initialDisplayMode,
    onClose,
    onSave,
}: {
    initialLatex: string;
    initialDisplayMode: boolean;
    onClose: () => void;
    onSave: (latex: string, displayMode: boolean) => void;
}) {
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
            'min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xl shadow-sm outline-none focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950';
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
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 transition-colors hover:border-teal-300 hover:bg-teal-100 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-200"
                        >
                            <ExternalLinkIcon className="size-4" />
                            Extended editor
                        </button>
                        <button
                            type="button"
                            onClick={toggleVirtualKeyboard}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-500/30 dark:hover:bg-teal-500/10 dark:hover:text-teal-200"
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
                            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 transition-colors outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                    </label>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                            <input
                                type="checkbox"
                                checked={displayMode}
                                onChange={(event) =>
                                    setDisplayMode(event.target.checked)
                                }
                                className="size-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
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
                        className="cursor-pointer rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
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
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 transition-colors hover:border-teal-300 hover:bg-teal-100 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-200"
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

const editorContentStyle = `
body {
  color: #0f172a;
  font-family: Montserrat, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.7;
}
p {
  margin: 0 0 0.45rem;
}
table {
  border-collapse: collapse;
  width: 100%;
}
td, th {
  border: 1px solid #cbd5e1;
  padding: 0.35rem 0.5rem;
}
.tm-equation {
  display: inline-block;
  cursor: pointer;
  border-radius: 0.35rem;
  padding: 0 0.2rem;
  background: rgba(20, 184, 166, 0.08);
}
.tm-equation-block {
  display: block;
  margin: 0.5rem 0;
  padding: 0.4rem;
  text-align: center;
}
`;

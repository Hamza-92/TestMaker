import { Editor } from '@tinymce/tinymce-react';
import { XIcon } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
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
import type { GeneratedPaperQuestion } from '../types';
import {
    createEquationHtml,
    questionTextToEditorHtml,
    sanitizeQuestionHtml,
} from './question-html';

interface QuestionEditModalProps {
    question: Pick<GeneratedPaperQuestion, 'text'>;
    title?: string;
    saveLabel?: string;
    onClose: () => void;
    onSave: (value: string) => void;
}

interface EquationDialogState {
    latex: string;
    displayMode: boolean;
}

const EquationDialog = lazy(() =>
    import('./equation-dialog').then((module) => ({
        default: module.EquationDialog,
    })),
);

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
    title = 'Update Question',
    saveLabel = 'Update',
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
                        {title}
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
                        className="cursor-pointer rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400"
                    >
                        {saveLabel}
                    </button>
                </div>
            </section>

            {equationDialog && (
                <Suspense
                    fallback={
                        <div
                            role="status"
                            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4"
                        >
                            <div className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-xl dark:bg-slate-900 dark:text-slate-200">
                                Loading equation editor…
                            </div>
                        </div>
                    }
                >
                    <EquationDialog
                        initialLatex={equationDialog.latex}
                        initialDisplayMode={equationDialog.displayMode}
                        onClose={() => {
                            editingEquationRef.current = null;
                            setEquationDialog(null);
                        }}
                        onSave={saveEquation}
                    />
                </Suspense>
            )}
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

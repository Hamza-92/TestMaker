import { Editor } from '@tinymce/tinymce-react';
import { XIcon } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { Editor as TinyMCEEditor } from 'tinymce';
import { optionLetter } from '../paper-variant';
import type { GeneratedPaperQuestion } from '../types';
import {
    containsUrduScript,
    splitBilingualParts,
} from './bilingual-question-row';
import {
    createEquationHtml,
    escapeHtml,
    questionTextToEditorHtml,
    questionTextToHtml,
    sanitizeQuestionHtml,
} from './question-html';

export interface QuestionOptionEdit {
    optionId: string;
    passageQuestionId?: string;
    text: string;
}

export interface PassageQuestionEdit {
    passageQuestionId: string;
    text: string;
}

interface QuestionEditModalProps {
    question: Pick<GeneratedPaperQuestion, 'text'> &
        Partial<
            Pick<
                GeneratedPaperQuestion,
                'options' | 'optionsOnly' | 'passageQuestions'
            >
        >;
    objectiveMedium?: 'English' | 'Urdu' | 'Both';
    title?: string;
    saveLabel?: string;
    onClose: () => void;
    onSave: (
        value: string,
        optionEdits: QuestionOptionEdit[],
        passageEdits: PassageQuestionEdit[],
    ) => void;
    imageUploadUrl?: string;
}

interface EquationDialogState {
    latex: string;
    displayMode: boolean;
}

type EditRow = {
    label: string;
    text: string;
    optionId?: string;
    passageQuestionId?: string;
};

const objectiveLanguages = ['english', 'urdu'] as const;
type ObjectiveLanguage = (typeof objectiveLanguages)[number];
type ObjectiveCells = Record<ObjectiveLanguage, HTMLElement>;

function objectiveEditorHtml(
    rows: EditRow[],
    medium: QuestionEditModalProps['objectiveMedium'],
): string {
    const body = rows.map((row, index) => {
        const parts = editableLanguages(row.text, medium);
        const label = escapeHtml(row.label);
        const cells = objectiveLanguages.map((language) => {
            const urdu = language === 'urdu';
            const languageLabel = urdu ? 'Urdu' : 'English';

            return `<div class="objective-editor-cell" data-objective-editor-language="${language}" contenteditable="true" dir="${urdu ? 'rtl' : 'ltr'}" lang="${urdu ? 'ur' : 'en'}" aria-label="${label} in ${languageLabel}">${parts[language] || '<p><br></p>'}</div>`;
        });

        return `<div class="objective-editor-row" data-objective-editor-row="${index}"><div class="objective-editor-label">${label}</div>${cells.join('')}</div>`;
    });

    return `<div class="objective-editor" data-objective-editor="true" contenteditable="false" dir="ltr"><div class="objective-editor-row objective-editor-label"><div>English</div><div>Urdu</div></div>${body.join('')}</div>`;
}

function readObjectiveCells(
    html: string,
    count: number,
): ObjectiveCells[] | null {
    const { body } = new DOMParser().parseFromString(html, 'text/html');
    const containers = body.querySelectorAll(
        ':scope > [data-objective-editor]',
    );
    const rows = containers[0]?.querySelectorAll(
        ':scope > [data-objective-editor-row]',
    );

    if (containers.length !== 1 || rows?.length !== count) {
        return null;
    }

    const cells: ObjectiveCells[] = [];

    for (const [index, row] of Array.from(rows).entries()) {
        const english = row.querySelectorAll<HTMLElement>(
            ':scope > [data-objective-editor-language="english"]',
        );
        const urdu = row.querySelectorAll<HTMLElement>(
            ':scope > [data-objective-editor-language="urdu"]',
        );

        if (
            row.getAttribute('data-objective-editor-row') !== String(index) ||
            english.length !== 1 ||
            urdu.length !== 1
        ) {
            return null;
        }

        cells.push({ english: english[0], urdu: urdu[0] });
    }

    return cells;
}

function editedCellHtml(cell: HTMLElement): string {
    return cell.textContent?.trim() ||
        cell.querySelector(
            'img, math, svg, table, hr, video, audio, [data-latex]',
        )
        ? sanitizeQuestionHtml(cell.innerHTML)
        : '';
}

function editableLanguages(
    text: string,
    medium: QuestionEditModalProps['objectiveMedium'],
) {
    const parts = splitBilingualParts(text);

    if (parts) {
        return parts;
    }

    const html = questionTextToHtml(text);
    const labeled =
        /^<div lang="(en|ur)" dir="(?:ltr|rtl)">([\s\S]*)<\/div>$/i.exec(html);

    if (labeled) {
        return labeled[1] === 'ur'
            ? { english: '', urdu: labeled[2] }
            : { english: labeled[2], urdu: '' };
    }

    const isUrdu = medium === 'Urdu' || containsUrduScript(html);

    return isUrdu ? { english: '', urdu: html } : { english: html, urdu: '' };
}

function editedObjectiveText(
    english: string,
    urdu: string,
    medium: QuestionEditModalProps['objectiveMedium'],
): string {
    if (english && urdu) {
        return `<div>${english}</div><div dir="rtl">${urdu}</div>`;
    }

    if (urdu && medium !== 'Urdu' && !containsUrduScript(urdu)) {
        return `<div lang="ur" dir="rtl">${urdu}</div>`;
    }

    if (english && (medium === 'Urdu' || containsUrduScript(english))) {
        return `<div lang="en" dir="ltr">${english}</div>`;
    }

    return english || urdu;
}

let editorLoadPromise: Promise<void> | null = null;

function loadEditor() {
    editorLoadPromise ??= import('tinymce/tinymce')
        .then(async () => {
            await Promise.all([
                import('tinymce/icons/default'),
                import('tinymce/models/dom'),
                import('tinymce/themes/silver'),
                import('tinymce/plugins/advlist'),
                import('tinymce/plugins/anchor'),
                import('tinymce/plugins/autolink'),
                import('tinymce/plugins/autoresize'),
                import('tinymce/plugins/charmap'),
                import('tinymce/plugins/code'),
                import('tinymce/plugins/codesample'),
                import('tinymce/plugins/directionality'),
                import('tinymce/plugins/fullscreen'),
                import('tinymce/plugins/help'),
                import('tinymce/plugins/image'),
                import('tinymce/plugins/link'),
                import('tinymce/plugins/lists'),
                import('tinymce/plugins/nonbreaking'),
                import('tinymce/plugins/pagebreak'),
                import('tinymce/plugins/preview'),
                import('tinymce/plugins/quickbars'),
                import('tinymce/plugins/searchreplace'),
                import('tinymce/plugins/table'),
                import('tinymce/plugins/visualblocks'),
                import('tinymce/plugins/visualchars'),
                import('tinymce/plugins/wordcount'),
            ]);
        })
        .catch((error: unknown) => {
            editorLoadPromise = null;

            throw error;
        });

    return editorLoadPromise;
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
    objectiveMedium,
    title = 'Update Question',
    saveLabel = 'Update',
    onClose,
    onSave,
    imageUploadUrl,
}: QuestionEditModalProps) {
    const editorRef = useRef<TinyMCEEditor | null>(null);
    const initialEditorHtml = useRef('');
    const editingEquation = useRef<HTMLElement | null>(null);
    const [editorReady, setEditorReady] = useState(false);
    const rows = useMemo<EditRow[]>(
        () => [
            ...(question.optionsOnly
                ? []
                : [
                      {
                          label: question.passageQuestions?.length
                              ? 'Passage'
                              : 'Statement',
                          text: question.text,
                      },
                  ]),
            ...(question.options ?? []).map((option, index) => ({
                label: 'Option ' + optionLetter(index),
                text: option.text,
                optionId: option.id,
            })),
            ...(question.passageQuestions ?? []).flatMap((part, index) => [
                {
                    label: `Passage question ${index + 1}`,
                    text: part.text,
                    passageQuestionId: part.id,
                },
                ...part.options.map((option, optionIndex) => ({
                    label: `Passage question ${index + 1} · Option ${optionLetter(optionIndex)}`,
                    text: option.text,
                    optionId: option.id,
                    passageQuestionId: part.id,
                })),
            ]),
        ],
        [question],
    );
    const initialValue = useMemo(
        () =>
            objectiveMedium
                ? objectiveEditorHtml(rows, objectiveMedium)
                : questionTextToEditorHtml(question.text),
        [objectiveMedium, question.text, rows],
    );
    const [equationDialog, setEquationDialog] =
        useState<EquationDialogState | null>(null);
    const [editorStatus, setEditorStatus] = useState<
        'loading' | 'ready' | 'error'
    >('loading');
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        let cancelled = false;

        void loadEditor().then(
            () => {
                if (!cancelled) {
                    setEditorStatus('ready');
                }
            },
            () => {
                if (!cancelled) {
                    setEditorStatus('error');
                }
            },
        );

        return () => {
            cancelled = true;
        };
    }, [loadAttempt]);

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
        editingEquation.current = element ?? null;
        setEquationDialog({
            latex: element?.dataset.latex ?? '',
            displayMode: element?.dataset.display === 'block',
        });
    }

    function saveEquation(latex: string, displayMode: boolean) {
        const editor = editorRef.current;

        if (!editor) {
            setEquationDialog(null);

            return;
        }

        const element = editingEquation.current;
        const html = createEquationHtml({ latex, displayMode });

        editor.undoManager.transact(() => {
            if (element && editor.getBody().contains(element)) {
                element.outerHTML = html;
            } else {
                editor.insertContent(html);
            }
        });

        editingEquation.current = null;
        setEquationDialog(null);
    }

    async function handleSave() {
        const editor = editorRef.current;

        if (!editor) {
            return;
        }

        setSaveError('');
        setSaving(true);

        try {
            if (imageUploadUrl) {
                await editor.uploadImages();
            }

            const html = editor.getContent();

            if (
                imageUploadUrl &&
                /<img\b[^>]*\bsrc=["']data:image\//i.test(html)
            ) {
                throw new Error('An image is still waiting to upload.');
            }

            if (!objectiveMedium) {
                onSave(
                    html === initialEditorHtml.current
                        ? question.text
                        : sanitizeQuestionHtml(html),
                    [],
                    [],
                );

                return;
            }

            const cells = readObjectiveCells(html, rows.length);
            const initialCells = readObjectiveCells(
                initialEditorHtml.current,
                rows.length,
            );

            if (!cells || !initialCells) {
                setSaveError(
                    'The statement and option rows must stay in place. Undo the layout change and try again.',
                );

                return;
            }

            let statement = question.text;
            const optionEdits: QuestionOptionEdit[] = [];
            const passageEdits: PassageQuestionEdit[] = [];

            for (const [index, row] of rows.entries()) {
                const original = editableLanguages(row.text, objectiveMedium);
                const edited = { ...original };
                let changed = false;

                for (const language of objectiveLanguages) {
                    const cell = cells[index][language];

                    if (
                        cell.innerHTML !==
                        initialCells[index][language].innerHTML
                    ) {
                        edited[language] = editedCellHtml(cell);
                        changed = true;
                    }
                }

                if (!changed) {
                    continue;
                }

                const text = editedObjectiveText(
                    edited.english,
                    edited.urdu,
                    objectiveMedium,
                );

                if (row.optionId !== undefined) {
                    optionEdits.push({
                        optionId: row.optionId,
                        passageQuestionId: row.passageQuestionId,
                        text,
                    });
                } else if (row.passageQuestionId !== undefined) {
                    passageEdits.push({
                        passageQuestionId: row.passageQuestionId,
                        text,
                    });
                } else {
                    statement = text;
                }
            }

            onSave(statement, optionEdits, passageEdits);
        } catch {
            setSaveError('An image could not be uploaded. Please retry.');
        } finally {
            setSaving(false);
        }
    }

    function renderEditor() {
        return (
            <Editor
                id="paper-question-editor"
                licenseKey="gpl"
                initialValue={initialValue}
                disabled={saving}
                onInit={(_event, editor) => {
                    editorRef.current = editor;
                    initialEditorHtml.current = editor.getContent();
                    setEditorReady(true);
                }}
                init={{
                    branding: false,
                    browser_spellcheck: true,
                    content_css:
                        '/vendor/tinymce/skins/content/default/content.min.css',
                    content_style: editorContentStyle,
                    editable_root: !objectiveMedium,
                    editable_class: 'objective-editor-cell',
                    contextmenu:
                        'link image table | inserttable cell row column deletetable | equation',
                    extended_valid_elements:
                        'span[class|style|data-latex|data-display|contenteditable|title|aria-hidden|role]',
                    font_family_formats:
                        'Arial=arial,helvetica,sans-serif;Montserrat=Montserrat,arial,sans-serif;Times New Roman=times new roman,times,serif;Georgia=georgia,palatino,serif;Courier New=courier new,courier,monospace;Noto Nastaliq Urdu=Noto Nastaliq Urdu,serif',
                    font_size_formats:
                        '8pt 9pt 10pt 11pt 12pt 14pt 16pt 18pt 20pt 24pt 28pt 32pt 36pt',
                    height: 460,
                    iframe_aria_text: title,
                    image_advtab: true,
                    images_upload_handler: imageUploadUrl
                        ? async (blobInfo) => {
                              const form = new FormData();
                              form.append(
                                  'file',
                                  blobInfo.blob(),
                                  blobInfo.filename(),
                              );
                              const token =
                                  document.querySelector<HTMLMetaElement>(
                                      'meta[name="csrf-token"]',
                                  )?.content ?? '';
                              const response = await fetch(imageUploadUrl, {
                                  method: 'POST',
                                  credentials: 'same-origin',
                                  headers: {
                                      Accept: 'application/json',
                                      'X-CSRF-TOKEN': token,
                                  },
                                  body: form,
                              });

                              if (!response.ok) {
                                  throw new Error('Image upload failed');
                              }

                              const result = (await response.json()) as {
                                  location?: string;
                              };

                              if (!result.location) {
                                  throw new Error(
                                      'Image upload returned no URL',
                                  );
                              }

                              return result.location;
                          }
                        : undefined,
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
        );
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
                    {editorStatus === 'loading' && (
                        <div
                            role="status"
                            className="py-12 text-center text-sm text-slate-500"
                        >
                            Loading question editor…
                        </div>
                    )}
                    {editorStatus === 'error' && (
                        <div
                            role="alert"
                            className="py-12 text-center text-sm text-rose-600"
                        >
                            Question editor could not load.{' '}
                            <button
                                type="button"
                                className="font-semibold underline"
                                onClick={() => {
                                    setEditorStatus('loading');
                                    setLoadAttempt((attempt) => attempt + 1);
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    )}
                    {editorStatus === 'ready' && renderEditor()}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                    {saveError && (
                        <p
                            role="alert"
                            className="mr-auto self-center text-sm text-rose-600"
                        >
                            {saveError}
                        </p>
                    )}
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
                        disabled={
                            saving || !editorReady || Boolean(equationDialog)
                        }
                        className="cursor-pointer rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400"
                    >
                        {saving ? 'Saving…' : saveLabel}
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
                            editingEquation.current = null;
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
.objective-editor-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.25rem 0.75rem;
  margin-bottom: 0.75rem;
}
.objective-editor-row > .objective-editor-label {
  grid-column: 1 / -1;
}
.objective-editor-label {
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}
.objective-editor-cell {
  min-width: 0;
  min-height: 2.5rem;
  padding: 0.4rem 0.55rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.25rem;
  overflow-wrap: anywhere;
  text-align: start;
}
.objective-editor-cell:focus {
  outline: 2px solid #2563eb;
  outline-offset: -1px;
}
.objective-editor-cell > :last-child {
  margin-bottom: 0;
}
.objective-editor-cell img {
  max-width: 100%;
  height: auto;
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

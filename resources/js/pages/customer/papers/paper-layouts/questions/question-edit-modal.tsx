import {
    AlignCenterIcon,
    AlignJustifyIcon,
    AlignLeftIcon,
    AlignRightIcon,
    BoldIcon,
    HighlighterIcon,
    ItalicIcon,
    LinkIcon,
    ListIcon,
    ListOrderedIcon,
    PaletteIcon,
    Redo2Icon,
    RemoveFormattingIcon,
    SubscriptIcon,
    SuperscriptIcon,
    UnderlineIcon,
    Undo2Icon,
    XIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent as ReactClipboardEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { GeneratedPaperQuestion } from '../types';
import {
    escapeHtml,
    questionTextToEditorHtml,
    sanitizeQuestionHtml,
} from './question-html';

interface QuestionEditModalProps {
    question: GeneratedPaperQuestion;
    onClose: () => void;
    onSave: (value: string) => void;
}

const formatOptions = [
    { label: 'Paragraph', value: 'p' },
    { label: 'Heading', value: 'h3' },
    { label: 'Sub heading', value: 'h4' },
];

const fontOptions = ['Arial', 'Montserrat', 'Times New Roman', 'Georgia'];

const sizeOptions = [
    { label: 'Small', value: '2' },
    { label: 'Normal', value: '3' },
    { label: 'Large', value: '4' },
    { label: 'Title', value: '5' },
];

const symbols = ['Ω', 'π', '√', '±', '×', '÷', '≤', '≥', '≠', '²', '³'];

export function QuestionEditModal({
    question,
    onClose,
    onSave,
}: QuestionEditModalProps) {
    const [value, setValue] = useState(question.text);

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
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 print:hidden"
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="question-edit-title"
                onMouseDown={(event) => event.stopPropagation()}
                className="flex max-h-[min(46rem,calc(100vh-2rem))] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
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

                <div className="min-h-0 flex-1 p-5">
                    <RichQuestionEditor
                        key={question.id}
                        initialValue={question.text}
                        onChange={setValue}
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
                        onClick={() => onSave(sanitizeQuestionHtml(value))}
                        className="cursor-pointer rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
                    >
                        Update
                    </button>
                </div>
            </section>
        </div>
    );
}

function RichQuestionEditor({
    initialValue,
    onChange,
}: {
    initialValue: string;
    onChange: (value: string) => void;
}) {
    const editorRef = useRef<HTMLDivElement>(null);
    const selectionRef = useRef<Range | null>(null);
    const initialHtml = useMemo(
        () => questionTextToEditorHtml(initialValue),
        [initialValue],
    );

    const rememberSelection = useCallback(() => {
        const editor = editorRef.current;
        const selection = window.getSelection();

        if (
            !editor ||
            !selection ||
            selection.rangeCount === 0 ||
            !selection.anchorNode ||
            !editor.contains(selection.anchorNode)
        ) {
            return;
        }

        selectionRef.current = selection.getRangeAt(0).cloneRange();
    }, []);

    const restoreSelection = useCallback(() => {
        const selection = window.getSelection();
        const range = selectionRef.current;

        if (!selection || !range) {
            return;
        }

        selection.removeAllRanges();
        selection.addRange(range);
    }, []);

    const emitChange = useCallback(() => {
        const editor = editorRef.current;

        if (!editor) {
            return;
        }

        onChange(sanitizeQuestionHtml(editor.innerHTML));
    }, [onChange]);

    const runCommand = useCallback(
        (command: string, value?: string) => {
            restoreSelection();
            editorRef.current?.focus();
            document.execCommand(command, false, value);
            rememberSelection();
            emitChange();
        },
        [emitChange, rememberSelection, restoreSelection],
    );

    const insertHtml = useCallback(
        (html: string) => {
            runCommand('insertHTML', html);
        },
        [runCommand],
    );

    useEffect(() => {
        const editor = editorRef.current;

        if (!editor) {
            return;
        }

        editor.innerHTML = initialHtml;
        onChange(sanitizeQuestionHtml(editor.innerHTML));
    }, [initialHtml, onChange]);

    function handlePaste(event: ReactClipboardEvent<HTMLDivElement>) {
        event.preventDefault();
        runCommand('insertText', event.clipboardData.getData('text/plain'));
    }

    function insertLink() {
        const rawHref = window.prompt('Enter link URL');

        if (!rawHref) {
            return;
        }

        const href = /^https?:\/\//i.test(rawHref)
            ? rawHref
            : `https://${rawHref}`;

        runCommand('createLink', href);
    }

    function insertFormula() {
        const formula = window.prompt('Enter equation or formula');

        if (!formula) {
            return;
        }

        insertHtml(
            `<span class="paper-formula">${escapeHtml(formula)}</span>&nbsp;`,
        );
    }

    return (
        <div className="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/60">
                <select
                    aria-label="Text format"
                    onChange={(event) =>
                        runCommand('formatBlock', event.target.value)
                    }
                    className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 transition-colors outline-none hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    defaultValue="p"
                >
                    {formatOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <select
                    aria-label="Font family"
                    onChange={(event) =>
                        runCommand('fontName', event.target.value)
                    }
                    className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 transition-colors outline-none hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    defaultValue="Arial"
                >
                    {fontOptions.map((font) => (
                        <option key={font} value={font}>
                            {font}
                        </option>
                    ))}
                </select>

                <select
                    aria-label="Font size"
                    onChange={(event) =>
                        runCommand('fontSize', event.target.value)
                    }
                    className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 transition-colors outline-none hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    defaultValue="3"
                >
                    {sizeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <ToolbarDivider />

                <EditorTool label="Undo" onClick={() => runCommand('undo')}>
                    <Undo2Icon className="size-4" />
                </EditorTool>
                <EditorTool label="Redo" onClick={() => runCommand('redo')}>
                    <Redo2Icon className="size-4" />
                </EditorTool>

                <ToolbarDivider />

                <EditorTool label="Bold" onClick={() => runCommand('bold')}>
                    <BoldIcon className="size-4" />
                </EditorTool>
                <EditorTool label="Italic" onClick={() => runCommand('italic')}>
                    <ItalicIcon className="size-4" />
                </EditorTool>
                <EditorTool
                    label="Underline"
                    onClick={() => runCommand('underline')}
                >
                    <UnderlineIcon className="size-4" />
                </EditorTool>
                <EditorTool
                    label="Superscript"
                    onClick={() => runCommand('superscript')}
                >
                    <SuperscriptIcon className="size-4" />
                </EditorTool>
                <EditorTool
                    label="Subscript"
                    onClick={() => runCommand('subscript')}
                >
                    <SubscriptIcon className="size-4" />
                </EditorTool>

                <ToolbarDivider />

                <EditorTool
                    label="Bulleted list"
                    onClick={() => runCommand('insertUnorderedList')}
                >
                    <ListIcon className="size-4" />
                </EditorTool>
                <EditorTool
                    label="Numbered list"
                    onClick={() => runCommand('insertOrderedList')}
                >
                    <ListOrderedIcon className="size-4" />
                </EditorTool>
                <EditorTool
                    label="Align left"
                    onClick={() => runCommand('justifyLeft')}
                >
                    <AlignLeftIcon className="size-4" />
                </EditorTool>
                <EditorTool
                    label="Align center"
                    onClick={() => runCommand('justifyCenter')}
                >
                    <AlignCenterIcon className="size-4" />
                </EditorTool>
                <EditorTool
                    label="Align right"
                    onClick={() => runCommand('justifyRight')}
                >
                    <AlignRightIcon className="size-4" />
                </EditorTool>
                <EditorTool
                    label="Justify"
                    onClick={() => runCommand('justifyFull')}
                >
                    <AlignJustifyIcon className="size-4" />
                </EditorTool>

                <ToolbarDivider />

                <ColorTool
                    label="Text color"
                    icon={<PaletteIcon className="size-4" />}
                    onChange={(color) => runCommand('foreColor', color)}
                />
                <ColorTool
                    label="Highlight"
                    icon={<HighlighterIcon className="size-4" />}
                    onChange={(color) => runCommand('hiliteColor', color)}
                />
                <EditorTool label="Link" onClick={insertLink}>
                    <LinkIcon className="size-4" />
                </EditorTool>
                <EditorTool label="Formula" onClick={insertFormula}>
                    <span className="text-sm font-bold">fx</span>
                </EditorTool>
                <EditorTool
                    label="Clear formatting"
                    onClick={() => runCommand('removeFormat')}
                >
                    <RemoveFormattingIcon className="size-4" />
                </EditorTool>

                <ToolbarDivider />

                <div className="flex flex-wrap items-center gap-1">
                    {symbols.map((symbol) => (
                        <EditorTool
                            key={symbol}
                            label={`Insert ${symbol}`}
                            compact
                            onClick={() => runCommand('insertText', symbol)}
                        >
                            <span className="text-xs font-bold">{symbol}</span>
                        </EditorTool>
                    ))}
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                <div
                    ref={editorRef}
                    role="textbox"
                    aria-multiline="true"
                    tabIndex={0}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={emitChange}
                    onPaste={handlePaste}
                    onKeyUp={rememberSelection}
                    onMouseUp={rememberSelection}
                    onBlur={rememberSelection}
                    className="rich-question-editor min-h-full bg-white px-5 py-4 text-[15px] leading-7 text-slate-950 outline-none dark:bg-slate-900 dark:text-slate-100"
                />
            </div>
        </div>
    );
}

function ToolbarDivider() {
    return <span className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-800" />;
}

function EditorTool({
    label,
    children,
    compact = false,
    onClick,
}: {
    label: string;
    children: ReactNode;
    compact?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            onMouseDown={(event) => {
                event.preventDefault();
                onClick();
            }}
            className={cn(
                'flex h-8 cursor-pointer items-center justify-center rounded-md border border-transparent text-slate-600 transition-colors hover:border-slate-200 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                compact ? 'w-7' : 'w-8',
            )}
        >
            {children}
        </button>
    );
}

function ColorTool({
    label,
    icon,
    onChange,
}: {
    label: string;
    icon: ReactNode;
    onChange: (color: string) => void;
}) {
    return (
        <label
            title={label}
            aria-label={label}
            className="relative flex size-8 cursor-pointer items-center justify-center rounded-md border border-transparent text-slate-600 transition-colors hover:border-slate-200 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
            {icon}
            <input
                type="color"
                defaultValue={label === 'Highlight' ? '#fff3bf' : '#111827'}
                onChange={(event) => onChange(event.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
            />
        </label>
    );
}

import {
    ArrowDownIcon,
    ArrowUpIcon,
    FilePenLineIcon,
    ListChecksIcon,
    MinusIcon,
    PlusIcon,
    ShuffleIcon,
    SlidersHorizontalIcon,
    Trash2Icon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
    MAX_SECTION_COLUMNS,
    MIN_SECTION_COLUMNS,
} from '../types';
import { ConfirmDialog } from '../confirm-dialog';

interface QuestionHoverActionsProps {
    canSwap: boolean;
    showAnswerLines?: boolean;
    answerLines: number;
    answerLineSpacing?: number;
    onRandom: () => void;
    onPick: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onAnswerLinesChange: (value: number) => void;
    onAnswerLineSpacingChange?: (value: number) => void;
}

const SPACING_MIN = 0;
const SPACING_MAX = 40;
const SPACING_STEP = 2;

export function QuestionHoverActions({
    canSwap,
    showAnswerLines = false,
    answerLines,
    answerLineSpacing,
    onRandom,
    onPick,
    onEdit,
    onDelete,
    onAnswerLinesChange,
    onAnswerLineSpacingChange,
}: QuestionHoverActionsProps) {
    const [confirmAction, setConfirmAction] = useState<
        'delete' | 'random' | null
    >(null);

    return (
        <>
            <div className="pointer-events-none absolute top-1/2 right-2 z-10 flex -translate-y-1/2 items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 opacity-0 shadow-lg shadow-slate-900/10 backdrop-blur transition-opacity group-hover/question:pointer-events-auto group-hover/question:opacity-100 dark:border-slate-700 dark:bg-slate-900/95 print:hidden">
                {canSwap && (
                    <>
                        <ActionButton
                            label="Random change"
                            onClick={() => setConfirmAction('random')}
                        >
                            <ShuffleIcon className="size-4" />
                        </ActionButton>
                        <ActionButton label="Pick question" onClick={onPick}>
                            <ListChecksIcon className="size-4" />
                        </ActionButton>
                    </>
                )}
                <ActionButton
                    label="Delete question"
                    variant="danger"
                    onClick={() => setConfirmAction('delete')}
                >
                    <Trash2Icon className="size-4" />
                </ActionButton>
                <ActionButton
                    label="Edit question"
                    variant="primary"
                    onClick={onEdit}
                >
                    <FilePenLineIcon className="size-4" />
                </ActionButton>
                {showAnswerLines && (
                    <div
                        className="ml-1 flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-1 dark:border-slate-700 dark:bg-slate-950/60"
                        title="Number of answer lines"
                    >
                        <button
                            type="button"
                            onClick={() =>
                                onAnswerLinesChange(Math.max(0, answerLines - 1))
                            }
                            className="flex size-6 cursor-pointer items-center justify-center rounded-md text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-300 dark:hover:bg-rose-500/10"
                            disabled={answerLines <= 0}
                        >
                            <MinusIcon className="size-3.5" />
                        </button>
                        <span className="min-w-6 text-center text-xs font-bold text-slate-700 tabular-nums dark:text-slate-200">
                            {answerLines}
                        </span>
                        <button
                            type="button"
                            onClick={() => onAnswerLinesChange(answerLines + 1)}
                            className="flex size-6 cursor-pointer items-center justify-center rounded-md text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10"
                        >
                            <PlusIcon className="size-3.5" />
                        </button>
                    </div>
                )}
                {showAnswerLines &&
                    answerLines > 0 &&
                    onAnswerLineSpacingChange && (
                        <div
                            className="flex h-8 select-none items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-1 dark:border-slate-700 dark:bg-slate-950/60"
                            title="Spacing between answer lines (px)"
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    onAnswerLineSpacingChange(
                                        Math.max(
                                            SPACING_MIN,
                                            (answerLineSpacing ?? 20) - SPACING_STEP,
                                        ),
                                    )
                                }
                                className="flex size-6 cursor-pointer items-center justify-center rounded-md text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-300 dark:hover:bg-rose-500/10"
                                disabled={(answerLineSpacing ?? 20) <= SPACING_MIN}
                            >
                                <MinusIcon className="size-3.5" />
                            </button>
                            <span className="min-w-10 select-none text-center text-xs font-bold text-slate-700 tabular-nums dark:text-slate-200">
                                {answerLineSpacing ?? 20}
                                <span className="ml-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    px
                                </span>
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    onAnswerLineSpacingChange(
                                        Math.min(
                                            SPACING_MAX,
                                            (answerLineSpacing ?? 20) + SPACING_STEP,
                                        ),
                                    )
                                }
                                className="flex size-6 cursor-pointer items-center justify-center rounded-md text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-brand-300 dark:hover:bg-brand-500/10"
                                disabled={(answerLineSpacing ?? 20) >= SPACING_MAX}
                            >
                                <PlusIcon className="size-3.5" />
                            </button>
                        </div>
                    )}
            </div>

            {confirmAction === 'delete' && (
                <ConfirmDialog
                    variant="danger"
                    title="Remove Question"
                    message="Are you sure you want to remove this question?"
                    confirmLabel="Remove"
                    onConfirm={() => {
                        setConfirmAction(null);
                        onDelete();
                    }}
                    onCancel={() => setConfirmAction(null)}
                />
            )}

            {confirmAction === 'random' && (
                <ConfirmDialog
                    variant="warning"
                    title="Replace Question"
                    message="Are you sure you want to replace this question with a random one?"
                    confirmLabel="Replace"
                    onConfirm={() => {
                        setConfirmAction(null);
                        onRandom();
                    }}
                    onCancel={() => setConfirmAction(null)}
                />
            )}
        </>
    );
}

export function SectionControls({
    canMoveUp,
    canMoveDown,
    canAddRandom,
    columns,
    onMoveUp,
    onMoveDown,
    onShuffleQuestions,
    onAddRandom,
    onAddCustom,
    onEdit,
    onDelete,
    onColumnsChange,
}: {
    canMoveUp: boolean;
    canMoveDown: boolean;
    canAddRandom: boolean;
    columns: number;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onShuffleQuestions: () => void;
    onAddRandom: () => void;
    onAddCustom: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onColumnsChange: (value: number) => void;
}) {
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);

    return (
        <>
            <div className="mt-3 flex justify-center print:hidden">
                <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-sm ring-1 shadow-slate-900/4 ring-white/60 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:ring-slate-700/40">
                    <SectionButton
                        label="Move section up"
                        disabled={!canMoveUp}
                        icon={<ArrowUpIcon className="size-4" />}
                        onClick={onMoveUp}
                    />
                    <SectionButton
                        label="Move section down"
                        disabled={!canMoveDown}
                        icon={<ArrowDownIcon className="size-4" />}
                        onClick={onMoveDown}
                    />
                    <ToolbarDivider />
                    <SectionButton
                        label="Shuffle questions"
                        icon={<ShuffleIcon className="size-4" />}
                        onClick={onShuffleQuestions}
                    />
                    <div className="relative">
                        <SectionButton
                            label="Add question"
                            variant={isAddQuestionOpen ? 'accent' : 'default'}
                            icon={<PlusIcon className="size-4" />}
                            onClick={() =>
                                setIsAddQuestionOpen((open) => !open)
                            }
                        />
                        {isAddQuestionOpen && (
                            <AddQuestionPopover
                                canAddRandom={canAddRandom}
                                onAddCustom={() => {
                                    setIsAddQuestionOpen(false);
                                    onAddCustom();
                                }}
                                onAddRandom={() => {
                                    setIsAddQuestionOpen(false);
                                    onAddRandom();
                                }}
                                onClose={() => setIsAddQuestionOpen(false)}
                            />
                        )}
                    </div>
                    <ToolbarDivider />
                    <SectionButton
                        label="Edit section"
                        variant="primary"
                        icon={<FilePenLineIcon className="size-4" />}
                        onClick={onEdit}
                    />
                    <div className="relative">
                        <SectionButton
                            label="Block settings"
                            variant={isSettingsOpen ? 'primary' : 'default'}
                            icon={<SlidersHorizontalIcon className="size-4" />}
                            onClick={() => setIsSettingsOpen((open) => !open)}
                        />
                        {isSettingsOpen && (
                            <BlockSettingsPopover
                                columns={columns}
                                onChange={onColumnsChange}
                                onClose={() => setIsSettingsOpen(false)}
                            />
                        )}
                    </div>
                    <SectionButton
                        label="Delete section"
                        variant="danger"
                        icon={<Trash2Icon className="size-4" />}
                        onClick={() => setIsConfirmingDelete(true)}
                    />
                </div>
            </div>

            {isConfirmingDelete && (
                <ConfirmDialog
                    variant="danger"
                    title="Delete Section"
                    message="Are you sure you want to delete this section?"
                    confirmLabel="Delete"
                    onConfirm={() => {
                        setIsConfirmingDelete(false);
                        onDelete();
                    }}
                    onCancel={() => setIsConfirmingDelete(false)}
                />
            )}
        </>
    );
}

/**
 * Small popover anchored to the "Block settings" toolbar button — a relative
 * panel (not a centered modal) so it reads as a direct extension of the
 * button that opened it. Closes on outside click or Escape.
 */
function AddQuestionPopover({
    canAddRandom,
    onAddCustom,
    onAddRandom,
    onClose,
}: {
    canAddRandom: boolean;
    onAddCustom: () => void;
    onAddRandom: () => void;
    onClose: () => void;
}) {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onPointerDown(event: PointerEvent) {
            if (
                panelRef.current &&
                !panelRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        }

        function onKey(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('keydown', onKey);

        return () => {
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    return (
        <div
            ref={panelRef}
            className="absolute bottom-full left-1/2 z-30 mb-2.5 w-52 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 text-left shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40 print:hidden"
        >
            <span className="absolute -bottom-[5px] left-1/2 size-2.5 -translate-x-1/2 rotate-45 border-r border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
            <div className="relative flex flex-col gap-1">
                <button
                    type="button"
                    onClick={onAddCustom}
                    className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700 dark:text-slate-200 dark:hover:bg-brand-500/10 dark:hover:text-brand-200"
                >
                    <PlusIcon className="size-4" />
                    Add custom question
                </button>
                <button
                    type="button"
                    disabled={!canAddRandom}
                    onClick={onAddRandom}
                    className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-brand-500/10 dark:hover:text-brand-200"
                >
                    <ShuffleIcon className="size-4" />
                    Add random question
                </button>
            </div>
        </div>
    );
}

function BlockSettingsPopover({
    columns,
    onChange,
    onClose,
}: {
    columns: number;
    onChange: (value: number) => void;
    onClose: () => void;
}) {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onPointerDown(event: PointerEvent) {
            if (
                panelRef.current &&
                !panelRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        }

        function onKey(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('keydown', onKey);

        return () => {
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    const columnOptions = Array.from(
        { length: MAX_SECTION_COLUMNS - MIN_SECTION_COLUMNS + 1 },
        (_, i) => MIN_SECTION_COLUMNS + i,
    );

    return (
        <div
            ref={panelRef}
            className="absolute bottom-full left-1/2 z-30 mb-2.5 w-60 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40 print:hidden"
        >
            <span className="absolute -bottom-[5px] left-1/2 size-2.5 -translate-x-1/2 rotate-45 border-r border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />

            <div className="relative mb-2.5 flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-md bg-brand-600 text-white">
                    <SlidersHorizontalIcon className="size-3.5" />
                </div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Block Settings
                </p>
            </div>

            <p className="relative mb-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Columns
            </p>
            <div className="relative grid grid-cols-5 gap-1">
                {columnOptions.map((value) => (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={columns === value}
                        onClick={() => onChange(value)}
                        className={cn(
                            'flex h-8 cursor-pointer items-center justify-center rounded-lg border text-xs font-bold transition-colors',
                            columns === value
                                ? 'border-brand-600 bg-brand-600 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-200',
                        )}
                    >
                        {value}
                    </button>
                ))}
            </div>
        </div>
    );
}

function ActionButton({
    label,
    onClick,
    children,
    className,
    variant = 'default',
}: {
    label: string;
    onClick: () => void;
    children: ReactNode;
    className?: string;
    variant?: 'default' | 'primary' | 'danger';
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            onClick={onClick}
            className={cn(
                'flex size-8 cursor-pointer items-center justify-center rounded-lg border text-slate-500 transition-colors dark:text-slate-300',
                variant === 'default' &&
                    'border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-200',
                variant === 'primary' &&
                    'border-brand-600 bg-brand-600 text-white hover:border-brand-700 hover:bg-brand-700 dark:border-brand-500 dark:bg-brand-500 dark:text-white dark:hover:border-brand-400 dark:hover:bg-brand-400',
                variant === 'danger' &&
                    'border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300',
                className,
            )}
        >
            {children}
        </button>
    );
}

function ToolbarDivider() {
    return <span className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700/80" />;
}

function SectionButton({
    disabled = false,
    icon,
    label,
    onClick,
    variant = 'default',
}: {
    disabled?: boolean;
    icon: ReactNode;
    label: string;
    onClick: () => void;
    variant?: 'default' | 'accent' | 'primary' | 'danger';
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            title={label}
            aria-label={label}
            onClick={onClick}
            className={cn(
                'inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-35',
                variant === 'default' &&
                    'border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                variant === 'accent' &&
                    'border-transparent bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-200 dark:hover:bg-brand-500/15',
                variant === 'primary' &&
                    'border-brand-600 bg-brand-600 text-white shadow-sm shadow-brand-900/10 hover:border-brand-700 hover:bg-brand-700 dark:border-brand-500 dark:bg-brand-500 dark:text-white dark:hover:border-brand-400 dark:hover:bg-brand-400',
                variant === 'danger' &&
                    'border-transparent bg-transparent text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10',
            )}
        >
            {icon}
        </button>
    );
}

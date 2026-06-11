import {
    ArrowDownIcon,
    ArrowUpIcon,
    FilePenLineIcon,
    ListChecksIcon,
    MinusIcon,
    PlusIcon,
    ShuffleIcon,
    Trash2Icon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '../confirm-dialog';

interface QuestionHoverActionsProps {
    canSwap: boolean;
    showAnswerLines?: boolean;
    answerLines: number;
    onRandom: () => void;
    onPick: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onAnswerLinesChange: (value: number) => void;
}

export function QuestionHoverActions({
    canSwap,
    showAnswerLines = false,
    answerLines,
    onRandom,
    onPick,
    onEdit,
    onDelete,
    onAnswerLinesChange,
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
                    <div className="ml-1 flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-1 dark:border-slate-700 dark:bg-slate-950/60">
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
                            className="flex size-6 cursor-pointer items-center justify-center rounded-md text-teal-700 transition-colors hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-500/10"
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
    onMoveUp,
    onMoveDown,
    onAddRandom,
    onAddCustom,
    onEdit,
    onDelete,
}: {
    canMoveUp: boolean;
    canMoveDown: boolean;
    canAddRandom: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onAddRandom: () => void;
    onAddCustom: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

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
                        label="Add random question"
                        disabled={!canAddRandom}
                        icon={<ShuffleIcon className="size-4" />}
                        onClick={onAddRandom}
                    />
                    <SectionButton
                        label="Add custom question"
                        variant="accent"
                        icon={<PlusIcon className="size-4" />}
                        onClick={onAddCustom}
                    />
                    <ToolbarDivider />
                    <SectionButton
                        label="Edit section"
                        variant="primary"
                        icon={<FilePenLineIcon className="size-4" />}
                        onClick={onEdit}
                    />
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
                    'border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-teal-500/30 dark:hover:bg-teal-500/10 dark:hover:text-teal-200',
                variant === 'primary' &&
                    'border-teal-600 bg-teal-600 text-white hover:border-teal-700 hover:bg-teal-700 dark:border-teal-500 dark:bg-teal-500 dark:text-slate-950 dark:hover:border-teal-400 dark:hover:bg-teal-400',
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
                    'border-transparent bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-200 dark:hover:bg-teal-500/15',
                variant === 'primary' &&
                    'border-teal-600 bg-teal-600 text-white shadow-sm shadow-teal-900/10 hover:border-teal-700 hover:bg-teal-700 dark:border-teal-500 dark:bg-teal-500 dark:text-slate-950 dark:hover:border-teal-400 dark:hover:bg-teal-400',
                variant === 'danger' &&
                    'border-transparent bg-transparent text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10',
            )}
        >
            {icon}
        </button>
    );
}

import {
    Combobox,
    ComboboxButton,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions,
} from '@headlessui/react';
import {
    CheckIcon,
    ChevronDownIcon,
    MinusIcon,
    PlusIcon,
    SearchXIcon,
    XIcon,
} from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type {
    PaperEnglishFont,
    PaperSettings,
    PaperUrduFont,
} from './types';
import { DEFAULT_PAPER_SETTINGS } from './types';

interface PaperSettingsDrawerProps {
    open: boolean;
    settings: PaperSettings;
    onChange: (patch: Partial<PaperSettings>) => void;
    onClose: () => void;
}

interface FontOption<T extends string> {
    value: T;
    label: string;
    /** Inline font-family used to preview the option in its own typeface. */
    previewFontFamily: string;
}

const ENGLISH_FONT_OPTIONS: Array<FontOption<PaperEnglishFont>> = [
    {
        value: 'sans',
        label: 'Sans-serif',
        previewFontFamily: '"Montserrat", system-ui, sans-serif',
    },
    {
        value: 'serif',
        label: 'Serif',
        previewFontFamily: 'Cambria, Georgia, "Times New Roman", serif',
    },
    {
        value: 'mono',
        label: 'Monospace',
        previewFontFamily: 'ui-monospace, Consolas, monospace',
    },
];

const URDU_FONT_OPTIONS: Array<FontOption<PaperUrduFont>> = [
    {
        value: 'jameel-noori',
        label: 'Jameel Noori',
        previewFontFamily:
            '"Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif',
    },
    {
        value: 'noto-nastaliq',
        label: 'Noto Nastaliq',
        previewFontFamily:
            '"Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif',
    },
    {
        value: 'mehr-nastaliq',
        label: 'Mehr Nastaliq',
        previewFontFamily:
            '"Mehr Nastaliq Web", "Noto Nastaliq Urdu", serif',
    },
];

const SIZE_BOUNDS = {
    header: { min: 10, max: 28 },
    heading: { min: 10, max: 28 },
    question: { min: 10, max: 24 },
};

const BORDER_STYLE_OPTIONS = [
    { value: 'solid', label: 'Solid', previewFontFamily: 'inherit' },
    { value: 'dashed', label: 'Dashed', previewFontFamily: 'inherit' },
    { value: 'dotted', label: 'Dotted', previewFontFamily: 'inherit' },
] as const;

const LINE_HEIGHT_BOUNDS = { min: 1, max: 3 };

export function PaperSettingsDrawer({
    open,
    settings,
    onChange,
    onClose,
}: PaperSettingsDrawerProps) {
    useEffect(() => {
        if (!open) return;

        function onKey(event: KeyboardEvent) {
            if (event.key === 'Escape') onClose();
        }

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    const paperBorderEnabled =
        settings.paperBorderEnabled ?? DEFAULT_PAPER_SETTINGS.paperBorderEnabled;
    const paperBorderWidth =
        settings.paperBorderWidth ?? DEFAULT_PAPER_SETTINGS.paperBorderWidth;
    const paperBorderStyle =
        settings.paperBorderStyle ?? DEFAULT_PAPER_SETTINGS.paperBorderStyle;

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    'fixed inset-0 z-40 bg-slate-950/30 transition-opacity duration-200 print:hidden',
                    open ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
                onClick={onClose}
            />

            {/* Drawer panel */}
            <aside
                aria-hidden={!open}
                className={cn(
                    'fixed top-0 right-0 z-50 flex h-full w-93 flex-col border-l border-slate-200 bg-white shadow-2xl shadow-slate-900/10 transition-transform duration-200 print:hidden dark:border-slate-800 dark:bg-slate-900',
                    open ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Paper Settings
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        aria-label="Close settings"
                    >
                        <XIcon className="size-4" />
                    </button>
                </header>

                <div className="scrollbar-slim flex-1 overflow-y-auto px-4 py-4">
                    {/* ── Fonts — English + Urdu, separate searchable pickers ── */}
                    <Group title="Font Family">
                        <div className="space-y-3 grid grid-cols-2 gap-2">
                            <div className="mb-0">
                                <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    English
                                </p>
                                <FontPicker
                                    value={settings.englishFont}
                                    options={ENGLISH_FONT_OPTIONS}
                                    onChange={(value) =>
                                        onChange({ englishFont: value })
                                    }
                                />
                            </div>
                            <div className="mb-0">
                                <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    Urdu
                                </p>
                                <FontPicker
                                    value={settings.urduFont}
                                    options={URDU_FONT_OPTIONS}
                                    onChange={(value) =>
                                        onChange({ urduFont: value })
                                    }
                                />
                            </div>
                        </div>
                    </Group>

                    {/* ── Font sizes — header / heading / question ── */}
                    <Group title="Font Size">
                        <div className="grid grid-cols-2 gap-2">
                            <LabeledStepper
                                label="Header"
                                value={settings.headerSize}
                                min={SIZE_BOUNDS.header.min}
                                max={SIZE_BOUNDS.header.max}
                                onChange={(v) => onChange({ headerSize: v })}
                            />
                            <LabeledStepper
                                label="Line Height"
                                value={settings.headerLineHeight}
                                min={LINE_HEIGHT_BOUNDS.min}
                                max={LINE_HEIGHT_BOUNDS.max}
                                step={0.1}
                                onChange={(v) => onChange({ headerLineHeight: v })}
                            />
                            <LabeledStepper
                                label="Heading"
                                value={settings.headingSize}
                                min={SIZE_BOUNDS.heading.min}
                                max={SIZE_BOUNDS.heading.max}
                                onChange={(v) => onChange({ headingSize: v })}
                            />
                            <LabeledStepper
                                label="Line Height"
                                value={settings.headingLineHeight}
                                min={LINE_HEIGHT_BOUNDS.min}
                                max={LINE_HEIGHT_BOUNDS.max}
                                step={0.1}
                                onChange={(v) => onChange({ headingLineHeight: v })}
                            />
                            <LabeledStepper
                                label="Question"
                                value={settings.questionSize}
                                min={SIZE_BOUNDS.question.min}
                                max={SIZE_BOUNDS.question.max}
                                onChange={(v) => onChange({ questionSize: v })}
                            />
                            <LabeledStepper
                                label="Line Height"
                                value={settings.questionLineHeight}
                                min={LINE_HEIGHT_BOUNDS.min}
                                max={LINE_HEIGHT_BOUNDS.max}
                                step={0.1}
                                onChange={(v) => onChange({ questionLineHeight: v })}
                            />
                        </div>
                    </Group>

                    {/* ── Border Layout ── */}
                    <Group title="Paper Borders">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    Show Border
                                </p>
                                <label className="inline-flex w-full cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                                    <input
                                        type="checkbox"
                                        checked={paperBorderEnabled}
                                        onChange={(event) =>
                                            onChange({
                                                paperBorderEnabled:
                                                    event.target.checked,
                                            })
                                        }
                                        className="mr-2 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    Enabled
                                </label>
                            </div>
                            <LabeledStepper
                                label="Border Width"
                                value={paperBorderWidth}
                                min={0}
                                max={10}
                                step={0.5}
                                onChange={(v) => onChange({ paperBorderWidth: v })}
                            />
                            <div className="col-span-2">
                                <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    Border Style
                                </p>
                                <FontPicker
                                    value={paperBorderStyle}
                                    options={BORDER_STYLE_OPTIONS}
                                    onChange={(value) =>
                                        onChange({
                                            paperBorderStyle: value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </Group>
                </div>
            </aside>
        </>
    );
}

function Group({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="mb-5">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {title}
            </h3>
            {children}
        </section>
    );
}

function LabeledStepper({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (next: number) => void;
}) {
    const precision = Number.isFinite(step) && step < 1 ? -Math.floor(Math.log10(step)) : 0;
    const factor = 10 ** precision;

    function roundToStep(next: number) {
        if (precision === 0) return Math.round(next);
        return Math.round(next * factor) / factor;
    }

    function clamp(next: number) {
        return Math.min(Math.max(roundToStep(next), min), max);
    }

    const canDecrement = value > min;
    const canIncrement = value < max;

    return (
        <div>
            <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {label}
            </p>
            <div className="flex h-10 items-stretch overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                <StepperButton
                    disabled={!canDecrement}
                    onClick={() => onChange(clamp(value - step))}
                    aria-label={`Decrease ${label.toLowerCase()} size`}
                >
                    <MinusIcon className="size-3.5" />
                </StepperButton>

                <input
                    type="number"
                    inputMode="numeric"
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    onChange={(event) => {
                        const next = Number(event.target.value);
                        if (Number.isFinite(next)) onChange(clamp(next));
                    }}
                    className="w-full min-w-0 border-x border-slate-200 bg-white text-center text-sm font-semibold text-slate-900 outline-none [appearance:textfield] [-moz-appearance:textfield] focus:bg-teal-50/50 focus:text-teal-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-teal-500/10 dark:focus:text-teal-200 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />

                <StepperButton
                    disabled={!canIncrement}
                    onClick={() => onChange(clamp(value + step))}
                    aria-label={`Increase ${label.toLowerCase()} size`}
                >
                    <PlusIcon className="size-3.5" />
                </StepperButton>
            </div>
        </div>
    );
}

function FontPicker<T extends string>({
    value,
    options,
    onChange,
}: {
    value: T;
    options: Array<FontOption<T>>;
    onChange: (next: T) => void;
}) {
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const selected = options.find((o) => o.value === value) ?? options[0];

    const filtered =
        query.trim() === ''
            ? options
            : options.filter((o) =>
                o.label.toLowerCase().includes(query.trim().toLowerCase()),
            );

    return (
        <div className="relative">
            <Combobox
                value={value}
                onChange={(next: T | null) => {
                    if (next) onChange(next);
                    setQuery('');
                }}
                onClose={() => setQuery('')}
                immediate
            >
                <div className="group/field flex h-10 items-center rounded-lg border border-slate-200 bg-white transition-colors focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/15 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:focus-within:border-teal-400 dark:hover:border-slate-700">
                    <ComboboxInput
                        ref={inputRef}
                        style={{ fontFamily: selected.previewFontFamily }}
                        className="h-full w-full bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                        displayValue={(v: T) =>
                            options.find((o) => o.value === v)?.label ?? ''
                        }
                        onChange={(event) => setQuery(event.target.value)}
                        onClick={() => {
                            // HeadlessUI doesn't reopen on input click after a
                            // selection — forward the click to the button.
                            if (
                                inputRef.current?.getAttribute(
                                    'aria-expanded',
                                ) !== 'true'
                            ) {
                                buttonRef.current?.click();
                            }
                        }}
                    />
                    <ComboboxButton
                        ref={buttonRef}
                        className="group/btn flex h-full w-9 cursor-pointer items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                        <ChevronDownIcon className="size-4 transition-transform duration-150 group-data-open/btn:rotate-180" />
                    </ComboboxButton>
                </div>

                <ComboboxOptions
                    transition
                    className="absolute top-full right-0 left-0 z-10 mt-2 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10 outline-none transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40"
                >
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center gap-1.5 px-3 py-5 text-center">
                            <SearchXIcon className="size-4 text-slate-300 dark:text-slate-600" />
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                No matches
                            </p>
                        </div>
                    )}
                    {filtered.map((option) => (
                        <ComboboxOption
                            key={option.value}
                            value={option.value}
                            className={({ focus, selected }) =>
                                cn(
                                    'flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors',
                                    focus
                                        ? 'bg-teal-50 text-teal-900 dark:bg-teal-500/10 dark:text-teal-100'
                                        : 'text-slate-700 dark:text-slate-300',
                                    selected && 'font-semibold',
                                )
                            }
                        >
                            {({ selected }) => (
                                <>
                                    <span
                                        style={{
                                            fontFamily: option.previewFontFamily,
                                        }}
                                    >
                                        {option.label}
                                    </span>
                                    {selected && (
                                        <CheckIcon className="size-4 text-teal-600 dark:text-teal-400" />
                                    )}
                                </>
                            )}
                        </ComboboxOption>
                    ))}
                </ComboboxOptions>
            </Combobox>
        </div>
    );
}

function StepperButton({
    disabled,
    onClick,
    children,
    ...rest
}: {
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
} & React.AriaAttributes) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="flex w-8 shrink-0 cursor-pointer items-center justify-center bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            {...rest}
        >
            {children}
        </button>
    );
}

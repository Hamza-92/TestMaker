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
    ImageIcon,
    MinusIcon,
    PlusIcon,
    SearchXIcon,
    RotateCcwIcon,
    Trash2Icon,
    TypeIcon,
    UploadIcon,
    XIcon,
} from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type {
    PageNumberFormat,
    PageNumberPosition,
    PaperBorderStyle,
    PaperEnglishFont,
    PaperHeaderTemplate,
    PaperOrientation,
    PaperQuestionLayout,
    PaperQuestionNumberingFormat,
    PaperSettings,
    PaperSize,
    PaperUrduFont,
    PaperWatermarkType,
} from './types';
import { DEFAULT_PAPER_SETTINGS } from './types';

interface PaperSettingsDrawerProps {
    open: boolean;
    settings: PaperSettings;
    defaultWatermarkLogoUrl?: string;
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
        previewFontFamily: '"Mehr Nastaliq Web", "Noto Nastaliq Urdu", serif',
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

const PAPER_SIZE_OPTIONS = [
    { value: 'A4', label: 'A4', previewFontFamily: 'inherit' },
    { value: 'Letter', label: 'Letter', previewFontFamily: 'inherit' },
    { value: 'Legal', label: 'Legal', previewFontFamily: 'inherit' },
] as const;

const ORIENTATION_OPTIONS = [
    { value: 'portrait', label: 'Portrait', previewFontFamily: 'inherit' },
    { value: 'landscape', label: 'Landscape', previewFontFamily: 'inherit' },
] as const;

const PAGE_NUMBER_POSITION_OPTIONS = [
    {
        value: 'footer-center',
        label: 'Footer center',
        previewFontFamily: 'inherit',
    },
    {
        value: 'footer-right',
        label: 'Footer right',
        previewFontFamily: 'inherit',
    },
    {
        value: 'header-right',
        label: 'Header right',
        previewFontFamily: 'inherit',
    },
] as const;

const PAGE_NUMBER_FORMAT_OPTIONS = [
    { value: 'page-n', label: 'Page 1', previewFontFamily: 'inherit' },
    { value: 'n-of-m', label: '1 of 3', previewFontFamily: 'inherit' },
    { value: 'just-n', label: '1', previewFontFamily: 'inherit' },
] as const;

const QUESTION_NUMBERING_FORMAT_OPTIONS = [
    { value: 'default', label: 'Default', previewFontFamily: 'inherit' },
    { value: 'numeric', label: '1, 2, 3', previewFontFamily: 'inherit' },
    { value: 'roman', label: 'i, ii, iii', previewFontFamily: 'inherit' },
    { value: 'alpha', label: 'a, b, c', previewFontFamily: 'inherit' },
] as const;

const QUESTION_LAYOUT_OPTIONS = [
    { value: 'default', label: 'Default', previewFontFamily: 'inherit' },
    { value: 'stacked', label: 'Single Lines', previewFontFamily: 'inherit' },
    { value: 'columns', label: 'Columns (2)', previewFontFamily: 'inherit' },
    { value: 'inline', label: 'Inline', previewFontFamily: 'inherit' },
] as const;

const HEADER_TEMPLATE_OPTIONS: Array<FontOption<PaperHeaderTemplate>> = [
    { value: 'classic',  label: '1 – Classic',  previewFontFamily: 'inherit' },
    { value: 'banner',   label: '2 – Banner',   previewFontFamily: 'inherit' },
    { value: 'formal',   label: '3 – Formal',   previewFontFamily: 'inherit' },
    { value: 'centered', label: '4 – Centered', previewFontFamily: 'inherit' },
    { value: 'tabular',  label: '5 – Tabular',  previewFontFamily: 'inherit' },
];

const MARGIN_BOUNDS = { min: 0, max: 50 };
const SECTION_SPACING_BOUNDS = { min: 0, max: 20 };

const LINE_HEIGHT_BOUNDS = { min: 1, max: 3 };
const BORDER_WIDTH_BOUNDS = { min: 0, max: 6 };
const WATERMARK_OPACITY_BOUNDS = { min: 0, max: 100 };

export function PaperSettingsDrawer({
    open,
    settings,
    defaultWatermarkLogoUrl = '',
    onChange,
    onClose,
}: PaperSettingsDrawerProps) {
    useEffect(() => {
        if (!open) {
            return;
        }

        function onKey(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

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
                    'fixed top-0 right-0 z-50 flex h-full w-93 flex-col border-l border-slate-200 bg-white shadow-2xl shadow-slate-900/10 transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 print:hidden',
                    open ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Paper Settings
                    </h2>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() =>
                                onChange({ ...DEFAULT_PAPER_SETTINGS })
                            }
                            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            aria-label="Reset paper settings"
                            title="Reset paper settings"
                        >
                            <RotateCcwIcon className="size-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            aria-label="Close settings"
                            title="Close settings"
                        >
                            <XIcon className="size-4" />
                        </button>
                    </div>
                </header>

                <div className="scrollbar-slim flex-1 overflow-y-auto py-4">
                    {/* ── Collapsible per-section cards ──────────────── */}
                    <CollapsibleSection title="General" defaultOpen>
                        {/* Paper-wide font family — applied across header,
                            headings and questions via a single CSS cascade. */}
                        <div>
                            <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                Font Family
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="mb-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
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
                                <div>
                                    <p className="mb-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
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
                        </div>

                        {/* Paper size + orientation — drives both the on-screen
                            shell dimensions and the printed @page rule. */}
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <div>
                                <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    Paper Size
                                </p>
                                <FontPicker
                                    value={settings.paperSize}
                                    options={PAPER_SIZE_OPTIONS}
                                    onChange={(value: PaperSize) =>
                                        onChange({ paperSize: value })
                                    }
                                />
                            </div>
                            <div>
                                <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    Orientation
                                </p>
                                <FontPicker
                                    value={settings.orientation}
                                    options={ORIENTATION_OPTIONS}
                                    onChange={(value: PaperOrientation) =>
                                        onChange({ orientation: value })
                                    }
                                />
                            </div>
                        </div>

                        {/* Page margins — millimetres on all four sides. */}
                        <div className="mt-4">
                            <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                Margins (mm)
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <LabeledStepper
                                    label="Top"
                                    value={settings.marginTop}
                                    min={MARGIN_BOUNDS.min}
                                    max={MARGIN_BOUNDS.max}
                                    onChange={(v) => onChange({ marginTop: v })}
                                />
                                <LabeledStepper
                                    label="Right"
                                    value={settings.marginRight}
                                    min={MARGIN_BOUNDS.min}
                                    max={MARGIN_BOUNDS.max}
                                    onChange={(v) =>
                                        onChange({ marginRight: v })
                                    }
                                />
                                <LabeledStepper
                                    label="Bottom"
                                    value={settings.marginBottom}
                                    min={MARGIN_BOUNDS.min}
                                    max={MARGIN_BOUNDS.max}
                                    onChange={(v) =>
                                        onChange({ marginBottom: v })
                                    }
                                />
                                <LabeledStepper
                                    label="Left"
                                    value={settings.marginLeft}
                                    min={MARGIN_BOUNDS.min}
                                    max={MARGIN_BOUNDS.max}
                                    onChange={(v) =>
                                        onChange({ marginLeft: v })
                                    }
                                />
                            </div>
                        </div>

                        {/* Spacing between consecutive sections (and between
                            header and the first section). */}
                        <div className="mt-4">
                            <LabeledStepper
                                label="Section Spacing (mm)"
                                value={settings.sectionSpacing}
                                min={SECTION_SPACING_BOUNDS.min}
                                max={SECTION_SPACING_BOUNDS.max}
                                step={0.5}
                                onChange={(v) =>
                                    onChange({ sectionSpacing: v })
                                }
                            />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <CheckboxField
                                label="Repeat Header"
                                checked={settings.repeatHeaderOnEachPage}
                                onChange={(checked) =>
                                    onChange({
                                        repeatHeaderOnEachPage: checked,
                                    })
                                }
                            />
                            <CheckboxField
                                label="Page Numbers"
                                checked={settings.pageNumbersEnabled}
                                onChange={(checked) =>
                                    onChange({ pageNumbersEnabled: checked })
                                }
                            />
                        </div>

                        {settings.pageNumbersEnabled && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <div>
                                    <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                        Number Format
                                    </p>
                                    <FontPicker
                                        value={settings.pageNumberFormat}
                                        options={PAGE_NUMBER_FORMAT_OPTIONS}
                                        onChange={(value: PageNumberFormat) =>
                                            onChange({
                                                pageNumberFormat: value,
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                        Number Position
                                    </p>
                                    <FontPicker
                                        value={settings.pageNumberPosition}
                                        options={PAGE_NUMBER_POSITION_OPTIONS}
                                        onChange={(value: PageNumberPosition) =>
                                            onChange({
                                                pageNumberPosition: value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        )}
                    </CollapsibleSection>

                    <CollapsibleSection title="Watermark">
                        <WatermarkTypeSelector
                            value={settings.watermarkType}
                            onChange={(value) =>
                                onChange({ watermarkType: value })
                            }
                        />
                        <div className="mt-4">
                            {settings.watermarkType === 'text' ? (
                                <TextInput
                                    label="Text"
                                    value={settings.watermarkText}
                                    placeholder="Optional"
                                    onChange={(value) =>
                                        onChange({ watermarkText: value })
                                    }
                                />
                            ) : (
                                <LogoInput
                                    value={settings.watermarkLogoUrl}
                                    defaultValue={defaultWatermarkLogoUrl}
                                    onChange={(value) =>
                                        onChange({
                                            watermarkLogoUrl: value,
                                        })
                                    }
                                />
                            )}
                        </div>
                        <div className="mt-4">
                            <LabeledStepper
                                label="Opacity"
                                value={settings.watermarkOpacity}
                                min={WATERMARK_OPACITY_BOUNDS.min}
                                max={WATERMARK_OPACITY_BOUNDS.max}
                                onChange={(v) =>
                                    onChange({ watermarkOpacity: v })
                                }
                            />
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Header">
                        <div className="mb-3">
                            <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                Template
                            </p>
                            <FontPicker
                                value={settings.headerTemplate}
                                options={HEADER_TEMPLATE_OPTIONS}
                                onChange={(v) => onChange({ headerTemplate: v })}
                            />
                        </div>
                        <TypographyControls
                            size={settings.headerSize}
                            sizeMin={SIZE_BOUNDS.header.min}
                            sizeMax={SIZE_BOUNDS.header.max}
                            lineHeight={settings.headerLineHeight}
                            onSizeChange={(v) => onChange({ headerSize: v })}
                            onLineHeightChange={(v) =>
                                onChange({ headerLineHeight: v })
                            }
                        />
                        <BorderControls
                            width={settings.headerBorderWidth}
                            style={settings.headerBorderStyle}
                            onWidthChange={(v) =>
                                onChange({ headerBorderWidth: v })
                            }
                            onStyleChange={(v) =>
                                onChange({ headerBorderStyle: v })
                            }
                        />
                    </CollapsibleSection>

                    <CollapsibleSection title="Type Heading">
                        <TypographyControls
                            size={settings.headingSize}
                            sizeMin={SIZE_BOUNDS.heading.min}
                            sizeMax={SIZE_BOUNDS.heading.max}
                            lineHeight={settings.headingLineHeight}
                            onSizeChange={(v) => onChange({ headingSize: v })}
                            onLineHeightChange={(v) =>
                                onChange({ headingLineHeight: v })
                            }
                        />
                        <BorderControls
                            width={settings.headingBorderWidth}
                            style={settings.headingBorderStyle}
                            onWidthChange={(v) =>
                                onChange({ headingBorderWidth: v })
                            }
                            onStyleChange={(v) =>
                                onChange({ headingBorderStyle: v })
                            }
                        />
                    </CollapsibleSection>

                    <CollapsibleSection title="Questions">
                        <div className="mb-3">
                            <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                Layout
                            </p>
                            <FontPicker
                                value={settings.questionLayout}
                                options={QUESTION_LAYOUT_OPTIONS}
                                onChange={(value: PaperQuestionLayout) =>
                                    onChange({ questionLayout: value })
                                }
                            />
                        </div>
                        <div className="mb-3">
                            <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                Numbering
                            </p>
                            <FontPicker
                                value={settings.questionNumberingFormat}
                                options={QUESTION_NUMBERING_FORMAT_OPTIONS}
                                onChange={(
                                    value: PaperQuestionNumberingFormat,
                                ) =>
                                    onChange({
                                        questionNumberingFormat: value,
                                    })
                                }
                            />
                        </div>
                        <TypographyControls
                            size={settings.questionSize}
                            sizeMin={SIZE_BOUNDS.question.min}
                            sizeMax={SIZE_BOUNDS.question.max}
                            lineHeight={settings.questionLineHeight}
                            onSizeChange={(v) => onChange({ questionSize: v })}
                            onLineHeightChange={(v) =>
                                onChange({ questionLineHeight: v })
                            }
                        />
                        <BorderControls
                            width={settings.questionBorderWidth}
                            style={settings.questionBorderStyle}
                            onWidthChange={(v) =>
                                onChange({ questionBorderWidth: v })
                            }
                            onStyleChange={(v) =>
                                onChange({ questionBorderStyle: v })
                            }
                        />
                    </CollapsibleSection>
                </div>
            </aside>
        </>
    );
}

/**
 * A collapsible card that groups settings for a single paper element (Header,
 * Type Heading, Questions, …). Future per-element controls drop in as more
 * children of these cards — no further drawer restructure needed.
 */
function CollapsibleSection({
    title,
    defaultOpen = false,
    children,
}: {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <section className="mb-2">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="group flex w-full cursor-pointer items-center justify-between bg-slate-100 px-4 py-2.5 text-left transition-colors hover:bg-slate-200/70 dark:bg-slate-800/60 dark:hover:bg-slate-800"
            >
                <span className="text-[13px] font-semibold text-slate-800 group-hover:text-slate-950 dark:text-slate-100 dark:group-hover:text-white">
                    {title}
                </span>
                <ChevronDownIcon
                    className={cn(
                        'size-4 shrink-0 text-slate-400 transition-transform duration-150',
                        open && 'rotate-180',
                    )}
                />
            </button>
            {open && <div className="px-4 pt-3 pb-2">{children}</div>}
        </section>
    );
}

/** Default per-element typography controls: font size + line height. */
function TypographyControls({
    size,
    sizeMin,
    sizeMax,
    lineHeight,
    onSizeChange,
    onLineHeightChange,
}: {
    size: number;
    sizeMin: number;
    sizeMax: number;
    lineHeight: number;
    onSizeChange: (next: number) => void;
    onLineHeightChange: (next: number) => void;
}) {
    return (
        <div className="grid grid-cols-2 gap-2">
            <LabeledStepper
                label="Font Size"
                value={size}
                min={sizeMin}
                max={sizeMax}
                onChange={onSizeChange}
            />
            <LabeledStepper
                label="Line Height"
                value={lineHeight}
                min={LINE_HEIGHT_BOUNDS.min}
                max={LINE_HEIGHT_BOUNDS.max}
                step={0.1}
                onChange={onLineHeightChange}
            />
        </div>
    );
}

/** Per-element border controls: width + style (width=0 = no border). */
function BorderControls({
    width,
    style,
    onWidthChange,
    onStyleChange,
}: {
    width: number;
    style: PaperBorderStyle;
    onWidthChange: (next: number) => void;
    onStyleChange: (next: PaperBorderStyle) => void;
}) {
    return (
        <div className="mt-3 grid grid-cols-2 gap-2">
            <LabeledStepper
                label="Border Width"
                value={width}
                min={BORDER_WIDTH_BOUNDS.min}
                max={BORDER_WIDTH_BOUNDS.max}
                step={1}
                onChange={onWidthChange}
            />
            <div>
                <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Border Style
                </p>
                <FontPicker
                    value={style}
                    options={BORDER_STYLE_OPTIONS}
                    onChange={onStyleChange}
                />
            </div>
        </div>
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
    const precision =
        Number.isFinite(step) && step < 1 ? -Math.floor(Math.log10(step)) : 0;
    const factor = 10 ** precision;

    function roundToStep(next: number) {
        if (precision === 0) {
            return Math.round(next);
        }

        return Math.round(next * factor) / factor;
    }

    function clamp(next: number) {
        return Math.min(Math.max(roundToStep(next), min), max);
    }

    const canDecrement = value > min;
    const canIncrement = value < max;
    const inputMode = step % 1 === 0 ? 'numeric' : 'decimal';

    return (
        <div>
            <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {label}
            </p>
            <div className="flex h-10 items-stretch overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                <StepperButton
                    disabled={!canDecrement}
                    onClick={() => onChange(clamp(value - step))}
                    aria-label={`Decrease ${label.toLowerCase()}`}
                >
                    <MinusIcon className="size-3.5" />
                </StepperButton>

                <input autoComplete="off"
                    type="number"
                    inputMode={inputMode}
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    onChange={(event) => {
                        const next = Number(event.target.value);

                        if (Number.isFinite(next)) {
                            onChange(clamp(next));
                        }
                    }}
                    className="w-full min-w-0 [appearance:textfield] border-x border-slate-200 bg-white text-center text-sm font-semibold text-slate-900 outline-none [-moz-appearance:textfield] focus:bg-teal-50/50 focus:text-teal-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-teal-500/10 dark:focus:text-teal-200 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />

                <StepperButton
                    disabled={!canIncrement}
                    onClick={() => onChange(clamp(value + step))}
                    aria-label={`Increase ${label.toLowerCase()}`}
                >
                    <PlusIcon className="size-3.5" />
                </StepperButton>
            </div>
        </div>
    );
}

function WatermarkTypeSelector({
    value,
    onChange,
}: {
    value: PaperWatermarkType;
    onChange: (next: PaperWatermarkType) => void;
}) {
    return (
        <div>
            <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Type
            </p>
            <div className="grid grid-cols-2 gap-2">
                <WatermarkTypeButton
                    active={value === 'text'}
                    label="Text"
                    onClick={() => onChange('text')}
                >
                    <TypeIcon className="size-4" />
                </WatermarkTypeButton>
                <WatermarkTypeButton
                    active={value === 'logo'}
                    label="Logo"
                    onClick={() => onChange('logo')}
                >
                    <ImageIcon className="size-4" />
                </WatermarkTypeButton>
            </div>
        </div>
    );
}

function WatermarkTypeButton({
    active,
    label,
    onClick,
    children,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                'flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors',
                active
                    ? 'border-teal-500 bg-teal-50 text-teal-700 dark:border-teal-400 dark:bg-teal-500/10 dark:text-teal-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/70',
            )}
        >
            {children}
            {label}
        </button>
    );
}

function LogoInput({
    value,
    defaultValue,
    onChange,
}: {
    value: string;
    defaultValue: string;
    onChange: (next: string) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const customLogoUrl = value.trim();
    const defaultLogoUrl = defaultValue.trim();
    const previewUrl = customLogoUrl || defaultLogoUrl;
    const isUsingDefault = customLogoUrl === '' && defaultLogoUrl !== '';

    return (
        <div>
            <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Logo
            </p>
            <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                {previewUrl ? (
                    <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                            <img
                                src={previewUrl}
                                alt=""
                                className="max-h-12 max-w-14 object-contain"
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                {isUsingDefault ? 'School logo' : 'Custom logo'}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {isUsingDefault
                                    ? 'Used by default'
                                    : defaultLogoUrl
                                      ? 'Overrides school logo'
                                      : 'Selected logo'}
                            </p>
                        </div>
                        {customLogoUrl !== '' && (
                            <button
                                type="button"
                                onClick={() => onChange('')}
                                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-800 dark:text-slate-300 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                            >
                                <Trash2Icon className="size-3.5" />
                                {defaultLogoUrl ? 'Use School' : 'Remove'}
                            </button>
                        )}
                    </div>
                ) : (
                    <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                        No school logo found
                    </p>
                )}
                <input autoComplete="off"
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';

                        if (!file) {
                            return;
                        }

                        const reader = new FileReader();

                        reader.onload = () => {
                            if (typeof reader.result === 'string') {
                                onChange(reader.result);
                            }
                        };

                        reader.readAsDataURL(file);
                    }}
                />
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                    <UploadIcon className="size-3.5" />
                    {previewUrl ? 'Change Logo' : 'Choose Logo'}
                </button>
            </div>
        </div>
    );
}

function TextInput({
    label,
    value,
    placeholder,
    onChange,
}: {
    label: string;
    value: string;
    placeholder?: string;
    onChange: (next: string) => void;
}) {
    return (
        <div>
            <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {label}
            </p>
            <input autoComplete="off"
                type="text"
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 transition-colors outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400"
            />
        </div>
    );
}

function CheckboxField({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (next: boolean) => void;
}) {
    return (
        <label
            className={cn(
                'flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors',
                checked
                    ? 'border-teal-500 bg-teal-50 text-teal-700 dark:border-teal-400 dark:bg-teal-500/10 dark:text-teal-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800/70',
            )}
        >
            <input autoComplete="off"
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="size-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-950"
            />
            <span className="min-w-0 truncate">{label}</span>
        </label>
    );
}

function FontPicker<T extends string>({
    value,
    options,
    onChange,
}: {
    value: T;
    options: ReadonlyArray<FontOption<T>>;
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
                    if (next) {
                        onChange(next);
                    }

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
                    className="absolute top-full right-0 left-0 z-50 mt-2 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10 transition duration-100 ease-out outline-none data-closed:scale-95 data-closed:opacity-0 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40"
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
                                            fontFamily:
                                                option.previewFontFamily,
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

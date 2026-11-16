import * as Dialog from '@radix-ui/react-dialog';
import {
    FileTextIcon,
    LayoutGridIcon,
    RotateCcwIcon,
    SlidersHorizontalIcon,
    TypeIcon,
    XIcon,
} from 'lucide-react';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/tm';
import { Switch } from '@/components/ui/switch';
import {
    DEFAULT_PAPER_SETTINGS,
    PAGE_SIZES,
} from '../papers/paper-layouts/types';
import type { PaperSettings } from '../papers/paper-layouts/types';
import type { QatMedium, QatObjectiveSettings } from './question';

export const qatEnglishFonts = {
    'times-new-roman': {
        label: 'Times New Roman',
        family: '"Times New Roman", Times, serif',
    },
    sans: { label: 'Montserrat', family: 'Montserrat, Arial, sans-serif' },
    serif: { label: 'Cambria', family: 'Cambria, Georgia, serif' },
} as const;

export const qatUrduFonts = {
    'jameel-noori': {
        label: 'Jameel Noori Nastaleeq',
        family: '"Jameel Noori Nastaleeq", "Urdu Typesetting", "Noto Nastaliq Urdu", serif',
    },
    'noto-naskh-arabic': {
        label: 'Noto Naskh Arabic',
        family: '"Noto Naskh Arabic", serif',
    },
    amiri: { label: 'Amiri', family: 'Amiri, "Noto Naskh Arabic", serif' },
} as const;

const orientations = { portrait: 'Portrait', landscape: 'Landscape' } as const;
const maxMargin = 40;
const marginFields = [
    { key: 'marginTop', label: 'Top' },
    { key: 'marginRight', label: 'Right' },
    { key: 'marginBottom', label: 'Bottom' },
    { key: 'marginLeft', label: 'Left' },
] as const;
const typographyFields = [
    {
        key: 'sectionHeadingSize',
        label: 'Section headings',
        unit: 'px',
        min: 10,
        max: 24,
        step: 1,
    },
    {
        key: 'headingSize',
        label: 'Question type headings',
        unit: 'px',
        min: 10,
        max: 22,
        step: 1,
    },
    {
        key: 'questionSize',
        label: 'Question text',
        unit: 'px',
        min: 10,
        max: 22,
        step: 1,
    },
    {
        key: 'questionLineHeight',
        label: 'Question line spacing',
        unit: '×',
        min: 1,
        max: 2,
        step: 0.1,
    },
] as const;

type QatPaperSettings = Pick<
    PaperSettings,
    | 'paperSize'
    | 'orientation'
    | (typeof marginFields)[number]['key']
    | (typeof typographyFields)[number]['key']
> & {
    englishFont: keyof typeof qatEnglishFonts;
    urduFont: keyof typeof qatUrduFonts;
};

export const defaultQatPaperSettings: QatPaperSettings = {
    paperSize: DEFAULT_PAPER_SETTINGS.paperSize,
    orientation: DEFAULT_PAPER_SETTINGS.orientation,
    marginTop: 2,
    marginRight: DEFAULT_PAPER_SETTINGS.marginRight,
    marginBottom: DEFAULT_PAPER_SETTINGS.marginBottom,
    marginLeft: DEFAULT_PAPER_SETTINGS.marginLeft,
    englishFont: 'times-new-roman',
    urduFont: 'jameel-noori',
    sectionHeadingSize: DEFAULT_PAPER_SETTINGS.sectionHeadingSize,
    headingSize: DEFAULT_PAPER_SETTINGS.headingSize,
    questionSize: DEFAULT_PAPER_SETTINGS.questionSize,
    questionLineHeight: DEFAULT_PAPER_SETTINGS.questionLineHeight,
};

const objectiveLayouts = [
    { value: 'beside', label: 'Beside the statement' },
    { value: 'four-per-row', label: 'Four options per row below' },
    { value: 'two-per-row', label: 'Two options per row below' },
] as const;

export const defaultQatObjectiveSettings: QatObjectiveSettings = {
    layout: 'two-per-row',
    borders: true,
};

const paperSettingsKey = 'qat-paper-settings';
const objectiveSettingsKey = 'qat-objective-settings';

function readSettings(key: string): Record<string, unknown> {
    try {
        return JSON.parse(localStorage.getItem(key) ?? '{}') ?? {};
    } catch {
        return {};
    }
}

function writeSettings(key: string, settings: object) {
    try {
        localStorage.setItem(key, JSON.stringify(settings));
    } catch {
        // Settings still apply to the open paper when storage is unavailable.
    }
}

function settingChoice<T extends string>(
    options: Record<T, unknown>,
    value: unknown,
    fallback: T,
): T {
    return typeof value === 'string' && Object.hasOwn(options, value)
        ? (value as T)
        : fallback;
}

function settingNumber(
    value: unknown,
    fallback: number,
    min: number,
    max: number,
) {
    return typeof value === 'number' && Number.isFinite(value)
        ? Math.min(max, Math.max(min, value))
        : fallback;
}

export function loadQatPaperSettings(): QatPaperSettings {
    const stored = readSettings(paperSettingsKey);
    const defaults = defaultQatPaperSettings;
    const settings = {
        ...defaults,
        paperSize: settingChoice(
            PAGE_SIZES,
            stored.paperSize,
            defaults.paperSize,
        ),
        orientation: settingChoice(
            orientations,
            stored.orientation,
            defaults.orientation,
        ),
        englishFont: settingChoice(
            qatEnglishFonts,
            stored.englishFont,
            defaults.englishFont,
        ),
        urduFont: settingChoice(
            qatUrduFonts,
            stored.urduFont,
            defaults.urduFont,
        ),
    };

    for (const { key } of marginFields) {
        settings[key] = settingNumber(stored[key], defaults[key], 0, maxMargin);
    }

    for (const { key, min, max } of typographyFields) {
        settings[key] = settingNumber(stored[key], defaults[key], min, max);
    }

    return settings;
}

export function storeQatPaperSettings(settings: QatPaperSettings) {
    writeSettings(paperSettingsKey, settings);
}

export function loadQatObjectiveSettings(): QatObjectiveSettings {
    const stored = readSettings(objectiveSettingsKey);

    return {
        layout:
            objectiveLayouts.find(({ value }) => value === stored.layout)
                ?.value ?? defaultQatObjectiveSettings.layout,
        borders: stored.borders !== false,
    };
}

export function storeQatObjectiveSettings(settings: QatObjectiveSettings) {
    writeSettings(objectiveSettingsKey, settings);
}

const fieldClass =
    'mt-1.5 h-9 w-full rounded-lg border border-sky-200/90 bg-white px-2.5 text-sm text-slate-800 shadow-sm outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

export function QatObjectiveControls({
    settings,
    onChange,
}: {
    settings: QatObjectiveSettings;
    onChange: (settings: QatObjectiveSettings) => void;
}) {
    const id = useId();

    return (
        <>
            <fieldset>
                <legend className="sr-only">Objective option placement</legend>
                {objectiveLayouts.map(({ value, label }) => (
                    <label
                        key={value}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-sky-50 dark:hover:bg-slate-800 ${settings.layout === value ? 'bg-violet-50 font-semibold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200' : ''}`}
                    >
                        <input
                            type="radio"
                            name={`${id}-layout`}
                            value={value}
                            checked={settings.layout === value}
                            onChange={() =>
                                onChange({ ...settings, layout: value })
                            }
                            className="size-4 shrink-0 accent-violet-600"
                        />
                        {label}
                    </label>
                ))}
            </fieldset>
            <label
                htmlFor={`${id}-borders`}
                className="mt-2 flex cursor-pointer items-center justify-between gap-2 border-t border-sky-100 px-3 pb-1 pt-3 text-sm font-medium dark:border-slate-700"
            >
                Option borders
                <Switch
                    id={`${id}-borders`}
                    checked={settings.borders}
                    onCheckedChange={(borders) =>
                        onChange({ ...settings, borders })
                    }
                    className="data-[state=checked]:bg-violet-600"
                />
            </label>
        </>
    );
}

function SettingsGroup({
    title,
    icon,
    children,
}: {
    title: string;
    icon: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="rounded-xl border border-sky-200/70 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3.5 flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {icon}
                {title}
            </h3>
            {children}
        </section>
    );
}

export function QatPaperSettingsDrawer({
    trigger,
    medium,
    settings,
    onChange,
    objectiveSettings,
    onObjectiveChange,
}: {
    trigger: ReactNode;
    medium: QatMedium;
    settings: QatPaperSettings;
    onChange: (settings: QatPaperSettings) => void;
    objectiveSettings?: QatObjectiveSettings;
    onObjectiveChange: (settings: QatObjectiveSettings) => void;
}) {
    const fieldId = useId();

    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/30 print:hidden" />
                <Dialog.Content className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-[25rem] flex-col border-l border-sky-200 bg-sky-50 text-slate-700 shadow-xl dark:border-sky-900 dark:bg-slate-950 dark:text-slate-200 print:hidden">
                    <header className="flex items-center justify-between gap-3 border-b border-sky-200/80 bg-gradient-to-r from-sky-100 via-white to-violet-100 px-4 py-4 dark:border-sky-900 dark:from-sky-950 dark:via-slate-900 dark:to-violet-950">
                        <Dialog.Title className="flex items-center gap-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-brand-700 text-white shadow-sm">
                                <SlidersHorizontalIcon
                                    aria-hidden="true"
                                    className="size-4"
                                />
                            </span>
                            Paper settings
                        </Dialog.Title>
                        <Dialog.Description className="sr-only">
                            Layout settings apply to the preview, print and PDF.
                        </Dialog.Description>
                        <Dialog.Close asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Close paper settings"
                            >
                                <XIcon aria-hidden="true" />
                            </Button>
                        </Dialog.Close>
                    </header>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 sm:p-4">
                        <SettingsGroup
                            title="Page layout"
                            icon={
                                <FileTextIcon
                                    aria-hidden="true"
                                    className="size-4 text-brand-600 dark:text-sky-400"
                                />
                            }
                        >
                            <div className="grid grid-cols-2 gap-3 text-xs font-medium">
                                <label>
                                    Paper size
                                    <select
                                        className={fieldClass}
                                        value={settings.paperSize}
                                        onChange={(event) =>
                                            onChange({
                                                ...settings,
                                                paperSize: settingChoice(
                                                    PAGE_SIZES,
                                                    event.currentTarget.value,
                                                    settings.paperSize,
                                                ),
                                            })
                                        }
                                    >
                                        {Object.keys(PAGE_SIZES).map((size) => (
                                            <option key={size}>{size}</option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    Orientation
                                    <select
                                        className={fieldClass}
                                        value={settings.orientation}
                                        onChange={(event) =>
                                            onChange({
                                                ...settings,
                                                orientation: settingChoice(
                                                    orientations,
                                                    event.currentTarget.value,
                                                    settings.orientation,
                                                ),
                                            })
                                        }
                                    >
                                        {Object.entries(orientations).map(
                                            ([value, label]) => (
                                                <option
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </label>
                            </div>
                            <fieldset className="mt-4 grid grid-cols-2 gap-3 text-xs font-medium sm:grid-cols-4">
                                <legend className="mb-2">Margins (mm)</legend>
                                {marginFields.map(({ key, label }) => (
                                    <label key={key}>
                                        {label}
                                        <input
                                            type="number"
                                            min={0}
                                            max={maxMargin}
                                            step="any"
                                            className={fieldClass}
                                            value={settings[key] || ''}
                                            placeholder="0"
                                            onChange={(event) =>
                                                onChange({
                                                    ...settings,
                                                    [key]: settingNumber(
                                                        event.currentTarget
                                                            .valueAsNumber,
                                                        0,
                                                        0,
                                                        maxMargin,
                                                    ),
                                                })
                                            }
                                        />
                                    </label>
                                ))}
                            </fieldset>
                        </SettingsGroup>
                        <SettingsGroup
                            title="Typography"
                            icon={
                                <TypeIcon
                                    aria-hidden="true"
                                    className="size-4 text-sky-600 dark:text-sky-400"
                                />
                            }
                        >
                            <div className="space-y-3 text-xs font-medium">
                                {medium !== 'Urdu' && (
                                    <label className="block">
                                        English font
                                        <select
                                            className={fieldClass}
                                            value={settings.englishFont}
                                            onChange={(event) =>
                                                onChange({
                                                    ...settings,
                                                    englishFont: settingChoice(
                                                        qatEnglishFonts,
                                                        event.currentTarget
                                                            .value,
                                                        settings.englishFont,
                                                    ),
                                                })
                                            }
                                        >
                                            {Object.entries(
                                                qatEnglishFonts,
                                            ).map(([value, font]) => (
                                                <option
                                                    key={value}
                                                    value={value}
                                                >
                                                    {font.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                )}
                                {medium !== 'English' && (
                                    <label className="block">
                                        Urdu font
                                        <select
                                            className={fieldClass}
                                            value={settings.urduFont}
                                            onChange={(event) =>
                                                onChange({
                                                    ...settings,
                                                    urduFont: settingChoice(
                                                        qatUrduFonts,
                                                        event.currentTarget
                                                            .value,
                                                        settings.urduFont,
                                                    ),
                                                })
                                            }
                                        >
                                            {Object.entries(qatUrduFonts).map(
                                                ([value, font]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {font.label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </label>
                                )}
                                {typographyFields.map(
                                    ({ key, label, min, max, step, unit }) => (
                                        <div key={key}>
                                            <div className="flex items-center justify-between gap-2">
                                                <label
                                                    htmlFor={`${fieldId}-${key}`}
                                                >
                                                    {label}
                                                </label>
                                                <span className="rounded-md bg-sky-50 px-2 py-1 tabular-nums text-brand-700 dark:bg-sky-950 dark:text-sky-200">
                                                    {settings[key]} {unit}
                                                </span>
                                            </div>
                                            <input
                                                id={`${fieldId}-${key}`}
                                                type="range"
                                                min={min}
                                                max={max}
                                                step={step}
                                                value={settings[key]}
                                                aria-valuetext={`${settings[key]} ${unit}`}
                                                className="mt-1.5 block w-full cursor-pointer accent-brand-600"
                                                onChange={(event) =>
                                                    onChange({
                                                        ...settings,
                                                        [key]: event
                                                            .currentTarget
                                                            .valueAsNumber,
                                                    })
                                                }
                                            />
                                        </div>
                                    ),
                                )}
                            </div>
                        </SettingsGroup>
                        {objectiveSettings && (
                            <SettingsGroup
                                title="Objective options"
                                icon={
                                    <LayoutGridIcon
                                        aria-hidden="true"
                                        className="size-4 text-violet-600 dark:text-violet-400"
                                    />
                                }
                            >
                                <QatObjectiveControls
                                    settings={objectiveSettings}
                                    onChange={onObjectiveChange}
                                />
                            </SettingsGroup>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-sky-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:px-4">
                        <Button
                            type="button"
                            size="md"
                            variant="secondary"
                            onClick={() => {
                                onChange(defaultQatPaperSettings);

                                if (objectiveSettings) {
                                    onObjectiveChange(
                                        defaultQatObjectiveSettings,
                                    );
                                }
                            }}
                        >
                            <RotateCcwIcon aria-hidden="true" /> Reset defaults
                        </Button>
                        <Dialog.Close asChild>
                            <Button type="button" variant="primary">
                                Done
                            </Button>
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

import {
    Combobox,
    ComboboxButton,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions,
} from '@headlessui/react';
import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ComboboxOptionItem {
    id: number | string;
    label: string;
    searchLabel?: string;
    displayLabel?: ReactNode;
    hint?: string;
}

interface FloatingComboboxProps {
    label: string;
    options: ComboboxOptionItem[];
    value: ComboboxOptionItem | null;
    onChange: (value: ComboboxOptionItem | null) => void;
    disabled?: boolean;
    /** Shown as helper text below the field when disabled (e.g. "Pick a class first"). */
    disabledHint?: string;
    /** Optional icon shown on the left of the input. */
    leadingIcon?: React.ElementType;
    className?: string;
}

/**
 * Searchable smart select with a floating label.
 *
 * - Label floats up and takes the brand color on focus or when a value is selected.
 * - Built on HeadlessUI Combobox — keyboard navigation, ARIA, and search filter included.
 * - Solid brand colors only; follows the central customer theme.
 */
export function FloatingCombobox({
    label,
    options,
    value,
    onChange,
    disabled = false,
    disabledHint,
    leadingIcon: LeadingIcon,
    className,
}: FloatingComboboxProps) {
    const [query, setQuery] = useState('');

    // Refs used to forward clicks from the input to the toggle button so the
    // panel can be reopened after a selection (HeadlessUI's ComboboxInput
    // doesn't toggle on click by default — only ComboboxButton does).
    const inputRef = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const filtered =
        query === ''
            ? options
            : options.filter((o) =>
                  (o.searchLabel ?? o.label)
                      .toLowerCase()
                      .includes(query.trim().toLowerCase()),
              );

    const isFilled = value !== null;

    return (
        <div className={cn('relative w-full', className)}>
            <Combobox
                value={value}
                onChange={(v: ComboboxOptionItem | null) => {
                    onChange(v);
                    setQuery('');
                }}
                onClose={() => setQuery('')}
                disabled={disabled}
                immediate
            >
                <div
                    className={cn(
                        'group/field relative flex h-11 items-center rounded-lg border bg-white transition-colors',
                        'border-slate-200 hover:border-slate-300',
                        'focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:hover:border-brand-500',
                        'dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700',
                        'dark:focus-within:border-brand-400 dark:focus-within:ring-brand-400/20 dark:focus-within:hover:border-brand-400',
                        disabled &&
                            'cursor-not-allowed bg-slate-50 opacity-70 hover:border-slate-200 dark:bg-slate-900/40 dark:hover:border-slate-800',
                    )}
                >
                    {/* Leading icon */}
                    {LeadingIcon && (
                        <div
                            className={cn(
                                'pl-3 text-slate-400 transition-colors dark:text-slate-500',
                                isFilled &&
                                    'text-brand-600 dark:text-brand-400',
                                'group-focus-within/field:text-brand-600 dark:group-focus-within/field:text-brand-400',
                            )}
                        >
                            <LeadingIcon className="size-4" />
                        </div>
                    )}

                    {/* Floating label — bg-inherit so the cutout always matches the field bg,
                        including the disabled slate-50 state. */}
                    <label
                        className={cn(
                            'pointer-events-none absolute z-10 select-none bg-inherit px-1 font-medium transition-all duration-150',
                            LeadingIcon ? 'left-8' : 'left-3',
                            // Resting state
                            isFilled
                                ? '-top-2 text-[11px] text-slate-500 dark:text-slate-400'
                                : 'top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500',
                            // Focused state — always floats up + takes brand color
                            'group-focus-within/field:-top-2 group-focus-within/field:translate-y-0 group-focus-within/field:text-[11px] group-focus-within/field:text-brand-600 dark:group-focus-within/field:text-brand-400',
                        )}
                    >
                        {label}
                    </label>

                    <ComboboxInput
                        ref={inputRef}
                        autoComplete="off"
                        aria-label={label}
                        className={cn(
                            'h-full w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-transparent outline-none dark:text-slate-100',
                            LeadingIcon ? 'pl-2' : 'pl-3',
                            'pr-2',
                            disabled && 'cursor-not-allowed',
                            value?.displayLabel &&
                                query === '' &&
                                'text-transparent group-focus-within/field:text-slate-900 dark:text-transparent dark:group-focus-within/field:text-slate-100',
                        )}
                        displayValue={(o: ComboboxOptionItem | null) =>
                            o?.searchLabel ?? o?.label ?? ''
                        }
                        onChange={(e) => setQuery(e.target.value)}
                        // Reopen the panel when the user clicks the input after a
                        // selection (HeadlessUI doesn't do this on its own).
                        onClick={() => {
                            if (
                                !disabled &&
                                inputRef.current?.getAttribute('aria-expanded') !== 'true'
                            ) {
                                buttonRef.current?.click();
                            }
                        }}
                    />

                    {value?.displayLabel && query === '' && (
                        <span
                            aria-hidden="true"
                            className={cn(
                                'pointer-events-none absolute top-0 bottom-0 flex min-w-0 items-center overflow-hidden text-sm font-medium text-slate-900 dark:text-slate-100',
                                LeadingIcon ? 'left-9' : 'left-3',
                                value && !disabled ? 'right-16' : 'right-10',
                                'group-focus-within/field:hidden',
                            )}
                        >
                            {value.displayLabel}
                        </span>
                    )}

                    {/* Clear */}
                    {value && !disabled && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(null);
                                setQuery('');
                            }}
                            tabIndex={-1}
                            aria-label={`Clear ${label}`}
                            className="mr-0.5 flex size-6 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                            <XIcon className="size-3.5" />
                        </button>
                    )}

                    <ComboboxButton
                        ref={buttonRef}
                        className={cn(
                            'group/btn flex h-full w-9 cursor-pointer items-center justify-center rounded-r-lg text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200',
                            disabled && 'cursor-not-allowed',
                        )}
                    >
                        <ChevronDownIcon className="size-4 transition-transform duration-150 group-data-[open]/btn:rotate-180" />
                    </ComboboxButton>
                </div>

                <ComboboxOptions
                    transition
                    className={cn(
                        // Positioned inline (no portal) so the panel always matches
                        // the input's exact width via the parent's relative box.
                        'absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/[0.08] outline-none',
                        'dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40',
                        'origin-top transition duration-100 ease-out',
                        'data-[closed]:scale-95 data-[closed]:opacity-0',
                        'scrollbar-slim',
                    )}
                >
                    {/* Empty state */}
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-center">
                            <SearchIcon className="size-4 text-slate-300 dark:text-slate-600" />
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {query ? `No matches for "${query}"` : 'Nothing to choose yet'}
                            </p>
                        </div>
                    )}

                    {filtered.map((option) => (
                        <ComboboxOption
                            key={option.id}
                            value={option}
                            className={({ focus, selected }) =>
                                cn(
                                    'flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
                                    focus
                                        ? 'bg-brand-50 text-brand-900 dark:bg-brand-500/10 dark:text-brand-100'
                                        : 'text-slate-700 dark:text-slate-300',
                                    selected &&
                                        'bg-brand-50/60 font-semibold text-brand-800 dark:bg-brand-500/[0.07] dark:text-brand-200',
                                )
                            }
                        >
                            {({ selected }) => (
                                <>
                                    <span className="flex min-w-0 flex-col">
                                        <span className="truncate">
                                            {option.displayLabel ?? option.label}
                                        </span>
                                        {option.hint && (
                                            <span className="truncate text-[11px] font-normal text-slate-400 dark:text-slate-500">
                                                {option.hint}
                                            </span>
                                        )}
                                    </span>
                                    {selected && (
                                        <CheckIcon
                                            className="size-4 shrink-0 text-brand-600 dark:text-brand-400"
                                            strokeWidth={2.5}
                                        />
                                    )}
                                </>
                            )}
                        </ComboboxOption>
                    ))}
                </ComboboxOptions>
            </Combobox>

            {disabled && disabledHint && (
                <p className="mt-1.5 pl-1 text-[11px] text-slate-400 dark:text-slate-500">
                    {disabledHint}
                </p>
            )}
        </div>
    );
}

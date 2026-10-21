import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/tm';

export interface FormSelectOption {
    value: string;
    label: string;
}

export function QuestionFormSelect({
    value,
    onValueChange,
    options,
    placeholder,
    searchable = false,
    searchPlaceholder = 'Search options',
    disabled = false,
    onOpen,
}: {
    value: string;
    onValueChange: (value: string) => void;
    options: FormSelectOption[];
    placeholder: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    disabled?: boolean;
    onOpen?: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [position, setPosition] = useState({ left: 0, top: 0, width: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const listId = useId();
    const selected = options.find((option) => option.value === value);
    const visible =
        searchable && query.trim()
            ? options.filter((option) =>
                  option.label
                      .toLocaleLowerCase()
                      .includes(query.trim().toLocaleLowerCase()),
              )
            : options;

    useLayoutEffect(() => {
        if (!open) {
            return;
        }

        function updatePosition() {
            const rect = triggerRef.current?.getBoundingClientRect();

            if (!rect) {
                return;
            }

            const estimatedHeight = Math.min(
                300,
                options.length * 40 + (searchable ? 52 : 12),
            );
            const above =
                window.innerHeight - rect.bottom < estimatedHeight &&
                rect.top > estimatedHeight;

            setPosition({
                left: rect.left,
                top: above ? rect.top - estimatedHeight - 4 : rect.bottom + 4,
                width: rect.width,
            });
        }

        function handlePointerDown(event: PointerEvent) {
            const target = event.target as Node;

            if (
                !triggerRef.current?.contains(target) &&
                !menuRef.current?.contains(target)
            ) {
                setOpen(false);
                setQuery('');
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setOpen(false);
                setQuery('');
                triggerRef.current?.focus();
            }
        }

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, options.length, searchable]);

    function close() {
        setOpen(false);
        setQuery('');
        triggerRef.current?.focus();
    }

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                role="combobox"
                aria-label={placeholder}
                aria-controls={listId}
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={() => {
                    if (open) {
                        close();
                    } else {
                        setOpen(true);
                        onOpen?.();
                    }
                }}
                className="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
                <span
                    className={`truncate ${selected ? '' : 'text-slate-400'}`}
                >
                    {selected?.label ?? placeholder}
                </span>
                <ChevronDownIcon
                    className="size-4 shrink-0 text-slate-400"
                    aria-hidden="true"
                />
            </button>
            {open &&
                createPortal(
                    <div
                        ref={menuRef}
                        id={listId}
                        role="listbox"
                        style={{
                            left: position.left,
                            top: position.top,
                            width: position.width,
                        }}
                        className="fixed z-[70] min-w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                    >
                        {searchable && (
                            <Input
                                autoFocus
                                value={query}
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                                placeholder={searchPlaceholder}
                                className="mb-1.5"
                            />
                        )}
                        <div className="max-h-64 overflow-y-auto">
                            {visible.length === 0 ? (
                                <p className="px-3 py-4 text-center text-xs text-slate-500">
                                    No matches
                                </p>
                            ) : (
                                visible.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        role="option"
                                        aria-selected={option.value === value}
                                        onClick={() => {
                                            onValueChange(option.value);
                                            close();
                                        }}
                                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700 focus:bg-brand-50 focus:outline-none dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
                                    >
                                        <span className="min-w-0 truncate">
                                            {option.label}
                                        </span>
                                        {option.value === value && (
                                            <CheckIcon
                                                className="size-4 shrink-0 text-brand-600"
                                                aria-hidden="true"
                                            />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
}

import { Link, router } from '@inertiajs/react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
    Badge,
    Button,
    Card,
    Input,
    Modal,
    SearchInput,
} from '@/components/tm';

export type Page<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
    prev_page_url: string | null;
    next_page_url: string | null;
};

export type Filters = Record<string, string | number | undefined>;

export const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

export function StatusBadge({ active }: { active: boolean | number }) {
    return (
        <Badge tone={active ? 'saved' : 'neutral'}>
            {active ? 'Active' : 'Inactive'}
        </Badge>
    );
}

export function Pager({ page }: { page: Page<unknown> }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span className="tabular-nums">
                {page.total
                    ? `${page.from}–${page.to} of ${page.total}`
                    : 'No records'}
            </span>
            <div className="flex items-center gap-2">
                {page.prev_page_url ? (
                    <Button asChild size="icon-sm" aria-label="Previous page">
                        <Link href={page.prev_page_url} preserveScroll>
                            <ChevronLeftIcon />
                        </Link>
                    </Button>
                ) : (
                    <Button size="icon-sm" disabled aria-label="Previous page">
                        <ChevronLeftIcon />
                    </Button>
                )}
                <span className="min-w-14 text-center font-medium tabular-nums text-slate-700 dark:text-slate-200">
                    {page.current_page} / {page.last_page}
                </span>
                {page.next_page_url ? (
                    <Button asChild size="icon-sm" aria-label="Next page">
                        <Link href={page.next_page_url} preserveScroll>
                            <ChevronRightIcon />
                        </Link>
                    </Button>
                ) : (
                    <Button size="icon-sm" disabled aria-label="Next page">
                        <ChevronRightIcon />
                    </Button>
                )}
            </div>
        </div>
    );
}

export function FilterBar({
    url,
    filters,
    options = [],
}: {
    url: string;
    filters: Filters;
    options?: {
        key: string;
        label: string;
        choices: { value: string; label: string }[];
    }[];
}) {
    const [values, setValues] = useState<Filters>({
        status: 'all',
        ...filters,
    });
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get(url, values, { preserveState: true, replace: true });
    };

    return (
        <Card padding="sm" className="flex flex-wrap items-end gap-3">
            <form
                onSubmit={submit}
                className="flex w-full flex-wrap items-end gap-3"
            >
                <div className="min-w-48 flex-1 space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span>Search</span>
                    <SearchInput
                        aria-label="Search"
                        value={String(values.q ?? '')}
                        onValueChange={(value) =>
                            setValues({ ...values, q: value })
                        }
                        placeholder="Search"
                    />
                </div>
                {options.map((option) => (
                    <label
                        key={option.key}
                        className="min-w-36 space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300"
                    >
                        <span>{option.label}</span>
                        <select
                            value={values[option.key] ?? ''}
                            onChange={(event) =>
                                setValues({
                                    ...values,
                                    [option.key]: event.target.value,
                                })
                            }
                            className={selectClass}
                        >
                            {option.choices.map((choice) => (
                                <option key={choice.value} value={choice.value}>
                                    {choice.label}
                                </option>
                            ))}
                        </select>
                    </label>
                ))}
                <Button type="submit" variant="primary">
                    Apply
                </Button>
                <Button asChild variant="ghost">
                    <Link href={url}>Clear</Link>
                </Button>
            </form>
        </Card>
    );
}

export const statusChoices = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

export function EditModal({
    open,
    onClose,
    onSave,
    title,
    description,
    busy,
    children,
}: {
    open: boolean;
    onClose: () => void;
    onSave: (event: FormEvent<HTMLFormElement>) => void;
    title: string;
    description: string;
    busy: boolean;
    children: ReactNode;
}) {
    return (
        <Modal
            open={open}
            onOpenChange={(next) => !next && onClose()}
            title={title}
            footer={
                <>
                    <Button type="button" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="qat-edit-form"
                        variant="primary"
                        disabled={busy}
                    >
                        {busy ? 'Saving…' : 'Save changes'}
                    </Button>
                </>
            }
        >
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                {description}
            </p>
            <form id="qat-edit-form" onSubmit={onSave} className="space-y-4">
                {children}
            </form>
        </Modal>
    );
}

export { Input };
export const selectClass =
    'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-brand-400';
export const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-brand-400';
export const tableClass =
    'w-full text-left text-sm text-slate-700 dark:text-slate-200';
export const thClass =
    'border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400';
export const tdClass =
    'border-b border-slate-100 px-4 py-3 align-top dark:border-slate-800';

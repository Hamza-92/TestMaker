import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    CalendarIcon,
    CheckIcon,
    CheckSquareIcon,
    CopyIcon,
    LayersIcon,
    LayoutTemplateIcon,
    PencilIcon,
    PlusIcon,
    SparklesIcon,
    Trash2Icon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Button,
    Card,
    EmptyState,
    Input,
    notify,
    PageHeader,
    Pagination,
    SearchInput,
    SelectionBar,
} from '@/components/tm';
import type { PageMeta } from '@/components/tm';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '../papers/paper-layouts/confirm-dialog';

interface Template {
    id: number;
    name: string;
    description: string | null;
    section_count: number;
    total_marks: number;
    updated_at: string;
}

interface Props {
    items: PageMeta & { data: Template[] };
    /** Unfiltered total, so the header count holds steady while searching. */
    totalCount: number;
    filters?: { q?: string };
}

/** Violet is the system's tone for templates; it drives the tile and the
 *  hover shadow through --tm-accent. */
const TEMPLATE_ACCENT = 'oklch(0.606 0.25 292.717)';

function csrf(): string {
    return (
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
            ?.content ?? ''
    );
}

function describeFailure(status: number): string {
    if (status === 403) {
        return 'You can only change your own templates.';
    }

    if (status === 419) {
        return 'Your session expired. Refresh the page and try again.';
    }

    if (status >= 500) {
        return 'The server hit an error. Please try again.';
    }

    return 'Something went wrong. Please try again.';
}

function plural(n: number, noun: string): string {
    return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function TemplatesIndex({ items, totalCount, filters }: Props) {
    const [search, setSearch] = useState(filters?.q ?? '');
    const [renaming, setRenaming] = useState<Template | null>(null);
    const [deleting, setDeleting] = useState<Template | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [duplicatingId, setDuplicatingId] = useState<number | null>(null);

    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [selectionMode, setSelectionMode] = useState(false);
    const [bulkBusy, setBulkBusy] = useState(false);
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

    const rows = items.data;

    /** Search and page live in the URL; this is the only writer. */
    const navigate = useCallback(
        (patch: { q?: string; page?: number }) => {
            const q = patch.q !== undefined ? patch.q : (filters?.q ?? '');
            const page = patch.page ?? 1;
            const query: Record<string, string> = {};

            if (q) {
                query.q = q;
            }

            if (page > 1) {
                query.page = String(page);
            }

            router.get('/templates', query, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        },
        [filters?.q],
    );

    useEffect(() => {
        const handle = window.setTimeout(() => {
            if (search === (filters?.q ?? '')) {
                return;
            }

            navigate({ q: search, page: 1 });
        }, 300);

        return () => window.clearTimeout(handle);
    }, [search, filters?.q, navigate]);

    // Deleting a whole last page would otherwise strand you on an empty one.
    useEffect(() => {
        if (
            items.data.length === 0 &&
            items.total > 0 &&
            items.current_page > items.last_page
        ) {
            navigate({ page: items.last_page });
        }
    }, [
        items.data.length,
        items.total,
        items.current_page,
        items.last_page,
        navigate,
    ]);

    const selectableIds = useMemo(() => rows.map((t) => t.id), [rows]);
    const allSelected =
        selectableIds.length > 0 && selected.size === selectableIds.length;

    const listKey = `${filters?.q ?? ''}|${items.current_page}`;

    // Selection only ever covers rows you can see. Reset during render —
    // React's documented way to adjust state when a prop changes — because
    // doing it in an effect cascades an extra render.
    const [selectionScope, setSelectionScope] = useState(listKey);

    if (selectionScope !== listKey) {
        setSelectionScope(listKey);
        setSelected(new Set());
    }

    function toggleRow(id: number, on: boolean) {
        setSelected((prev) => {
            const next = new Set(prev);

            if (on) {
                next.add(id);
            } else {
                next.delete(id);
            }

            return next;
        });
    }

    function exitSelection() {
        setSelectionMode(false);
        setSelected(new Set());
    }

    function handleDelete() {
        if (!deleting || isDeleting) {
            return;
        }

        setIsDeleting(true);

        // An Inertia visit, so the server's flashed toast is what reports it.
        router.delete(`/templates/${deleting.id}`, {
            preserveScroll: true,
            onError: () =>
                notify.error('Could not delete template', {
                    description: 'Something went wrong. Please try again.',
                }),
            onFinish: () => {
                setIsDeleting(false);
                setDeleting(null);
            },
        });
    }

    async function handleDuplicate(template: Template) {
        if (duplicatingId !== null) {
            return;
        }

        setDuplicatingId(template.id);

        let res: Response;

        // Only the request is guarded — see DESIGN.md §8.
        try {
            res = await fetch(`/templates/${template.id}/duplicate`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrf(),
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            });
        } catch {
            setDuplicatingId(null);
            notify.error('Could not duplicate', {
                description: 'Check your connection and try again.',
            });

            return;
        }

        setDuplicatingId(null);

        if (!res.ok) {
            notify.error('Could not duplicate', {
                description: describeFailure(res.status),
            });

            return;
        }

        notify.success('Template duplicated');
        router.reload({ only: ['items', 'totalCount'] });
    }

    async function runBulkDelete() {
        const count = selected.size;

        if (bulkBusy || count === 0) {
            return;
        }

        setBulkBusy(true);

        let res: Response;

        try {
            res = await fetch('/templates/bulk/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf(),
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ ids: [...selected] }),
                credentials: 'same-origin',
            });
        } catch {
            setBulkBusy(false);
            setConfirmBulkDelete(false);
            notify.error(`Could not delete ${plural(count, 'template')}`, {
                description: 'Check your connection and try again.',
            });

            return;
        }

        setBulkBusy(false);
        setConfirmBulkDelete(false);

        if (!res.ok) {
            notify.error(`Could not delete ${plural(count, 'template')}`, {
                description: describeFailure(res.status),
            });

            return;
        }

        setSelected(new Set());
        notify.success(`${plural(count, 'template')} deleted`);
        router.reload({ only: ['items', 'totalCount'] });
    }

    return (
        <>
            <Head title="My Templates" />

            <div className="w-full space-y-5">
                <PageHeader
                    title="My Templates"
                    meta={plural(totalCount, 'template')}
                    actions={
                        <>
                            {!selectionMode && rows.length > 0 && (
                                <Button onClick={() => setSelectionMode(true)}>
                                    <CheckSquareIcon />
                                    Select
                                </Button>
                            )}
                            <Button asChild variant="primary">
                                <Link href="/papers/generate">
                                    <PlusIcon />
                                    New Paper
                                </Link>
                            </Button>
                        </>
                    }
                />

                <SearchInput
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Search templates"
                    className="sm:max-w-xs"
                />

                {selectionMode && (
                    <SelectionBar
                        count={selected.size}
                        onExit={exitSelection}
                        selectAll={{
                            total: selectableIds.length,
                            allSelected,
                            onToggle: (all) =>
                                setSelected(
                                    all ? new Set(selectableIds) : new Set(),
                                ),
                        }}
                    >
                        <Button
                            size="sm"
                            variant="danger"
                            disabled={bulkBusy || selected.size === 0}
                            onClick={() => setConfirmBulkDelete(true)}
                        >
                            <Trash2Icon />
                            Delete
                        </Button>
                    </SelectionBar>
                )}

                {rows.length === 0 && (
                    <EmptyState
                        icon={LayoutTemplateIcon}
                        title={
                            filters?.q
                                ? 'No templates match that search'
                                : 'No templates yet'
                        }
                        // Where templates come from is not discoverable from
                        // this screen, so that line stays.
                        hint={
                            filters?.q
                                ? undefined
                                : 'Save a paper layout as a template from the generator.'
                        }
                        action={
                            filters?.q ? (
                                <Button onClick={() => setSearch('')}>
                                    Clear search
                                </Button>
                            ) : (
                                <Button asChild variant="primary">
                                    <Link href="/papers/generate">
                                        <PlusIcon />
                                        New Paper
                                    </Link>
                                </Button>
                            )
                        }
                    />
                )}

                {rows.length > 0 && (
                    <>
                        <div
                            key={listKey}
                            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                        >
                            {rows.map((template, index) => {
                                const isSelected = selected.has(template.id);

                                return (
                                    <Card
                                        key={template.id}
                                        interactive={!selectionMode}
                                        {...(selectionMode
                                            ? {
                                                  role: 'checkbox',
                                                  'aria-checked': isSelected,
                                                  tabIndex: 0,
                                                  onClick: () =>
                                                      toggleRow(
                                                          template.id,
                                                          !isSelected,
                                                      ),
                                                  onKeyDown: (
                                                      e: React.KeyboardEvent,
                                                  ) => {
                                                      if (
                                                          e.key === 'Enter' ||
                                                          e.key === ' '
                                                      ) {
                                                          e.preventDefault();
                                                          toggleRow(
                                                              template.id,
                                                              !isSelected,
                                                          );
                                                      }
                                                  },
                                              }
                                            : {})}
                                        style={
                                            {
                                                '--tm-accent': TEMPLATE_ACCENT,
                                                animationDelay: `${Math.min(index, 9) * 28}ms`,
                                            } as React.CSSProperties
                                        }
                                        className={cn(
                                            'tm-appear flex flex-col justify-between',
                                            selectionMode &&
                                                'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                                            isSelected &&
                                                'border-brand-300 bg-brand-50/40 dark:border-brand-500/40 dark:bg-brand-500/[0.07]',
                                        )}
                                    >
                                        <div className="flex min-w-0 items-start gap-3">
                                            {/* Tile doubles as the selection
                                                indicator: glyph swaps, tint
                                                stays put. */}
                                            <div className="tm-accent-tile flex size-10 shrink-0 items-center justify-center rounded-lg">
                                                {isSelected ? (
                                                    <CheckIcon
                                                        className="size-5"
                                                        strokeWidth={2.5}
                                                    />
                                                ) : (
                                                    <LayoutTemplateIcon className="size-5" />
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                    {template.name}
                                                </p>

                                                {template.description && (
                                                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                                                        {template.description}
                                                    </p>
                                                )}

                                                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                                    <Badge>
                                                        <LayersIcon className="size-3" />
                                                        {plural(
                                                            template.section_count,
                                                            'section',
                                                        )}
                                                    </Badge>

                                                    {template.total_marks >
                                                        0 && (
                                                        <Badge tone="saved">
                                                            {
                                                                template.total_marks
                                                            }{' '}
                                                            marks
                                                        </Badge>
                                                    )}

                                                    <span className="flex items-center gap-1">
                                                        <CalendarIcon className="size-3" />
                                                        {formatDate(
                                                            template.updated_at,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div
                                            className={cn(
                                                'mt-4 flex items-center justify-between gap-2',
                                                selectionMode && 'hidden',
                                            )}
                                        >
                                            <Button
                                                asChild
                                                variant="primary"
                                                size="sm"
                                            >
                                                <Link
                                                    href={`/papers/generate?template=${template.id}`}
                                                >
                                                    <SparklesIcon />
                                                    Use
                                                </Link>
                                            </Button>

                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        setRenaming(template)
                                                    }
                                                    aria-label="Rename"
                                                    title="Rename"
                                                >
                                                    <PencilIcon />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        handleDuplicate(
                                                            template,
                                                        )
                                                    }
                                                    disabled={
                                                        duplicatingId ===
                                                        template.id
                                                    }
                                                    aria-label="Duplicate"
                                                    title="Duplicate"
                                                >
                                                    <CopyIcon />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        setDeleting(template)
                                                    }
                                                    aria-label="Delete"
                                                    title="Delete"
                                                    className="hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                                                >
                                                    <Trash2Icon />
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        <Pagination
                            meta={items}
                            label="templates"
                            onPageChange={(page) => navigate({ page })}
                        />
                    </>
                )}
            </div>

            {renaming && (
                <RenameTemplateDialog
                    template={renaming}
                    onClose={() => setRenaming(null)}
                />
            )}

            {confirmBulkDelete && (
                <ConfirmDialog
                    variant="danger"
                    title={`Delete ${plural(selected.size, 'template')}`}
                    message="This cannot be undone."
                    confirmLabel={bulkBusy ? 'Deleting…' : 'Delete'}
                    onConfirm={runBulkDelete}
                    onCancel={() => setConfirmBulkDelete(false)}
                />
            )}

            {deleting && (
                <ConfirmDialog
                    variant="danger"
                    title={`Delete "${deleting.name}"`}
                    message="This cannot be undone."
                    confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleting(null)}
                />
            )}
        </>
    );
}

interface RenameFormValues {
    name: string;
    description: string;
    [key: string]: string;
}

function RenameTemplateDialog({
    template,
    onClose,
}: {
    template: Template;
    onClose: () => void;
}) {
    const { data, setData, put, processing, errors } =
        useForm<RenameFormValues>({
            name: template.name,
            description: template.description ?? '',
        });

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                onClose();
            }
        }

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        put(`/templates/${template.id}`, { onSuccess: onClose });
    }

    return (
        <div
            role="presentation"
            onMouseDown={onClose}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4"
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="rename-template-title"
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <h2
                        id="rename-template-title"
                        className="text-base font-semibold text-slate-900 dark:text-slate-100"
                    >
                        Rename template
                    </h2>
                </div>

                <form onSubmit={submit} className="space-y-4 px-5 py-4">
                    <div className="space-y-1.5">
                        <label
                            htmlFor="template-name"
                            className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                        >
                            Name
                        </label>
                        <Input
                            id="template-name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            autoFocus
                        />
                        {errors.name && (
                            <p className="text-xs text-rose-600">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label
                            htmlFor="template-description"
                            className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                        >
                            Description
                        </label>
                        <Input
                            id="template-description"
                            value={data.description}
                            onChange={(e) =>
                                setData('description', e.target.value)
                            }
                            placeholder="Optional"
                        />
                        {errors.description && (
                            <p className="text-xs text-rose-600">
                                {errors.description}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <Button type="button" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={processing || !data.name.trim()}
                        >
                            Save
                        </Button>
                    </div>
                </form>
            </section>
        </div>
    );
}

import { Head, Link, router } from '@inertiajs/react';
import {
    BookmarkIcon,
    CalendarIcon,
    CheckIcon,
    CheckSquareIcon,
    CopyIcon,
    FileTextIcon,
    FolderIcon,
    FolderPlusIcon,
    GraduationCapIcon,
    InboxIcon,
    MoreHorizontalIcon,
    PencilIcon,
    PlusIcon,
    Trash2Icon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
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
    Tabs,
} from '@/components/tm';
import type { PageMeta } from '@/components/tm';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from './paper-layouts/confirm-dialog';

interface Paper {
    id: number;
    name: string;
    subject: string | null;
    class_name: string | null;
    total_marks: number;
    folder_id?: number | null;
    created_at: string;
    updated_at: string;
    author_name?: string | null;
    is_mine?: boolean;
}

interface Folder {
    id: number;
    name: string;
    color: string | null;
    papers_count: number;
}

type Tab = 'papers' | 'drafts';

interface Props {
    /** Current page of the active tab only. */
    items: PageMeta & { data: Paper[] };
    /** Totals for both tabs, so the badges stay right without loading rows. */
    counts: { papers: number; drafts: number };
    /** Folder-independent totals for the sidebar's fixed rows. */
    sidebar: { all: number; unfiled: number };
    folders?: Folder[];
    filters?: { q?: string; folder?: string | null; tab?: Tab };
}

function csrf(): string {
    return (
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
            ?.content ?? ''
    );
}

/** Turns a status code into something worth reading. */
function describeFailure(status: number): string {
    if (status === 403) {
        return 'You can only change papers you own.';
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

async function postJson(url: string, body: unknown): Promise<Response> {
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrf(),
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json',
        },
        body: JSON.stringify(body),
        credentials: 'same-origin',
    });
}

export default function PapersIndex({
    items,
    counts,
    sidebar,
    folders = [],
    filters,
}: Props) {
    const activeTab: Tab = filters?.tab ?? 'papers';
    const activeFolder = filters?.folder ?? null;

    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [search, setSearch] = useState(filters?.q ?? '');
    const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
    const [movingPaper, setMovingPaper] = useState<Paper | null>(null);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [renamingFolder, setRenamingFolder] = useState<Folder | null>(null);
    const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);

    // Selection applies to the visible page and is dropped on any navigation
    // — acting on rows you can no longer see is how people delete the wrong
    // thing.
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [selectionMode, setSelectionMode] = useState(false);
    const [bulkBusy, setBulkBusy] = useState(false);
    const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

    /** Tab, folder, search and page all live in the URL; this is the one writer. */
    const navigate = useCallback(
        (patch: {
            tab?: Tab;
            folder?: string | null;
            q?: string;
            page?: number;
        }) => {
            const tab = patch.tab ?? activeTab;
            const folder =
                patch.folder !== undefined ? patch.folder : activeFolder;
            const q = patch.q !== undefined ? patch.q : (filters?.q ?? '');
            const page = patch.page ?? 1;

            const query: Record<string, string> = {};

            if (tab === 'drafts') {
                query.tab = 'drafts';
            }

            if (folder) {
                query.folder = folder;
            }

            if (q) {
                query.q = q;
            }

            if (page > 1) {
                query.page = String(page);
            }

            router.get('/papers', query, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        },
        [activeTab, activeFolder, filters?.q],
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

    // Drop the selection whenever the visible rows change.
    useEffect(() => {
        setSelected(new Set());
    }, [items.current_page, filters?.tab, filters?.q, filters?.folder]);

    // Deleting or moving everything on the last page leaves you stranded on
    // an out-of-range page showing nothing. Self-heal back to the last real
    // page — this also covers a hand-edited ?page= in the URL.
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

    const rows = items.data;

    /**
     * Remounts the list whenever the visible set changes, so the entrance
     * animation replays on paging, tab switches, folder changes and search
     * rather than only on first mount.
     */
    const listKey = [
        activeTab,
        activeFolder ?? '',
        filters?.q ?? '',
        items.current_page,
    ].join('|');

    /**
     * Folder colour by id, so a paper's leading tile shows which folder it
     * belongs to. That is the only way to tell them apart in "All Papers",
     * where rows from every folder are interleaved.
     */
    const folderColorById = useMemo(
        () => new Map(folders.map((f) => [f.id, f.color])),
        [folders],
    );

    /** Only owned papers can be bulk-acted on; the server enforces this too. */
    const selectableIds = useMemo(
        () => rows.filter((p) => p.is_mine !== false).map((p) => p.id),
        [rows],
    );
    const selectedIds = useMemo(() => [...selected], [selected]);
    const allSelected =
        selectableIds.length > 0 && selected.size === selectableIds.length;

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

    function toggleAll(on: boolean) {
        setSelected(on ? new Set(selectableIds) : new Set());
    }

    function exitSelection() {
        setSelectionMode(false);
        setSelected(new Set());
    }

    async function runBulk(
        url: string,
        verb: string,
        past: string,
        body: Record<string, unknown> = {},
    ): Promise<void> {
        if (bulkBusy || selectedIds.length === 0) {
            return;
        }

        const count = selectedIds.length;

        setBulkBusy(true);

        let res: Response;

        try {
            res = await postJson(url, { ids: selectedIds, ...body });
        } catch {
            setBulkBusy(false);
            setBulkMoveOpen(false);
            setConfirmBulkDelete(false);
            notify.error(`Could not ${verb} ${plural(count, 'paper')}`, {
                description: 'Check your connection and try again.',
            });

            return;
        }

        setBulkBusy(false);
        setBulkMoveOpen(false);
        setConfirmBulkDelete(false);

        // The response used to go uninspected, so a 403 or a validation
        // failure reloaded the page and looked like success.
        if (!res.ok) {
            notify.error(`Could not ${verb} ${plural(count, 'paper')}`, {
                description: describeFailure(res.status),
            });

            return;
        }

        setSelected(new Set());
        router.reload();
        notify.success(`${plural(count, 'paper')} ${past}`);
    }

    function handleDeleteFolder() {
        const folder = deletingFolder;

        if (!folder) {
            return;
        }

        router.delete(`/paper-folders/${folder.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                notify.success(`Folder "${folder.name}" deleted`, {
                    description: 'Its papers moved to Unfiled.',
                });

                if (activeFolder === String(folder.id)) {
                    navigate({ folder: null, page: 1 });
                }
            },
            onError: () =>
                notify.error('Could not delete folder', {
                    description: 'Something went wrong. Please try again.',
                }),
            onFinish: () => setDeletingFolder(null),
        });
    }

    function confirmDelete(id: number) {
        setDeletingId(id);
    }

    async function handleDelete() {
        if (deletingId === null || isDeleting) {
            return;
        }

        const id = deletingId;

        setIsDeleting(true);

        let res: Response;

        // Only the request is guarded. Wrapping the follow-up work too meant
        // a throw inside the success branch surfaced as "check your
        // connection", blaming the network for a client-side error.
        try {
            res = await fetch(`/papers/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': csrf(),
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            });
        } catch {
            setIsDeleting(false);
            setDeletingId(null);
            notify.error('Could not delete', {
                description: 'Check your connection and try again.',
            });

            return;
        }

        setIsDeleting(false);
        setDeletingId(null);

        if (!res.ok) {
            notify.error('Could not delete', {
                description: describeFailure(res.status),
            });

            return;
        }

        notify.success(
            activeTab === 'drafts' ? 'Draft deleted' : 'Paper deleted',
        );
        router.reload({ only: ['items', 'counts', 'sidebar'] });
    }

    async function handleDuplicate(paper: Paper) {
        if (duplicatingId !== null) {
            return;
        }

        setDuplicatingId(paper.id);

        try {
            const res = await fetch(`/papers/${paper.id}/duplicate`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrf(),
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            });

            if (res.ok) {
                notify.success('Paper duplicated');
                router.reload({
                    only: ['items', 'counts', 'folders', 'sidebar'],
                });
            } else {
                notify.error('Could not duplicate', {
                    description: describeFailure(res.status),
                });
            }
        } catch {
            notify.error('Could not duplicate', {
                description: 'Check your connection and try again.',
            });
        } finally {
            setDuplicatingId(null);
        }
    }

    async function movePaperToFolder(paper: Paper, folderId: number | null) {
        const target = folderId
            ? (folders.find((f) => f.id === folderId)?.name ?? 'folder')
            : 'Unfiled';

        try {
            const res = await fetch(`/papers/${paper.id}/folder`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf(),
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ folder_id: folderId }),
                credentials: 'same-origin',
            });

            if (res.ok) {
                router.reload({
                    only: ['items', 'counts', 'folders', 'sidebar'],
                });
                notify.success(`Moved to ${target}`);
            } else {
                notify.error('Could not move paper', {
                    description: describeFailure(res.status),
                });
            }
        } catch {
            notify.error('Could not move paper', {
                description: 'Check your connection and try again.',
            });
        } finally {
            setMovingPaper(null);
        }
    }

    function formatDate(isoString: string) {
        return new Date(isoString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }

    return (
        <>
            <Head title="My Papers" />

            <div className="w-full space-y-5">
                <PageHeader
                    title="My Papers"
                    meta={
                        <>
                            {counts.papers} saved &middot; {counts.drafts} draft
                            {counts.drafts !== 1 ? 's' : ''}
                        </>
                    }
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

                <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                    <aside className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                Folders
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsFolderModalOpen(true)}
                                title="New folder"
                                className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-800"
                            >
                                <FolderPlusIcon className="size-4" />
                            </button>
                        </div>

                        <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
                            <FolderRow
                                icon={<InboxIcon className="size-4" />}
                                label="All Papers"
                                count={sidebar.all}
                                active={!activeFolder}
                                onClick={() =>
                                    navigate({ folder: null, page: 1 })
                                }
                            />
                            <FolderRow
                                icon={<FileTextIcon className="size-4" />}
                                label="Unfiled"
                                count={sidebar.unfiled}
                                active={activeFolder === 'unfiled'}
                                onClick={() =>
                                    navigate({ folder: 'unfiled', page: 1 })
                                }
                            />
                            {folders.map((folder) => (
                                <FolderRow
                                    key={folder.id}
                                    icon={
                                        <FolderIcon
                                            className="size-4"
                                            style={{
                                                color:
                                                    folder.color ?? undefined,
                                            }}
                                        />
                                    }
                                    label={folder.name}
                                    count={folder.papers_count}
                                    active={activeFolder === String(folder.id)}
                                    onClick={() =>
                                        navigate({
                                            folder: String(folder.id),
                                            page: 1,
                                        })
                                    }
                                    onRename={() => setRenamingFolder(folder)}
                                    onDelete={() => setDeletingFolder(folder)}
                                />
                            ))}
                        </div>
                    </aside>

                    <div className="min-w-0 space-y-5">
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <Tabs
                                value={activeTab}
                                onChange={(tab) => navigate({ tab, page: 1 })}
                                items={[
                                    {
                                        value: 'papers',
                                        label: 'Saved Papers',
                                        count: counts.papers,
                                    },
                                    {
                                        value: 'drafts',
                                        label: 'Drafts',
                                        count: counts.drafts,
                                    },
                                ]}
                            />

                            <SearchInput
                                value={search}
                                onValueChange={setSearch}
                                placeholder="Search papers"
                                className="w-full sm:max-w-xs"
                            />
                        </div>

                        {selectionMode && (
                            <SelectionBar
                                count={selected.size}
                                onExit={exitSelection}
                                selectAll={{
                                    total: selectableIds.length,
                                    allSelected,
                                    onToggle: toggleAll,
                                }}
                            >
                                <Button
                                    size="sm"
                                    disabled={bulkBusy || selected.size === 0}
                                    onClick={() => setBulkMoveOpen(true)}
                                >
                                    <FolderIcon />
                                    Move
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={bulkBusy || selected.size === 0}
                                    onClick={() =>
                                        runBulk(
                                            '/papers/bulk/duplicate',
                                            'duplicate',
                                            'duplicated',
                                        )
                                    }
                                >
                                    <CopyIcon />
                                    Duplicate
                                </Button>
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

                        {/* Empty state */}
                        {rows.length === 0 && (
                            <EmptyState
                                icon={FileTextIcon}
                                title={
                                    activeTab === 'papers'
                                        ? 'No papers yet'
                                        : 'No drafts yet'
                                }
                                // Only the drafts case earns a hint: where drafts come
                                // from is genuinely not guessable from this screen.
                                hint={
                                    activeTab === 'drafts'
                                        ? 'Drafts are saved from the generator when you go back.'
                                        : undefined
                                }
                                action={
                                    activeTab === 'papers' ? (
                                        <Button asChild variant="primary">
                                            <Link href="/papers/generate">
                                                <PlusIcon />
                                                New Paper
                                            </Link>
                                        </Button>
                                    ) : undefined
                                }
                            />
                        )}

                        {/* List */}
                        {rows.length > 0 && (
                            <div key={listKey} className="space-y-3">
                                {rows.map((paper, index) => {
                                    const isSelected = selected.has(paper.id);
                                    // Unfiled papers have no folder colour and
                                    // keep the default tone below.
                                    const accent =
                                        (paper.folder_id
                                            ? folderColorById.get(
                                                  paper.folder_id,
                                              )
                                            : null) ?? null;
                                    // Colleagues' papers are visible but not
                                    // actionable, so they stay inert in
                                    // selection mode.
                                    const selectable =
                                        selectionMode &&
                                        paper.is_mine !== false;

                                    return (
                                        <Card
                                            key={paper.id}
                                            interactive={!selectionMode}
                                            {...(selectable
                                                ? {
                                                      role: 'checkbox',
                                                      'aria-checked':
                                                          isSelected,
                                                      tabIndex: 0,
                                                      onClick: () =>
                                                          toggleRow(
                                                              paper.id,
                                                              !isSelected,
                                                          ),
                                                      onKeyDown: (
                                                          e: React.KeyboardEvent,
                                                      ) => {
                                                          if (
                                                              e.key ===
                                                                  'Enter' ||
                                                              e.key === ' '
                                                          ) {
                                                              e.preventDefault();
                                                              toggleRow(
                                                                  paper.id,
                                                                  !isSelected,
                                                              );
                                                          }
                                                      },
                                                  }
                                                : {})}
                                            style={
                                                {
                                                    ...(accent
                                                        ? {
                                                              '--tm-accent':
                                                                  accent,
                                                          }
                                                        : {}),
                                                    // Capped so a full page of
                                                    // 25 does not take a second
                                                    // to finish arriving.
                                                    animationDelay: `${Math.min(index, 9) * 28}ms`,
                                                } as React.CSSProperties
                                            }
                                            className={cn(
                                                'tm-appear flex items-center justify-between gap-4',
                                                selectable &&
                                                    'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                                                selectionMode &&
                                                    paper.is_mine === false &&
                                                    'opacity-50',
                                                isSelected &&
                                                    'border-brand-300 bg-brand-50/40 dark:border-brand-500/40 dark:bg-brand-500/[0.07]',
                                            )}
                                        >
                                            <div className="flex min-w-0 items-center gap-3.5">
                                                {/* The leading tile doubles as the
                                                selection indicator: bookmark at
                                                rest, tick once selected. */}
                                                <div
                                                    className={cn(
                                                        'flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                                                        // Filed papers wear their
                                                        // folder's colour; the
                                                        // glyph swap alone carries
                                                        // the selected state, so
                                                        // the tint never changes.
                                                        accent
                                                            ? 'tm-accent-tile'
                                                            : activeTab ===
                                                                'drafts'
                                                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                                                              : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
                                                    )}
                                                >
                                                    {isSelected ? (
                                                        <CheckIcon
                                                            className="size-5"
                                                            strokeWidth={2.5}
                                                        />
                                                    ) : (
                                                        <BookmarkIcon className="size-5" />
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                            {paper.name}
                                                        </p>
                                                        {activeTab ===
                                                            'drafts' && (
                                                            <Badge tone="draft">
                                                                Draft
                                                            </Badge>
                                                        )}
                                                        {paper.is_mine ===
                                                            false &&
                                                            paper.author_name && (
                                                                <Badge>
                                                                    {
                                                                        paper.author_name
                                                                    }
                                                                </Badge>
                                                            )}
                                                    </div>

                                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                                        {paper.subject && (
                                                            <span className="flex items-center gap-1">
                                                                <FileTextIcon className="size-3.5" />
                                                                {paper.subject}
                                                            </span>
                                                        )}
                                                        {paper.class_name && (
                                                            <span className="flex items-center gap-1">
                                                                <GraduationCapIcon className="size-3.5" />
                                                                {
                                                                    paper.class_name
                                                                }
                                                            </span>
                                                        )}
                                                        {paper.total_marks >
                                                            0 && (
                                                            <Badge>
                                                                {
                                                                    paper.total_marks
                                                                }{' '}
                                                                marks
                                                            </Badge>
                                                        )}
                                                        <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                                                            <CalendarIcon className="size-3.5" />
                                                            {formatDate(
                                                                paper.updated_at,
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className={cn(
                                                    'flex shrink-0 items-center gap-1.5',
                                                    selectionMode && 'hidden',
                                                )}
                                            >
                                                {paper.is_mine !== false ? (
                                                    <>
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                        >
                                                            <Link
                                                                href={`/papers/${paper.id}/edit`}
                                                            >
                                                                {activeTab ===
                                                                'drafts'
                                                                    ? 'Continue'
                                                                    : 'Open'}
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() =>
                                                                setMovingPaper(
                                                                    paper,
                                                                )
                                                            }
                                                            aria-label="Move to folder"
                                                            title="Move to folder"
                                                        >
                                                            <FolderIcon />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() =>
                                                                handleDuplicate(
                                                                    paper,
                                                                )
                                                            }
                                                            disabled={
                                                                duplicatingId ===
                                                                paper.id
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
                                                                confirmDelete(
                                                                    paper.id,
                                                                )
                                                            }
                                                            aria-label="Delete"
                                                            title="Delete"
                                                            className="hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                                                        >
                                                            <Trash2Icon />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button asChild size="sm">
                                                        <Link
                                                            href={`/papers/${paper.id}/edit`}
                                                        >
                                                            View
                                                        </Link>
                                                    </Button>
                                                )}
                                            </div>
                                        </Card>
                                    );
                                })}

                                <Pagination
                                    meta={items}
                                    label={
                                        activeTab === 'drafts'
                                            ? 'drafts'
                                            : 'papers'
                                    }
                                    onPageChange={(page) => navigate({ page })}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isFolderModalOpen && (
                <FolderModal
                    onClose={() => setIsFolderModalOpen(false)}
                    onCreated={() => {
                        setIsFolderModalOpen(false);
                        router.reload({ only: ['folders'] });
                        notify.success('Folder created');
                    }}
                />
            )}

            {renamingFolder && (
                <FolderModal
                    folder={renamingFolder}
                    onClose={() => setRenamingFolder(null)}
                    onCreated={() => {
                        setRenamingFolder(null);
                        router.reload({ only: ['folders'] });
                        notify.success('Folder renamed');
                    }}
                />
            )}

            {movingPaper && (
                <MoveToFolderDialog
                    paper={movingPaper}
                    folders={folders}
                    onClose={() => setMovingPaper(null)}
                    onMove={(folderId) =>
                        movePaperToFolder(movingPaper, folderId)
                    }
                />
            )}

            {bulkMoveOpen && (
                <MoveToFolderDialog
                    title={`Move ${selected.size} paper${selected.size !== 1 ? 's' : ''}`}
                    folders={folders}
                    onClose={() => setBulkMoveOpen(false)}
                    onMove={(folderId) =>
                        runBulk('/papers/bulk/move', 'move', 'moved', {
                            folder_id: folderId,
                        })
                    }
                />
            )}

            {deletingFolder && (
                <ConfirmDialog
                    variant="danger"
                    title={`Delete "${deletingFolder.name}"`}
                    message="Papers inside will be moved to Unfiled."
                    confirmLabel="Delete folder"
                    onConfirm={handleDeleteFolder}
                    onCancel={() => setDeletingFolder(null)}
                />
            )}

            {confirmBulkDelete && (
                <ConfirmDialog
                    variant="danger"
                    title={`Delete ${selected.size} paper${selected.size !== 1 ? 's' : ''}`}
                    message="This cannot be undone."
                    confirmLabel={bulkBusy ? 'Deleting…' : 'Delete'}
                    onConfirm={() =>
                        runBulk('/papers/bulk/delete', 'delete', 'deleted')
                    }
                    onCancel={() => setConfirmBulkDelete(false)}
                />
            )}

            {deletingId !== null && (
                <ConfirmDialog
                    variant="danger"
                    title={
                        activeTab === 'drafts' ? 'Delete Draft' : 'Delete Paper'
                    }
                    message="This cannot be undone."
                    confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
                    onConfirm={handleDelete}
                    onCancel={() => setDeletingId(null)}
                />
            )}
        </>
    );
}

function FolderRow({
    icon,
    label,
    count,
    active,
    onClick,
    onRename,
    onDelete,
}: {
    icon: ReactNode;
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
    onRename?: () => void;
    onDelete?: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuFocused, setMenuFocused] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) {
            return;
        }

        function onOutside(e: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', onOutside);

        return () => document.removeEventListener('mousedown', onOutside);
    }, [menuOpen]);

    const hasMenu = Boolean(onRename || onDelete);
    // Open OR keyboard-focused: in both cases the trigger takes the count's
    // place, so the two never overlap.
    const showMenu = menuOpen || menuFocused;

    return (
        <div className="group relative">
            <button
                type="button"
                onClick={onClick}
                className={cn(
                    'flex w-full cursor-pointer items-center gap-2 rounded-lg py-2 pr-2 pl-2.5 text-sm transition-colors',
                    active
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
            >
                {icon}
                <span className="min-w-0 flex-1 truncate text-left">
                    {label}
                </span>

                {/* The count and the menu trigger share one slot. Nothing is
                    reserved, so every row's count sits at the same right edge
                    and the trigger simply takes its place on hover. */}
                <span
                    className={cn(
                        'transition-opacity',
                        hasMenu && 'group-hover:opacity-0',
                        showMenu && 'opacity-0',
                    )}
                >
                    <Badge tone={active ? 'info' : 'neutral'}>{count}</Badge>
                </span>
            </button>

            {/* Sibling, not nested — a button inside a button is invalid and
                the old role="span" trigger could not be reached by keyboard. */}
            {hasMenu && (
                <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    onFocus={() => setMenuFocused(true)}
                    onBlur={() => setMenuFocused(false)}
                    aria-label={`Options for ${label}`}
                    aria-expanded={menuOpen}
                    className={cn(
                        'absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-slate-400 transition-opacity outline-none',
                        'hover:bg-slate-200 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-slate-700 dark:hover:text-slate-100',
                        showMenu
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100',
                    )}
                >
                    <MoreHorizontalIcon className="size-4" />
                </button>
            )}
            {menuOpen && (
                <div
                    ref={menuRef}
                    className="absolute top-full right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900"
                >
                    {onRename && (
                        <button
                            type="button"
                            onClick={() => {
                                setMenuOpen(false);
                                onRename();
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            <PencilIcon className="size-3.5" />
                            Rename
                        </button>
                    )}
                    {onDelete && (
                        <button
                            type="button"
                            onClick={() => {
                                setMenuOpen(false);
                                onDelete();
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                        >
                            <Trash2Icon className="size-3.5" />
                            Delete
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

const FOLDER_COLORS: Array<{ value: string; className: string }> = [
    { value: '#94a3b8', className: 'bg-slate-400' },
    { value: '#3b82f6', className: 'bg-blue-500' },
    { value: '#10b981', className: 'bg-emerald-500' },
    { value: '#f59e0b', className: 'bg-amber-500' },
    { value: '#f43f5e', className: 'bg-rose-500' },
    { value: '#8b5cf6', className: 'bg-violet-500' },
];

function FolderModal({
    folder,
    onClose,
    onCreated,
}: {
    folder?: Folder;
    onClose: () => void;
    onCreated: () => void;
}) {
    const [name, setName] = useState(folder?.name ?? '');
    const [color, setColor] = useState(folder?.color ?? '#94a3b8');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                onClose();
            }
        }
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();

        if (!name.trim() || saving) {
            return;
        }

        setSaving(true);

        if (folder) {
            router.put(
                `/paper-folders/${folder.id}`,
                { name: name.trim(), color },
                {
                    onSuccess: () => onCreated(),
                    onFinish: () => setSaving(false),
                    preserveScroll: true,
                },
            );
        } else {
            const res = await fetch('/paper-folders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf(),
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ name: name.trim(), color }),
                credentials: 'same-origin',
            });
            setSaving(false);

            if (res.ok) {
                onCreated();
            }
        }
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
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {folder ? 'Rename Folder' : 'New Folder'}
                    </h2>
                </div>
                <form onSubmit={submit} className="space-y-4 px-5 py-4">
                    <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                            Name
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            placeholder="e.g. Term 1 2026"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                            Color
                        </label>
                        <div className="flex gap-2">
                            {FOLDER_COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setColor(c.value)}
                                    className={cn(
                                        'size-7 rounded-full ring-offset-2 transition-all dark:ring-offset-slate-900',
                                        c.className,
                                        color === c.value &&
                                            'ring-2 ring-brand-500',
                                    )}
                                    aria-label={c.value}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || saving}
                            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                        >
                            {saving ? 'Saving…' : folder ? 'Save' : 'Create'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

function MoveToFolderDialog({
    paper,
    title,
    folders,
    onClose,
    onMove,
}: {
    /** Omitted for bulk moves, where there is no single current folder. */
    paper?: Paper;
    title?: string;
    folders: Folder[];
    onClose: () => void;
    onMove: (folderId: number | null) => void;
}) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                onClose();
            }
        }
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            role="presentation"
            onMouseDown={onClose}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4"
        >
            <section
                role="dialog"
                aria-modal="true"
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {title ?? 'Move to folder'}
                    </h2>
                    {paper && (
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                            {paper.name}
                        </p>
                    )}
                </div>
                <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                    <button
                        type="button"
                        onClick={() => onMove(null)}
                        className={cn(
                            'flex w-full items-center gap-2.5 px-5 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800',
                            paper?.folder_id === null &&
                                'bg-brand-50 dark:bg-brand-500/10',
                        )}
                    >
                        <InboxIcon className="size-4 text-slate-400" />
                        <span className="font-medium">Unfiled</span>
                    </button>
                    {folders.map((folder) => (
                        <button
                            key={folder.id}
                            type="button"
                            onClick={() => onMove(folder.id)}
                            className={cn(
                                'flex w-full items-center gap-2.5 px-5 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800',
                                paper?.folder_id === folder.id &&
                                    'bg-brand-50 dark:bg-brand-500/10',
                            )}
                        >
                            <FolderIcon
                                className="size-4"
                                style={{ color: folder.color ?? undefined }}
                            />
                            <span className="min-w-0 flex-1 truncate text-left font-medium">
                                {folder.name}
                            </span>
                            <span className="text-xs text-slate-400">
                                {folder.papers_count}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="border-t border-slate-100 px-5 py-3 text-right dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    >
                        Cancel
                    </button>
                </div>
            </section>
        </div>
    );
}

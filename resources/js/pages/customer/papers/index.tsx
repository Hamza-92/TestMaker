import { Head, Link, router } from '@inertiajs/react';
import {
    BookmarkIcon,
    CalendarIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CopyIcon,
    FileTextIcon,
    FolderIcon,
    FolderPlusIcon,
    GraduationCapIcon,
    InboxIcon,
    MoreHorizontalIcon,
    PencilIcon,
    PlusIcon,
    SearchIcon,
    Trash2Icon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
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

interface Props {
    papers: Paper[];
    drafts: Paper[];
    folders?: Folder[];
    filters?: { q?: string; folder?: string | null };
}

const PAGE_SIZE = 25;

function csrf(): string {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

export default function PapersIndex({ papers, drafts = [], folders = [], filters }: Props) {
    const [activeTab, setActiveTab] = useState<'papers' | 'drafts'>('papers');
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [search, setSearch] = useState(filters?.q ?? '');
    const [page, setPage] = useState(1);
    const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
    const [movingPaper, setMovingPaper] = useState<Paper | null>(null);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [renamingFolder, setRenamingFolder] = useState<Folder | null>(null);
    const activeFolder = filters?.folder ?? null;

    function goToFolder(folder: string | null) {
        const query: Record<string, string> = {};
        if (search) query.q = search;
        if (folder) query.folder = folder;
        router.get('/papers', query, { preserveState: true, preserveScroll: true, replace: true });
    }

    useEffect(() => {
        const handle = window.setTimeout(() => {
            const current = filters?.q ?? '';
            if (search === current) return;
            const query: Record<string, string> = {};
            if (search) query.q = search;
            if (activeFolder) query.folder = activeFolder;
            router.get('/papers', query, { preserveState: true, preserveScroll: true, replace: true });
        }, 300);
        return () => window.clearTimeout(handle);
    }, [search, filters?.q, activeFolder]);

    useEffect(() => {
        setPage(1);
    }, [activeTab, filters?.q, filters?.folder]);

    function confirmDelete(id: number) {
        setDeletingId(id);
    }

    function handleDelete() {
        if (deletingId === null || isDeleting) return;

        setIsDeleting(true);

        fetch(`/papers/${deletingId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': csrf(),
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
            },
            credentials: 'same-origin',
        }).finally(() => {
            setIsDeleting(false);
            setDeletingId(null);
            router.reload({ only: ['papers', 'drafts'] });
        });
    }

    async function handleDuplicate(paper: Paper) {
        if (duplicatingId !== null) return;
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
                router.reload({ only: ['papers', 'drafts', 'folders'] });
            }
        } finally {
            setDuplicatingId(null);
        }
    }

    async function movePaperToFolder(paper: Paper, folderId: number | null) {
        await fetch(`/papers/${paper.id}/folder`, {
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
        setMovingPaper(null);
        router.reload({ only: ['papers', 'drafts', 'folders'] });
    }

    function formatDate(isoString: string) {
        return new Date(isoString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }

    const items = activeTab === 'papers' ? papers : drafts;
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageItems = useMemo(
        () => items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
        [items, currentPage],
    );

    return (
        <>
            <Head title="My Papers" />

            <div className="mx-auto max-w-6xl space-y-5">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                            My Papers
                        </h1>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            {papers.length} saved &middot; {drafts.length} draft{drafts.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <Link
                        href="/papers/generate"
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400"
                    >
                        <PlusIcon className="size-4" />
                        Generate New Paper
                    </Link>
                </div>

                <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                    <aside className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
                                count={papers.length + drafts.length}
                                active={!activeFolder}
                                onClick={() => goToFolder(null)}
                            />
                            <FolderRow
                                icon={<FileTextIcon className="size-4" />}
                                label="Unfiled"
                                count={
                                    papers.filter((p) => !p.folder_id).length +
                                    drafts.filter((p) => !p.folder_id).length
                                }
                                active={activeFolder === 'unfiled'}
                                onClick={() => goToFolder('unfiled')}
                            />
                            {folders.map((folder) => (
                                <FolderRow
                                    key={folder.id}
                                    icon={
                                        <FolderIcon
                                            className="size-4"
                                            style={{ color: folder.color ?? undefined }}
                                        />
                                    }
                                    label={folder.name}
                                    count={folder.papers_count}
                                    active={activeFolder === String(folder.id)}
                                    onClick={() => goToFolder(String(folder.id))}
                                    onRename={() => setRenamingFolder(folder)}
                                    onDelete={() => {
                                        if (confirm(`Delete folder "${folder.name}"? Papers inside will be moved to Unfiled.`)) {
                                            router.delete(`/paper-folders/${folder.id}`, {
                                                onSuccess: () => {
                                                    if (activeFolder === String(folder.id)) {
                                                        goToFolder(null);
                                                    }
                                                },
                                            });
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    </aside>

                    <div className="min-w-0 space-y-5">

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900 sm:flex-1">
                        <TabButton
                            active={activeTab === 'papers'}
                            onClick={() => setActiveTab('papers')}
                            count={papers.length}
                        >
                            Saved Papers
                        </TabButton>
                        <TabButton
                            active={activeTab === 'drafts'}
                            onClick={() => setActiveTab('drafts')}
                            count={drafts.length}
                        >
                            Drafts
                        </TabButton>
                    </div>

                    <div className="relative w-full sm:max-w-xs">
                        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, subject, class"
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Empty state */}
                {items.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center dark:border-slate-700 dark:bg-slate-900">
                        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                            <FileTextIcon className="size-7" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
                            {activeTab === 'papers' ? 'No papers saved yet' : 'No drafts saved yet'}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {activeTab === 'papers'
                                ? 'Generate a paper and save it to see it here.'
                                : 'Use "Save as Draft" when going back to save your work in progress.'}
                        </p>
                        {activeTab === 'papers' && (
                            <Link
                                href="/papers/generate"
                                className="mt-6 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400"
                            >
                                <PlusIcon className="size-4" />
                                Generate Paper
                            </Link>
                        )}
                    </div>
                )}

                {/* List */}
                {items.length > 0 && (
                    <div className="space-y-3">
                        {pageItems.map((paper) => (
                            <div
                                key={paper.id}
                                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                            >
                                <div className="flex min-w-0 items-center gap-4">
                                    <div className={cn(
                                        'flex size-10 shrink-0 items-center justify-center rounded-lg',
                                        activeTab === 'drafts'
                                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                                            : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
                                    )}>
                                        <BookmarkIcon className="size-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                {paper.name}
                                            </p>
                                            {activeTab === 'drafts' && (
                                                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                                    Draft
                                                </span>
                                            )}
                                            {paper.is_mine === false && paper.author_name && (
                                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                    by {paper.author_name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                            {paper.subject && (
                                                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                    <FileTextIcon className="size-3.5" />
                                                    {paper.subject}
                                                </span>
                                            )}
                                            {paper.class_name && (
                                                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                    <GraduationCapIcon className="size-3.5" />
                                                    {paper.class_name}
                                                </span>
                                            )}
                                            {paper.total_marks > 0 && (
                                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                    {paper.total_marks} marks
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                                                <CalendarIcon className="size-3.5" />
                                                {formatDate(paper.updated_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    {paper.is_mine !== false ? (
                                        <>
                                            <Link
                                                href={`/papers/${paper.id}/edit`}
                                                className={cn(
                                                    'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                                                    activeTab === 'drafts'
                                                        ? 'border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-500/50 dark:text-amber-400 dark:hover:bg-amber-500/10'
                                                        : 'border-brand-600 text-brand-700 hover:bg-brand-50 dark:border-brand-500 dark:text-brand-400 dark:hover:bg-brand-500/10',
                                                )}
                                            >
                                                {activeTab === 'drafts' ? 'Continue' : 'Open'}
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => setMovingPaper(paper)}
                                                title="Move to folder"
                                                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                                            >
                                                <FolderIcon className="size-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDuplicate(paper)}
                                                disabled={duplicatingId === paper.id}
                                                title="Duplicate"
                                                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                                            >
                                                <CopyIcon className="size-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => confirmDelete(paper.id)}
                                                title="Delete"
                                                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                                            >
                                                <Trash2Icon className="size-3.5" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Link
                                                href={`/papers/${paper.id}/edit`}
                                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                                            >
                                                View
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                                <span>
                                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                                    {Math.min(currentPage * PAGE_SIZE, items.length)} of {items.length}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                                    >
                                        <ChevronLeftIcon className="size-4" />
                                    </button>
                                    <span className="min-w-[3.5rem] text-center font-medium tabular-nums">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                                    >
                                        <ChevronRightIcon className="size-4" />
                                    </button>
                                </div>
                            </div>
                        )}
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
                    }}
                />
            )}

            {movingPaper && (
                <MoveToFolderDialog
                    paper={movingPaper}
                    folders={folders}
                    onClose={() => setMovingPaper(null)}
                    onMove={(folderId) => movePaperToFolder(movingPaper, folderId)}
                />
            )}

            {deletingId !== null && (
                <ConfirmDialog
                    variant="danger"
                    title={activeTab === 'drafts' ? 'Delete Draft' : 'Delete Paper'}
                    message={
                        activeTab === 'drafts'
                            ? 'Are you sure you want to delete this draft? This cannot be undone.'
                            : 'Are you sure you want to delete this paper? This cannot be undone.'
                    }
                    confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
                    onConfirm={handleDelete}
                    onCancel={() => setDeletingId(null)}
                />
            )}
        </>
    );
}

function TabButton({
    active,
    onClick,
    count,
    children,
}: {
    active: boolean;
    onClick: () => void;
    count: number;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                active
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
            )}
        >
            {children}
            <span className={cn(
                'rounded-full px-2 py-0.5 text-xs font-semibold',
                active
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
            )}>
                {count}
            </span>
        </button>
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
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        function onOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', onOutside);
        return () => document.removeEventListener('mousedown', onOutside);
    }, [menuOpen]);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={onClick}
                className={cn(
                    'group flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors',
                    active
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
            >
                {icon}
                <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                <span
                    className={cn(
                        'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                        active
                            ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                    )}
                >
                    {count}
                </span>
                {(onRename || onDelete) && (
                    <span
                        role="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen((v) => !v);
                        }}
                        className="inline-flex size-6 items-center justify-center rounded text-slate-400 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                    >
                        <MoreHorizontalIcon className="size-4" />
                    </span>
                )}
            </button>
            {menuOpen && (
                <div
                    ref={menuRef}
                    className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900"
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
            if (e.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || saving) return;
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
            if (res.ok) onCreated();
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
                                        color === c.value && 'ring-2 ring-brand-500',
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
    folders,
    onClose,
    onMove,
}: {
    paper: Paper;
    folders: Folder[];
    onClose: () => void;
    onMove: (folderId: number | null) => void;
}) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
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
                        Move to folder
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {paper.name}
                    </p>
                </div>
                <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                    <button
                        type="button"
                        onClick={() => onMove(null)}
                        className={cn(
                            'flex w-full items-center gap-2.5 px-5 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800',
                            paper.folder_id === null && 'bg-brand-50 dark:bg-brand-500/10',
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
                                paper.folder_id === folder.id &&
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

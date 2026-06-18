import { Head, Link, router } from '@inertiajs/react';
import {
    BookmarkIcon,
    CalendarIcon,
    FileTextIcon,
    GraduationCapIcon,
    PlusIcon,
    Trash2Icon,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from './paper-layouts/confirm-dialog';

interface Paper {
    id: number;
    name: string;
    subject: string | null;
    class_name: string | null;
    total_marks: number;
    created_at: string;
    updated_at: string;
}

interface Props {
    papers: Paper[];
    drafts: Paper[];
}

export default function PapersIndex({ papers, drafts = [] }: Props) {
    const [activeTab, setActiveTab] = useState<'papers' | 'drafts'>('papers');
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    function confirmDelete(id: number) {
        setDeletingId(id);
    }

    function handleDelete() {
        if (deletingId === null || isDeleting) return;
        setIsDeleting(true);

        const csrfToken =
            (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

        fetch(`/papers/${deletingId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': csrfToken,
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

    function formatDate(isoString: string) {
        return new Date(isoString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }

    const items = activeTab === 'papers' ? papers : drafts;

    return (
        <>
            <Head title="My Papers" />

            <div className="mx-auto max-w-5xl space-y-6">
                {/* Header */}
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
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
                    >
                        <PlusIcon className="size-4" />
                        Generate New Paper
                    </Link>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
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
                                className="mt-6 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
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
                        {items.map((paper) => (
                            <div
                                key={paper.id}
                                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                            >
                                <div className="flex min-w-0 items-center gap-4">
                                    <div className={cn(
                                        'flex size-10 shrink-0 items-center justify-center rounded-lg',
                                        activeTab === 'drafts'
                                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                                            : 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
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
                                    <Link
                                        href={`/papers/${paper.id}/edit`}
                                        className={cn(
                                            'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                                            activeTab === 'drafts'
                                                ? 'border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-500/50 dark:text-amber-400 dark:hover:bg-amber-500/10'
                                                : 'border-teal-600 text-teal-700 hover:bg-teal-50 dark:border-teal-500 dark:text-teal-400 dark:hover:bg-teal-500/10',
                                        )}
                                    >
                                        {activeTab === 'drafts' ? 'Continue' : 'Open'}
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => confirmDelete(paper.id)}
                                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                                    >
                                        <Trash2Icon className="size-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

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
                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300'
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
            )}>
                {count}
            </span>
        </button>
    );
}

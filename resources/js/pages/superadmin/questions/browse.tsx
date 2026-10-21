import { Head, Link } from '@inertiajs/react';
import { ChevronRightIcon, FolderOpenIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import {
    Button,
    Card,
    EmptyState,
    PageHeader,
    SearchInput,
} from '@/components/tm';
import { usePermission } from '@/hooks/use-permission';
import { AddChapterModal } from './add-chapter-modal';
import { AddTopicModal } from './add-topic-modal';
import { QuestionPathBreadcrumbs } from './path-breadcrumbs';
import type { QuestionBreadcrumb } from './path-breadcrumbs';

interface BrowseRow {
    id: number | string;
    name: string;
    detail?: string | null;
    href: string;
}

const levelNames: Record<string, string> = {
    patterns: 'Patterns',
    classes: 'Classes',
    subjects: 'Subjects',
    chapters: 'Chapters',
    topics: 'Topics',
};

const selectionHeadings: Record<string, string> = {
    patterns: 'Select Pattern',
    classes: 'Select Class',
    subjects: 'Select Subject',
};

export default function BrowseQuestions({
    level,
    title,
    rows,
    breadcrumbs,
    createChapterHref,
    createTopicHref,
}: {
    level: string;
    title: string;
    rows: BrowseRow[];
    breadcrumbs: QuestionBreadcrumb[];
    createChapterHref: string | null;
    createTopicHref: string | null;
}) {
    const { can } = usePermission();
    const [search, setSearch] = useState('');
    const [chapterModalOpen, setChapterModalOpen] = useState(false);
    const [topicModalOpen, setTopicModalOpen] = useState(false);
    const heading = selectionHeadings[level] ?? title;
    const isSelectionStep = level in selectionHeadings;
    const searchTerm = search.trim().toLocaleLowerCase();
    const visibleRows = searchTerm
        ? rows.filter((row) =>
              `${row.name} ${row.detail ?? ''}`
                  .toLocaleLowerCase()
                  .includes(searchTerm),
          )
        : rows;
    const showDetails = rows.some((row) => row.detail);
    const selectionColumns = showDetails
        ? 'grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'
        : 'grid-cols-[minmax(0,1fr)_auto]';

    return (
        <>
            <Head title={`${heading} · Questions`} />
            <div className="space-y-5 p-4 md:p-6">
                <QuestionPathBreadcrumbs items={breadcrumbs} />
                <PageHeader
                    title={heading}
                    meta={`${level === 'patterns' ? '' : `${title} · `}${rows.length} ${levelNames[level]?.toLowerCase() ?? 'items'}`}
                    actions={
                        level === 'chapters' &&
                        createChapterHref &&
                        can('subjects.create') ? (
                            <Button
                                type="button"
                                variant="primary"
                                onClick={() => setChapterModalOpen(true)}
                            >
                                <PlusIcon aria-hidden="true" /> Add Chapter
                            </Button>
                        ) : level === 'topics' &&
                          createTopicHref &&
                          can('subjects.create') ? (
                            <Button
                                type="button"
                                variant="primary"
                                onClick={() => setTopicModalOpen(true)}
                            >
                                <PlusIcon aria-hidden="true" /> Add Topic
                            </Button>
                        ) : undefined
                    }
                />
                {rows.length > 0 && (
                    <SearchInput
                        value={search}
                        onValueChange={setSearch}
                        placeholder={`Search ${levelNames[level]?.toLowerCase() ?? 'items'}`}
                        className="w-full sm:max-w-sm"
                    />
                )}
                {rows.length === 0 && level !== 'topics' ? (
                    <EmptyState
                        icon={FolderOpenIcon}
                        title={`No ${levelNames[level]?.toLowerCase() ?? 'items'} found`}
                    />
                ) : rows.length > 0 && visibleRows.length === 0 ? (
                    <EmptyState
                        icon={FolderOpenIcon}
                        title="No matches found"
                        hint="Try another search term."
                    />
                ) : (
                    <Card padding="none" className="overflow-hidden">
                        {isSelectionStep ? (
                            <div>
                                <div
                                    className={`grid items-center gap-3 border-b bg-slate-50 px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 ${selectionColumns}`}
                                >
                                    <span>{levelNames[level]}</span>
                                    {showDetails && (
                                        <span className="hidden sm:block">
                                            Details
                                        </span>
                                    )}
                                    <span className="size-5">
                                        <span className="sr-only">Open</span>
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {visibleRows.map((row) => (
                                        <Link
                                            key={row.id}
                                            href={row.href}
                                            prefetch="hover"
                                            aria-label={`Open ${row.name}`}
                                            className={`group grid min-h-14 items-center gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 dark:hover:bg-slate-800/40 dark:focus-visible:bg-slate-800/40 ${selectionColumns}`}
                                        >
                                            <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                                                {row.name}
                                            </span>
                                            {showDetails && (
                                                <span className="hidden truncate text-slate-500 dark:text-slate-400 sm:block">
                                                    {row.detail ?? '—'}
                                                </span>
                                            )}
                                            <ChevronRightIcon
                                                className="size-5 text-slate-400 transition-colors group-hover:text-brand-600"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="border-b bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                                    <tr>
                                        <th scope="col" className="px-5 py-3">
                                            {levelNames[level] ?? 'Name'}
                                        </th>
                                        <th
                                            scope="col"
                                            className="hidden px-5 py-3 sm:table-cell"
                                        >
                                            Details
                                        </th>
                                        <th
                                            scope="col"
                                            className="w-20 px-4 py-3"
                                        >
                                            <span className="sr-only">
                                                Open
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {rows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={3}
                                                className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                                            >
                                                No topics yet
                                            </td>
                                        </tr>
                                    )}
                                    {visibleRows.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                        >
                                            <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                                                <Link
                                                    href={row.href}
                                                    prefetch="hover"
                                                    className="block hover:text-brand-600"
                                                >
                                                    {row.name}
                                                </Link>
                                            </td>
                                            <td className="hidden px-5 py-3.5 text-slate-500 dark:text-slate-400 sm:table-cell">
                                                {row.detail ?? '—'}
                                            </td>
                                            <td className="px-4 py-2 text-slate-500">
                                                <Link
                                                    href={row.href}
                                                    aria-label={`Open ${row.name}`}
                                                    prefetch="hover"
                                                    className="inline-flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:hover:bg-slate-800"
                                                >
                                                    <ChevronRightIcon className="size-6" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Card>
                )}
                {level === 'chapters' &&
                    createChapterHref &&
                    can('subjects.create') && (
                        <AddChapterModal
                            open={chapterModalOpen}
                            onClose={() => setChapterModalOpen(false)}
                            action={createChapterHref}
                            scope={breadcrumbs
                                .slice(-3)
                                .map((item) => item.label)}
                        />
                    )}
                {level === 'topics' &&
                    createTopicHref &&
                    can('subjects.create') && (
                        <AddTopicModal
                            open={topicModalOpen}
                            onClose={() => setTopicModalOpen(false)}
                            action={createTopicHref}
                            scope={breadcrumbs
                                .slice(-4)
                                .map((item) => item.label)}
                        />
                    )}
            </div>
        </>
    );
}

BrowseQuestions.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Questions', href: '/superadmin/questions' },
    ],
};

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

export default function BrowseQuestions({
    level,
    title,
    rows,
    breadcrumbs,
}: {
    level: string;
    title: string;
    rows: BrowseRow[];
    breadcrumbs: QuestionBreadcrumb[];
}) {
    const { can } = usePermission();
    const [search, setSearch] = useState('');
    const heading = level === 'patterns' ? 'Questions' : title;
    const searchTerm = search.trim().toLocaleLowerCase();
    const visibleRows = searchTerm
        ? rows.filter((row) =>
              `${row.name} ${row.detail ?? ''}`
                  .toLocaleLowerCase()
                  .includes(searchTerm),
          )
        : rows;

    return (
        <>
            <Head title={`${heading} · Questions`} />
            <div className="space-y-5 p-4 md:p-6">
                <QuestionPathBreadcrumbs items={breadcrumbs} />
                <PageHeader
                    title={heading}
                    meta={`${rows.length} ${levelNames[level]?.toLowerCase() ?? 'items'}`}
                    actions={
                        level === 'patterns' && can('questions.create') ? (
                            <Button variant="primary" asChild>
                                <Link href="/superadmin/questions/add">
                                    <PlusIcon />
                                    Add Question
                                </Link>
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
                {rows.length === 0 ? (
                    <EmptyState
                        icon={FolderOpenIcon}
                        title={`No ${levelNames[level]?.toLowerCase() ?? 'items'} found`}
                    />
                ) : visibleRows.length === 0 ? (
                    <EmptyState
                        icon={FolderOpenIcon}
                        title="No matches found"
                        hint="Try another search term."
                    />
                ) : (
                    <Card padding="none" className="overflow-hidden">
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
                                    <th scope="col" className="w-20 px-4 py-3">
                                        <span className="sr-only">Open</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                    </Card>
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

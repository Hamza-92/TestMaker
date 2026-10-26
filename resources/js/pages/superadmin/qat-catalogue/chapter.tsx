import { Head, Link, useForm } from '@inertiajs/react';
import { PencilIcon } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Card, PageHeader } from '@/components/tm';
import {
    DeleteAction,
    EditModal,
    FilterBar,
    Input,
    MONTHS,
    Pager,
    StatusBadge,
    inputClass,
    statusChoices,
    tableClass,
    tdClass,
    thClass,
} from './shared';
import type { Filters, Page } from './shared';

type QatClass = { id: number; name: string; academic_year: string };
type Subject = { id: number; subject_name: string };
type Chapter = {
    id: number;
    name: string;
    name_ur: string | null;
    status: number;
    months: number[];
};
type Topic = {
    id: number;
    name: string;
    name_ur: string | null;
    sort_id: number;
    status: number;
    question_count: number;
};

export default function QatChapterPage({
    qatClass,
    subject,
    chapter,
    topics,
    filters,
}: {
    qatClass: QatClass;
    subject: Subject;
    chapter: Chapter;
    topics: Page<Topic>;
    filters: Filters;
}) {
    const [editing, setEditing] = useState<Topic | null>(null);
    const { data, setData, patch, processing, errors } = useForm({
        name: '',
        name_ur: '',
        sort_id: 0,
        status: true,
    });
    const subjectUrl = `/superadmin/qat-catalogue/classes/${qatClass.id}/subjects/${subject.id}`;
    const base = `${subjectUrl}/chapters/${chapter.id}`;
    const edit = (item: Topic) => {
        setEditing(item);
        setData({
            name: item.name,
            name_ur: item.name_ur ?? '',
            sort_id: item.sort_id,
            status: Boolean(item.status),
        });
    };
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (editing) {
            patch(`${base}/topics/${editing.id}`, {
                preserveScroll: true,
                onSuccess: () => setEditing(null),
            });
        }
    };

    return (
        <div className="w-full min-w-0 space-y-5 p-4 md:p-6">
            <Head title={`${chapter.name} · QAT topics`} />
            <div className="text-sm text-slate-500 dark:text-slate-400">
                <Link
                    href="/superadmin/qat-catalogue"
                    className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                    QAT Data
                </Link>{' '}
                /{' '}
                <Link
                    href={`/superadmin/qat-catalogue/classes/${qatClass.id}`}
                    className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                    {qatClass.name}
                </Link>{' '}
                /{' '}
                <Link
                    href={subjectUrl}
                    className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                    {subject.subject_name}
                </Link>{' '}
                / {chapter.name}
            </div>
            <PageHeader
                title={chapter.name}
                meta={
                    <span className="flex items-center gap-2">
                        {qatClass.academic_year} · {topics.total} topics ·{' '}
                        {chapter.months
                            .map((month) => MONTHS[month - 1])
                            .join(', ') || 'No months'}{' '}
                        <StatusBadge active={chapter.status} />
                    </span>
                }
                actions={
                    <Button asChild variant="primary">
                        <Link href={`${base}/questions`}>View questions</Link>
                    </Button>
                }
            />
            {chapter.name_ur && (
                <div
                    dir="rtl"
                    className="text-sm text-slate-500 dark:text-slate-400"
                >
                    {chapter.name_ur}
                </div>
            )}
            <FilterBar
                url={base}
                filters={filters}
                options={[
                    { key: 'status', label: 'Status', choices: statusChoices },
                ]}
            />
            <Card padding="none" className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className={tableClass}>
                        <thead>
                            <tr>
                                <th className={thClass}>Order</th>
                                <th className={thClass}>Topic</th>
                                <th className={thClass}>Questions</th>
                                <th className={thClass}>Status</th>
                                <th className={thClass}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topics.data.map((item) => (
                                <tr
                                    key={item.id}
                                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                                >
                                    <td className={tdClass}>{item.sort_id}</td>
                                    <td className={tdClass}>
                                        <div className="font-medium">
                                            {item.name}
                                        </div>
                                        {item.name_ur && (
                                            <div
                                                dir="rtl"
                                                className="text-slate-500 dark:text-slate-400"
                                            >
                                                {item.name_ur}
                                            </div>
                                        )}
                                    </td>
                                    <td className={tdClass}>
                                        <Link
                                            href={`${base}/questions?topic=${item.id}`}
                                            className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                                        >
                                            {item.question_count}
                                        </Link>
                                    </td>
                                    <td className={tdClass}>
                                        <StatusBadge active={item.status} />
                                    </td>
                                    <td className={tdClass}>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                onClick={() => edit(item)}
                                                variant="ghost"
                                                size="icon-sm"
                                                title={`Edit ${item.name}`}
                                                aria-label={`Edit ${item.name}`}
                                            >
                                                <PencilIcon
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                            <DeleteAction
                                                url={`${base}/topics/${item.id}`}
                                                label={item.name}
                                                consequence="This removes the QAT topic. Its questions stay in the chapter without a topic."
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!topics.data.length && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                                    >
                                        No topics match these filters. Questions
                                        without a topic remain available on the
                                        questions page.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pager page={topics} />
            </Card>
            <EditModal
                open={editing !== null}
                onClose={() => setEditing(null)}
                onSave={save}
                title="Edit QAT topic"
                description="Changes are saved in the QAT copy only."
                busy={processing}
            >
                <label className="block space-y-1 text-sm">
                    Topic name
                    <Input
                        className={inputClass}
                        value={data.name}
                        onChange={(event) =>
                            setData('name', event.target.value)
                        }
                    />
                    {errors.name && (
                        <span className="text-red-600">{errors.name}</span>
                    )}
                </label>
                <label className="block space-y-1 text-sm">
                    Urdu name
                    <Input
                        dir="rtl"
                        className={inputClass}
                        value={data.name_ur}
                        onChange={(event) =>
                            setData('name_ur', event.target.value)
                        }
                    />
                </label>
                <label className="block space-y-1 text-sm">
                    Sort order
                    <Input
                        type="number"
                        min="0"
                        className={inputClass}
                        value={data.sort_id}
                        onChange={(event) =>
                            setData('sort_id', Number(event.target.value))
                        }
                    />
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        className="accent-brand-600"
                        checked={data.status}
                        onChange={(event) =>
                            setData('status', event.target.checked)
                        }
                    />{' '}
                    Active
                </label>
            </EditModal>
        </div>
    );
}

QatChapterPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'QAT Data', href: '/superadmin/qat-catalogue' },
        { title: 'Topics', href: '/superadmin/qat-catalogue' },
    ],
};

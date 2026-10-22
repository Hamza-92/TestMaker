import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Card, PageHeader } from '@/components/tm';
import {
    EditModal,
    FilterBar,
    Input,
    Pager,
    StatusBadge,
    inputClass,
    statusChoices,
    tableClass,
    tdClass,
    thClass,
} from './shared';
import type { Filters, Page } from './shared';

type QatClass = {
    id: number;
    name: string;
    academic_year: string;
    status: number;
};
type Subject = {
    id: number;
    subject_name: string;
    source_pattern_name: string;
    status: number;
    chapter_count: number;
    question_count: number;
};

export default function QatClassPage({
    qatClass,
    subjects,
    filters,
}: {
    qatClass: QatClass;
    subjects: Page<Subject>;
    filters: Filters;
}) {
    const [editing, setEditing] = useState<Subject | null>(null);
    const { data, setData, patch, processing, errors } = useForm({
        subject_name: '',
        status: true,
    });
    const base = `/superadmin/qat-catalogue/classes/${qatClass.id}`;
    const edit = (item: Subject) => {
        setEditing(item);
        setData({
            subject_name: item.subject_name,
            status: Boolean(item.status),
        });
    };
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (editing) {
            patch(`${base}/subjects/${editing.id}`, {
                preserveScroll: true,
                onSuccess: () => setEditing(null),
            });
        }
    };

    return (
        <div className="w-full min-w-0 space-y-5 p-4 md:p-6">
            <Head title={`${qatClass.name} · QAT subjects`} />
            <div className="text-sm text-slate-500 dark:text-slate-400">
                <Link
                    href="/superadmin/qat-catalogue"
                    className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                    QAT Data
                </Link>{' '}
                / {qatClass.academic_year} / {qatClass.name}
            </div>
            <PageHeader
                title={`${qatClass.name} subjects`}
                meta={
                    <span className="flex items-center gap-2">
                        {qatClass.academic_year} · {subjects.total} subjects{' '}
                        <StatusBadge active={qatClass.status} />
                    </span>
                }
            />
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
                                <th className={thClass}>Subject</th>
                                <th className={thClass}>Source pattern</th>
                                <th className={thClass}>Chapters</th>
                                <th className={thClass}>Questions</th>
                                <th className={thClass}>Status</th>
                                <th className={thClass}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjects.data.map((item) => (
                                <tr
                                    key={item.id}
                                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                                >
                                    <td className={tdClass}>
                                        <Link
                                            href={`${base}/subjects/${item.id}`}
                                            className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                                        >
                                            {item.subject_name}
                                        </Link>
                                    </td>
                                    <td className={tdClass}>
                                        {item.source_pattern_name}
                                    </td>
                                    <td className={tdClass}>
                                        {item.chapter_count}
                                    </td>
                                    <td className={tdClass}>
                                        {item.question_count}
                                    </td>
                                    <td className={tdClass}>
                                        <StatusBadge active={item.status} />
                                    </td>
                                    <td className={tdClass}>
                                        <Button
                                            type="button"
                                            onClick={() => edit(item)}
                                            variant="ghost"
                                            size="sm"
                                        >
                                            Edit
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {!subjects.data.length && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                                    >
                                        No subjects match these filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pager page={subjects} />
            </Card>
            <EditModal
                open={editing !== null}
                onClose={() => setEditing(null)}
                onSave={save}
                title="Edit QAT subject"
                description="Changes are saved in the QAT copy only."
                busy={processing}
            >
                <label className="block space-y-1 text-sm">
                    Subject name
                    <Input
                        className={inputClass}
                        value={data.subject_name}
                        onChange={(event) =>
                            setData('subject_name', event.target.value)
                        }
                    />
                    {errors.subject_name && (
                        <span className="text-red-600">
                            {errors.subject_name}
                        </span>
                    )}
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

QatClassPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'QAT Data', href: '/superadmin/qat-catalogue' },
        { title: 'Subjects', href: '/superadmin/qat-catalogue' },
    ],
};

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
} from './qat-catalogue/shared';
import type { Filters, Page } from './qat-catalogue/shared';

type QatClass = {
    id: number;
    name: string;
    academic_year: string;
    status: number;
    subject_count: number;
    chapter_count: number;
};

export default function QatCatalogue({
    classes,
    years,
    filters,
}: {
    classes: Page<QatClass>;
    years: string[];
    filters: Filters;
}) {
    const [editing, setEditing] = useState<QatClass | null>(null);
    const { data, setData, patch, processing, errors } = useForm({
        name: '',
        status: true,
    });
    const edit = (item: QatClass) => {
        setEditing(item);
        setData({ name: item.name, status: Boolean(item.status) });
    };
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (editing) {
            patch(`/superadmin/qat-catalogue/classes/${editing.id}`, {
                preserveScroll: true,
                onSuccess: () => setEditing(null),
            });
        }
    };

    return (
        <div className="w-full min-w-0 space-y-5 p-4 md:p-6">
            <Head title="QAT Data" />
            <PageHeader
                title="QAT Data"
                meta={`${classes.total} classes`}
                actions={
                    <Button asChild variant="primary">
                        <Link href="/superadmin/qat-transfer">
                            Transfer QAT Data
                        </Link>
                    </Button>
                }
            />
            <FilterBar
                url="/superadmin/qat-catalogue"
                filters={filters}
                options={[
                    {
                        key: 'year',
                        label: 'Academic year',
                        choices: [
                            { value: '', label: 'All years' },
                            ...years.map((year) => ({
                                value: year,
                                label: year,
                            })),
                        ],
                    },
                    { key: 'status', label: 'Status', choices: statusChoices },
                ]}
            />
            <Card padding="none" className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className={tableClass}>
                        <thead>
                            <tr>
                                <th className={thClass}>Class</th>
                                <th className={thClass}>Academic year</th>
                                <th className={thClass}>Subjects</th>
                                <th className={thClass}>Chapters</th>
                                <th className={thClass}>Status</th>
                                <th className={thClass}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classes.data.map((item) => (
                                <tr
                                    key={item.id}
                                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                                >
                                    <td className={tdClass}>
                                        <Link
                                            href={`/superadmin/qat-catalogue/classes/${item.id}`}
                                            className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                                        >
                                            {item.name}
                                        </Link>
                                    </td>
                                    <td className={tdClass}>
                                        {item.academic_year}
                                    </td>
                                    <td className={tdClass}>
                                        {item.subject_count}
                                    </td>
                                    <td className={tdClass}>
                                        {item.chapter_count}
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
                            {!classes.data.length && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                                    >
                                        No QAT classes match these filters.
                                        Transfer data to add a class.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pager page={classes} />
            </Card>
            <EditModal
                open={editing !== null}
                onClose={() => setEditing(null)}
                onSave={save}
                title="Edit QAT class"
                description="This changes only the QAT copy of the class."
                busy={processing}
            >
                <label className="block space-y-1 text-sm">
                    Class name
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

QatCatalogue.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'QAT Tests', href: '/superadmin/qat-catalogue' },
        { title: 'QAT Data', href: '/superadmin/qat-catalogue' },
    ],
};

import { Head, Link, useForm } from '@inertiajs/react';
import { FileQuestionIcon, PencilIcon } from 'lucide-react';
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
};
type Chapter = {
    id: number;
    name: string;
    name_ur: string | null;
    chapter_number: number | null;
    sort_id: number;
    status: number;
    months: number[];
    topic_count: number;
    question_count: number;
};

export default function QatSubjectPage({
    qatClass,
    subject,
    chapters,
    filters,
}: {
    qatClass: QatClass;
    subject: Subject;
    chapters: Page<Chapter>;
    filters: Filters;
}) {
    const [editing, setEditing] = useState<Chapter | null>(null);
    const { data, setData, patch, processing, errors } = useForm({
        name: '',
        name_ur: '',
        chapter_number: '' as string | number,
        sort_id: 0,
        status: true,
        months: [] as number[],
    });
    const base = `/superadmin/qat-catalogue/classes/${qatClass.id}/subjects/${subject.id}`;
    const edit = (item: Chapter) => {
        setEditing(item);
        setData({
            name: item.name,
            name_ur: item.name_ur ?? '',
            chapter_number: item.chapter_number ?? '',
            sort_id: item.sort_id,
            status: Boolean(item.status),
            months: item.months,
        });
    };
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (editing) {
            patch(`${base}/chapters/${editing.id}`, {
                preserveScroll: true,
                onSuccess: () => setEditing(null),
            });
        }
    };

    return (
        <div className="w-full min-w-0 space-y-5 p-4 md:p-6">
            <Head title={`${subject.subject_name} · QAT chapters`} />
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
                / {subject.subject_name}
            </div>
            <PageHeader
                title={`${subject.subject_name} chapters`}
                meta={
                    <span className="flex items-center gap-2">
                        {qatClass.academic_year} · {chapters.total} chapters ·{' '}
                        {subject.source_pattern_name}{' '}
                        <StatusBadge active={subject.status} />
                    </span>
                }
            />
            <FilterBar
                url={base}
                filters={filters}
                options={[
                    {
                        key: 'month',
                        label: 'Syllabus month',
                        choices: [
                            { value: '', label: 'All months' },
                            ...MONTHS.map((month, index) => ({
                                value: String(index + 1),
                                label: month,
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
                                <th className={thClass}>#</th>
                                <th className={thClass}>Chapter</th>
                                <th className={thClass}>Months</th>
                                <th className={thClass}>Topics</th>
                                <th className={thClass}>Questions</th>
                                <th className={thClass}>Status</th>
                                <th className={thClass}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {chapters.data.map((item) => (
                                <tr
                                    key={item.id}
                                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                                >
                                    <td className={tdClass}>
                                        {item.chapter_number ?? '—'}
                                    </td>
                                    <td className={tdClass}>
                                        <Link
                                            href={`${base}/chapters/${item.id}`}
                                            className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                                        >
                                            {item.name}
                                        </Link>
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
                                        {item.months
                                            .map((month) => MONTHS[month - 1])
                                            .join(', ') || '—'}
                                    </td>
                                    <td className={tdClass}>
                                        {item.topic_count}
                                    </td>
                                    <td className={tdClass}>
                                        {item.question_count}
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
                                            <Button
                                                asChild
                                                variant="ghost"
                                                size="icon-sm"
                                                title={`Questions in ${item.name}`}
                                                aria-label={`Questions in ${item.name}`}
                                            >
                                                <Link
                                                    href={`${base}/chapters/${item.id}/questions`}
                                                >
                                                    <FileQuestionIcon
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                </Link>
                                            </Button>
                                            <DeleteAction
                                                url={`${base}/chapters/${item.id}`}
                                                label={item.name}
                                                consequence="This removes the QAT chapter, its month assignments, topics, and questions. Saved papers remain available."
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!chapters.data.length && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                                    >
                                        No chapters match these filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pager page={chapters} />
            </Card>
            <EditModal
                open={editing !== null}
                onClose={() => setEditing(null)}
                onSave={save}
                title="Edit QAT chapter"
                description="Set the syllabus months and details for this QAT chapter."
                busy={processing}
            >
                <label className="block space-y-1 text-sm">
                    Chapter name
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
                <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1 text-sm">
                        Chapter number
                        <Input
                            type="number"
                            min="0"
                            className={inputClass}
                            value={data.chapter_number}
                            onChange={(event) =>
                                setData('chapter_number', event.target.value)
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
                </div>
                <div className="space-y-2 text-sm">
                    <div className="font-medium">Syllabus months</div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {MONTHS.map((month, index) => (
                            <label
                                key={month}
                                className="flex items-center gap-2"
                            >
                                <input
                                    type="checkbox"
                                    className="accent-brand-600"
                                    checked={data.months.includes(index + 1)}
                                    onChange={(event) =>
                                        setData(
                                            'months',
                                            event.target.checked
                                                ? [...data.months, index + 1]
                                                : data.months.filter(
                                                      (value) =>
                                                          value !== index + 1,
                                                  ),
                                        )
                                    }
                                />
                                {month}
                            </label>
                        ))}
                    </div>
                    {errors.months && (
                        <span className="text-red-600">{errors.months}</span>
                    )}
                </div>
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

QatSubjectPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'QAT Data', href: '/superadmin/qat-catalogue' },
        { title: 'Chapters', href: '/superadmin/qat-catalogue' },
    ],
};

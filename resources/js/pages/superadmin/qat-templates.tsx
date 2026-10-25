import { Head, useForm } from '@inertiajs/react';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Card, Modal, PageHeader } from '@/components/tm';
import {
    FilterBar,
    Pager,
    StatusBadge,
    selectClass,
    statusChoices,
    tableClass,
    tdClass,
    thClass,
} from './qat-catalogue/shared';
import type { Filters, Page } from './qat-catalogue/shared';

type Section = { question_type_id: number; quantity: number; marks: number };
type Template = {
    id: number;
    qat_subject_id: number;
    name: string;
    category: string | null;
    minutes: number;
    status: boolean | number;
    sections: Section[];
    subject_name: string;
    class_name: string;
    academic_year: string;
};
type Subject = {
    id: number;
    subject_name: string;
    class_name: string;
    academic_year: string;
    status: boolean | number;
    class_status: boolean | number;
};
type QuestionType = {
    qat_subject_id: number;
    id: number;
    name: string;
    is_objective: boolean;
};
type FormData = {
    qat_subject_id: number;
    name: string;
    category: string;
    minutes: number;
    status: boolean;
    sections: Section[];
};

const blank = (): FormData => ({
    qat_subject_id: 0,
    name: '',
    category: '',
    minutes: 40,
    status: true,
    sections: [],
});

export default function QatTemplates({
    templates,
    subjects,
    types,
    filters,
}: {
    templates: Page<Template>;
    subjects: Subject[];
    types: QuestionType[];
    filters: Filters;
}) {
    const [editing, setEditing] = useState<number | null>(null);
    const [open, setOpen] = useState(false);
    const { data, setData, post, put, processing, errors, clearErrors } =
        useForm<FormData>(blank());
    const availableTypes = types.filter(
        (type) => type.qat_subject_id === Number(data.qat_subject_id),
    );
    const totalQuestions = data.sections.reduce(
        (sum, section) => sum + Number(section.quantity || 0),
        0,
    );
    const totalMarks = data.sections.reduce(
        (sum, section) =>
            sum + Number(section.quantity || 0) * Number(section.marks || 0),
        0,
    );

    function start(item?: Template) {
        clearErrors();
        setEditing(item?.id ?? null);
        setData(
            item
                ? {
                      qat_subject_id: item.qat_subject_id,
                      name: item.name,
                      category: item.category ?? '',
                      minutes: item.minutes,
                      status: Boolean(item.status),
                      sections: item.sections,
                  }
                : blank(),
        );
        setOpen(true);
    }

    function updateSection(index: number, change: Partial<Section>) {
        setData(
            'sections',
            data.sections.map((section, position) =>
                position === index ? { ...section, ...change } : section,
            ),
        );
    }

    function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        };

        if (editing) {
            put(`/superadmin/qat-templates/${editing}`, options);
        } else {
            post('/superadmin/qat-templates', options);
        }
    }

    return (
        <div className="w-full min-w-0 space-y-5 p-4 md:p-6">
            <Head title="QAT Templates" />
            <PageHeader
                title="QAT Templates"
                meta={`${templates.total} templates`}
                actions={
                    <Button variant="primary" onClick={() => start()}>
                        Create template
                    </Button>
                }
            />
            <FilterBar
                url="/superadmin/qat-templates"
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
                                <th className={thClass}>Template</th>
                                <th className={thClass}>Class / book</th>
                                <th className={thClass}>Sections</th>
                                <th className={thClass}>Duration</th>
                                <th className={thClass}>Status</th>
                                <th className={thClass}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates.data.map((item) => (
                                <tr
                                    key={item.id}
                                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                                >
                                    <td className={tdClass}>
                                        <strong className="block">
                                            {item.name}
                                        </strong>
                                        {item.category && (
                                            <span className="text-xs text-slate-500">
                                                {item.category}
                                            </span>
                                        )}
                                    </td>
                                    <td className={tdClass}>
                                        {item.class_name} · {item.subject_name}
                                        <span className="block text-xs text-slate-500">
                                            {item.academic_year}
                                        </span>
                                    </td>
                                    <td className={tdClass}>
                                        {item.sections.length} types ·{' '}
                                        {item.sections.reduce(
                                            (sum, row) => sum + row.quantity,
                                            0,
                                        )}{' '}
                                        questions ·{' '}
                                        {item.sections.reduce(
                                            (sum, row) =>
                                                sum + row.quantity * row.marks,
                                            0,
                                        )}{' '}
                                        marks
                                    </td>
                                    <td className={tdClass}>
                                        {item.minutes} min
                                    </td>
                                    <td className={tdClass}>
                                        <StatusBadge active={item.status} />
                                    </td>
                                    <td className={tdClass}>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => start(item)}
                                        >
                                            Edit
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {!templates.data.length && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-8 text-center text-slate-500"
                                    >
                                        No templates match these filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pager page={templates} />
            </Card>
            <Modal
                open={open}
                onOpenChange={setOpen}
                title={editing ? 'Edit QAT template' : 'Create QAT template'}
                footer={
                    <>
                        <Button type="button" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="qat-template-form"
                            variant="primary"
                            disabled={processing}
                        >
                            {processing ? 'Saving…' : 'Save template'}
                        </Button>
                    </>
                }
            >
                <form
                    id="qat-template-form"
                    onSubmit={save}
                    className="space-y-4"
                >
                    <label className="block space-y-1 text-sm">
                        QAT book
                        <select
                            className={selectClass}
                            value={data.qat_subject_id}
                            onChange={(event) =>
                                setData({
                                    ...data,
                                    qat_subject_id: Number(event.target.value),
                                    sections: [],
                                })
                            }
                        >
                            <option value={0}>Select a book</option>
                            {subjects
                                .filter(
                                    (subject) =>
                                        subject.status && subject.class_status,
                                )
                                .map((subject) => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.academic_year} ·{' '}
                                        {subject.class_name} ·{' '}
                                        {subject.subject_name}
                                    </option>
                                ))}
                        </select>
                        {errors.qat_subject_id && (
                            <span className="text-red-600">
                                {errors.qat_subject_id}
                            </span>
                        )}
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block space-y-1 text-sm">
                            Template name
                            <input
                                className={selectClass}
                                maxLength={150}
                                value={data.name}
                                onChange={(event) =>
                                    setData('name', event.target.value)
                                }
                            />
                            {errors.name && (
                                <span className="text-red-600">
                                    {errors.name}
                                </span>
                            )}
                        </label>
                        <label className="block space-y-1 text-sm">
                            Category (optional)
                            <input
                                className={selectClass}
                                maxLength={80}
                                value={data.category}
                                onChange={(event) =>
                                    setData('category', event.target.value)
                                }
                            />
                            {errors.category && (
                                <span className="text-red-600">
                                    {errors.category}
                                </span>
                            )}
                        </label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block space-y-1 text-sm">
                            Duration (min)
                            <input
                                type="number"
                                min={10}
                                max={240}
                                className={selectClass}
                                value={data.minutes}
                                onChange={(event) =>
                                    setData(
                                        'minutes',
                                        Number(event.target.value),
                                    )
                                }
                            />
                            {errors.minutes && (
                                <span className="text-red-600">
                                    {errors.minutes}
                                </span>
                            )}
                        </label>
                        <label className="block space-y-1 text-sm">
                            Status
                            <select
                                className={selectClass}
                                value={data.status ? 'active' : 'inactive'}
                                onChange={(event) =>
                                    setData(
                                        'status',
                                        event.target.value === 'active',
                                    )
                                }
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                            {errors.status && (
                                <span className="text-red-600">
                                    {errors.status}
                                </span>
                            )}
                        </label>
                    </div>
                    <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-semibold">
                                    Paper sections
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {totalQuestions} questions · {totalMarks}{' '}
                                    marks
                                </p>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                disabled={
                                    !availableTypes.some(
                                        (type) =>
                                            !data.sections.some(
                                                (row) =>
                                                    row.question_type_id ===
                                                    type.id,
                                            ),
                                    )
                                }
                                onClick={() => {
                                    const next = availableTypes.find(
                                        (type) =>
                                            !data.sections.some(
                                                (row) =>
                                                    row.question_type_id ===
                                                    type.id,
                                            ),
                                    );

                                    if (next) {
                                        setData('sections', [
                                            ...data.sections,
                                            {
                                                question_type_id: next.id,
                                                quantity: 1,
                                                marks: next.is_objective
                                                    ? 1
                                                    : 2,
                                            },
                                        ]);
                                    }
                                }}
                            >
                                Add section
                            </Button>
                        </div>
                        {data.sections.map((section, index) => (
                            <div
                                key={index}
                                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-[minmax(0,1fr)_88px_88px_36px]"
                            >
                                <label className="col-span-3 min-w-0 text-xs text-slate-500 sm:col-span-1">
                                    Question type
                                    <select
                                        className={selectClass}
                                        value={section.question_type_id}
                                        onChange={(event) =>
                                            updateSection(index, {
                                                question_type_id: Number(
                                                    event.target.value,
                                                ),
                                            })
                                        }
                                    >
                                        {availableTypes.map((type) => (
                                            <option
                                                key={type.id}
                                                value={type.id}
                                                disabled={data.sections.some(
                                                    (row, position) =>
                                                        position !== index &&
                                                        row.question_type_id ===
                                                            type.id,
                                                )}
                                            >
                                                {type.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-xs text-slate-500">
                                    Questions
                                    <input
                                        type="number"
                                        min={1}
                                        max={100}
                                        className={selectClass}
                                        value={section.quantity}
                                        onChange={(event) =>
                                            updateSection(index, {
                                                quantity: Number(
                                                    event.target.value,
                                                ),
                                            })
                                        }
                                    />
                                </label>
                                <label className="text-xs text-slate-500">
                                    Marks each
                                    <input
                                        type="number"
                                        min={0.5}
                                        max={20}
                                        step={0.5}
                                        className={selectClass}
                                        value={section.marks}
                                        onChange={(event) =>
                                            updateSection(index, {
                                                marks: Number(
                                                    event.target.value,
                                                ),
                                            })
                                        }
                                    />
                                </label>
                                <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    className="self-end"
                                    aria-label={`Remove section ${index + 1}`}
                                    title="Remove section"
                                    onClick={() =>
                                        setData(
                                            'sections',
                                            data.sections.filter(
                                                (_, position) =>
                                                    position !== index,
                                            ),
                                        )
                                    }
                                >
                                    <Trash2Icon aria-hidden="true" />
                                </Button>
                            </div>
                        ))}
                        {!availableTypes.length && data.qat_subject_id > 0 && (
                            <p className="text-sm text-amber-700">
                                This book has no active question types yet.
                            </p>
                        )}
                        {errors.sections && (
                            <span className="text-sm text-red-600">
                                {errors.sections}
                            </span>
                        )}
                    </div>
                </form>
            </Modal>
        </div>
    );
}

QatTemplates.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'QAT Tests', href: '/superadmin/qat-catalogue' },
        { title: 'QAT Templates', href: '/superadmin/qat-templates' },
    ],
};

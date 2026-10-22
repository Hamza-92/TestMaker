import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Card, PageHeader } from '@/components/tm';
import {
    EditModal,
    FilterBar,
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
type Chapter = { id: number; name: string };
type Option = { id: number; name: string };
type Question = {
    id: number;
    question_type_id: number;
    qat_topic_id: number | null;
    status: number;
    topic_name: string | null;
    type_name: string;
    statement_en: string;
    statement_ur: string;
    summary_text: string;
    description_en: string | null;
    description_ur: string | null;
    answer_en: string | null;
    answer_ur: string | null;
    options: {
        text_en: string | null;
        text_ur: string | null;
        is_correct: boolean;
    }[];
};

function summary(value: string) {
    return value
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export default function QatQuestionsPage({
    qatClass,
    subject,
    chapter,
    questions,
    topics,
    types,
    filters,
}: {
    qatClass: QatClass;
    subject: Subject;
    chapter: Chapter;
    questions: Page<Question>;
    topics: Option[];
    types: Option[];
    filters: Filters;
}) {
    const [editing, setEditing] = useState<Question | null>(null);
    const { data, setData, patch, processing, errors } = useForm({
        statement_en: '',
        statement_ur: '',
        status: true,
    });
    const chapterUrl = `/superadmin/qat-catalogue/classes/${qatClass.id}/subjects/${subject.id}/chapters/${chapter.id}`;
    const base = `${chapterUrl}/questions`;
    const edit = (item: Question) => {
        setEditing(item);
        setData({
            statement_en: item.statement_en ?? '',
            statement_ur: item.statement_ur ?? '',
            status: Boolean(item.status),
        });
    };
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (editing) {
            patch(`${base}/${editing.id}`, {
                preserveScroll: true,
                onSuccess: () => setEditing(null),
            });
        }
    };

    return (
        <div className="w-full min-w-0 space-y-5 p-4 md:p-6">
            <Head title={`${chapter.name} · QAT questions`} />
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
                    href={`/superadmin/qat-catalogue/classes/${qatClass.id}/subjects/${subject.id}`}
                    className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                    {subject.subject_name}
                </Link>{' '}
                /{' '}
                <Link
                    href={chapterUrl}
                    className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                    {chapter.name}
                </Link>{' '}
                / Questions
            </div>
            <PageHeader
                title="QAT questions"
                meta={`${qatClass.academic_year} · ${chapter.name} · ${questions.total} questions`}
            />
            <FilterBar
                url={base}
                filters={filters}
                options={[
                    {
                        key: 'topic',
                        label: 'Topic',
                        choices: [
                            { value: '', label: 'All topics' },
                            ...topics.map((item) => ({
                                value: String(item.id),
                                label: item.name,
                            })),
                        ],
                    },
                    {
                        key: 'type',
                        label: 'Question type',
                        choices: [
                            { value: '', label: 'All types' },
                            ...types.map((item) => ({
                                value: String(item.id),
                                label: item.name,
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
                                <th className={thClass}>ID</th>
                                <th className={thClass}>Question</th>
                                <th className={thClass}>Type</th>
                                <th className={thClass}>Topic</th>
                                <th className={thClass}>Status</th>
                                <th className={thClass}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {questions.data.map((item) => (
                                <tr
                                    key={item.id}
                                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                                >
                                    <td className={tdClass}>{item.id}</td>
                                    <td
                                        className={`${tdClass} min-w-64 max-w-lg`}
                                    >
                                        <div className="line-clamp-3">
                                            {summary(item.summary_text) ||
                                                'No statement'}
                                        </div>
                                    </td>
                                    <td className={tdClass}>
                                        {item.type_name}
                                    </td>
                                    <td className={tdClass}>
                                        {item.topic_name ?? '—'}
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
                                            View / edit
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {!questions.data.length && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                                    >
                                        No questions match these filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pager page={questions} />
            </Card>
            <EditModal
                open={editing !== null}
                onClose={() => setEditing(null)}
                onSave={save}
                title={`QAT question #${editing?.id ?? ''}`}
                description="Edit the copied statement text. Existing options and other question details are preserved."
                busy={processing}
            >
                <div className="text-sm text-slate-500 dark:text-slate-400">
                    {editing?.type_name} · {editing?.topic_name ?? 'No topic'}
                </div>
                {editing?.options.length ? (
                    <div className="space-y-1 rounded-md border p-3 text-sm">
                        <div className="font-medium">Copied options</div>
                        {editing.options.map((option, index) => (
                            <div key={index}>
                                {index + 1}.{' '}
                                {summary(
                                    option.text_en ?? option.text_ur ?? '',
                                )}
                                {option.is_correct ? ' ✓' : ''}
                            </div>
                        ))}
                    </div>
                ) : null}
                {(editing?.description_en || editing?.description_ur) && (
                    <div className="rounded-md border p-3 text-sm">
                        <div className="font-medium">Description</div>
                        <div>
                            {summary(
                                editing.description_en ??
                                    editing.description_ur ??
                                    '',
                            )}
                        </div>
                    </div>
                )}
                {(editing?.answer_en || editing?.answer_ur) && (
                    <div className="rounded-md border p-3 text-sm">
                        <div className="font-medium">Answer</div>
                        <div>
                            {summary(
                                editing.answer_en ?? editing.answer_ur ?? '',
                            )}
                        </div>
                    </div>
                )}
                <label className="block space-y-1 text-sm">
                    English statement
                    <textarea
                        rows={5}
                        className={inputClass}
                        value={data.statement_en}
                        onChange={(event) =>
                            setData('statement_en', event.target.value)
                        }
                    />
                    {errors.statement_en && (
                        <span className="text-red-600">
                            {errors.statement_en}
                        </span>
                    )}
                </label>
                <label className="block space-y-1 text-sm">
                    Urdu statement
                    <textarea
                        rows={5}
                        dir="rtl"
                        className={inputClass}
                        value={data.statement_ur}
                        onChange={(event) =>
                            setData('statement_ur', event.target.value)
                        }
                    />
                    {errors.statement_ur && (
                        <span className="text-red-600">
                            {errors.statement_ur}
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

QatQuestionsPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'QAT Data', href: '/superadmin/qat-catalogue' },
        { title: 'Questions', href: '/superadmin/qat-catalogue' },
    ],
};

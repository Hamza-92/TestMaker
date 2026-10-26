import { Head, Link, router } from '@inertiajs/react';
import { PencilIcon } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Button, Card, PageHeader } from '@/components/tm';
const EditQuestionModal = lazy(
    () => import('../questions/edit-question-modal'),
);
import {
    DeleteAction,
    FilterBar,
    Pager,
    StatusBadge,
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
    summary_text: string;
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
    const chapterUrl = `/superadmin/qat-catalogue/classes/${qatClass.id}/subjects/${subject.id}/chapters/${chapter.id}`;
    const base = `${chapterUrl}/questions`;

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
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                onClick={() => setEditing(item)}
                                                variant="ghost"
                                                size="icon-sm"
                                                title={`View or edit question #${item.id}`}
                                                aria-label={`View or edit question #${item.id}`}
                                            >
                                                <PencilIcon
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                            <DeleteAction
                                                url={`${base}/${item.id}`}
                                                label={`question #${item.id}`}
                                                consequence="This removes the question from the QAT catalogue. Saved papers remain available."
                                            />
                                        </div>
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
            {editing && (
                <Suspense fallback={null}>
                    <EditQuestionModal
                        questionId={editing.id}
                        editUrl={`${base}/${editing.id}/edit`}
                        updateUrl={`${base}/${editing.id}`}
                        title={`Edit QAT question #${editing.id}`}
                        scope={[
                            qatClass.name,
                            subject.subject_name,
                            chapter.name,
                        ]}
                        onClose={() => setEditing(null)}
                        onSaved={() => router.reload({ only: ['questions'] })}
                    />
                </Suspense>
            )}
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

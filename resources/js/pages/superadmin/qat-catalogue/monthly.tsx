import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowRightIcon,
    ChevronRightIcon,
    ClipboardListIcon,
    FilePenLineIcon,
    PencilIcon,
    Trash2Icon,
} from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Button, Input, Modal, PageHeader } from '@/components/tm';
import {
    EditModal,
    FilterBar,
    Pager,
    StatusBadge,
    statusChoices,
} from './shared';
import type { Filters, Page } from './shared';

const QuestionEditor = lazy(() => import('../questions/edit-question-modal'));
const SyllabusEditor = lazy(() => import('@/components/qat-syllabus-editor'));
const catalogueUrl = '/superadmin/qat-catalogue';
const blueAction =
    'border border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100 hover:text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900';
const redAction =
    'border border-red-200 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-100 hover:text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900';
const cellClass =
    'border-b border-blue-100/80 px-4 py-2 align-middle dark:border-slate-800';

type Level =
    | 'year'
    | 'month'
    | 'class'
    | 'subject'
    | 'chapter'
    | 'topic'
    | 'question';
type Row = {
    id: number;
    name: string;
    name_ur?: string | null;
    count?: number;
    status?: boolean | number;
    sort_id?: number;
    chapter_number?: number | null;
    source_pattern_name?: string;
    type_name?: string;
    topic_name?: string | null;
    url?: string;
    action_url?: string;
    edit_url?: string;
    update_url?: string;
};
type FilterOption = { id: number; name: string };
type Syllabus = { url: string; description: string };

const columns: Record<Level, string[]> = {
    year: ['Academic year', 'Months'],
    month: ['Month', 'Subjects'],
    class: ['Class', 'Subjects', 'Status'],
    subject: ['Subject', 'Source pattern', 'Chapters', 'Status'],
    chapter: ['Chapter', 'Questions', 'Status'],
    topic: ['Topic', 'Questions', 'Status'],
    question: ['Question', 'Type', 'Topic', 'Status'],
};

function questionText(html: string, id: number) {
    return (
        html
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim() || `Question #${id}`
    );
}

function scopedUrl(base: string, params: Filters) {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
            query.set(key, String(value));
        }
    }

    return query.size ? `${base}?${query}` : base;
}

export default function QatMonthlyPage({
    title,
    level,
    month,
    breadcrumbs,
    rows,
    baseUrl,
    context = {},
    filters = {},
    topics = [],
    types = [],
    syllabus,
}: {
    title: string;
    level: Level;
    month?: string;
    breadcrumbs: { label: string; url: string }[];
    rows: Row[] | Page<Row>;
    baseUrl?: string;
    context?: Filters;
    filters?: Filters;
    topics?: FilterOption[];
    types?: FilterOption[];
    syllabus?: Syllabus | null;
}) {
    const [editing, setEditing] = useState<Row | null>(null);
    const [removing, setRemoving] = useState<Row | null>(null);
    const [removeBusy, setRemoveBusy] = useState(false);
    const [editSyllabus, setEditSyllabus] = useState(false);
    const entries = Array.isArray(rows) ? rows : rows.data;
    const total = Array.isArray(rows) ? rows.length : rows.total;
    const listUrl = baseUrl ? scopedUrl(baseUrl, context) : undefined;
    const filterOptions = [
        { key: 'status', label: 'Status', choices: statusChoices },
    ];

    if (level === 'question') {
        filterOptions.unshift(
            {
                key: 'topic',
                label: 'Topic',
                choices: [
                    { value: '', label: 'All topics' },
                    ...topics.map((topic) => ({
                        value: String(topic.id),
                        label: topic.name,
                    })),
                ],
            },
            {
                key: 'type',
                label: 'Question type',
                choices: [
                    { value: '', label: 'All types' },
                    ...types.map((type) => ({
                        value: String(type.id),
                        label: type.name,
                    })),
                ],
            },
        );
    }

    return (
        <div className="relative w-full min-w-0 space-y-4 p-4 md:p-6">
            <Head title={`${title} · QAT Data`} />
            <nav
                aria-label="QAT catalogue"
                className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"
            >
                <Link
                    href={catalogueUrl}
                    className="text-blue-700 hover:underline dark:text-blue-300"
                >
                    QAT Data
                </Link>
                {breadcrumbs.map((crumb) => (
                    <span
                        key={crumb.url}
                        className="inline-flex items-center gap-2"
                    >
                        <ChevronRightIcon
                            aria-hidden="true"
                            className="size-3 text-slate-400"
                        />
                        <Link
                            href={crumb.url}
                            className="text-blue-700 hover:underline dark:text-blue-300"
                        >
                            {crumb.label}
                        </Link>
                    </span>
                ))}
                <ChevronRightIcon
                    aria-hidden="true"
                    className="size-3 text-slate-400"
                />
                <span aria-current="page">{title}</span>
            </nav>
            <PageHeader
                title={level === 'year' ? 'QAT Data' : title}
                meta={`${total} ${title.toLowerCase()}`}
                actions={
                    level === 'year' ? (
                        <Button asChild>
                            <Link href="/superadmin/qat-transfer">
                                QAT Transfer
                            </Link>
                        </Button>
                    ) : level === 'topic' && baseUrl ? (
                        <Button asChild variant="primary">
                            <Link
                                href={scopedUrl(baseUrl, {
                                    ...context,
                                    view: 'questions',
                                })}
                            >
                                <ClipboardListIcon aria-hidden="true" /> All
                                questions
                            </Link>
                        </Button>
                    ) : undefined
                }
            />

            {syllabus && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                        {month} syllabus description
                        {!syllabus.description && (
                            <span className="ml-2 text-xs font-normal text-slate-500">
                                Empty
                            </span>
                        )}
                    </p>
                    <Button
                        type="button"
                        className={blueAction}
                        onClick={() => setEditSyllabus(true)}
                    >
                        <FilePenLineIcon aria-hidden="true" /> Edit description
                    </Button>
                </div>
            )}
            {baseUrl && (
                <FilterBar
                    key={listUrl}
                    url={baseUrl}
                    clearUrl={listUrl}
                    filters={{ ...context, ...filters }}
                    options={filterOptions}
                />
            )}

            <section
                aria-label={title}
                className="overflow-hidden rounded-xl border border-blue-100 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-left text-xs text-slate-700 dark:text-slate-200">
                        <caption className="sr-only">
                            {title}
                            {month && ` in ${month}`}
                        </caption>
                        <thead className="border-b border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-200">
                            <tr>
                                {columns[level].map((column) => (
                                    <th
                                        key={column}
                                        scope="col"
                                        className="whitespace-nowrap px-4 py-3 font-semibold"
                                    >
                                        {column}
                                    </th>
                                ))}
                                <th
                                    scope="col"
                                    className="px-4 py-3 text-right font-semibold"
                                >
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((row) => {
                                const name =
                                    level === 'question'
                                        ? questionText(row.name, row.id)
                                        : row.name;
                                const editLabel = `Edit ${level} for ${month}`;
                                const removeLabel = `Remove ${level} from ${month}`;

                                return (
                                    <tr
                                        key={row.id}
                                        className="transition-colors hover:bg-blue-50/60 dark:hover:bg-blue-950/30"
                                    >
                                        <th
                                            scope="row"
                                            className={`${cellClass} font-semibold text-slate-900 dark:text-slate-100`}
                                        >
                                            {row.url ? (
                                                <Link
                                                    href={row.url}
                                                    className="text-blue-700 hover:underline dark:text-blue-300"
                                                >
                                                    {name}
                                                </Link>
                                            ) : (
                                                <span className="line-clamp-2 min-w-48 max-w-xl">
                                                    {name}
                                                </span>
                                            )}
                                            {row.name_ur && (
                                                <span
                                                    dir="rtl"
                                                    className="ms-2 font-normal text-slate-500 dark:text-slate-400"
                                                >
                                                    {row.name_ur}
                                                </span>
                                            )}
                                        </th>
                                        {level === 'subject' && (
                                            <td className={cellClass}>
                                                {row.source_pattern_name}
                                            </td>
                                        )}
                                        {level === 'question' ? (
                                            <>
                                                <td className={cellClass}>
                                                    {row.type_name}
                                                </td>
                                                <td className={cellClass}>
                                                    {row.topic_name ?? '—'}
                                                </td>
                                            </>
                                        ) : (
                                            <td
                                                className={`${cellClass} tabular-nums`}
                                            >
                                                {row.count}
                                            </td>
                                        )}
                                        {row.status != null && (
                                            <td className={cellClass}>
                                                <StatusBadge
                                                    active={row.status}
                                                />
                                            </td>
                                        )}
                                        <td className={cellClass}>
                                            <div className="flex items-center justify-end gap-2">
                                                {row.url && (
                                                    <Button
                                                        asChild
                                                        size="icon-sm"
                                                        className={blueAction}
                                                    >
                                                        <Link
                                                            href={row.url}
                                                            title={`Open ${name}`}
                                                            aria-label={`Open ${name}`}
                                                        >
                                                            <ArrowRightIcon
                                                                aria-hidden="true"
                                                                className="size-4"
                                                            />
                                                        </Link>
                                                    </Button>
                                                )}
                                                {row.action_url && (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            size="icon-sm"
                                                            title={editLabel}
                                                            aria-label={
                                                                editLabel
                                                            }
                                                            className={
                                                                blueAction
                                                            }
                                                            onClick={() =>
                                                                setEditing(row)
                                                            }
                                                        >
                                                            <PencilIcon
                                                                aria-hidden="true"
                                                                className="size-4"
                                                            />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="icon-sm"
                                                            title={removeLabel}
                                                            aria-label={
                                                                removeLabel
                                                            }
                                                            className={
                                                                redAction
                                                            }
                                                            onClick={() =>
                                                                setRemoving(row)
                                                            }
                                                        >
                                                            <Trash2Icon
                                                                aria-hidden="true"
                                                                className="size-4"
                                                            />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {!entries.length && (
                                <tr>
                                    <td
                                        colSpan={columns[level].length + 1}
                                        className="px-4 py-9 text-center text-slate-500 dark:text-slate-400"
                                    >
                                        No {title.toLowerCase()}{' '}
                                        {baseUrl
                                            ? 'match this view.'
                                            : 'have been added yet.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {!Array.isArray(rows) && <Pager page={rows} />}
            </section>

            {editing &&
                month &&
                (level === 'question' ? (
                    <Suspense
                        fallback={<p role="status">Loading question editor…</p>}
                    >
                        <QuestionEditor
                            questionId={editing.id}
                            editUrl={editing.edit_url}
                            updateUrl={editing.update_url}
                            title={`Edit question #${editing.id} for ${month}`}
                            scope={breadcrumbs.map((crumb) => crumb.label)}
                            onClose={() => setEditing(null)}
                            onSaved={() => router.reload()}
                        />
                    </Suspense>
                ) : (
                    <RecordEditor
                        row={editing}
                        level={level}
                        month={month}
                        onClose={() => setEditing(null)}
                    />
                ))}
            {editSyllabus && syllabus && month && (
                <DescriptionEditor
                    syllabus={syllabus}
                    month={month}
                    onClose={() => setEditSyllabus(false)}
                />
            )}
            <Modal
                open={removing !== null}
                onOpenChange={(open) => {
                    if (!open && !removeBusy) {
                        setRemoving(null);
                    }
                }}
                title={`Remove ${level} from ${month}?`}
                footer={
                    <>
                        <Button
                            type="button"
                            disabled={removeBusy}
                            onClick={() => setRemoving(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            disabled={removeBusy}
                            onClick={() => {
                                if (!removing?.action_url || removeBusy) {
                                    return;
                                }

                                setRemoveBusy(true);
                                router.delete(removing.action_url, {
                                    data: context,
                                    preserveScroll: true,
                                    onSuccess: () => setRemoving(null),
                                    onFinish: () => setRemoveBusy(false),
                                });
                            }}
                        >
                            {removeBusy ? 'Removing…' : `Remove from ${month}`}
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    {removing &&
                        (level === 'question'
                            ? `Question #${removing.id}`
                            : removing.name)}{' '}
                    will be removed from the {month} syllabus. Other months and
                    saved papers keep their existing content.
                </p>
            </Modal>
        </div>
    );
}

function RecordEditor({
    row,
    level,
    month,
    onClose,
}: {
    row: Row;
    level: Level;
    month: string;
    onClose: () => void;
}) {
    const form = useForm({
        name: row.name,
        status: Boolean(row.status),
        name_ur: row.name_ur ?? '',
        sort_id: row.sort_id ?? 0,
        chapter_number: row.chapter_number ?? null,
    });
    const hasDetails = level === 'chapter' || level === 'topic';

    return (
        <EditModal
            open
            onClose={onClose}
            onSave={(event) => {
                event.preventDefault();

                if (row.action_url) {
                    form.patch(row.action_url, {
                        preserveScroll: true,
                        onSuccess: onClose,
                    });
                }
            }}
            title={`Edit ${level} for ${month}`}
            description={`Changes apply to the ${month} syllabus.`}
            busy={form.processing}
        >
            <label className="block space-y-1 text-sm">
                <span>Name</span>
                <Input
                    value={form.data.name}
                    onChange={(event) =>
                        form.setData('name', event.target.value)
                    }
                    required
                />
            </label>
            {hasDetails && (
                <>
                    <label className="block space-y-1 text-sm">
                        <span>Urdu name</span>
                        <Input
                            dir="rtl"
                            value={form.data.name_ur}
                            onChange={(event) =>
                                form.setData('name_ur', event.target.value)
                            }
                        />
                    </label>
                    <label className="block space-y-1 text-sm">
                        <span>Sort order</span>
                        <Input
                            type="number"
                            min={0}
                            value={form.data.sort_id}
                            onChange={(event) =>
                                form.setData(
                                    'sort_id',
                                    Number(event.target.value),
                                )
                            }
                            required
                        />
                    </label>
                </>
            )}
            {level === 'chapter' && (
                <label className="block space-y-1 text-sm">
                    <span>Chapter number</span>
                    <Input
                        type="number"
                        min={0}
                        value={form.data.chapter_number ?? ''}
                        onChange={(event) =>
                            form.setData(
                                'chapter_number',
                                event.target.value
                                    ? Number(event.target.value)
                                    : null,
                            )
                        }
                    />
                </label>
            )}
            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={form.data.status}
                    onChange={(event) =>
                        form.setData('status', event.target.checked)
                    }
                    className="size-4 accent-blue-600"
                />
                Active
            </label>
            {Object.values(form.errors).map((error) => (
                <p key={error} role="alert" className="text-sm text-red-700">
                    {error}
                </p>
            ))}
        </EditModal>
    );
}

function DescriptionEditor({
    syllabus,
    month,
    onClose,
}: {
    syllabus: Syllabus;
    month: string;
    onClose: () => void;
}) {
    const form = useForm({ description: syllabus.description });

    return (
        <EditModal
            open
            onClose={onClose}
            onSave={(event) => {
                event.preventDefault();
                form.patch(syllabus.url, {
                    preserveScroll: true,
                    onSuccess: onClose,
                });
            }}
            title={`Edit ${month} syllabus description`}
            description={`Shown to customers who select ${month} for this subject.`}
            busy={form.processing}
        >
            <Suspense fallback={<p role="status">Loading syllabus editor…</p>}>
                <SyllabusEditor
                    value={form.data.description}
                    onChange={(value) => form.setData('description', value)}
                    disabled={form.processing}
                />
            </Suspense>
            {form.errors.description && (
                <p role="alert" className="text-sm text-red-700">
                    {form.errors.description}
                </p>
            )}
        </EditModal>
    );
}

QatMonthlyPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'QAT Data', href: catalogueUrl },
    ],
};

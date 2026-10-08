import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRightLeftIcon,
    ArrowUpDownIcon,
    EyeIcon,
    GripVerticalIcon,
    PencilIcon,
    PlusIcon,
    Trash2Icon,
    UploadIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Card,
    Checkbox,
    EmptyState,
    PageHeader,
    Pagination,
    SearchInput,
    SelectionBar,
} from '@/components/tm';
import type { PageMeta } from '@/components/tm';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { usePermission } from '@/hooks/use-permission';
import { QuestionContent } from '@/pages/customer/papers/paper-layouts/questions/question-content';
import { BulkQuestionTypeChangeDialog } from './change-type-dialog';
import type { QuestionTypeOption } from './form';
import { QuestionPathBreadcrumbs } from './path-breadcrumbs';
import type { QuestionBreadcrumb } from './path-breadcrumbs';
import { SourceBadge } from './source-badge';
import { fetchQuestionJson } from './use-question-options';

interface QuestionRow {
    id: number;
    summary_text: string;
    statement_en: string | null;
    statement_ur: string | null;
    description_en: string | null;
    description_ur: string | null;
    question_type: {
        id: number;
        name: string;
        schema_key: string;
        is_objective: boolean;
    };
    source: string | null;
    source_label: string | null;
    status: number;
    sort_order: number;
}

interface SelectionRow {
    id: number;
    question_type_id: number;
    schema_key: string | null;
}

interface SortRow {
    id: number;
    summary_text: string;
}

interface Filters {
    q: string;
    type: string;
    source: string;
    status: string;
    per_page: string;
}

interface Scope {
    chapter_id: number;
    topic_id: number | null;
    unassigned: boolean;
    subject_type: 'chapter-wise' | 'topic-wise';
}

function QuestionPreview({ row }: { row: QuestionRow }) {
    const hasStatement = Boolean(row.statement_en || row.statement_ur);
    const hasDescription = Boolean(row.description_en || row.description_ur);
    const contentClass =
        'break-words [&_img]:inline-block [&_img]:max-h-40 [&_img]:max-w-full [&_img]:object-contain [&_p]:my-0';

    return (
        <div className="max-w-[42rem] space-y-2">
            <Link
                href={`/superadmin/questions/${row.id}`}
                className="block space-y-1 font-medium text-slate-900 hover:text-brand-600 dark:text-slate-100"
            >
                {row.statement_en && (
                    <QuestionContent
                        value={row.statement_en}
                        className={contentClass}
                    />
                )}
                {row.statement_ur && (
                    <div dir="rtl">
                        <QuestionContent
                            value={row.statement_ur}
                            className={contentClass}
                        />
                    </div>
                )}
                {!hasStatement && (
                    <QuestionContent
                        value={row.summary_text}
                        className={contentClass}
                    />
                )}
            </Link>
            {hasDescription && (
                <div className="space-y-1 border-l-2 border-slate-200 pl-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Description
                    </span>
                    {row.description_en && (
                        <QuestionContent
                            value={row.description_en}
                            className={contentClass}
                        />
                    )}
                    {row.description_ur && (
                        <div dir="rtl">
                            <QuestionContent
                                value={row.description_ur}
                                className={contentClass}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ListQuestions({
    title,
    breadcrumbs,
    items,
    filters,
    questionTypes,
    sourceOptions,
    scope,
    addHref,
    importHref,
}: {
    title: string;
    breadcrumbs: QuestionBreadcrumb[];
    items: PageMeta & { data: QuestionRow[] };
    filters: Filters;
    questionTypes: { id: number; name: string }[];
    sourceOptions: { value: string; label: string }[];
    scope: Scope;
    addHref: string;
    importHref: string;
}) {
    const { can } = usePermission();
    const pageUrl = usePage().url.split('?')[0];
    const [search, setSearch] = useState(filters.q);
    const [selected, setSelected] = useState<Map<number, SelectionRow>>(
        new Map(),
    );
    const [selectionMode, setSelectionMode] = useState(false);
    const [allTypes, setAllTypes] = useState<QuestionTypeOption[] | null>(null);
    const [typeDialogOpen, setTypeDialogOpen] = useState(false);
    const [loadingTypes, setLoadingTypes] = useState(false);
    const [actionError, setActionError] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<QuestionRow | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [sorting, setSorting] = useState<SortRow[] | null>(null);
    const [draggedId, setDraggedId] = useState<number | null>(null);
    const [sortDirty, setSortDirty] = useState(false);
    const [sortSaving, setSortSaving] = useState(false);
    const [sortLoading, setSortLoading] = useState(false);
    const [sortTypeId, setSortTypeId] = useState<string | null>(null);
    const [sortPickerOpen, setSortPickerOpen] = useState(false);
    const [pendingSortType, setPendingSortType] = useState('');

    const visit = (next: Partial<Filters>, page = 1) => {
        const current = { ...filters, ...next };
        const query = Object.fromEntries(
            Object.entries({ ...current, page: String(page) }).filter(
                ([, value]) => value !== '',
            ),
        );
        router.get(pageUrl, query, {
            only: ['items', 'filters'],
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    useEffect(() => {
        if (search === filters.q) {
            return;
        }

        const timer = window.setTimeout(() => visit({ q: search }), 350);

        return () => window.clearTimeout(timer);
        // Each search visit receives a fresh filter prop; the draft input remains local.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, filters.q]);

    const selectedQuestions = useMemo(() => {
        if (!allTypes) {
            return [];
        }

        const byId = new Map(allTypes.map((type) => [type.id, type]));

        return [...selected.values()].flatMap((row) => {
            const type = byId.get(row.question_type_id);

            return type
                ? [
                      {
                          id: row.id,
                          question_type: {
                              ...type,
                              schema_key: row.schema_key || type.schema_key,
                          },
                      },
                  ]
                : [];
        });
    }, [allTypes, selected]);

    const toggleSelected = (row: QuestionRow, checked: boolean) => {
        setSelected((current) => {
            const next = new Map(current);

            if (checked) {
                next.set(row.id, {
                    id: row.id,
                    question_type_id: row.question_type.id,
                    schema_key: row.question_type.schema_key,
                });
            } else {
                next.delete(row.id);
            }

            return next;
        });
    };

    const selectPage = (checked: boolean) => {
        setSelected((current) => {
            const next = new Map(current);
            items.data.forEach((row) => {
                if (checked) {
                    next.set(row.id, {
                        id: row.id,
                        question_type_id: row.question_type.id,
                        schema_key: row.question_type.schema_key,
                    });
                } else {
                    next.delete(row.id);
                }
            });

            return next;
        });
    };

    const selectAllMatching = async () => {
        setActionError('');
        const query = new URLSearchParams({
            chapter_id: String(scope.chapter_id),
            ...filters,
        });

        if (scope.topic_id) {
            query.set('topic_id', String(scope.topic_id));
        }

        if (scope.unassigned) {
            query.set('unassigned', '1');
        }

        try {
            const data = await fetchQuestionJson<{ rows: SelectionRow[] }>(
                `/superadmin/questions/selection-ids?${query}`,
            );
            setSelected(new Map(data.rows.map((row) => [row.id, row])));
        } catch {
            setActionError(
                'Could not select matching questions. Please retry.',
            );
        }
    };

    const openTypeDialog = async () => {
        setActionError('');

        if (allTypes) {
            setTypeDialogOpen(true);

            return;
        }

        setLoadingTypes(true);

        try {
            const data = await fetchQuestionJson<{
                options: QuestionTypeOption[];
            }>('/superadmin/questions/list-types');
            setAllTypes(data.options);
            setTypeDialogOpen(true);
        } catch {
            setActionError('Could not load question types. Please retry.');
        } finally {
            setLoadingTypes(false);
        }
    };

    const startSorting = async (typeId: string) => {
        setActionError('');
        setSortLoading(true);
        const query = new URLSearchParams({
            chapter_id: String(scope.chapter_id),
            question_type_id: typeId,
        });

        if (scope.topic_id) {
            query.set('topic_id', String(scope.topic_id));
        }

        try {
            const data = await fetchQuestionJson<{ rows: SortRow[] }>(
                `/superadmin/questions/sort-rows?${query}`,
            );
            setSorting(data.rows);
            setSortTypeId(typeId);
            setSortDirty(false);
            setSelected(new Map());
            setSelectionMode(false);
        } catch {
            setActionError('Could not load the order. Please retry.');
        } finally {
            setSortLoading(false);
        }
    };

    const openSort = () => {
        setActionError('');

        if (questionTypes.length === 0) {
            setActionError('There are no questions to sort.');

            return;
        }

        const typeId =
            filters.type ||
            (questionTypes.length === 1 ? String(questionTypes[0].id) : '');

        if (typeId) {
            void startSorting(typeId);
        } else {
            setPendingSortType('');
            setSortPickerOpen(true);
        }
    };

    const moveSortRow = (targetId: number) => {
        if (draggedId === null || draggedId === targetId) {
            return;
        }

        setSorting((current) => {
            if (!current) {
                return current;
            }

            const next = [...current];
            const from = next.findIndex((row) => row.id === draggedId);
            const to = next.findIndex((row) => row.id === targetId);

            if (from < 0 || to < 0) {
                return current;
            }

            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);

            return next;
        });
        setDraggedId(null);
        setSortDirty(true);
    };

    const saveSorting = () => {
        if (!sorting || !sortTypeId) {
            return;
        }

        setSortSaving(true);
        router.post(
            '/superadmin/questions/reorder',
            {
                chapter_id: scope.chapter_id,
                topic_id: scope.topic_id,
                question_type_id: Number(sortTypeId),
                order: sorting.map((row) => row.id),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSorting(null);
                    setSortTypeId(null);
                    setSortDirty(false);
                },
                onError: (errors) =>
                    setActionError(
                        Object.values(errors)[0] ?? 'Could not save the order.',
                    ),
                onFinish: () => setSortSaving(false),
            },
        );
    };

    const deleteQuestion = () => {
        if (!deleteTarget) {
            return;
        }

        setDeleting(true);
        router.delete(`/superadmin/questions/${deleteTarget.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    const pageSelected =
        items.data.length > 0 &&
        items.data.every((row) => selected.has(row.id));
    const sortRows = sorting ?? [];

    return (
        <>
            <Head title={`${title} · Questions`} />
            <div className="space-y-5 p-4 md:p-6">
                <QuestionPathBreadcrumbs items={breadcrumbs} />
                <PageHeader
                    title={title}
                    meta={`${items.total} questions`}
                    actions={
                        sorting ? (
                            <>
                                <Button
                                    onClick={() => {
                                        setSorting(null);
                                        setSortTypeId(null);
                                        setSortDirty(false);
                                    }}
                                    disabled={sortSaving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={saveSorting}
                                    disabled={!sortDirty || sortSaving}
                                >
                                    Save order
                                </Button>
                            </>
                        ) : (
                            <>
                                {can('questions.edit') && (
                                    <Button
                                        onClick={openSort}
                                        disabled={sortLoading}
                                    >
                                        <ArrowUpDownIcon />
                                        {sortLoading ? 'Loading…' : 'Sort'}
                                    </Button>
                                )}
                                {can('questions.edit') && (
                                    <Button
                                        onClick={() => setSelectionMode(true)}
                                    >
                                        <ArrowRightLeftIcon />
                                        Select
                                    </Button>
                                )}
                                {can('questions.import') && (
                                    <Button asChild>
                                        <Link href={importHref}>
                                            <UploadIcon />
                                            Import
                                        </Link>
                                    </Button>
                                )}
                                {can('questions.create') && (
                                    <Button variant="primary" asChild>
                                        <Link href={addHref}>
                                            <PlusIcon />
                                            Add Question
                                        </Link>
                                    </Button>
                                )}
                            </>
                        )
                    }
                />

                {actionError && (
                    <p role="alert" className="text-sm text-rose-600">
                        {actionError}
                    </p>
                )}

                {sorting ? (
                    <Card padding="none" className="overflow-hidden">
                        <div className="border-b px-5 py-3 text-sm text-slate-500">
                            Drag questions into the required order.{' '}
                            {sortRows.length} in this type.
                        </div>
                        <div className="max-h-[65vh] overflow-y-auto">
                            {sortRows.map((row, index) => (
                                <div
                                    key={row.id}
                                    draggable
                                    onDragStart={() => setDraggedId(row.id)}
                                    onDragOver={(event) =>
                                        event.preventDefault()
                                    }
                                    onDrop={() => moveSortRow(row.id)}
                                    onDragEnd={() => setDraggedId(null)}
                                    className="flex cursor-grab items-center gap-3 border-b px-5 py-3 text-sm last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                >
                                    <GripVerticalIcon className="size-4 shrink-0 text-slate-400" />
                                    <span className="w-8 shrink-0 tabular-nums text-slate-500">
                                        {index + 1}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">
                                        {row.summary_text}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-2">
                            <SearchInput
                                value={search}
                                onValueChange={setSearch}
                                placeholder="Search questions"
                                className="min-w-56 flex-1 sm:max-w-sm"
                            />
                            <Select
                                value={filters.type || 'all'}
                                onValueChange={(value) =>
                                    visit({
                                        type: value === 'all' ? '' : value,
                                    })
                                }
                            >
                                <SelectTrigger className="h-9 w-44">
                                    <SelectValue placeholder="Question type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All types
                                    </SelectItem>
                                    {questionTypes.map((type) => (
                                        <SelectItem
                                            key={type.id}
                                            value={String(type.id)}
                                        >
                                            {type.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.source || 'all'}
                                onValueChange={(value) =>
                                    visit({
                                        source: value === 'all' ? '' : value,
                                    })
                                }
                            >
                                <SelectTrigger className="h-9 w-40">
                                    <SelectValue placeholder="Source" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All sources
                                    </SelectItem>
                                    {sourceOptions.map((source) => (
                                        <SelectItem
                                            key={source.value}
                                            value={source.value}
                                        >
                                            {source.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.status || 'all'}
                                onValueChange={(value) =>
                                    visit({
                                        status: value === 'all' ? '' : value,
                                    })
                                }
                            >
                                <SelectTrigger className="h-9 w-32">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All statuses
                                    </SelectItem>
                                    <SelectItem value="1">Active</SelectItem>
                                    <SelectItem value="0">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.per_page}
                                onValueChange={(value) =>
                                    visit({ per_page: value })
                                }
                            >
                                <SelectTrigger
                                    className="h-9 w-24"
                                    aria-label="Questions per page"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[25, 50, 100, 200].map((count) => (
                                        <SelectItem
                                            key={count}
                                            value={String(count)}
                                        >
                                            {count}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectionMode && (
                            <SelectionBar
                                count={selected.size}
                                onExit={() => {
                                    setSelectionMode(false);
                                    setSelected(new Map());
                                }}
                                selectAll={{
                                    total: items.data.length,
                                    allSelected: pageSelected,
                                    onToggle: selectPage,
                                }}
                            >
                                <Button
                                    size="sm"
                                    onClick={selectAllMatching}
                                    disabled={items.total === 0}
                                >
                                    Select all matching ({items.total})
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={openTypeDialog}
                                    disabled={
                                        selected.size === 0 || loadingTypes
                                    }
                                >
                                    {loadingTypes ? 'Loading…' : 'Change type'}
                                </Button>
                            </SelectionBar>
                        )}

                        {items.data.length === 0 ? (
                            <EmptyState
                                icon={EyeIcon}
                                title="No questions found"
                                action={
                                    can('questions.create') ? (
                                        <Button variant="primary" asChild>
                                            <Link href={addHref}>
                                                <PlusIcon />
                                                Add Question
                                            </Link>
                                        </Button>
                                    ) : undefined
                                }
                            />
                        ) : (
                            <Card padding="none" className="overflow-x-auto">
                                <table className="w-full min-w-[680px] text-left text-sm">
                                    <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50">
                                        <tr>
                                            {selectionMode && (
                                                <th
                                                    scope="col"
                                                    className="w-10 px-4 py-3"
                                                >
                                                    <Checkbox
                                                        label="Select page"
                                                        checked={pageSelected}
                                                        indeterminate={
                                                            selected.size > 0 &&
                                                            !pageSelected
                                                        }
                                                        onCheckedChange={
                                                            selectPage
                                                        }
                                                    />
                                                </th>
                                            )}
                                            <th
                                                scope="col"
                                                className="px-5 py-3"
                                            >
                                                Question
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-5 py-3"
                                            >
                                                Type
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-5 py-3"
                                            >
                                                Source
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-5 py-3"
                                            >
                                                Status
                                            </th>
                                            <th
                                                scope="col"
                                                className="w-28 px-5 py-3 text-right"
                                            >
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {items.data.map((row) => (
                                            <tr
                                                key={row.id}
                                                className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                            >
                                                {selectionMode && (
                                                    <td className="px-4 py-3">
                                                        <Checkbox
                                                            label={`Select question ${row.id}`}
                                                            checked={selected.has(
                                                                row.id,
                                                            )}
                                                            onCheckedChange={(
                                                                checked,
                                                            ) =>
                                                                toggleSelected(
                                                                    row,
                                                                    checked,
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                )}
                                                <td className="min-w-80 px-5 py-3 align-top">
                                                    <QuestionPreview
                                                        row={row}
                                                    />
                                                </td>
                                                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                                                    {row.question_type.name}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <SourceBadge
                                                        source={row.source}
                                                        label={row.source_label}
                                                    />
                                                </td>
                                                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                                                    {row.status === 1
                                                        ? 'Active'
                                                        : 'Inactive'}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            asChild
                                                        >
                                                            <Link
                                                                href={`/superadmin/questions/${row.id}`}
                                                                aria-label={`View question ${row.id}`}
                                                            >
                                                                <EyeIcon />
                                                            </Link>
                                                        </Button>
                                                        {can(
                                                            'questions.edit',
                                                        ) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                asChild
                                                            >
                                                                <Link
                                                                    href={`/superadmin/questions/${row.id}/edit`}
                                                                    aria-label={`Edit question ${row.id}`}
                                                                >
                                                                    <PencilIcon />
                                                                </Link>
                                                            </Button>
                                                        )}
                                                        {can(
                                                            'questions.delete',
                                                        ) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                onClick={() =>
                                                                    setDeleteTarget(
                                                                        row,
                                                                    )
                                                                }
                                                                aria-label={`Delete question ${row.id}`}
                                                            >
                                                                <Trash2Icon />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>
                        )}
                        <Pagination
                            meta={items}
                            label="questions"
                            onPageChange={(page) => visit({}, page)}
                        />
                    </>
                )}
            </div>

            <Dialog open={sortPickerOpen} onOpenChange={setSortPickerOpen}>
                <DialogContent>
                    <DialogTitle>Sort questions</DialogTitle>
                    <DialogDescription>
                        Choose the question type whose order you want to change.
                    </DialogDescription>
                    <Select
                        value={pendingSortType}
                        onValueChange={setPendingSortType}
                    >
                        <SelectTrigger aria-label="Question type to sort">
                            <SelectValue placeholder="Select question type" />
                        </SelectTrigger>
                        <SelectContent>
                            {questionTypes.map((type) => (
                                <SelectItem
                                    key={type.id}
                                    value={String(type.id)}
                                >
                                    {type.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <DialogFooter>
                        <Button onClick={() => setSortPickerOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            disabled={!pendingSortType}
                            onClick={() => {
                                setSortPickerOpen(false);
                                void startSorting(pendingSortType);
                            }}
                        >
                            Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <DialogContent>
                    <DialogTitle>Delete question</DialogTitle>
                    <DialogDescription>
                        Delete question #{deleteTarget?.id}?
                    </DialogDescription>
                    <DialogFooter>
                        <Button onClick={() => setDeleteTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={deleteQuestion}
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting…' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {allTypes && (
                <BulkQuestionTypeChangeDialog
                    open={typeDialogOpen}
                    onOpenChange={setTypeDialogOpen}
                    questions={selectedQuestions}
                    questionTypes={allTypes}
                    onChanged={() => {
                        setSelected(new Map());
                        setSelectionMode(false);
                    }}
                />
            )}
        </>
    );
}

ListQuestions.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Questions', href: '/superadmin/questions' },
    ],
};

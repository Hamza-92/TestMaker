import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
    ArrowRightLeftIcon,
    ArrowUpDownIcon,
    EyeIcon,
    GripVerticalIcon,
    PencilIcon,
    SearchIcon,
    Trash2Icon,
    UploadIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import PlusIcon from '@/components/icons/PlusIcon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import type { ComboboxOptionItem } from '@/components/ui/floating-combobox';
import { FloatingCombobox } from '@/components/ui/floating-combobox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { usePermission } from '@/hooks/use-permission';
import { QuestionContent } from '@/pages/customer/papers/paper-layouts/questions/question-content';
import { BulkQuestionTypeChangeDialog } from './questions/change-type-dialog';
import type { ChapterOption, QuestionTypeOption } from './questions/form';
import type { TopicOption } from './questions/form';
import { SourceBadge } from './questions/source-badge';
import {
    fetchQuestionJson,
    useQuestionJson,
    useQuestionOptions,
} from './questions/use-question-options';

interface QuestionRow {
    id: number;
    summary_text: string;
    source: string | null;
    source_label?: string | null;
    status: number;
    sort_order: number;
    created_at: string | null;
    question_type: QuestionTypeOption;
    chapter: {
        id: number;
        name: string;
        name_ur: string | null;
        chapter_number: number | null;
        group_name: string | null;
        subject: {
            id: number;
            name_eng: string;
            subject_type: 'chapter-wise' | 'topic-wise';
        };
        class: { id: number; name: string };
        pattern: { id: number; name: string; short_name: string | null };
    };
    topic: { id: number; name: string; name_ur: string | null } | null;
    options_count: number;
    correct_options_count: number;
    items_count: number;
}

interface Filters {
    chapter_id: number | null;
    topic_id: number | null;
}

interface PatternOption {
    id: number;
    name: string;
    short_name: string | null;
}
interface ClassOption {
    id: number;
    name: string;
}
interface SubjectOption {
    id: number;
    name_eng: string;
    name_ur: string | null;
}
interface QuestionListData {
    chapter: ChapterOption;
    questionTypes: QuestionTypeOption[];
    topics: TopicOption[];
    questions: (Omit<QuestionRow, 'chapter' | 'topic' | 'question_type'> & {
        question_type_id: number;
        topic_id: number | null;
    })[];
}

function ScopeSelect({
    label,
    options,
    value,
    onChange,
    disabled,
    placeholder,
}: {
    label: string;
    options: ComboboxOptionItem[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
}) {
    return (
        <FloatingCombobox
            label={label}
            hideLabel
            compact
            placeholder={placeholder ?? label}
            options={options}
            value={
                options.find((option) => String(option.id) === value) ?? null
            }
            onChange={(option) => onChange(option ? String(option.id) : '')}
            disabled={disabled}
        />
    );
}

function StatusBadge({ status }: { status: number }) {
    return status === 1 ? (
        <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-100 font-medium text-emerald-700"
        >
            <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />
            Active
        </Badge>
    ) : (
        <Badge
            variant="outline"
            className="border-gray-200 bg-gray-100 font-medium text-gray-600"
        >
            <span className="mr-1 inline-block size-1.5 rounded-full bg-gray-400" />
            Inactive
        </Badge>
    );
}

function KindBadge({ isObjective }: { isObjective: boolean }) {
    return isObjective ? (
        <Badge
            variant="outline"
            className="border-blue-200 bg-blue-50 px-1.5 py-0 text-[11px] font-normal text-blue-700"
        >
            Obj
        </Badge>
    ) : (
        <Badge
            variant="outline"
            className="border-violet-200 bg-violet-50 px-1.5 py-0 text-[11px] font-normal text-violet-700"
        >
            Subj
        </Badge>
    );
}

const PAGE_SIZE_OPTIONS = [100, 200, 300, 500, 1000];

export default function Questions({
    patterns,
    initialChapter,
    filters,
}: {
    patterns: PatternOption[];
    initialChapter: ChapterOption | null;
    filters: Filters;
}) {
    const { can } = usePermission();
    const canEditQuestions = can('questions.edit');
    const activeChapter = initialChapter;

    // ── Local cascading-filter state ─────────────────────────────────────────
    const [patternId, setPatternId] = useState(() =>
        activeChapter ? String(activeChapter.pattern.id) : '',
    );
    const [classId, setClassId] = useState(() =>
        activeChapter ? String(activeChapter.class.id) : '',
    );
    const [subjectId, setSubjectId] = useState(() =>
        activeChapter ? String(activeChapter.subject.id) : '',
    );
    const [chapterId, setChapterId] = useState(() =>
        filters.chapter_id ? String(filters.chapter_id) : '',
    );
    const [topicId, setTopicId] = useState(() =>
        filters.topic_id ? String(filters.topic_id) : '',
    );

    // ── Search / pagination (client-side, within loaded questions) ────────────
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(300);
    const [deleteTarget, setDeleteTarget] = useState<QuestionRow | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [changeTypeOpen, setChangeTypeOpen] = useState(false);
    const [sortingEnabled, setSortingEnabled] = useState(false);
    const [sortingItems, setSortingItems] = useState<QuestionRow[]>([]);
    const [draggedId, setDraggedId] = useState<number | null>(null);
    const [sortDirty, setSortDirty] = useState(false);
    const [sortSaving, setSortSaving] = useState(false);
    const [loadedScope, setLoadedScope] = useState<Filters>(filters);
    const [loadingTypes, setLoadingTypes] = useState(false);
    const [typeError, setTypeError] = useState('');
    const [questionTypes, setQuestionTypes] = useState<
        QuestionTypeOption[] | null
    >(null);

    const classesResource = useQuestionOptions<ClassOption>(
        patternId
            ? '/superadmin/questions/filter-options?' +
                  new URLSearchParams({
                      level: 'classes',
                      pattern_id: patternId,
                  })
            : null,
        activeChapter && String(activeChapter.pattern.id) === patternId
            ? [activeChapter.class]
            : [],
    );
    const subjectsResource = useQuestionOptions<SubjectOption>(
        patternId && classId
            ? '/superadmin/questions/filter-options?' +
                  new URLSearchParams({
                      level: 'subjects',
                      pattern_id: patternId,
                      class_id: classId,
                  })
            : null,
        activeChapter &&
            String(activeChapter.pattern.id) === patternId &&
            String(activeChapter.class.id) === classId
            ? [activeChapter.subject]
            : [],
    );
    const chaptersResource = useQuestionOptions<ChapterOption>(
        patternId && classId && subjectId
            ? '/superadmin/questions/filter-options?' +
                  new URLSearchParams({
                      level: 'chapters',
                      pattern_id: patternId,
                      class_id: classId,
                      subject_id: subjectId,
                  })
            : null,
        activeChapter &&
            String(activeChapter.pattern.id) === patternId &&
            String(activeChapter.class.id) === classId &&
            String(activeChapter.subject.id) === subjectId
            ? [activeChapter]
            : [],
    );
    const availableClasses = classesResource.options;
    const availableSubjects = subjectsResource.options;
    const availableChapters = chaptersResource.options;
    const selectedChapter =
        availableChapters.find((chapter) => String(chapter.id) === chapterId) ??
        null;
    const isTopicWise = selectedChapter?.subject.subject_type === 'topic-wise';
    const topicsResource = useQuestionOptions<TopicOption>(
        isTopicWise && chapterId
            ? '/superadmin/questions/filter-options?' +
                  new URLSearchParams({
                      level: 'topics',
                      chapter_id: chapterId,
                  })
            : null,
    );
    const availableTopics = topicsResource.options;
    const questionResource = useQuestionJson<QuestionListData>(
        loadedScope.chapter_id
            ? '/superadmin/questions/list-data?' +
                  new URLSearchParams({
                      chapter_id: String(loadedScope.chapter_id),
                      ...(loadedScope.topic_id
                          ? { topic_id: String(loadedScope.topic_id) }
                          : {}),
                  })
            : null,
    );
    const loadingQuestions = questionResource.loading;
    const questions = useMemo(() => {
        const data = questionResource.data;

        if (!data) {
            return null;
        }

        const types = new Map(
            data.questionTypes.map((type) => [type.id, type]),
        );
        const topics = new Map(data.topics.map((topic) => [topic.id, topic]));

        return data.questions.map(
            (question): QuestionRow => ({
                ...question,
                chapter: data.chapter,
                question_type: types.get(question.question_type_id)!,
                topic: question.topic_id
                    ? (topics.get(question.topic_id) ?? null)
                    : null,
            }),
        );
    }, [questionResource.data]);
    const availableQuestionTypes = questionResource.data?.questionTypes ?? [];
    const filterResources = [
        classesResource,
        subjectsResource,
        chaptersResource,
        topicsResource,
    ];

    const navigate = (newChapterId: string, newTopicId = '') => {
        setSelectedIds(new Set());
        setChangeTypeOpen(false);
        setSortingEnabled(false);
        setSortingItems([]);
        setTypeFilter('all');
        setPage(1);
        const scope = {
            chapter_id: newChapterId ? Number(newChapterId) : null,
            topic_id: newTopicId ? Number(newTopicId) : null,
        };
        setLoadedScope(scope);
        let url = '/superadmin/questions';

        if (newChapterId) {
            url += '/chapters/' + newChapterId;

            if (newTopicId) {
                url += '/topics/' + newTopicId;
            }
        }

        router.replace({
            url,
            preserveState: true,
            preserveScroll: true,
            props: (props) => ({
                ...props,
                filters: scope,
                initialChapter:
                    availableChapters.find(
                        (chapter) => String(chapter.id) === newChapterId,
                    ) ?? null,
            }),
        });
    };

    const handlePatternChange = (value: string) => {
        setPatternId(value);
        setClassId('');
        setSubjectId('');
        setChapterId('');
        setTopicId('');
        navigate('');
    };
    const handleClassChange = (value: string) => {
        setClassId(value);
        setSubjectId('');
        setChapterId('');
        setTopicId('');
        navigate('');
    };
    const handleSubjectChange = (value: string) => {
        setSubjectId(value);
        setChapterId('');
        setTopicId('');
        navigate('');
    };
    const handleChapterChange = (value: string) => {
        setChapterId(value);
        setTopicId('');
        const chapter = availableChapters.find(
            (item) => String(item.id) === value,
        );
        navigate(chapter?.subject.subject_type === 'topic-wise' ? '' : value);
    };
    const handleTopicChange = (value: string) => {
        setTopicId(value);
        navigate(chapterId, value);
    };

    const openChangeType = async () => {
        setTypeError('');

        if (questionTypes) {
            setChangeTypeOpen(true);

            return;
        }

        setLoadingTypes(true);

        try {
            const data = await fetchQuestionJson<{
                options: QuestionTypeOption[];
            }>('/superadmin/questions/list-types');
            setQuestionTypes(data.options);
            setChangeTypeOpen(true);
        } catch {
            setTypeError('Could not load question types. Please try again.');
        } finally {
            setLoadingTypes(false);
        }
    };

    // ── Client-side search within loaded questions ────────────────────────────
    const filtered = useMemo(() => {
        if (!questions) {
            return [];
        }

        const normalizedSearch = search.toLowerCase().trim();

        return questions.filter((question) => {
            const matchesSearch =
                normalizedSearch === '' ||
                question.summary_text
                    .toLowerCase()
                    .includes(normalizedSearch) ||
                question.question_type.name
                    .toLowerCase()
                    .includes(normalizedSearch);
            const matchesType =
                typeFilter === 'all' ||
                String(question.question_type.id) === typeFilter;
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && question.status === 1) ||
                (statusFilter === 'inactive' && question.status === 0);

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [questions, search, statusFilter, typeFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize,
    );
    const rows = sortingEnabled ? sortingItems : paginated;
    const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));
    const selectedQuestions = (questions ?? []).filter((question) =>
        selectedIds.has(question.id),
    );
    const filteredIds = filtered.map((question) => question.id);
    const allFilteredSelected =
        filteredIds.length > 0 &&
        filteredIds.every((questionId) => selectedIds.has(questionId));
    const someFilteredSelected = filteredIds.some((questionId) =>
        selectedIds.has(questionId),
    );

    const toggleQuestion = (questionId: number, checked: boolean) => {
        setSelectedIds((current) => {
            const next = new Set(current);

            if (checked) {
                next.add(questionId);
            } else {
                next.delete(questionId);
            }

            return next;
        });
    };

    const toggleAllFiltered = (checked: boolean) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            filteredIds.forEach((questionId) => {
                if (checked) {
                    next.add(questionId);
                } else {
                    next.delete(questionId);
                }
            });

            return next;
        });
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const confirmDelete = () => {
        if (!deleteTarget) {
            return;
        }

        setDeleting(true);
        router.delete(`/superadmin/questions/${deleteTarget.id}`, {
            onSuccess: () => questionResource.retry(),
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    // ── Add button href ───────────────────────────────────────────────────────
    const addHref = topicId
        ? `/superadmin/questions/chapters/${chapterId}/topics/${topicId}/add`
        : chapterId
          ? `/superadmin/questions/chapters/${chapterId}/add`
          : '/superadmin/questions/add';
    const importHref = chapterId
        ? `/superadmin/questions/import?chapter_id=${chapterId}${topicId ? `&topic_id=${topicId}` : ''}`
        : '/superadmin/questions/import';

    // ── Chapter label helper ──────────────────────────────────────────────────
    const chapterLabel = (c: ChapterOption) => {
        const title = c.chapter_number ? `Chapter ${c.chapter_number}` : c.name;

        return c.group_name ? `${c.group_name} / ${title}` : title;
    };

    const canAddQuestion = !!chapterId && (!isTopicWise || !!topicId);
    const showTable = questions !== null;
    const selectedSortType = availableQuestionTypes.find(
        (type) => String(type.id) === typeFilter,
    );
    const canSortQuestions =
        showTable &&
        canEditQuestions &&
        typeFilter !== 'all' &&
        (!isTopicWise || topicId !== '');

    const beginSorting = () => {
        if (!questions || !canSortQuestions) {
            return;
        }

        const scopedTopicId = isTopicWise ? Number(topicId) : null;
        setSortingItems(
            questions.filter(
                (question) =>
                    String(question.question_type.id) === typeFilter &&
                    (isTopicWise
                        ? question.topic?.id === scopedTopicId
                        : question.topic === null),
            ),
        );
        setSelectedIds(new Set());
        setSortDirty(false);
        setSortingEnabled(true);
    };

    const cancelSorting = () => {
        setSortingEnabled(false);
        setSortingItems([]);
        setDraggedId(null);
        setSortDirty(false);
    };

    const handleSortDrop = (targetId: number) => {
        if (draggedId === null || draggedId === targetId) {
            setDraggedId(null);

            return;
        }

        setSortingItems((current) => {
            const fromIndex = current.findIndex(
                (question) => question.id === draggedId,
            );
            const toIndex = current.findIndex(
                (question) => question.id === targetId,
            );

            if (fromIndex < 0 || toIndex < 0) {
                return current;
            }

            const next = [...current];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);

            return next;
        });
        setSortDirty(true);
        setDraggedId(null);
    };

    const saveSorting = () => {
        if (!selectedSortType || sortingItems.length === 0) {
            return;
        }

        setSortSaving(true);
        router.post(
            '/superadmin/questions/reorder',
            {
                chapter_id: Number(chapterId),
                topic_id: isTopicWise ? Number(topicId) : null,
                question_type_id: selectedSortType.id,
                order: sortingItems.map((question) => question.id),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    cancelSorting();
                    questionResource.retry();
                },
                onFinish: () => setSortSaving(false),
            },
        );
    };

    return (
        <>
            <Head title="Questions" />

            <div className="space-y-5 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="h1-semibold">Questions</h1>
                        {showTable && (
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                {filtered.length} question
                                {filtered.length !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {sortingEnabled ? (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={cancelSorting}
                                    disabled={sortSaving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={saveSorting}
                                    disabled={!sortDirty || sortSaving}
                                >
                                    {sortSaving ? 'Saving...' : 'Save order'}
                                </Button>
                            </>
                        ) : null}
                        {!sortingEnabled && showTable && canEditQuestions && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={
                                    selectedQuestions.length === 0 ||
                                    loadingTypes
                                }
                                onClick={openChangeType}
                            >
                                <ArrowRightLeftIcon className="size-4" />
                                Change type
                                {selectedQuestions.length > 0 &&
                                    ` (${selectedQuestions.length})`}
                            </Button>
                        )}
                        {!sortingEnabled && showTable && canEditQuestions && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={!canSortQuestions}
                                onClick={beginSorting}
                                title={
                                    typeFilter === 'all'
                                        ? 'Select a question type first'
                                        : isTopicWise && !topicId
                                          ? 'Select a topic first'
                                          : 'Sort questions'
                                }
                            >
                                <ArrowUpDownIcon className="size-4" />
                                Sort
                            </Button>
                        )}
                        {!sortingEnabled && can('questions.import') && (
                            <Button asChild variant="outline">
                                <Link href={importHref}>
                                    <UploadIcon className="size-4" />
                                    Import Questions
                                </Link>
                            </Button>
                        )}
                        {!sortingEnabled &&
                            canAddQuestion &&
                            can('questions.create') && (
                                <Link
                                    href={addHref}
                                    className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                                >
                                    <PlusIcon size={16} color="currentColor" />
                                    <span className="hidden sm:inline">
                                        Add Question
                                    </span>
                                </Link>
                            )}
                    </div>
                </div>

                {/* Cascading Filters */}
                <div className="rounded-2xl border border-primary/10 bg-card p-4 shadow-sm">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <ScopeSelect
                            label="Pattern"
                            options={patterns.map((pattern) => ({
                                id: pattern.id,
                                label: pattern.short_name ?? pattern.name,
                                searchLabel:
                                    pattern.name +
                                    ' ' +
                                    (pattern.short_name ?? ''),
                            }))}
                            value={patternId}
                            onChange={handlePatternChange}
                            disabled={sortingEnabled || loadingTypes}
                        />
                        <ScopeSelect
                            label="Class"
                            options={availableClasses.map((item) => ({
                                id: item.id,
                                label: item.name,
                            }))}
                            value={classId}
                            onChange={handleClassChange}
                            disabled={
                                !patternId ||
                                classesResource.loading ||
                                sortingEnabled ||
                                loadingTypes
                            }
                        />
                        <ScopeSelect
                            label="Subject"
                            options={availableSubjects.map((item) => ({
                                id: item.id,
                                label: item.name_eng,
                                searchLabel:
                                    item.name_eng + ' ' + (item.name_ur ?? ''),
                            }))}
                            value={subjectId}
                            onChange={handleSubjectChange}
                            disabled={
                                !classId ||
                                subjectsResource.loading ||
                                sortingEnabled
                            }
                        />
                        <ScopeSelect
                            label="Chapter"
                            options={availableChapters.map((item) => ({
                                id: item.id,
                                label: chapterLabel(item),
                                searchLabel:
                                    chapterLabel(item) +
                                    ' ' +
                                    item.name +
                                    ' ' +
                                    (item.name_ur ?? ''),
                            }))}
                            value={chapterId}
                            onChange={handleChapterChange}
                            disabled={
                                !subjectId ||
                                chaptersResource.loading ||
                                sortingEnabled
                            }
                        />
                        {isTopicWise ? (
                            <ScopeSelect
                                label="Topic"
                                placeholder="All topics"
                                options={[
                                    { id: '__all__', label: 'All topics' },
                                    ...availableTopics.map((item) => ({
                                        id: item.id,
                                        label: item.name,
                                        searchLabel:
                                            item.name +
                                            ' ' +
                                            (item.name_ur ?? ''),
                                    })),
                                ]}
                                value={topicId}
                                onChange={(value) =>
                                    handleTopicChange(
                                        value === '__all__' ? '' : value,
                                    )
                                }
                                disabled={
                                    topicsResource.loading || sortingEnabled
                                }
                            />
                        ) : (
                            <div className="hidden lg:block" />
                        )}
                    </div>
                    {filterResources.some((resource) => resource.loading) && (
                        <div
                            className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"
                            role="status"
                        >
                            <Spinner />
                            Loading filter options…
                        </div>
                    )}
                    {filterResources.map((resource, index) =>
                        resource.error ? (
                            <div
                                key={index}
                                className="mt-3 flex items-center gap-2 text-sm text-destructive"
                                role="alert"
                            >
                                {resource.error}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={resource.retry}
                                >
                                    Retry
                                </Button>
                            </div>
                        ) : null,
                    )}
                    {questionResource.error && (
                        <div
                            className="mt-3 flex items-center gap-2 text-sm text-destructive"
                            role="alert"
                        >
                            Could not load questions.
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={questionResource.retry}
                            >
                                Retry
                            </Button>
                        </div>
                    )}
                    {typeError && (
                        <p
                            className="mt-3 text-sm text-destructive"
                            role="alert"
                        >
                            {typeError}
                        </p>
                    )}
                    {loadingQuestions && (
                        <div
                            className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"
                            role="status"
                            aria-live="polite"
                        >
                            <Spinner />
                            Loading questions…
                        </div>
                    )}
                </div>

                {/* Empty state */}
                {!showTable && !loadingQuestions && !questionResource.error && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
                        <SearchIcon className="mb-3 size-8 opacity-30" />
                        <p className="text-sm font-medium">
                            Select a chapter to view questions
                        </p>
                        {isTopicWise && chapterId && !topicId && (
                            <p className="mt-1 text-xs opacity-70">
                                Then select a topic
                            </p>
                        )}
                    </div>
                )}

                {/* Questions table */}
                {showTable && (
                    <div className="space-y-3">
                        {/* Table toolbar */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative min-w-48 flex-1">
                                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search questions…"
                                    value={search}
                                    disabled={sortingEnabled}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                            </div>
                            <Select
                                value={typeFilter}
                                disabled={sortingEnabled}
                                onValueChange={(value) => {
                                    setTypeFilter(value);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-44">
                                    <SelectValue placeholder="Question type" />
                                </SelectTrigger>
                                <SelectContent className="max-h-72">
                                    <SelectItem value="all">
                                        All types
                                    </SelectItem>
                                    {availableQuestionTypes.map((type) => (
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
                                value={statusFilter}
                                disabled={sortingEnabled}
                                onValueChange={(value) => {
                                    setStatusFilter(value);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-36">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All statuses
                                    </SelectItem>
                                    <SelectItem value="active">
                                        Active
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                        Inactive
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={String(pageSize)}
                                disabled={sortingEnabled}
                                onValueChange={(value) => {
                                    setPageSize(Number(value));
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-24">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAGE_SIZE_OPTIONS.map((value) => (
                                        <SelectItem
                                            key={value}
                                            value={String(value)}
                                        >
                                            {value}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="overflow-hidden rounded-xl border shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40">
                                            {canEditQuestions &&
                                                !sortingEnabled && (
                                                    <th className="w-10 px-3 py-3 text-center">
                                                        <Checkbox
                                                            aria-label="Select all questions"
                                                            checked={
                                                                allFilteredSelected
                                                                    ? true
                                                                    : someFilteredSelected
                                                                      ? 'indeterminate'
                                                                      : false
                                                            }
                                                            onCheckedChange={(
                                                                checked,
                                                            ) =>
                                                                toggleAllFiltered(
                                                                    checked ===
                                                                        true,
                                                                )
                                                            }
                                                        />
                                                    </th>
                                                )}
                                            <th className="w-10 px-3 py-3 text-left font-medium text-muted-foreground">
                                                #
                                            </th>
                                            <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                                                Question
                                            </th>
                                            <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                                                Type
                                            </th>
                                            <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                                                Source
                                            </th>
                                            {isTopicWise && !topicId && (
                                                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                                                    Topic
                                                </th>
                                            )}
                                            <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                                                Status
                                            </th>
                                            <th className="w-24 px-3 py-3" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {rows.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={
                                                        (isTopicWise && !topicId
                                                            ? 7
                                                            : 6) +
                                                        Number(
                                                            canEditQuestions &&
                                                                !sortingEnabled,
                                                        )
                                                    }
                                                    className="py-16 text-center text-muted-foreground"
                                                >
                                                    <SearchIcon className="mx-auto mb-2 size-8 opacity-30" />
                                                    No questions found
                                                </td>
                                            </tr>
                                        ) : (
                                            rows.map((q, i) => (
                                                <tr
                                                    key={q.id}
                                                    draggable={sortingEnabled}
                                                    onDragStart={() =>
                                                        sortingEnabled &&
                                                        setDraggedId(q.id)
                                                    }
                                                    onDragOver={(event) =>
                                                        sortingEnabled &&
                                                        event.preventDefault()
                                                    }
                                                    onDrop={() =>
                                                        sortingEnabled &&
                                                        handleSortDrop(q.id)
                                                    }
                                                    onDragEnd={() =>
                                                        setDraggedId(null)
                                                    }
                                                    className={`transition-colors ${draggedId === q.id ? 'bg-primary/10 opacity-60' : i % 2 === 0 ? 'bg-background' : 'bg-muted/20'} ${sortingEnabled ? 'cursor-grab active:cursor-grabbing' : 'hover:bg-accent/50'}`}
                                                >
                                                    {canEditQuestions &&
                                                        !sortingEnabled && (
                                                            <td className="px-3 py-3 text-center">
                                                                <Checkbox
                                                                    aria-label={`Select question ${q.id}`}
                                                                    checked={selectedIds.has(
                                                                        q.id,
                                                                    )}
                                                                    onCheckedChange={(
                                                                        checked,
                                                                    ) =>
                                                                        toggleQuestion(
                                                                            q.id,
                                                                            checked ===
                                                                                true,
                                                                        )
                                                                    }
                                                                />
                                                            </td>
                                                        )}
                                                    <td className="px-3 py-3 text-xs tabular-nums text-muted-foreground">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            {sortingEnabled && (
                                                                <GripVerticalIcon className="size-4" />
                                                            )}
                                                            {sortingEnabled
                                                                ? i + 1
                                                                : (safePage -
                                                                      1) *
                                                                      pageSize +
                                                                  i +
                                                                  1}
                                                        </span>
                                                    </td>
                                                    <td className="max-w-sm px-3 py-3">
                                                        <QuestionContent
                                                            value={
                                                                q.summary_text
                                                            }
                                                            className="line-clamp-2 text-sm [&_img]:inline-block [&_img]:max-h-7 [&_img]:max-w-full [&_img]:align-middle"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <KindBadge
                                                                isObjective={
                                                                    q
                                                                        .question_type
                                                                        .is_objective
                                                                }
                                                            />
                                                            <span className="text-xs text-muted-foreground">
                                                                {
                                                                    q
                                                                        .question_type
                                                                        .name
                                                                }
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <SourceBadge
                                                            source={q.source}
                                                            label={q.source_label}
                                                        />
                                                    </td>
                                                    {isTopicWise &&
                                                        !topicId && (
                                                            <td className="px-3 py-3 text-xs text-muted-foreground">
                                                                {q.topic
                                                                    ?.name ??
                                                                    '—'}
                                                            </td>
                                                        )}
                                                    <td className="px-3 py-3">
                                                        <StatusBadge
                                                            status={q.status}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div
                                                            className={
                                                                sortingEnabled
                                                                    ? 'hidden'
                                                                    : 'flex items-center justify-end gap-1'
                                                            }
                                                        >
                                                            <Link
                                                                href={`/superadmin/questions/${q.id}`}
                                                                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                                title="View"
                                                            >
                                                                <EyeIcon className="size-4" />
                                                            </Link>
                                                            {can(
                                                                'questions.edit',
                                                            ) && (
                                                                <Link
                                                                    href={`/superadmin/questions/${q.id}/edit`}
                                                                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                                    title="Edit"
                                                                >
                                                                    <PencilIcon className="size-4" />
                                                                </Link>
                                                            )}
                                                            {can(
                                                                'questions.delete',
                                                            ) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setDeleteTarget(
                                                                            q,
                                                                        )
                                                                    }
                                                                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2Icon className="size-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 md:flex-row md:items-center md:justify-between">
                                <p className="text-sm text-muted-foreground">
                                    {sortingEnabled
                                        ? `${sortingItems.length} ${selectedSortType?.name ?? ''} questions`
                                        : filtered.length === 0
                                          ? 'No results'
                                          : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}`}
                                </p>
                                <div
                                    className={
                                        sortingEnabled
                                            ? 'hidden'
                                            : 'flex items-center gap-1'
                                    }
                                >
                                    <button
                                        type="button"
                                        onClick={() => goTo(1)}
                                        disabled={safePage === 1}
                                        className="rounded-lg p-2 transition-colors hover:bg-accent disabled:opacity-40"
                                    >
                                        <ChevronsLeftIcon className="size-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => goTo(safePage - 1)}
                                        disabled={safePage === 1}
                                        className="rounded-lg p-2 transition-colors hover:bg-accent disabled:opacity-40"
                                    >
                                        <ChevronLeftIcon className="size-4" />
                                    </button>
                                    <span className="px-2 text-sm text-muted-foreground">
                                        {safePage} / {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => goTo(safePage + 1)}
                                        disabled={safePage === totalPages}
                                        className="rounded-lg p-2 transition-colors hover:bg-accent disabled:opacity-40"
                                    >
                                        <ChevronRightIcon className="size-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => goTo(totalPages)}
                                        disabled={safePage === totalPages}
                                        className="rounded-lg p-2 transition-colors hover:bg-accent disabled:opacity-40"
                                    >
                                        <ChevronsRightIcon className="size-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete dialog */}
            <Dialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogTitle>Delete Question</DialogTitle>
                    <DialogDescription>
                        Delete this question? This cannot be undone.
                    </DialogDescription>
                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => setDeleteTarget(null)}
                            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={confirmDelete}
                            disabled={deleting}
                            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
                        >
                            {deleting ? 'Deleting…' : 'Delete'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <BulkQuestionTypeChangeDialog
                open={changeTypeOpen}
                onOpenChange={setChangeTypeOpen}
                questions={selectedQuestions}
                questionTypes={questionTypes ?? []}
                onChanged={() => {
                    setSelectedIds(new Set());
                    questionResource.retry();
                }}
            />
        </>
    );
}

Questions.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Questions', href: '/superadmin/questions' },
    ],
};

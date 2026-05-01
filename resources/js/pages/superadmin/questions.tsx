import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
    EyeIcon,
    PencilIcon,
    SearchIcon,
    Trash2Icon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import PlusIcon from '@/components/icons/PlusIcon';
import { Badge } from '@/components/ui/badge';
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
import type { ChapterOption, QuestionTypeOption, SourceOption } from './questions/form';

interface QuestionRow {
    id: number;
    summary_text: string;
    source: string | null;
    source_label?: string | null;
    status: number;
    created_at: string | null;
    question_type: QuestionTypeOption;
    chapter: {
        id: number;
        name: string;
        name_ur: string | null;
        chapter_number: number | null;
        group_name: string | null;
        subject: { id: number; name_eng: string; subject_type: 'chapter-wise' | 'topic-wise' };
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

function uniqueById<T extends { id: number }>(arr: T[]): T[] {
    const seen = new Set<number>();
    return arr.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
}

function StatusBadge({ status }: { status: number }) {
    return status === 1 ? (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-100 font-medium text-emerald-700">
            <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />
            Active
        </Badge>
    ) : (
        <Badge variant="outline" className="border-gray-200 bg-gray-100 font-medium text-gray-600">
            <span className="mr-1 inline-block size-1.5 rounded-full bg-gray-400" />
            Inactive
        </Badge>
    );
}

function KindBadge({ isObjective }: { isObjective: boolean }) {
    return isObjective ? (
        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-[11px] font-normal text-blue-700 px-1.5 py-0">
            Obj
        </Badge>
    ) : (
        <Badge variant="outline" className="border-violet-200 bg-violet-50 text-[11px] font-normal text-violet-700 px-1.5 py-0">
            Subj
        </Badge>
    );
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const NONE = '__none__';

export default function Questions({
    chapters,
    questions,
    filters,
    questionTypes: _questionTypes,
    sourceOptions: _sourceOptions,
}: {
    chapters: ChapterOption[];
    questions: QuestionRow[] | null;
    filters: Filters;
    questionTypes: QuestionTypeOption[];
    sourceOptions: SourceOption[];
}) {
    // ── Derive the initial chapter from filters ──────────────────────────────
    const activeChapter = useMemo(
        () => chapters.find((c) => c.id === filters.chapter_id) ?? null,
        [chapters, filters.chapter_id],
    );

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
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [deleteTarget, setDeleteTarget] = useState<QuestionRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    // ── Cascaded dropdown options ─────────────────────────────────────────────
    const patterns = useMemo(
        () => uniqueById(chapters.map((c) => c.pattern)),
        [chapters],
    );

    const availableClasses = useMemo(
        () =>
            !patternId
                ? []
                : uniqueById(
                      chapters
                          .filter((c) => String(c.pattern.id) === patternId)
                          .map((c) => c.class),
                  ),
        [chapters, patternId],
    );

    const availableSubjects = useMemo(
        () =>
            !classId
                ? []
                : uniqueById(
                      chapters
                          .filter(
                              (c) =>
                                  String(c.pattern.id) === patternId &&
                                  String(c.class.id) === classId,
                          )
                          .map((c) => c.subject),
                  ),
        [chapters, patternId, classId],
    );

    const availableChapters = useMemo(
        () =>
            !subjectId
                ? []
                : chapters.filter(
                      (c) =>
                          String(c.pattern.id) === patternId &&
                          String(c.class.id) === classId &&
                          String(c.subject.id) === subjectId,
                  ),
        [chapters, patternId, classId, subjectId],
    );

    const selectedChapter = useMemo(
        () => availableChapters.find((c) => String(c.id) === chapterId) ?? null,
        [availableChapters, chapterId],
    );

    const isTopicWise = selectedChapter?.subject.subject_type === 'topic-wise';
    const availableTopics = selectedChapter?.topics ?? [];

    // ── Navigate to load questions from server ────────────────────────────────
    const navigate = (newChapterId: string, newTopicId = '') => {
        const params: Record<string, string> = {};
        if (newChapterId) params.chapter_id = newChapterId;
        if (newTopicId) params.topic_id = newTopicId;
        router.get('/superadmin/questions', params, { preserveState: true, replace: true });
    };

    // ── Filter handlers ───────────────────────────────────────────────────────
    const handlePatternChange = (val: string) => {
        const v = val === NONE ? '' : val;
        setPatternId(v);
        setClassId('');
        setSubjectId('');
        setChapterId('');
        setTopicId('');
        if (filters.chapter_id) navigate('');
    };

    const handleClassChange = (val: string) => {
        const v = val === NONE ? '' : val;
        setClassId(v);
        setSubjectId('');
        setChapterId('');
        setTopicId('');
        if (filters.chapter_id) navigate('');
    };

    const handleSubjectChange = (val: string) => {
        const v = val === NONE ? '' : val;
        setSubjectId(v);
        setChapterId('');
        setTopicId('');
        if (filters.chapter_id) navigate('');
    };

    const handleChapterChange = (val: string) => {
        const v = val === NONE ? '' : val;
        setChapterId(v);
        setTopicId('');
        if (!v) { navigate(''); return; }
        const ch = availableChapters.find((c) => String(c.id) === v);
        if (ch?.subject.subject_type !== 'topic-wise') {
            navigate(v);
        }
        // topic-wise: wait for topic selection
    };

    const handleTopicChange = (val: string) => {
        const v = val === NONE ? '' : val;
        setTopicId(v);
        navigate(chapterId, v);
    };

    // ── Client-side search within loaded questions ────────────────────────────
    const filtered = useMemo(() => {
        if (!questions) return [];
        const q = search.toLowerCase().trim();
        if (!q) return questions;
        return questions.filter((r) =>
            r.summary_text.toLowerCase().includes(q) ||
            r.question_type.name.toLowerCase().includes(q),
        );
    }, [questions, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
    const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

    // ── Delete ────────────────────────────────────────────────────────────────
    const confirmDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        const params: Record<string, string> = {};
        if (filters.chapter_id) params.chapter_id = String(filters.chapter_id);
        if (filters.topic_id) params.topic_id = String(filters.topic_id);
        router.delete(`/superadmin/questions/${deleteTarget.id}`, {
            data: params,
            onFinish: () => { setDeleting(false); setDeleteTarget(null); },
        });
    };

    // ── Add button href ───────────────────────────────────────────────────────
    const addHref = chapterId
        ? `/superadmin/questions/add?chapter_id=${chapterId}${topicId ? `&topic_id=${topicId}` : ''}`
        : '/superadmin/questions/add';

    // ── Chapter label helper ──────────────────────────────────────────────────
    const chapterLabel = (c: ChapterOption) => {
        const title = c.chapter_number ? `Chapter ${c.chapter_number}` : c.name;
        return c.group_name ? `${c.group_name} / ${title}` : title;
    };

    const canAddQuestion = !!chapterId && (!isTopicWise || !!topicId);
    const showTable = questions !== null;

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
                                {filtered.length} question{filtered.length !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                    {canAddQuestion && (
                        <Link
                            href={addHref}
                            className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                        >
                            <PlusIcon size={16} color="currentColor" />
                            <span className="hidden sm:inline">Add Question</span>
                        </Link>
                    )}
                </div>

                {/* Cascading Filters */}
                <div className="rounded-2xl border border-primary/10 bg-card p-4 shadow-sm">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {/* Pattern */}
                        <Select
                            value={patternId || NONE}
                            onValueChange={handlePatternChange}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Pattern" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NONE}>All patterns</SelectItem>
                                {patterns.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                        {p.short_name ?? p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Class */}
                        <Select
                            value={classId || NONE}
                            onValueChange={handleClassChange}
                            disabled={availableClasses.length === 0}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Class" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NONE}>All classes</SelectItem>
                                {availableClasses.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Subject */}
                        <Select
                            value={subjectId || NONE}
                            onValueChange={handleSubjectChange}
                            disabled={availableSubjects.length === 0}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Subject" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NONE}>All subjects</SelectItem>
                                {availableSubjects.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.name_eng}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Chapter */}
                        <Select
                            value={chapterId || NONE}
                            onValueChange={handleChapterChange}
                            disabled={availableChapters.length === 0}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Chapter" />
                            </SelectTrigger>
                            <SelectContent className="max-h-80">
                                <SelectItem value={NONE}>Select chapter</SelectItem>
                                {availableChapters.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {chapterLabel(c)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Topic (topic-wise only) */}
                        {isTopicWise ? (
                            <Select
                                value={topicId || NONE}
                                onValueChange={handleTopicChange}
                                disabled={availableTopics.length === 0}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Topic" />
                                </SelectTrigger>
                                <SelectContent className="max-h-80">
                                    <SelectItem value={NONE}>All topics</SelectItem>
                                    {availableTopics.map((t) => (
                                        <SelectItem key={t.id} value={String(t.id)}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="hidden lg:block" />
                        )}
                    </div>
                </div>

                {/* Empty state */}
                {!showTable && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
                        <SearchIcon className="mb-3 size-8 opacity-30" />
                        <p className="text-sm font-medium">Select a chapter to view questions</p>
                        {isTopicWise && chapterId && !topicId && (
                            <p className="mt-1 text-xs opacity-70">Then select a topic</p>
                        )}
                    </div>
                )}

                {/* Questions table */}
                {showTable && (
                    <div className="space-y-3">
                        {/* Table toolbar */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative min-w-48 flex-1">
                                <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search questions…"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-lg border bg-transparent px-3 py-1 pl-9 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px]"
                                />
                            </div>
                            <Select
                                value={String(pageSize)}
                                onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
                            >
                                <SelectTrigger className="w-20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAGE_SIZE_OPTIONS.map((n) => (
                                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="overflow-hidden rounded-xl border shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40">
                                            <th className="w-10 px-3 py-3 text-left font-medium text-muted-foreground">#</th>
                                            <th className="px-3 py-3 text-left font-medium text-muted-foreground">Question</th>
                                            <th className="px-3 py-3 text-left font-medium text-muted-foreground">Type</th>
                                            {isTopicWise && !topicId && (
                                                <th className="px-3 py-3 text-left font-medium text-muted-foreground">Topic</th>
                                            )}
                                            <th className="px-3 py-3 text-left font-medium text-muted-foreground">Status</th>
                                            <th className="w-24 px-3 py-3" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {paginated.length === 0 ? (
                                            <tr>
                                                <td colSpan={isTopicWise && !topicId ? 6 : 5} className="py-16 text-center text-muted-foreground">
                                                    <SearchIcon className="mx-auto mb-2 size-8 opacity-30" />
                                                    No questions found
                                                </td>
                                            </tr>
                                        ) : (
                                            paginated.map((q, i) => (
                                                <tr
                                                    key={q.id}
                                                    className={`transition-colors ${i % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-accent/50`}
                                                >
                                                    <td className="px-3 py-3 text-xs text-muted-foreground tabular-nums">
                                                        {(safePage - 1) * pageSize + i + 1}
                                                    </td>
                                                    <td className="px-3 py-3 max-w-sm">
                                                        <p className="line-clamp-2 text-sm">{q.summary_text}</p>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <KindBadge isObjective={q.question_type.is_objective} />
                                                            <span className="text-xs text-muted-foreground">{q.question_type.name}</span>
                                                        </div>
                                                    </td>
                                                    {isTopicWise && !topicId && (
                                                        <td className="px-3 py-3 text-xs text-muted-foreground">
                                                            {q.topic?.name ?? '—'}
                                                        </td>
                                                    )}
                                                    <td className="px-3 py-3">
                                                        <StatusBadge status={q.status} />
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Link
                                                                href={`/superadmin/questions/${q.id}`}
                                                                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                                title="View"
                                                            >
                                                                <EyeIcon className="size-4" />
                                                            </Link>
                                                            <Link
                                                                href={`/superadmin/questions/${q.id}/edit`}
                                                                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                                title="Edit"
                                                            >
                                                                <PencilIcon className="size-4" />
                                                            </Link>
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeleteTarget(q)}
                                                                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                                                title="Delete"
                                                            >
                                                                <Trash2Icon className="size-4" />
                                                            </button>
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
                                    {filtered.length === 0
                                        ? 'No results'
                                        : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}`}
                                </p>
                                <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => goTo(1)} disabled={safePage === 1} className="rounded-lg p-2 transition-colors hover:bg-accent disabled:opacity-40">
                                        <ChevronsLeftIcon className="size-4" />
                                    </button>
                                    <button type="button" onClick={() => goTo(safePage - 1)} disabled={safePage === 1} className="rounded-lg p-2 transition-colors hover:bg-accent disabled:opacity-40">
                                        <ChevronLeftIcon className="size-4" />
                                    </button>
                                    <span className="px-2 text-sm text-muted-foreground">{safePage} / {totalPages}</span>
                                    <button type="button" onClick={() => goTo(safePage + 1)} disabled={safePage === totalPages} className="rounded-lg p-2 transition-colors hover:bg-accent disabled:opacity-40">
                                        <ChevronRightIcon className="size-4" />
                                    </button>
                                    <button type="button" onClick={() => goTo(totalPages)} disabled={safePage === totalPages} className="rounded-lg p-2 transition-colors hover:bg-accent disabled:opacity-40">
                                        <ChevronsRightIcon className="size-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete dialog */}
            <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
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
        </>
    );
}

Questions.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Questions', href: '/superadmin/questions' },
    ],
};

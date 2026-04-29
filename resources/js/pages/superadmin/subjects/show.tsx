import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    BookOpenIcon,
    CalendarIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    FileUpIcon,
    HelpCircleIcon,
    LayersIcon,
    ListChecksIcon,
    ListIcon,
    LogsIcon,
    PencilIcon,
    PlusIcon,
    SchoolIcon,
    TagIcon,
    Trash2Icon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClassItem {
    id: number;
    name: string;
    status: number;
}
interface PatternItem {
    id: number;
    name: string;
    short_name: string | null;
}

interface LinksByPattern {
    pattern: PatternItem;
    classes: ClassItem[];
}

interface TopicData {
    id: number;
    name: string;
    name_ur: string | null;
    sort_id: number;
    status: number;
    questions_count: number;
}

interface ChapterData {
    id: number;
    name: string;
    name_ur: string | null;
    chapter_number: number | null;
    sort_id: number;
    status: number;
    questions_count: number;
    class_id: number;
    pattern_id: number;
    class: { id: number; name: string } | null;
    pattern: { id: number; name: string } | null;
    topics: TopicData[];
}

interface AuditLogEntry {
    id: number;
    event: string | null;
    old_values: Record<string, unknown>;
    new_values: Record<string, unknown>;
    changed_by: string;
    created_at: string | null;
}

interface SubjectData {
    id: number;
    name_eng: string;
    name_ur: string | null;
    subject_type: 'chapter-wise' | 'topic-wise';
    status: number;
    created_at: string | null;
    links_by_pattern: LinksByPattern[];
    chapters: ChapterData[];
    audit_logs: AuditLogEntry[];
}

interface Combo {
    key: string;
    label: string;
    class_id: number;
    pattern_id: number;
}

interface ChapterFormData {
    class_id: string;
    pattern_id: string;
    name: string;
    name_ur: string;
    chapter_number: string;
    status: string;
    [key: string]: string;
}

interface TopicFormData {
    name: string;
    name_ur: string;
    status: string;
    [key: string]: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const EVENT_DOT: Record<string, string> = {
    created: 'bg-emerald-500',
    updated: 'bg-blue-500',
    deleted: 'bg-red-500',
    restored: 'bg-violet-500',
};
const EVENT_LABEL: Record<string, string> = {
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    restored: 'Restored',
};

function fmtDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}
function fmtDateTime(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function StatusBadge({ status }: { status: number }) {
    return status === 1 ? (
        <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-xs text-emerald-700"
        >
            <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />
            Active
        </Badge>
    ) : (
        <Badge
            variant="outline"
            className="border-gray-200 bg-gray-100 text-xs text-gray-500"
        >
            <span className="mr-1 inline-block size-1.5 rounded-full bg-gray-400" />
            Inactive
        </Badge>
    );
}

function SectionHeader({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}

function Field({
    label,
    required,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
                {label}
                {required && (
                    <span className="text-xs text-destructive">*</span>
                )}
            </Label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

// ─── Audit Log Card ───────────────────────────────────────────────────────────
function AuditLogCard({ log }: { log: AuditLogEntry }) {
    const dot = EVENT_DOT[log.event ?? ''] ?? 'bg-gray-400';
    const label = EVENT_LABEL[log.event ?? ''] ?? log.event ?? 'Changed';
    const hasChanges = Object.keys(log.new_values).length > 0;

    return (
        <div className="rounded-xl border p-4">
            <div className="flex items-start gap-3">
                <div
                    className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dot}`}
                />
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{label}</span>
                            <span className="text-xs text-muted-foreground">
                                by {log.changed_by}
                            </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {fmtDateTime(log.created_at)}
                        </span>
                    </div>
                    {hasChanges && (
                        <div className="space-y-1 rounded-lg border bg-muted/40 p-3 text-xs">
                            {Object.entries(log.new_values).map(
                                ([key, val]) => (
                                    <div
                                        key={key}
                                        className="flex flex-wrap items-baseline gap-1.5"
                                    >
                                        <span className="text-muted-foreground capitalize">
                                            {key.replace(/_/g, ' ')}:
                                        </span>
                                        {log.old_values[key] !== undefined && (
                                            <>
                                                <span className="line-through opacity-50">
                                                    {String(
                                                        log.old_values[key],
                                                    )}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    →
                                                </span>
                                            </>
                                        )}
                                        <span className="font-medium">
                                            {String(val)}
                                        </span>
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Chapter Dialog ───────────────────────────────────────────────────────────
function ChapterDialog({
    open,
    onClose,
    mode,
    editChapter,
    linksByPattern,
    subjectId,
    form,
}: {
    open: boolean;
    onClose: () => void;
    mode: 'add' | 'edit';
    editChapter: ChapterData | null;
    linksByPattern: LinksByPattern[];
    subjectId: number;
    form: ReturnType<typeof useForm<ChapterFormData>>;
}) {
    const classesForSelectedPattern = form.data.pattern_id
        ? (linksByPattern.find(
              (g) => g.pattern.id.toString() === form.data.pattern_id,
          )?.classes ?? [])
        : [];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'add') {
            form.post(`/superadmin/subjects/${subjectId}/chapters`, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: onClose,
            });
        } else {
            form.put(
                `/superadmin/subjects/${subjectId}/chapters/${editChapter!.id}`,
                {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: onClose,
                },
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogTitle>
                    {mode === 'add' ? 'Add Chapter' : 'Edit Chapter'}
                </DialogTitle>
                <DialogDescription>
                    {mode === 'add'
                        ? 'Add a new chapter to this subject.'
                        : 'Update the chapter details.'}
                </DialogDescription>

                <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                    {/* Pattern + Class (add only) */}
                    {mode === 'add' ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field
                                label="Pattern"
                                required
                                error={form.errors.pattern_id}
                            >
                                <Select
                                    value={form.data.pattern_id}
                                    onValueChange={(v) => {
                                        form.setData('pattern_id', v);
                                        form.setData('class_id', '');
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select pattern" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {linksByPattern.map((g) => (
                                            <SelectItem
                                                key={g.pattern.id}
                                                value={g.pattern.id.toString()}
                                            >
                                                {g.pattern.name}
                                                {g.pattern.short_name
                                                    ? ` (${g.pattern.short_name})`
                                                    : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field
                                label="Class"
                                required
                                error={form.errors.class_id}
                            >
                                <Select
                                    value={form.data.class_id}
                                    onValueChange={(v) =>
                                        form.setData('class_id', v)
                                    }
                                    disabled={!form.data.pattern_id}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue
                                            placeholder={
                                                form.data.pattern_id
                                                    ? 'Select class'
                                                    : 'Select pattern first'
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classesForSelectedPattern.map(
                                            (cls) => (
                                                <SelectItem
                                                    key={cls.id}
                                                    value={cls.id.toString()}
                                                >
                                                    {cls.name}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                                <span className="text-xs text-muted-foreground">
                                    Pattern
                                </span>
                                <p className="font-medium">
                                    {editChapter?.pattern?.name ?? '—'}
                                </p>
                            </div>
                            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                                <span className="text-xs text-muted-foreground">
                                    Class
                                </span>
                                <p className="font-medium">
                                    {editChapter?.class?.name ?? '—'}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                            label="Chapter #"
                            error={form.errors.chapter_number}
                        >
                            <Input
                                type="number"
                                min="1"
                                value={form.data.chapter_number}
                                onChange={(e) =>
                                    form.setData(
                                        'chapter_number',
                                        e.target.value,
                                    )
                                }
                                placeholder="e.g. 1"
                            />
                        </Field>
                        <Field
                            label="Status"
                            required
                            error={form.errors.status}
                        >
                            <Select
                                value={form.data.status}
                                onValueChange={(v) => form.setData('status', v)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">
                                        <span className="flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-emerald-500" />
                                            Active
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="0">
                                        <span className="flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-gray-400" />
                                            Inactive
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>

                    <Field
                        label="Chapter Name (English)"
                        required
                        error={form.errors.name}
                    >
                        <Input
                            value={form.data.name}
                            onChange={(e) =>
                                form.setData('name', e.target.value)
                            }
                            placeholder="e.g. Introduction to Biology"
                        />
                    </Field>

                    <Field
                        label="Chapter Name (Urdu)"
                        error={form.errors.name_ur}
                    >
                        <Input
                            value={form.data.name_ur}
                            onChange={(e) =>
                                form.setData('name_ur', e.target.value)
                            }
                            placeholder="e.g. حیاتیات کا تعارف"
                            dir="rtl"
                        />
                    </Field>

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing
                                ? 'Saving…'
                                : mode === 'add'
                                  ? 'Add Chapter'
                                  : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Topic Inline Form ────────────────────────────────────────────────────────
function TopicInlineForm({
    onClose,
    onSubmit,
    form,
    submitLabel,
}: {
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    form: ReturnType<typeof useForm<TopicFormData>>;
    submitLabel: string;
}) {
    return (
        <form
            onSubmit={onSubmit}
            className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3"
        >
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                    <Label className="text-xs">
                        Topic Name (English){' '}
                        <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        className="h-8 text-sm"
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        placeholder="e.g. Cell Structure"
                        autoFocus
                    />
                    {form.errors.name && (
                        <p className="text-xs text-destructive">
                            {form.errors.name}
                        </p>
                    )}
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Topic Name (Urdu)</Label>
                    <Input
                        className="h-8 text-sm"
                        value={form.data.name_ur}
                        onChange={(e) =>
                            form.setData('name_ur', e.target.value)
                        }
                        placeholder="e.g. خلیے کی ساخت"
                        dir="rtl"
                    />
                </div>
            </div>
            <div className="flex items-center justify-between gap-3">
                <Select
                    value={form.data.status}
                    onValueChange={(v) => form.setData('status', v)}
                >
                    <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1">
                            <span className="flex items-center gap-1.5 text-xs">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                Active
                            </span>
                        </SelectItem>
                        <SelectItem value="0">
                            <span className="flex items-center gap-1.5 text-xs">
                                <span className="size-1.5 rounded-full bg-gray-400" />
                                Inactive
                            </span>
                        </SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={form.processing}>
                        {form.processing ? 'Saving…' : submitLabel}
                    </Button>
                </div>
            </div>
        </form>
    );
}

// ─── Delete Confirm Dialog ─────────────────────────────────────────────────────
function DeleteConfirmDialog({
    open,
    onClose,
    onConfirm,
    label,
    processing,
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    label: string;
    processing: boolean;
}) {
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogTitle>Delete {label}?</DialogTitle>
                <DialogDescription>
                    This action cannot be undone. All associated data will be
                    permanently removed.
                </DialogDescription>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={processing}
                    >
                        {processing ? 'Deleting…' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Chapters Tab ─────────────────────────────────────────────────────────────
function ChaptersTab({
    subject,
    combos,
}: {
    subject: SubjectData;
    combos: Combo[];
}) {
    const isTopicWise = subject.subject_type === 'topic-wise';

    const initialPatternId =
        subject.links_by_pattern.length === 1
            ? subject.links_by_pattern[0].pattern.id.toString()
            : 'all';
    const initialClassId =
        subject.links_by_pattern.length === 1 &&
        subject.links_by_pattern[0].classes.length === 1
            ? subject.links_by_pattern[0].classes[0].id.toString()
            : 'all';

    const [patternFilter, setPatternFilter] =
        useState<string>(initialPatternId);
    const [classFilter, setClassFilter] = useState<string>(initialClassId);
    const [expandedChapters, setExpandedChapters] = useState<Set<number>>(
        new Set(),
    );
    const [chapterDialog, setChapterDialog] = useState<
        { mode: 'add' } | { mode: 'edit'; chapter: ChapterData } | null
    >(null);
    const [topicState, setTopicState] = useState<
        | { mode: 'add'; chapterId: number }
        | { mode: 'edit'; chapterId: number; topic: TopicData }
        | null
    >(null);
    const [deleteState, setDeleteState] = useState<
        | { type: 'chapter'; id: number; name: string }
        | { type: 'topic'; chapterId: number; id: number; name: string }
        | null
    >(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);

    const chapterForm = useForm<ChapterFormData>({
        class_id: '',
        pattern_id: '',
        name: '',
        name_ur: '',
        chapter_number: '',
        status: '1',
    });
    const topicForm = useForm<TopicFormData>({
        name: '',
        name_ur: '',
        status: '1',
    });

    const uniquePatterns = useMemo(
        () => subject.links_by_pattern.map((g) => g.pattern),
        [subject.links_by_pattern],
    );

    const classesForPatternFilter = useMemo(
        () =>
            patternFilter === 'all'
                ? []
                : (subject.links_by_pattern.find(
                      (g) => g.pattern.id.toString() === patternFilter,
                  )?.classes ?? []),
        [subject.links_by_pattern, patternFilter],
    );

    const canShowChapters = patternFilter !== 'all' && classFilter !== 'all';

    const filteredChapters = useMemo(() => {
        if (!canShowChapters) return [];

        return subject.chapters.filter(
            (ch) =>
                ch.pattern_id.toString() === patternFilter &&
                ch.class_id.toString() === classFilter,
        );
    }, [subject.chapters, patternFilter, classFilter, canShowChapters]);

    const openAddChapter = () => {
        const pid =
            patternFilter !== 'all'
                ? patternFilter
                : (subject.links_by_pattern[0]?.pattern.id.toString() ?? '');
        const classesForPid =
            subject.links_by_pattern.find(
                (g) => g.pattern.id.toString() === pid,
            )?.classes ?? [];
        const cid =
            classFilter !== 'all' &&
            classesForPid.some((c) => c.id.toString() === classFilter)
                ? classFilter
                : (classesForPid[0]?.id.toString() ?? '');
        chapterForm.setData('pattern_id', pid);
        chapterForm.setData('class_id', cid);
        chapterForm.setData('name', '');
        chapterForm.setData('name_ur', '');
        chapterForm.setData('chapter_number', '');
        chapterForm.setData('status', '1');
        chapterForm.clearErrors();
        setChapterDialog({ mode: 'add' });
    };

    const openEditChapter = (ch: ChapterData) => {
        chapterForm.setData('class_id', ch.class_id.toString());
        chapterForm.setData('pattern_id', ch.pattern_id.toString());
        chapterForm.setData('name', ch.name);
        chapterForm.setData('name_ur', ch.name_ur ?? '');
        chapterForm.setData(
            'chapter_number',
            ch.chapter_number?.toString() ?? '',
        );
        chapterForm.setData('status', ch.status.toString());
        chapterForm.clearErrors();
        setChapterDialog({ mode: 'edit', chapter: ch });
    };

    const closeChapterDialog = () => {
        setChapterDialog(null);
        chapterForm.reset();
    };

    const openAddTopic = (chapterId: number) => {
        topicForm.setData('name', '');
        topicForm.setData('name_ur', '');
        topicForm.setData('status', '1');
        topicForm.clearErrors();
        setTopicState({ mode: 'add', chapterId });
        setExpandedChapters((prev) => new Set(prev).add(chapterId));
    };

    const openEditTopic = (chapterId: number, topic: TopicData) => {
        topicForm.setData('name', topic.name);
        topicForm.setData('name_ur', topic.name_ur ?? '');
        topicForm.setData('status', topic.status.toString());
        topicForm.clearErrors();
        setTopicState({ mode: 'edit', chapterId, topic });
    };

    const closeTopicForm = () => {
        setTopicState(null);
        topicForm.reset();
    };

    const submitTopic = (e: React.FormEvent) => {
        e.preventDefault();
        if (!topicState) return;
        const base = `/superadmin/subjects/${subject.id}/chapters/${topicState.chapterId}/topics`;
        if (topicState.mode === 'add') {
            topicForm.post(base, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: closeTopicForm,
            });
        } else {
            topicForm.put(`${base}/${topicState.topic.id}`, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: closeTopicForm,
            });
        }
    };

    const confirmDelete = () => {
        if (!deleteState) return;
        setDeleteProcessing(true);
        if (deleteState.type === 'chapter') {
            router.delete(
                `/superadmin/subjects/${subject.id}/chapters/${deleteState.id}`,
                {
                    preserveScroll: true,
                    preserveState: true,
                    onFinish: () => {
                        setDeleteProcessing(false);
                        setDeleteState(null);
                    },
                },
            );
        } else {
            router.delete(
                `/superadmin/subjects/${subject.id}/chapters/${deleteState.chapterId}/topics/${deleteState.id}`,
                {
                    preserveScroll: true,
                    preserveState: true,
                    onFinish: () => {
                        setDeleteProcessing(false);
                        setDeleteState(null);
                    },
                },
            );
        }
    };

    const toggleExpand = (id: number) => {
        setExpandedChapters((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    {uniquePatterns.length > 0 && (
                        <Select
                            value={patternFilter}
                            onValueChange={(v) => {
                                setPatternFilter(v);
                                setClassFilter('all');
                            }}
                        >
                            <SelectTrigger className="h-9 w-40 text-sm">
                                <SelectValue placeholder="Select pattern" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Select pattern
                                </SelectItem>
                                {uniquePatterns.map((p) => (
                                    <SelectItem
                                        key={p.id}
                                        value={p.id.toString()}
                                    >
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {combos.length > 0 && (
                        <Select
                            value={classFilter}
                            onValueChange={setClassFilter}
                            disabled={
                                patternFilter === 'all' ||
                                classesForPatternFilter.length === 0
                            }
                        >
                            <SelectTrigger className="h-9 w-36 text-sm">
                                <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Select class
                                </SelectItem>
                                {classesForPatternFilter.map((cls) => (
                                    <SelectItem
                                        key={cls.id}
                                        value={cls.id.toString()}
                                    >
                                        {cls.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <span className="text-sm text-muted-foreground">
                        {canShowChapters
                            ? `${filteredChapters.length} chapter${filteredChapters.length !== 1 ? 's' : ''}`
                            : 'Select pattern and class'}
                    </span>
                </div>
                {combos.length > 0 && (
                    <Button
                        size="sm"
                        onClick={openAddChapter}
                        className="gap-1.5"
                        disabled={!canShowChapters}
                    >
                        <PlusIcon className="size-3.5" /> Add Chapter
                    </Button>
                )}
            </div>

            {/* Empty states */}
            {combos.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center text-muted-foreground">
                    <HelpCircleIcon className="size-8 opacity-30" />
                    <p className="text-sm">
                        No class links yet — link classes before adding
                        chapters.
                    </p>
                    <Link
                        href={`/superadmin/subjects/${subject.id}/edit`}
                        className="text-xs text-primary hover:underline"
                    >
                        Add class links
                    </Link>
                </div>
            )}

            {combos.length > 0 && !canShowChapters && (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center text-muted-foreground">
                    <HelpCircleIcon className="size-8 opacity-30" />
                    <p className="text-sm">
                        Select a pattern and class to show chapters.
                    </p>
                </div>
            )}

            {combos.length > 0 &&
                canShowChapters &&
                filteredChapters.length === 0 && (
                    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center text-muted-foreground">
                        <HelpCircleIcon className="size-8 opacity-30" />
                        <p className="text-sm">
                            No chapters for this pattern and class.
                        </p>
                        <button
                            onClick={openAddChapter}
                            className="text-xs text-primary hover:underline"
                        >
                            Add the first chapter
                        </button>
                    </div>
                )}

            {/* Chapter list */}
            {filteredChapters.length > 0 && (
                <div className="overflow-hidden rounded-xl border">
                    {/* Table header */}
                    <div
                        className="grid border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground"
                        style={{
                            gridTemplateColumns: isTopicWise
                                ? '2rem 3rem minmax(0,1fr) minmax(0,0.8fr) 5.5rem 5rem 9.5rem'
                                : '3rem minmax(0,1fr) minmax(0,0.8fr) 5.5rem 5rem 8.5rem',
                        }}
                    >
                        {isTopicWise && <span />}
                        <span>#</span>
                        <span>Chapter Name</span>
                        <span>Urdu Name</span>
                        <span>Questions</span>
                        <span>Status</span>
                        <span className="text-right">Actions</span>
                    </div>

                    {filteredChapters.map((ch, idx) => {
                        const isExpanded = expandedChapters.has(ch.id);
                        const isAddingTopic =
                            topicState?.mode === 'add' &&
                            topicState.chapterId === ch.id;
                        const editingTopicId =
                            topicState?.mode === 'edit' &&
                            topicState.chapterId === ch.id
                                ? topicState.topic.id
                                : null;

                        return (
                            <div
                                key={ch.id}
                                className={idx !== 0 ? 'border-t' : ''}
                            >
                                {/* Chapter row */}
                                <div
                                    className="grid items-center px-4 py-3 transition-colors hover:bg-muted/20"
                                    style={{
                                        gridTemplateColumns: isTopicWise
                                            ? '2rem 3rem minmax(0,1fr) minmax(0,0.8fr) 5.5rem 5rem 9.5rem'
                                            : '3rem minmax(0,1fr) minmax(0,0.8fr) 5.5rem 5rem 8.5rem',
                                    }}
                                >
                                    {isTopicWise && (
                                        <button
                                            onClick={() => toggleExpand(ch.id)}
                                            className="text-muted-foreground transition-colors hover:text-foreground"
                                            title={
                                                isExpanded
                                                    ? 'Collapse'
                                                    : 'Expand topics'
                                            }
                                        >
                                            {isExpanded ? (
                                                <ChevronDownIcon className="size-4" />
                                            ) : (
                                                <ChevronRightIcon className="size-4" />
                                            )}
                                        </button>
                                    )}
                                    <span className="font-mono text-sm text-muted-foreground">
                                        {ch.chapter_number ?? '—'}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">
                                            {ch.name}
                                        </p>
                                        {combos.length > 1 && (
                                            <p className="truncate text-xs text-muted-foreground">
                                                {ch.class?.name} ·{' '}
                                                {ch.pattern?.name}
                                            </p>
                                        )}
                                    </div>
                                    <p
                                        className="truncate text-sm text-muted-foreground"
                                        dir="rtl"
                                    >
                                        {ch.name_ur ?? '—'}
                                    </p>
                                    <Link
                                        href={`/superadmin/subjects/${subject.id}/chapters/${ch.id}/questions`}
                                        className="text-sm font-medium text-primary hover:underline"
                                    >
                                        {ch.questions_count}
                                    </Link>
                                    <StatusBadge status={ch.status} />
                                    <div className="flex items-center justify-end gap-1">
                                        <Link
                                            href={`/superadmin/subjects/${subject.id}/chapters/${ch.id}/questions`}
                                            className="rounded p-1 text-muted-foreground transition-colors hover:text-primary"
                                            title="View questions"
                                        >
                                            <ListChecksIcon className="size-3.5" />
                                        </Link>
                                        {isTopicWise && (
                                            <button
                                                onClick={() =>
                                                    openAddTopic(ch.id)
                                                }
                                                className="rounded p-1 text-muted-foreground transition-colors hover:text-primary"
                                                title="Add topic"
                                            >
                                                <PlusIcon className="size-3.5" />
                                            </button>
                                        )}
                                        <Link
                                            href={`/superadmin/subjects/${subject.id}/chapters/${ch.id}/questions/add`}
                                            className="rounded p-1 text-muted-foreground transition-colors hover:text-primary"
                                            title="Add question"
                                        >
                                            <PlusIcon className="size-3.5" />
                                        </Link>
                                        <Link
                                            href={`/superadmin/subjects/${subject.id}/chapters/${ch.id}/questions/import`}
                                            className="rounded p-1 text-muted-foreground transition-colors hover:text-primary"
                                            title="Import questions"
                                        >
                                            <FileUpIcon className="size-3.5" />
                                        </Link>
                                        <button
                                            onClick={() => openEditChapter(ch)}
                                            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                                            title="Edit chapter"
                                        >
                                            <PencilIcon className="size-3.5" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                setDeleteState({
                                                    type: 'chapter',
                                                    id: ch.id,
                                                    name: ch.name,
                                                })
                                            }
                                            className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                                            title="Delete chapter"
                                        >
                                            <Trash2Icon className="size-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Topics section (topic-wise only) */}
                                {isTopicWise && isExpanded && (
                                    <div className="space-y-2 border-t bg-muted/10 px-4 py-3">
                                        {ch.topics.length === 0 &&
                                            !isAddingTopic && (
                                                <p className="text-xs text-muted-foreground italic">
                                                    No topics yet.
                                                </p>
                                            )}

                                        {ch.topics.map((topic) => {
                                            const isEditingThis =
                                                editingTopicId === topic.id;
                                            if (isEditingThis) {
                                                return (
                                                    <TopicInlineForm
                                                        key={topic.id}
                                                        form={topicForm}
                                                        onClose={closeTopicForm}
                                                        onSubmit={submitTopic}
                                                        submitLabel="Save"
                                                    />
                                                );
                                            }
                                            return (
                                                <div
                                                    key={topic.id}
                                                    className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm"
                                                >
                                                    <ListIcon className="size-3.5 shrink-0 text-muted-foreground" />
                                                    <span className="flex-1 font-medium">
                                                        {topic.name}
                                                    </span>
                                                    {topic.name_ur && (
                                                        <span
                                                            className="text-xs text-muted-foreground"
                                                            dir="rtl"
                                                        >
                                                            {topic.name_ur}
                                                        </span>
                                                    )}
                                                    <StatusBadge
                                                        status={topic.status}
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() =>
                                                                openEditTopic(
                                                                    ch.id,
                                                                    topic,
                                                                )
                                                            }
                                                            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                                                            title="Edit topic"
                                                        >
                                                            <PencilIcon className="size-3" />
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setDeleteState({
                                                                    type: 'topic',
                                                                    chapterId:
                                                                        ch.id,
                                                                    id: topic.id,
                                                                    name: topic.name,
                                                                })
                                                            }
                                                            className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                                                            title="Delete topic"
                                                        >
                                                            <Trash2Icon className="size-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {isAddingTopic && (
                                            <TopicInlineForm
                                                form={topicForm}
                                                onClose={closeTopicForm}
                                                onSubmit={submitTopic}
                                                submitLabel="Add Topic"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Chapter Dialog */}
            <ChapterDialog
                open={chapterDialog !== null}
                onClose={closeChapterDialog}
                mode={chapterDialog?.mode ?? 'add'}
                editChapter={
                    chapterDialog?.mode === 'edit'
                        ? chapterDialog.chapter
                        : null
                }
                linksByPattern={subject.links_by_pattern}
                subjectId={subject.id}
                form={chapterForm}
            />

            {/* Delete Confirm */}
            <DeleteConfirmDialog
                open={deleteState !== null}
                onClose={() => setDeleteState(null)}
                onConfirm={confirmDelete}
                label={
                    deleteState?.type === 'chapter'
                        ? `chapter "${deleteState.name}"`
                        : `topic "${deleteState?.name}"`
                }
                processing={deleteProcessing}
            />
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ShowSubject({ subject }: { subject: SubjectData }) {
    const [activeTab, setActiveTab] = useState<'overview' | 'chapters'>(
        'chapters',
    );

    const totalLinks = subject.links_by_pattern.reduce(
        (sum, g) => sum + g.classes.length,
        0,
    );
    const typeLabel =
        subject.subject_type === 'chapter-wise' ? 'Chapter-wise' : 'Topic-wise';
    const typeClass =
        subject.subject_type === 'chapter-wise'
            ? 'bg-blue-100 text-blue-700 border-blue-200'
            : 'bg-violet-100 text-violet-700 border-violet-200';

    const combos: Combo[] = useMemo(
        () =>
            subject.links_by_pattern.flatMap((group) =>
                group.classes.map((cls) => ({
                    key: `${cls.id}-${group.pattern.id}`,
                    label: `${cls.name} — ${group.pattern.name}`,
                    class_id: cls.id,
                    pattern_id: group.pattern.id,
                })),
            ),
        [subject.links_by_pattern],
    );

    return (
        <>
            <Head title={subject.name_eng} />
            <div className="space-y-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/superadmin/subjects"
                            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-input transition-colors hover:bg-accent"
                        >
                            <ArrowLeftIcon className="size-4" />
                        </Link>
                        <div>
                            <h1 className="h1-semibold">{subject.name_eng}</h1>
                            {subject.name_ur && (
                                <p
                                    className="text-sm text-muted-foreground"
                                    dir="rtl"
                                >
                                    {subject.name_ur}
                                </p>
                            )}
                        </div>
                    </div>
                    <Button asChild variant="outline" className="sm:shrink-0">
                        <Link href={`/superadmin/subjects/${subject.id}/edit`}>
                            <PencilIcon className="size-4" /> Edit Subject
                        </Link>
                    </Button>
                </div>

                {/* ── Overview card ────────────────────────────────────────── */}
                <div className="overflow-hidden rounded-xl border shadow-sm">
                    <div className="flex flex-wrap items-center gap-6 border-b bg-muted/20 p-5 md:p-6">
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <BookOpenIcon className="size-7" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-semibold">
                                    {subject.name_eng}
                                </h2>
                                <Badge
                                    variant="outline"
                                    className={`${typeClass} font-medium`}
                                >
                                    {typeLabel}
                                </Badge>
                                {subject.status === 1 ? (
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
                                )}
                            </div>
                            {subject.name_ur && (
                                <p
                                    className="text-sm text-muted-foreground"
                                    dir="rtl"
                                >
                                    {subject.name_ur}
                                </p>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CalendarIcon className="size-3.5" />
                                <span>
                                    Created {fmtDate(subject.created_at)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="grid divide-y sm:grid-cols-4 sm:divide-x sm:divide-y-0 hidden ">
                        <div className="p-5 text-center">
                            <p className="text-xs text-muted-foreground">
                                Type
                            </p>
                            <p className="mt-1 font-semibold">{typeLabel}</p>
                        </div>
                        <div className="p-5 text-center">
                            <p className="text-xs text-muted-foreground">
                                Linked Patterns
                            </p>
                            <p className="mt-1 font-semibold">
                                {subject.links_by_pattern.length}
                            </p>
                        </div>
                        <div className="p-5 text-center">
                            <p className="text-xs text-muted-foreground">
                                Linked Classes
                            </p>
                            <p className="mt-1 font-semibold">{totalLinks}</p>
                        </div>
                        <div className="p-5 text-center">
                            <p className="text-xs text-muted-foreground">
                                Total Chapters
                            </p>
                            <p className="mt-1 font-semibold">
                                {subject.chapters.length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Tabs ─────────────────────────────────────────────────── */}
                <div className="border-b">
                    <div className="flex gap-0">
                        {(['overview', 'chapters'] as const).map((tab) => {
                            const labels = {
                                overview: 'Overview',
                                chapters:
                                    subject.subject_type === 'topic-wise'
                                        ? 'Chapters & Topics'
                                        : 'Chapters',
                            };
                            const icons = {
                                overview: <SchoolIcon className="size-3.5" />,
                                chapters: <LayersIcon className="size-3.5" />,
                            };
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                                        activeTab === tab
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {icons[tab]}
                                    {labels[tab]}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Overview Tab ─────────────────────────────────────────── */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Class Links by Pattern */}
                        <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                            <SectionHeader
                                icon={<SchoolIcon className="size-4" />}
                                title="Class Links"
                                description="Which classes teach this subject, grouped by pattern"
                            />
                            <Separator />
                            {subject.links_by_pattern.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center text-muted-foreground">
                                    <HelpCircleIcon className="size-8 opacity-30" />
                                    <p className="text-sm">
                                        No class links yet
                                    </p>
                                    <Link
                                        href={`/superadmin/subjects/${subject.id}/edit`}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Add links
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {subject.links_by_pattern.map((group) => (
                                        <div
                                            key={group.pattern.id}
                                            className="overflow-hidden rounded-lg border"
                                        >
                                            <Link
                                                href={`/superadmin/patterns/${group.pattern.id}`}
                                                className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5 transition-colors hover:bg-muted/70"
                                            >
                                                <TagIcon className="size-3.5 text-muted-foreground" />
                                                <span className="text-sm font-semibold">
                                                    {group.pattern.name}
                                                </span>
                                                {group.pattern.short_name && (
                                                    <span className="text-xs text-muted-foreground">
                                                        (
                                                        {
                                                            group.pattern
                                                                .short_name
                                                        }
                                                        )
                                                    </span>
                                                )}
                                                <span className="ml-auto text-xs text-muted-foreground">
                                                    {group.classes.length} class
                                                    {group.classes.length !== 1
                                                        ? 'es'
                                                        : ''}
                                                </span>
                                            </Link>
                                            <div className="flex flex-wrap gap-2 p-4">
                                                {group.classes.map((cls) => (
                                                    <Link
                                                        key={cls.id}
                                                        href={`/superadmin/classes/${cls.id}`}
                                                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                                                    >
                                                        <SchoolIcon className="size-3.5 text-muted-foreground" />
                                                        <span className="font-medium">
                                                            {cls.name}
                                                        </span>
                                                        {cls.status !== 1 && (
                                                            <Badge
                                                                variant="outline"
                                                                className="border-gray-200 bg-gray-100 text-xs text-gray-500"
                                                            >
                                                                Inactive
                                                            </Badge>
                                                        )}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Audit Logs */}
                        <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                            <SectionHeader
                                icon={<LogsIcon className="size-4" />}
                                title="Activity Log"
                                description="All changes made to this subject"
                            />
                            <Separator />
                            {subject.audit_logs.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center text-muted-foreground">
                                    <HelpCircleIcon className="size-8 opacity-30" />
                                    <p className="text-sm">
                                        No activity recorded yet
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {subject.audit_logs.map((log) => (
                                        <AuditLogCard key={log.id} log={log} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Chapters Tab ─────────────────────────────────────────── */}
                {activeTab === 'chapters' && (
                    <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                        <SectionHeader
                            icon={<LayersIcon className="size-4" />}
                            title={
                                subject.subject_type === 'topic-wise'
                                    ? 'Chapters & Topics'
                                    : 'Chapters'
                            }
                            description={
                                subject.subject_type === 'topic-wise'
                                    ? 'Manage chapters and their topics for each class–pattern combination'
                                    : 'Manage chapters for each class–pattern combination'
                            }
                        />
                        <Separator />
                        <ChaptersTab subject={subject} combos={combos} />
                    </div>
                )}
            </div>
        </>
    );
}

ShowSubject.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Subjects', href: '/superadmin/subjects' },
        { title: 'View Subject' },
    ],
};

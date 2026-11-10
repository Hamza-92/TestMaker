import { router } from '@inertiajs/react';
import { BookOpenCheckIcon, Loader2Icon, SaveIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FloatingCombobox } from '@/components/ui/floating-combobox';
import type { ComboboxOptionItem } from '@/components/ui/floating-combobox';
import { usePermission } from '@/hooks/use-permission';

interface ScopeCatalog {
    patterns: Array<{ id: number; name: string }>;
    patternClasses: Array<{ pattern_id: number; id: number; name: string }>;
    classSubjects: Array<{
        pattern_id: number;
        class_id: number;
        subject_id: number;
        name: string;
        name_ur: string | null;
    }>;
}

interface TopicRow {
    id: number;
    name: string | null;
    name_ur: string | null;
}

interface ChapterRow {
    id: number;
    name: string | null;
    name_ur: string | null;
    chapter_number: number | null;
    topics: TopicRow[];
}

interface Scope {
    patternId: number | null;
    classId: number | null;
    subjectId: number | null;
}

function optionFor(options: ComboboxOptionItem[], id: number | null) {
    return options.find((option) => Number(option.id) === id) ?? null;
}

function bilingualName(english: string | null, urdu: string | null) {
    return [english, urdu].filter(Boolean).join(' · ') || 'Untitled';
}

export default function SmartSyllabus({
    scopeCatalog,
    initialScope,
}: {
    scopeCatalog: ScopeCatalog;
    initialScope: Scope;
}) {
    const { can } = usePermission();
    const canEdit = can('patterns.edit');
    const [patternId, setPatternId] = useState<number | null>(
        initialScope.patternId,
    );
    const [classId, setClassId] = useState<number | null>(initialScope.classId);
    const [subjectId, setSubjectId] = useState<number | null>(
        initialScope.subjectId,
    );
    const [chapters, setChapters] = useState<ChapterRow[]>([]);
    const [includedChapters, setIncludedChapters] = useState<Set<number>>(
        new Set(),
    );
    const [includedTopics, setIncludedTopics] = useState<Set<number>>(
        new Set(),
    );
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const patternOptions = useMemo<ComboboxOptionItem[]>(
        () =>
            scopeCatalog.patterns.map((pattern) => ({
                id: pattern.id,
                label: pattern.name,
            })),
        [scopeCatalog.patterns],
    );
    const classOptions = useMemo<ComboboxOptionItem[]>(
        () =>
            scopeCatalog.patternClasses
                .filter((schoolClass) => schoolClass.pattern_id === patternId)
                .map((schoolClass) => ({
                    id: schoolClass.id,
                    label: schoolClass.name,
                })),
        [scopeCatalog.patternClasses, patternId],
    );
    const subjectOptions = useMemo<ComboboxOptionItem[]>(
        () =>
            scopeCatalog.classSubjects
                .filter(
                    (subject) =>
                        subject.pattern_id === patternId &&
                        subject.class_id === classId,
                )
                .map((subject) => ({
                    id: subject.subject_id,
                    label: bilingualName(subject.name, subject.name_ur),
                })),
        [scopeCatalog.classSubjects, patternId, classId],
    );

    useEffect(() => {
        if (!patternId || !classId || !subjectId) {
            return;
        }

        const controller = new AbortController();
        const query = new URLSearchParams({
            pattern_id: String(patternId),
            class_id: String(classId),
            subject_id: String(subjectId),
        });
        queueMicrotask(() => {
            if (!controller.signal.aborted) {
                setLoading(true);
                setError(null);
            }
        });

        fetch(`/superadmin/smart-syllabus/chapters?${query}`, {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('Could not load chapters and topics.');
                }

                return (await response.json()) as {
                    chapters: ChapterRow[];
                    excludedChapterIds: number[];
                    excludedTopicIds: number[];
                };
            })
            .then((data) => {
                if (!Array.isArray(data.chapters)) {
                    throw new Error('Invalid chapter response.');
                }

                const excludedChapters = new Set(data.excludedChapterIds);
                const excludedTopics = new Set(data.excludedTopicIds);
                setChapters(data.chapters);
                setIncludedChapters(
                    new Set(
                        data.chapters
                            .filter(
                                (chapter) => !excludedChapters.has(chapter.id),
                            )
                            .map((chapter) => chapter.id),
                    ),
                );
                setIncludedTopics(
                    new Set(
                        data.chapters.flatMap((chapter) =>
                            excludedChapters.has(chapter.id)
                                ? []
                                : chapter.topics
                                      .filter(
                                          (topic) =>
                                              !excludedTopics.has(topic.id),
                                      )
                                      .map((topic) => topic.id),
                        ),
                    ),
                );
            })
            .catch((reason: unknown) => {
                if (controller.signal.aborted) {
                    return;
                }

                setError(
                    reason instanceof Error
                        ? reason.message
                        : 'Could not load chapters and topics.',
                );
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [patternId, classId, subjectId, reloadKey]);

    function selectScope(next: Scope) {
        setPatternId(next.patternId);
        setClassId(next.classId);
        setSubjectId(next.subjectId);
        setChapters([]);
        setIncludedChapters(new Set());
        setIncludedTopics(new Set());
        setError(null);

        const query = new URLSearchParams();

        if (next.patternId) {
            query.set('pattern_id', String(next.patternId));
        }

        if (next.classId) {
            query.set('class_id', String(next.classId));
        }

        if (next.subjectId) {
            query.set('subject_id', String(next.subjectId));
        }

        window.history.replaceState(
            window.history.state,
            '',
            `/superadmin/smart-syllabus${query.size ? `?${query}` : ''}`,
        );
    }

    function toggleChapter(chapter: ChapterRow) {
        const fullyIncluded =
            includedChapters.has(chapter.id) &&
            chapter.topics.every((topic) => includedTopics.has(topic.id));
        const include = !fullyIncluded;
        setIncludedChapters((current) => {
            const next = new Set(current);

            if (include) {
                next.add(chapter.id);
            } else {
                next.delete(chapter.id);
            }

            return next;
        });
        setIncludedTopics((current) => {
            const next = new Set(current);
            chapter.topics.forEach((topic) => {
                if (include) {
                    next.add(topic.id);
                } else {
                    next.delete(topic.id);
                }
            });

            return next;
        });
    }

    function toggleTopic(chapter: ChapterRow, topicId: number) {
        const next = new Set(includedTopics);

        if (next.has(topicId)) {
            next.delete(topicId);
        } else {
            next.add(topicId);
        }

        setIncludedTopics(next);
        setIncludedChapters((current) => {
            const updated = new Set(current);

            if (chapter.topics.some((topic) => next.has(topic.id))) {
                updated.add(chapter.id);
            } else {
                updated.delete(chapter.id);
            }

            return updated;
        });
    }

    function save() {
        if (!canEdit || !patternId || !classId || !subjectId || saving) {
            return;
        }

        setSaving(true);
        router.put(
            '/superadmin/smart-syllabus',
            {
                pattern_id: patternId,
                class_id: classId,
                subject_id: subjectId,
                excluded_chapter_ids: chapters
                    .filter((chapter) => !includedChapters.has(chapter.id))
                    .map((chapter) => chapter.id),
                excluded_topic_ids: chapters.flatMap((chapter) =>
                    includedChapters.has(chapter.id)
                        ? chapter.topics
                              .filter((topic) => !includedTopics.has(topic.id))
                              .map((topic) => topic.id)
                        : [],
                ),
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success('Smart syllabus saved.');
                    setReloadKey((current) => current + 1);
                },
                onError: (errors) =>
                    toast.error(
                        Object.values(errors)[0] ??
                            'Could not save smart syllabus.',
                    ),
                onFinish: () => setSaving(false),
            },
        );
    }

    const selected = !!patternId && !!classId && !!subjectId;
    const totalTopics = chapters.reduce(
        (count, chapter) => count + chapter.topics.length,
        0,
    );

    return (
        <div className="w-full min-w-0 space-y-5 p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                        <BookOpenCheckIcon className="size-5" />
                    </span>
                    <h1 className="text-2xl font-semibold">Smart Syllabus</h1>
                </div>
                {selected && chapters.length > 0 && (
                    <Button
                        onClick={save}
                        disabled={!canEdit || saving || loading}
                    >
                        {saving ? (
                            <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                            <SaveIcon className="size-4" />
                        )}
                        Save
                    </Button>
                )}
            </div>

            <div className="grid gap-3 rounded-2xl border bg-card p-5 shadow-sm md:grid-cols-3">
                <FloatingCombobox
                    label="Pattern"
                    value={optionFor(patternOptions, patternId)}
                    options={patternOptions}
                    onChange={(value) =>
                        selectScope({
                            patternId: value ? Number(value.id) : null,
                            classId: null,
                            subjectId: null,
                        })
                    }
                    placeholder="Pattern"
                />
                <FloatingCombobox
                    label="Class"
                    value={optionFor(classOptions, classId)}
                    options={classOptions}
                    onChange={(value) =>
                        selectScope({
                            patternId,
                            classId: value ? Number(value.id) : null,
                            subjectId: null,
                        })
                    }
                    placeholder="Class"
                    disabled={!patternId}
                />
                <FloatingCombobox
                    label="Subject"
                    value={optionFor(subjectOptions, subjectId)}
                    options={subjectOptions}
                    onChange={(value) =>
                        selectScope({
                            patternId,
                            classId,
                            subjectId: value ? Number(value.id) : null,
                        })
                    }
                    placeholder="Subject"
                    disabled={!classId}
                />
            </div>

            {selected && (
                <div className="rounded-2xl border bg-card shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
                        <h2 className="font-semibold">Chapters and topics</h2>
                        {!loading && !error && (
                            <span className="text-xs text-muted-foreground">
                                {includedChapters.size}/{chapters.length}{' '}
                                chapters · {includedTopics.size}/{totalTopics}{' '}
                                topics included
                            </span>
                        )}
                    </div>
                    {loading ? (
                        <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground">
                            <Loader2Icon className="size-4 animate-spin" />{' '}
                            Loading…
                        </div>
                    ) : error ? (
                        <div className="px-5 py-8 text-sm text-red-600">
                            {error}
                        </div>
                    ) : chapters.length === 0 ? (
                        <div className="px-5 py-8 text-sm text-muted-foreground">
                            No chapters in this subject.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {chapters.map((chapter) => {
                                const included = includedChapters.has(
                                    chapter.id,
                                );
                                const selectedTopics = chapter.topics.filter(
                                    (topic) => includedTopics.has(topic.id),
                                ).length;
                                const checked = !included
                                    ? false
                                    : selectedTopics === chapter.topics.length
                                      ? true
                                      : 'indeterminate';

                                return (
                                    <div key={chapter.id} className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                id={`chapter-${chapter.id}`}
                                                checked={checked}
                                                disabled={!canEdit}
                                                onCheckedChange={() =>
                                                    toggleChapter(chapter)
                                                }
                                            />
                                            <label
                                                htmlFor={`chapter-${chapter.id}`}
                                                className="min-w-0 flex-1 cursor-pointer text-sm font-semibold"
                                            >
                                                {chapter.chapter_number !=
                                                    null && (
                                                    <span className="mr-2 text-muted-foreground">
                                                        {chapter.chapter_number}
                                                        .
                                                    </span>
                                                )}
                                                <span
                                                    className={
                                                        !included
                                                            ? 'text-muted-foreground line-through'
                                                            : ''
                                                    }
                                                >
                                                    {bilingualName(
                                                        chapter.name,
                                                        chapter.name_ur,
                                                    )}
                                                </span>
                                            </label>
                                        </div>
                                        {chapter.topics.length > 0 && (
                                            <div className="ml-7 mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                                {chapter.topics.map((topic) => {
                                                    const topicIncluded =
                                                        included &&
                                                        includedTopics.has(
                                                            topic.id,
                                                        );

                                                    return (
                                                        <div
                                                            key={topic.id}
                                                            className="flex min-w-0 items-start gap-2"
                                                        >
                                                            <Checkbox
                                                                id={`topic-${topic.id}`}
                                                                checked={
                                                                    topicIncluded
                                                                }
                                                                disabled={
                                                                    !canEdit ||
                                                                    !included
                                                                }
                                                                onCheckedChange={() =>
                                                                    toggleTopic(
                                                                        chapter,
                                                                        topic.id,
                                                                    )
                                                                }
                                                            />
                                                            <label
                                                                htmlFor={`topic-${topic.id}`}
                                                                className={`min-w-0 cursor-pointer text-sm ${topicIncluded ? '' : 'text-muted-foreground line-through'}`}
                                                            >
                                                                {bilingualName(
                                                                    topic.name,
                                                                    topic.name_ur,
                                                                )}
                                                            </label>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

SmartSyllabus.layout = {
    breadcrumbs: [
        { title: 'Smart Syllabus', href: '/superadmin/smart-syllabus' },
    ],
};

import { Head, router } from '@inertiajs/react';
import {
    BookOpenIcon,
    CheckIcon,
    FileTextIcon,
    GraduationCapIcon,
    LayersIcon,
    MinusIcon,
    RotateCcwIcon,
    SearchXIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FloatingCombobox, type ComboboxOptionItem } from '@/components/ui/floating-combobox';
import { cn } from '@/lib/utils';

// ── Server-passed data shapes ────────────────────────────────────────────────
interface Pattern {
    id: number;
    name: string;
}
interface PatternClass {
    pattern_id: number;
    id: number; // class id
    name: string;
}
interface ClassSubject {
    pattern_id: number;
    class_id: number;
    subject_id: number;
    name: string;
}
interface Topic {
    id: number;
    name: string;
}
interface Chapter {
    id: number;
    name: string;
    chapter_number: number | null;
    group_name: string | null;
    group_heading: string | null;
    topics: Topic[];
}

interface Props {
    patterns: Pattern[];
    patternClasses: PatternClass[];
    classSubjects: ClassSubject[];
}

// ── Small helpers ────────────────────────────────────────────────────────────
function pluralize(n: number, one: string, many: string) {
    return n === 1 ? `${n} ${one}` : `${n} ${many}`;
}

// ── Tri-state checkbox (visual only, no Radix theming overhead) ──────────────
function TriCheckbox({
    state,
    onChange,
    label,
    size = 'md',
}: {
    state: 'unchecked' | 'checked' | 'indeterminate';
    onChange: () => void;
    label: string;
    size?: 'sm' | 'md';
}) {
    const sz = size === 'sm' ? 'size-4' : 'size-[18px]';
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={state === 'indeterminate' ? 'mixed' : state === 'checked'}
            aria-label={label}
            onClick={onChange}
            className={cn(
                'flex shrink-0 items-center justify-center rounded-[5px] border transition-all',
                sz,
                state === 'checked'
                    ? 'border-teal-600 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-950'
                    : state === 'indeterminate'
                      ? 'border-teal-600 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-950'
                      : 'border-slate-300 bg-white hover:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-teal-400',
            )}
        >
            {state === 'checked' && <CheckIcon className="size-3" strokeWidth={3} />}
            {state === 'indeterminate' && <MinusIcon className="size-3" strokeWidth={3} />}
        </button>
    );
}

// ── Step pill ────────────────────────────────────────────────────────────────
function StepPill({
    index,
    label,
    state,
}: {
    index: number;
    label: string;
    state: 'active' | 'done' | 'upcoming';
}) {
    return (
        <div className="flex items-center gap-2">
            <div
                className={cn(
                    'flex size-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
                    state === 'active' &&
                        'bg-teal-600 text-white ring-4 ring-teal-500/15 dark:bg-teal-500 dark:text-slate-950 dark:ring-teal-400/15',
                    state === 'done' && 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
                    state === 'upcoming' && 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
                )}
            >
                {state === 'done' ? <CheckIcon className="size-3.5" strokeWidth={3} /> : index}
            </div>
            <span
                className={cn(
                    'text-xs font-medium',
                    state === 'upcoming'
                        ? 'text-slate-400 dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-100',
                )}
            >
                {label}
            </span>
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function GeneratePaper({ patterns, patternClasses, classSubjects }: Props) {
    const [pattern, setPattern] = useState<ComboboxOptionItem | null>(null);
    const [klass, setKlass] = useState<ComboboxOptionItem | null>(null);
    const [subject, setSubject] = useState<ComboboxOptionItem | null>(null);

    const [chapters, setChapters] = useState<Chapter[] | null>(null);
    const [loadingChapters, setLoadingChapters] = useState(false);
    /** chapterId → Set of selected topic ids */
    const [selected, setSelected] = useState<Record<number, Set<number>>>({});

    // ── Cascaded option lists ────────────────────────────────────────────────
    const patternOptions = useMemo<ComboboxOptionItem[]>(
        () => patterns.map((p) => ({ id: p.id, label: p.name })),
        [patterns],
    );

    const classOptions = useMemo<ComboboxOptionItem[]>(() => {
        if (!pattern) return [];
        return patternClasses
            .filter((pc) => pc.pattern_id === pattern.id)
            .map((pc) => ({ id: pc.id, label: pc.name }));
    }, [pattern, patternClasses]);

    const subjectOptions = useMemo<ComboboxOptionItem[]>(() => {
        if (!pattern || !klass) return [];
        return classSubjects
            .filter((cs) => cs.pattern_id === pattern.id && cs.class_id === klass.id)
            .map((cs) => ({ id: cs.subject_id, label: cs.name }));
    }, [pattern, klass, classSubjects]);

    // ── Cascade resets ───────────────────────────────────────────────────────
    function handlePatternChange(v: ComboboxOptionItem | null) {
        setPattern(v);
        setKlass(null);
        setSubject(null);
        setChapters(null);
        setSelected({});
    }
    function handleClassChange(v: ComboboxOptionItem | null) {
        setKlass(v);
        setSubject(null);
        setChapters(null);
        setSelected({});
    }
    function handleSubjectChange(v: ComboboxOptionItem | null) {
        setSubject(v);
        setSelected({});
        // Chapter fetch is triggered by the effect below.
    }

    // ── Fetch chapters when scope is complete ────────────────────────────────
    useEffect(() => {
        if (!pattern || !klass || !subject) {
            setChapters(null);
            return;
        }
        const ac = new AbortController();
        setLoadingChapters(true);
        setChapters(null);

        const params = new URLSearchParams({
            pattern_id: String(pattern.id),
            class_id: String(klass.id),
            subject_id: String(subject.id),
        });

        fetch(`/papers/generate/chapters?${params.toString()}`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            signal: ac.signal,
            credentials: 'same-origin',
        })
            .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
            .then((d: { chapters: Chapter[] }) => setChapters(d.chapters))
            .catch((err) => {
                if (err?.name !== 'AbortError') {
                    setChapters([]);
                }
            })
            .finally(() => setLoadingChapters(false));

        return () => ac.abort();
    }, [pattern, klass, subject]);

    // ── Selection helpers ────────────────────────────────────────────────────
    function toggleTopic(chapterId: number, topicId: number) {
        setSelected((prev) => {
            const next = { ...prev };
            const set = new Set(next[chapterId] ?? []);
            if (set.has(topicId)) set.delete(topicId);
            else set.add(topicId);
            if (set.size === 0) delete next[chapterId];
            else next[chapterId] = set;
            return next;
        });
    }

    function toggleChapter(ch: Chapter) {
        setSelected((prev) => {
            const next = { ...prev };
            const current = next[ch.id] ?? new Set<number>();
            const allTopicIds = ch.topics.map((t) => t.id);
            const allSelected = allTopicIds.length > 0 && allTopicIds.every((id) => current.has(id));
            if (allSelected) {
                delete next[ch.id];
            } else {
                next[ch.id] = new Set(allTopicIds);
            }
            return next;
        });
    }

    function chapterState(ch: Chapter): 'unchecked' | 'checked' | 'indeterminate' {
        const set = selected[ch.id];
        if (!set || set.size === 0) return 'unchecked';
        if (set.size === ch.topics.length) return 'checked';
        return 'indeterminate';
    }

    function reset() {
        setPattern(null);
        setKlass(null);
        setSubject(null);
        setChapters(null);
        setSelected({});
    }

    // ── Stats ────────────────────────────────────────────────────────────────
    const selectedChapterCount = Object.values(selected).filter((s) => s.size > 0).length;
    const selectedTopicCount = Object.values(selected).reduce((acc, s) => acc + s.size, 0);

    // ── Stepper state ────────────────────────────────────────────────────────
    const scopeDone = !!(pattern && klass && subject);
    const stepStates = {
        scope: scopeDone ? 'done' : 'active',
        chapters: !scopeDone ? 'upcoming' : selectedTopicCount > 0 ? 'done' : 'active',
        review: selectedTopicCount > 0 ? 'active' : 'upcoming',
    } as const;

    // ── Group chapters by group_heading (Pakistan textbook chapters often have units) ──
    const chapterGroups = useMemo(() => {
        if (!chapters) return [] as { heading: string | null; items: Chapter[] }[];
        const groups: { heading: string | null; items: Chapter[] }[] = [];
        for (const ch of chapters) {
            const heading = ch.group_heading || ch.group_name || null;
            const last = groups[groups.length - 1];
            if (last && last.heading === heading) last.items.push(ch);
            else groups.push({ heading, items: [ch] });
        }
        return groups;
    }, [chapters]);

    return (
        <>
            <Head title="Generate Paper" />

            <div className="mx-auto max-w-7xl space-y-6 pb-24">
                {/* ── Page header ─────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                        Generate Paper
                    </h1>

                    {/* Stepper */}
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                        <StepPill index={1} label="Scope" state={stepStates.scope} />
                        <div className="h-px w-5 bg-slate-200 dark:bg-slate-800" />
                        <StepPill index={2} label="Chapters" state={stepStates.chapters} />
                        <div className="h-px w-5 bg-slate-200 dark:bg-slate-800" />
                        <StepPill index={3} label="Review" state={stepStates.review} />
                    </div>
                </div>

                {/* ── Scope card ──────────────────────────────────────────── */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/10">
                    <div className="mb-4 flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
                            <LayersIcon className="size-4" />
                        </div>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Choose the scope
                        </h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <FloatingCombobox
                            label="Pattern"
                            leadingIcon={FileTextIcon}
                            options={patternOptions}
                            value={pattern}
                            onChange={handlePatternChange}
                        />
                        <FloatingCombobox
                            label="Class"
                            leadingIcon={GraduationCapIcon}
                            options={classOptions}
                            value={klass}
                            onChange={handleClassChange}
                            disabled={!pattern}
                        />
                        <FloatingCombobox
                            label="Subject"
                            leadingIcon={BookOpenIcon}
                            options={subjectOptions}
                            value={subject}
                            onChange={handleSubjectChange}
                            disabled={!klass}
                        />
                    </div>
                </section>

                {/* ── Chapters section ───────────────────────────────────── */}
                {pattern && klass && subject && (
                    <section>
                        {/* Chapter section header */}
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                Chapters &amp; topics
                            </h2>
                            {chapters && chapters.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            // Select everything
                                            const all: Record<number, Set<number>> = {};
                                            for (const ch of chapters) {
                                                if (ch.topics.length > 0) {
                                                    all[ch.id] = new Set(ch.topics.map((t) => t.id));
                                                }
                                            }
                                            setSelected(all);
                                        }}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                    >
                                        Select all
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelected({})}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Loading */}
                        {loadingChapters && (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60"
                                    />
                                ))}
                            </div>
                        )}

                        {/* Empty */}
                        {!loadingChapters && chapters && chapters.length === 0 && (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 py-16 text-center dark:border-slate-700 dark:bg-slate-900/40">
                                <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700">
                                    <SearchXIcon className="size-5" />
                                </div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    No chapters found
                                </p>
                            </div>
                        )}

                        {/* Chapter groups */}
                        {!loadingChapters && chapters && chapters.length > 0 && (
                            <div className="space-y-6">
                                {chapterGroups.map((group, idx) => (
                                    <div key={`${group.heading ?? 'none'}-${idx}`}>
                                        {group.heading && (
                                            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                {group.heading}
                                            </h3>
                                        )}
                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                            {group.items.map((ch) => (
                                                <ChapterCard
                                                    key={ch.id}
                                                    chapter={ch}
                                                    state={chapterState(ch)}
                                                    selectedTopics={selected[ch.id] ?? new Set()}
                                                    onToggleChapter={() => toggleChapter(ch)}
                                                    onToggleTopic={(tid) => toggleTopic(ch.id, tid)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

            </div>

            {/* ── Sticky action footer ────────────────────────────────────── */}
            <div className="sticky bottom-0 -mx-4 mt-6 border-t border-slate-200 bg-white/85 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85 md:-mx-6 md:px-6">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 px-2 py-1 font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                            <CheckIcon className="size-3" strokeWidth={3} />
                            {pluralize(selectedChapterCount, 'chapter', 'chapters')}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                            {pluralize(selectedTopicCount, 'topic', 'topics')} selected
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => router.visit('/dashboard')}
                            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={reset}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                            <RotateCcwIcon className="size-3.5" />
                            Reset
                        </button>
                        <button
                            type="button"
                            disabled={selectedTopicCount === 0}
                            className={cn(
                                'rounded-lg px-5 py-2 text-sm font-semibold transition-colors',
                                selectedTopicCount === 0
                                    ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                    : 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400',
                            )}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Chapter card ─────────────────────────────────────────────────────────────
function ChapterCard({
    chapter,
    state,
    selectedTopics,
    onToggleChapter,
    onToggleTopic,
}: {
    chapter: Chapter;
    state: 'unchecked' | 'checked' | 'indeterminate';
    selectedTopics: Set<number>;
    onToggleChapter: () => void;
    onToggleTopic: (topicId: number) => void;
}) {
    const isActive = state !== 'unchecked';

    return (
        <div
            className={cn(
                'group rounded-2xl border bg-white p-4 transition-all',
                isActive
                    ? 'border-teal-300 ring-2 ring-teal-500/10 dark:border-teal-500/40 dark:ring-teal-400/10'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700',
                'dark:bg-slate-900',
            )}
        >
            {/* Header */}
            <div className="flex items-start gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                <TriCheckbox
                    state={state}
                    onChange={onToggleChapter}
                    label={`Toggle all topics in ${chapter.name}`}
                />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        {chapter.chapter_number !== null && (
                            <span
                                className={cn(
                                    'rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors',
                                    isActive
                                        ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200'
                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                                )}
                            >
                                CH {String(chapter.chapter_number).padStart(2, '0')}
                            </span>
                        )}
                        <h3
                            className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100"
                            title={chapter.name}
                        >
                            {chapter.name}
                        </h3>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {chapter.topics.length === 0
                            ? 'No topics'
                            : `${selectedTopics.size} / ${chapter.topics.length} topics`}
                    </p>
                </div>
            </div>

            {/* Topics list */}
            {chapter.topics.length === 0 ? (
                <p className="px-1 py-3 text-xs italic text-slate-400 dark:text-slate-500">
                    This chapter has no topics yet.
                </p>
            ) : (
                <ul className="scrollbar-slim mt-2 max-h-56 space-y-0.5 overflow-y-auto pr-1">
                    {chapter.topics.map((t) => {
                        const checked = selectedTopics.has(t.id);
                        return (
                            <li key={t.id}>
                                <button
                                    type="button"
                                    onClick={() => onToggleTopic(t.id)}
                                    className={cn(
                                        'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors',
                                        checked
                                            ? 'bg-teal-50 text-teal-900 dark:bg-teal-500/10 dark:text-teal-100'
                                            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60',
                                    )}
                                >
                                    <TriCheckbox
                                        state={checked ? 'checked' : 'unchecked'}
                                        onChange={() => onToggleTopic(t.id)}
                                        label={t.name}
                                        size="sm"
                                    />
                                    <span className="truncate">{t.name}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

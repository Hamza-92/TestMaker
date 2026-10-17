import { Head } from '@inertiajs/react';
import { ArrowRightIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FloatingCombobox } from '@/components/ui/floating-combobox';
import type { ComboboxOptionItem } from '@/components/ui/floating-combobox';
import { Switch } from '@/components/ui/switch';

type Mode =
    | 'subject'
    | 'chapters'
    | 'topics'
    | 'question_types'
    | 'questions'
    | 'history';
type Item = { id: number; name: string };
type Chapter = Item & { chapter_number: number | null };
type Topic = Item & { chapter_id: number };
type Type = Item & { schema_key: string | null };
type Question = {
    id: number;
    chapter_id: number;
    topic_id: number | null;
    question_type_id: number;
    statement_en: string | null;
    statement_ur: string | null;
    schema_key: string | null;
};
type Catalog = {
    patterns: Item[];
    classes: Item[];
    subjects: (Item & { name_eng: string; name_ur: string | null })[];
    legacy_patterns: Item[];
    legacy_classes: Item[];
    legacy_subjects: Item[];
    chapters: Chapter[];
    topics: Topic[];
    question_types: Type[];
    questions: {
        data: Question[];
        current_page: number;
        last_page: number;
        total: number;
    } | null;
};
type Preview = {
    total: number;
    ready: number;
    chapters: number;
    unsupported: Record<string, number>;
    target: { class: string; subject: string; pattern: number };
    replace_existing: boolean;
};
type Report = {
    created: number;
    updated: number;
    matched: number;
    unchanged: number;
    skipped: number;
    conflicts: number;
    questions_created: number;
    questions_updated: number;
    errors: string[];
};
type Run = { id: number; mode: string; created_at: string; report: Report };

const modes: { key: Mode; label: string }[] = [
    { key: 'subject', label: 'Subject' },
    { key: 'chapters', label: 'Chapters' },
    { key: 'topics', label: 'Topics' },
    { key: 'question_types', label: 'Question types' },
    { key: 'questions', label: 'Questions' },
    { key: 'history', label: 'History' },
];

function csrfToken(): string {
    return (
        (
            document.querySelector(
                'meta[name="csrf-token"]',
            ) as HTMLMetaElement | null
        )?.content ?? ''
    );
}

function options(
    items: Item[],
    label: (item: Item) => string = (item) => item.name,
): ComboboxOptionItem[] {
    return items.map((item) => ({ id: item.id, label: label(item) }));
}

function choice(
    items: ComboboxOptionItem[],
    id: number | null,
): ComboboxOptionItem | null {
    return items.find((item) => Number(item.id) === id) ?? null;
}

function matchingLegacyPattern(name: string): number | null {
    const match = [
        [/pecta|pef|smart|short syllabus/i, 3],
        [/federal|fedral/i, 4],
        [/ajk/i, 6],
        [/kpk/i, 7],
        [/sindh/i, 9],
        [/afaq.*sun/i, 5],
        [/afaq/i, 1],
        [/oxford/i, 2],
        [/punjab/i, 0],
    ] as const;

    return match.find(([pattern]) => pattern.test(name))?.[1] ?? null;
}

function messageFrom(error: unknown): string {
    return error instanceof Error ? error.message : 'The request failed.';
}

async function jsonRequest<T>(
    url: string,
    method: 'GET' | 'POST',
    body?: object,
): Promise<T> {
    const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            ...(method === 'POST'
                ? {
                      'Content-Type': 'application/json',
                      'X-CSRF-TOKEN': csrfToken(),
                  }
                : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message ?? 'The request failed.');
    }

    return data as T;
}

export default function LegacyExport({ history }: { history: Run[] }) {
    const legacyChoices = useRef(
        new Map<string, { classes: Item[]; subjects: Item[] }>(),
    );
    const [mode, setMode] = useState<Mode>('subject');
    const [catalog, setCatalog] = useState<Catalog | null>(null);
    const [patternId, setPatternId] = useState<number | null>(null);
    const [classId, setClassId] = useState<number | null>(null);
    const [subjectId, setSubjectId] = useState<number | null>(null);
    const [legacyAfaq, setLegacyAfaq] = useState<number | null>(3);
    const [legacyClassId, setLegacyClassId] = useState<number | null>(null);
    const [legacySubjectId, setLegacySubjectId] = useState<number | null>(null);
    const [ids, setIds] = useState<number[]>([]);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(50);
    const [chapterFilterId, setChapterFilterId] = useState<number | null>(null);
    const [topicFilterId, setTopicFilterId] = useState<number | null>(null);
    const [typeFilterId, setTypeFilterId] = useState<number | null>(null);
    const [replaceExisting, setReplaceExisting] = useState(false);
    const [search, setSearch] = useState('');
    const [preview, setPreview] = useState<Preview | null>(null);
    const [report, setReport] = useState<Report | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(false);
    const [runs, setRuns] = useState(history);

    useEffect(() => {
        if (mode === 'history') {
            return;
        }

        let active = true;
        const params = new URLSearchParams();
        const legacyKey = `${legacyAfaq ?? 'none'}:${legacyClassId ?? 'none'}`;
        const cachedLegacy = legacyChoices.current.get(legacyKey);
        params.set('mode', mode);
        params.set('include_legacy', cachedLegacy ? '0' : '1');

        if (legacyAfaq !== null) {
            params.set('afaq', String(legacyAfaq));
        }

        if (legacyClassId !== null) {
            params.set('legacy_class_id', String(legacyClassId));
        }

        if (patternId) {
            params.set('pattern_id', String(patternId));
        }

        if (classId) {
            params.set('class_id', String(classId));
        }

        if (subjectId) {
            params.set('subject_id', String(subjectId));
        }

        params.set('page', String(page));
        params.set('per_page', String(perPage));

        if ((mode === 'questions' || mode === 'topics') && chapterFilterId) {
            params.set('chapter_id', String(chapterFilterId));
        }

        if (mode === 'questions' && topicFilterId) {
            params.set('topic_id', String(topicFilterId));
        }

        if (mode === 'questions' && typeFilterId) {
            params.set('question_type_id', String(typeFilterId));
        }

        setLoading(true);
        jsonRequest<Catalog>(
            `/superadmin/legacy-export/catalog?${params}`,
            'GET',
        )
            .then((data) => {
                if (active) {
                    const choices = cachedLegacy ?? {
                        classes: data.legacy_classes,
                        subjects: data.legacy_subjects,
                    };
                    legacyChoices.current.set(legacyKey, choices);
                    setCatalog({
                        ...data,
                        legacy_classes: choices.classes,
                        legacy_subjects: choices.subjects,
                    });
                }
            })
            .catch((cause) => {
                if (active) {
                    setError(messageFrom(cause));
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [
        patternId,
        classId,
        subjectId,
        legacyAfaq,
        legacyClassId,
        page,
        perPage,
        mode,
        chapterFilterId,
        topicFilterId,
        typeFilterId,
    ]);

    const entries = useMemo<
        { id: number; label: string; hint?: string; group?: string }[]
    >(() => {
        if (!catalog) {
            return [];
        }

        if (mode === 'chapters') {
            return catalog.chapters.map((item) => ({
                id: item.id,
                label: `${item.chapter_number ?? '—'}. ${item.name}`,
            }));
        }

        if (mode === 'topics') {
            return catalog.topics
                .filter(
                    (item) =>
                        !chapterFilterId || item.chapter_id === chapterFilterId,
                )
                .map((item) => ({
                    id: item.id,
                    label: item.name,
                    group:
                        catalog.chapters.find(
                            (chapter) => chapter.id === item.chapter_id,
                        )?.name ?? 'Chapter',
                }));
        }

        if (mode === 'question_types') {
            return catalog.question_types.map((item) => ({
                id: item.id,
                label: item.name,
                hint: item.schema_key ?? undefined,
            }));
        }

        if (mode === 'questions') {
            return (catalog.questions?.data ?? []).map((item) => ({
                id: item.id,
                label: `#${item.id} ${(
                    item.statement_en ||
                    item.statement_ur ||
                    ''
                )
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, 220)}`,
                hint: `${catalog.chapters.find((chapter) => chapter.id === item.chapter_id)?.name ?? 'Chapter'} · ${catalog.topics.find((topic) => topic.id === item.topic_id)?.name ?? 'No topic'} · ${catalog.question_types.find((type) => type.id === item.question_type_id)?.name ?? 'Question'}`,
            }));
        }

        return [];
    }, [catalog, mode, chapterFilterId]);
    const visible = entries.filter((item) =>
        `${item.label} ${item.hint ?? ''}`
            .toLowerCase()
            .includes(search.toLowerCase()),
    );
    const selected = useMemo(() => new Set(ids), [ids]);
    const selection = {
        mode,
        pattern_id: patternId,
        class_id: classId,
        subject_id: subjectId,
        legacy_afaq: legacyAfaq,
        legacy_class_id: legacyClassId,
        legacy_subject_id: legacySubjectId,
        ids,
        replace_existing: replaceExisting,
    };
    const canPreview =
        mode !== 'history' &&
        patternId !== null &&
        classId !== null &&
        subjectId !== null &&
        legacyAfaq !== null &&
        legacyClassId !== null &&
        legacySubjectId !== null &&
        (mode === 'subject' || ids.length > 0);

    const clearPreview = () => {
        setPreview(null);
        setReport(null);
        setError('');
    };
    const changeMode = (value: Mode) => {
        setMode(value);
        setIds([]);
        setSearch('');
        setChapterFilterId(null);
        setTopicFilterId(null);
        setTypeFilterId(null);
        setPage(1);
        clearPreview();
    };
    const toggle = (id: number, checked: boolean) => {
        setIds((current) =>
            checked
                ? [...new Set([...current, id])]
                : current.filter((value) => value !== id),
        );
        clearPreview();
    };
    const runPreview = async () => {
        if (!canPreview) {
            return;
        }

        setBusy(true);
        setError('');
        setReport(null);

        try {
            setPreview(
                await jsonRequest<Preview>(
                    '/superadmin/legacy-export/preview',
                    'POST',
                    selection,
                ),
            );
        } catch (cause) {
            setError(messageFrom(cause));
        } finally {
            setBusy(false);
        }
    };
    const runExport = async () => {
        if (!preview || busy) {
            return;
        }

        setBusy(true);
        setError('');

        try {
            const result = await jsonRequest<{ report: Report }>(
                '/superadmin/legacy-export',
                'POST',
                selection,
            );
            setReport(result.report);
            setPreview(null);
            setRuns((current) => [
                {
                    id: Date.now(),
                    mode,
                    created_at: new Date().toISOString(),
                    report: result.report,
                },
                ...current,
            ]);
        } catch (cause) {
            setError(messageFrom(cause));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="w-full space-y-5 p-4 md:p-6">
            <Head title="Export to Old TestMaker" />
            <div>
                <h1 className="text-2xl font-semibold">
                    Export to Old TestMaker
                </h1>
            </div>
            <div className="flex gap-1 overflow-x-auto border-b">
                {modes.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => changeMode(tab.key)}
                        className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm ${mode === tab.key ? 'border-primary font-semibold text-foreground' : 'border-transparent text-muted-foreground'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {mode === 'history' ? (
                <div className="overflow-hidden rounded-lg border">
                    {runs.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground">
                            No exports yet.
                        </p>
                    ) : (
                        runs.map((run) => (
                            <div
                                key={run.id}
                                className="border-b p-4 text-sm last:border-b-0"
                            >
                                <div className="font-medium">
                                    {run.mode.replace('_', ' ')} ·{' '}
                                    {new Date(run.created_at).toLocaleString()}
                                </div>
                                <div className="mt-1 text-muted-foreground">
                                    Created {run.report.created}, updated{' '}
                                    {run.report.updated}, matched{' '}
                                    {run.report.matched}, unchanged{' '}
                                    {run.report.unchanged}, skipped{' '}
                                    {run.report.skipped}, conflicts{' '}
                                    {run.report.conflicts}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <>
                    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)]">
                        <div className="min-w-0 space-y-4">
                            <section className="space-y-4 rounded-lg border p-4">
                                <h2 className="text-sm font-semibold">
                                    Source · New TestMaker
                                </h2>
                                <FloatingCombobox
                                    label="Pattern"
                                    options={options(catalog?.patterns ?? [])}
                                    value={choice(
                                        options(catalog?.patterns ?? []),
                                        patternId,
                                    )}
                                    onChange={(item) => {
                                        setPatternId(
                                            item ? Number(item.id) : null,
                                        );
                                        setClassId(null);
                                        setSubjectId(null);
                                        setLegacyAfaq(
                                            item
                                                ? matchingLegacyPattern(
                                                      item.label,
                                                  )
                                                : null,
                                        );
                                        setLegacyClassId(null);
                                        setLegacySubjectId(null);
                                        setCatalog((current) =>
                                            current
                                                ? {
                                                      ...current,
                                                      legacy_classes: [],
                                                      legacy_subjects: [],
                                                  }
                                                : current,
                                        );
                                        setIds([]);
                                        clearPreview();
                                    }}
                                />
                                <FloatingCombobox
                                    label="Class"
                                    disabled={!patternId}
                                    options={options(catalog?.classes ?? [])}
                                    value={choice(
                                        options(catalog?.classes ?? []),
                                        classId,
                                    )}
                                    onChange={(item) => {
                                        setClassId(
                                            item ? Number(item.id) : null,
                                        );
                                        setSubjectId(null);
                                        setIds([]);
                                        clearPreview();
                                    }}
                                />
                                <FloatingCombobox
                                    label="Subject"
                                    disabled={!classId}
                                    options={options(
                                        (catalog?.subjects ?? []).map(
                                            (item) => ({
                                                ...item,
                                                name: `${item.name_eng}${item.name_ur ? ` · ${item.name_ur}` : ''}`,
                                            }),
                                        ),
                                    )}
                                    value={choice(
                                        options(
                                            (catalog?.subjects ?? []).map(
                                                (item) => ({
                                                    ...item,
                                                    name: `${item.name_eng}${item.name_ur ? ` · ${item.name_ur}` : ''}`,
                                                }),
                                            ),
                                        ),
                                        subjectId,
                                    )}
                                    onChange={(item) => {
                                        setSubjectId(
                                            item ? Number(item.id) : null,
                                        );
                                        setIds([]);
                                        setPage(1);
                                        clearPreview();
                                    }}
                                />
                            </section>
                            {mode !== 'subject' && subjectId && (
                                <section className="rounded-lg border p-4">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                        <h2 className="font-semibold">
                                            Select {mode.replace('_', ' ')}{' '}
                                            <span className="text-sm font-normal text-muted-foreground">
                                                ({ids.length} selected)
                                            </span>
                                        </h2>
                                        <input
                                            aria-label="Search list"
                                            value={search}
                                            onChange={(event) =>
                                                setSearch(event.target.value)
                                            }
                                            placeholder="Search this list"
                                            className="h-9 rounded-md border bg-background px-3 text-sm"
                                        />
                                    </div>
                                    {mode === 'topics' && (
                                        <div className="mb-3">
                                            <FloatingCombobox
                                                label="Chapter"
                                                options={options(
                                                    catalog?.chapters ?? [],
                                                )}
                                                value={choice(
                                                    options(
                                                        catalog?.chapters ?? [],
                                                    ),
                                                    chapterFilterId,
                                                )}
                                                onChange={(item) =>
                                                    setChapterFilterId(
                                                        item
                                                            ? Number(item.id)
                                                            : null,
                                                    )
                                                }
                                            />
                                        </div>
                                    )}
                                    {mode === 'questions' && (
                                        <div className="mb-3 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                                            <FloatingCombobox
                                                label="Chapter"
                                                options={options(
                                                    catalog?.chapters ?? [],
                                                )}
                                                value={choice(
                                                    options(
                                                        catalog?.chapters ?? [],
                                                    ),
                                                    chapterFilterId,
                                                )}
                                                onChange={(item) => {
                                                    setChapterFilterId(
                                                        item
                                                            ? Number(item.id)
                                                            : null,
                                                    );
                                                    setTopicFilterId(null);
                                                    setPage(1);
                                                }}
                                            />
                                            <FloatingCombobox
                                                label="Topic"
                                                options={options(
                                                    (
                                                        catalog?.topics ?? []
                                                    ).filter(
                                                        (topic) =>
                                                            !chapterFilterId ||
                                                            topic.chapter_id ===
                                                                chapterFilterId,
                                                    ),
                                                )}
                                                value={choice(
                                                    options(
                                                        (
                                                            catalog?.topics ??
                                                            []
                                                        ).filter(
                                                            (topic) =>
                                                                !chapterFilterId ||
                                                                topic.chapter_id ===
                                                                    chapterFilterId,
                                                        ),
                                                    ),
                                                    topicFilterId,
                                                )}
                                                onChange={(item) => {
                                                    setTopicFilterId(
                                                        item
                                                            ? Number(item.id)
                                                            : null,
                                                    );
                                                    setPage(1);
                                                }}
                                            />
                                            <FloatingCombobox
                                                label="Question type"
                                                options={options(
                                                    catalog?.question_types ??
                                                        [],
                                                )}
                                                value={choice(
                                                    options(
                                                        catalog?.question_types ??
                                                            [],
                                                    ),
                                                    typeFilterId,
                                                )}
                                                onChange={(item) => {
                                                    setTypeFilterId(
                                                        item
                                                            ? Number(item.id)
                                                            : null,
                                                    );
                                                    setPage(1);
                                                }}
                                            />
                                            <FloatingCombobox
                                                label="Rows"
                                                options={[50, 100, 200].map(
                                                    (value) => ({
                                                        id: value,
                                                        label: String(value),
                                                    }),
                                                )}
                                                value={{
                                                    id: perPage,
                                                    label: String(perPage),
                                                }}
                                                onChange={(item) => {
                                                    setPerPage(
                                                        item
                                                            ? Number(item.id)
                                                            : 50,
                                                    );
                                                    setPage(1);
                                                }}
                                            />
                                        </div>
                                    )}
                                    <div className="mb-3 flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setIds((current) => [
                                                    ...new Set([
                                                        ...current,
                                                        ...visible.map(
                                                            (item) => item.id,
                                                        ),
                                                    ]),
                                                ]);
                                                clearPreview();
                                            }}
                                        >
                                            Select visible
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setIds([]);
                                                clearPreview();
                                            }}
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                    <div className="max-h-96 space-y-1 overflow-y-auto">
                                        {visible.map((item, index) => (
                                            <div key={item.id}>
                                                {item.group &&
                                                    item.group !==
                                                        visible[index - 1]
                                                            ?.group && (
                                                        <div className="border-b px-2 py-2 text-xs font-semibold text-muted-foreground">
                                                            {item.group}
                                                        </div>
                                                    )}
                                                <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                                                    <Checkbox
                                                        checked={selected.has(
                                                            item.id,
                                                        )}
                                                        onCheckedChange={(
                                                            value,
                                                        ) =>
                                                            toggle(
                                                                item.id,
                                                                value === true,
                                                            )
                                                        }
                                                    />
                                                    <span className="min-w-0 text-sm">
                                                        <span className="block break-words">
                                                            {item.label}
                                                        </span>
                                                        {item.hint && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {item.hint}
                                                            </span>
                                                        )}
                                                    </span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    {mode === 'questions' &&
                                        catalog?.questions && (
                                            <div className="mt-4 flex items-center justify-between text-sm">
                                                <span>
                                                    Page{' '}
                                                    {
                                                        catalog.questions
                                                            .current_page
                                                    }{' '}
                                                    of{' '}
                                                    {
                                                        catalog.questions
                                                            .last_page
                                                    }{' '}
                                                    · {catalog.questions.total}{' '}
                                                    questions
                                                </span>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={page <= 1}
                                                        onClick={() =>
                                                            setPage(page - 1)
                                                        }
                                                    >
                                                        Previous
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={
                                                            page >=
                                                            catalog.questions!
                                                                .last_page
                                                        }
                                                        onClick={() =>
                                                            setPage(page + 1)
                                                        }
                                                    >
                                                        Next
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                </section>
                            )}
                        </div>
                        <div className="flex items-center justify-center">
                            <span className="flex size-10 items-center justify-center rounded-full border">
                                <ArrowRightIcon className="size-5" />
                            </span>
                        </div>
                        <div className="min-w-0 space-y-4">
                            <section className="space-y-4 rounded-lg border p-4">
                                <h2 className="text-sm font-semibold">
                                    Target · Old TestMaker
                                </h2>
                                <FloatingCombobox
                                    label="Pattern"
                                    options={options(
                                        catalog?.legacy_patterns ?? [],
                                    )}
                                    value={choice(
                                        options(catalog?.legacy_patterns ?? []),
                                        legacyAfaq,
                                    )}
                                    onChange={(item) => {
                                        setLegacyAfaq(
                                            item ? Number(item.id) : null,
                                        );
                                        setLegacyClassId(null);
                                        setLegacySubjectId(null);
                                        setCatalog((current) =>
                                            current
                                                ? {
                                                      ...current,
                                                      legacy_classes: [],
                                                      legacy_subjects: [],
                                                  }
                                                : current,
                                        );
                                        clearPreview();
                                    }}
                                />
                                <FloatingCombobox
                                    label="Class"
                                    disabled={legacyAfaq === null || loading}
                                    options={options(
                                        catalog?.legacy_classes ?? [],
                                    )}
                                    value={choice(
                                        options(catalog?.legacy_classes ?? []),
                                        legacyClassId,
                                    )}
                                    onChange={(item) => {
                                        setLegacyClassId(
                                            item ? Number(item.id) : null,
                                        );
                                        setLegacySubjectId(null);
                                        setCatalog((current) =>
                                            current
                                                ? {
                                                      ...current,
                                                      legacy_subjects: [],
                                                  }
                                                : current,
                                        );
                                        clearPreview();
                                    }}
                                />
                                <FloatingCombobox
                                    label="Subject"
                                    disabled={legacyClassId === null || loading}
                                    wrapOptionLabels
                                    options={options(
                                        catalog?.legacy_subjects ?? [],
                                    )}
                                    value={choice(
                                        options(catalog?.legacy_subjects ?? []),
                                        legacySubjectId,
                                    )}
                                    onChange={(item) => {
                                        setLegacySubjectId(
                                            item ? Number(item.id) : null,
                                        );
                                        clearPreview();
                                    }}
                                />
                            </section>
                            <section className="flex items-center justify-between gap-3 rounded-lg border p-4">
                                <span className="text-sm font-medium">
                                    Replace matching old questions
                                </span>
                                <Switch
                                    checked={replaceExisting}
                                    onCheckedChange={(checked) => {
                                        setReplaceExisting(checked);
                                        clearPreview();
                                    }}
                                    aria-label="Replace matching old questions"
                                />
                            </section>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            type="button"
                            disabled={!canPreview || busy || loading}
                            onClick={runPreview}
                        >
                            {busy ? 'Working…' : 'Preview export'}
                        </Button>
                        {loading && (
                            <span className="text-sm text-muted-foreground">
                                Loading catalog…
                            </span>
                        )}
                    </div>
                    {error && (
                        <div
                            role="alert"
                            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                        >
                            {error}
                        </div>
                    )}
                    {preview && (
                        <section className="space-y-3 rounded-lg border p-4 text-sm">
                            <h2 className="font-semibold">Export preview</h2>
                            <p>
                                Destination: {preview.target.class} ·{' '}
                                {preview.target.subject} · pattern{' '}
                                {preview.target.pattern}
                            </p>
                            <p>
                                {preview.chapters} chapters in scope ·{' '}
                                {preview.ready} of {preview.total} questions
                                ready
                            </p>
                            <p>
                                Existing questions:{' '}
                                {preview.replace_existing
                                    ? 'replace matching records'
                                    : 'keep conflicting records'}
                            </p>
                            {Object.entries(preview.unsupported).map(
                                ([reason, count]) => (
                                    <p key={reason} className="text-amber-700">
                                        {count} skipped: {reason}
                                    </p>
                                ),
                            )}
                            <Button
                                type="button"
                                disabled={
                                    busy ||
                                    (preview.ready === 0 &&
                                        preview.chapters === 0)
                                }
                                onClick={runExport}
                            >
                                {busy
                                    ? 'Exporting…'
                                    : 'Export selected content'}
                            </Button>
                        </section>
                    )}
                    {report && (
                        <section
                            role="status"
                            className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-950"
                        >
                            <h2 className="font-semibold">Export finished</h2>
                            <p>
                                Questions: {report.questions_created} created,{' '}
                                {report.questions_updated} updated. Other items
                                included. Total created {report.created},
                                updated {report.updated}, matched{' '}
                                {report.matched}, unchanged {report.unchanged},
                                skipped {report.skipped}, conflicts{' '}
                                {report.conflicts}.
                            </p>
                            {report.errors.map((item, index) => (
                                <p key={index} className="text-red-800">
                                    {item}
                                </p>
                            ))}
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

LegacyExport.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Export to Old TestMaker', href: '/superadmin/legacy-export' },
    ],
};

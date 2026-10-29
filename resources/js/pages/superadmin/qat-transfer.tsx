import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
    Badge,
    Button,
    Card,
    Input,
    PageHeader,
    SearchInput,
} from '@/components/tm';
import { selectClass } from './qat-catalogue/shared';

const QatSyllabusEditor = lazy(
    () => import('@/components/qat-syllabus-editor'),
);

type Source = {
    id: number;
    name: string;
    classes: {
        class_id: number;
        class_name: string;
        subject_id: number;
        subject_name: string;
    }[];
};
type Chapter = {
    id: number;
    name: string;
    chapter_number: number | null;
    status: number;
    questions: {
        id: number;
        type: string;
        summary: string;
        status: number;
    }[];
};
type Report = {
    chapters: number;
    topics: number;
    questions: number;
    month_assignments: number;
};
type SyllabusDescriptionResponse = { description: string };
const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

export default function QatTransfer({
    sources,
    report,
}: {
    sources: Source[];
    report: Report | null;
}) {
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [expandedChapters, setExpandedChapters] = useState<number[]>([]);
    const [chapterSearch, setChapterSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [descriptionLoadedKey, setDescriptionLoadedKey] = useState('');
    const [descriptionErrorKey, setDescriptionErrorKey] = useState('');
    const [descriptionReload, setDescriptionReload] = useState(0);
    const editedDescriptionScope = useRef('');
    const { data, setData, transform, post, processing, errors } = useForm({
        academic_year: '2026-27',
        month: 4,
        description: '',
        source_pattern_id: 0,
        class_id: 0,
        subject_id: 0,
        chapter_ids: [] as number[],
        question_ids: [] as number[],
    });
    const source = sources.find((item) => item.id === data.source_pattern_id);
    const classes = useMemo(
        () =>
            Array.from(
                new Map(
                    source?.classes.map((item) => [
                        item.class_id,
                        item.class_name,
                    ]) ?? [],
                ),
            ),
        [source],
    );
    const subjects =
        source?.classes.filter((item) => item.class_id === data.class_id) ?? [];
    const descriptionScopeKey = `${data.academic_year}|${data.month}|${data.source_pattern_id}|${data.class_id}|${data.subject_id}`;
    const visibleChapters = useMemo(() => {
        const query = chapterSearch.trim().toLocaleLowerCase();

        if (!query) {
            return chapters;
        }

        return chapters.filter((chapter) =>
            chapter.name.toLocaleLowerCase().includes(query),
        );
    }, [chapters, chapterSearch]);

    useEffect(() => {
        if (!data.source_pattern_id || !data.class_id || !data.subject_id) {
            return;
        }

        const controller = new AbortController();
        const params = new URLSearchParams({
            source_pattern_id: String(data.source_pattern_id),
            class_id: String(data.class_id),
            subject_id: String(data.subject_id),
        });
        fetch(`/superadmin/qat-transfer/chapters?${params}`, {
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Could not load chapters');
                }

                return response.json() as Promise<Chapter[]>;
            })
            .then((items) => {
                setChapters(items);
                setLoadError(false);
            })
            .catch((error: Error) => {
                if (error.name !== 'AbortError') {
                    setChapters([]);
                    setLoadError(true);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [data.source_pattern_id, data.class_id, data.subject_id]);

    useEffect(() => {
        if (
            !/^20\d{2}-\d{2}$/.test(data.academic_year) ||
            !data.source_pattern_id ||
            !data.class_id ||
            !data.subject_id
        ) {
            return;
        }

        const controller = new AbortController();
        const params = new URLSearchParams({
            academic_year: data.academic_year,
            month: String(data.month),
            source_pattern_id: String(data.source_pattern_id),
            class_id: String(data.class_id),
            subject_id: String(data.subject_id),
        });
        fetch(`/superadmin/qat-transfer/syllabus-description?${params}`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Could not load the syllabus description.');
                }

                return response.json() as Promise<SyllabusDescriptionResponse>;
            })
            .then((result) => {
                if (!controller.signal.aborted) {
                    if (
                        editedDescriptionScope.current !== descriptionScopeKey
                    ) {
                        setData('description', result.description ?? '');
                    }

                    setDescriptionLoadedKey(descriptionScopeKey);
                    setDescriptionErrorKey('');
                }
            })
            .catch((error: Error) => {
                if (error.name !== 'AbortError') {
                    setDescriptionErrorKey(descriptionScopeKey);
                }
            });

        return () => controller.abort();
    }, [
        data.academic_year,
        data.month,
        data.source_pattern_id,
        data.class_id,
        data.subject_id,
        descriptionScopeKey,
        descriptionReload,
        setData,
    ]);

    const resetScope = (patternId: number, classId = 0, subjectId = 0) => {
        setChapters([]);
        setExpandedChapters([]);
        setChapterSearch('');
        setLoading(subjectId > 0);
        setLoadError(false);
        setDescriptionLoadedKey('');
        setDescriptionErrorKey('');
        editedDescriptionScope.current = '';
        setData((current) => ({
            ...current,
            source_pattern_id: patternId,
            class_id: classId,
            subject_id: subjectId,
            description: '',
            chapter_ids: [],
            question_ids: [],
        }));
    };
    const toggleChapter = (chapter: Chapter) => {
        setData((current) => {
            const selected = current.chapter_ids.includes(chapter.id);
            const chapterQuestionIds = new Set(
                chapter.questions.map((question) => question.id),
            );

            return {
                ...current,
                chapter_ids: selected
                    ? current.chapter_ids.filter((id) => id !== chapter.id)
                    : [...current.chapter_ids, chapter.id],
                question_ids: selected
                    ? current.question_ids.filter(
                          (id) => !chapterQuestionIds.has(id),
                      )
                    : [
                          ...new Set([
                              ...current.question_ids,
                              ...chapterQuestionIds,
                          ]),
                      ],
            };
        });
    };
    const toggleQuestion = (id: number) => {
        setData(
            'question_ids',
            data.question_ids.includes(id)
                ? data.question_ids.filter((item) => item !== id)
                : [...data.question_ids, id],
        );
    };
    const toggleAllQuestions = (chapter: Chapter) => {
        const ids = chapter.questions.map((question) => question.id);
        const allSelected = ids.every((id) => data.question_ids.includes(id));
        setData(
            'question_ids',
            allSelected
                ? data.question_ids.filter((id) => !ids.includes(id))
                : [...new Set([...data.question_ids, ...ids])],
        );
    };
    const selectAllChapters = (checked: boolean) => {
        const visibleIds = new Set(
            visibleChapters.map((chapter) => chapter.id),
        );
        const visibleQuestionIds = new Set(
            visibleChapters.flatMap((chapter) =>
                chapter.questions.map((question) => question.id),
            ),
        );
        setData((current) => ({
            ...current,
            chapter_ids: checked
                ? [...new Set([...current.chapter_ids, ...visibleIds])]
                : current.chapter_ids.filter((id) => !visibleIds.has(id)),
            question_ids: checked
                ? [...new Set([...current.question_ids, ...visibleQuestionIds])]
                : current.question_ids.filter(
                      (id) => !visibleQuestionIds.has(id),
                  ),
        }));
    };

    return (
        <div className="w-full min-w-0 space-y-5 p-4 md:p-6">
            <Head title="QAT Transfer" />
            <PageHeader
                title="QAT Transfer"
                meta={`${sources.length} source patterns`}
                actions={
                    <Button asChild>
                        <Link href="/superadmin/qat-catalogue">
                            View QAT Data
                        </Link>
                    </Button>
                }
            />
            {report && (
                <Card
                    padding="sm"
                    className="flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
                >
                    <Badge tone="saved">Transfer complete</Badge>{' '}
                    {report.chapters} chapters, {report.topics} topics,{' '}
                    {report.questions} questions and {report.month_assignments}{' '}
                    month assignments added.
                </Card>
            )}
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    transform((values) => {
                        if (
                            descriptionLoadedKey === descriptionScopeKey ||
                            editedDescriptionScope.current ===
                                descriptionScopeKey
                        ) {
                            return values;
                        }

                        const payload: Partial<typeof values> = { ...values };
                        delete payload.description;

                        return payload;
                    });
                    post('/superadmin/qat-transfer');
                }}
            >
                <Card padding="lg" className="space-y-5">
                    <h2 className="text-lg font-semibold">
                        Transfer from existing catalogue
                    </h2>
                    <div className="grid gap-4 md:grid-cols-3">
                        <label className="space-y-1 text-sm">
                            Academic year
                            <Input
                                value={data.academic_year}
                                pattern="20[0-9]{2}-[0-9]{2}"
                                placeholder="2026-27"
                                onChange={(event) => {
                                    setDescriptionLoadedKey('');
                                    setDescriptionErrorKey('');
                                    editedDescriptionScope.current = '';
                                    setData((current) => ({
                                        ...current,
                                        academic_year: event.target.value,
                                        description: '',
                                    }));
                                }}
                            />
                            {errors.academic_year && (
                                <span className="text-red-600">
                                    {errors.academic_year}
                                </span>
                            )}
                        </label>
                        <label className="space-y-1 text-sm">
                            Month
                            <select
                                className={selectClass}
                                value={data.month}
                                onChange={(event) => {
                                    setDescriptionLoadedKey('');
                                    setDescriptionErrorKey('');
                                    editedDescriptionScope.current = '';
                                    setData((current) => ({
                                        ...current,
                                        month: Number(event.target.value),
                                        description: '',
                                    }));
                                }}
                            >
                                {MONTHS.map((month, index) => (
                                    <option key={month} value={index + 1}>
                                        {month}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="space-y-1 text-sm">
                            Source pattern
                            <select
                                className={selectClass}
                                value={data.source_pattern_id}
                                onChange={(event) =>
                                    resetScope(Number(event.target.value))
                                }
                            >
                                <option value={0}>Select pattern</option>
                                {sources.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="space-y-1 text-sm">
                            Class
                            <select
                                className={selectClass}
                                value={data.class_id}
                                onChange={(event) =>
                                    resetScope(
                                        data.source_pattern_id,
                                        Number(event.target.value),
                                    )
                                }
                            >
                                <option value={0}>Select class</option>
                                {classes.map(([id, name]) => (
                                    <option key={id} value={id}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="space-y-1 text-sm">
                            Subject
                            <select
                                className={selectClass}
                                value={data.subject_id}
                                onChange={(event) =>
                                    resetScope(
                                        data.source_pattern_id,
                                        data.class_id,
                                        Number(event.target.value),
                                    )
                                }
                            >
                                <option value={0}>Select subject</option>
                                {subjects.map((item) => (
                                    <option
                                        key={item.subject_id}
                                        value={item.subject_id}
                                    >
                                        {item.subject_name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div
                        className="space-y-2 text-sm"
                        role="group"
                        aria-labelledby="qat-syllabus-label"
                    >
                        <label
                            id="qat-syllabus-label"
                            htmlFor="qat-syllabus-description"
                        >
                            Syllabus description for {MONTHS[data.month - 1]}
                        </label>
                        <Suspense
                            fallback={
                                <div
                                    className="h-80 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
                                    aria-label="Loading syllabus editor"
                                />
                            }
                        >
                            <QatSyllabusEditor
                                key={descriptionScopeKey}
                                value={data.description}
                                onChange={(value) => {
                                    editedDescriptionScope.current =
                                        descriptionScopeKey;
                                    setData('description', value);
                                }}
                            />
                        </Suspense>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                            Shown to customers when they select this month for
                            this QAT book.
                        </span>
                        {errors.description && (
                            <span className="block text-sm text-red-600">
                                {errors.description}
                            </span>
                        )}
                    </div>
                    {descriptionErrorKey === descriptionScopeKey && (
                        <div className="flex items-center gap-2 text-sm text-red-600">
                            Could not load the existing description.
                            <button
                                type="button"
                                className="font-semibold underline"
                                onClick={() =>
                                    setDescriptionReload(
                                        (current) => current + 1,
                                    )
                                }
                            >
                                Retry
                            </button>
                        </div>
                    )}
                    {errors.subject_id && (
                        <p className="text-sm text-red-600">
                            {errors.subject_id}
                        </p>
                    )}
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="font-medium">
                                    Chapters and questions
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {loading
                                        ? 'Loading…'
                                        : `${data.chapter_ids.length} of ${chapters.length} chapters · ${data.question_ids.length} questions selected`}
                                </p>
                            </div>
                            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium dark:border-slate-700">
                                <input
                                    type="checkbox"
                                    className="accent-brand-600"
                                    checked={
                                        visibleChapters.length > 0 &&
                                        visibleChapters.every(
                                            (chapter) =>
                                                data.chapter_ids.includes(
                                                    chapter.id,
                                                ) &&
                                                chapter.questions.every(
                                                    (question) =>
                                                        data.question_ids.includes(
                                                            question.id,
                                                        ),
                                                ),
                                        )
                                    }
                                    disabled={
                                        !visibleChapters.length || loading
                                    }
                                    onChange={(event) =>
                                        selectAllChapters(event.target.checked)
                                    }
                                />
                                Select all visible
                            </label>
                        </div>
                        <SearchInput
                            className="w-full sm:max-w-sm"
                            value={chapterSearch}
                            onValueChange={setChapterSearch}
                            placeholder="Search chapters"
                            aria-label="Search chapters"
                        />
                        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                            {visibleChapters.map((chapter) => {
                                const included = data.chapter_ids.includes(
                                    chapter.id,
                                );
                                const selectedCount = chapter.questions.filter(
                                    (question) =>
                                        data.question_ids.includes(question.id),
                                ).length;
                                const expanded = expandedChapters.includes(
                                    chapter.id,
                                );

                                return (
                                    <div
                                        key={chapter.id}
                                        className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                                    >
                                        <div className="flex items-center gap-3 px-3 py-3">
                                            <input
                                                type="checkbox"
                                                className="size-4 shrink-0 accent-brand-600"
                                                aria-label={`Include ${chapter.name}`}
                                                checked={included}
                                                onChange={() =>
                                                    toggleChapter(chapter)
                                                }
                                            />
                                            <button
                                                type="button"
                                                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                                aria-expanded={expanded}
                                                onClick={() =>
                                                    setExpandedChapters(
                                                        (current) =>
                                                            expanded
                                                                ? current.filter(
                                                                      (id) =>
                                                                          id !==
                                                                          chapter.id,
                                                                  )
                                                                : [
                                                                      ...current,
                                                                      chapter.id,
                                                                  ],
                                                    )
                                                }
                                            >
                                                {expanded ? (
                                                    <ChevronDownIcon className="size-4 shrink-0 text-slate-500" />
                                                ) : (
                                                    <ChevronRightIcon className="size-4 shrink-0 text-slate-500" />
                                                )}
                                                <span className="min-w-0 truncate text-sm font-medium">
                                                    {chapter.name}
                                                </span>
                                                {!chapter.status && (
                                                    <Badge tone="neutral">
                                                        Inactive
                                                    </Badge>
                                                )}
                                            </button>
                                            <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                                                {selectedCount}/
                                                {chapter.questions.length}{' '}
                                                questions
                                            </span>
                                        </div>
                                        {expanded && (
                                            <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-700">
                                                <div className="mb-2 flex items-center justify-between gap-2">
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                                        Select the questions to
                                                        copy
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={
                                                            !included ||
                                                            !chapter.questions
                                                                .length
                                                        }
                                                        onClick={() =>
                                                            toggleAllQuestions(
                                                                chapter,
                                                            )
                                                        }
                                                    >
                                                        {selectedCount ===
                                                        chapter.questions.length
                                                            ? 'Clear questions'
                                                            : 'Select all questions'}
                                                    </Button>
                                                </div>
                                                <div className="max-h-64 space-y-1 overflow-y-auto">
                                                    {chapter.questions.map(
                                                        (question) => (
                                                            <label
                                                                key={
                                                                    question.id
                                                                }
                                                                className={`flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60 ${included ? '' : 'opacity-50'}`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    className="mt-0.5 size-4 shrink-0 accent-brand-600"
                                                                    checked={data.question_ids.includes(
                                                                        question.id,
                                                                    )}
                                                                    disabled={
                                                                        !included
                                                                    }
                                                                    onChange={() =>
                                                                        toggleQuestion(
                                                                            question.id,
                                                                        )
                                                                    }
                                                                />
                                                                <span className="min-w-0 flex-1 break-words">
                                                                    {
                                                                        question.summary
                                                                    }
                                                                </span>
                                                                <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                                    {
                                                                        question.type
                                                                    }
                                                                </span>
                                                                {!question.status && (
                                                                    <Badge tone="neutral">
                                                                        Inactive
                                                                    </Badge>
                                                                )}
                                                            </label>
                                                        ),
                                                    )}
                                                    {!chapter.questions
                                                        .length && (
                                                        <p className="px-2 py-2 text-sm text-slate-500">
                                                            No questions in this
                                                            chapter.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {!chapters.length && (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {loadError
                                        ? 'Could not load chapters and questions. Select the subject again to retry.'
                                        : 'Select a source subject to see chapters and questions.'}
                                </p>
                            )}
                            {chapters.length > 0 && !visibleChapters.length && (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    No chapters match your search.
                                </p>
                            )}
                        </div>
                        {errors.chapter_ids && (
                            <p className="text-sm text-red-600">
                                {errors.chapter_ids}
                            </p>
                        )}
                        {errors.question_ids && (
                            <p className="text-sm text-red-600">
                                {errors.question_ids}
                            </p>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        The selected month is linked to each included chapter.
                        Only checked questions are copied. Existing copies are
                        not refreshed, so you can transfer more questions later.
                    </p>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={processing || !data.chapter_ids.length}
                    >
                        {processing ? 'Transferring…' : 'Copy to QAT'}
                    </Button>
                </Card>
            </form>
        </div>
    );
}

QatTransfer.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'QAT Tests', href: '/superadmin/qat-catalogue' },
        { title: 'QAT Transfer', href: '/superadmin/qat-transfer' },
    ],
};

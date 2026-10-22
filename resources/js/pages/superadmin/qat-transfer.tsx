import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Input, PageHeader } from '@/components/tm';
import { selectClass } from './qat-catalogue/shared';

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
};
type Report = {
    chapters: number;
    topics: number;
    questions: number;
    month_assignments: number;
};
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
    const [loading, setLoading] = useState(false);
    const { data, setData, post, processing, errors } = useForm({
        academic_year: '2026-27',
        month: 4,
        source_pattern_id: 0,
        class_id: 0,
        subject_id: 0,
        chapter_ids: [] as number[],
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
            .then(setChapters)
            .catch((error: Error) => {
                if (error.name !== 'AbortError') {
                    setChapters([]);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [data.source_pattern_id, data.class_id, data.subject_id]);

    const resetScope = (patternId: number, classId = 0, subjectId = 0) => {
        setChapters([]);
        setLoading(subjectId > 0);
        setData((current) => ({
            ...current,
            source_pattern_id: patternId,
            class_id: classId,
            subject_id: subjectId,
            chapter_ids: [],
        }));
    };
    const toggleChapter = (id: number) => {
        setData(
            'chapter_ids',
            data.chapter_ids.includes(id)
                ? data.chapter_ids.filter((item) => item !== id)
                : [...data.chapter_ids, id],
        );
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
                                onChange={(event) =>
                                    setData('academic_year', event.target.value)
                                }
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
                                onChange={(event) =>
                                    setData('month', Number(event.target.value))
                                }
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
                    {errors.subject_id && (
                        <p className="text-sm text-red-600">
                            {errors.subject_id}
                        </p>
                    )}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium">
                                Chapters{' '}
                                {loading
                                    ? '— loading…'
                                    : `(${chapters.length})`}
                            </h3>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    setData(
                                        'chapter_ids',
                                        chapters.map((chapter) => chapter.id),
                                    )
                                }
                            >
                                Select all
                            </Button>
                        </div>
                        <div className="grid max-h-64 gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40 md:grid-cols-2">
                            {chapters.map((chapter) => (
                                <label
                                    key={chapter.id}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        className="accent-brand-600"
                                        checked={data.chapter_ids.includes(
                                            chapter.id,
                                        )}
                                        onChange={() =>
                                            toggleChapter(chapter.id)
                                        }
                                    />
                                    {chapter.name}
                                    {!chapter.status && ' (inactive)'}
                                </label>
                            ))}
                            {!chapters.length && (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Select a source subject to see chapters.
                                </p>
                            )}
                        </div>
                        {errors.chapter_ids && (
                            <p className="text-sm text-red-600">
                                {errors.chapter_ids}
                            </p>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        The selected month is linked to each selected chapter.
                        Transfer another month to add more coverage without
                        copying the same questions again. Existing copies are
                        not refreshed.
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

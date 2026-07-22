import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertTriangleIcon,
    ArrowRightIcon,
    DatabaseIcon,
    RefreshCwIcon,
    SearchIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface SourcePattern {
    key: string;
    label: string;
    afaq: number;
}

interface SourceClass {
    id: number;
    name: string;
    subjects_count: number;
    chapters_count: number;
}

interface SourceSubject {
    id: number;
    name: string;
    subject_type: 'chapter-wise' | 'topic-wise';
    chapters_count: number;
    topics_count: number;
    questions_count: number;
}

interface TargetPattern {
    id: number;
    name: string;
    short_name: string | null;
}

interface TargetClass {
    id: number;
    name: string;
}

interface TargetCatalog {
    patterns: TargetPattern[];
    classes: TargetClass[];
    subjects: Array<{
        id: number;
        name_eng: string;
        subject_type: string;
    }>;
}

interface TransferReport {
    pattern: { id: number; name: string; short_name: string | null };
    class: { id: number; name: string };
    subjects: Array<{
        id: number;
        name: string;
        chapters: number;
        topics: number;
        questions: number;
        options: number;
        question_types: number;
    }>;
    totals: {
        subjects: number;
        chapters: number;
        topics: number;
        questions: number;
        options: number;
        question_types: number;
    };
}

interface TransferForm {
    source_pattern: string;
    source_class_id: string;
    source_subject_ids: string[];
    target_pattern_id: string;
    target_pattern_name: string;
    target_pattern_short_name: string;
    target_class_id: string;
    target_class_name: string;
    replace_existing: boolean;
    [key: string]: boolean | string | string[];
}

function numberFormat(value: number) {
    return new Intl.NumberFormat('en-US').format(value);
}

function Stat({
    label,
    value,
}: {
    label: string;
    value: number | string;
}) {
    return (
        <div className="rounded-lg border px-3 py-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold">{value}</p>
        </div>
    );
}

export default function DataTransfer({
    sourcePatterns,
    sourceClasses: initialSourceClasses,
    targetCatalog: initialTargetCatalog,
    defaults,
    report,
    transferError,
}: {
    sourcePatterns: SourcePattern[];
    sourceClasses: SourceClass[];
    targetCatalog: TargetCatalog;
    defaults: {
        source_pattern: string;
        source_class_id: string;
        source_subject_ids: string[];
        target_pattern_name: string;
        target_pattern_short_name: string;
        target_class_name: string;
        replace_existing: boolean;
    };
    report: TransferReport | null;
    transferError: string | null;
}) {
    const form = useForm<TransferForm>({
        source_pattern: defaults.source_pattern,
        source_class_id: defaults.source_class_id,
        source_subject_ids: defaults.source_subject_ids,
        target_pattern_id: '',
        target_pattern_name: defaults.target_pattern_name,
        target_pattern_short_name: defaults.target_pattern_short_name,
        target_class_id: '',
        target_class_name: defaults.target_class_name,
        replace_existing: defaults.replace_existing,
    });
    const [sourceClasses, setSourceClasses] = useState(initialSourceClasses);
    const [sourceSubjects, setSourceSubjects] = useState<SourceSubject[]>([]);
    const [targetCatalog, setTargetCatalog] = useState(initialTargetCatalog);
    const [loadingCatalog, setLoadingCatalog] = useState(false);
    const [subjectSearch, setSubjectSearch] = useState('');
    const selectedSubjects = useMemo(
        () =>
            sourceSubjects.filter((subject) =>
                form.data.source_subject_ids.includes(String(subject.id)),
            ),
        [form.data.source_subject_ids, sourceSubjects],
    );
    const filteredSubjects = useMemo(() => {
        const q = subjectSearch.toLowerCase().trim();

        return sourceSubjects.filter(
            (subject) =>
                !q ||
                subject.name.toLowerCase().includes(q) ||
                String(subject.id).includes(q),
        );
    }, [sourceSubjects, subjectSearch]);
    const selectedTotals = useMemo(
        () =>
            selectedSubjects.reduce(
                (totals, subject) => ({
                    chapters: totals.chapters + subject.chapters_count,
                    topics: totals.topics + subject.topics_count,
                    questions: totals.questions + subject.questions_count,
                }),
                { chapters: 0, topics: 0, questions: 0 },
            ),
        [selectedSubjects],
    );

    useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams({
            source_pattern: form.data.source_pattern,
            source_class_id: form.data.source_class_id,
        });

        setLoadingCatalog(true);
        fetch(`/superadmin/data-transfer/catalog?${params.toString()}`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
        })
            .then((response) => response.json())
            .then((data) => {
                setSourceClasses(data.source_classes ?? []);
                setSourceSubjects(data.source_subjects ?? []);
                setTargetCatalog(data.target_catalog ?? initialTargetCatalog);
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    setSourceSubjects([]);
                }
            })
            .finally(() => setLoadingCatalog(false));

        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.data.source_pattern, form.data.source_class_id]);

    const toggleSubject = (subjectId: number, checked: boolean) => {
        const value = String(subjectId);
        const next = checked
            ? Array.from(new Set([...form.data.source_subject_ids, value]))
            : form.data.source_subject_ids.filter((id) => id !== value);

        form.setData('source_subject_ids', next);
    };

    const selectInitialFour = () => {
        form.setData('source_subject_ids', ['120', '122', '116', '123']);
    };

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post('/superadmin/data-transfer', {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Data Transfer" />
            <div className="space-y-5 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="h1-semibold">Data Transfer</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Copy legacy class and subject content into the new schema.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={loadingCatalog}
                        onClick={() => router.reload({ only: ['targetCatalog'] })}
                    >
                        <RefreshCwIcon className="size-4" />
                        Refresh
                    </Button>
                </div>

                {transferError ? (
                    <Alert variant="destructive">
                        <AlertTriangleIcon className="size-4" />
                        <AlertTitle>Transfer failed</AlertTitle>
                        <AlertDescription>{transferError}</AlertDescription>
                    </Alert>
                ) : null}

                {report ? (
                    <div className="space-y-3 rounded-lg border p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">Completed</Badge>
                            <span className="text-sm font-medium">
                                {report.pattern.name} / {report.class.name}
                            </span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            <Stat label="Subjects" value={report.totals.subjects} />
                            <Stat label="Chapters" value={report.totals.chapters} />
                            <Stat label="Topics" value={report.totals.topics} />
                            <Stat label="Questions" value={numberFormat(report.totals.questions)} />
                            <Stat label="Options" value={numberFormat(report.totals.options)} />
                            <Stat label="Question Types" value={report.totals.question_types} />
                        </div>
                    </div>
                ) : null}

                <form onSubmit={submit} className="space-y-5">
                    <div className="grid gap-5 xl:grid-cols-[1fr_auto_1fr]">
                        <section className="space-y-4 rounded-lg border p-4">
                            <div className="flex items-center gap-2">
                                <DatabaseIcon className="size-4 text-muted-foreground" />
                                <h2 className="text-sm font-semibold">Copy From</h2>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label>Pattern</Label>
                                    <Select
                                        value={form.data.source_pattern}
                                        onValueChange={(value) => {
                                            form.setData('source_pattern', value);
                                            form.setData('source_subject_ids', []);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sourcePatterns.map((pattern) => (
                                                <SelectItem key={pattern.key} value={pattern.key}>
                                                    {pattern.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label>Class</Label>
                                    <Select
                                        value={form.data.source_class_id}
                                        onValueChange={(value) => {
                                            form.setData('source_class_id', value);
                                            form.setData('source_subject_ids', []);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select class" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sourceClasses.map((schoolClass) => (
                                                <SelectItem key={schoolClass.id} value={String(schoolClass.id)}>
                                                    {schoolClass.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <Label>Subjects</Label>
                                    <Button type="button" size="sm" variant="outline" onClick={selectInitialFour}>
                                        Select initial 4
                                    </Button>
                                </div>
                                <div className="relative">
                                    <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={subjectSearch}
                                        onChange={(event) => setSubjectSearch(event.target.value)}
                                        placeholder="Search source subjects"
                                        className="pl-9"
                                    />
                                </div>
                                <div className="max-h-[380px] divide-y overflow-y-auto rounded-lg border">
                                    {loadingCatalog ? (
                                        <div className="p-4 text-sm text-muted-foreground">Loading subjects...</div>
                                    ) : filteredSubjects.length === 0 ? (
                                        <div className="p-4 text-sm text-muted-foreground">No source subjects found.</div>
                                    ) : (
                                        filteredSubjects.map((subject) => {
                                            const checked = form.data.source_subject_ids.includes(String(subject.id));

                                            return (
                                                <label
                                                    key={subject.id}
                                                    className="flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-accent/50"
                                                >
                                                    <Checkbox
                                                        checked={checked}
                                                        onCheckedChange={(value) => toggleSubject(subject.id, value === true)}
                                                    />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-medium">
                                                            {subject.name}
                                                        </span>
                                                        <span className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                            <span>ID {subject.id}</span>
                                                            <span>{subject.subject_type}</span>
                                                            <span>{subject.chapters_count} chapters</span>
                                                            <span>{subject.topics_count} topics</span>
                                                            <span>{numberFormat(subject.questions_count)} questions</span>
                                                        </span>
                                                    </span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </section>

                        <div className="hidden items-center justify-center xl:flex">
                            <span className="flex size-10 items-center justify-center rounded-full border bg-background">
                                <ArrowRightIcon className="size-5 text-muted-foreground" />
                            </span>
                        </div>

                        <section className="space-y-4 rounded-lg border p-4">
                            <div className="flex items-center gap-2">
                                <DatabaseIcon className="size-4 text-muted-foreground" />
                                <h2 className="text-sm font-semibold">Copy To</h2>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Target Pattern</Label>
                                <Select
                                    value={form.data.target_pattern_id || 'new'}
                                    onValueChange={(value) => form.setData('target_pattern_id', value === 'new' ? '' : value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new">Create or use by name</SelectItem>
                                        {targetCatalog.patterns.map((pattern) => (
                                            <SelectItem key={pattern.id} value={String(pattern.id)}>
                                                {pattern.short_name ? `${pattern.short_name} / ${pattern.name}` : pattern.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {!form.data.target_pattern_id ? (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label>Pattern Name</Label>
                                        <Input
                                            value={form.data.target_pattern_name}
                                            onChange={(event) => form.setData('target_pattern_name', event.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Short Name</Label>
                                        <Input
                                            value={form.data.target_pattern_short_name}
                                            onChange={(event) => form.setData('target_pattern_short_name', event.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : null}

                            <div className="space-y-1.5">
                                <Label>Target Class</Label>
                                <Select
                                    value={form.data.target_class_id || 'new'}
                                    onValueChange={(value) => form.setData('target_class_id', value === 'new' ? '' : value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new">Create or use by name</SelectItem>
                                        {targetCatalog.classes.map((schoolClass) => (
                                            <SelectItem key={schoolClass.id} value={String(schoolClass.id)}>
                                                {schoolClass.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {!form.data.target_class_id ? (
                                <div className="space-y-1.5">
                                    <Label>Class Name</Label>
                                    <Input
                                        value={form.data.target_class_name}
                                        onChange={(event) => form.setData('target_class_name', event.target.value)}
                                    />
                                </div>
                            ) : null}

                            <label className="flex items-start gap-3 rounded-lg border p-3">
                                <Checkbox
                                    checked={form.data.replace_existing}
                                    onCheckedChange={(value) => form.setData('replace_existing', value === true)}
                                />
                                <span>
                                    <span className="block text-sm font-medium">Replace existing scoped content</span>
                                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                        Deletes chapters, topics, and questions already under the selected target pattern, class, and copied subjects before importing.
                                    </span>
                                </span>
                            </label>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <Stat label="Selected Subjects" value={selectedSubjects.length} />
                                <Stat label="Chapters" value={selectedTotals.chapters} />
                                <Stat label="Questions" value={numberFormat(selectedTotals.questions)} />
                            </div>
                        </section>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            type="submit"
                            disabled={
                                form.processing ||
                                form.data.source_subject_ids.length === 0 ||
                                (!form.data.target_pattern_id && !form.data.target_pattern_name.trim()) ||
                                (!form.data.target_class_id && !form.data.target_class_name.trim())
                            }
                        >
                            <ArrowRightIcon className="size-4" />
                            {form.processing ? 'Transferring...' : 'Transfer Data'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

DataTransfer.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Data Transfer', href: '/superadmin/data-transfer' },
    ],
};

import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CalendarIcon,
    FileQuestionIcon,
    LanguagesIcon,
    ListChecksIcon,
    LogsIcon,
    PencilIcon,
    ShieldCheckIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface AuditLogEntry {
    id: number;
    event: string | null;
    old_values: Record<string, unknown>;
    new_values: Record<string, unknown>;
    changed_by: string;
    created_at: string | null;
}

interface QuestionData {
    id: number;
    statement_en: string | null;
    statement_ur: string | null;
    description_en: string | null;
    description_ur: string | null;
    answer_en: string | null;
    answer_ur: string | null;
    source: string | null;
    source_label?: string | null;
    status: number;
    created_at: string | null;
    updated_at: string | null;
    question_type: {
        id: number;
        name: string;
        is_objective: boolean;
        is_single: boolean;
        have_statement: boolean;
        statement_label: string | null;
        have_description: boolean;
        description_label: string | null;
        have_answer: boolean;
        column_per_row: number;
        objective_type: {
            id: number;
            name: string;
        } | null;
    };
    chapter: {
        id: number;
        name: string;
        name_ur: string | null;
        chapter_number: number | null;
        subject: {
            id: number;
            name_eng: string;
            name_ur: string | null;
            subject_type: 'chapter-wise' | 'topic-wise';
        };
        class: {
            id: number;
            name: string;
        };
        pattern: {
            id: number;
            name: string;
            short_name: string | null;
        };
    };
    topic: {
        id: number;
        name: string;
        name_ur: string | null;
    } | null;
    options_count: number;
    correct_options_count: number;
    options: Array<{
        id: number;
        text_en: string | null;
        text_ur: string | null;
        is_correct: boolean;
        sort_order: number;
    }>;
    audit_logs: AuditLogEntry[];
}

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

function fmtDate(value: string | null) {
    if (!value) {
        return '-';
    }

    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function fmtDateTime(value: string | null) {
    if (!value) {
        return '-';
    }

    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function statusBadge(status: number) {
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

function SectionHeader({
    icon,
    title,
}: {
    icon: React.ReactNode;
    title: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium">{title}</p>
            </div>
        </div>
    );
}

function chapterLabel(chapter: QuestionData['chapter']) {
    const chapterPart = chapter.chapter_number
        ? `Chapter ${chapter.chapter_number}`
        : chapter.name;

    return [
        chapter.subject.name_eng,
        chapterPart,
        chapter.class.name,
        chapter.pattern.short_name ?? chapter.pattern.name,
    ].join(' / ');
}

export default function ShowQuestion({ question }: { question: QuestionData }) {
    const title =
        question.statement_en ||
        question.statement_ur ||
        question.description_en ||
        question.description_ur ||
        `Question #${question.id}`;

    return (
        <>
            <Head title={`Question #${question.id}`} />

            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/superadmin/questions"
                            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-input transition-colors hover:bg-accent"
                        >
                            <ArrowLeftIcon className="size-4" />
                        </Link>
                        <div>
                            <h1 className="h1-semibold">{title}</h1>
                            <p className="text-sm text-muted-foreground">
                                {question.question_type.name}
                            </p>
                        </div>
                    </div>
                    <Button asChild variant="outline" className="sm:shrink-0">
                        <Link
                            href={`/superadmin/questions/${question.id}/edit`}
                        >
                            <PencilIcon className="size-4" />
                            Edit Question
                        </Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl border shadow-sm">
                    <div className="flex flex-wrap items-center gap-6 border-b bg-muted/20 p-5 md:p-6">
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <FileQuestionIcon className="size-7" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-semibold">
                                    {question.question_type.name}
                                </h2>
                                <Badge variant="outline" className="bg-muted">
                                    {question.question_type.is_objective
                                        ? 'Objective'
                                        : 'Subjective'}
                                </Badge>
                                <Badge variant="outline" className="bg-muted">
                                    {question.question_type.is_single
                                        ? 'Single'
                                        : 'Multi'}
                                </Badge>
                                {statusBadge(question.status)}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="bg-muted">
                                    {chapterLabel(question.chapter)}
                                </Badge>
                                {question.topic ? (
                                    <Badge
                                        variant="outline"
                                        className="bg-muted"
                                    >
                                        {question.topic.name}
                                    </Badge>
                                ) : null}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CalendarIcon className="size-3.5" />
                                <span>
                                    Created {fmtDate(question.created_at)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid divide-y sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                        <div className="p-5 text-center">
                            <p className="text-xs text-muted-foreground">
                                Subject
                            </p>
                            <p className="mt-1 font-semibold">
                                {question.chapter.subject.name_eng}
                            </p>
                        </div>
                        <div className="p-5 text-center">
                            <p className="text-xs text-muted-foreground">
                                Source
                            </p>
                            <p className="mt-1 font-semibold">
                                {question.source_label ||
                                    question.source ||
                                    '-'}
                            </p>
                        </div>
                        <div className="p-5 text-center">
                            <p className="text-xs text-muted-foreground">
                                Options
                            </p>
                            <p className="mt-1 font-semibold">
                                {question.options_count}
                            </p>
                        </div>
                        <div className="p-5 text-center">
                            <p className="text-xs text-muted-foreground">
                                Correct
                            </p>
                            <p className="mt-1 font-semibold">
                                {question.correct_options_count}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">
                        {question.question_type.have_statement ? (
                            <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                                <SectionHeader
                                    icon={<LanguagesIcon className="size-4" />}
                                    title={
                                        question.question_type
                                            .statement_label ?? 'Statement'
                                    }
                                />
                                <Separator />
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-xl border p-4">
                                        <p className="text-xs text-muted-foreground">
                                            English
                                        </p>
                                        <p className="mt-2 text-sm whitespace-pre-wrap">
                                            {question.statement_en || '-'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border p-4">
                                        <p className="text-xs text-muted-foreground">
                                            Urdu
                                        </p>
                                        <p
                                            className="mt-2 text-sm whitespace-pre-wrap"
                                            dir="rtl"
                                        >
                                            {question.statement_ur || '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {question.question_type.have_description ? (
                            <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                                <SectionHeader
                                    icon={<LanguagesIcon className="size-4" />}
                                    title={
                                        question.question_type
                                            .description_label ?? 'Description'
                                    }
                                />
                                <Separator />
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-xl border p-4">
                                        <p className="text-xs text-muted-foreground">
                                            English
                                        </p>
                                        <p className="mt-2 text-sm whitespace-pre-wrap">
                                            {question.description_en || '-'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border p-4">
                                        <p className="text-xs text-muted-foreground">
                                            Urdu
                                        </p>
                                        <p
                                            className="mt-2 text-sm whitespace-pre-wrap"
                                            dir="rtl"
                                        >
                                            {question.description_ur || '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {!question.question_type.is_objective &&
                        question.question_type.have_answer ? (
                            <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                                <SectionHeader
                                    icon={
                                        <ShieldCheckIcon className="size-4" />
                                    }
                                    title="Answer"
                                />
                                <Separator />
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-xl border p-4">
                                        <p className="text-xs text-muted-foreground">
                                            English
                                        </p>
                                        <p className="mt-2 text-sm whitespace-pre-wrap">
                                            {question.answer_en || '-'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border p-4">
                                        <p className="text-xs text-muted-foreground">
                                            Urdu
                                        </p>
                                        <p
                                            className="mt-2 text-sm whitespace-pre-wrap"
                                            dir="rtl"
                                        >
                                            {question.answer_ur || '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {question.question_type.is_objective ? (
                            <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                                <SectionHeader
                                    icon={<ListChecksIcon className="size-4" />}
                                    title="Options"
                                />
                                <Separator />
                                <div className="grid gap-3 md:grid-cols-2">
                                    {question.options.map((option, index) => (
                                        <div
                                            key={option.id}
                                            className="rounded-xl border p-4"
                                        >
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                                    {String.fromCharCode(
                                                        65 + index,
                                                    )}
                                                </span>
                                                {option.is_correct ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-emerald-200 bg-emerald-100 text-emerald-700"
                                                    >
                                                        Correct
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-muted"
                                                    >
                                                        Option
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">
                                                        English
                                                    </p>
                                                    <p className="mt-1 text-sm">
                                                        {option.text_en || '-'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Urdu
                                                    </p>
                                                    <p
                                                        className="mt-1 text-sm"
                                                        dir="rtl"
                                                    >
                                                        {option.text_ur || '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                            <SectionHeader
                                icon={<FileQuestionIcon className="size-4" />}
                                title="Context"
                            />
                            <Separator />

                            <div className="space-y-3 text-sm">
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Chapter
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {chapterLabel(question.chapter)}
                                    </p>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Topic
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {question.topic?.name || '-'}
                                    </p>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Objective Type
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {question.question_type.objective_type
                                            ?.name || '-'}
                                    </p>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Updated
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {fmtDateTime(question.updated_at)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                            <SectionHeader
                                icon={<LogsIcon className="size-4" />}
                                title="Activity"
                            />
                            <Separator />

                            {question.audit_logs.length === 0 ? (
                                <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                                    No activity yet
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {question.audit_logs.map((log) => (
                                        <AuditLogCard key={log.id} log={log} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

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

                    {hasChanges ? (
                        <div className="space-y-1 rounded-lg border bg-muted/40 p-3 text-xs">
                            {Object.entries(log.new_values).map(
                                ([key, value]) => (
                                    <div
                                        key={key}
                                        className="flex flex-wrap items-baseline gap-1.5"
                                    >
                                        <span className="text-muted-foreground capitalize">
                                            {key.replace(/_/g, ' ')}:
                                        </span>
                                        {log.old_values[key] !== undefined ? (
                                            <>
                                                <span className="line-through opacity-50">
                                                    {String(
                                                        log.old_values[key],
                                                    )}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {'->'}
                                                </span>
                                            </>
                                        ) : null}
                                        <span className="font-medium">
                                            {String(value)}
                                        </span>
                                    </div>
                                ),
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

ShowQuestion.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Questions', href: '/superadmin/questions' },
        { title: 'View Question' },
    ],
};

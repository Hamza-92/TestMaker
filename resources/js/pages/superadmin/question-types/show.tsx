import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CalendarIcon,
    FileQuestionIcon,
    LayersIcon,
    ListChecksIcon,
    LogsIcon,
    PencilIcon,
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

interface QuestionTypeData {
    id: number;
    name: string;
    name_ur: string | null;
    heading_en: string;
    heading_ur: string | null;
    description_en: string | null;
    description_ur: string | null;
    have_exercise: boolean;
    have_statement: boolean;
    statement_label: string | null;
    have_description: boolean;
    description_label: string | null;
    have_answer: boolean;
    is_single: boolean;
    is_objective: boolean;
    column_per_row: number;
    status: number;
    created_at: string | null;
    questions_count: number;
    objective_children_count: number;
    objective_type: { id: number; name: string; heading_en: string } | null;
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

function featurePills(questionType: QuestionTypeData) {
    return [
        questionType.have_exercise ? 'Exercise' : null,
        questionType.have_statement
            ? (questionType.statement_label ?? 'Statement')
            : null,
        questionType.have_description
            ? (questionType.description_label ?? 'Description')
            : null,
        questionType.have_answer ? 'Answer' : null,
        questionType.is_objective ? 'Objective' : 'Subjective',
        questionType.is_single ? 'Single' : 'Multi',
    ].filter(Boolean) as string[];
}

export default function ShowQuestionType({
    questionType,
}: {
    questionType: QuestionTypeData;
}) {
    return (
        <>
            <Head title={questionType.name} />

            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/superadmin/question-types"
                            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-input transition-colors hover:bg-accent"
                        >
                            <ArrowLeftIcon className="size-4" />
                        </Link>
                        <div>
                            <h1 className="h1-semibold">{questionType.name}</h1>
                            {questionType.name_ur && (
                                <p
                                    className="text-sm text-muted-foreground"
                                    dir="rtl"
                                >
                                    {questionType.name_ur}
                                </p>
                            )}
                        </div>
                    </div>
                    <Button asChild variant="outline" className="sm:shrink-0">
                        <Link
                            href={`/superadmin/question-types/${questionType.id}/edit`}
                        >
                            <PencilIcon className="size-4" />
                            Edit Question Type
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
                                    {questionType.heading_en}
                                </h2>
                                {statusBadge(questionType.status)}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {featurePills(questionType).map((pill) => (
                                    <span
                                        key={pill}
                                        className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                                    >
                                        {pill}
                                    </span>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CalendarIcon className="size-3.5" />
                                <span>
                                    Created {fmtDate(questionType.created_at)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid divide-y sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                        <div className="p-5 text-center">
                            <p className="text-xs text-muted-foreground">
                                Questions
                            </p>
                            <p className="mt-1 font-semibold">
                                {questionType.questions_count}
                            </p>
                        </div>
                        <div className="p-5 text-center">
                            <p className="text-xs text-muted-foreground">
                                Columns / Row
                            </p>
                            <p className="mt-1 font-semibold">
                                {questionType.column_per_row}
                            </p>
                        </div>
                        <div className="p-5 text-center">
                            <p className="text-xs text-muted-foreground">
                                Linked Types
                            </p>
                            <p className="mt-1 font-semibold">
                                {questionType.objective_children_count}
                            </p>
                        </div>
                        <div className="p-5 text-center">
                            <p className="text-xs text-muted-foreground">
                                Objective Type
                            </p>
                            <p className="mt-1 font-semibold">
                                {questionType.objective_type?.name ?? '-'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="space-y-6">
                        <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                            <SectionHeader
                                icon={<LayersIcon className="size-4" />}
                                title="Content"
                            />
                            <Separator />

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Heading (English)
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {questionType.heading_en}
                                    </p>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Heading (Urdu)
                                    </p>
                                    <p className="mt-1 font-medium" dir="rtl">
                                        {questionType.heading_ur ?? '-'}
                                    </p>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Statement Label
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {questionType.have_statement
                                            ? (questionType.statement_label ??
                                              'Statement')
                                            : '-'}
                                    </p>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Description Label
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {questionType.have_description
                                            ? (questionType.description_label ??
                                              'Description')
                                            : '-'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Description (English)
                                    </p>
                                    <p className="mt-2 text-sm whitespace-pre-wrap">
                                        {questionType.description_en || '-'}
                                    </p>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Description (Urdu)
                                    </p>
                                    <p
                                        className="mt-2 text-sm whitespace-pre-wrap"
                                        dir="rtl"
                                    >
                                        {questionType.description_ur || '-'}
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

                            {questionType.audit_logs.length === 0 ? (
                                <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                                    No activity yet
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {questionType.audit_logs.map((log) => (
                                        <AuditLogCard key={log.id} log={log} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                            <SectionHeader
                                icon={<ListChecksIcon className="size-4" />}
                                title="Blocks"
                            />
                            <Separator />

                            <div className="grid gap-3">
                                {[
                                    {
                                        label: 'Exercise',
                                        enabled: questionType.have_exercise,
                                    },
                                    {
                                        label: 'Statement',
                                        enabled: questionType.have_statement,
                                    },
                                    {
                                        label: 'Description',
                                        enabled: questionType.have_description,
                                    },
                                    {
                                        label: 'Answer',
                                        enabled: questionType.have_answer,
                                    },
                                    {
                                        label: 'Single',
                                        enabled: questionType.is_single,
                                    },
                                    {
                                        label: 'Objective',
                                        enabled: questionType.is_objective,
                                    },
                                ].map((item) => (
                                    <div
                                        key={item.label}
                                        className="flex items-center justify-between rounded-xl border px-4 py-3"
                                    >
                                        <span className="text-sm font-medium">
                                            {item.label}
                                        </span>
                                        {item.enabled ? (
                                            <Badge
                                                variant="outline"
                                                className="border-emerald-200 bg-emerald-100 text-emerald-700"
                                            >
                                                Enabled
                                            </Badge>
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className="border-gray-200 bg-gray-100 text-gray-600"
                                            >
                                                Disabled
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                            <SectionHeader
                                icon={<FileQuestionIcon className="size-4" />}
                                title="Links"
                            />
                            <Separator />

                            <div className="space-y-3 text-sm">
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Objective Type
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {questionType.objective_type?.name ??
                                            '-'}
                                    </p>
                                    {questionType.objective_type
                                        ?.heading_en && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {
                                                questionType.objective_type
                                                    .heading_en
                                            }
                                        </p>
                                    )}
                                </div>
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Created
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {fmtDateTime(questionType.created_at)}
                                    </p>
                                </div>
                            </div>
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

                    {hasChanges && (
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
                                        {log.old_values[key] !== undefined && (
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
                                        )}
                                        <span className="font-medium">
                                            {String(value)}
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

ShowQuestionType.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Question Types', href: '/superadmin/question-types' },
        { title: 'View Question Type' },
    ],
};

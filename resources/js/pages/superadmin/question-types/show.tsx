import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CalendarIcon,
    FileQuestionIcon,
    LogsIcon,
    PencilIcon,
    SparklesIcon,
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
    have_answer: boolean;
    is_single: boolean;
    is_objective: boolean;
    schema_key: string;
    schema: {
        key: string;
        kind: 'objective' | 'subjective';
        label: string;
        description: string;
        settings: {
            supports_answer_toggle: boolean;
            supports_single_toggle: boolean;
        };
    };
    status: number;
    created_at: string | null;
    questions_count: number;
    objective_children_count: number;
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

function AuditLogCard({ log }: { log: AuditLogEntry }) {
    const key = (log.event ?? '').toLowerCase();
    const dotClass = EVENT_DOT[key] ?? 'bg-gray-400';
    const label = EVENT_LABEL[key] ?? log.event ?? 'Activity';

    return (
        <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className={`inline-block size-2 rounded-full ${dotClass}`} />
                    <p className="font-medium">{label}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                    {fmtDateTime(log.created_at)}
                </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
                {log.changed_by}
            </p>
        </div>
    );
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
                            {questionType.name_ur ? (
                                <p
                                    className="text-sm text-muted-foreground"
                                    dir="rtl"
                                >
                                    {questionType.name_ur}
                                </p>
                            ) : null}
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
                                <Badge variant="outline" className="bg-muted">
                                    {questionType.is_objective
                                        ? 'Objective'
                                        : 'Subjective'}
                                </Badge>
                                <Badge variant="outline" className="bg-muted">
                                    {questionType.schema.label}
                                </Badge>
                                {statusBadge(questionType.status)}
                            </div>
                            <p className="max-w-3xl text-sm text-muted-foreground">
                                {questionType.schema.description}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CalendarIcon className="size-3.5" />
                                <span>
                                    Created {fmtDate(questionType.created_at)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
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
                                Linked Types
                            </p>
                            <p className="mt-1 font-semibold">
                                {questionType.objective_children_count}
                            </p>
                        </div>
                        <div className="p-5 text-center">
                            <p className="text-xs text-muted-foreground">
                                Builder Behavior
                            </p>
                            <p className="mt-1 font-semibold">
                                {questionType.have_answer
                                    ? 'Answer fields enabled'
                                    : 'Answer fields hidden'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="space-y-6">
                        <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                            <div className="flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <SparklesIcon className="size-4" />
                                </div>
                                <p className="text-sm font-medium">
                                    Builder Schema
                                </p>
                            </div>
                            <Separator />

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Schema
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {questionType.schema.label}
                                    </p>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Correct Answer Mode
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {questionType.is_objective &&
                                        questionType.schema.settings
                                            .supports_single_toggle
                                            ? questionType.is_single
                                                ? 'Single correct answer'
                                                : 'Multiple correct answers'
                                            : 'Not applicable'}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl border p-4">
                                <p className="text-xs text-muted-foreground">
                                    Description
                                </p>
                                <p className="mt-2 text-sm whitespace-pre-wrap">
                                    {questionType.description_en ||
                                        questionType.description_ur ||
                                        '-'}
                                </p>
                            </div>

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
                                    <p
                                        className="mt-1 font-medium"
                                        dir="rtl"
                                    >
                                        {questionType.heading_ur ?? '-'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                            <div className="flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <LogsIcon className="size-4" />
                                </div>
                                <p className="text-sm font-medium">Activity</p>
                            </div>
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
                </div>
            </div>
        </>
    );
}

import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CalendarIcon,
    FileQuestionIcon,
    LogsIcon,
    PencilIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

const AUDIT_STYLE: Record<string, { dotClass: string; badgeClass: string; label: string }> = {
    created:  { dotClass: 'bg-emerald-500', badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Created'  },
    updated:  { dotClass: 'bg-blue-500',    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',         label: 'Updated'  },
    deleted:  { dotClass: 'bg-red-500',     badgeClass: 'border-red-200 bg-red-50 text-red-700',           label: 'Deleted'  },
    restored: { dotClass: 'bg-violet-500',  badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',  label: 'Restored' },
};

function fmt(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDt(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function changesSummary(log: AuditLogEntry): string | null {
    const keys = Object.keys(log.new_values);
    if (keys.length === 0) return null;
    return keys.map((k) => k.replace(/_/g, ' ')).join(', ') + ' changed';
}

function SectionShell({ icon, title, meta, children }: { icon: ReactNode; title: string; meta?: string; children: ReactNode }) {
    return (
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <div className="flex items-center gap-3 border-b px-5 py-4 sm:px-6">
                <div className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {icon}
                </div>
                <div>
                    <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
                    {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
                </div>
            </div>
            {children}
        </section>
    );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-start gap-3 py-3">
            <p className="w-32 shrink-0 text-xs font-medium text-muted-foreground">{label}</p>
            <div className="min-w-0 flex-1 text-sm">{children}</div>
        </div>
    );
}

export default function ShowQuestionType({
    questionType,
    backHref = '/superadmin/question-types',
}: {
    questionType: QuestionTypeData;
    backHref?: string;
}) {
    const answerMode =
        questionType.is_objective && questionType.schema.settings.supports_single_toggle
            ? questionType.is_single
                ? 'Single correct'
                : 'Multiple correct'
            : null;

    return (
        <>
            <Head title={questionType.name} />

            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link
                            href={backHref}
                            className="flex size-10 items-center justify-center rounded-2xl border border-input transition-colors hover:bg-accent"
                        >
                            <ArrowLeftIcon className="size-4" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">{questionType.name}</h1>
                            {questionType.name_ur && (
                                <p className="text-sm text-muted-foreground" dir="rtl">{questionType.name_ur}</p>
                            )}
                        </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link href={`${backHref}/${questionType.id}/edit`}>
                            <PencilIcon className="size-4" />
                            Edit
                        </Link>
                    </Button>
                </div>

                {/* Body */}
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.9fr)]">

                    {/* Details */}
                    <SectionShell icon={<FileQuestionIcon className="size-4" />} title="Details">
                        <div className="divide-y px-5 sm:px-6">
                            <InfoRow label="Heading (EN)">
                                <span className="font-medium">{questionType.heading_en}</span>
                            </InfoRow>

                            {questionType.heading_ur && (
                                <InfoRow label="Heading (UR)">
                                    <span className="font-medium" dir="rtl">{questionType.heading_ur}</span>
                                </InfoRow>
                            )}

                            <InfoRow label="Kind">
                                {questionType.is_objective ? (
                                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">Objective</Badge>
                                ) : (
                                    <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">Subjective</Badge>
                                )}
                            </InfoRow>

                            <InfoRow label="Schema">
                                <span>{questionType.schema.label}</span>
                                {questionType.schema.description && (
                                    <p className="mt-0.5 text-xs text-muted-foreground">{questionType.schema.description}</p>
                                )}
                            </InfoRow>

                            <InfoRow label="Has Answer">
                                <span>{questionType.have_answer ? 'Yes' : 'No'}</span>
                            </InfoRow>

                            {answerMode && (
                                <InfoRow label="Answer Mode">
                                    <span>{answerMode}</span>
                                </InfoRow>
                            )}

                            {(questionType.description_en || questionType.description_ur) && (
                                <InfoRow label="Description">
                                    {questionType.description_en && (
                                        <p className="whitespace-pre-wrap">{questionType.description_en}</p>
                                    )}
                                    {questionType.description_ur && (
                                        <p className="mt-1 whitespace-pre-wrap" dir="rtl">{questionType.description_ur}</p>
                                    )}
                                </InfoRow>
                            )}

                            <InfoRow label="Questions">
                                <span className="font-medium tabular-nums">{questionType.questions_count.toLocaleString()}</span>
                            </InfoRow>

                            <InfoRow label="Status">
                                {questionType.status === 1 ? (
                                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 font-medium text-emerald-700">
                                        <span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-500" />Active
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="border-gray-200 bg-gray-50 font-medium text-gray-600">
                                        <span className="mr-1.5 inline-block size-1.5 rounded-full bg-gray-400" />Inactive
                                    </Badge>
                                )}
                            </InfoRow>

                            <InfoRow label="Created">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <CalendarIcon className="size-3.5" />
                                    <span>{fmt(questionType.created_at)}</span>
                                </div>
                            </InfoRow>
                        </div>
                    </SectionShell>

                    {/* Activity */}
                    <SectionShell
                        icon={<LogsIcon className="size-4" />}
                        title="Activity"
                        meta={`${questionType.audit_logs.length} entries`}
                    >
                        {questionType.audit_logs.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center text-muted-foreground">
                                <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                                    <LogsIcon className="size-6 opacity-40" />
                                </div>
                                <p className="text-sm">No activity yet</p>
                            </div>
                        ) : (
                            <div className="divide-y p-3 sm:p-4">
                                {questionType.audit_logs.map((log) => {
                                    const key = (log.event ?? '').toLowerCase();
                                    const cfg = AUDIT_STYLE[key] ?? {
                                        dotClass: 'bg-gray-400',
                                        badgeClass: 'border-gray-200 bg-gray-50 text-gray-600',
                                        label: log.event ?? 'Event',
                                    };
                                    const changes = changesSummary(log);

                                    return (
                                        <div
                                            key={log.id}
                                            className="flex flex-col gap-2 rounded-2xl px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
                                        >
                                            <div className="flex min-w-0 items-start gap-3">
                                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                                                    <span className={cn('size-2 rounded-full', cfg.dotClass)} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge variant="outline" className={cn('font-medium', cfg.badgeClass)}>
                                                            {cfg.label}
                                                        </Badge>
                                                        <p className="text-sm text-slate-700">{log.changed_by}</p>
                                                    </div>
                                                    {changes && (
                                                        <p className="mt-0.5 text-xs text-muted-foreground">{changes}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="pl-12 text-xs whitespace-nowrap text-muted-foreground sm:pl-0">
                                                {fmtDt(log.created_at)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </SectionShell>
                </div>
            </div>
        </>
    );
}

ShowQuestionType.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Question Types', href: '/superadmin/question-types' },
        { title: 'View' },
    ],
};

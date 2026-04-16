import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CalendarIcon,
    HelpCircleIcon,
    LogsIcon,
    PencilIcon,
    SchoolIcon,
    TagIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClassItem {
    id: number;
    name: string;
    status: number;
}

interface AuditLogEntry {
    id: number;
    event: string | null;
    old_values: Record<string, unknown>;
    new_values: Record<string, unknown>;
    changed_by: string;
    created_at: string | null;
}

interface PatternData {
    id: number;
    name: string;
    short_name: string | null;
    status: number;
    created_at: string | null;
    classes: ClassItem[];
    audit_logs: AuditLogEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function fmtDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-muted-foreground text-xs">{description}</p>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ShowPattern({ pattern }: { pattern: PatternData }) {
    return (
        <>
            <Head title={pattern.name} />
            <div className="space-y-6 p-4 md:p-6">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/superadmin/patterns" className="hover:bg-accent border-input flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors">
                            <ArrowLeftIcon className="size-4" />
                        </Link>
                        <div>
                            <h1 className="h1-semibold">{pattern.name}</h1>
                            <p className="text-muted-foreground text-sm">Pattern details</p>
                        </div>
                    </div>
                    <Button asChild variant="outline" className="sm:shrink-0">
                        <Link href={`/superadmin/patterns/${pattern.id}/edit`}>
                            <PencilIcon className="size-4" /> Edit Pattern
                        </Link>
                    </Button>
                </div>

                {/* ── Overview card ────────────────────────────────────────── */}
                <div className="overflow-hidden rounded-xl border shadow-sm">
                    <div className="bg-muted/20 flex flex-wrap items-center gap-6 border-b p-5 md:p-6">
                        <div className="bg-primary/10 text-primary flex size-14 shrink-0 items-center justify-center rounded-xl">
                            <TagIcon className="size-7" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-semibold">{pattern.name}</h2>
                                {pattern.short_name && (
                                    <span className="text-muted-foreground text-sm">({pattern.short_name})</span>
                                )}
                                {pattern.status === 1 ? (
                                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 font-medium">
                                        <span className="mr-1 size-1.5 rounded-full bg-emerald-500 inline-block" /> Active
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200 font-medium">
                                        <span className="mr-1 size-1.5 rounded-full bg-gray-400 inline-block" /> Inactive
                                    </Badge>
                                )}
                            </div>
                            <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                <CalendarIcon className="size-3.5" />
                                <span>Created {fmtDate(pattern.created_at)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                        <div className="p-5 text-center">
                            <p className="text-muted-foreground text-xs">Short Name</p>
                            <p className="mt-1 font-semibold">{pattern.short_name ?? <span className="text-muted-foreground italic text-sm font-normal">—</span>}</p>
                        </div>
                        <div className="p-5 text-center">
                            <p className="text-muted-foreground text-xs">Linked Classes</p>
                            <p className="mt-1 font-semibold">{pattern.classes.length}</p>
                        </div>
                        <div className="p-5 text-center">
                            <p className="text-muted-foreground text-xs">Status</p>
                            <p className="mt-1 font-semibold">{pattern.status === 1 ? 'Active' : 'Inactive'}</p>
                        </div>
                    </div>
                </div>

                {/* ── Linked Classes ───────────────────────────────────────── */}
                <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                    <SectionHeader
                        icon={<SchoolIcon className="size-4" />}
                        title="Linked Classes"
                        description="Classes that belong to this pattern"
                    />
                    <Separator />

                    {pattern.classes.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center">
                            <HelpCircleIcon className="size-8 opacity-30" />
                            <p className="text-sm">No classes linked yet</p>
                            <Link href="/superadmin/classes" className="text-primary text-xs hover:underline">Manage classes</Link>
                        </div>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {pattern.classes.map((cls) => (
                                <Link
                                    key={cls.id}
                                    href={`/superadmin/classes/${cls.id}`}
                                    className="hover:bg-muted/50 flex items-center justify-between rounded-lg border px-4 py-3 transition-colors"
                                >
                                    <span className="text-sm font-medium">{cls.name}</span>
                                    {cls.status === 1 ? (
                                        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Active</Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200 text-xs">Inactive</Badge>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Audit Logs ───────────────────────────────────────────── */}
                <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                    <SectionHeader
                        icon={<LogsIcon className="size-4" />}
                        title="Activity Log"
                        description="All changes made to this pattern"
                    />
                    <Separator />

                    {pattern.audit_logs.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center">
                            <HelpCircleIcon className="size-8 opacity-30" />
                            <p className="text-sm">No activity recorded yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pattern.audit_logs.map((log) => (
                                <AuditLogCard key={log.id} log={log} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function AuditLogCard({ log }: { log: AuditLogEntry }) {
    const dot   = EVENT_DOT[log.event ?? ''] ?? 'bg-gray-400';
    const label = EVENT_LABEL[log.event ?? ''] ?? log.event ?? 'Changed';
    const hasChanges = Object.keys(log.new_values).length > 0;

    return (
        <div className="rounded-xl border p-4">
            <div className="flex items-start gap-3">
                <div className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dot}`} />
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{label}</span>
                            <span className="text-muted-foreground text-xs">by {log.changed_by}</span>
                        </div>
                        <span className="text-muted-foreground text-xs">{fmtDateTime(log.created_at)}</span>
                    </div>

                    {hasChanges && (
                        <div className="bg-muted/40 rounded-lg border p-3 text-xs space-y-1">
                            {Object.entries(log.new_values).map(([key, val]) => (
                                <div key={key} className="flex flex-wrap items-baseline gap-1.5">
                                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                                    {log.old_values[key] !== undefined && (
                                        <>
                                            <span className="line-through opacity-50">{String(log.old_values[key])}</span>
                                            <span className="text-muted-foreground">→</span>
                                        </>
                                    )}
                                    <span className="font-medium">{String(val)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

ShowPattern.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Patterns', href: '/superadmin/patterns' },
        { title: 'View Pattern' },
    ],
};

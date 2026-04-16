import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    BookOpenIcon,
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

interface PatternItem {
    id: number;
    name: string;
    short_name: string | null;
}

interface LinksByPattern {
    pattern: PatternItem;
    classes: ClassItem[];
}

interface AuditLogEntry {
    id: number;
    event: string | null;
    old_values: Record<string, unknown>;
    new_values: Record<string, unknown>;
    changed_by: string;
    created_at: string | null;
}

interface SubjectData {
    id: number;
    name_eng: string;
    name_ur: string | null;
    subject_type: string;
    status: number;
    created_at: string | null;
    links_by_pattern: LinksByPattern[];
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
export default function ShowSubject({ subject }: { subject: SubjectData }) {
    const totalLinks = subject.links_by_pattern.reduce((sum, g) => sum + g.classes.length, 0);
    const typeLabel  = subject.subject_type === 'chapter-wise' ? 'Chapter-wise' : 'Topic-wise';
    const typeClass  = subject.subject_type === 'chapter-wise'
        ? 'bg-blue-100 text-blue-700 border-blue-200'
        : 'bg-violet-100 text-violet-700 border-violet-200';

    return (
        <>
            <Head title={subject.name_eng} />
            <div className="space-y-6 p-4 md:p-6">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/superadmin/subjects" className="hover:bg-accent border-input flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors">
                            <ArrowLeftIcon className="size-4" />
                        </Link>
                        <div>
                            <h1 className="h1-semibold">{subject.name_eng}</h1>
                            {subject.name_ur && <p className="text-muted-foreground text-sm" dir="rtl">{subject.name_ur}</p>}
                        </div>
                    </div>
                    <Button asChild variant="outline" className="sm:shrink-0">
                        <Link href={`/superadmin/subjects/${subject.id}/edit`}>
                            <PencilIcon className="size-4" /> Edit Subject
                        </Link>
                    </Button>
                </div>

                {/* ── Overview card ────────────────────────────────────────── */}
                <div className="overflow-hidden rounded-xl border shadow-sm">
                    <div className="bg-muted/20 flex flex-wrap items-center gap-6 border-b p-5 md:p-6">
                        <div className="bg-primary/10 text-primary flex size-14 shrink-0 items-center justify-center rounded-xl">
                            <BookOpenIcon className="size-7" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-semibold">{subject.name_eng}</h2>
                                <Badge variant="outline" className={`${typeClass} font-medium`}>{typeLabel}</Badge>
                                {subject.status === 1 ? (
                                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 font-medium">
                                        <span className="mr-1 size-1.5 rounded-full bg-emerald-500 inline-block" /> Active
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200 font-medium">
                                        <span className="mr-1 size-1.5 rounded-full bg-gray-400 inline-block" /> Inactive
                                    </Badge>
                                )}
                            </div>
                            {subject.name_ur && (
                                <p className="text-muted-foreground text-sm" dir="rtl">{subject.name_ur}</p>
                            )}
                            <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                <CalendarIcon className="size-3.5" />
                                <span>Created {fmtDate(subject.created_at)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                        <div className="p-5 text-center">
                            <p className="text-muted-foreground text-xs">Type</p>
                            <p className="mt-1 font-semibold">{typeLabel}</p>
                        </div>
                        <div className="p-5 text-center">
                            <p className="text-muted-foreground text-xs">Linked Patterns</p>
                            <p className="mt-1 font-semibold">{subject.links_by_pattern.length}</p>
                        </div>
                        <div className="p-5 text-center">
                            <p className="text-muted-foreground text-xs">Linked Classes</p>
                            <p className="mt-1 font-semibold">{totalLinks}</p>
                        </div>
                    </div>
                </div>

                {/* ── Class Links by Pattern ───────────────────────────────── */}
                <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                    <SectionHeader
                        icon={<SchoolIcon className="size-4" />}
                        title="Class Links"
                        description="Which classes teach this subject, grouped by pattern"
                    />
                    <Separator />

                    {subject.links_by_pattern.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center">
                            <HelpCircleIcon className="size-8 opacity-30" />
                            <p className="text-sm">No class links yet</p>
                            <Link href={`/superadmin/subjects/${subject.id}/edit`} className="text-primary text-xs hover:underline">
                                Add links
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {subject.links_by_pattern.map((group) => (
                                <div key={group.pattern.id} className="overflow-hidden rounded-lg border">
                                    {/* Pattern header */}
                                    <Link
                                        href={`/superadmin/patterns/${group.pattern.id}`}
                                        className="bg-muted/40 hover:bg-muted/70 flex items-center gap-2 border-b px-4 py-2.5 transition-colors"
                                    >
                                        <TagIcon className="text-muted-foreground size-3.5" />
                                        <span className="text-sm font-semibold">{group.pattern.name}</span>
                                        {group.pattern.short_name && (
                                            <span className="text-muted-foreground text-xs">({group.pattern.short_name})</span>
                                        )}
                                        <span className="text-muted-foreground ml-auto text-xs">
                                            {group.classes.length} class{group.classes.length !== 1 ? 'es' : ''}
                                        </span>
                                    </Link>

                                    {/* Classes */}
                                    <div className="flex flex-wrap gap-2 p-4">
                                        {group.classes.map((cls) => (
                                            <Link
                                                key={cls.id}
                                                href={`/superadmin/classes/${cls.id}`}
                                                className="hover:bg-muted/60 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
                                            >
                                                <SchoolIcon className="text-muted-foreground size-3.5" />
                                                <span className="font-medium">{cls.name}</span>
                                                {cls.status !== 1 && (
                                                    <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200 text-xs">Inactive</Badge>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Audit Logs ───────────────────────────────────────────── */}
                <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                    <SectionHeader
                        icon={<LogsIcon className="size-4" />}
                        title="Activity Log"
                        description="All changes made to this subject"
                    />
                    <Separator />

                    {subject.audit_logs.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center">
                            <HelpCircleIcon className="size-8 opacity-30" />
                            <p className="text-sm">No activity recorded yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {subject.audit_logs.map((log) => (
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

ShowSubject.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Subjects', href: '/superadmin/subjects' },
        { title: 'View Subject' },
    ],
};

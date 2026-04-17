import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CheckCircle2Icon,
    GlobeIcon,
    MinusIcon,
    PlusIcon,
    RefreshCwIcon,
    ShieldAlertIcon,
    UserIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Customer {
    id: number;
    name: string;
}

interface LogDetail {
    id: number;
    summary: string;
    detail: string | null;
    event: string | null;
    changed_by_name: string | null;
    notes: string | null;
    ip_address: string | null;
    created_at: string | null;
    old_values: Record<string, unknown>;
    new_values: Record<string, unknown>;
}

// ── Config ────────────────────────────────────────────────────────────────────

const EVENT_CFG: Record<string, { label: string; icon: React.ReactNode; className: string; dot: string }> = {
    created:  {
        label: 'Created',
        icon: <PlusIcon className="size-4" />,
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
    },
    updated:  {
        label: 'Updated',
        icon: <RefreshCwIcon className="size-4" />,
        className: 'bg-blue-100 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
    },
    deleted:  {
        label: 'Deleted',
        icon: <MinusIcon className="size-4" />,
        className: 'bg-red-100 text-red-700 border-red-200',
        dot: 'bg-red-500',
    },
    restored: {
        label: 'Restored',
        icon: <CheckCircle2Icon className="size-4" />,
        className: 'bg-violet-100 text-violet-700 border-violet-200',
        dot: 'bg-violet-500',
    },
};

const FIELD_LABELS: Record<string, string> = {
    name: 'Name', email: 'Email', phone: 'Phone', status: 'Status',
    school_name: 'School Name', address: 'Address', city: 'City',
    province: 'Province', is_show_address: 'Show Address', logo: 'Logo',
    subscription_id: 'Subscription', subscription_name: 'Plan Name',
    subscription_amount: 'Amount', subscription_status: 'Plan Status',
    payment_log_id: 'Payment Log',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDt(date: string | null) {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
    });
}

function fieldLabel(key: string): string {
    return FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.length === 0 ? 'None' : value.join(', ');
    if (typeof value === 'number' && String(value).length > 4) {
        return Number(value).toLocaleString();
    }
    return String(value);
}

// ── Components ────────────────────────────────────────────────────────────────

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
            <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
                <div className="mt-0.5 text-sm font-medium">{value}</div>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ShowCustomerLog({ customer, log }: { customer: Customer; log: LogDetail }) {
    const evt = EVENT_CFG[log.event ?? ''] ?? {
        label: log.event ?? 'Unknown',
        icon: <RefreshCwIcon className="size-4" />,
        className: 'bg-gray-100 text-gray-500 border-gray-200',
        dot: 'bg-gray-400',
    };

    const hasOld  = Object.keys(log.old_values ?? {}).length > 0;
    const hasNew  = Object.keys(log.new_values ?? {}).length > 0;
    const allKeys = Array.from(new Set([
        ...Object.keys(log.old_values ?? {}),
        ...Object.keys(log.new_values ?? {}),
    ]));

    return (
        <>
            <Head title={`Log — ${customer.name}`} />

            <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">

                {/* Header */}
                <div className="flex items-start gap-3">
                    <Link
                        href={`/superadmin/customers/${customer.id}`}
                        className="hover:bg-accent border-input mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight">Activity Log</h1>
                            <Badge className={`${evt.className} gap-1 font-medium capitalize`} variant="outline">
                                {evt.icon}{evt.label}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                            <Link href={`/superadmin/customers/${customer.id}`} className="hover:underline">
                                {customer.name}
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Summary card */}
                <div className="rounded-xl border bg-card shadow-sm">
                    <div className="flex items-start gap-3 p-5">
                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${evt.className}`}>
                            {evt.icon}
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium">{log.summary}</p>
                            {log.detail && <p className="text-muted-foreground text-sm">{log.detail}</p>}
                            {log.notes && log.notes !== log.detail && (
                                <p className="text-muted-foreground text-xs italic">"{log.notes}"</p>
                            )}
                        </div>
                    </div>
                    <Separator />
                    <div className="grid gap-5 p-5 sm:grid-cols-2">
                        <MetaItem
                            icon={<UserIcon className="size-4" />}
                            label="Changed By"
                            value={log.changed_by_name ?? <span className="italic text-muted-foreground">System</span>}
                        />
                        <MetaItem
                            icon={<CheckCircle2Icon className="size-4" />}
                            label="Event"
                            value={
                                <Badge className={`${evt.className} gap-1 font-medium capitalize`} variant="outline">
                                    {evt.icon}{evt.label}
                                </Badge>
                            }
                        />
                        <MetaItem
                            icon={<ShieldAlertIcon className="size-4" />}
                            label="Date & Time"
                            value={fmtDt(log.created_at)}
                        />
                        {log.ip_address && (
                            <MetaItem
                                icon={<GlobeIcon className="size-4" />}
                                label="IP Address"
                                value={<span className="font-mono text-sm">{log.ip_address}</span>}
                            />
                        )}
                    </div>
                </div>

                {/* Diff table */}
                {(hasOld || hasNew) && (
                    <div className="rounded-xl border bg-card shadow-sm">
                        <div className="border-b px-5 py-4">
                            <p className="text-sm font-semibold">Changes</p>
                            <p className="text-muted-foreground text-xs">Field-by-field before and after comparison</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/40 border-b text-left">
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Field</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Before</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">After</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {allKeys.map((key) => {
                                        const oldVal = log.old_values?.[key];
                                        const newVal = log.new_values?.[key];
                                        const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
                                        return (
                                            <tr key={key} className={changed ? '' : 'opacity-50'}>
                                                <td className="text-muted-foreground px-4 py-3 text-xs font-medium whitespace-nowrap">
                                                    {fieldLabel(key)}
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    {key in (log.old_values ?? {}) ? (
                                                        <span className={`rounded px-1.5 py-0.5 ${changed ? 'bg-red-50 text-red-700' : 'text-muted-foreground'}`}>
                                                            {renderValue(oldVal)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    {key in (log.new_values ?? {}) ? (
                                                        <span className={`rounded px-1.5 py-0.5 ${changed ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-muted-foreground'}`}>
                                                            {renderValue(newVal)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
}

ShowCustomerLog.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Customers', href: '/superadmin/customers' },
        { title: 'Activity Log' },
    ],
};

import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    BadgeCheckIcon,
    CalendarIcon,
    CheckCircle2Icon,
    ClockIcon,
    CreditCardIcon,
    ImageIcon,
    LayersIcon,
    LogsIcon,
    MailIcon,
    MapPinIcon,
    PencilIcon,
    PhoneIcon,
    PlusIcon,
    SchoolIcon,
    TrendingUpIcon,
    XCircleIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// ── Types ─────────────────────────────────────────────────────────────────────

type CustomerStatus = 'active' | 'inactive' | 'suspended';
type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

interface Subscription {
    id: number;
    name: string;
    amount: string;
    allowed_questions: number;
    started_at: string;
    expired_at: string | null;
    duration: number;
    status: SubscriptionStatus;
}

interface PaymentLog {
    id: number;
    subscription_id: number | null;
    subscription_name: string | null;
    amount: string;
    payment_method: string | null;
    payment_method_label: string | null;
    status: string | null;
    status_label: string | null;
    account_number: string | null;
    notes: string | null;
    created_at: string | null;
    creator_name: string | null;
    reviewed_at: string | null;
    reviewer_name: string | null;
}

interface CustomerLog {
    id: number;
    event: string | null;
    summary: string;
    detail: string | null;
    created_at: string | null;
    href: string;
}

interface Customer {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    school_name: string | null;
    logo: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    is_show_address: boolean;
    status: CustomerStatus;
    created_at: string;
    subscriptions: Subscription[];
}

// ── Config ────────────────────────────────────────────────────────────────────

const CUST_STATUS: Record<CustomerStatus, { label: string; className: string; dot: string }> = {
    active:    { label: 'Active',    className: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    inactive:  { label: 'Inactive',  className: 'bg-gray-100 text-gray-600 border-gray-200',          dot: 'bg-gray-400' },
    suspended: { label: 'Suspended', className: 'bg-red-100 text-red-700 border-red-200',              dot: 'bg-red-500' },
};

const SUB_STATUS: Record<SubscriptionStatus, { label: string; className: string; icon: React.ReactNode }> = {
    active:    { label: 'Active',    className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2Icon className="size-3.5" /> },
    expired:   { label: 'Expired',   className: 'bg-gray-100 text-gray-500 border-gray-200',          icon: <ClockIcon className="size-3.5" /> },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600 border-red-200',              icon: <XCircleIcon className="size-3.5" /> },
};

const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
    pending_review: { label: 'Pending Review', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    reviewed:       { label: 'Reviewed',       className: 'bg-blue-100 text-blue-700 border-blue-200' },
    approved:       { label: 'Approved',       className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    rejected:       { label: 'Rejected',       className: 'bg-red-100 text-red-700 border-red-200' },
};

const AUDIT_DOT: Record<string, string> = {
    created:  'bg-emerald-500',
    updated:  'bg-blue-500',
    deleted:  'bg-red-500',
    restored: 'bg-violet-500',
};

const AUDIT_BADGE: Record<string, string> = {
    created:  'border-emerald-200 text-emerald-700',
    updated:  'border-blue-200 text-blue-700',
    deleted:  'border-red-200 text-red-700',
    restored: 'border-violet-200 text-violet-700',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDt(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
    });
}

function daysLeft(date: string | null): number | null {
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ icon, title, description, action, children }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                        {icon}
                    </div>
                    <div>
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="text-muted-foreground text-xs">{description}</p>
                    </div>
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

function StatCard({ icon, label, value, sub, iconBg }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    iconBg: string;
}) {
    return (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
                    <p className="mt-1.5 truncate text-2xl font-bold tracking-tight">{value}</p>
                    {sub && <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>}
                </div>
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

function ContactChip({ icon, value }: { icon: React.ReactNode; value: string }) {
    return (
        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <span className="size-4 shrink-0">{icon}</span>
            {value}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ShowCustomer({ customer, paymentLogs, customerLogs }: {
    customer: Customer;
    paymentLogs: PaymentLog[];
    customerLogs: CustomerLog[];
}) {
    const statusCfg = CUST_STATUS[customer.status];
    const logoUrl   = customer.logo ? `/storage/${customer.logo}` : null;
    const location  = [customer.city, customer.province].filter(Boolean).join(', ');
    const address   = customer.is_show_address ? customer.address : null;
    const activeSub = customer.subscriptions.find((s) => s.status === 'active');

    // Financial computations
    const totalPaid = paymentLogs
        .filter((l) => l.status === 'approved')
        .reduce((sum, l) => sum + parseFloat(l.amount), 0);

    const totalPending = paymentLogs
        .filter((l) => l.status === 'pending_review' || l.status === 'reviewed')
        .reduce((sum, l) => sum + parseFloat(l.amount), 0);

    // Paid amount per subscription (approved only)
    const paidBySub = new Map<number, number>();
    paymentLogs.forEach((l) => {
        if (l.status === 'approved' && l.subscription_id) {
            paidBySub.set(l.subscription_id, (paidBySub.get(l.subscription_id) ?? 0) + parseFloat(l.amount));
        }
    });

    const activeCount  = customer.subscriptions.filter((s) => s.status === 'active').length;
    const expiredCount = customer.subscriptions.filter((s) => s.status === 'expired').length;

    const activeDays = activeSub ? daysLeft(activeSub.expired_at) : null;

    return (
        <>
            <Head title={customer.name} />

            <div className="space-y-5 p-4 md:p-6">

                {/* ── Page Header ── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/superadmin/customers"
                            className="hover:bg-accent border-input flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                        >
                            <ArrowLeftIcon className="size-4" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">{customer.name}</h1>
                            <p className="text-muted-foreground text-sm">Customer profile</p>
                        </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="sm:shrink-0">
                        <Link href={`/superadmin/customers/${customer.id}/edit`}>
                            <PencilIcon className="size-4" /> Edit Customer
                        </Link>
                    </Button>
                </div>

                {/* ── Profile Card ── */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="bg-muted/20 border-b px-5 py-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                            <div className="bg-muted flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
                                {logoUrl ? (
                                    <img src={logoUrl} alt={customer.school_name ?? customer.name} className="size-full object-cover" />
                                ) : (
                                    <ImageIcon className="text-muted-foreground size-8" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-lg font-semibold tracking-tight">{customer.name}</h2>
                                    <Badge className={`${statusCfg.className} gap-1.5 font-medium`} variant="outline">
                                        <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                                        {statusCfg.label}
                                    </Badge>
                                </div>
                                {customer.school_name && (
                                    <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-sm">
                                        <SchoolIcon className="size-3.5 shrink-0" />
                                        {customer.school_name}
                                    </p>
                                )}
                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                                    <ContactChip icon={<MailIcon className="size-4" />} value={customer.email} />
                                    <ContactChip
                                        icon={<PhoneIcon className="size-4" />}
                                        value={customer.phone ?? 'Phone not provided'}
                                    />
                                    <ContactChip
                                        icon={<CalendarIcon className="size-4" />}
                                        value={`Joined ${fmt(customer.created_at)}`}
                                    />
                                    {location && (
                                        <ContactChip icon={<MapPinIcon className="size-4" />} value={location} />
                                    )}
                                </div>
                                {address && (
                                    <p className="text-muted-foreground mt-2 text-xs">
                                        <MapPinIcon className="mr-1 inline size-3.5" />{address}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Financial Stats ── */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        icon={<TrendingUpIcon className="size-4 text-emerald-600" />}
                        iconBg="bg-emerald-100"
                        label="Total Revenue"
                        value={`Rs. ${totalPaid.toLocaleString()}`}
                        sub="approved payments"
                    />
                    <StatCard
                        icon={<ClockIcon className="size-4 text-amber-600" />}
                        iconBg="bg-amber-100"
                        label="Pending Payments"
                        value={totalPending > 0 ? `Rs. ${totalPending.toLocaleString()}` : '—'}
                        sub="under review"
                    />
                    <StatCard
                        icon={<BadgeCheckIcon className="size-4 text-blue-600" />}
                        iconBg="bg-blue-100"
                        label="Active Plan"
                        value={activeSub ? activeSub.name : 'None'}
                        sub={
                            activeSub && activeDays !== null
                                ? activeDays <= 0
                                    ? 'Expired'
                                    : `${activeDays} days remaining`
                                : 'No active subscription'
                        }
                    />
                    <StatCard
                        icon={<LayersIcon className="size-4 text-violet-600" />}
                        iconBg="bg-violet-100"
                        label="Subscriptions"
                        value={`${customer.subscriptions.length}`}
                        sub={`${activeCount} active · ${expiredCount} expired`}
                    />
                </div>

                {/* ── Subscriptions ── */}
                <SectionCard
                    icon={<CalendarIcon className="size-4" />}
                    title="Subscriptions"
                    description={`${customer.subscriptions.length} plan${customer.subscriptions.length !== 1 ? 's' : ''} · click a row to view details`}
                    action={
                        <Button asChild size="sm" className="gap-1.5">
                            <Link href={`/superadmin/customers/${customer.id}/subscriptions/add`}>
                                <PlusIcon className="size-3.5" /> Add Subscription
                            </Link>
                        </Button>
                    }
                >
                    {/* Active plan highlight */}
                    {activeSub && (
                        <div className="border-b px-5 py-4">
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-700 text-xs font-medium">
                                            <CheckCircle2Icon className="size-3 mr-1" /> Active Plan
                                        </Badge>
                                        <p className="font-semibold text-sm">{activeSub.name}</p>
                                    </div>
                                    <Button asChild size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 sm:shrink-0">
                                        <Link href={`/superadmin/customers/${customer.id}/subscriptions/${activeSub.id}`}>
                                            View Details <ArrowRightIcon className="size-3.5" />
                                        </Link>
                                    </Button>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <div>
                                        <p className="text-muted-foreground text-xs">Amount</p>
                                        <p className="mt-0.5 font-semibold text-sm">Rs. {Number(activeSub.amount).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">Questions</p>
                                        <p className="mt-0.5 font-semibold text-sm">{activeSub.allowed_questions.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">Expires</p>
                                        <p className="mt-0.5 font-semibold text-sm">{fmt(activeSub.expired_at)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">Days Left</p>
                                        {activeDays !== null ? (
                                            <p className={`mt-0.5 font-semibold text-sm ${
                                                activeDays <= 0 ? 'text-red-600' :
                                                activeDays <= 7 ? 'text-red-500' :
                                                activeDays <= 14 ? 'text-amber-600' : ''
                                            }`}>
                                                {activeDays <= 0 ? 'Expired' : `${activeDays} days`}
                                            </p>
                                        ) : <p className="text-muted-foreground text-sm">—</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {customer.subscriptions.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-center">
                            <CalendarIcon className="size-8 opacity-20" />
                            <p className="text-sm">No subscriptions yet</p>
                            <Button asChild size="sm" variant="outline">
                                <Link href={`/superadmin/customers/${customer.id}/subscriptions/add`}>
                                    <PlusIcon className="size-3.5" /> Add First Subscription
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/40 border-b text-left">
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Plan</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Amount</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Paid</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Questions</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Duration</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Started</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Expires</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Status</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {customer.subscriptions.map((sub) => {
                                        const cfg  = SUB_STATUS[sub.status];
                                        const paid = paidBySub.get(sub.id) ?? 0;
                                        const subAmt = parseFloat(sub.amount);
                                        const days = daysLeft(sub.expired_at);
                                        return (
                                            <tr
                                                key={sub.id}
                                                className="hover:bg-muted/25 cursor-pointer transition-colors"
                                                onClick={() => { window.location.href = `/superadmin/customers/${customer.id}/subscriptions/${sub.id}`; }}
                                            >
                                                <td className="px-4 py-3 font-medium">
                                                    <Link
                                                        href={`/superadmin/customers/${customer.id}/subscriptions/${sub.id}`}
                                                        className="hover:text-primary transition-colors"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {sub.name}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 font-medium">
                                                    Rs. {Number(sub.amount).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {paid === 0 ? (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    ) : paid >= subAmt ? (
                                                        <span className="text-emerald-700 text-xs font-medium">
                                                            Rs. {paid.toLocaleString()} ✓
                                                        </span>
                                                    ) : (
                                                        <span className="text-amber-700 text-xs font-medium">
                                                            Rs. {paid.toLocaleString()} / {Number(sub.amount).toLocaleString()}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="text-muted-foreground px-4 py-3 tabular-nums text-xs">
                                                    {sub.allowed_questions.toLocaleString()}
                                                </td>
                                                <td className="text-muted-foreground px-4 py-3 text-xs">
                                                    {sub.duration}d
                                                </td>
                                                <td className="text-muted-foreground px-4 py-3 text-xs">
                                                    {fmt(sub.started_at)}
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    <p>{fmt(sub.expired_at)}</p>
                                                    {sub.status === 'active' && days !== null && days <= 30 && (
                                                        <p className={`mt-0.5 font-medium ${
                                                            days <= 0 ? 'text-red-600' :
                                                            days <= 7 ? 'text-red-500' :
                                                            'text-amber-600'
                                                        }`}>
                                                            {days <= 0 ? 'Expired' : `${days}d left`}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge className={`${cfg.className} gap-1 text-xs font-medium`} variant="outline">
                                                        {cfg.icon}{cfg.label}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={`/superadmin/customers/${customer.id}/subscriptions/${sub.id}`}
                                                        className="text-primary flex items-center gap-1 text-xs hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        View <ArrowRightIcon className="size-3" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SectionCard>

                {/* ── Payment History ── */}
                <SectionCard
                    icon={<CreditCardIcon className="size-4" />}
                    title="Payment History"
                    description={`${paymentLogs.length} record${paymentLogs.length !== 1 ? 's' : ''} across all subscriptions`}
                >
                    {paymentLogs.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center">
                            <CreditCardIcon className="size-8 opacity-20" />
                            <p className="text-sm">No payment records yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/40 border-b text-left">
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Date</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Plan</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Amount</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Method</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Account #</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Status</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Reviewed By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {paymentLogs.map((log) => {
                                        const sc = PAYMENT_STATUS[log.status ?? ''] ?? {
                                            label: log.status_label ?? '—',
                                            className: 'bg-gray-100 text-gray-500 border-gray-200',
                                        };
                                        return (
                                            <tr key={log.id} className="hover:bg-muted/25 align-top transition-colors">
                                                <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                    <p className="font-medium">{fmtDt(log.created_at)}</p>
                                                    {log.creator_name && (
                                                        <p className="text-muted-foreground">by {log.creator_name}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {log.subscription_id ? (
                                                        <Link
                                                            href={`/superadmin/customers/${customer.id}/subscriptions/${log.subscription_id}`}
                                                            className="text-primary text-sm font-medium hover:underline"
                                                        >
                                                            {log.subscription_name ?? '—'}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-sm font-medium">{log.subscription_name ?? '—'}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-semibold whitespace-nowrap">
                                                    Rs. {Number(log.amount).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm">{log.payment_method_label ?? '—'}</td>
                                                <td className="text-muted-foreground px-4 py-3 text-xs">{log.account_number ?? '—'}</td>
                                                <td className="px-4 py-3">
                                                    <Badge className={`${sc.className} text-xs font-medium`} variant="outline">
                                                        {sc.label}
                                                    </Badge>
                                                    {log.notes && (
                                                        <p className="text-muted-foreground mt-0.5 max-w-36 break-words text-xs">
                                                            {log.notes}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    {log.reviewer_name ? (
                                                        <div>
                                                            <p className="font-medium">{log.reviewer_name}</p>
                                                            {log.reviewed_at && (
                                                                <p className="text-muted-foreground">{fmt(log.reviewed_at)}</p>
                                                            )}
                                                        </div>
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
                    )}
                </SectionCard>

                {/* ── Activity Log ── */}
                <SectionCard
                    icon={<LogsIcon className="size-4" />}
                    title="Activity Log"
                    description={`${customerLogs.length} event${customerLogs.length !== 1 ? 's' : ''} recorded`}
                >
                    {customerLogs.length === 0 ? (
                        <div className="text-muted-foreground flex items-center gap-2 px-5 py-6 text-sm">
                            <LogsIcon className="size-4 opacity-20" /> No activity recorded yet
                        </div>
                    ) : (
                        <div className="divide-y">
                            {customerLogs.map((log) => {
                                const dot    = AUDIT_DOT[log.event ?? '']    ?? 'bg-gray-400';
                                const badge  = AUDIT_BADGE[log.event ?? '']  ?? 'border-gray-200 text-gray-500';
                                const evtLabel = (log.event ?? 'event').replace(/_/g, ' ');
                                return (
                                    <Link
                                        key={log.id}
                                        href={log.href}
                                        className="hover:bg-muted/25 flex items-center gap-3 px-5 py-3 transition-colors"
                                    >
                                        <div className={`size-2 shrink-0 rounded-full ${dot}`} />
                                        <Badge variant="outline" className={`shrink-0 text-xs font-medium capitalize ${badge}`}>
                                            {evtLabel}
                                        </Badge>
                                        <p className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
                                            {log.summary}
                                        </p>
                                        {log.detail && (
                                            <p className="text-muted-foreground hidden truncate text-xs lg:block lg:max-w-48">
                                                {log.detail}
                                            </p>
                                        )}
                                        <span className="text-muted-foreground shrink-0 text-xs">{fmt(log.created_at)}</span>
                                        <ArrowRightIcon className="text-muted-foreground size-3 shrink-0" />
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </SectionCard>

            </div>
        </>
    );
}

ShowCustomer.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Customers', href: '/superadmin/customers' },
        { title: 'View Customer' },
    ],
};

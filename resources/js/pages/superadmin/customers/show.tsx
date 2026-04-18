import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    BadgeCheckIcon,
    CalendarIcon,
    CheckCircle2Icon,
    ClockIcon,
    CreditCardIcon,
    HashIcon,
    LayersIcon,
    LogsIcon,
    MailIcon,
    MapPinIcon,
    PencilIcon,
    PhoneIcon,
    PlusIcon,
    SchoolIcon,
    TrendingUpIcon,
    WalletIcon,
    XCircleIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

const CUSTOMER_STATUS: Record<CustomerStatus, { label: string; className: string; dotClass: string }> = {
    active: {
        label: 'Active',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        dotClass: 'bg-emerald-500',
    },
    inactive: {
        label: 'Inactive',
        className: 'border-gray-200 bg-gray-50 text-gray-600',
        dotClass: 'bg-gray-400',
    },
    suspended: {
        label: 'Suspended',
        className: 'border-red-200 bg-red-50 text-red-700',
        dotClass: 'bg-red-500',
    },
};

const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, { label: string; className: string; icon: ReactNode }> = {
    active: {
        label: 'Active',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        icon: <CheckCircle2Icon className="size-3.5" />,
    },
    expired: {
        label: 'Expired',
        className: 'border-gray-200 bg-gray-50 text-gray-600',
        icon: <ClockIcon className="size-3.5" />,
    },
    cancelled: {
        label: 'Cancelled',
        className: 'border-red-200 bg-red-50 text-red-700',
        icon: <XCircleIcon className="size-3.5" />,
    },
};

const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
    pending_review: { label: 'Pending Review', className: 'border-amber-200 bg-amber-50 text-amber-700' },
    reviewed: { label: 'Reviewed', className: 'border-blue-200 bg-blue-50 text-blue-700' },
    approved: { label: 'Approved', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    rejected: { label: 'Rejected', className: 'border-red-200 bg-red-50 text-red-700' },
};

const AUDIT_STYLE: Record<string, { dotClass: string; badgeClass: string; label: string }> = {
    created: {
        dotClass: 'bg-emerald-500',
        badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        label: 'Created',
    },
    updated: {
        dotClass: 'bg-blue-500',
        badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
        label: 'Updated',
    },
    deleted: {
        dotClass: 'bg-red-500',
        badgeClass: 'border-red-200 bg-red-50 text-red-700',
        label: 'Deleted',
    },
    restored: {
        dotClass: 'bg-violet-500',
        badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
        label: 'Restored',
    },
};

function fmt(date: string | null): string {
    if (!date) {
        return '-';
    }

    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function fmtDt(date: string | null): string {
    if (!date) {
        return '-';
    }

    return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function money(amount: string | number): string {
    return `Rs. ${Number(amount).toLocaleString()}`;
}

function daysLeft(date: string | null): number | null {
    if (!date) {
        return null;
    }

    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function initials(value: string): string {
    return value
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

function ratio(part: number, whole: number): number {
    if (whole <= 0) {
        return 0;
    }

    return Math.max(0, Math.min((part / whole) * 100, 100));
}

function remainingDays(duration: number, expiredAt: string | null): number {
    const left = daysLeft(expiredAt);

    if (left === null) {
        return 0;
    }

    return Math.max(Math.min(left, duration), 0);
}

function timeBarClass(status: SubscriptionStatus): string {
    return status === 'cancelled'
        ? 'bg-red-400'
        : status === 'expired'
          ? 'bg-slate-400'
          : 'bg-gradient-to-r from-emerald-500 to-sky-500';
}

function paymentSentence(log: PaymentLog): string {
    const actor = log.creator_name ?? 'System';
    const verb = log.status === 'approved' ? 'received' : 'recorded';
    const method = log.payment_method_label ?? log.payment_method ?? 'unknown method';
    const subscription = log.subscription_name ?? 'subscription';

    return `${actor} ${verb} ${money(log.amount)} via ${method} for ${subscription}`;
}

function SectionShell({
    icon,
    title,
    meta,
    action,
    children,
}: {
    icon: ReactNode;
    title: string;
    meta?: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-2xl">
                        {icon}
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
                        {meta && <p className="text-muted-foreground text-xs">{meta}</p>}
                    </div>
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

function MetricCard({
    icon,
    label,
    value,
    meta,
    toneClass,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    meta?: string;
    toneClass: string;
}) {
    return (
        <div className="rounded-2xl border bg-background/90 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</p>
                    <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
                    {meta && <p className="text-muted-foreground mt-1 text-xs">{meta}</p>}
                </div>
                <div className={cn('flex size-10 items-center justify-center rounded-2xl', toneClass)}>{icon}</div>
            </div>
        </div>
    );
}

function DetailChip({ icon, value }: { icon: ReactNode; value: string }) {
    return (
        <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm">
            <span className="text-muted-foreground">{icon}</span>
            <span className="min-w-0 truncate">{value}</span>
        </div>
    );
}

function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
    const cfg = CUSTOMER_STATUS[status];

    return (
        <Badge variant="outline" className={cn('gap-1.5 font-medium', cfg.className)}>
            <span className={cn('size-1.5 rounded-full', cfg.dotClass)} />
            {cfg.label}
        </Badge>
    );
}

function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
    const cfg = SUBSCRIPTION_STATUS[status];

    return (
        <Badge variant="outline" className={cn('gap-1.5 font-medium', cfg.className)}>
            {cfg.icon}
            {cfg.label}
        </Badge>
    );
}

function PaymentStatusBadge({ status, label }: { status: string | null; label: string | null }) {
    if (!status) {
        return (
            <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-500">
                {label ?? '-'}
            </Badge>
        );
    }

    const cfg = PAYMENT_STATUS[status] ?? {
        label: label ?? status,
        className: 'border-gray-200 bg-gray-50 text-gray-500',
    };

    return (
        <Badge variant="outline" className={cn('font-medium', cfg.className)}>
            {cfg.label}
        </Badge>
    );
}

function EmptyState({
    icon,
    title,
    action,
}: {
    icon: ReactNode;
    title: string;
    action?: ReactNode;
}) {
    return (
        <div className="text-muted-foreground flex flex-col items-center gap-3 px-6 py-12 text-center">
            <div className="bg-muted flex size-14 items-center justify-center rounded-full">{icon}</div>
            <p className="text-sm">{title}</p>
            {action}
        </div>
    );
}

export default function ShowCustomer({
    customer,
    paymentLogs,
    customerLogs,
}: {
    customer: Customer;
    paymentLogs: PaymentLog[];
    customerLogs: CustomerLog[];
}) {
    const logoUrl = customer.logo ? `/storage/${customer.logo}` : null;
    const location = [customer.city, customer.province].filter(Boolean).join(', ');
    const address = customer.is_show_address ? customer.address : null;
    const activeSubscriptions = customer.subscriptions.filter((subscription) => subscription.status === 'active');
    const activeSub = activeSubscriptions[0] ?? null;

    const totalPaid = paymentLogs
        .filter((log) => log.status === 'approved')
        .reduce((sum, log) => sum + Number(log.amount), 0);

    const totalUnderReview = paymentLogs
        .filter((log) => log.status === 'pending_review' || log.status === 'reviewed')
        .reduce((sum, log) => sum + Number(log.amount), 0);

    const latestPayment = paymentLogs[0] ?? null;
    const latestActivity = customerLogs[0] ?? null;

    const paidBySubscription = new Map<number, number>();
    paymentLogs.forEach((log) => {
        if (log.subscription_id && log.status === 'approved') {
            paidBySubscription.set(log.subscription_id, (paidBySubscription.get(log.subscription_id) ?? 0) + Number(log.amount));
        }
    });

    const expiredCount = customer.subscriptions.filter((subscription) => subscription.status === 'expired').length;

    return (
        <>
            <Head title={customer.name} />

            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/superadmin/customers"
                            className="hover:bg-accent border-input flex size-10 items-center justify-center rounded-2xl border transition-colors"
                        >
                            <ArrowLeftIcon className="size-4" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
                            <p className="text-muted-foreground text-sm">{customer.school_name ?? customer.email}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/superadmin/customers/${customer.id}/edit`}>
                                <PencilIcon className="size-4" />
                                Edit
                            </Link>
                        </Button>
                        <Button asChild size="sm">
                            <Link href={`/superadmin/customers/${customer.id}/subscriptions/add`}>
                                <PlusIcon className="size-4" />
                                Add Subscription
                            </Link>
                        </Button>
                    </div>
                </div>

                <section className="overflow-hidden rounded-[28px] border bg-card shadow-sm">
                    <div className="bg-gradient-to-r from-emerald-50 via-white to-sky-50">
                        <div className="p-6 xl:p-7">
                            <div className="space-y-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                    <div className="bg-muted flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border">
                                        {logoUrl ? (
                                            <img
                                                src={logoUrl}
                                                alt={customer.school_name ?? customer.name}
                                                className="size-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex size-full items-center justify-center bg-slate-900 text-xl font-semibold text-white">
                                                {initials(customer.school_name ?? customer.name)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1 space-y-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-2xl font-semibold tracking-tight">{customer.name}</h2>
                                            <CustomerStatusBadge status={customer.status} />
                                        </div>

                                        {customer.school_name && (
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                                <SchoolIcon className="size-4" />
                                                <span>{customer.school_name}</span>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2">
                                            <DetailChip icon={<MailIcon className="size-4" />} value={customer.email} />
                                            <DetailChip
                                                icon={<PhoneIcon className="size-4" />}
                                                value={customer.phone ?? 'No phone'}
                                            />
                                            <DetailChip
                                                icon={<CalendarIcon className="size-4" />}
                                                value={`Joined ${fmt(customer.created_at)}`}
                                            />
                                            {location && (
                                                <DetailChip icon={<MapPinIcon className="size-4" />} value={location} />
                                            )}
                                        </div>

                                        {address && (
                                            <div className="rounded-2xl border border-border/70 bg-background/90 px-4 py-3 text-sm text-slate-700">
                                                <div className="flex items-start gap-2">
                                                    <MapPinIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                                                    <span>{address}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        <MetricCard
                                            icon={<TrendingUpIcon className="size-4 text-emerald-700" />}
                                            label="Received"
                                            value={money(totalPaid)}
                                            meta="Approved payments"
                                            toneClass="bg-emerald-100 text-emerald-700"
                                        />
                                        <MetricCard
                                            icon={<ClockIcon className="size-4 text-amber-700" />}
                                            label="Under Review"
                                            value={totalUnderReview > 0 ? money(totalUnderReview) : '-'}
                                            meta="Pending or reviewed"
                                            toneClass="bg-amber-100 text-amber-700"
                                        />
                                        <MetricCard
                                            icon={<BadgeCheckIcon className="size-4 text-blue-700" />}
                                            label="Active Plans"
                                            value={String(activeSubscriptions.length)}
                                            meta={activeSub ? activeSub.name : 'No active plan'}
                                            toneClass="bg-blue-100 text-blue-700"
                                        />
                                        <MetricCard
                                            icon={<LayersIcon className="size-4 text-violet-700" />}
                                            label="Plans"
                                            value={String(customer.subscriptions.length)}
                                            meta={`${expiredCount} expired`}
                                            toneClass="bg-violet-100 text-violet-700"
                                        />
                                    </div>

                                    <div className="grid gap-3 lg:grid-cols-2 hidden">
                                        <div className="rounded-2xl border bg-background/90 p-4 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-emerald-100 text-emerald-700 flex size-9 items-center justify-center rounded-2xl">
                                                    <CreditCardIcon className="size-4" />
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.16em]">
                                                        Latest Payment
                                                    </p>
                                                    <p className="text-muted-foreground mt-0.5 text-xs">
                                                        {latestPayment ? fmtDt(latestPayment.created_at) : 'No payments yet'}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="mt-3 text-sm leading-6 text-slate-700">
                                                {latestPayment ? paymentSentence(latestPayment) : 'No payment recorded yet.'}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border bg-background/90 p-4 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-blue-100 text-blue-700 flex size-9 items-center justify-center rounded-2xl">
                                                    <LogsIcon className="size-4" />
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.16em]">
                                                        Latest Activity
                                                    </p>
                                                    <p className="text-muted-foreground mt-0.5 text-xs">
                                                        {latestActivity ? fmtDt(latestActivity.created_at) : 'No activity yet'}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="mt-3 text-sm leading-6 text-slate-700">
                                                {latestActivity ? latestActivity.summary : 'No activity recorded yet.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
                    <div className="space-y-6">
                        <SectionShell
                            icon={<SchoolIcon className="size-4" />}
                            title="Subscriptions"
                            meta={`${customer.subscriptions.length} total`}
                            action={
                                <Button asChild size="sm">
                                    <Link href={`/superadmin/customers/${customer.id}/subscriptions/add`}>
                                        <PlusIcon className="size-4" />
                                        Add
                                    </Link>
                                </Button>
                            }
                        >
                            {customer.subscriptions.length === 0 ? (
                                <EmptyState
                                    icon={<SchoolIcon className="size-6 opacity-40" />}
                                    title="No subscriptions yet"
                                    action={
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/superadmin/customers/${customer.id}/subscriptions/add`}>
                                                <PlusIcon className="size-4" />
                                                Add First Subscription
                                            </Link>
                                        </Button>
                                    }
                                />
                            ) : (
                                <div className="space-y-4 p-5 sm:p-6">
                                    {customer.subscriptions.map((subscription) => {
                                        const paid = paidBySubscription.get(subscription.id) ?? 0;
                                        const timeLeft = remainingDays(subscription.duration, subscription.expired_at);
                                        const timeRatio = ratio(timeLeft, subscription.duration);
                                        const expiryDays = daysLeft(subscription.expired_at);

                                        return (
                                            <div key={subscription.id} className="rounded-3xl border bg-background px-5 py-4">
                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                    <div className="min-w-0 space-y-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-lg font-semibold">{subscription.name}</p>
                                                            <SubscriptionStatusBadge status={subscription.status} />
                                                        </div>

                                                        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                                            <span>{money(subscription.amount)}</span>
                                                            <span>Paid {money(paid)}</span>
                                                            <span className="flex items-center gap-1">
                                                                <HashIcon className="size-3.5" />
                                                                {subscription.allowed_questions.toLocaleString()}
                                                            </span>
                                                            <span>{subscription.duration} days</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                                        <Badge
                                                            variant="outline"
                                                            className="border-slate-200 bg-slate-50 text-slate-700"
                                                        >
                                                            {fmt(subscription.started_at)} to {fmt(subscription.expired_at)}
                                                        </Badge>
                                                        <Button asChild variant="outline" size="sm">
                                                            <Link href={`/superadmin/customers/${customer.id}/subscriptions/${subscription.id}`}>
                                                                View
                                                                <ArrowRightIcon className="size-4" />
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="mt-4 space-y-2">
                                                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                                        <span className="font-medium text-slate-700">
                                                            {expiryDays !== null && expiryDays > 0 ? `${timeLeft} days left` : 'Expired'}
                                                        </span>
                                                        <span className="text-muted-foreground">{timeLeft} / {subscription.duration} days</span>
                                                    </div>
                                                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className={cn('h-full rounded-full', timeBarClass(subscription.status))}
                                                            style={{ width: `${timeRatio}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </SectionShell>

                        <SectionShell
                            icon={<CreditCardIcon className="size-4" />}
                            title="Payments"
                            meta={`${paymentLogs.length} total`}
                        >
                            {paymentLogs.length === 0 ? (
                                <EmptyState
                                    icon={<WalletIcon className="size-6 opacity-40" />}
                                    title="No payments yet"
                                />
                            ) : (
                                <div className="divide-y p-3 sm:p-4">
                                    {paymentLogs.map((log) => (
                                        <div key={log.id} className="flex flex-col gap-2 rounded-2xl px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
                                                    <CreditCardIcon className="size-4" />
                                                </div>
                                                <p className="min-w-0 text-sm leading-6 text-slate-700 sm:truncate">
                                                    {paymentSentence(log)}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 pl-12 sm:pl-0">
                                                <PaymentStatusBadge status={log.status} label={log.status_label} />
                                                <span className="text-muted-foreground text-xs whitespace-nowrap">
                                                    {fmtDt(log.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SectionShell>
                    </div>

                    <SectionShell
                        icon={<LogsIcon className="size-4" />}
                        title="Activity"
                        meta={`${customerLogs.length} total`}
                    >
                        {customerLogs.length === 0 ? (
                            <EmptyState
                                icon={<LogsIcon className="size-6 opacity-40" />}
                                title="No activity yet"
                            />
                        ) : (
                            <div className="divide-y p-3 sm:p-4">
                                {customerLogs.map((log) => {
                                    const cfg = AUDIT_STYLE[log.event ?? ''] ?? {
                                        dotClass: 'bg-gray-400',
                                        badgeClass: 'border-gray-200 bg-gray-50 text-gray-600',
                                        label: log.event ? log.event.replace(/_/g, ' ') : 'Event',
                                    };

                                    return (
                                        <Link
                                            key={log.id}
                                            href={log.href}
                                            className="group flex flex-col gap-2 rounded-2xl px-3 py-3 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="flex min-w-0 items-start gap-3">
                                                <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
                                                    <span className={cn('size-2 rounded-full', cfg.dotClass)} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge variant="outline" className={cn('font-medium', cfg.badgeClass)}>
                                                            {cfg.label}
                                                        </Badge>
                                                        <p className="min-w-0 text-sm leading-6 text-slate-700 sm:truncate">
                                                            {log.summary}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pl-12 sm:pl-0">
                                                <span className="text-muted-foreground text-xs whitespace-nowrap">{fmtDt(log.created_at)}</span>
                                                <ArrowRightIcon className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                                            </div>
                                        </Link>
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

ShowCustomer.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Customers', href: '/superadmin/customers' },
        { title: 'View Customer' },
    ],
};

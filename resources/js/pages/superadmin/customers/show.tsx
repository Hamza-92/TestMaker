import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CalendarIcon,
    CheckCircle2Icon,
    ClockIcon,
    CreditCardIcon,
    HelpCircleIcon,
    ImageIcon,
    LogsIcon,
    MailIcon,
    MapPinIcon,
    PencilIcon,
    PhoneIcon,
    PlusIcon,
    SchoolIcon,
    UserIcon,
    XCircleIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

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

const CUSTOMER_STATUS_CONFIG: Record<CustomerStatus, { label: string; className: string; dot: string }> = {
    active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
    suspended: { label: 'Suspended', className: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
};

const SUB_STATUS_CONFIG: Record<SubscriptionStatus, { label: string; className: string; icon: React.ReactNode }> = {
    active: {
        label: 'Active',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: <CheckCircle2Icon className="size-3.5" />,
    },
    expired: {
        label: 'Expired',
        className: 'bg-gray-100 text-gray-500 border-gray-200',
        icon: <ClockIcon className="size-3.5" />,
    },
    cancelled: {
        label: 'Cancelled',
        className: 'bg-red-100 text-red-600 border-red-200',
        icon: <XCircleIcon className="size-3.5" />,
    },
};

const PAYMENT_STATUS_CONFIG: Record<string, string> = {
    pending_review: 'bg-amber-100 text-amber-700 border-amber-200',
    reviewed: 'bg-blue-100 text-blue-700 border-blue-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
};

const AUDIT_EVENT_CONFIG: Record<string, string> = {
    created: 'border-emerald-200 bg-emerald-500',
    updated: 'border-blue-200 bg-blue-500',
    deleted: 'border-red-200 bg-red-500',
    restored: 'border-violet-200 bg-violet-500',
};

function fmt(date: string) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(date: string | null) {
    if (!date) return '-';

    return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="text-muted-foreground mt-0.5 shrink-0 [&_svg]:size-4">{icon}</div>
            <div className="min-w-0">
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="mt-0.5 break-words text-sm font-medium">{value}</p>
            </div>
        </div>
    );
}

function SectionHeader({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
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

export default function ShowCustomer({
    customer,
    paymentLogs,
    customerLogs,
}: {
    customer: Customer;
    paymentLogs: PaymentLog[];
    customerLogs: CustomerLog[];
}) {
    const statusCfg = CUSTOMER_STATUS_CONFIG[customer.status];
    const logoUrl = customer.logo ? `/storage/${customer.logo}` : null;
    const location = [customer.city, customer.province].filter(Boolean).join(', ');
    const activeSub = customer.subscriptions.find((sub) => sub.status === 'active');
    const address = customer.is_show_address && customer.address ? customer.address : null;

    return (
        <>
            <Head title={customer.name} />

            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/superadmin/customers"
                            className="hover:bg-accent border-input flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                        >
                            <ArrowLeftIcon className="size-4" />
                        </Link>

                        <div>
                            <h1 className="h1-semibold">{customer.name}</h1>
                            <p className="text-muted-foreground text-sm">Customer profile</p>
                        </div>
                    </div>

                    <Button asChild variant="outline" className="sm:shrink-0">
                        <Link href={`/superadmin/customers/${customer.id}/edit`}>
                            <PencilIcon className="size-4" />
                            Edit Customer
                        </Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl border shadow-sm">
                    <div className="bg-muted/20 border-b p-5 md:p-6">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                            <div className="bg-muted flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border md:size-32">
                                {logoUrl ? (
                                    <img src={logoUrl} alt={customer.school_name ?? customer.name} className="size-full object-cover" />
                                ) : (
                                    <ImageIcon className="text-muted-foreground size-10" />
                                )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-3">
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-2xl font-semibold tracking-tight">{customer.name}</h2>
                                        <Badge className={`${statusCfg.className} gap-1.5 font-medium`} variant="outline">
                                            <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                                            {statusCfg.label}
                                        </Badge>
                                    </div>

                                    <p className="text-muted-foreground text-sm">
                                        {customer.school_name ?? 'School name not provided'}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                                    <div className="text-muted-foreground flex items-center gap-2">
                                        <MailIcon className="size-4" />
                                        <span>{customer.email}</span>
                                    </div>
                                    <div className="text-muted-foreground flex items-center gap-2">
                                        <PhoneIcon className="size-4" />
                                        <span>{customer.phone ?? 'Phone not available'}</span>
                                    </div>
                                    <div className="text-muted-foreground flex items-center gap-2">
                                        <CalendarIcon className="size-4" />
                                        <span>Joined {fmt(customer.created_at)}</span>
                                    </div>
                                    {location && (
                                        <div className="text-muted-foreground flex items-center gap-2">
                                            <MapPinIcon className="size-4" />
                                            <span>{location}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 p-5 md:p-6">
                        {/* <SectionHeader
                            icon={<UserIcon className="size-4" />}
                            title="Customer Details"
                            description="Account, school, and location information"
                        /> */}

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            <InfoRow icon={<MailIcon />} label="Email" value={customer.email} />
                            <InfoRow
                                icon={<PhoneIcon />}
                                label="Phone Number"
                                value={customer.phone ?? <span className="text-muted-foreground italic">Not available</span>}
                            />
                            <InfoRow icon={<CalendarIcon />} label="Joined" value={fmt(customer.created_at)} />
                            <InfoRow
                                icon={<SchoolIcon />}
                                label="School Name"
                                value={customer.school_name ?? <span className="text-muted-foreground italic">Not provided</span>}
                            />
                            <InfoRow
                                icon={<MapPinIcon />}
                                label="City"
                                value={customer.city ?? <span className="text-muted-foreground italic">Not provided</span>}
                            />
                            <InfoRow
                                icon={<MapPinIcon />}
                                label="Province"
                                value={customer.province ?? <span className="text-muted-foreground italic">Not provided</span>}
                            />
                            <InfoRow
                                icon={<MapPinIcon />}
                                label="Address"
                                value={address ?? <span className="text-muted-foreground italic">Not available</span>}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <SectionHeader
                            icon={<CalendarIcon className="size-4" />}
                            title="Subscriptions"
                            description="Current plan and full subscription history"
                        />

                        <Button asChild className="sm:shrink-0">
                            <Link href={`/superadmin/customers/${customer.id}/subscriptions/add`}>
                                <PlusIcon className="size-4" />
                                Add Subscription
                            </Link>
                        </Button>
                    </div>

                    {activeSub ? (
                        <>
                            <Separator />
                            <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2 xl:grid-cols-5">
                                <div>
                                    <p className="text-muted-foreground text-xs">Active Plan</p>
                                    <p className="mt-1 text-sm font-medium">{activeSub.name}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Amount</p>
                                    <p className="mt-1 text-sm font-medium">Rs. {Number(activeSub.amount).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Questions</p>
                                    <p className="mt-1 text-sm font-medium">{activeSub.allowed_questions.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Expires</p>
                                    <p className="mt-1 text-sm font-medium">{activeSub.expired_at ? fmt(activeSub.expired_at) : '-'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Status</p>
                                    <div className="mt-1">
                                        <Badge
                                            className={`${SUB_STATUS_CONFIG[activeSub.status].className} gap-1 font-medium`}
                                            variant="outline"
                                        >
                                            {SUB_STATUS_CONFIG[activeSub.status].icon}
                                            {SUB_STATUS_CONFIG[activeSub.status].label}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <Separator />
                            <div className="text-muted-foreground flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm">
                                <HelpCircleIcon className="size-4" />
                                <span>No active subscription</span>
                            </div>
                        </>
                    )}

                    <Separator />

                    {customer.subscriptions.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center">
                            <HelpCircleIcon className="size-8 opacity-30" />
                            <p className="text-sm">No subscriptions yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/40 border-b">
                                        <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">Plan</th>
                                        <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">Amount</th>
                                        <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">Questions</th>
                                        <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">Started</th>
                                        <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">Expires</th>
                                        <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {customer.subscriptions.map((sub) => {
                                        const cfg = SUB_STATUS_CONFIG[sub.status];

                                        return (
                                            <tr
                                                key={sub.id}
                                                className="hover:bg-muted/30 cursor-pointer transition-colors"
                                                onClick={() => window.location.href = `/superadmin/customers/${customer.id}/subscriptions/${sub.id}`}
                                            >
                                                <td className="px-3 py-2.5 font-medium">
                                                    <Link
                                                        href={`/superadmin/customers/${customer.id}/subscriptions/${sub.id}`}
                                                        className="hover:text-primary transition-colors"
                                                    >
                                                        {sub.name}
                                                    </Link>
                                                </td>
                                                <td className="text-muted-foreground px-3 py-2.5">
                                                    Rs. {Number(sub.amount).toLocaleString()}
                                                </td>
                                                <td className="text-muted-foreground px-3 py-2.5 tabular-nums">
                                                    {sub.allowed_questions.toLocaleString()}
                                                </td>
                                                <td className="text-muted-foreground px-3 py-2.5 tabular-nums">
                                                    {fmt(sub.started_at)}
                                                </td>
                                                <td className="text-muted-foreground px-3 py-2.5 tabular-nums">
                                                    {sub.expired_at ? fmt(sub.expired_at) : '-'}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <Badge className={`${cfg.className} gap-1 font-medium`} variant="outline">
                                                        {cfg.icon}
                                                        {cfg.label}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                    <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                        <SectionHeader
                            icon={<CreditCardIcon className="size-4" />}
                            title="Payment Logs"
                            description="Payment records related to this customer's subscriptions"
                        />

                        {paymentLogs.length === 0 ? (
                            <>
                                <Separator />
                                <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center">
                                    <HelpCircleIcon className="size-8 opacity-30" />
                                    <p className="text-sm">No payment logs yet</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <Separator />
                                <div className="overflow-x-auto rounded-xl border">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-muted/40 border-b">
                                                <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">Date</th>
                                                <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">Plan</th>
                                                <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">Amount</th>
                                                <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">Method</th>
                                                <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {paymentLogs.map((log) => {
                                                const statusClass = PAYMENT_STATUS_CONFIG[log.status ?? ''] ?? 'bg-gray-100 text-gray-600 border-gray-200';

                                                return (
                                                    <tr key={log.id} className="hover:bg-muted/30 align-top transition-colors">
                                                        <td className="text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                                                            {fmtDateTime(log.created_at)}
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="space-y-1">
                                                                <p className="font-medium">{log.subscription_name ?? '-'}</p>
                                                                {log.account_number && (
                                                                    <p className="text-muted-foreground text-xs">Acct: {log.account_number}</p>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5 font-medium">
                                                            Rs. {Number(log.amount).toLocaleString()}
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="space-y-1">
                                                                <p>{log.payment_method_label ?? '-'}</p>
                                                                {(log.creator_name || log.reviewer_name) && (
                                                                    <p className="text-muted-foreground text-xs">
                                                                        {log.creator_name ? `By ${log.creator_name}` : ''}
                                                                        {log.creator_name && log.reviewer_name ? ' · ' : ''}
                                                                        {log.reviewer_name ? `Reviewed by ${log.reviewer_name}` : ''}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="space-y-1">
                                                                <Badge className={`${statusClass} gap-1 font-medium`} variant="outline">
                                                                    {log.status_label ?? '-'}
                                                                </Badge>
                                                                {log.notes && (
                                                                    <p className="text-muted-foreground max-w-40 text-xs break-words">{log.notes}</p>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                        <SectionHeader
                            icon={<LogsIcon className="size-4" />}
                            title="Customer Logs"
                            description="Activity feed related to this customer record"
                        />

                        {customerLogs.length === 0 ? (
                            <>
                                <Separator />
                                <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center">
                                    <HelpCircleIcon className="size-8 opacity-30" />
                                    <p className="text-sm">No customer logs yet</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <Separator />
                                <div className="space-y-3">
                                    {customerLogs.map((log) => {
                                        const eventClass = AUDIT_EVENT_CONFIG[log.event ?? ''] ?? 'border-gray-200 bg-gray-400';

                                        return (
                                            <Link
                                                key={log.id}
                                                href={log.href}
                                                className="hover:bg-muted/30 block rounded-xl border p-4 transition-colors"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`mt-1 size-2.5 shrink-0 rounded-full ${eventClass}`} />
                                                    <div className="min-w-0 flex-1 space-y-1.5">
                                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                                            <p className="text-sm font-medium leading-6">{log.summary}</p>
                                                            <p className="text-muted-foreground shrink-0 text-xs">
                                                                {fmtDateTime(log.created_at)}
                                                            </p>
                                                        </div>
                                                        {log.detail && (
                                                            <p className="text-muted-foreground text-sm leading-6">
                                                                {log.detail}
                                                            </p>
                                                        )}
                                                        <p className="text-primary text-xs font-medium">
                                                            View details
                                                        </p>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
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

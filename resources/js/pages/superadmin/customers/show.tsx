import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CalendarIcon,
    CheckCircle2Icon,
    ClockIcon,
    HelpCircleIcon,
    ImageIcon,
    MailIcon,
    MapPinIcon,
    SchoolIcon,
    UserIcon,
    XCircleIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// ─── Types ────────────────────────────────────────────────────────────────────
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

interface Customer {
    id: number;
    name: string;
    email: string;
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

// ─── Constants ────────────────────────────────────────────────────────────────
const CUSTOMER_STATUS_CONFIG: Record<CustomerStatus, { label: string; className: string; dot: string }> = {
    active:    { label: 'Active',    className: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    inactive:  { label: 'Inactive',  className: 'bg-gray-100 text-gray-600 border-gray-200',         dot: 'bg-gray-400'    },
    suspended: { label: 'Suspended', className: 'bg-red-100 text-red-700 border-red-200',             dot: 'bg-red-500'     },
};

const SUB_STATUS_CONFIG: Record<SubscriptionStatus, { label: string; className: string; icon: React.ReactNode }> = {
    active:    { label: 'Active',    className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2Icon className="size-3.5" /> },
    expired:   { label: 'Expired',   className: 'bg-gray-100 text-gray-500 border-gray-200',          icon: <ClockIcon className="size-3.5" />        },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600 border-red-200',             icon: <XCircleIcon className="size-3.5" />      },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(date: string) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="text-muted-foreground mt-0.5 shrink-0 [&_svg]:size-4">{icon}</div>
            <div className="min-w-0">
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="mt-0.5 text-sm font-medium break-words">{value}</p>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ShowCustomer({ customer }: { customer: Customer }) {
    const statusCfg = CUSTOMER_STATUS_CONFIG[customer.status];
    const logoUrl   = customer.logo ? `/storage/${customer.logo}` : null;
    const location  = [customer.city, customer.province].filter(Boolean).join(', ');
    const activeSub = customer.subscriptions.find((s) => s.status === 'active');

    return (
        <>
            <Head title={customer.name} />
            <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">

                {/* ── Header ──────────────────────────────────────────────── */}
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

                <div className="grid gap-5 lg:grid-cols-3">

                    {/* ── Left column ─────────────────────────────────────── */}
                    <div className="space-y-5 lg:col-span-1">

                        {/* Profile card */}
                        <div className="rounded-xl border p-5 shadow-sm">
                            <div className="flex flex-col items-center gap-3 text-center">
                                {/* School logo or fallback */}
                                <div className="bg-muted flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt={customer.school_name ?? customer.name} className="size-full object-cover" />
                                    ) : (
                                        <ImageIcon className="text-muted-foreground size-8" />
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <p className="font-semibold">{customer.name}</p>
                                    {customer.school_name && (
                                        <p className="text-muted-foreground text-sm">{customer.school_name}</p>
                                    )}
                                </div>

                                <Badge className={`${statusCfg.className} gap-1.5 font-medium`} variant="outline">
                                    <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                                    {statusCfg.label}
                                </Badge>
                            </div>

                            <Separator className="my-4" />

                            <div className="space-y-3">
                                <InfoRow icon={<MailIcon />}     label="Email"   value={customer.email} />
                                <InfoRow icon={<CalendarIcon />} label="Joined"  value={fmt(customer.created_at)} />
                                {location && (
                                    <InfoRow icon={<MapPinIcon />} label="Location" value={location} />
                                )}
                            </div>
                        </div>

                        {/* Active subscription quick-glance */}
                        {activeSub && (
                            <div className="rounded-xl border p-5 shadow-sm">
                                <p className="mb-3 text-sm font-medium">Active Subscription</p>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Plan</span>
                                        <span className="font-medium">{activeSub.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Amount</span>
                                        <span className="font-medium">Rs. {Number(activeSub.amount).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Questions</span>
                                        <span className="font-medium">{activeSub.allowed_questions.toLocaleString()}</span>
                                    </div>
                                    {activeSub.expired_at && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Expires</span>
                                            <span className="font-medium">{fmt(activeSub.expired_at)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Right column ────────────────────────────────────── */}
                    <div className="space-y-5 lg:col-span-2">

                        {/* Account details */}
                        <div className="space-y-4 rounded-xl border p-5 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                                    <UserIcon className="size-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Account Details</p>
                                    <p className="text-muted-foreground text-xs">Login and identity information</p>
                                </div>
                            </div>
                            <Separator />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <InfoRow icon={<UserIcon />}     label="Full Name" value={customer.name} />
                                <InfoRow icon={<MailIcon />}     label="Email"     value={customer.email} />
                                <InfoRow icon={<CalendarIcon />} label="Joined"    value={fmt(customer.created_at)} />
                            </div>
                        </div>

                        {/* School & Location */}
                        <div className="space-y-4 rounded-xl border p-5 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                                    <SchoolIcon className="size-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">School & Location</p>
                                    <p className="text-muted-foreground text-xs">School details and geographic information</p>
                                </div>
                            </div>
                            <Separator />
                            <div className="grid gap-4 sm:grid-cols-2">
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
                                {customer.is_show_address && customer.address && (
                                    <InfoRow
                                        icon={<MapPinIcon />}
                                        label="Address"
                                        value={customer.address}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Subscriptions */}
                        <div className="space-y-4 rounded-xl border p-5 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                                    <CalendarIcon className="size-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Subscriptions</p>
                                    <p className="text-muted-foreground text-xs">All subscription history</p>
                                </div>
                            </div>
                            <Separator />

                            {customer.subscriptions.length === 0 ? (
                                <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center">
                                    <HelpCircleIcon className="size-8 opacity-30" />
                                    <p className="text-sm">No subscriptions yet</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
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
                                                    <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                                                        <td className="px-3 py-2.5 font-medium">{sub.name}</td>
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
                                                            {sub.expired_at ? fmt(sub.expired_at) : '—'}
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

                    </div>
                </div>
            </div>
        </>
    );
}

ShowCustomer.layout = {
    breadcrumbs: [
        { title: 'Dashboard',  href: '/dashboard' },
        { title: 'Customers',  href: '/superadmin/customers' },
        { title: 'View Customer' },
    ],
};

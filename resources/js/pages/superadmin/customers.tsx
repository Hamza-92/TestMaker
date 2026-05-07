import { Head, Link } from '@inertiajs/react';
import {
    BanknoteIcon,
    CalendarIcon,
    CheckCircle2Icon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
    Clock3Icon,
    CoinsIcon,
    EyeIcon,
    MailIcon,
    MapPinIcon,
    PencilIcon,
    SchoolIcon,
    SearchIcon,
    SlidersHorizontalIcon,
    UserIcon,
    UsersIcon,
    WalletIcon,
    XCircleIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import PlusIcon from '@/components/icons/PlusIcon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type AccountStatus = 'active' | 'inactive' | 'suspended';
type SubscriptionStatus = 'active' | 'expired' | 'cancelled';
type PlanState = 'active' | 'near_expiry' | 'expired' | 'cancelled' | 'no_plan';

interface SubscriptionSummary {
    id: number;
    name: string;
    amount: string;
    started_at: string | null;
    expired_at: string | null;
    duration: number;
    status: SubscriptionStatus;
    days_to_expiry: number | null;
}

interface Customer {
    id: number;
    name: string;
    email: string;
    school_name: string | null;
    logo: string | null;
    city: string | null;
    province: string | null;
    status: AccountStatus;
    created_at: string;
    subscription_count: number;
    plan_state: PlanState;
    subscription: SubscriptionSummary | null;
    total_paid: string;
    total_pending: string;
    total_dues: string;
    my_commission: string;
    next_payment_date: string | null;
    is_my_customer: boolean;
}

type ColumnKey =
    | 'customer'
    | 'email'
    | 'school'
    | 'location'
    | 'account_status'
    | 'plan'
    | 'plan_status'
    | 'expires'
    | 'dues'
    | 'next_payment'
    | 'pending'
    | 'commission'
    | 'joined'
    | 'actions';

const PAGE_SIZE_OPTIONS = [10, 20, 30];

const ALL_COLUMNS: ColumnKey[] = [
    'customer', 'email', 'school', 'location', 'account_status',
    'plan', 'plan_status', 'expires', 'dues', 'next_payment',
    'pending', 'commission', 'joined', 'actions',
];

const COLUMN_LABELS: Record<ColumnKey, string> = {
    customer: 'Customer',
    email: 'Email',
    school: 'School',
    location: 'Location',
    account_status: 'Account Status',
    plan: 'Plan',
    plan_status: 'Plan Status',
    expires: 'Expires',
    dues: 'Dues',
    next_payment: 'Next Payment',
    pending: 'Under Review',
    commission: 'My Commission',
    joined: 'Joined',
    actions: 'Actions',
};

const ACCOUNT_STATUS_CONFIG: Record<AccountStatus, { label: string; className: string }> = {
    active: { label: 'Active', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    inactive: { label: 'Inactive', className: 'border-gray-200 bg-gray-50 text-gray-600' },
    suspended: { label: 'Suspended', className: 'border-red-200 bg-red-50 text-red-700' },
};

const PLAN_STATE_CONFIG: Record<PlanState, { label: string; className: string }> = {
    active: { label: 'Active', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    near_expiry: { label: 'Near Expiry', className: 'border-amber-200 bg-amber-50 text-amber-700' },
    expired: { label: 'Expired', className: 'border-red-200 bg-red-50 text-red-700' },
    cancelled: { label: 'Cancelled', className: 'border-slate-200 bg-slate-50 text-slate-700' },
    no_plan: { label: 'No Plan', className: 'border-gray-200 bg-gray-50 text-gray-500' },
};

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
    customer: true,
    email: false,
    school: true,
    location: false,
    account_status: false,
    plan: true,
    plan_status: true,
    expires: true,
    dues: true,
    next_payment: true,
    pending: false,
    commission: false,
    joined: false,
    actions: true,
};

const ACTION_BUTTON_CLASS =
    'text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors';

function initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function fmt(date: string | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function money(amount: string | number): string {
    return `Rs. ${Number(amount).toLocaleString()}`;
}

function expiryLabel(customer: Customer): string {
    const subscription = customer.subscription;
    if (!subscription?.expired_at) return customer.plan_state === 'no_plan' ? 'No plan' : '-';
    const days = subscription.days_to_expiry;
    if (customer.plan_state === 'cancelled') return 'Cancelled';
    if (days === null) return fmt(subscription.expired_at);
    if (days < 0) {
        const d = Math.abs(days);
        return d === 0 ? 'Expired today' : `Expired ${d}d ago`;
    }
    if (days === 0) return 'Expires today';
    return `${days}d left`;
}

function ActionIconLink({ href, icon, label, className }: { href: string; icon: ReactNode; label: string; className?: string }) {
    return (
        <Link href={href} className={cn(ACTION_BUTTON_CLASS, className)} aria-label={label} title={label}>
            {icon}
        </Link>
    );
}

function SummaryCard({ label, value, icon, iconClassName, valueClassName }: {
    label: string; value: number; icon: ReactNode; iconClassName: string; valueClassName: string;
}) {
    return (
        <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</p>
                    <p className={cn('mt-2 text-2xl font-semibold tracking-tight', valueClassName)}>{value}</p>
                </div>
                <div className={cn('flex size-9 items-center justify-center rounded-2xl', iconClassName)}>{icon}</div>
            </div>
        </div>
    );
}

function FinancialStat({ icon, label, value, className }: { icon: ReactNode; label: string; value: string; className?: string }) {
    return (
        <div className={cn('flex items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-sm', className)}>
            <span className="text-muted-foreground [&_svg]:size-3.5">{icon}</span>
            <span className="text-muted-foreground text-xs">{label}</span>
            <span className="text-sm font-semibold">{value}</span>
        </div>
    );
}

export default function Customers({ customers }: { customers: Customer[] }) {
    const [tab, setTab] = useState<'all' | 'mine'>('all');
    const [search, setSearch] = useState('');
    const [accountStatusFilter, setAccountStatusFilter] = useState<string>('all');
    const [planFilter, setPlanFilter] = useState<string>('all');
    const [joinedFrom, setJoinedFrom] = useState('');
    const [joinedTo, setJoinedTo] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);

    const myCount = useMemo(() => customers.filter((c) => c.is_my_customer).length, [customers]);

    const tabCustomers = useMemo(
        () => (tab === 'mine' ? customers.filter((c) => c.is_my_customer) : customers),
        [customers, tab],
    );

    const summary = useMemo(() => ({
        total: tabCustomers.length,
        active: tabCustomers.filter((c) => c.plan_state === 'active').length,
        near_expiry: tabCustomers.filter((c) => c.plan_state === 'near_expiry').length,
        expired: tabCustomers.filter((c) => c.plan_state === 'expired').length,
    }), [tabCustomers]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return tabCustomers.filter((customer) => {
            const location = [customer.city, customer.province].filter(Boolean).join(', ').toLowerCase();
            const planName = customer.subscription?.name?.toLowerCase() ?? '';
            const createdAt = customer.created_at.slice(0, 10);
            const matchesSearch = !query ||
                customer.name.toLowerCase().includes(query) ||
                customer.email.toLowerCase().includes(query) ||
                (customer.school_name ?? '').toLowerCase().includes(query) ||
                location.includes(query) ||
                planName.includes(query);
            const matchesAccountStatus = accountStatusFilter === 'all' || customer.status === accountStatusFilter;
            const matchesPlanState = planFilter === 'all' || customer.plan_state === planFilter;
            const matchesJoinedFrom = !joinedFrom || createdAt >= joinedFrom;
            const matchesJoinedTo = !joinedTo || createdAt <= joinedTo;
            return matchesSearch && matchesAccountStatus && matchesPlanState && matchesJoinedFrom && matchesJoinedTo;
        });
    }, [tabCustomers, search, accountStatusFilter, planFilter, joinedFrom, joinedTo]);

    const financials = useMemo(() => ({
        totalDues: filtered.reduce((s, c) => s + Number(c.total_dues), 0),
        totalPending: filtered.reduce((s, c) => s + Number(c.total_pending), 0),
        totalCommission: filtered.reduce((s, c) => s + Number(c.my_commission), 0),
    }), [filtered]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));
    const toggleCol = (col: ColumnKey) => setVisibleCols((c) => ({ ...c, [col]: !c[col] }));

    const handleSearch = (value: string) => { setSearch(value); setPage(1); };
    const handleTab = (next: 'all' | 'mine') => { setTab(next); setPage(1); };

    const clearFilters = () => {
        setSearch(''); setAccountStatusFilter('all'); setPlanFilter('all');
        setJoinedFrom(''); setJoinedTo(''); setPage(1);
    };

    const hasActiveFilters = search !== '' || accountStatusFilter !== 'all' || planFilter !== 'all' || joinedFrom !== '' || joinedTo !== '';

    return (
        <>
            <Head title="Customers" />

            <div className="space-y-5 p-4 md:p-6">
                {/* Page header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="h1-semibold">Customers</h1>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                            {filtered.length} shown / {customers.length} total
                        </p>
                    </div>
                    <Link
                        href="/superadmin/customers/add"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors"
                    >
                        <PlusIcon size={16} color="currentColor" />
                        <span className="hidden sm:inline">Add Customer</span>
                    </Link>
                </div>

                {/* Tab toggle */}
                <div className="flex items-center gap-1 rounded-xl border bg-card p-1 shadow-sm w-fit">
                    <button
                        type="button"
                        onClick={() => handleTab('all')}
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                            tab === 'all'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                        )}
                    >
                        <UsersIcon className="size-4" />
                        All Customers
                        <span className={cn(
                            'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                            tab === 'all' ? 'bg-white/20' : 'bg-muted',
                        )}>
                            {customers.length}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTab('mine')}
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                            tab === 'mine'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                        )}
                    >
                        <UserIcon className="size-4" />
                        My Customers
                        <span className={cn(
                            'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                            tab === 'mine' ? 'bg-white/20' : 'bg-muted',
                        )}>
                            {myCount}
                        </span>
                    </button>
                </div>

                {/* Plan-state summary cards */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard label="Total" value={summary.total} icon={<UsersIcon className="size-4" />}
                        iconClassName="bg-slate-100 text-slate-700" valueClassName="text-slate-900" />
                    <SummaryCard label="Active" value={summary.active} icon={<CheckCircle2Icon className="size-4" />}
                        iconClassName="bg-emerald-100 text-emerald-700" valueClassName="text-emerald-700" />
                    <SummaryCard label="Near Expiry" value={summary.near_expiry} icon={<Clock3Icon className="size-4" />}
                        iconClassName="bg-amber-100 text-amber-700" valueClassName="text-amber-700" />
                    <SummaryCard label="Expired" value={summary.expired} icon={<XCircleIcon className="size-4" />}
                        iconClassName="bg-red-100 text-red-700" valueClassName="text-red-700" />
                </div>

                {/* Financial strip */}
                <div className="flex flex-wrap gap-2">
                    <FinancialStat
                        icon={<WalletIcon />}
                        label="Outstanding"
                        value={financials.totalDues > 0 ? money(financials.totalDues) : 'Settled'}
                        className={financials.totalDues > 0 ? 'border-rose-200' : 'border-emerald-200'}
                    />
                    <FinancialStat
                        icon={<Clock3Icon />}
                        label="Under Review"
                        value={financials.totalPending > 0 ? money(financials.totalPending) : '-'}
                        className="border-amber-200"
                    />
                    <FinancialStat
                        icon={<CoinsIcon />}
                        label="My Commission"
                        value={financials.totalCommission > 0 ? money(financials.totalCommission) : '-'}
                        className="border-violet-200"
                    />
                </div>

                {/* Filters */}
                <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[220px] flex-1">
                            <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input placeholder="Search customer, school, email, plan" value={search}
                                onChange={(e) => handleSearch(e.target.value)} className="pl-9" />
                        </div>

                        <Select value={accountStatusFilter} onValueChange={(v) => { setAccountStatusFilter(v); setPage(1); }}>
                            <SelectTrigger className="w-40"><SelectValue placeholder="Account" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Accounts</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
                            <SelectTrigger className="w-44"><SelectValue placeholder="Plan" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Plans</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="near_expiry">Near Expiry</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                <SelectItem value="no_plan">No Plan</SelectItem>
                            </SelectContent>
                        </Select>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="outline" className="gap-1.5">
                                    <SlidersHorizontalIcon className="size-4" />
                                    Columns
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                {ALL_COLUMNS.filter((c) => c !== 'actions').map((col) => (
                                    <DropdownMenuCheckboxItem key={col} checked={visibleCols[col]}
                                        onCheckedChange={() => toggleCol(col)}>
                                        {COLUMN_LABELS[col]}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap items-end gap-2">
                        <div className="w-full sm:w-auto">
                            <p className="text-muted-foreground mb-1 text-xs font-medium">Joined From</p>
                            <Input type="date" value={joinedFrom} onChange={(e) => { setJoinedFrom(e.target.value); setPage(1); }} className="w-full sm:w-40" />
                        </div>
                        <div className="w-full sm:w-auto">
                            <p className="text-muted-foreground mb-1 text-xs font-medium">Joined To</p>
                            <Input type="date" value={joinedTo} onChange={(e) => { setJoinedTo(e.target.value); setPage(1); }} className="w-full sm:w-40" />
                        </div>
                        <div className="w-full sm:w-auto">
                            <p className="text-muted-foreground mb-1 text-xs font-medium">Rows</p>
                            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                                <SelectTrigger className="w-full sm:w-24"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PAGE_SIZE_OPTIONS.map((o) => <SelectItem key={o} value={String(o)}>{o}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="ml-auto">
                            {hasActiveFilters && (
                                <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/40 border-b text-left">
                                    {visibleCols.customer && (
                                        <th className="px-4 py-3 font-medium">
                                            <div className="text-muted-foreground flex items-center gap-1.5">
                                                <UserIcon className="size-3.5" /> Customer
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.email && (
                                        <th className="px-4 py-3 font-medium">
                                            <div className="text-muted-foreground flex items-center gap-1.5">
                                                <MailIcon className="size-3.5" /> Email
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.school && (
                                        <th className="px-4 py-3 font-medium">
                                            <div className="text-muted-foreground flex items-center gap-1.5">
                                                <SchoolIcon className="size-3.5" /> School
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.location && (
                                        <th className="px-4 py-3 font-medium">
                                            <div className="text-muted-foreground flex items-center gap-1.5">
                                                <MapPinIcon className="size-3.5" /> Location
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.account_status && (
                                        <th className="text-muted-foreground px-4 py-3 font-medium">Account</th>
                                    )}
                                    {visibleCols.plan && (
                                        <th className="text-muted-foreground px-4 py-3 font-medium">Plan</th>
                                    )}
                                    {visibleCols.plan_status && (
                                        <th className="text-muted-foreground px-4 py-3 font-medium">Plan Status</th>
                                    )}
                                    {visibleCols.expires && (
                                        <th className="px-4 py-3 font-medium">
                                            <div className="text-muted-foreground flex items-center gap-1.5">
                                                <Clock3Icon className="size-3.5" /> Expiry
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.dues && (
                                        <th className="px-4 py-3 font-medium">
                                            <div className="text-muted-foreground flex items-center gap-1.5">
                                                <WalletIcon className="size-3.5" /> Dues
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.next_payment && (
                                        <th className="px-4 py-3 font-medium">
                                            <div className="text-muted-foreground flex items-center gap-1.5">
                                                <CalendarIcon className="size-3.5" /> Next Payment
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.pending && (
                                        <th className="px-4 py-3 font-medium">
                                            <div className="text-muted-foreground flex items-center gap-1.5">
                                                <BanknoteIcon className="size-3.5" /> Under Review
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.commission && (
                                        <th className="px-4 py-3 font-medium">
                                            <div className="text-muted-foreground flex items-center gap-1.5">
                                                <CoinsIcon className="size-3.5" /> Commission
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.joined && (
                                        <th className="px-4 py-3 font-medium">
                                            <div className="text-muted-foreground flex items-center gap-1.5">
                                                <CalendarIcon className="size-3.5" /> Joined
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.actions && <th className="px-4 py-3 font-medium" />}
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={ALL_COLUMNS.filter((c) => visibleCols[c]).length}
                                            className="text-muted-foreground px-4 py-16 text-center">
                                            <SearchIcon className="mx-auto mb-3 size-8 opacity-30" />
                                            No customers found
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((customer) => {
                                        const location = [customer.city, customer.province].filter(Boolean).join(', ');
                                        const logoUrl = customer.logo ? `/storage/${customer.logo}` : null;
                                        const accountStatus = ACCOUNT_STATUS_CONFIG[customer.status];
                                        const planState = PLAN_STATE_CONFIG[customer.plan_state];
                                        const subscription = customer.subscription;
                                        const dues = Number(customer.total_dues);
                                        const pending = Number(customer.total_pending);
                                        const commission = Number(customer.my_commission);

                                        return (
                                            <tr key={customer.id} className="hover:bg-muted/20 transition-colors">
                                                {visibleCols.customer && (
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border">
                                                                {logoUrl ? (
                                                                    <img src={logoUrl} alt={customer.school_name ?? customer.name} className="size-full object-cover" />
                                                                ) : (
                                                                    <span className="text-xs font-semibold">{initials(customer.school_name ?? customer.name)}</span>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <Link href={`/superadmin/customers/${customer.id}`}
                                                                    className="hover:text-primary font-medium transition-colors">
                                                                    {customer.name}
                                                                </Link>
                                                                <p className="text-muted-foreground text-xs">
                                                                    {customer.subscription_count} plan{customer.subscription_count !== 1 ? 's' : ''}
                                                                    {customer.is_my_customer && (
                                                                        <span className="ml-1.5 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">mine</span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                )}

                                                {visibleCols.email && (
                                                    <td className="text-muted-foreground px-4 py-3">{customer.email}</td>
                                                )}

                                                {visibleCols.school && (
                                                    <td className="px-4 py-3">
                                                        <span className="font-medium">
                                                            {customer.school_name ?? <span className="text-muted-foreground italic">-</span>}
                                                        </span>
                                                    </td>
                                                )}

                                                {visibleCols.location && (
                                                    <td className="text-muted-foreground px-4 py-3">
                                                        {location || <span className="italic">-</span>}
                                                    </td>
                                                )}

                                                {visibleCols.account_status && (
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline" className={cn('font-medium', accountStatus.className)}>
                                                            {accountStatus.label}
                                                        </Badge>
                                                    </td>
                                                )}

                                                {visibleCols.plan && (
                                                    <td className="px-4 py-3">
                                                        {subscription ? (
                                                            <div>
                                                                <p className="font-medium">{subscription.name}</p>
                                                                <p className="text-muted-foreground text-xs">{money(subscription.amount)}</p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground italic">No plan</span>
                                                        )}
                                                    </td>
                                                )}

                                                {visibleCols.plan_status && (
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline" className={cn('font-medium', planState.className)}>
                                                            {planState.label}
                                                        </Badge>
                                                    </td>
                                                )}

                                                {visibleCols.expires && (
                                                    <td className="px-4 py-3">
                                                        {subscription?.expired_at ? (
                                                            <div>
                                                                <p className={cn('font-medium',
                                                                    customer.plan_state === 'expired' && 'text-red-600',
                                                                    customer.plan_state === 'near_expiry' && 'text-amber-700',
                                                                )}>
                                                                    {expiryLabel(customer)}
                                                                </p>
                                                                <p className="text-muted-foreground text-xs">{fmt(subscription.expired_at)}</p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground italic">-</span>
                                                        )}
                                                    </td>
                                                )}

                                                {visibleCols.dues && (
                                                    <td className="px-4 py-3">
                                                        {dues > 0 ? (
                                                            <span className="font-semibold text-rose-600">{money(dues)}</span>
                                                        ) : (
                                                            <span className="text-xs font-medium text-emerald-600">Settled</span>
                                                        )}
                                                    </td>
                                                )}

                                                {visibleCols.next_payment && (
                                                    <td className="px-4 py-3">
                                                        {customer.next_payment_date ? (
                                                            <div>
                                                                <p className="font-medium text-amber-700">{fmt(customer.next_payment_date)}</p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground italic text-xs">-</span>
                                                        )}
                                                    </td>
                                                )}

                                                {visibleCols.pending && (
                                                    <td className="px-4 py-3">
                                                        {pending > 0 ? (
                                                            <span className="font-medium text-amber-700">{money(pending)}</span>
                                                        ) : (
                                                            <span className="text-muted-foreground italic text-xs">-</span>
                                                        )}
                                                    </td>
                                                )}

                                                {visibleCols.commission && (
                                                    <td className="px-4 py-3">
                                                        {commission > 0 ? (
                                                            <span className="font-semibold text-violet-700">{money(commission)}</span>
                                                        ) : (
                                                            <span className="text-muted-foreground italic text-xs">-</span>
                                                        )}
                                                    </td>
                                                )}

                                                {visibleCols.joined && (
                                                    <td className="text-muted-foreground px-4 py-3">{fmt(customer.created_at)}</td>
                                                )}

                                                {visibleCols.actions && (
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <ActionIconLink href={`/superadmin/customers/${customer.id}`}
                                                                icon={<EyeIcon className="size-4" />} label="View customer" />
                                                            <ActionIconLink href={`/superadmin/customers/${customer.id}/edit`}
                                                                icon={<PencilIcon className="size-4" />} label="Edit customer" />
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="bg-muted/20 flex items-center justify-between border-t px-4 py-3">
                        <p className="text-muted-foreground text-xs">
                            {filtered.length === 0
                                ? 'No results'
                                : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}`}
                        </p>
                        <div className="flex items-center gap-1">
                            <button onClick={() => goTo(1)} disabled={safePage === 1}
                                className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30" title="First page">
                                <ChevronsLeftIcon className="size-4" />
                            </button>
                            <button onClick={() => goTo(safePage - 1)} disabled={safePage === 1}
                                className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30" title="Previous">
                                <ChevronLeftIcon className="size-4" />
                            </button>
                            <div className="flex items-center gap-1 px-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                                    .reduce<(number | 'ellipsis')[]>((acc, n, i, arr) => {
                                        if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('ellipsis');
                                        acc.push(n);
                                        return acc;
                                    }, [])
                                    .map((item, i) =>
                                        item === 'ellipsis' ? (
                                            <span key={`e-${i}`} className="text-muted-foreground px-1 text-xs">…</span>
                                        ) : (
                                            <button key={item} onClick={() => goTo(item as number)}
                                                className={cn('min-w-[28px] rounded px-2 py-1 text-xs font-medium transition-colors',
                                                    safePage === item ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
                                                {item}
                                            </button>
                                        ),
                                    )}
                            </div>
                            <button onClick={() => goTo(safePage + 1)} disabled={safePage === totalPages}
                                className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30" title="Next">
                                <ChevronRightIcon className="size-4" />
                            </button>
                            <button onClick={() => goTo(totalPages)} disabled={safePage === totalPages}
                                className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30" title="Last page">
                                <ChevronsRightIcon className="size-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

Customers.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Customers', href: '/superadmin/customers' },
    ],
};

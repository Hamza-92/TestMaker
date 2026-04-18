import { Head, Link } from '@inertiajs/react';
import {
    CalendarIcon,
    CheckCircle2Icon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
    Clock3Icon,
    EyeIcon,
    MailIcon,
    MapPinIcon,
    PencilIcon,
    SchoolIcon,
    SearchIcon,
    SlidersHorizontalIcon,
    UserIcon,
    UsersIcon,
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
    | 'joined'
    | 'actions';

const PAGE_SIZE_OPTIONS = [10, 20, 30];

const ALL_COLUMNS: ColumnKey[] = [
    'customer',
    'email',
    'school',
    'location',
    'account_status',
    'plan',
    'plan_status',
    'expires',
    'joined',
    'actions',
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

const SUMMARY_CARD_CONFIG: Array<{
    key: 'total' | 'active' | 'near_expiry' | 'expired';
    label: string;
    icon: ReactNode;
    iconClassName: string;
    valueClassName: string;
}> = [
    {
        key: 'total',
        label: 'Total',
        icon: <UsersIcon className="size-4" />,
        iconClassName: 'bg-slate-100 text-slate-700',
        valueClassName: 'text-slate-900',
    },
    {
        key: 'active',
        label: 'Active',
        icon: <CheckCircle2Icon className="size-4" />,
        iconClassName: 'bg-emerald-100 text-emerald-700',
        valueClassName: 'text-emerald-700',
    },
    {
        key: 'near_expiry',
        label: 'Near Expiry',
        icon: <Clock3Icon className="size-4" />,
        iconClassName: 'bg-amber-100 text-amber-700',
        valueClassName: 'text-amber-700',
    },
    {
        key: 'expired',
        label: 'Expired',
        icon: <XCircleIcon className="size-4" />,
        iconClassName: 'bg-red-100 text-red-700',
        valueClassName: 'text-red-700',
    },
];

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
    customer: true,
    email: false,
    school: true,
    location: false,
    account_status: false,
    plan: true,
    plan_status: true,
    expires: true,
    joined: false,
    actions: true,
};

const ACTION_BUTTON_CLASS =
    'text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors';

function initials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('');
}

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

function money(amount: string | number): string {
    return `Rs. ${Number(amount).toLocaleString()}`;
}

function expiryLabel(customer: Customer): string {
    const subscription = customer.subscription;

    if (!subscription?.expired_at) {
        return customer.plan_state === 'no_plan' ? 'No plan' : '-';
    }

    const days = subscription.days_to_expiry;

    if (customer.plan_state === 'cancelled') {
        return 'Cancelled';
    }

    if (days === null) {
        return fmt(subscription.expired_at);
    }

    if (days < 0) {
        const expiredDays = Math.abs(days);

        return expiredDays === 0 ? 'Expired today' : `Expired ${expiredDays}d ago`;
    }

    if (days === 0) {
        return 'Expires today';
    }

    return `${days}d left`;
}

function ActionIconLink({
    href,
    icon,
    label,
    className,
}: {
    href: string;
    icon: ReactNode;
    label: string;
    className?: string;
}) {
    return (
        <Link href={href} className={cn(ACTION_BUTTON_CLASS, className)} aria-label={label} title={label}>
            {icon}
        </Link>
    );
}

function SummaryCard({
    label,
    value,
    icon,
    iconClassName,
    valueClassName,
}: {
    label: string;
    value: number;
    icon: ReactNode;
    iconClassName: string;
    valueClassName: string;
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

export default function Customers({
    customers,
}: {
    customers: Customer[];
}) {
    const [search, setSearch] = useState('');
    const [accountStatusFilter, setAccountStatusFilter] = useState<string>('all');
    const [planFilter, setPlanFilter] = useState<string>('all');
    const [joinedFrom, setJoinedFrom] = useState('');
    const [joinedTo, setJoinedTo] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);

    const summary = useMemo(
        () => ({
            total: customers.length,
            active: customers.filter((customer) => customer.plan_state === 'active').length,
            near_expiry: customers.filter((customer) => customer.plan_state === 'near_expiry').length,
            expired: customers.filter((customer) => customer.plan_state === 'expired').length,
        }),
        [customers],
    );

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();

        return customers.filter((customer) => {
            const location = [customer.city, customer.province].filter(Boolean).join(', ').toLowerCase();
            const planName = customer.subscription?.name?.toLowerCase() ?? '';
            const createdAt = customer.created_at.slice(0, 10);

            const matchesSearch =
                !query ||
                customer.name.toLowerCase().includes(query) ||
                customer.email.toLowerCase().includes(query) ||
                (customer.school_name ?? '').toLowerCase().includes(query) ||
                location.includes(query) ||
                planName.includes(query);

            const matchesAccountStatus =
                accountStatusFilter === 'all' || customer.status === accountStatusFilter;

            const matchesPlanState = planFilter === 'all' || customer.plan_state === planFilter;

            const matchesJoinedFrom = !joinedFrom || createdAt >= joinedFrom;
            const matchesJoinedTo = !joinedTo || createdAt <= joinedTo;

            return (
                matchesSearch &&
                matchesAccountStatus &&
                matchesPlanState &&
                matchesJoinedFrom &&
                matchesJoinedTo
            );
        });
    }, [customers, search, accountStatusFilter, planFilter, joinedFrom, joinedTo]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    const goTo = (nextPage: number) => setPage(Math.min(Math.max(1, nextPage), totalPages));

    const toggleCol = (col: ColumnKey) =>
        setVisibleCols((current) => ({ ...current, [col]: !current[col] }));

    const handleSearch = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    const clearFilters = () => {
        setSearch('');
        setAccountStatusFilter('all');
        setPlanFilter('all');
        setJoinedFrom('');
        setJoinedTo('');
        setPage(1);
    };

    const hasActiveFilters =
        search !== '' ||
        accountStatusFilter !== 'all' ||
        planFilter !== 'all' ||
        joinedFrom !== '' ||
        joinedTo !== '';

    return (
        <>
            <Head title="Customers" />

            <div className="space-y-5 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="h1-semibold">Customers</h1>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                            {filtered.length} shown
                            <span className="mx-1">/</span>
                            {customers.length} total
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

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {SUMMARY_CARD_CONFIG.map((card) => (
                        <SummaryCard
                            key={card.key}
                            label={card.label}
                            value={summary[card.key]}
                            icon={card.icon}
                            iconClassName={card.iconClassName}
                            valueClassName={card.valueClassName}
                        />
                    ))}
                </div>

                <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[220px] flex-1">
                            <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                placeholder="Search customer, school, email, plan"
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select
                            value={accountStatusFilter}
                            onValueChange={(value) => {
                                setAccountStatusFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Account" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Accounts</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={planFilter}
                            onValueChange={(value) => {
                                setPlanFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="Plan" />
                            </SelectTrigger>
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
                                {ALL_COLUMNS.filter((column) => column !== 'actions').map((column) => (
                                    <DropdownMenuCheckboxItem
                                        key={column}
                                        checked={visibleCols[column]}
                                        onCheckedChange={() => toggleCol(column)}
                                    >
                                        {COLUMN_LABELS[column]}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap items-end gap-2">
                        <div className="w-full sm:w-auto">
                            <p className="text-muted-foreground mb-1 text-xs font-medium">Joined From</p>
                            <Input
                                type="date"
                                value={joinedFrom}
                                onChange={(e) => {
                                    setJoinedFrom(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full sm:w-40"
                            />
                        </div>

                        <div className="w-full sm:w-auto">
                            <p className="text-muted-foreground mb-1 text-xs font-medium">Joined To</p>
                            <Input
                                type="date"
                                value={joinedTo}
                                onChange={(e) => {
                                    setJoinedTo(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full sm:w-40"
                            />
                        </div>

                        <div className="w-full sm:w-auto">
                            <p className="text-muted-foreground mb-1 text-xs font-medium">Rows</p>
                            <Select
                                value={String(pageSize)}
                                onValueChange={(value) => {
                                    setPageSize(Number(value));
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-full sm:w-24">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAGE_SIZE_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={String(option)}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="ml-auto flex flex-wrap items-center gap-2">
                            {hasActiveFilters && (
                                <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/40 border-b text-left">
                                    {visibleCols.customer && (
                                        <th className="px-4 py-3 font-medium">
                                            <div className="text-muted-foreground flex items-center gap-1.5">
                                                <UserIcon className="size-3.5" />
                                                Customer
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.email && (
                                        <th className="px-4 py-3 font-medium">
                                            <div className="text-muted-foreground flex items-center gap-1.5">
                                                <MailIcon className="size-3.5" />
                                                Email
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.school && (
                                        <th className="px-4 py-3 font-medium">
                                            <div className="text-muted-foreground flex items-center gap-1.5">
                                                <SchoolIcon className="size-3.5" />
                                                School
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.location && (
                                        <th className="px-4 py-3 font-medium">
                                            <div className="text-muted-foreground flex items-center gap-1.5">
                                                <MapPinIcon className="size-3.5" />
                                                Location
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.account_status && (
                                        <th className="text-muted-foreground px-4 py-3 font-medium">Account</th>
                                    )}
                                    {visibleCols.plan && <th className="text-muted-foreground px-4 py-3 font-medium">Plan</th>}
                                    {visibleCols.plan_status && (
                                        <th className="text-muted-foreground px-4 py-3 font-medium">Plan Status</th>
                                    )}
                                    {visibleCols.expires && (
                                        <th className="px-4 py-3 font-medium">
                                            <div className="text-muted-foreground flex items-center gap-1.5">
                                                <Clock3Icon className="size-3.5" />
                                                Expiry
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.joined && (
                                        <th className="px-4 py-3 font-medium">
                                            <div className="text-muted-foreground flex items-center gap-1.5">
                                                <CalendarIcon className="size-3.5" />
                                                Joined
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.actions && <th className="px-4 py-3 font-medium" />}
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={ALL_COLUMNS.filter((column) => visibleCols[column]).length}
                                            className="text-muted-foreground px-4 py-16 text-center"
                                        >
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
                                        const joinedAt = fmt(customer.created_at);
                                        const expiryText = expiryLabel(customer);

                                        return (
                                            <tr key={customer.id} className="hover:bg-muted/20 transition-colors">
                                                {visibleCols.customer && (
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border">
                                                                {logoUrl ? (
                                                                    <img
                                                                        src={logoUrl}
                                                                        alt={customer.school_name ?? customer.name}
                                                                        className="size-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <span className="text-xs font-semibold">
                                                                        {initials(customer.school_name ?? customer.name)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <Link
                                                                    href={`/superadmin/customers/${customer.id}`}
                                                                    className="hover:text-primary font-medium transition-colors"
                                                                >
                                                                    {customer.name}
                                                                </Link>
                                                                <p className="text-muted-foreground text-xs">
                                                                    {customer.subscription_count} plan{customer.subscription_count !== 1 ? 's' : ''}
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
                                                                <p
                                                                    className={cn(
                                                                        'font-medium',
                                                                        customer.plan_state === 'expired' && 'text-red-600',
                                                                        customer.plan_state === 'near_expiry' && 'text-amber-700',
                                                                    )}
                                                                >
                                                                    {expiryText}
                                                                </p>
                                                                <p className="text-muted-foreground text-xs">
                                                                    {fmt(subscription.expired_at)}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground italic">-</span>
                                                        )}
                                                    </td>
                                                )}

                                                {visibleCols.joined && (
                                                    <td className="text-muted-foreground px-4 py-3">{joinedAt}</td>
                                                )}

                                                {visibleCols.actions && (
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <ActionIconLink
                                                                href={`/superadmin/customers/${customer.id}`}
                                                                icon={<EyeIcon className="size-4" />}
                                                                label="View customer"
                                                            />
                                                            <ActionIconLink
                                                                href={`/superadmin/customers/${customer.id}/edit`}
                                                                icon={<PencilIcon className="size-4" />}
                                                                label="Edit customer"
                                                            />
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

                    <div className="bg-muted/20 flex items-center justify-between border-t px-4 py-3">
                        <p className="text-muted-foreground text-xs">
                            {filtered.length === 0
                                ? 'No results'
                                : `${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}`}
                        </p>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => goTo(1)}
                                disabled={safePage === 1}
                                className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30"
                                title="First page"
                            >
                                <ChevronsLeftIcon className="size-4" />
                            </button>
                            <button
                                onClick={() => goTo(safePage - 1)}
                                disabled={safePage === 1}
                                className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30"
                                title="Previous"
                            >
                                <ChevronLeftIcon className="size-4" />
                            </button>

                            <div className="flex items-center gap-1 px-1">
                                {Array.from({ length: totalPages }, (_, index) => index + 1)
                                    .filter((item) => item === 1 || item === totalPages || Math.abs(item - safePage) <= 1)
                                    .reduce<(number | 'ellipsis')[]>((acc, item, index, arr) => {
                                        if (index > 0 && item - (arr[index - 1] as number) > 1) {
                                            acc.push('ellipsis');
                                        }

                                        acc.push(item);

                                        return acc;
                                    }, [])
                                    .map((item, index) =>
                                        item === 'ellipsis' ? (
                                            <span key={`ellipsis-${index}`} className="text-muted-foreground px-1 text-xs">
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                key={item}
                                                onClick={() => goTo(item as number)}
                                                className={cn(
                                                    'min-w-[28px] rounded px-2 py-1 text-xs font-medium transition-colors',
                                                    safePage === item
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'hover:bg-accent',
                                                )}
                                            >
                                                {item}
                                            </button>
                                        ),
                                    )}
                            </div>

                            <button
                                onClick={() => goTo(safePage + 1)}
                                disabled={safePage === totalPages}
                                className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30"
                                title="Next"
                            >
                                <ChevronRightIcon className="size-4" />
                            </button>
                            <button
                                onClick={() => goTo(totalPages)}
                                disabled={safePage === totalPages}
                                className="hover:bg-accent rounded p-1.5 transition-colors disabled:opacity-30"
                                title="Last page"
                            >
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

import { Head } from '@inertiajs/react';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
    EllipsisIcon,
    MailIcon,
    PencilIcon,
    PhoneIcon,
    SearchIcon,
    SlidersHorizontalIcon,
    Trash2Icon,
    UserIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import PlusIcon from '@/components/icons/PlusIcon';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = 'active' | 'inactive' | 'pending' | 'banned';

interface Customer {
    id: number;
    name: string;
    email: string;
    phone: string;
    status: Status;
    plan: string;
    joinedAt: string;
    avatar: string;
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────
const CUSTOMERS: Customer[] = [
    { id: 1,  name: 'Alice Johnson',   email: 'alice@example.com',   phone: '+1 555-0101', status: 'active',   plan: 'Pro',      joinedAt: '2024-01-15', avatar: 'AJ' },
    { id: 2,  name: 'Bob Martinez',    email: 'bob@example.com',     phone: '+1 555-0102', status: 'inactive', plan: 'Basic',    joinedAt: '2024-02-03', avatar: 'BM' },
    { id: 3,  name: 'Carol White',     email: 'carol@example.com',   phone: '+1 555-0103', status: 'active',   plan: 'Enterprise', joinedAt: '2024-02-18', avatar: 'CW' },
    { id: 4,  name: 'David Brown',     email: 'david@example.com',   phone: '+1 555-0104', status: 'pending',  plan: 'Pro',      joinedAt: '2024-03-07', avatar: 'DB' },
    { id: 5,  name: 'Eva Garcia',      email: 'eva@example.com',     phone: '+1 555-0105', status: 'active',   plan: 'Basic',    joinedAt: '2024-03-22', avatar: 'EG' },
    { id: 6,  name: 'Frank Lee',       email: 'frank@example.com',   phone: '+1 555-0106', status: 'banned',   plan: 'Basic',    joinedAt: '2024-04-01', avatar: 'FL' },
    { id: 7,  name: 'Grace Kim',       email: 'grace@example.com',   phone: '+1 555-0107', status: 'active',   plan: 'Enterprise', joinedAt: '2024-04-14', avatar: 'GK' },
    { id: 8,  name: 'Hank Wilson',     email: 'hank@example.com',    phone: '+1 555-0108', status: 'inactive', plan: 'Pro',      joinedAt: '2024-05-05', avatar: 'HW' },
    { id: 9,  name: 'Iris Taylor',     email: 'iris@example.com',    phone: '+1 555-0109', status: 'active',   plan: 'Pro',      joinedAt: '2024-05-19', avatar: 'IT' },
    { id: 10, name: 'Jake Anderson',   email: 'jake@example.com',    phone: '+1 555-0110', status: 'pending',  plan: 'Basic',    joinedAt: '2024-06-02', avatar: 'JA' },
    { id: 11, name: 'Karen Thomas',    email: 'karen@example.com',   phone: '+1 555-0111', status: 'active',   plan: 'Enterprise', joinedAt: '2024-06-15', avatar: 'KT' },
    { id: 12, name: 'Leo Harris',      email: 'leo@example.com',     phone: '+1 555-0112', status: 'active',   plan: 'Pro',      joinedAt: '2024-07-01', avatar: 'LH' },
    { id: 13, name: 'Mia Clark',       email: 'mia@example.com',     phone: '+1 555-0113', status: 'inactive', plan: 'Basic',    joinedAt: '2024-07-20', avatar: 'MC' },
    { id: 14, name: 'Noah Lewis',      email: 'noah@example.com',    phone: '+1 555-0114', status: 'active',   plan: 'Pro',      joinedAt: '2024-08-08', avatar: 'NL' },
    { id: 15, name: 'Olivia Walker',   email: 'olivia@example.com',  phone: '+1 555-0115', status: 'banned',   plan: 'Basic',    joinedAt: '2024-08-25', avatar: 'OW' },
    { id: 16, name: 'Paul Hall',       email: 'paul@example.com',    phone: '+1 555-0116', status: 'active',   plan: 'Enterprise', joinedAt: '2024-09-10', avatar: 'PH' },
    { id: 17, name: 'Quinn Young',     email: 'quinn@example.com',   phone: '+1 555-0117', status: 'pending',  plan: 'Pro',      joinedAt: '2024-09-28', avatar: 'QY' },
    { id: 18, name: 'Rachel Allen',    email: 'rachel@example.com',  phone: '+1 555-0118', status: 'active',   plan: 'Basic',    joinedAt: '2024-10-15', avatar: 'RA' },
    { id: 19, name: 'Sam Scott',       email: 'sam@example.com',     phone: '+1 555-0119', status: 'inactive', plan: 'Enterprise', joinedAt: '2024-11-02', avatar: 'SS' },
    { id: 20, name: 'Tina Adams',      email: 'tina@example.com',    phone: '+1 555-0120', status: 'active',   plan: 'Pro',      joinedAt: '2024-11-18', avatar: 'TA' },
];

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
    active:   { label: 'Active',   className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400' },
    pending:  { label: 'Pending',  className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400' },
    banned:   { label: 'Banned',   className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400' },
};

const PLAN_COLORS: Record<string, string> = {
    Basic:      'bg-slate-100 text-slate-600 border-slate-200',
    Pro:        'bg-blue-100 text-blue-700 border-blue-200',
    Enterprise: 'bg-purple-100 text-purple-700 border-purple-200',
};

const AVATAR_COLORS = [
    'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-fuchsia-500', 'bg-indigo-500',
];

const PAGE_SIZE_OPTIONS = [5, 10, 20];

const ALL_COLUMNS = ['customer', 'email', 'phone', 'plan', 'status', 'joined', 'actions'] as const;
type ColumnKey = (typeof ALL_COLUMNS)[number];

const COLUMN_LABELS: Record<ColumnKey, string> = {
    customer: 'Customer',
    email:    'Email',
    phone:    'Phone',
    plan:     'Plan',
    status:   'Status',
    joined:   'Joined',
    actions:  'Actions',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Customers() {
    const [search, setSearch]           = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [pageSize, setPageSize]       = useState(10);
    const [page, setPage]               = useState(1);
    const [selected, setSelected]       = useState<number[]>([]);
    const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>({
        customer: true, email: true, phone: true, plan: true,
        status: true, joined: true, actions: true,
    });

    // ── Filter + Search ──────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return CUSTOMERS.filter((c) => {
            const matchesSearch =
                !q ||
                c.name.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q) ||
                c.phone.includes(q);
            const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [search, statusFilter]);

    // ── Pagination ───────────────────────────────────────────────────────────
    const totalPages   = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage     = Math.min(page, totalPages);
    const paginated    = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
    const pageIds      = paginated.map((c) => c.id);
    const allSelected  = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
    const someSelected = pageIds.some((id) => selected.includes(id));

    const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

    const toggleSelect = (id: number) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const toggleAll = () =>
        setSelected((prev) =>
            allSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])],
        );

    const toggleCol = (col: ColumnKey) =>
        setVisibleCols((prev) => ({ ...prev, [col]: !prev[col] }));

    const handleStatusChange = (val: string) => { setStatusFilter(val); setPage(1); };
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); };

    return (
        <>
            <Head title="Customers" />
            <div className="space-y-5 p-4 md:p-6">

                {/* ── Page Header ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="h1-semibold">Customers</h1>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                            {filtered.length} total
                            {selected.length > 0 && (
                                <span className="text-primary ml-1 font-medium">· {selected.length} selected</span>
                            )}
                        </p>
                    </div>
                    <button className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors">
                        <PlusIcon size={16} color="currentColor" />
                        <span className="hidden sm:inline">Add Customer</span>
                    </button>
                </div>

                {/* ── Filter Container ────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-2">

                    {/* Search */}
                    <div className="relative min-w-[200px] flex-1">
                        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            placeholder="Search customers…"
                            value={search}
                            onChange={handleSearch}
                            className="pl-9"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={handleStatusChange}>
                            <SelectTrigger className="w-36 gap-1.5">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="banned">Banned</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Column Visibility */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="border-input bg-background hover:bg-accent flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm shadow-xs transition-colors">
                                    <SlidersHorizontalIcon className="size-4" />
                                    <span className="hidden sm:inline">Columns</span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wide">
                                    Toggle columns
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {(ALL_COLUMNS.filter((c) => c !== 'actions') as ColumnKey[]).map((col) => (
                                    <DropdownMenuCheckboxItem
                                        key={col}
                                        checked={visibleCols[col]}
                                        onCheckedChange={() => toggleCol(col)}
                                    >
                                        {COLUMN_LABELS[col]}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Page Size */}
                        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                            <SelectTrigger className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAGE_SIZE_OPTIONS.map((n) => (
                                    <SelectItem key={n} value={String(n)}>{n} / pg</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* ── Table ───────────────────────────────────────────────── */}
                <div className="overflow-hidden rounded-xl border shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/40 border-b">
                                    <th className="w-10 px-4 py-3">
                                        <Checkbox
                                            checked={allSelected}
                                            data-state={someSelected && !allSelected ? 'indeterminate' : undefined}
                                            onCheckedChange={toggleAll}
                                        />
                                    </th>
                                    {visibleCols.customer && (
                                        <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                                            <div className="flex items-center gap-1.5">
                                                <UserIcon className="size-3.5" />
                                                Customer
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.email && (
                                        <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                                            <div className="flex items-center gap-1.5">
                                                <MailIcon className="size-3.5" />
                                                Email
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.phone && (
                                        <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                                            <div className="flex items-center gap-1.5">
                                                <PhoneIcon className="size-3.5" />
                                                Phone
                                            </div>
                                        </th>
                                    )}
                                    {visibleCols.plan && (
                                        <th className="text-muted-foreground px-4 py-3 text-left font-medium">Plan</th>
                                    )}
                                    {visibleCols.status && (
                                        <th className="text-muted-foreground px-4 py-3 text-left font-medium">Status</th>
                                    )}
                                    {visibleCols.joined && (
                                        <th className="text-muted-foreground px-4 py-3 text-left font-medium">Joined</th>
                                    )}
                                    {visibleCols.actions && (
                                        <th className="text-muted-foreground w-16 px-4 py-3 text-center font-medium"></th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={Object.values(visibleCols).filter(Boolean).length + 1} className="text-muted-foreground py-16 text-center">
                                            <SearchIcon className="mx-auto mb-2 size-8 opacity-30" />
                                            No customers found
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((customer, idx) => {
                                        const isSelected = selected.includes(customer.id);
                                        const avatarColor = AVATAR_COLORS[customer.id % AVATAR_COLORS.length];
                                        const statusCfg = STATUS_CONFIG[customer.status];
                                        return (
                                            <tr
                                                key={customer.id}
                                                className={`transition-colors ${isSelected ? 'bg-primary/5' : idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-accent/50`}
                                            >
                                                <td className="px-4 py-3">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleSelect(customer.id)}
                                                    />
                                                </td>
                                                {visibleCols.customer && (
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`${avatarColor} flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white`}>
                                                                {customer.avatar}
                                                            </div>
                                                            <span className="font-medium">{customer.name}</span>
                                                        </div>
                                                    </td>
                                                )}
                                                {visibleCols.email && (
                                                    <td className="text-muted-foreground px-4 py-3">{customer.email}</td>
                                                )}
                                                {visibleCols.phone && (
                                                    <td className="text-muted-foreground px-4 py-3 tabular-nums">{customer.phone}</td>
                                                )}
                                                {visibleCols.plan && (
                                                    <td className="px-4 py-3">
                                                        <Badge className={`${PLAN_COLORS[customer.plan]} font-medium`} variant="outline">
                                                            {customer.plan}
                                                        </Badge>
                                                    </td>
                                                )}
                                                {visibleCols.status && (
                                                    <td className="px-4 py-3">
                                                        <Badge className={`${statusCfg.className} font-medium`} variant="outline">
                                                            <span className={`mr-1 inline-block size-1.5 rounded-full ${customer.status === 'active' ? 'bg-emerald-500' : customer.status === 'pending' ? 'bg-amber-500' : customer.status === 'banned' ? 'bg-red-500' : 'bg-gray-400'}`} />
                                                            {statusCfg.label}
                                                        </Badge>
                                                    </td>
                                                )}
                                                {visibleCols.joined && (
                                                    <td className="text-muted-foreground px-4 py-3 tabular-nums">
                                                        {new Date(customer.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </td>
                                                )}
                                                {visibleCols.actions && (
                                                    <td className="px-4 py-3 text-center">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button className="hover:bg-accent rounded-md p-1.5 transition-colors">
                                                                    <EllipsisIcon className="size-4" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-36">
                                                                <DropdownMenuItem className="gap-2">
                                                                    <PencilIcon className="size-3.5" /> Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-destructive gap-2 focus:text-destructive">
                                                                    <Trash2Icon className="size-3.5" /> Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Pagination ──────────────────────────────────────── */}
                    <div className="bg-muted/20 flex items-center justify-between border-t px-4 py-3">
                        <p className="text-muted-foreground text-xs">
                            {filtered.length === 0
                                ? 'No results'
                                : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}`}
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

                            {/* Page number pills */}
                            <div className="flex items-center gap-1 px-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                                    .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                                        acc.push(p);
                                        return acc;
                                    }, [])
                                    .map((p, i) =>
                                        p === 'ellipsis' ? (
                                            <span key={`e${i}`} className="text-muted-foreground px-1 text-xs">…</span>
                                        ) : (
                                            <button
                                                key={p}
                                                onClick={() => goTo(p as number)}
                                                className={`min-w-[28px] rounded px-2 py-1 text-xs font-medium transition-colors ${safePage === p ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                                            >
                                                {p}
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

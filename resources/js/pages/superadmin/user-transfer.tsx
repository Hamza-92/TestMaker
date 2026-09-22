import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CheckCircle2Icon,
    LoaderCircleIcon,
    PaperclipIcon,
    SearchIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { HierarchicalAccessControl } from '@/components/subscription-access-control';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { usePermission } from '@/hooks/use-permission';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type {
    AccessClass,
    AccessPattern,
    AccessSubject,
    ClassSubjectMap,
    PatternClassMap,
    SubscriptionAccessScope,
} from '@/lib/subscription-access';

interface Account {
    source_id: number;
    name: string;
    school_name: string;
    email: string;
    phone: string;
    account_type: 'paid' | 'trial';
    package: string;
    start_date: string | null;
    end_date: string | null;
    state: 'active' | 'expired' | 'disabled';
    transferred: boolean;
    target_user_id: number | null;
    transferred_at: string | null;
}
interface Detail {
    source_id: number;
    name: string;
    email: string;
    phone: string;
    school_name: string;
    address: string;
    city: string;
    province: string;
    is_show_address: boolean;
    account_type: 'paid' | 'trial';
    user_status: 'active' | 'inactive' | 'suspended';
    subscription_name: string;
    started_at: string;
    expired_at: string;
    subscription_status: 'active' | 'expired' | 'cancelled';
    amount: string;
    payment_plan: string;
    next_payment_date: string | null;
    attachment_count: number;
    legacy_attachments: Array<{
        file_name: string;
        original_name: string;
        uploaded_at: string;
    }>;
    is_question_based: boolean;
    allowed_questions: number;
    remaining_questions: number;
    allow_subjective_answers: boolean;
    access_scope: SubscriptionAccessScope | null;
    legacy_patterns: string[];
    warnings: string[];
}
interface Props {
    scope: { excluded_examssolution: number };
    accounts: Account[];
    patterns: AccessPattern[];
    classes: AccessClass[];
    subjects: AccessSubject[];
    patternClassMap: PatternClassMap;
    classSubjectMap: ClassSubjectMap;
}
type Tab = 'paid' | 'trial';
type Filter =
    | 'pending'
    | 'active'
    | 'expired'
    | 'disabled'
    | 'transferred'
    | 'all';
const PAGE_SIZE = 25;
const filters: Array<{ value: Filter; label: string }> = [
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'disabled', label: 'Disabled' },
    { value: 'transferred', label: 'Transferred' },
    { value: 'all', label: 'All' },
];

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {children}
        </div>
    );
}
function csrfToken() {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? ''
    );
}

export default function UserTransfer({
    scope,
    accounts: initialAccounts,
    patterns,
    classes,
    subjects,
    patternClassMap,
    classSubjectMap,
}: Props) {
    const { can } = usePermission();
    const [accounts, setAccounts] = useState(initialAccounts);
    const [tab, setTab] = useState<Tab>('paid');
    const [filter, setFilter] = useState<Filter>('pending');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [detail, setDetail] = useState<Detail | null>(null);
    const [error, setError] = useState('');

    const counts = useMemo(
        () => ({
            paid: accounts.filter((item) => item.account_type === 'paid')
                .length,
            trial: accounts.filter((item) => item.account_type === 'trial')
                .length,
        }),
        [accounts],
    );
    const filtered = useMemo(
        () =>
            accounts.filter((item) => {
                if (item.account_type !== tab) return false;
                if (filter === 'pending' && item.transferred) return false;
                if (filter === 'transferred' && !item.transferred) return false;
                if (
                    ['active', 'expired', 'disabled'].includes(filter) &&
                    item.state !== filter
                )
                    return false;
                const term = search.trim().toLowerCase();
                return (
                    !term ||
                    `${item.school_name} ${item.name} ${item.email} ${item.phone}`
                        .toLowerCase()
                        .includes(term)
                );
            }),
        [accounts, filter, search, tab],
    );
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    function changeTab(next: Tab) {
        setTab(next);
        setFilter('pending');
        setSearch('');
        setPage(1);
    }
    function changeFilter(next: Filter) {
        setFilter(next);
        setPage(1);
    }
    function update<K extends keyof Detail>(key: K, value: Detail[K]) {
        setDetail((current) =>
            current ? { ...current, [key]: value } : current,
        );
    }

    async function review(account: Account) {
        setOpen(true);
        setLoading(true);
        setDetail(null);
        setError('');
        try {
            const response = await fetch(
                `/superadmin/user-transfer/${account.source_id}`,
                { headers: { Accept: 'application/json' } },
            );
            const payload = await response.json();
            if (!response.ok)
                throw new Error(
                    payload.message ?? 'Unable to load the legacy account.',
                );
            setDetail(payload);
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : 'Unable to load the legacy account.',
            );
        } finally {
            setLoading(false);
        }
    }

    async function transfer() {
        if (!detail) return;
        setSaving(true);
        setError('');
        try {
            const response = await fetch(
                `/superadmin/user-transfer/${detail.source_id}`,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken(),
                    },
                    body: JSON.stringify(detail),
                },
            );
            const payload = await response.json();
            if (!response.ok) {
                const validation = payload.errors
                    ? Object.values(payload.errors).flat().join(' ')
                    : payload.message;
                throw new Error(validation || 'Transfer failed.');
            }
            setAccounts((current) =>
                current.map((item) =>
                    item.source_id === detail.source_id
                        ? {
                              ...item,
                              transferred: true,
                              target_user_id: payload.target_user_id,
                              transferred_at: payload.transferred_at,
                          }
                        : item,
                ),
            );
            setOpen(false);
            setDetail(null);
            toast.success(payload.message);
        } catch (reason) {
            setError(
                reason instanceof Error ? reason.message : 'Transfer failed.',
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Head title="User Transfer" />
            <div className="space-y-4 p-4 md:p-6">
                <div>
                    <h1 className="h1-semibold">User Transfer</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Review and transfer TestMaker accounts one at a time.{' '}
                        {scope.excluded_examssolution.toLocaleString()}{' '}
                        ExamsSolution accounts are excluded.
                    </p>
                </div>

                <div className="flex gap-1 border-b">
                    {(
                        [
                            ['paid', 'Paid subscriptions', counts.paid],
                            ['trial', 'Trial accounts', counts.trial],
                        ] as const
                    ).map(([value, label, count]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => changeTab(value)}
                            className={`border-b-2 px-4 py-2.5 text-sm font-medium ${tab === value ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                            {label}{' '}
                            <span className="ml-1 text-xs">
                                ({count.toLocaleString()})
                            </span>
                        </button>
                    ))}
                </div>

                <div className="flex flex-col gap-3 rounded-lg border p-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {filters.map((item) => (
                            <Button
                                key={item.value}
                                size="sm"
                                variant={
                                    filter === item.value
                                        ? 'default'
                                        : 'outline'
                                }
                                onClick={() => changeFilter(item.value)}
                            >
                                {item.label}
                            </Button>
                        ))}
                    </div>
                    <div className="relative w-full lg:w-80">
                        <SearchIcon className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Search school, name, email or phone"
                        />
                    </div>
                </div>

                <div className="overflow-hidden rounded-lg border bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[850px] text-sm">
                            <thead className="bg-muted/60 text-left">
                                <tr>
                                    <th className="px-4 py-3 font-medium">
                                        Customer
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Contact
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Subscription
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {visible.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-4 py-12 text-center text-muted-foreground"
                                        >
                                            No accounts match this filter.
                                        </td>
                                    </tr>
                                ) : (
                                    visible.map((account) => (
                                        <tr key={account.source_id}>
                                            <td className="px-4 py-3">
                                                <p className="font-medium">
                                                    {account.school_name ||
                                                        account.name ||
                                                        'Unnamed customer'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Legacy #{account.source_id}
                                                    {account.school_name &&
                                                    account.name
                                                        ? ` · ${account.name}`
                                                        : ''}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p>
                                                    {account.email ||
                                                        'No email'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {account.phone ||
                                                        'No phone'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p>
                                                    {account.package ||
                                                        (tab === 'paid'
                                                            ? 'Legacy subscription'
                                                            : 'Legacy trial')}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {account.end_date
                                                        ? `Ends ${account.end_date}`
                                                        : 'No valid end date'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <Badge
                                                        variant={
                                                            account.state ===
                                                            'active'
                                                                ? 'secondary'
                                                                : account.state ===
                                                                    'disabled'
                                                                  ? 'destructive'
                                                                  : 'outline'
                                                        }
                                                    >
                                                        {account.state}
                                                    </Badge>
                                                    {account.transferred && (
                                                        <Badge>
                                                            <CheckCircle2Icon className="size-3" />{' '}
                                                            Transferred
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {account.transferred ? (
                                                    can('customers.view') ? <Button
                                                        size="sm"
                                                        variant="outline"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={`/superadmin/customers/${account.target_user_id}`}
                                                        >
                                                            View user
                                                        </Link>
                                                    </Button> : null
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            review(account)
                                                        }
                                                    >
                                                        Transfer
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between border-t px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                            {filtered.length.toLocaleString()} accounts · Page{' '}
                            {page} of {pages}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={page <= 1}
                                onClick={() => setPage((value) => value - 1)}
                            >
                                <ArrowLeftIcon className="size-4" /> Previous
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={page >= pages}
                                onClick={() => setPage((value) => value + 1)}
                            >
                                Next <ArrowRightIcon className="size-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Review TestMaker account</DialogTitle>
                        <DialogDescription>
                            Confirm or edit the customer, subscription, and
                            access before transfer.
                        </DialogDescription>
                    </DialogHeader>
                    {loading ? (
                        <div className="flex min-h-64 items-center justify-center">
                            <LoaderCircleIcon className="size-6 animate-spin" />
                        </div>
                    ) : detail ? (
                        <div className="space-y-6">
                            {detail.warnings.length > 0 && (
                                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                                    <p className="font-medium">
                                        Review required
                                    </p>
                                    <ul className="mt-1 list-disc pl-5">
                                        {detail.warnings.map((warning) => (
                                            <li key={warning}>{warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {error && (
                                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                                    {error}
                                </div>
                            )}
                            <section className="space-y-3">
                                <h3 className="font-medium">Customer</h3>
                                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                    <Field label="Name">
                                        <Input
                                            value={detail.name}
                                            onChange={(e) =>
                                                update('name', e.target.value)
                                            }
                                        />
                                    </Field>
                                    <Field label="Email">
                                        <Input
                                            type="email"
                                            value={detail.email}
                                            onChange={(e) =>
                                                update('email', e.target.value)
                                            }
                                        />
                                    </Field>
                                    <Field label="Phone">
                                        <Input
                                            value={detail.phone}
                                            onChange={(e) =>
                                                update('phone', e.target.value)
                                            }
                                        />
                                    </Field>
                                    <Field label="School name">
                                        <Input
                                            value={detail.school_name}
                                            onChange={(e) =>
                                                update(
                                                    'school_name',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                    <Field label="City">
                                        <Input
                                            value={detail.city}
                                            onChange={(e) =>
                                                update('city', e.target.value)
                                            }
                                        />
                                    </Field>
                                    <Field label="Province">
                                        <Input
                                            value={detail.province}
                                            onChange={(e) =>
                                                update(
                                                    'province',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                    <Field label="Address">
                                        <Input
                                            value={detail.address}
                                            onChange={(e) =>
                                                update(
                                                    'address',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                    <Field label="Account status">
                                        <Select
                                            value={detail.user_status}
                                            onValueChange={(value) =>
                                                update(
                                                    'user_status',
                                                    value as Detail['user_status'],
                                                )
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">
                                                    Active
                                                </SelectItem>
                                                <SelectItem value="inactive">
                                                    Inactive
                                                </SelectItem>
                                                <SelectItem value="suspended">
                                                    Suspended
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <div className="flex items-end gap-3 pb-2">
                                        <Switch
                                            checked={detail.is_show_address}
                                            onCheckedChange={(value) =>
                                                update('is_show_address', value)
                                            }
                                        />
                                        <Label>Show public address</Label>
                                    </div>
                                </div>
                            </section>
                            <section className="space-y-3">
                                <h3 className="font-medium">Subscription</h3>
                                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                    <Field label="Name">
                                        <Input
                                            value={detail.subscription_name}
                                            onChange={(e) =>
                                                update(
                                                    'subscription_name',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                    <Field label="Starts">
                                        <Input
                                            type="date"
                                            value={detail.started_at}
                                            onChange={(e) =>
                                                update(
                                                    'started_at',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                    <Field label="Expires">
                                        <Input
                                            type="date"
                                            value={detail.expired_at}
                                            onChange={(e) =>
                                                update(
                                                    'expired_at',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                    <Field label="Status">
                                        <Select
                                            value={detail.subscription_status}
                                            onValueChange={(value) =>
                                                update(
                                                    'subscription_status',
                                                    value as Detail['subscription_status'],
                                                )
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">
                                                    Active
                                                </SelectItem>
                                                <SelectItem value="expired">
                                                    Expired
                                                </SelectItem>
                                                <SelectItem value="cancelled">
                                                    Cancelled
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field label="Amount">
                                        <Input
                                            type="number"
                                            min="0"
                                            value={detail.amount}
                                            onChange={(e) =>
                                                update('amount', e.target.value)
                                            }
                                        />
                                    </Field>
                                    <Field label="Allowed questions">
                                        <Input
                                            type="number"
                                            min="0"
                                            disabled={!detail.is_question_based}
                                            value={detail.allowed_questions}
                                            onChange={(e) =>
                                                update(
                                                    'allowed_questions',
                                                    Number(e.target.value),
                                                )
                                            }
                                        />
                                    </Field>
                                    <Field label="Remaining questions">
                                        <Input
                                            type="number"
                                            min="0"
                                            disabled={!detail.is_question_based}
                                            value={detail.remaining_questions}
                                            onChange={(e) =>
                                                update(
                                                    'remaining_questions',
                                                    Number(e.target.value),
                                                )
                                            }
                                        />
                                    </Field>
                                    <div className="space-y-2 pt-1">
                                        <div className="flex items-center gap-3">
                                            <Switch
                                                checked={
                                                    detail.is_question_based
                                                }
                                                onCheckedChange={(value) =>
                                                    update(
                                                        'is_question_based',
                                                        value,
                                                    )
                                                }
                                            />
                                            <Label>Question-based</Label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Switch
                                                checked={
                                                    detail.allow_subjective_answers
                                                }
                                                onCheckedChange={(value) =>
                                                    update(
                                                        'allow_subjective_answers',
                                                        value,
                                                    )
                                                }
                                            />
                                            <Label>Subjective answers</Label>
                                        </div>
                                    </div>
                                </div>
                            </section>
                            <section className="space-y-3">
                                <div>
                                    <h3 className="font-medium">
                                        Legacy payment record
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        This text and{' '}
                                        {detail.attachment_count.toLocaleString()}{' '}
                                        attachment(s) will be copied to the
                                        subscription payment history.
                                    </p>
                                    {detail.legacy_attachments.length > 0 && (
                                        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                            {detail.legacy_attachments.map(
                                                (attachment, index) => (
                                                    <div
                                                        key={
                                                            attachment.file_name +
                                                            '-' +
                                                            index
                                                        }
                                                        className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/20 px-2.5 py-2 text-xs"
                                                    >
                                                        <PaperclipIcon className="size-3.5 shrink-0 text-muted-foreground" />
                                                        <span
                                                            className="truncate"
                                                            title={
                                                                attachment.original_name
                                                            }
                                                        >
                                                            {
                                                                attachment.original_name
                                                            }
                                                        </span>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                                    <Field label="Payment plan / notes">
                                        <textarea
                                            className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                            value={detail.payment_plan}
                                            onChange={(event) =>
                                                update(
                                                    'payment_plan',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="No legacy payment plan recorded"
                                        />
                                    </Field>
                                    <Field label="Next payment date">
                                        <Input
                                            type="date"
                                            value={
                                                detail.next_payment_date ?? ''
                                            }
                                            onChange={(event) =>
                                                update(
                                                    'next_payment_date',
                                                    event.target.value || null,
                                                )
                                            }
                                        />
                                    </Field>
                                </div>
                            </section>
                            <section className="space-y-3">
                                <div>
                                    <h3 className="font-medium">Access</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Legacy patterns:{' '}
                                        {detail.legacy_patterns.join(', ') ||
                                            'none'}
                                        . Check the mapped access and correct it
                                        where needed.
                                    </p>
                                </div>
                                <HierarchicalAccessControl
                                    patterns={patterns}
                                    classes={classes}
                                    subjects={subjects}
                                    patternClassMap={patternClassMap}
                                    classSubjectMap={classSubjectMap}
                                    value={detail.access_scope}
                                    onChange={(value) =>
                                        update('access_scope', value)
                                    }
                                />
                            </section>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-sm text-destructive">
                            {error || 'Unable to load account.'}
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={!detail || loading || saving}
                            onClick={transfer}
                        >
                            {saving && (
                                <LoaderCircleIcon className="size-4 animate-spin" />
                            )}{' '}
                            Transfer account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

UserTransfer.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'User Transfer', href: '/superadmin/user-transfer' },
    ],
};

import { Head, Link } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import {
    ArrowLeftIcon,
    BadgeCheckIcon,
    BookOpenIcon,
    CalendarIcon,
    CheckCircle2Icon,
    CheckIcon,
    ClockIcon,
    CreditCardIcon,
    ExternalLinkIcon,
    FileTextIcon,
    GraduationCapIcon,
    HashIcon,
    LayoutGridIcon,
    LogsIcon,
    PaperclipIcon,
    PencilIcon,
    PlusIcon,
    SchoolIcon,
    UsersIcon,
    XCircleIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// ── Types ─────────────────────────────────────────────────────────────────────

type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

interface Customer {
    id: number;
    name: string;
    email: string;
    school_name: string | null;
}

interface Subscription {
    id: number;
    name: string;
    amount: string;
    allowed_questions: number;
    started_at: string | null;
    expired_at: string | null;
    duration: number;
    status: SubscriptionStatus;
    allow_teachers: boolean;
    max_teachers: number | null;
    pattern_access: number[] | null;
    class_access: number[] | null;
    subject_access: number[] | null;
    pattern_names: string[] | null;
    class_names: string[] | null;
    subject_names: string[] | null;
    creator_name: string | null;
    created_at: string | null;
}

interface PaymentLog {
    id: number;
    amount: string;
    payment_method: string | null;
    payment_method_label: string | null;
    account_number: string | null;
    status: string | null;
    status_label: string | null;
    notes: string | null;
    attachments: string[];
    created_at: string | null;
    reviewed_at: string | null;
    creator_name: string | null;
    reviewer_name: string | null;
}

interface AuditLog {
    id: number;
    event: string | null;
    old_values: Record<string, unknown>;
    new_values: Record<string, unknown>;
    notes: string | null;
    changed_by_name: string | null;
    created_at: string | null;
}

interface Props {
    customer: Customer;
    subscription: Subscription;
    paymentLogs: PaymentLog[];
    auditLogs: AuditLog[];
}

interface PFormState {
    amount: string;
    payment_method: string;
    account_number: string;
    status: string;
    notes: string;
    receipt: File | null;
}

// ── Config ────────────────────────────────────────────────────────────────────

const SUB_STATUS: Record<SubscriptionStatus, { label: string; className: string; icon: React.ReactNode }> = {
    active:    { label: 'Active',    className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2Icon className="size-3.5" /> },
    expired:   { label: 'Expired',   className: 'bg-gray-100 text-gray-500 border-gray-200',          icon: <ClockIcon className="size-3.5" /> },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600 border-red-200',              icon: <XCircleIcon className="size-3.5" /> },
};

const PAYMENT_STATUS_CFG: Record<string, { label: string; className: string }> = {
    pending_review: { label: 'Pending Review', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    reviewed:       { label: 'Reviewed',       className: 'bg-blue-100 text-blue-700 border-blue-200' },
    approved:       { label: 'Approved',       className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    rejected:       { label: 'Rejected',       className: 'bg-red-100 text-red-700 border-red-200' },
};

const AUDIT_EVENT_CFG: Record<string, { dot: string; label: string }> = {
    created:  { dot: 'bg-emerald-500', label: 'Created' },
    updated:  { dot: 'bg-blue-500',    label: 'Updated' },
    deleted:  { dot: 'bg-red-500',     label: 'Deleted' },
    restored: { dot: 'bg-violet-500',  label: 'Restored' },
};

const INIT_PFORM: PFormState = {
    amount: '',
    payment_method: 'cash',
    account_number: '',
    status: 'pending_review',
    notes: '',
    receipt: null,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(date: string | null) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDt(date: string | null) {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
    });
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

function InfoCell({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
    return (
        <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
            <div className={`text-sm ${highlight ? 'text-base font-bold' : 'font-medium'}`}>{value}</div>
        </div>
    );
}

function AccessPanel({ icon, label, names }: { icon: React.ReactNode; label: string; names: string[] | null }) {
    const isAll   = names === null;
    const isEmpty = !isAll && names!.length === 0;

    return (
        <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{icon}</span>
                    <p className="text-sm font-semibold">{label}</p>
                </div>
                {isAll ? (
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">All Access</Badge>
                ) : isEmpty ? (
                    <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-500 text-xs">No Access</Badge>
                ) : (
                    <span className="text-muted-foreground text-xs">{names!.length} selected</span>
                )}
            </div>
            {isAll && (
                <p className="text-muted-foreground text-xs">All {label.toLowerCase()} are accessible in this plan.</p>
            )}
            {isEmpty && (
                <p className="text-muted-foreground text-xs">No {label.toLowerCase()} assigned to this plan.</p>
            )}
            {!isAll && !isEmpty && (
                <div className="flex flex-wrap gap-1.5">
                    {names!.map((name) => (
                        <span key={name} className="bg-primary/10 text-primary rounded-md px-2.5 py-1 text-xs font-medium">
                            {name}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ShowSubscription({ customer, subscription, paymentLogs, auditLogs }: Props) {
    const statusCfg = SUB_STATUS[subscription.status];

    const [paymentOpen, setPaymentOpen] = useState(false);
    const [editingLog, setEditingLog]   = useState<PaymentLog | null>(null);
    const [pForm, setPForm]             = useState<PFormState>(INIT_PFORM);
    const [pErrors, setPErrors]         = useState<Record<string, string>>({});
    const [pProcessing, setPProcessing] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    function openAdd() {
        setEditingLog(null);
        setPForm(INIT_PFORM);
        setPErrors({});
        setPaymentOpen(true);
    }

    function openEdit(log: PaymentLog) {
        setEditingLog(log);
        setPForm({
            amount:         log.amount,
            payment_method: log.payment_method ?? 'cash',
            account_number: log.account_number ?? '',
            status:         log.status ?? 'pending_review',
            notes:          log.notes ?? '',
            receipt:        null,
        });
        setPErrors({});
        setPaymentOpen(true);
    }

    function submitPayment(e: React.FormEvent) {
        e.preventDefault();
        const fd = new FormData();
        fd.append('amount', pForm.amount);
        fd.append('payment_method', pForm.payment_method);
        fd.append('account_number', pForm.account_number);
        fd.append('status', pForm.status);
        fd.append('notes', pForm.notes);
        if (pForm.receipt) fd.append('receipt', pForm.receipt);
        if (editingLog) fd.append('_method', 'PUT');

        const base = `/superadmin/customers/${customer.id}/subscriptions/${subscription.id}/payment-logs`;
        const url  = editingLog ? `${base}/${editingLog.id}` : base;

        setPProcessing(true);
        router.post(url, fd, {
            onFinish: () => setPProcessing(false),
            onSuccess: () => setPaymentOpen(false),
            onError: (errors) => setPErrors(errors as Record<string, string>),
        });
    }

    function quickApprove(log: PaymentLog) {
        router.patch(
            `/superadmin/customers/${customer.id}/subscriptions/${subscription.id}/payment-logs/${log.id}/review`,
            { status: 'approved', notes: 'Payment approved.' },
        );
    }

    return (
        <>
            <Head title={`${subscription.name} — ${customer.name}`} />

            <div className="space-y-5 p-4 md:p-6">

                {/* ── Header ── */}
                <div className="flex items-start gap-3">
                    <Link
                        href={`/superadmin/customers/${customer.id}`}
                        className="hover:bg-accent border-input mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight">{subscription.name}</h1>
                            <Badge className={`${statusCfg.className} gap-1 font-medium`} variant="outline">
                                {statusCfg.icon}{statusCfg.label}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                            <Link href={`/superadmin/customers/${customer.id}`} className="hover:underline">
                                {customer.school_name ?? customer.name}
                            </Link>
                            {' · '}<span>{customer.email}</span>
                        </p>
                    </div>
                </div>

                {/* ── Subscription Details ── */}
                <SectionCard
                    icon={<FileTextIcon className="size-4" />}
                    title="Subscription Details"
                    description="Plan configuration, billing, and permissions"
                    action={
                        <Link
                            href={`/superadmin/customers/${customer.id}/subscriptions/${subscription.id}/edit`}
                            className="border-input hover:bg-accent flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors"
                        >
                            <PencilIcon className="size-3.5" /> Edit
                        </Link>
                    }
                >
                    <div className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        <InfoCell label="Plan Name" value={subscription.name} />
                        <InfoCell
                            label="Amount"
                            highlight
                            value={`Rs. ${Number(subscription.amount).toLocaleString()}`}
                        />
                        <InfoCell
                            label="Allowed Questions"
                            value={
                                <span className="flex items-center gap-1.5">
                                    <HashIcon className="text-muted-foreground size-3.5" />
                                    {subscription.allowed_questions.toLocaleString()}
                                </span>
                            }
                        />
                        <InfoCell
                            label="Duration"
                            value={
                                <span className="flex items-center gap-1.5">
                                    <CalendarIcon className="text-muted-foreground size-3.5" />
                                    {subscription.duration} days
                                </span>
                            }
                        />
                        <InfoCell label="Start Date" value={fmt(subscription.started_at)} />
                        <InfoCell label="Expiry Date" value={fmt(subscription.expired_at)} />
                        <InfoCell
                            label="Status"
                            value={
                                <Badge className={`${statusCfg.className} gap-1 font-medium`} variant="outline">
                                    {statusCfg.icon}{statusCfg.label}
                                </Badge>
                            }
                        />
                        <InfoCell
                            label="Teachers"
                            value={
                                subscription.allow_teachers ? (
                                    <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                                        <BadgeCheckIcon className="size-4" />
                                        Allowed
                                        {subscription.max_teachers != null
                                            ? ` · max ${subscription.max_teachers}`
                                            : ' · Unlimited'}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground italic">Not allowed</span>
                                )
                            }
                        />
                        <InfoCell
                            label="Created By"
                            value={
                                subscription.creator_name ?? (
                                    <span className="text-muted-foreground italic">Unknown</span>
                                )
                            }
                        />
                        <InfoCell label="Created At" value={fmtDt(subscription.created_at)} />
                    </div>
                </SectionCard>

                {/* ── Access Control ── */}
                <SectionCard
                    icon={<LayoutGridIcon className="size-4" />}
                    title="Access Control"
                    description="Patterns, classes, and subjects included in this plan"
                >
                    <div className="grid gap-4 p-5 sm:grid-cols-3">
                        <AccessPanel
                            icon={<BookOpenIcon className="size-4" />}
                            label="Patterns"
                            names={subscription.pattern_names}
                        />
                        <AccessPanel
                            icon={<GraduationCapIcon className="size-4" />}
                            label="Classes"
                            names={subscription.class_names}
                        />
                        <AccessPanel
                            icon={<LayoutGridIcon className="size-4" />}
                            label="Subjects"
                            names={subscription.subject_names}
                        />
                    </div>
                </SectionCard>

                {/* ── Payment Logs ── */}
                <SectionCard
                    icon={<CreditCardIcon className="size-4" />}
                    title="Payment Logs"
                    description={`${paymentLogs.length} record${paymentLogs.length !== 1 ? 's' : ''} · manage payments and receipts`}
                    action={
                        <Button size="sm" onClick={openAdd} className="gap-1.5">
                            <PlusIcon className="size-3.5" /> Add Payment
                        </Button>
                    }
                >
                    {paymentLogs.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-center">
                            <CreditCardIcon className="size-8 opacity-20" />
                            <p className="text-sm">No payment records yet</p>
                            <Button size="sm" variant="outline" onClick={openAdd}>
                                <PlusIcon className="size-3.5" /> Add First Payment
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/40 border-b text-left">
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Date</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Amount</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Method</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Account #</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Status</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Receipt</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Notes</th>
                                        <th className="text-muted-foreground px-4 py-3 text-xs font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {paymentLogs.map((log) => {
                                        const sc = PAYMENT_STATUS_CFG[log.status ?? ''] ?? {
                                            label: log.status_label ?? '—',
                                            className: 'bg-gray-100 text-gray-500 border-gray-200',
                                        };
                                        const canApprove = log.status === 'pending_review' || log.status === 'reviewed';
                                        return (
                                            <tr key={log.id} className="hover:bg-muted/25 align-top transition-colors">
                                                <td className="px-4 py-3">
                                                    <p className="text-xs font-medium whitespace-nowrap">{fmtDt(log.created_at)}</p>
                                                    {log.creator_name && (
                                                        <p className="text-muted-foreground text-xs">by {log.creator_name}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-semibold whitespace-nowrap">
                                                    Rs. {Number(log.amount).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm">{log.payment_method_label ?? '—'}</td>
                                                <td className="text-muted-foreground px-4 py-3 text-xs">{log.account_number ?? '—'}</td>
                                                <td className="px-4 py-3">
                                                    <Badge className={`${sc.className} gap-1 text-xs font-medium`} variant="outline">
                                                        {sc.label}
                                                    </Badge>
                                                    {log.reviewer_name && (
                                                        <p className="text-muted-foreground mt-0.5 text-xs">
                                                            by {log.reviewer_name}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {log.attachments.length > 0 ? (
                                                        <div className="flex flex-col gap-1">
                                                            {log.attachments.map((url, i) => (
                                                                <a
                                                                    key={i}
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-primary flex items-center gap-1 text-xs hover:underline"
                                                                >
                                                                    <PaperclipIcon className="size-3" />
                                                                    Receipt {i + 1}
                                                                    <ExternalLinkIcon className="size-2.5 opacity-60" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="text-muted-foreground max-w-40 px-4 py-3 break-words text-xs">
                                                    {log.notes ?? '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 px-2.5 text-xs"
                                                            onClick={() => openEdit(log)}
                                                        >
                                                            <PencilIcon className="size-3" /> Edit
                                                        </Button>
                                                        {canApprove && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 px-2.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                                onClick={() => quickApprove(log)}
                                                            >
                                                                <CheckIcon className="size-3" /> Approve
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SectionCard>

                {/* ── Edit Logs ── */}
                <SectionCard
                    icon={<LogsIcon className="size-4" />}
                    title="Edit Logs"
                    description={`${auditLogs.length} change${auditLogs.length !== 1 ? 's' : ''} recorded`}
                >
                    {auditLogs.length === 0 ? (
                        <div className="text-muted-foreground flex items-center gap-2 px-5 py-6 text-sm">
                            <LogsIcon className="size-4 opacity-20" /> No changes recorded yet
                        </div>
                    ) : (
                        <div className="divide-y">
                            {auditLogs.map((log) => {
                                const evt = AUDIT_EVENT_CFG[log.event ?? ''] ?? {
                                    dot: 'bg-gray-400',
                                    label: log.event ?? 'Unknown',
                                };
                                return (
                                    <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                                        <div className={`size-2 shrink-0 rounded-full ${evt.dot}`} />
                                        <Badge variant="outline" className="shrink-0 text-xs font-medium capitalize">
                                            {evt.label}
                                        </Badge>
                                        <p className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
                                            {log.notes ?? 'No description'}
                                        </p>
                                        {log.changed_by_name && (
                                            <span className="text-muted-foreground hidden shrink-0 text-xs sm:block">
                                                by {log.changed_by_name}
                                            </span>
                                        )}
                                        <span className="text-muted-foreground shrink-0 text-xs">{fmt(log.created_at)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </SectionCard>

            </div>

            {/* ── Payment Dialog ── */}
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingLog ? 'Edit Payment Log' : 'Add Payment Log'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitPayment} className="space-y-4">

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="p-amount">Amount *</Label>
                                <Input
                                    id="p-amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="e.g. 5000"
                                    value={pForm.amount}
                                    onChange={(e) => setPForm((f) => ({ ...f, amount: e.target.value }))}
                                    aria-invalid={!!pErrors.amount}
                                />
                                {pErrors.amount && <p className="text-destructive text-xs">{pErrors.amount}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label>Method *</Label>
                                <Select
                                    value={pForm.payment_method}
                                    onValueChange={(v) => setPForm((f) => ({ ...f, payment_method: v }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="online">Online</SelectItem>
                                        <SelectItem value="cheque">Cheque</SelectItem>
                                    </SelectContent>
                                </Select>
                                {pErrors.payment_method && (
                                    <p className="text-destructive text-xs">{pErrors.payment_method}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="p-account">Account / Ref #</Label>
                                <Input
                                    id="p-account"
                                    placeholder="Optional"
                                    value={pForm.account_number}
                                    onChange={(e) => setPForm((f) => ({ ...f, account_number: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Status *</Label>
                                <Select
                                    value={pForm.status}
                                    onValueChange={(v) => setPForm((f) => ({ ...f, status: v }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending_review">Pending Review</SelectItem>
                                        <SelectItem value="reviewed">Reviewed</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                                {pErrors.status && <p className="text-destructive text-xs">{pErrors.status}</p>}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="p-notes">Notes</Label>
                            <textarea
                                id="p-notes"
                                rows={3}
                                placeholder="Optional notes or remarks..."
                                value={pForm.notes}
                                onChange={(e) => setPForm((f) => ({ ...f, notes: e.target.value }))}
                                className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>Receipt / Screenshot</Label>
                            <div
                                className="border-input hover:border-ring/50 flex cursor-pointer items-center gap-3 overflow-hidden rounded-md border border-dashed px-4 py-3 transition-colors"
                                onClick={() => fileRef.current?.click()}
                            >
                                <PaperclipIcon className="text-muted-foreground size-4 shrink-0" />
                                <div className="min-w-0 flex-1 overflow-hidden">
                                    <p className="truncate text-sm">
                                        {pForm.receipt ? pForm.receipt.name : 'Click to upload receipt'}
                                    </p>
                                    <p className="text-muted-foreground text-xs">JPG, PNG, PDF, WebP · max 5 MB</p>
                                </div>
                            </div>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    setPForm((f) => ({ ...f, receipt: file }));
                                }}
                            />
                            {pErrors.receipt && <p className="text-destructive text-xs">{pErrors.receipt}</p>}

                            {editingLog && editingLog.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {editingLog.attachments.map((url, i) => (
                                        <a
                                            key={i}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary flex items-center gap-1 text-xs hover:underline"
                                        >
                                            <PaperclipIcon className="size-3" />
                                            Existing #{i + 1}
                                            <ExternalLinkIcon className="size-2.5 opacity-60" />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Separator />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={pProcessing}>
                                {pProcessing ? 'Saving…' : editingLog ? 'Update Payment' : 'Add Payment'}
                            </Button>
                        </DialogFooter>

                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

ShowSubscription.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Customers', href: '/superadmin/customers' },
    ],
};

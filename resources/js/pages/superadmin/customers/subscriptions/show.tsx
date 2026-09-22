import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    BadgeCheckIcon,
    CalendarIcon,
    CheckCircle2Icon,
    CheckIcon,
    ClockIcon,
    CreditCardIcon,
    ExternalLinkIcon,
    EyeIcon,
    FileTextIcon,
    HashIcon,
    LayoutGridIcon,
    LogsIcon,
    PaperclipIcon,
    PencilIcon,
    PlusIcon,
    WalletIcon,
    XCircleIcon,
    XIcon,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { usePermission } from '@/hooks/use-permission';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { SubscriptionAccessScope } from '@/lib/subscription-access';

type SubscriptionStatus = 'active' | 'expired' | 'cancelled';
type PaymentWorkflowStatus =
    | 'pending_review'
    | 'reviewed'
    | 'approved'
    | 'rejected';

interface Customer {
    id: number;
    name: string;
    email: string;
    school_name: string | null;
}

interface AccessOverviewSubject {
    id: number;
    name_eng: string;
    name_ur: string | null;
}

interface AccessOverviewClass {
    id: number;
    name: string;
    subject_mode: 'all' | 'selected' | 'none';
    subjects: AccessOverviewSubject[];
    selected_subject_count: number;
    available_subject_count: number;
}

interface AccessOverviewPattern {
    id: number;
    name: string;
    short_name: string | null;
    classes: AccessOverviewClass[];
    selected_class_count: number;
    available_class_count: number;
}

interface Subscription {
    id: number;
    name: string;
    amount: string;
    allowed_questions: number | null;
    is_question_based: boolean;
    started_at: string | null;
    expired_at: string | null;
    duration: number;
    status: SubscriptionStatus;
    allow_teachers: boolean;
    allow_online_mcq_tests: boolean;
    allow_subjective_answers: boolean;
    max_teachers: number | null;
    access_scope: SubscriptionAccessScope | null;
    access_overview: AccessOverviewPattern[];
    creator_name: string | null;
    created_at: string | null;
}

interface PaymentSummary {
    subscription_amount: string;
    received_amount: string;
    under_review_amount: string;
    pending_amount: string;
    remaining_trackable_amount: string;
}

interface PaymentLog {
    id: number;
    amount: string;
    payment_method: string | null;
    payment_method_label: string | null;
    account_number: string | null;
    next_payment_date: string | null;
    status: PaymentWorkflowStatus | null;
    status_label: string | null;
    notes: string | null;
    rejection_reason: string | null;
    attachments: string[];
    created_at: string | null;
    reviewed_at: string | null;
    creator_name: string | null;
    reviewer_name: string | null;
    is_editable: boolean;
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
    paymentSummary: PaymentSummary;
    auditLogs: AuditLog[];
}

interface PaymentFormState {
    amount: string;
    payment_method: string;
    account_number: string;
    notes: string;
    receipt: File | null;
}

const SUB_STATUS: Record<
    SubscriptionStatus,
    { label: string; className: string; icon: React.ReactNode }
> = {
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

const PAYMENT_STATUS_CFG: Record<
    PaymentWorkflowStatus,
    { label: string; className: string }
> = {
    pending_review: {
        label: 'Pending Review',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    reviewed: {
        label: 'Reviewed',
        className: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    approved: {
        label: 'Approved',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    rejected: {
        label: 'Rejected',
        className: 'bg-red-100 text-red-700 border-red-200',
    },
};

const AUDIT_EVENT_CFG: Record<string, { dot: string; label: string }> = {
    created: { dot: 'bg-emerald-500', label: 'Created' },
    updated: { dot: 'bg-blue-500', label: 'Updated' },
    deleted: { dot: 'bg-red-500', label: 'Deleted' },
    restored: { dot: 'bg-violet-500', label: 'Restored' },
};

function buildPaymentForm(amount: string): PaymentFormState {
    return {
        amount,
        payment_method: 'online',
        account_number: '',
        notes: '',
        receipt: null,
    };
}

function fmt(date: string | null) {
    if (!date) {
        return '—';
    }

    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function fmtDt(date: string | null) {
    if (!date) {
        return '—';
    }

    return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function money(amount: string) {
    return `Rs. ${Number(amount).toLocaleString()}`;
}

function truncateFilename(name: string, max = 36): string {
    if (name.length <= max) return name;
    const dot = name.lastIndexOf('.');
    const ext = dot > 0 ? name.slice(dot) : '';
    return name.slice(0, max - ext.length - 1) + '…' + ext;
}

function SectionCard({
    icon,
    title,
    description,
    action,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {icon}
                    </div>
                    <div>
                        <p className="text-sm font-semibold">{title}</p>
                        {description && (
                            <p className="text-xs text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

function InfoCell({
    label,
    value,
    highlight,
}: {
    label: string;
    value: React.ReactNode;
    highlight?: boolean;
}) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </p>
            <div
                className={`text-sm ${highlight ? 'text-base font-bold' : 'font-medium'}`}
            >
                {value}
            </div>
        </div>
    );
}

function MetricCard({
    icon,
    label,
    value,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    tone?: 'default' | 'success' | 'warning';
}) {
    const toneClass =
        tone === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : tone === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-border bg-card text-foreground';

    return (
        <div className={`rounded-lg border p-4 ${toneClass}`}>
            <div className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                {icon}
                <span>{label}</span>
            </div>
            <p className="mt-2 text-lg font-semibold">{value}</p>
        </div>
    );
}

function PaymentStatusBadge({
    status,
}: {
    status: PaymentWorkflowStatus | null;
}) {
    if (!status) {
        return (
            <Badge variant="outline" className="text-xs">
                —
            </Badge>
        );
    }

    const cfg = PAYMENT_STATUS_CFG[status];

    return (
        <Badge
            variant="outline"
            className={`${cfg.className} text-xs font-medium`}
        >
            {cfg.label}
        </Badge>
    );
}

function AccessOverviewPanel({ subscription }: { subscription: Subscription }) {
    if (subscription.access_scope === null) {
        return (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-100 text-xs text-emerald-700"
                >
                    All Access
                </Badge>
            </div>
        );
    }

    if (subscription.access_overview.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-4">
                <Badge
                    variant="outline"
                    className="border-gray-200 bg-gray-50 text-xs text-gray-500"
                >
                    No Access
                </Badge>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {subscription.access_overview.map((pattern) => (
                <div key={pattern.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold">
                                    {pattern.name}
                                </p>
                                {pattern.short_name && (
                                    <Badge
                                        variant="outline"
                                        className="text-[11px]"
                                    >
                                        {pattern.short_name}
                                    </Badge>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {pattern.selected_class_count} /{' '}
                                {pattern.available_class_count} classes
                            </p>
                        </div>
                    </div>

                    {pattern.classes.length > 0 && (
                        <div className="mt-3 space-y-3">
                            {pattern.classes.map((schoolClass) => (
                                <div
                                    key={schoolClass.id}
                                    className="rounded-lg border bg-muted/20 p-3"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-medium">
                                                {schoolClass.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {schoolClass.subject_mode ===
                                                'all'
                                                    ? `All ${schoolClass.available_subject_count} subjects`
                                                    : schoolClass.subject_mode ===
                                                        'none'
                                                      ? 'No subjects'
                                                      : `${schoolClass.selected_subject_count} / ${schoolClass.available_subject_count} subjects`}
                                            </p>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={
                                                schoolClass.subject_mode ===
                                                'all'
                                                    ? 'border-emerald-200 bg-emerald-50 text-xs text-emerald-700'
                                                    : schoolClass.subject_mode ===
                                                        'none'
                                                      ? 'border-gray-200 bg-gray-50 text-xs text-gray-500'
                                                      : 'border-amber-200 bg-amber-50 text-xs text-amber-700'
                                            }
                                        >
                                            {schoolClass.subject_mode === 'all'
                                                ? 'All Subjects'
                                                : schoolClass.subject_mode ===
                                                    'none'
                                                  ? 'No Subjects'
                                                  : 'Custom Subjects'}
                                        </Badge>
                                    </div>

                                    {schoolClass.subject_mode === 'selected' &&
                                        schoolClass.subjects.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {schoolClass.subjects.map(
                                                    (subject) => (
                                                        <span
                                                            key={subject.id}
                                                            className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                                                        >
                                                            {subject.name_eng}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function DetailRow({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3 rounded-lg border p-3">
            <span className="mt-0.5 text-muted-foreground">{icon}</span>
            <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {label}
                </p>
                <div className="mt-1 text-sm font-medium">{value}</div>
            </div>
        </div>
    );
}

export default function ShowSubscription({
    customer,
    subscription,
    paymentLogs,
    paymentSummary,
    auditLogs,
}: Props) {
    const { can } = usePermission();
    const statusCfg = SUB_STATUS[subscription.status];
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentDetail, setPaymentDetail] = useState<PaymentLog | null>(null);
    const [editingLog, setEditingLog] = useState<PaymentLog | null>(null);
    const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>(
        {},
    );
    const [detailErrors, setDetailErrors] = useState<Record<string, string>>(
        {},
    );
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [detailProcessing, setDetailProcessing] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [paymentForm, setPaymentForm] = useState<PaymentFormState>(
        buildPaymentForm(''),
    );
    const fileRef = useRef<HTMLInputElement>(null);

    const canAddPayment =
        can('subscriptions.manage_payments') &&
        Number(paymentSummary.remaining_trackable_amount) > 0;

    function openAdd() {
        setEditingLog(null);
        setPaymentErrors({});
        setPaymentForm(buildPaymentForm(''));
        setPaymentOpen(true);
    }

    function openEdit(log: PaymentLog) {
        setEditingLog(log);
        setPaymentErrors({});
        setPaymentForm({
            amount: log.amount,
            payment_method: log.payment_method ?? 'online',
            account_number: log.account_number ?? '',
            notes: log.notes ?? '',
            receipt: null,
        });
        setPaymentOpen(true);
    }

    function openDetail(log: PaymentLog) {
        setPaymentDetail(log);
        setDetailErrors({});
        setRejectionReason(log.rejection_reason ?? '');
    }

    function closePaymentModal(nextOpen: boolean) {
        setPaymentOpen(nextOpen);

        if (!nextOpen) {
            setEditingLog(null);
            setPaymentErrors({});
            setPaymentForm(buildPaymentForm(''));
        }
    }

    function closeDetailModal(nextOpen: boolean) {
        if (!nextOpen) {
            setPaymentDetail(null);
            setDetailErrors({});
            setRejectionReason('');
        }
    }

    function submitPayment(e: React.FormEvent) {
        e.preventDefault();

        if (!editingLog && !paymentForm.receipt) {
            setPaymentErrors((prev) => ({
                ...prev,
                receipt: 'A receipt is required.',
            }));
            return;
        }

        const fd = new FormData();
        fd.append('amount', paymentForm.amount);
        fd.append('payment_method', paymentForm.payment_method);
        fd.append('account_number', paymentForm.account_number);
        fd.append('notes', paymentForm.notes);

        if (paymentForm.receipt) {
            fd.append('receipt', paymentForm.receipt);
        }

        if (editingLog) {
            fd.append('_method', 'PUT');
        }

        const base = `/superadmin/customers/${customer.id}/subscriptions/${subscription.id}/payment-logs`;
        const url = editingLog ? `${base}/${editingLog.id}` : base;

        setPaymentProcessing(true);
        router.post(url, fd, {
            preserveScroll: true,
            onFinish: () => setPaymentProcessing(false),
            onSuccess: () => closePaymentModal(false),
            onError: (errors) =>
                setPaymentErrors(errors as Record<string, string>),
        });
    }

    function movePaymentStatus(
        log: PaymentLog,
        nextStatus: 'reviewed' | 'approved' | 'rejected',
    ) {
        const payload: Record<string, string> = { status: nextStatus };

        if (nextStatus === 'rejected') {
            payload.rejection_reason = rejectionReason;
        }

        setDetailProcessing(true);
        router.patch(
            `/superadmin/customers/${customer.id}/subscriptions/${subscription.id}/payment-logs/${log.id}/review`,
            payload,
            {
                preserveScroll: true,
                onFinish: () => setDetailProcessing(false),
                onSuccess: () => closeDetailModal(false),
                onError: (errors) =>
                    setDetailErrors(errors as Record<string, string>),
            },
        );
    }

    return (
        <>
            <Head title={`${subscription.name} — ${customer.name}`} />

            <div className="space-y-5 p-4 md:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href={`/superadmin/customers/${customer.id}`}
                        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-input transition-colors hover:bg-accent"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight">
                                {subscription.name}
                            </h1>
                            <Badge
                                className={`${statusCfg.className} gap-1 font-medium`}
                                variant="outline"
                            >
                                {statusCfg.icon}
                                {statusCfg.label}
                            </Badge>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            <Link
                                href={`/superadmin/customers/${customer.id}`}
                                className="hover:underline"
                            >
                                {customer.school_name ?? customer.name}
                            </Link>
                            {' · '}
                            <span>{customer.email}</span>
                        </p>
                    </div>
                </div>

                <SectionCard
                    icon={<FileTextIcon className="size-4" />}
                    title="Subscription"
                    action={
                        can('subscriptions.edit') ? (
                            <Link
                                href={`/superadmin/customers/${customer.id}/subscriptions/${subscription.id}/edit`}
                                className="flex h-8 items-center gap-1.5 rounded-lg border border-input px-3 text-sm font-medium transition-colors hover:bg-accent"
                            >
                                <PencilIcon className="size-3.5" />
                                Edit
                            </Link>
                        ) : undefined
                    }
                >
                    <div className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        <InfoCell label="Plan Name" value={subscription.name} />
                        <InfoCell
                            label="Amount"
                            highlight
                            value={money(subscription.amount)}
                        />
                        {subscription.is_question_based && (
                            <InfoCell
                                label="Allowed Questions"
                                value={
                                    <span className="flex items-center gap-1.5">
                                        <HashIcon className="size-3.5 text-muted-foreground" />
                                        {subscription.allowed_questions?.toLocaleString() ??
                                            '—'}
                                    </span>
                                }
                            />
                        )}
                        <InfoCell
                            label="Duration"
                            value={
                                <span className="flex items-center gap-1.5">
                                    <CalendarIcon className="size-3.5 text-muted-foreground" />
                                    {subscription.duration} days
                                </span>
                            }
                        />
                        <InfoCell
                            label="Start Date"
                            value={fmt(subscription.started_at)}
                        />
                        <InfoCell
                            label="Expiry Date"
                            value={fmt(subscription.expired_at)}
                        />
                        <InfoCell
                            label="Status"
                            value={
                                <Badge
                                    className={`${statusCfg.className} gap-1 font-medium`}
                                    variant="outline"
                                >
                                    {statusCfg.icon}
                                    {statusCfg.label}
                                </Badge>
                            }
                        />
                        <InfoCell
                            label="Teachers"
                            value={
                                subscription.allow_teachers ? (
                                    <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                                        <BadgeCheckIcon className="size-4" />
                                        {subscription.max_teachers != null
                                            ? `Max ${subscription.max_teachers}`
                                            : 'Unlimited'}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground italic">
                                        Not allowed
                                    </span>
                                )
                            }
                        />
                        <InfoCell
                            label="Online MCQ Tests"
                            value={
                                subscription.allow_online_mcq_tests ? (
                                    <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                                        <BadgeCheckIcon className="size-4" />
                                        Enabled
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground italic">
                                        Disabled
                                    </span>
                                )
                            }
                        />
                        <InfoCell
                            label="Subjective Answers"
                            value={
                                subscription.allow_subjective_answers ? (
                                    <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                                        <BadgeCheckIcon className="size-4" />
                                        Enabled
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground italic">
                                        Disabled
                                    </span>
                                )
                            }
                        />
                        <InfoCell
                            label="Created By"
                            value={
                                subscription.creator_name ?? (
                                    <span className="text-muted-foreground italic">
                                        Unknown
                                    </span>
                                )
                            }
                        />
                        <InfoCell
                            label="Created At"
                            value={fmtDt(subscription.created_at)}
                        />
                    </div>
                </SectionCard>

                <SectionCard
                    icon={<LayoutGridIcon className="size-4" />}
                    title="Access"
                >
                    <div className="p-5">
                        <AccessOverviewPanel subscription={subscription} />
                    </div>
                </SectionCard>

                <SectionCard
                    icon={<CreditCardIcon className="size-4" />}
                    title="Payments"
                    action={
                        <Button
                            size="sm"
                            onClick={openAdd}
                            className="gap-1.5"
                            disabled={!canAddPayment}
                        >
                            <PlusIcon className="size-3.5" />
                            Add Payment
                        </Button>
                    }
                >
                    <div className="grid gap-3 border-b p-5 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricCard
                            icon={<WalletIcon className="size-4" />}
                            label="Plan Amount"
                            value={money(paymentSummary.subscription_amount)}
                        />
                        <MetricCard
                            icon={<CheckCircle2Icon className="size-4" />}
                            label="Received"
                            value={money(paymentSummary.received_amount)}
                            tone="success"
                        />
                        <MetricCard
                            icon={<ClockIcon className="size-4" />}
                            label="Pending"
                            value={money(paymentSummary.pending_amount)}
                            tone="warning"
                        />
                        <MetricCard
                            icon={<FileTextIcon className="size-4" />}
                            label="Under Review"
                            value={money(paymentSummary.under_review_amount)}
                        />
                    </div>

                    {paymentLogs.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
                            <CreditCardIcon className="size-8 opacity-20" />
                            <p className="text-sm">No payments yet</p>
                            {canAddPayment && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={openAdd}
                                >
                                    <PlusIcon className="size-3.5" />
                                    Add Payment
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-left">
                                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                                            Date
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                                            Amount
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                                            Method
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {paymentLogs.map((log) => (
                                        <tr
                                            key={log.id}
                                            className="transition-colors hover:bg-muted/25"
                                        >
                                            <td className="px-4 py-3 align-top">
                                                <p className="text-xs font-medium whitespace-nowrap">
                                                    {fmtDt(log.created_at)}
                                                </p>
                                                {log.creator_name && (
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        by {log.creator_name}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 align-top font-semibold whitespace-nowrap">
                                                {money(log.amount)}
                                            </td>
                                            <td className="px-4 py-3 align-top text-sm">
                                                {log.payment_method_label ??
                                                    '—'}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <PaymentStatusBadge
                                                    status={log.status}
                                                />
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 px-2.5 text-xs"
                                                        onClick={() =>
                                                            openDetail(log)
                                                        }
                                                    >
                                                        <EyeIcon className="size-3" />
                                                        Details
                                                    </Button>
                                                    {log.is_editable &&
                                                        can(
                                                            'subscriptions.manage_payments',
                                                        ) && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 px-2.5 text-xs"
                                                                onClick={() =>
                                                                    openEdit(
                                                                        log,
                                                                    )
                                                                }
                                                            >
                                                                <PencilIcon className="size-3" />
                                                                Edit
                                                            </Button>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SectionCard>

                <SectionCard
                    icon={<LogsIcon className="size-4" />}
                    title="Logs"
                >
                    {auditLogs.length === 0 ? (
                        <div className="flex items-center gap-2 px-5 py-6 text-sm text-muted-foreground">
                            <LogsIcon className="size-4 opacity-20" />
                            No changes recorded yet
                        </div>
                    ) : (
                        <div className="divide-y">
                            {auditLogs.map((log) => {
                                const evt = AUDIT_EVENT_CFG[
                                    log.event ?? ''
                                ] ?? {
                                    dot: 'bg-gray-400',
                                    label: log.event ?? 'Unknown',
                                };

                                return (
                                    <div
                                        key={log.id}
                                        className="flex items-center gap-3 px-5 py-3"
                                    >
                                        <div
                                            className={`size-2 shrink-0 rounded-full ${evt.dot}`}
                                        />
                                        <Badge
                                            variant="outline"
                                            className="shrink-0 text-xs font-medium capitalize"
                                        >
                                            {evt.label}
                                        </Badge>
                                        <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                                            {log.notes ?? 'No description'}
                                        </p>
                                        {log.changed_by_name && (
                                            <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                                                by {log.changed_by_name}
                                            </span>
                                        )}
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            {fmt(log.created_at)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </SectionCard>
            </div>

            <Dialog open={paymentOpen} onOpenChange={closePaymentModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingLog ? 'Edit Payment' : 'Add Payment'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={submitPayment} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="p-amount">Amount</Label>
                                <Input
                                    id="p-amount"
                                    type="number"
                                    min="1"
                                    onKeyDown={(e) =>
                                        ['e', 'E', '+', '-', '.'].includes(
                                            e.key,
                                        ) && e.preventDefault()
                                    }
                                    value={paymentForm.amount}
                                    onChange={(e) =>
                                        setPaymentForm((current) => ({
                                            ...current,
                                            amount: e.target.value,
                                        }))
                                    }
                                    aria-invalid={!!paymentErrors.amount}
                                />
                                {paymentErrors.amount && (
                                    <p className="text-xs text-destructive">
                                        {paymentErrors.amount}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label>Method</Label>
                                <Select
                                    value={paymentForm.payment_method}
                                    onValueChange={(value) =>
                                        setPaymentForm((current) => ({
                                            ...current,
                                            payment_method: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="online">
                                            Online
                                        </SelectItem>
                                        <SelectItem value="bank_transfer">
                                            Bank Transfer
                                        </SelectItem>
                                        <SelectItem value="cash">
                                            Cash
                                        </SelectItem>
                                        <SelectItem value="cheque">
                                            Cheque
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                {paymentErrors.payment_method && (
                                    <p className="text-xs text-destructive">
                                        {paymentErrors.payment_method}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="p-account">Account / Ref #</Label>
                            <Input
                                id="p-account"
                                value={paymentForm.account_number}
                                onChange={(e) =>
                                    setPaymentForm((current) => ({
                                        ...current,
                                        account_number: e.target.value,
                                    }))
                                }
                            />
                            {paymentErrors.account_number && (
                                <p className="text-xs text-destructive">
                                    {paymentErrors.account_number}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="p-notes">Notes</Label>
                            <textarea
                                id="p-notes"
                                rows={3}
                                value={paymentForm.notes}
                                onChange={(e) =>
                                    setPaymentForm((current) => ({
                                        ...current,
                                        notes: e.target.value,
                                    }))
                                }
                                className="flex min-h-[88px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            />
                            {paymentErrors.notes && (
                                <p className="text-xs text-destructive">
                                    {paymentErrors.notes}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1">
                                Receipt
                                {!editingLog && (
                                    <span className="text-xs text-destructive">
                                        *
                                    </span>
                                )}
                            </Label>
                            <div
                                className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-input px-4 py-3 transition-colors hover:border-ring/50"
                                onClick={() => fileRef.current?.click()}
                            >
                                <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
                                <div className="min-w-0 flex-1">
                                    <p
                                        className="text-sm"
                                        title={paymentForm.receipt?.name}
                                    >
                                        {paymentForm.receipt
                                            ? truncateFilename(
                                                  paymentForm.receipt.name,
                                              )
                                            : 'Upload receipt'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        JPG, PNG, PDF, WebP · max 5 MB
                                    </p>
                                </div>
                                {paymentForm.receipt && (
                                    <button
                                        type="button"
                                        className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPaymentForm((current) => ({
                                                ...current,
                                                receipt: null,
                                            }));
                                            if (fileRef.current)
                                                fileRef.current.value = '';
                                        }}
                                    >
                                        <XIcon className="size-4" />
                                    </button>
                                )}
                            </div>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    setPaymentForm((current) => ({
                                        ...current,
                                        receipt: file,
                                    }));
                                }}
                            />
                            {paymentErrors.receipt && (
                                <p className="text-xs text-destructive">
                                    {paymentErrors.receipt}
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => closePaymentModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={paymentProcessing}>
                                {paymentProcessing
                                    ? 'Saving…'
                                    : editingLog
                                      ? 'Save'
                                      : 'Add Payment'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={paymentDetail !== null}
                onOpenChange={closeDetailModal}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Payment Details</DialogTitle>
                    </DialogHeader>

                    {paymentDetail && (
                        <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <DetailRow
                                    icon={<CreditCardIcon className="size-4" />}
                                    label="Amount"
                                    value={money(paymentDetail.amount)}
                                />
                                <DetailRow
                                    icon={
                                        <CheckCircle2Icon className="size-4" />
                                    }
                                    label="Status"
                                    value={
                                        <PaymentStatusBadge
                                            status={paymentDetail.status}
                                        />
                                    }
                                />
                                <DetailRow
                                    icon={<WalletIcon className="size-4" />}
                                    label="Method"
                                    value={
                                        paymentDetail.payment_method_label ??
                                        '—'
                                    }
                                />
                                <DetailRow
                                    icon={<HashIcon className="size-4" />}
                                    label="Account / Ref #"
                                    value={paymentDetail.account_number ?? '—'}
                                />
                                {paymentDetail.next_payment_date && (
                                    <DetailRow
                                        icon={
                                            <CalendarIcon className="size-4" />
                                        }
                                        label="Next payment date"
                                        value={paymentDetail.next_payment_date}
                                    />
                                )}
                                <DetailRow
                                    icon={<CalendarIcon className="size-4" />}
                                    label="Created"
                                    value={
                                        <div>
                                            <p>
                                                {fmtDt(
                                                    paymentDetail.created_at,
                                                )}
                                            </p>
                                            {paymentDetail.creator_name && (
                                                <p className="text-xs text-muted-foreground">
                                                    by{' '}
                                                    {paymentDetail.creator_name}
                                                </p>
                                            )}
                                        </div>
                                    }
                                />
                                <DetailRow
                                    icon={<BadgeCheckIcon className="size-4" />}
                                    label="Reviewed"
                                    value={
                                        paymentDetail.reviewed_at ? (
                                            <div>
                                                <p>
                                                    {fmtDt(
                                                        paymentDetail.reviewed_at,
                                                    )}
                                                </p>
                                                {paymentDetail.reviewer_name && (
                                                    <p className="text-xs text-muted-foreground">
                                                        by{' '}
                                                        {
                                                            paymentDetail.reviewer_name
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            '—'
                                        )
                                    }
                                />
                            </div>

                            {paymentDetail.notes && (
                                <DetailRow
                                    icon={<FileTextIcon className="size-4" />}
                                    label="Notes"
                                    value={
                                        <p className="whitespace-pre-wrap">
                                            {paymentDetail.notes}
                                        </p>
                                    }
                                />
                            )}

                            {paymentDetail.rejection_reason && (
                                <DetailRow
                                    icon={<XCircleIcon className="size-4" />}
                                    label="Rejection Reason"
                                    value={
                                        <p className="whitespace-pre-wrap">
                                            {paymentDetail.rejection_reason}
                                        </p>
                                    }
                                />
                            )}

                            <div className="rounded-lg border p-3">
                                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                    Attachments
                                </p>
                                <div className="mt-2 flex flex-col gap-2">
                                    {paymentDetail.attachments.length === 0 ? (
                                        <span className="text-sm text-muted-foreground">
                                            No attachments
                                        </span>
                                    ) : (
                                        paymentDetail.attachments.map(
                                            (url, index) => (
                                                <a
                                                    key={url}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                                                >
                                                    <PaperclipIcon className="size-3.5" />
                                                    Receipt {index + 1}
                                                    <ExternalLinkIcon className="size-3 opacity-70" />
                                                </a>
                                            ),
                                        )
                                    )}
                                </div>
                            </div>

                            {paymentDetail.status === 'reviewed' && (
                                <div className="space-y-2 rounded-lg border border-red-200 p-3">
                                    <Label htmlFor="reject-reason">
                                        Rejection Reason
                                    </Label>
                                    <textarea
                                        id="reject-reason"
                                        rows={3}
                                        value={rejectionReason}
                                        onChange={(e) =>
                                            setRejectionReason(e.target.value)
                                        }
                                        className="flex min-h-[88px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    />
                                    {detailErrors.rejection_reason && (
                                        <p className="text-xs text-destructive">
                                            {detailErrors.rejection_reason}
                                        </p>
                                    )}
                                </div>
                            )}

                            {detailErrors.status && (
                                <p className="text-xs text-destructive">
                                    {detailErrors.status}
                                </p>
                            )}

                            <DialogFooter>
                                {paymentDetail.status === 'pending_review' &&
                                    can('subscriptions.manage_payments') && (
                                        <Button
                                            type="button"
                                            onClick={() =>
                                                movePaymentStatus(
                                                    paymentDetail,
                                                    'reviewed',
                                                )
                                            }
                                            disabled={detailProcessing}
                                        >
                                            <CheckIcon className="size-3.5" />
                                            {detailProcessing
                                                ? 'Saving…'
                                                : 'Mark Reviewed'}
                                        </Button>
                                    )}

                                {paymentDetail.status === 'reviewed' &&
                                    can('subscriptions.manage_payments') && (
                                        <>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    movePaymentStatus(
                                                        paymentDetail,
                                                        'rejected',
                                                    )
                                                }
                                                disabled={detailProcessing}
                                            >
                                                <XCircleIcon className="size-3.5" />
                                                {detailProcessing
                                                    ? 'Saving…'
                                                    : 'Reject'}
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    movePaymentStatus(
                                                        paymentDetail,
                                                        'approved',
                                                    )
                                                }
                                                disabled={detailProcessing}
                                            >
                                                <CheckCircle2Icon className="size-3.5" />
                                                {detailProcessing
                                                    ? 'Saving…'
                                                    : 'Approve'}
                                            </Button>
                                        </>
                                    )}

                                {paymentDetail.status !== 'pending_review' &&
                                    paymentDetail.status !== 'reviewed' && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                closeDetailModal(false)
                                            }
                                        >
                                            Close
                                        </Button>
                                    )}
                            </DialogFooter>
                        </div>
                    )}
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

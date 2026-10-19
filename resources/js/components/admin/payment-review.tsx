import { Link, router } from '@inertiajs/react';
import {
    ArrowUpRightIcon,
    Building2Icon,
    CheckIcon,
    Clock3Icon,
    ExternalLinkIcon,
    ReceiptTextIcon,
    XIcon,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Badge, Button, Card, Modal } from '@/components/tm';

type ReviewStatus = 'pending_review' | 'reviewed';

interface RecentPayment {
    id: number;
    amount: string;
    status: string;
    created_at: string | null;
}

export interface PaymentToReview {
    id: number;
    customer_id: number;
    customer_name: string;
    school_name: string | null;
    customer_contact_name: string;
    customer_email: string;
    customer_phone: string | null;
    subscription_id: number;
    subscription_name: string;
    subscription_amount: string;
    approved_amount: string;
    balance_amount: string;
    subscription_started_at: string | null;
    subscription_expired_at: string | null;
    amount: string;
    payment_method: string | null;
    account_number: string | null;
    next_payment_date: string | null;
    status: ReviewStatus;
    created_at: string;
    recorded_by: string | null;
    reviewed_at: string | null;
    reviewed_by: string | null;
    notes: string | null;
    receipts: string[];
    recent_payments: RecentPayment[];
}

function money(value: string): string {
    return `Rs ${Number(value).toLocaleString('en-PK', {
        maximumFractionDigits: 2,
    })}`;
}

function date(value: string | null, withTime = false): string {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleString('en-PK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
        timeZone: 'Asia/Karachi',
    });
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {label}
            </dt>
            <dd className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">
                {value}
            </dd>
        </div>
    );
}

function statusLabel(status: string): string {
    return status
        .split('_')
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(' ');
}

export function PaymentsToReview({
    payments,
    total,
}: {
    payments: PaymentToReview[];
    total: number;
}) {
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [rejecting, setRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const selected = payments.find((payment) => payment.id === selectedId);

    function close() {
        if (processing) {
            return;
        }

        setSelectedId(null);
        setRejecting(false);
        setRejectionReason('');
        setErrors({});
    }

    function submit(status: 'reviewed' | 'approved' | 'rejected') {
        if (!selected) {
            return;
        }

        if (status === 'rejected' && !rejectionReason.trim()) {
            setErrors({ rejection_reason: 'Enter a rejection reason.' });

            return;
        }

        setErrors({});
        setProcessing(true);
        router.patch(
            `/superadmin/customers/${selected.customer_id}/subscriptions/${selected.subscription_id}/payment-logs/${selected.id}/review`,
            {
                status,
                ...(status === 'rejected'
                    ? { rejection_reason: rejectionReason.trim() }
                    : {}),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (status !== 'reviewed') {
                        setSelectedId(null);
                    }

                    setRejecting(false);
                    setRejectionReason('');
                },
                onError: (responseErrors) => setErrors(responseErrors),
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <section aria-labelledby="payments-to-review-title">
            <Card padding="none" className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <h2
                        id="payments-to-review-title"
                        className="text-sm font-semibold text-slate-900 dark:text-white"
                    >
                        Payments to review
                    </h2>
                    <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-rose-600 px-2 text-sm font-bold text-white">
                        {total.toLocaleString('en-PK')}
                    </span>
                </div>
                {payments.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        No payments need review.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left">
                            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                                <tr>
                                    <th scope="col" className="px-5 py-3">
                                        School
                                    </th>
                                    <th scope="col" className="px-5 py-3">
                                        Recorded by
                                    </th>
                                    <th scope="col" className="px-5 py-3">
                                        Payment
                                    </th>
                                    <th scope="col" className="px-5 py-3">
                                        Status
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-5 py-3 text-right"
                                    >
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {payments.map((payment) => (
                                    <tr
                                        key={payment.id}
                                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                                    >
                                        <td className="px-5 py-3.5">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                {payment.customer_name}
                                            </p>
                                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                {payment.subscription_name}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                {payment.recorded_by ??
                                                    'Unknown'}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {date(payment.created_at)}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm font-bold tabular-nums text-slate-950 dark:text-white">
                                            {money(payment.amount)}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <Badge
                                                tone={
                                                    payment.status ===
                                                    'reviewed'
                                                        ? 'info'
                                                        : 'draft'
                                                }
                                            >
                                                {payment.status === 'reviewed'
                                                    ? 'Reviewed'
                                                    : 'Pending'}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedId(payment.id);
                                                    setErrors({});
                                                    setRejecting(false);
                                                }}
                                            >
                                                View details
                                                <ArrowUpRightIcon aria-hidden="true" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                open={selected !== undefined}
                onOpenChange={(open) => {
                    if (!open) {
                        close();
                    }
                }}
                title="Payment review"
                footer={
                    selected && (
                        <>
                            {errors.status && (
                                <p
                                    role="alert"
                                    className="mr-auto text-xs text-rose-600"
                                >
                                    {errors.status}
                                </p>
                            )}
                            {selected.status === 'pending_review' ? (
                                <Button
                                    type="button"
                                    variant="primary"
                                    disabled={processing}
                                    onClick={() => submit('reviewed')}
                                >
                                    <CheckIcon aria-hidden="true" />
                                    Mark reviewed
                                </Button>
                            ) : rejecting ? (
                                <>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        disabled={processing}
                                        onClick={() => {
                                            setRejecting(false);
                                            setErrors({});
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="danger"
                                        disabled={processing}
                                        onClick={() => submit('rejected')}
                                    >
                                        <XIcon aria-hidden="true" />
                                        Confirm rejection
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        disabled={processing}
                                        onClick={() => setRejecting(true)}
                                    >
                                        Reject
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="primary"
                                        disabled={processing}
                                        onClick={() => submit('approved')}
                                    >
                                        <CheckIcon aria-hidden="true" />
                                        Approve payment
                                    </Button>
                                </>
                            )}
                        </>
                    )
                }
            >
                {selected && (
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Payment
                                </p>
                                <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-slate-950 dark:text-white">
                                    {money(selected.amount)}
                                </p>
                                <p className="mt-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                                    {selected.customer_name}
                                </p>
                            </div>
                            <Badge
                                tone={
                                    selected.status === 'reviewed'
                                        ? 'info'
                                        : 'draft'
                                }
                                size="md"
                            >
                                {selected.status === 'reviewed'
                                    ? 'Reviewed'
                                    : 'Pending review'}
                            </Badge>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                                        <Building2Icon
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                        Customer &amp; school
                                    </h3>
                                </div>
                                <Button asChild variant="secondary" size="sm">
                                    <Link
                                        href={`/superadmin/customers/${selected.customer_id}`}
                                    >
                                        View customer
                                        <ArrowUpRightIcon aria-hidden="true" />
                                    </Link>
                                </Button>
                            </div>
                            <dl className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
                                <Detail
                                    label="School"
                                    value={selected.school_name ?? '—'}
                                />
                                <Detail
                                    label="Customer"
                                    value={selected.customer_contact_name}
                                />
                                <Detail
                                    label="Email"
                                    value={selected.customer_email}
                                />
                                <Detail
                                    label="Phone"
                                    value={selected.customer_phone ?? '—'}
                                />
                            </dl>
                        </div>

                        <div>
                            <div className="mb-3 flex items-center gap-2">
                                <span className="flex size-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                                    <ReceiptTextIcon
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </span>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                    Subscription
                                </h3>
                            </div>
                            <dl className="grid gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:grid-cols-3">
                                <Detail
                                    label="Plan"
                                    value={selected.subscription_name}
                                />
                                <Detail
                                    label="Plan amount"
                                    value={money(selected.subscription_amount)}
                                />
                                <Detail
                                    label="Approved"
                                    value={money(selected.approved_amount)}
                                />
                                <Detail
                                    label="Balance"
                                    value={money(selected.balance_amount)}
                                />
                                <Detail
                                    label="Started"
                                    value={date(
                                        selected.subscription_started_at,
                                    )}
                                />
                                <Detail
                                    label="Expires"
                                    value={date(
                                        selected.subscription_expired_at,
                                    )}
                                />
                            </dl>
                        </div>

                        <div>
                            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                                Payment details
                            </h3>
                            <dl className="grid gap-x-5 gap-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:grid-cols-2">
                                <Detail
                                    label="Recorded by"
                                    value={selected.recorded_by ?? 'Unknown'}
                                />
                                <Detail
                                    label="Recorded"
                                    value={date(selected.created_at, true)}
                                />
                                <Detail
                                    label="Method"
                                    value={selected.payment_method ?? '—'}
                                />
                                <Detail
                                    label="Account / reference"
                                    value={selected.account_number ?? '—'}
                                />
                                <Detail
                                    label="Receipt"
                                    value={
                                        selected.receipts.length > 0
                                            ? `${selected.receipts.length} attached`
                                            : 'None attached'
                                    }
                                />
                                {selected.next_payment_date && (
                                    <Detail
                                        label="Next payment"
                                        value={date(selected.next_payment_date)}
                                    />
                                )}
                                {selected.reviewed_at && (
                                    <Detail
                                        label="Reviewed"
                                        value={`${date(selected.reviewed_at, true)}${selected.reviewed_by ? ` · ${selected.reviewed_by}` : ''}`}
                                    />
                                )}
                            </dl>
                            {selected.notes && (
                                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                    {selected.notes}
                                </p>
                            )}
                            {selected.receipts.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {selected.receipts.map((url, index) => (
                                        <a
                                            key={`${url}-${index}`}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-brand-700 hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-slate-700 dark:text-brand-300 dark:hover:bg-slate-800"
                                        >
                                            Receipt {index + 1}
                                            <ExternalLinkIcon
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selected.recent_payments.length > 1 && (
                            <div>
                                <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                                    Recent payments
                                </h3>
                                <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                                    {selected.recent_payments.map((payment) => (
                                        <div
                                            key={payment.id}
                                            className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                                        >
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                <Clock3Icon
                                                    className="size-3.5 text-slate-400"
                                                    aria-hidden="true"
                                                />
                                                {date(payment.created_at)}
                                                {payment.id === selected.id && (
                                                    <span className="font-semibold text-brand-700 dark:text-brand-300">
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                                                    {money(payment.amount)}
                                                </span>
                                                <Badge
                                                    tone={
                                                        payment.status ===
                                                        'approved'
                                                            ? 'saved'
                                                            : payment.status ===
                                                                'rejected'
                                                              ? 'danger'
                                                              : payment.status ===
                                                                  'reviewed'
                                                                ? 'info'
                                                                : 'draft'
                                                    }
                                                >
                                                    {statusLabel(
                                                        payment.status,
                                                    )}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {rejecting && (
                            <div>
                                <label
                                    htmlFor="dashboard-rejection-reason"
                                    className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white"
                                >
                                    Rejection reason
                                </label>
                                <textarea
                                    id="dashboard-rejection-reason"
                                    rows={3}
                                    maxLength={1000}
                                    value={rejectionReason}
                                    onChange={(event) => {
                                        setRejectionReason(event.target.value);
                                        setErrors({});
                                    }}
                                    className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                                {errors.rejection_reason && (
                                    <p
                                        role="alert"
                                        className="mt-1 text-xs text-rose-600"
                                    >
                                        {errors.rejection_reason}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </section>
    );
}

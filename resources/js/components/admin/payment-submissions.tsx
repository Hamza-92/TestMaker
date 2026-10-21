import { router } from '@inertiajs/react';
import { ArrowUpRightIcon, CalendarDaysIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PaymentsToReview } from '@/components/admin/payment-review';
import type { PaymentToReview } from '@/components/admin/payment-review';
import { Badge, Button, Card, Input, Pagination, Tabs } from '@/components/tm';
import type { PageMeta } from '@/components/tm';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface PaymentRequest {
    id: number;
    subscription_id: number;
    agent: string;
    customer_name: string;
    phone: string | null;
    school: string | null;
    subscription: string;
    payable: string;
    paid: string;
    due: string;
    commission: string;
    status: 'pending_review' | 'reviewed' | 'approved' | 'rejected';
}

export interface PaymentRequests {
    filters: { from: string; to: string; status: StatusFilter };
    data: PaymentRequest[];
    totals: { payable: string; paid: string; due: string; commission: string };
    meta: PageMeta;
}

function money(value: string): string {
    return `Rs ${Number(value).toLocaleString('en-PK', {
        maximumFractionDigits: 2,
    })}`;
}

export function PaymentSubmissions({
    requests,
}: {
    requests: PaymentRequests;
}) {
    const [from, setFrom] = useState(requests.filters.from);
    const [to, setTo] = useState(requests.filters.to);
    const [dateError, setDateError] = useState('');
    const [openingId, setOpeningId] = useState<number | null>(null);
    const [openError, setOpenError] = useState('');
    const [selected, setSelected] = useState<PaymentToReview | null>(null);
    const detailRequest = useRef(0);
    const fromInput = useRef<HTMLInputElement>(null);
    const toInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setFrom(requests.filters.from);
        setTo(requests.filters.to);
        setDateError('');
    }, [requests.filters.from, requests.filters.to]);

    function visit(
        status: StatusFilter,
        page = 1,
        start = requests.filters.from,
        end = requests.filters.to,
    ) {
        router.get(
            '/superadmin/payments',
            { from: start, to: end, status, page },
            {
                only: ['paymentRequests'],
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    }

    function applyDates() {
        if (!from || !to || from > to) {
            setDateError('Choose a valid date range.');

            return;
        }

        setDateError('');
        visit(requests.filters.status, 1, from, to);
    }

    async function open(id: number) {
        const requestNumber = ++detailRequest.current;
        setOpeningId(id);
        setOpenError('');

        try {
            const response = await fetch(
                `/superadmin/payments/requests/${id}`,
                {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                },
            );

            if (!response.ok) {
                throw new Error('Could not open payment details.');
            }

            const detail = (await response.json()) as PaymentToReview;

            if (detailRequest.current === requestNumber) {
                setSelected(detail);
            }
        } catch {
            if (detailRequest.current === requestNumber) {
                setOpenError('Could not open payment details. Try again.');
            }
        } finally {
            if (detailRequest.current === requestNumber) {
                setOpeningId(null);
            }
        }
    }

    return (
        <section aria-labelledby="payment-submissions-title">
            <Card padding="none" className="overflow-hidden">
                <div className="space-y-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <h2
                            id="payment-submissions-title"
                            className="self-center text-sm font-semibold text-slate-900 dark:text-white"
                        >
                            Payment Submission Requests
                        </h2>
                        <div className="flex flex-wrap items-end gap-2">
                            <div className="grid gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                <label htmlFor="payment-from">From</label>
                                <div className="relative">
                                    <Input
                                        id="payment-from"
                                        ref={fromInput}
                                        type="date"
                                        value={from}
                                        onChange={(event) =>
                                            setFrom(event.target.value)
                                        }
                                        onClick={() =>
                                            fromInput.current?.showPicker?.()
                                        }
                                        className="w-40 pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0"
                                    />
                                    <button
                                        type="button"
                                        aria-label="Choose start date"
                                        onClick={() =>
                                            fromInput.current?.showPicker?.()
                                        }
                                        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-slate-500 hover:text-brand-600"
                                    >
                                        <CalendarDaysIcon
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </button>
                                </div>
                            </div>
                            <div className="grid gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                <label htmlFor="payment-to">To</label>
                                <div className="relative">
                                    <Input
                                        id="payment-to"
                                        ref={toInput}
                                        type="date"
                                        value={to}
                                        onChange={(event) =>
                                            setTo(event.target.value)
                                        }
                                        onClick={() =>
                                            toInput.current?.showPicker?.()
                                        }
                                        className="w-40 pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0"
                                    />
                                    <button
                                        type="button"
                                        aria-label="Choose end date"
                                        onClick={() =>
                                            toInput.current?.showPicker?.()
                                        }
                                        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-slate-500 hover:text-brand-600"
                                    >
                                        <CalendarDaysIcon
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </button>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={applyDates}
                            >
                                Apply
                            </Button>
                        </div>
                    </div>
                    {dateError && (
                        <p role="alert" className="text-xs text-rose-600">
                            {dateError}
                        </p>
                    )}
                    <Tabs<StatusFilter>
                        items={[
                            { value: 'all', label: 'All' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'approved', label: 'Approved' },
                            { value: 'rejected', label: 'Rejected' },
                        ]}
                        value={requests.filters.status}
                        onChange={(status) => visit(status)}
                    />
                    {openError && (
                        <p role="alert" className="text-xs text-rose-600">
                            {openError}
                        </p>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1250px] text-left text-sm">
                        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                            <tr>
                                <th scope="col" className="px-5 py-3">
                                    ID
                                </th>
                                <th scope="col" className="px-3 py-3">
                                    Agent
                                </th>
                                <th scope="col" className="px-3 py-3">
                                    Customer Name
                                </th>
                                <th scope="col" className="px-3 py-3">
                                    Phone
                                </th>
                                <th scope="col" className="px-3 py-3">
                                    School
                                </th>
                                <th scope="col" className="px-3 py-3">
                                    Subscription
                                </th>
                                <th
                                    scope="col"
                                    className="px-3 py-3 text-right"
                                >
                                    Payable
                                </th>
                                <th
                                    scope="col"
                                    className="px-3 py-3 text-right"
                                >
                                    Paid
                                </th>
                                <th
                                    scope="col"
                                    className="px-3 py-3 text-right"
                                >
                                    Due
                                </th>
                                <th
                                    scope="col"
                                    className="px-3 py-3 text-right"
                                >
                                    Commission
                                </th>
                                <th scope="col" className="px-3 py-3">
                                    Status
                                </th>
                                <th
                                    scope="col"
                                    className="px-5 py-3 text-right"
                                >
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {requests.data.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={12}
                                        className="px-5 py-10 text-center text-slate-500 dark:text-slate-400"
                                    >
                                        No payment requests in this range.
                                    </td>
                                </tr>
                            ) : (
                                requests.data.map((payment) => (
                                    <tr
                                        key={payment.id}
                                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                                    >
                                        <td className="px-5 py-3 font-semibold tabular-nums text-slate-900 dark:text-white">
                                            #{payment.subscription_id}
                                        </td>
                                        <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                                            {payment.agent}
                                        </td>
                                        <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">
                                            {payment.customer_name}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">
                                            {payment.phone ?? '—'}
                                        </td>
                                        <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                                            {payment.school ?? '—'}
                                        </td>
                                        <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                                            {payment.subscription}
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                                            {money(payment.payable)}
                                        </td>
                                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                                            {money(payment.paid)}
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                                            {money(payment.due)}
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                                            {money(payment.commission)}
                                        </td>
                                        <td className="px-3 py-3">
                                            <Badge
                                                tone={
                                                    payment.status ===
                                                    'approved'
                                                        ? 'saved'
                                                        : payment.status ===
                                                            'rejected'
                                                          ? 'danger'
                                                          : 'draft'
                                                }
                                            >
                                                {payment.status === 'approved'
                                                    ? 'Approved'
                                                    : payment.status ===
                                                        'rejected'
                                                      ? 'Rejected'
                                                      : 'Pending'}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                disabled={
                                                    openingId === payment.id
                                                }
                                                onClick={() => open(payment.id)}
                                            >
                                                Open{' '}
                                                <ArrowUpRightIcon aria-hidden="true" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800/60 dark:text-white">
                            <tr>
                                <th
                                    colSpan={6}
                                    scope="row"
                                    className="px-5 py-3 text-left text-xs uppercase tracking-wide"
                                    title="Subscriptions are counted once; payments follow the selected filters."
                                >
                                    Total (filtered)
                                </th>
                                <td className="px-3 py-3 text-right tabular-nums">
                                    {money(requests.totals.payable)}
                                </td>
                                <td className="px-3 py-3 text-right tabular-nums">
                                    {money(requests.totals.paid)}
                                </td>
                                <td className="px-3 py-3 text-right tabular-nums">
                                    {money(requests.totals.due)}
                                </td>
                                <td className="px-3 py-3 text-right tabular-nums">
                                    {money(requests.totals.commission)}
                                </td>
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>
            <div className="mt-3">
                <Pagination
                    meta={requests.meta}
                    label="requests"
                    onPageChange={(page) =>
                        visit(requests.filters.status, page)
                    }
                />
            </div>
            {selected && (
                <PaymentsToReview
                    key={selected.id}
                    payments={[selected]}
                    total={1}
                    hideTable
                    selectedPaymentId={selected.id}
                    onClose={() => {
                        detailRequest.current++;
                        setSelected(null);
                        setOpeningId(null);
                    }}
                />
            )}
        </section>
    );
}

import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowUpRightIcon,
    BanknoteIcon,
    CalendarDaysIcon,
    Clock3Icon,
    RefreshCwIcon,
    ShoppingBagIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PaymentsToReview } from '@/components/admin/payment-review';
import type { PaymentToReview } from '@/components/admin/payment-review';
import { SummaryCard } from '@/components/admin/summary-card';
import { Badge, Button, Card, Input, Pagination } from '@/components/tm';
import type { PageMeta } from '@/components/tm';

interface LedgerRow {
    id: number;
    customer_id: number;
    subscription_id: number;
    paid_at: string;
    school: string | null;
    phone: string | null;
    amount: string;
    method: string;
    source: 'new' | 'renewal' | 'due';
    agent: string;
}

interface LedgerData {
    filters: { from: string; to: string; search: string };
    summary: {
        total_received: string;
        new_sales: string;
        renewals: string;
        due_payments: string;
    };
    data: LedgerRow[];
    meta: PageMeta;
}

function money(value: string): string {
    return `Rs ${Number(value).toLocaleString('en-PK', {
        maximumFractionDigits: 2,
    })}`;
}

function paidAt(value: string): string {
    const date = new Date(`${value.replace(' ', 'T')}Z`);

    return new Intl.DateTimeFormat('en-PK', {
        timeZone: 'Asia/Karachi',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export default function PaymentLedger({ ledger }: { ledger: LedgerData }) {
    const [from, setFrom] = useState(ledger.filters.from);
    const [to, setTo] = useState(ledger.filters.to);
    const [search, setSearch] = useState(ledger.filters.search);
    const [filterError, setFilterError] = useState('');
    const [openError, setOpenError] = useState('');
    const [openingId, setOpeningId] = useState<number | null>(null);
    const [selected, setSelected] = useState<PaymentToReview | null>(null);
    const detailRequest = useRef(0);
    const fromInput = useRef<HTMLInputElement>(null);
    const toInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setFrom(ledger.filters.from);
        setTo(ledger.filters.to);
        setSearch(ledger.filters.search);
    }, [ledger.filters.from, ledger.filters.to, ledger.filters.search]);

    function visit(page = 1, start = from, end = to, term = search) {
        router.get(
            '/superadmin/payments/ledger',
            { from: start, to: end, search: term.trim(), page },
            {
                only: ['ledger'],
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    }

    function apply() {
        if (!from || !to || from >= to) {
            setFilterError(
                'Choose a valid date range. The To date is exclusive.',
            );

            return;
        }

        setFilterError('');
        visit();
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
                throw new Error('Could not open receipt.');
            }

            const detail = (await response.json()) as PaymentToReview;

            if (detailRequest.current === requestNumber) {
                setSelected(detail);
            }
        } catch {
            if (detailRequest.current === requestNumber) {
                setOpenError('Could not open receipt. Try again.');
            }
        } finally {
            if (detailRequest.current === requestNumber) {
                setOpeningId(null);
            }
        }
    }

    return (
        <>
            <Head title="Payment Ledger" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <section
                    aria-label="Ledger summary"
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                >
                    <SummaryCard
                        label="Total Received"
                        value={money(ledger.summary.total_received)}
                        icon={BanknoteIcon}
                        tone="blue"
                    />
                    <SummaryCard
                        label="New Sales"
                        value={money(ledger.summary.new_sales)}
                        icon={ShoppingBagIcon}
                        tone="emerald"
                    />
                    <SummaryCard
                        label="Renewals"
                        value={money(ledger.summary.renewals)}
                        icon={RefreshCwIcon}
                        tone="violet"
                    />
                    <SummaryCard
                        label="Due Payments"
                        value={money(ledger.summary.due_payments)}
                        icon={Clock3Icon}
                        tone="amber"
                    />
                </section>

                <Card padding="none" className="px-5 py-4">
                    <form
                        className="flex flex-wrap items-end gap-3"
                        onSubmit={(event) => {
                            event.preventDefault();
                            apply();
                        }}
                    >
                        <h1 className="mr-auto self-center text-sm font-semibold text-slate-900 dark:text-white">
                            Payment Ledger
                        </h1>
                        <label className="grid gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                            From
                            <span className="relative">
                                <Input
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
                                <CalendarDaysIcon
                                    className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2"
                                    aria-hidden="true"
                                />
                            </span>
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                            To (exclusive)
                            <span className="relative">
                                <Input
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
                                <CalendarDaysIcon
                                    className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2"
                                    aria-hidden="true"
                                />
                            </span>
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                            Search
                            <Input
                                type="search"
                                placeholder="School, phone or ID"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                className="w-52"
                            />
                        </label>
                        <Button type="submit" variant="primary">
                            Apply
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() =>
                                router.get('/superadmin/payments/ledger')
                            }
                        >
                            This Month
                        </Button>
                    </form>
                    {filterError && (
                        <p role="alert" className="mt-2 text-xs text-rose-600">
                            {filterError}
                        </p>
                    )}
                </Card>

                <section aria-label="Approved payment ledger">
                    <Card padding="none" className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1050px] text-left text-sm">
                                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                                    <tr>
                                        <th scope="col" className="px-5 py-3">
                                            ID
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Paid At
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Sale
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            School
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Phone
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3 text-right"
                                        >
                                            Amount
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Method
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Source
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Agent
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-3 text-right"
                                        >
                                            Receipt
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {ledger.data.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={10}
                                                className="px-5 py-10 text-center text-slate-500 dark:text-slate-400"
                                            >
                                                No approved payments in this
                                                range.
                                            </td>
                                        </tr>
                                    ) : (
                                        ledger.data.map((payment) => (
                                            <tr
                                                key={payment.id}
                                                className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                                            >
                                                <td className="px-5 py-3 font-semibold tabular-nums text-slate-900 dark:text-white">
                                                    #{payment.id}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">
                                                    {paidAt(payment.paid_at)}
                                                </td>
                                                <td className="px-3 py-3 tabular-nums">
                                                    <Link
                                                        href={`/superadmin/customers/${payment.customer_id}/subscriptions/${payment.subscription_id}`}
                                                        className="font-semibold text-brand-600 hover:underline"
                                                    >
                                                        #
                                                        {
                                                            payment.subscription_id
                                                        }
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">
                                                    {payment.school ?? '—'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">
                                                    {payment.phone ?? '—'}
                                                </td>
                                                <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                                                    {money(payment.amount)}
                                                </td>
                                                <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                                                    {payment.method}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <Badge
                                                        tone={
                                                            payment.source ===
                                                            'new'
                                                                ? 'saved'
                                                                : payment.source ===
                                                                    'renewal'
                                                                  ? 'info'
                                                                  : 'draft'
                                                        }
                                                    >
                                                        {payment.source ===
                                                        'new'
                                                            ? 'New'
                                                            : payment.source ===
                                                                'renewal'
                                                              ? 'Renewal'
                                                              : 'Due'}
                                                    </Badge>
                                                </td>
                                                <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                                                    {payment.agent}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        disabled={
                                                            openingId ===
                                                            payment.id
                                                        }
                                                        onClick={() =>
                                                            open(payment.id)
                                                        }
                                                    >
                                                        View{' '}
                                                        <ArrowUpRightIcon aria-hidden="true" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                    {openError && (
                        <p role="alert" className="mt-2 text-xs text-rose-600">
                            {openError}
                        </p>
                    )}
                    <div className="mt-3">
                        <Pagination
                            meta={ledger.meta}
                            label="payments"
                            onPageChange={(page) =>
                                visit(
                                    page,
                                    ledger.filters.from,
                                    ledger.filters.to,
                                    ledger.filters.search,
                                )
                            }
                        />
                    </div>
                </section>
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
            </div>
        </>
    );
}

PaymentLedger.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Payments', href: '/superadmin/payments' },
        { title: 'Payment Ledger', href: '/superadmin/payments/ledger' },
    ],
};

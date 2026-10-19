import { Head, Link } from '@inertiajs/react';
import {
    ArrowUpRightIcon,
    BanknoteIcon,
    Clock3Icon,
    CreditCardIcon,
    UsersIcon,
    UserRoundCheckIcon,
} from 'lucide-react';
import { DashboardTrends } from '@/components/admin/dashboard-trends';
import type { DashboardTrendsData } from '@/components/admin/dashboard-trends';
import { SummaryCard } from '@/components/admin/summary-card';
import { Card } from '@/components/tm/card';
import { dashboard } from '@/routes';

interface Summary {
    paid_customers?: number;
    active_trials?: number;
    expiring_soon?: number;
    pending_payments?: number;
    approved_payments_this_month?: string;
}

interface PaymentToReview {
    id: number;
    customer_id: number;
    customer_name: string;
    subscription_id: number;
    amount: string;
    status: 'pending_review' | 'reviewed';
    created_at: string;
}

function formatCount(value: number): string {
    return value.toLocaleString('en-PK');
}

function formatMoney(value: string): string {
    return `Rs ${Number(value).toLocaleString('en-PK', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}

export default function Dashboard({
    summary,
    trends,
    paymentsToReview,
}: {
    summary: Summary;
    trends: DashboardTrendsData;
    paymentsToReview: PaymentToReview[] | null;
}) {
    const hasSummary = Object.keys(summary).length > 0;

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">
                {hasSummary ? (
                    <section
                        aria-label="Summary"
                        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5"
                    >
                        {summary.paid_customers !== undefined && (
                            <SummaryCard
                                label="Active paid customers"
                                value={formatCount(summary.paid_customers)}
                                icon={UsersIcon}
                                tone="blue"
                                href="/superadmin/customers/paid"
                            />
                        )}
                        {summary.active_trials !== undefined && (
                            <SummaryCard
                                label="Active trials"
                                value={formatCount(summary.active_trials)}
                                icon={UserRoundCheckIcon}
                                tone="violet"
                                href="/superadmin/customers/trial"
                            />
                        )}
                        {summary.expiring_soon !== undefined && (
                            <SummaryCard
                                label="Expiring soon"
                                value={formatCount(summary.expiring_soon)}
                                icon={Clock3Icon}
                                tone="amber"
                                href="/superadmin/customers/paid"
                            />
                        )}
                        {summary.pending_payments !== undefined && (
                            <SummaryCard
                                label="Payments to review"
                                value={formatCount(summary.pending_payments)}
                                icon={CreditCardIcon}
                                tone="rose"
                            />
                        )}
                        {summary.approved_payments_this_month !== undefined && (
                            <SummaryCard
                                label="Approved payments this month"
                                value={formatMoney(
                                    summary.approved_payments_this_month,
                                )}
                                icon={BanknoteIcon}
                                tone="emerald"
                            />
                        )}
                    </section>
                ) : (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                        No summary metrics are available for your permissions.
                    </div>
                )}

                <DashboardTrends trends={trends} />

                {paymentsToReview !== null && (
                    <section aria-labelledby="payments-to-review-title">
                        <Card padding="none" className="overflow-hidden">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                                <h2
                                    id="payments-to-review-title"
                                    className="text-sm font-semibold text-slate-900 dark:text-white"
                                >
                                    Payments to review
                                </h2>
                                <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg bg-rose-600 px-2 text-sm font-bold text-white">
                                    {formatCount(
                                        summary.pending_payments ??
                                            paymentsToReview.length,
                                    )}
                                </span>
                            </div>
                            {paymentsToReview.length === 0 ? (
                                <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                    No payments need review right now.
                                </p>
                            ) : (
                                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {paymentsToReview.map((payment) => (
                                        <li key={payment.id}>
                                            <Link
                                                href={`/superadmin/customers/${payment.customer_id}/subscriptions/${payment.subscription_id}`}
                                                className="group flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:hover:bg-slate-800/50"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                                        {payment.customer_name}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                        {new Date(
                                                            payment.created_at,
                                                        ).toLocaleDateString(
                                                            'en-PK',
                                                            {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                timeZone:
                                                                    'Asia/Karachi',
                                                            },
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-3">
                                                    <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                                                        {formatMoney(
                                                            payment.amount,
                                                        )}
                                                    </span>
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${payment.status === 'reviewed' ? 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}
                                                    >
                                                        {payment.status ===
                                                        'reviewed'
                                                            ? 'Reviewed'
                                                            : 'Pending'}
                                                    </span>
                                                    <ArrowUpRightIcon
                                                        className="size-4 text-slate-400 transition-colors group-hover:text-rose-600"
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </section>
                )}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};

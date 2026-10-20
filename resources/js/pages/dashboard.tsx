import { Head } from '@inertiajs/react';
import {
    BanknoteIcon,
    Clock3Icon,
    CreditCardIcon,
    UsersIcon,
    UserRoundCheckIcon,
} from 'lucide-react';
import { DashboardTrends } from '@/components/admin/dashboard-trends';
import type { DashboardTrendsData } from '@/components/admin/dashboard-trends';
import { EmployeeActivityCard } from '@/components/admin/employee-activity';
import type { EmployeeActivity } from '@/components/admin/employee-activity';
import { NeedsAttention } from '@/components/admin/needs-attention';
import type {
    ExpiringSubscription,
    RecentlyExpiredCustomer,
} from '@/components/admin/needs-attention';
import { PaymentsToReview } from '@/components/admin/payment-review';
import type { PaymentToReview } from '@/components/admin/payment-review';
import { SubscriptionStatusChart } from '@/components/admin/subscription-status-chart';
import type { SubscriptionStatusData } from '@/components/admin/subscription-status-chart';
import { SummaryCard } from '@/components/admin/summary-card';
import { dashboard } from '@/routes';

interface Summary {
    paid_customers?: number;
    active_trials?: number;
    expiring_soon?: number;
    pending_payments?: number;
    approved_payments_this_month?: string;
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
    subscriptionStatus,
    recentEmployeeActivity,
    paymentsToReview,
    expiringSubscriptions,
    recentExpiredCustomers,
}: {
    summary: Summary;
    trends: DashboardTrendsData;
    subscriptionStatus: SubscriptionStatusData | null;
    recentEmployeeActivity: EmployeeActivity[] | null;
    paymentsToReview: PaymentToReview[] | null;
    expiringSubscriptions: ExpiringSubscription[] | null;
    recentExpiredCustomers: RecentlyExpiredCustomer[] | null;
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

                {(trends.customers || subscriptionStatus) && (
                    <div
                        className={`grid gap-4 ${trends.customers && subscriptionStatus ? 'xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,1fr)]' : ''}`}
                    >
                        <DashboardTrends trends={trends} />
                        {subscriptionStatus && (
                            <SubscriptionStatusChart
                                status={subscriptionStatus}
                            />
                        )}
                    </div>
                )}

                {(expiringSubscriptions !== null ||
                    recentEmployeeActivity !== null) && (
                    <div
                        className={`grid gap-4 ${expiringSubscriptions !== null && recentExpiredCustomers !== null && recentEmployeeActivity !== null ? 'xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]' : ''}`}
                    >
                        {expiringSubscriptions !== null &&
                            recentExpiredCustomers !== null && (
                                <NeedsAttention
                                    nearExpiry={expiringSubscriptions}
                                    recentlyExpired={recentExpiredCustomers}
                                />
                            )}
                        {recentEmployeeActivity !== null && (
                            <EmployeeActivityCard
                                activities={recentEmployeeActivity}
                            />
                        )}
                    </div>
                )}

                {paymentsToReview !== null && (
                    <PaymentsToReview
                        payments={paymentsToReview}
                        total={
                            summary.pending_payments ?? paymentsToReview.length
                        }
                    />
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

import { Head } from '@inertiajs/react';
import {
    BanknoteIcon,
    CoinsIcon,
    CreditCardIcon,
    ReceiptIcon,
    TrendingUpIcon,
    WalletIcon,
} from 'lucide-react';
import { PaymentSubmissions } from '@/components/admin/payment-submissions';
import type { PaymentRequests } from '@/components/admin/payment-submissions';
import { SummaryCard } from '@/components/admin/summary-card';
import { Card } from '@/components/tm';

interface PaymentsSummary {
    approved: string;
    gross: string;
    commissions: string;
    net: string;
    expenses: string;
    profit: string;
}

interface AgentCommission {
    id: number;
    name: string;
    email: string;
    sales: number;
    commission: string;
}

interface AgentCommissions {
    agents: AgentCommission[];
    totalSales: number;
    totalCommission: string;
}

function formatMoney(value: string): string {
    return `Rs ${Number(value).toLocaleString('en-PK', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}

export default function Payments({
    summary,
    agentCommissions,
    paymentRequests,
}: {
    summary: PaymentsSummary;
    agentCommissions: AgentCommissions;
    paymentRequests: PaymentRequests;
}) {
    return (
        <>
            <Head title="Payments" />
            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">
                <section
                    aria-label="Payment summary"
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                >
                    <SummaryCard
                        label="Total payable (approved)"
                        value={formatMoney(summary.approved)}
                        icon={BanknoteIcon}
                        tone="emerald"
                    />
                    <SummaryCard
                        label="Gross received"
                        value={formatMoney(summary.gross)}
                        icon={CreditCardIcon}
                        tone="blue"
                    />
                    <SummaryCard
                        label="Agent commissions"
                        value={formatMoney(summary.commissions)}
                        icon={CoinsIcon}
                        tone="violet"
                    />
                    <SummaryCard
                        label="Net after commission"
                        value={formatMoney(summary.net)}
                        icon={WalletIcon}
                        tone="amber"
                    />
                    <SummaryCard
                        label="Expenses"
                        value={formatMoney(summary.expenses)}
                        icon={ReceiptIcon}
                        tone="rose"
                    />
                    <SummaryCard
                        label="Profit"
                        value={formatMoney(summary.profit)}
                        icon={TrendingUpIcon}
                        tone="emerald"
                    />
                </section>
                <section aria-labelledby="agent-commissions-title">
                    <Card padding="none" className="overflow-hidden">
                        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                            <h2
                                id="agent-commissions-title"
                                className="text-sm font-semibold text-slate-900 dark:text-white"
                            >
                                Agent commissions (this month)
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[650px] text-left text-sm">
                                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                                    <tr>
                                        <th
                                            scope="col"
                                            className="w-16 px-5 py-3"
                                        >
                                            Sr.
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Agent
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Email
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3 text-right"
                                        >
                                            Sales
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-3 text-right"
                                        >
                                            Commission
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {agentCommissions.agents.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-5 py-10 text-center text-slate-500 dark:text-slate-400"
                                            >
                                                No approved sales this month.
                                            </td>
                                        </tr>
                                    ) : (
                                        agentCommissions.agents.map(
                                            (agent, index) => (
                                                <tr
                                                    key={agent.id}
                                                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                                                >
                                                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">
                                                        {agent.name}
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                                                        {agent.email}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-900 dark:text-white">
                                                        {agent.sales.toLocaleString(
                                                            'en-PK',
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                                                        {formatMoney(
                                                            agent.commission,
                                                        )}
                                                    </td>
                                                </tr>
                                            ),
                                        )
                                    )}
                                </tbody>
                                <tfoot className="border-t border-slate-200 bg-slate-50/80 font-semibold text-slate-950 dark:border-slate-700 dark:bg-slate-800/40 dark:text-white">
                                    <tr>
                                        <th
                                            scope="row"
                                            colSpan={3}
                                            className="px-5 py-3 text-left"
                                        >
                                            Total
                                        </th>
                                        <td className="px-3 py-3 text-right tabular-nums">
                                            {agentCommissions.totalSales.toLocaleString(
                                                'en-PK',
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-right tabular-nums">
                                            {formatMoney(
                                                agentCommissions.totalCommission,
                                            )}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </Card>
                </section>
                <PaymentSubmissions requests={paymentRequests} />
            </div>
        </>
    );
}

Payments.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Payments', href: '/superadmin/payments' },
    ],
};

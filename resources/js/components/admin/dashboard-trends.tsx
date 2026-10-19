import { BarChart3Icon, TrendingUpIcon } from 'lucide-react';
import { useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Card } from '@/components/tm/card';
import { iconCardStyle } from '@/lib/icon-appearance';

export interface PaymentTrendMonth {
    month: string;
    label: string;
    amount_cents: number;
}

export interface PaymentTrendDay {
    date: string;
    label: string;
    amount_cents: number;
}

export interface CustomerTrendMonth {
    month: string;
    label: string;
    paid: number | null;
    trial: number | null;
}

export interface CustomerTrendDay {
    date: string;
    label: string;
    paid: number | null;
    trial: number | null;
}

export interface DashboardTrendsData {
    payments?: PaymentTrendMonth[];
    customers?: CustomerTrendMonth[];
    paymentDays?: PaymentTrendDay[];
    customerDays?: CustomerTrendDay[];
}

type PaymentTrendPoint = PaymentTrendMonth | PaymentTrendDay;
type CustomerTrendPoint = CustomerTrendMonth | CustomerTrendDay;

const axisStyle = { fill: '#94a3b8', fontSize: 11 };
const tooltipStyle = {
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    boxShadow: '0 12px 32px -12px rgba(15, 23, 42, 0.25)',
    fontSize: 12,
};

function money(cents: number): string {
    return `Rs ${(cents / 100).toLocaleString('en-PK', {
        maximumFractionDigits: 2,
    })}`;
}

function compactMoney(cents: number): string {
    const amount = cents / 100;

    return amount >= 1000000
        ? `${(amount / 1000000).toLocaleString('en-PK', { maximumFractionDigits: 1 })}m`
        : amount >= 1000
          ? `${(amount / 1000).toLocaleString('en-PK', { maximumFractionDigits: 1 })}k`
          : amount.toLocaleString('en-PK');
}

export function DashboardTrends({ trends }: { trends: DashboardTrendsData }) {
    const [range, setRange] = useState<'month' | 6 | 12>(6);
    const payments: PaymentTrendPoint[] | undefined =
        range === 'month' ? trends.paymentDays : trends.payments?.slice(-range);
    const customers: CustomerTrendPoint[] | undefined =
        range === 'month'
            ? trends.customerDays
            : trends.customers?.slice(-range);
    const showPaid = customers?.[0]?.paid !== null;
    const showTrial = customers?.[0]?.trial !== null;

    if (!payments && !customers) {
        return null;
    }

    return (
        <section aria-labelledby="activity-trends-title" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h2
                    id="activity-trends-title"
                    className="text-base font-semibold text-slate-900 dark:text-white"
                >
                    Trends
                </h2>
                <div
                    aria-label="Chart period"
                    className="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
                >
                    {(
                        [
                            { value: 'month', label: '1M' },
                            { value: 6, label: '6M' },
                            { value: 12, label: '12M' },
                        ] as const
                    ).map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            aria-pressed={range === option.value}
                            onClick={() => setRange(option.value)}
                            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${range === option.value ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                {payments && (
                    <Card
                        padding="md"
                        interactive
                        style={iconCardStyle('#059669')}
                        className="min-w-0"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                    Approved payments
                                </p>
                            </div>
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                                <BarChart3Icon
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                        </div>
                        <div
                            className="mt-4 h-60 w-full"
                            role="img"
                            aria-label={`Approved payment amounts by ${range === 'month' ? 'day' : 'month'}`}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={payments}
                                    margin={{
                                        top: 8,
                                        right: 4,
                                        left: -12,
                                        bottom: 0,
                                    }}
                                    accessibilityLayer
                                >
                                    <defs>
                                        <linearGradient
                                            id="approved-payment-bars"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="0%"
                                                stopColor="#34d399"
                                            />
                                            <stop
                                                offset="100%"
                                                stopColor="#059669"
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        vertical={false}
                                        stroke="#e2e8f0"
                                        strokeDasharray="4 4"
                                    />
                                    <XAxis
                                        dataKey="label"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={axisStyle}
                                        dy={8}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={axisStyle}
                                        tickFormatter={compactMoney}
                                        width={45}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#ecfdf5' }}
                                        contentStyle={tooltipStyle}
                                        formatter={(value) => [
                                            money(Number(value)),
                                            'Approved',
                                        ]}
                                        labelFormatter={(_, payload) =>
                                            payload[0]?.payload?.date ??
                                            payload[0]?.payload?.month ??
                                            ''
                                        }
                                    />
                                    <Bar
                                        dataKey="amount_cents"
                                        name="Approved"
                                        fill="url(#approved-payment-bars)"
                                        radius={[7, 7, 0, 0]}
                                        maxBarSize={42}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                )}

                {customers && (
                    <Card
                        padding="md"
                        interactive
                        style={iconCardStyle('#0284c7')}
                        className="min-w-0"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                    Customers
                                </p>
                            </div>
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
                                <TrendingUpIcon
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                        </div>
                        <div
                            className="mt-4 h-60 w-full"
                            role="img"
                            aria-label={`${range === 'month' ? 'Daily' : 'Monthly'} paid and trial customer counts`}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={customers}
                                    margin={{
                                        top: 10,
                                        right: 8,
                                        left: -16,
                                        bottom: 0,
                                    }}
                                    accessibilityLayer
                                >
                                    <defs>
                                        <linearGradient
                                            id="paid-customer-area"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="0%"
                                                stopColor="#0284c7"
                                                stopOpacity={0.2}
                                            />
                                            <stop
                                                offset="100%"
                                                stopColor="#0284c7"
                                                stopOpacity={0}
                                            />
                                        </linearGradient>
                                        <linearGradient
                                            id="trial-customer-area"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="0%"
                                                stopColor="#7c3aed"
                                                stopOpacity={0.18}
                                            />
                                            <stop
                                                offset="100%"
                                                stopColor="#7c3aed"
                                                stopOpacity={0}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        vertical={false}
                                        stroke="#e2e8f0"
                                        strokeDasharray="4 4"
                                    />
                                    <XAxis
                                        dataKey="label"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={axisStyle}
                                        dy={8}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={axisStyle}
                                        allowDecimals={false}
                                        width={36}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        labelFormatter={(_, payload) =>
                                            payload[0]?.payload?.date ??
                                            payload[0]?.payload?.month ??
                                            ''
                                        }
                                    />
                                    {showPaid && (
                                        <Area
                                            type="monotone"
                                            dataKey="paid"
                                            name="Paid"
                                            stroke="#0284c7"
                                            strokeWidth={3}
                                            fill="url(#paid-customer-area)"
                                            dot={customers.length === 1}
                                            activeDot={{ r: 5 }}
                                        />
                                    )}
                                    {showTrial && (
                                        <Area
                                            type="monotone"
                                            dataKey="trial"
                                            name="Trial"
                                            stroke="#7c3aed"
                                            strokeWidth={3}
                                            fill="url(#trial-customer-area)"
                                            dot={customers.length === 1}
                                            activeDot={{ r: 5 }}
                                        />
                                    )}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 flex justify-center gap-5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {showPaid && (
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="size-2.5 rounded-full bg-sky-600" />
                                    Paid
                                </span>
                            )}
                            {showTrial && (
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="size-2.5 rounded-full bg-violet-600" />
                                    Trial
                                </span>
                            )}
                        </div>
                    </Card>
                )}
            </div>
        </section>
    );
}

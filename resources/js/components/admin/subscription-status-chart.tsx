import { CircleDashedIcon } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '@/components/tm';
import { iconCardStyle } from '@/lib/icon-appearance';

export interface SubscriptionStatusData {
    active: number;
    expired: number;
}

export function SubscriptionStatusChart({
    status,
}: {
    status: SubscriptionStatusData;
}) {
    const data = [
        { name: 'Active', value: status.active, color: '#0284c7' },
        { name: 'Expired', value: status.expired, color: '#f59e0b' },
    ];
    const chartData = data.filter((entry) => entry.value > 0);

    return (
        <Card
            padding="md"
            interactive
            style={iconCardStyle('#f59e0b')}
            className="min-w-0"
        >
            <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                    <CircleDashedIcon className="size-4.5" aria-hidden="true" />
                </span>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Subscriptions
                </h2>
            </div>
            {chartData.length > 0 ? (
                <div
                    className="mt-3 h-52 w-full"
                    role="img"
                    aria-label="Active and expired subscription counts"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius="59%"
                                outerRadius="82%"
                                stroke="none"
                            >
                                {chartData.map((entry) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value) =>
                                    Number(value).toLocaleString('en-PK')
                                }
                                contentStyle={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 12,
                                    fontSize: 12,
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="mt-3 flex h-52 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    No subscriptions yet
                </div>
            )}
            <div className="mt-2 flex justify-center gap-5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {data.map((entry) => (
                    <span
                        key={entry.name}
                        className="inline-flex items-center gap-1.5"
                    >
                        <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        {entry.name}
                    </span>
                ))}
            </div>
        </Card>
    );
}

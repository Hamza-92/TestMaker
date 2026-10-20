import { Link } from '@inertiajs/react';
import { ArrowUpRightIcon, Clock3Icon } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, Tabs } from '@/components/tm';

export interface ExpiringSubscription {
    id: number;
    customer_id: number;
    school_name: string;
    plan_name: string;
    expires_at: string;
    days_left: number;
    within_7_days: boolean;
}

export interface RecentlyExpiredCustomer {
    customer_id: number;
    school_name: string;
    plan_name: string;
    expired_at: string;
    days_ago: number;
}

function date(value: string): string {
    return new Date(value).toLocaleDateString('en-PK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Karachi',
    });
}

export function NeedsAttention({
    nearExpiry,
    recentlyExpired,
}: {
    nearExpiry: ExpiringSubscription[];
    recentlyExpired: RecentlyExpiredCustomer[];
}) {
    const [tab, setTab] = useState<'near' | 'expired'>('near');
    const rows = tab === 'near' ? nearExpiry : recentlyExpired;

    return (
        <section aria-labelledby="needs-attention-title" className="min-w-0">
            <Card padding="none" className="h-full overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                            <Clock3Icon
                                className="size-4.5"
                                aria-hidden="true"
                            />
                        </span>
                        <h2
                            id="needs-attention-title"
                            className="text-sm font-semibold text-slate-900 dark:text-white"
                        >
                            Needs attention
                        </h2>
                    </div>
                    <Tabs
                        items={[
                            { value: 'near', label: 'Near expiry' },
                            { value: 'expired', label: 'Recently expired' },
                        ]}
                        value={tab}
                        onChange={setTab}
                    />
                </div>
                {rows.length === 0 ? (
                    <div className="flex min-h-52 items-center justify-center px-5 text-sm text-slate-500 dark:text-slate-400">
                        {tab === 'near'
                            ? 'No subscriptions expiring in the next 30 days'
                            : 'No customers expired in the last 30 days'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[650px] text-left">
                            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                                <tr>
                                    <th scope="col" className="px-5 py-2.5">
                                        School
                                    </th>
                                    <th scope="col" className="px-3 py-2.5">
                                        Plan
                                    </th>
                                    <th scope="col" className="px-3 py-2.5">
                                        {tab === 'near' ? 'Expires' : 'Expired'}
                                    </th>
                                    <th scope="col" className="px-3 py-2.5">
                                        Time
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-5 py-2.5 text-right"
                                    >
                                        Details
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {rows.map((row) => {
                                    const near = 'id' in row;

                                    return (
                                        <tr
                                            key={
                                                row.customer_id +
                                                '-' +
                                                (near ? row.id : 'expired')
                                            }
                                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                                        >
                                            <td className="max-w-44 truncate px-5 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                                                {row.school_name}
                                            </td>
                                            <td className="max-w-32 truncate px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                                                {row.plan_name}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                                                {date(
                                                    near
                                                        ? row.expires_at
                                                        : row.expired_at,
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-3">
                                                <Badge
                                                    tone={
                                                        near
                                                            ? row.days_left <= 3
                                                                ? 'danger'
                                                                : 'draft'
                                                            : 'danger'
                                                    }
                                                >
                                                    {near
                                                        ? `${row.days_left}d left`
                                                        : `${row.days_ago}d ago`}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <Button
                                                    asChild
                                                    variant="secondary"
                                                    size="sm"
                                                >
                                                    <Link
                                                        href={
                                                            near
                                                                ? `/superadmin/customers/${row.customer_id}/subscriptions/${row.id}`
                                                                : `/superadmin/customers/${row.customer_id}`
                                                        }
                                                    >
                                                        View{' '}
                                                        <ArrowUpRightIcon aria-hidden="true" />
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </section>
    );
}

import { Link } from '@inertiajs/react';
import { ActivityIcon, ArrowUpRightIcon } from 'lucide-react';
import { Card } from '@/components/tm';

export interface EmployeeActivity {
    id: number;
    type: 'customer' | 'subscription' | 'payment';
    event: 'created' | 'updated' | 'deleted' | 'restored';
    changes: string[];
    customer_id: number;
    school_name: string;
    employee_name: string;
    created_at: string;
}

function action(activity: EmployeeActivity): string {
    if (activity.type === 'payment') {
        return activity.event === 'created'
            ? 'Payment recorded'
            : 'Payment reviewed';
    }

    if (activity.type === 'subscription') {
        return activity.event === 'created'
            ? 'Subscription added'
            : 'Subscription updated';
    }

    if (activity.changes.includes('password')) {
        return 'Password reset';
    }

    return activity.event === 'created' ? 'Customer added' : 'Customer updated';
}

function date(value: string): string {
    return new Date(value).toLocaleString('en-PK', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Asia/Karachi',
    });
}

export function EmployeeActivityCard({
    activities,
}: {
    activities: EmployeeActivity[];
}) {
    return (
        <section aria-labelledby="employee-activity-title" className="min-w-0">
            <Card padding="none" className="h-full overflow-hidden">
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
                        <ActivityIcon className="size-4.5" aria-hidden="true" />
                    </span>
                    <h2
                        id="employee-activity-title"
                        className="text-sm font-semibold text-slate-900 dark:text-white"
                    >
                        Employee activity
                    </h2>
                </div>
                {activities.length === 0 ? (
                    <div className="flex min-h-52 items-center justify-center px-5 text-sm text-slate-500 dark:text-slate-400">
                        No recent activity
                    </div>
                ) : (
                    <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activities.map((activity) => (
                            <li
                                key={activity.id}
                                className="flex items-start gap-3 px-5 py-2.5"
                            >
                                <span
                                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                                    aria-hidden="true"
                                >
                                    {activity.employee_name
                                        .charAt(0)
                                        .toUpperCase()}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                            {action(activity)}
                                        </p>
                                        <time
                                            dateTime={activity.created_at}
                                            className="shrink-0 text-[11px] text-slate-400"
                                        >
                                            {date(activity.created_at)}
                                        </time>
                                    </div>
                                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                        {activity.employee_name} ·{' '}
                                        <Link
                                            href={`/superadmin/customers/${activity.customer_id}`}
                                            className="font-medium text-brand-700 hover:underline dark:text-brand-300"
                                        >
                                            {activity.school_name}
                                            <ArrowUpRightIcon
                                                className="ml-0.5 inline size-3"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </Card>
        </section>
    );
}

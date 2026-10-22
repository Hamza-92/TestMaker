import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button, Card, Input } from '@/components/tm';

interface ReportRow {
    month: string;
    gross: string;
    commissions: string;
    expenses: string;
    profit: string;
    bank_transfer: string;
    online: string;
    cash: string;
    cheque: string;
    other: string;
}

const columns: { key: keyof ReportRow; label: string }[] = [
    { key: 'month', label: 'Month' },
    { key: 'gross', label: 'Gross' },
    { key: 'commissions', label: 'Agent Commissions' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'profit', label: 'Profit' },
    { key: 'bank_transfer', label: 'Bank Transfer' },
    { key: 'online', label: 'Online' },
    { key: 'cash', label: 'Cash' },
    { key: 'cheque', label: 'Cheque' },
    { key: 'other', label: 'Other' },
];

function money(value: string): string {
    return Number(value).toLocaleString('en-PK', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
    });
}

export default function AnnualReport({
    year,
    months,
    totals,
}: {
    year: number;
    months: ReportRow[];
    totals: ReportRow;
}) {
    const [selectedYear, setSelectedYear] = useState(String(year));

    function apply() {
        const parsed = Number(selectedYear);

        if (Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100) {
            router.get(
                '/superadmin/payments/annual-report',
                { year: parsed },
                { replace: true },
            );
        }
    }

    return (
        <>
            <Head title="Annual Report" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <section aria-labelledby="annual-report-title">
                    <Card padding="none" className="overflow-hidden">
                        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                            <h1
                                id="annual-report-title"
                                className="self-center text-sm font-semibold text-slate-900 dark:text-white"
                            >
                                Annual Report{' '}
                                <span className="ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                    (PKR)
                                </span>
                            </h1>
                            <form
                                className="flex items-end gap-2"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    apply();
                                }}
                            >
                                <label className="grid gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Year
                                    <Input
                                        type="number"
                                        min="2000"
                                        max="2100"
                                        step="1"
                                        className="w-28"
                                        value={selectedYear}
                                        onChange={(event) =>
                                            setSelectedYear(event.target.value)
                                        }
                                        required
                                    />
                                </label>
                                <Button type="submit" variant="primary">
                                    Apply
                                </Button>
                            </form>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1120px] text-left text-sm">
                                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                                    <tr>
                                        {columns.map((column, index) => (
                                            <th
                                                key={column.key}
                                                scope="col"
                                                className={`${index === 0 ? 'px-5 text-left' : 'px-3 text-right'} py-3`}
                                            >
                                                {column.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {months.map((row) => (
                                        <tr
                                            key={row.month}
                                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                                        >
                                            {columns.map((column, index) => (
                                                <td
                                                    key={column.key}
                                                    className={`${index === 0 ? 'px-5 font-semibold text-slate-900 dark:text-white' : 'px-3 text-right tabular-nums text-slate-700 dark:text-slate-200'} py-3 ${column.key === 'profit' && Number(row.profit) < 0 ? '!text-rose-600' : ''}`}
                                                >
                                                    {column.key === 'month'
                                                        ? row.month
                                                        : money(
                                                              row[column.key],
                                                          )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800/60 dark:text-white">
                                    <tr>
                                        {columns.map((column, index) => (
                                            <th
                                                key={column.key}
                                                scope={
                                                    index === 0
                                                        ? 'row'
                                                        : undefined
                                                }
                                                className={`${index === 0 ? 'px-5 text-left' : 'px-3 text-right'} py-3 tabular-nums ${column.key === 'profit' && Number(totals.profit) < 0 ? 'text-rose-600' : ''}`}
                                            >
                                                {column.key === 'month'
                                                    ? totals.month
                                                    : money(totals[column.key])}
                                            </th>
                                        ))}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </Card>
                </section>
            </div>
        </>
    );
}

AnnualReport.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Payments', href: '/superadmin/payments' },
        { title: 'Annual Report', href: '/superadmin/payments/annual-report' },
    ],
};

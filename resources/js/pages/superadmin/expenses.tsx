import { Head, router, useForm } from '@inertiajs/react';
import { PlusIcon, ReceiptIcon } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { SummaryCard } from '@/components/admin/summary-card';
import { Button, Card, Input, Modal, Pagination } from '@/components/tm';
import type { PageMeta } from '@/components/tm';

interface ExpenseRow {
    id: number;
    name: string;
    amount: string;
    description: string | null;
    created_by: string;
    created_at: string;
}

interface ExpenseData {
    total: string;
    data: ExpenseRow[];
    meta: PageMeta;
}

function money(value: string): string {
    return `Rs ${Number(value).toLocaleString('en-PK', {
        maximumFractionDigits: 2,
    })}`;
}

export default function Expenses({ expenses }: { expenses: ExpenseData }) {
    const [open, setOpen] = useState(false);
    const form = useForm({ name: '', amount: '', description: '' });

    function close() {
        setOpen(false);
        form.reset();
        form.clearErrors();
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        form.post('/superadmin/payments/expenses', {
            preserveScroll: true,
            onSuccess: close,
        });
    }

    return (
        <>
            <Head title="Expenses" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        label="Total Expenses"
                        value={money(expenses.total)}
                        icon={ReceiptIcon}
                        tone="rose"
                    />
                </div>
                <section aria-labelledby="expenses-title">
                    <Card padding="none" className="overflow-hidden">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                            <h1
                                id="expenses-title"
                                className="text-sm font-semibold text-slate-900 dark:text-white"
                            >
                                Expenses
                            </h1>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={() => setOpen(true)}
                            >
                                <PlusIcon aria-hidden="true" /> Add Expense
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[750px] text-left text-sm">
                                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                                    <tr>
                                        <th scope="col" className="px-5 py-3">
                                            ID
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Expense
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Description
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Added By
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Date
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-3 text-right"
                                        >
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {expenses.data.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-5 py-10 text-center text-slate-500 dark:text-slate-400"
                                            >
                                                No expenses yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        expenses.data.map((expense) => (
                                            <tr
                                                key={expense.id}
                                                className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                                            >
                                                <td className="px-5 py-3 font-semibold tabular-nums text-slate-900 dark:text-white">
                                                    #{expense.id}
                                                </td>
                                                <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">
                                                    {expense.name}
                                                </td>
                                                <td
                                                    className="max-w-80 truncate px-3 py-3 text-slate-600 dark:text-slate-300"
                                                    title={
                                                        expense.description ??
                                                        undefined
                                                    }
                                                >
                                                    {expense.description ?? '—'}
                                                </td>
                                                <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                                                    {expense.created_by}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">
                                                    {new Intl.DateTimeFormat(
                                                        'en-PK',
                                                        {
                                                            timeZone:
                                                                'Asia/Karachi',
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        },
                                                    ).format(
                                                        new Date(
                                                            expense.created_at,
                                                        ),
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                                                    {money(expense.amount)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                    <div className="mt-3">
                        <Pagination
                            meta={expenses.meta}
                            label="expenses"
                            onPageChange={(page) =>
                                router.get(
                                    '/superadmin/payments/expenses',
                                    { page },
                                    {
                                        only: ['expenses'],
                                        preserveState: true,
                                        preserveScroll: true,
                                    },
                                )
                            }
                        />
                    </div>
                </section>
            </div>
            <Modal
                open={open}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen && !form.processing) {
                        close();
                    }
                }}
                title="Add Expense"
                footer={
                    <>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={close}
                            disabled={form.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="expense-form"
                            variant="primary"
                            disabled={form.processing}
                        >
                            Save Expense
                        </Button>
                    </>
                }
            >
                <form
                    id="expense-form"
                    onSubmit={submit}
                    className="grid gap-4"
                >
                    <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                        Expense Name <span className="sr-only">required</span>
                        <Input
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            maxLength={120}
                            required
                            autoFocus
                        />
                        {form.errors.name && (
                            <span className="text-xs text-rose-600">
                                {form.errors.name}
                            </span>
                        )}
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                        Amount (Rs)
                        <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={form.data.amount}
                            onChange={(event) =>
                                form.setData('amount', event.target.value)
                            }
                            required
                        />
                        {form.errors.amount && (
                            <span className="text-xs text-rose-600">
                                {form.errors.amount}
                            </span>
                        )}
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                        Description{' '}
                        <span className="text-slate-400">(optional)</span>
                        <textarea
                            rows={3}
                            maxLength={2000}
                            value={form.data.description}
                            onChange={(event) =>
                                form.setData('description', event.target.value)
                            }
                            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        {form.errors.description && (
                            <span className="text-xs text-rose-600">
                                {form.errors.description}
                            </span>
                        )}
                    </label>
                </form>
            </Modal>
        </>
    );
}

Expenses.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Payments', href: '/superadmin/payments' },
        { title: 'Expenses', href: '/superadmin/payments/expenses' },
    ],
};

import { Head, router, useForm } from '@inertiajs/react';
import {
    CircleDollarSignIcon,
    HeartHandshakeIcon,
    PencilIcon,
    PlusIcon,
    Trash2Icon,
    TrendingUpIcon,
    WalletIcon,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { SummaryCard } from '@/components/admin/summary-card';
import { Button, Card, Input, Modal, Pagination } from '@/components/tm';
import type { PageMeta } from '@/components/tm';

interface SpendRow {
    id: number;
    amount: string;
    note: string;
    by: string;
    created_at: string;
}

interface ShareholderProps {
    summary: {
        profit: string;
        reserve: string;
        spent: string;
        available: string;
    };
    ledger: { data: SpendRow[]; meta: PageMeta };
}

function money(value: string): string {
    return `Rs ${Number(value).toLocaleString('en-PK', {
        maximumFractionDigits: 2,
    })}`;
}

function dateTime(value: string): string {
    return new Intl.DateTimeFormat('en-PK', {
        timeZone: 'Asia/Karachi',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export default function Shareholder({ summary, ledger }: ShareholderProps) {
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<SpendRow | null>(null);
    const [deleting, setDeleting] = useState<SpendRow | null>(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);
    const form = useForm({ amount: '', note: '' });

    function openForm(spend: SpendRow | null = null) {
        setEditing(spend);
        form.setData({ amount: spend?.amount ?? '', note: spend?.note ?? '' });
        form.clearErrors();
        setFormOpen(true);
    }

    function closeForm() {
        if (form.processing) {
            return;
        }

        resetForm();
    }

    function resetForm() {
        setFormOpen(false);
        setEditing(null);
        form.reset();
        form.clearErrors();
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: resetForm };

        if (editing) {
            form.put(
                `/superadmin/payments/shareholder/spends/${editing.id}`,
                options,
            );
        } else {
            form.post('/superadmin/payments/shareholder/spends', options);
        }
    }

    function removeSpend() {
        if (!deleting) {
            return;
        }

        setDeleteProcessing(true);
        router.delete(
            `/superadmin/payments/shareholder/spends/${deleting.id}`,
            {
                preserveScroll: true,
                onSuccess: () => setDeleting(null),
                onFinish: () => setDeleteProcessing(false),
            },
        );
    }

    return (
        <>
            <Head title="Shareholder" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <section aria-label="Shareholder balance" className="space-y-4">
                    <Card
                        padding="none"
                        className="border-amber-100 bg-amber-50/60 px-5 py-6 text-center dark:border-amber-900/50 dark:bg-amber-950/20"
                    >
                        <h1 className="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">
                            In the Name of Allah (سُبْحَانَهُ وَتَعَالَىٰ)
                        </h1>
                        <div className="mx-auto my-4 h-px w-16 bg-amber-300 dark:bg-amber-700" />
                        <p
                            dir="rtl"
                            lang="ar"
                            className="text-2xl leading-loose text-amber-800 dark:text-amber-200 sm:text-3xl"
                            style={{
                                fontFamily:
                                    '"Amiri", "Noto Naskh Arabic", serif',
                            }}
                        >
                            اللَّهُمَّ بَارِكْ لِي فِيمَا رَزَقْتَنِي
                        </p>
                    </Card>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <SummaryCard
                            label="All-time Profit"
                            value={money(summary.profit)}
                            icon={TrendingUpIcon}
                            tone="blue"
                        />
                        <SummaryCard
                            label="Receive 15%"
                            value={money(summary.reserve)}
                            icon={HeartHandshakeIcon}
                            tone="violet"
                        />
                        <SummaryCard
                            label="Spent (All time)"
                            value={money(summary.spent)}
                            icon={CircleDollarSignIcon}
                            tone="amber"
                        />
                        <SummaryCard
                            label="Available to Spend"
                            value={money(summary.available)}
                            icon={WalletIcon}
                            tone={
                                Number(summary.available) < 0
                                    ? 'rose'
                                    : 'emerald'
                            }
                        />
                    </div>
                </section>

                <section aria-labelledby="shareholder-ledger-title">
                    <Card padding="none" className="overflow-hidden">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                            <h2
                                id="shareholder-ledger-title"
                                className="text-sm font-semibold text-slate-900 dark:text-white"
                            >
                                Spend Ledger (All time)
                            </h2>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={() => openForm()}
                            >
                                <PlusIcon aria-hidden="true" /> Record Spend
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                                    <tr>
                                        <th scope="col" className="px-5 py-3">
                                            ID
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3 text-right"
                                        >
                                            Amount
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Note
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            By
                                        </th>
                                        <th scope="col" className="px-3 py-3">
                                            Created At
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-3 text-right"
                                        >
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {ledger.data.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-5 py-10 text-center text-slate-500 dark:text-slate-400"
                                            >
                                                No spends recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        ledger.data.map((spend) => (
                                            <tr
                                                key={spend.id}
                                                className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                                            >
                                                <td className="px-5 py-3 font-semibold tabular-nums text-slate-900 dark:text-white">
                                                    #{spend.id}
                                                </td>
                                                <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                                                    {money(spend.amount)}
                                                </td>
                                                <td className="max-w-96 px-3 py-3 text-slate-700 dark:text-slate-200">
                                                    {spend.note}
                                                </td>
                                                <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                                                    {spend.by}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">
                                                    {dateTime(spend.created_at)}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() =>
                                                                openForm(spend)
                                                            }
                                                        >
                                                            <PencilIcon aria-hidden="true" />{' '}
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-rose-600 hover:text-rose-700"
                                                            onClick={() =>
                                                                setDeleting(
                                                                    spend,
                                                                )
                                                            }
                                                        >
                                                            <Trash2Icon aria-hidden="true" />{' '}
                                                            Delete
                                                        </Button>
                                                    </div>
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
                            meta={ledger.meta}
                            label="spends"
                            onPageChange={(page) =>
                                router.get(
                                    '/superadmin/payments/shareholder',
                                    { page },
                                    { only: ['ledger'], preserveScroll: true },
                                )
                            }
                        />
                    </div>
                </section>
            </div>

            <Modal
                open={formOpen}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        closeForm();
                    }
                }}
                title={editing ? 'Edit Spend' : 'Record Spend'}
                footer={
                    <>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={closeForm}
                            disabled={form.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="shareholder-spend-form"
                            variant="primary"
                            disabled={form.processing}
                        >
                            {editing ? 'Save Changes' : 'Record Spend'}
                        </Button>
                    </>
                }
            >
                <form
                    id="shareholder-spend-form"
                    className="grid gap-4"
                    onSubmit={submit}
                >
                    <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                        Amount (Rs)
                        <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            autoFocus
                            value={form.data.amount}
                            onChange={(event) =>
                                form.setData('amount', event.target.value)
                            }
                        />
                        {form.errors.amount && (
                            <span className="text-xs text-rose-600">
                                {form.errors.amount}
                            </span>
                        )}
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                        Spend On (Note)
                        <textarea
                            rows={3}
                            maxLength={500}
                            required
                            value={form.data.note}
                            onChange={(event) =>
                                form.setData('note', event.target.value)
                            }
                            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        {form.errors.note && (
                            <span className="text-xs text-rose-600">
                                {form.errors.note}
                            </span>
                        )}
                    </label>
                </form>
            </Modal>

            <Modal
                open={deleting !== null}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen && !deleteProcessing) {
                        setDeleting(null);
                    }
                }}
                title="Delete Spend"
                footer={
                    <>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={deleteProcessing}
                            onClick={() => setDeleting(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            disabled={deleteProcessing}
                            onClick={removeSpend}
                        >
                            Delete Spend
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-700 dark:text-slate-200">
                    Delete {deleting ? money(deleting.amount) : 'this spend'}{' '}
                    from the ledger?
                </p>
            </Modal>
        </>
    );
}

Shareholder.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Payments', href: '/superadmin/payments' },
        { title: 'Shareholder', href: '/superadmin/payments/shareholder' },
    ],
};

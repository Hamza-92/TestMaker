import { router } from '@inertiajs/react';
import { ArrowUpRightIcon } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, Modal } from '@/components/tm';

export interface RejectedPayment {
    id: number;
    customer: string;
    school: string | null;
    subscription: string;
    amount: string;
    payment_method: string | null;
    receipts: string[];
    rejection_reason: string | null;
    recorder_remarks: string | null;
    rejected_at: string | null;
}

export function RejectedPayments({
    payments,
}: {
    payments: RejectedPayment[];
}) {
    const [selected, setSelected] = useState<RejectedPayment | null>(null);
    const [remarks, setRemarks] = useState('');
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    if (payments.length === 0) {
        return null;
    }

    function close() {
        if (processing) {
            return;
        }

        setSelected(null);
        setError('');
    }

    function submit() {
        if (!selected) {
            return;
        }

        if (!remarks.trim()) {
            setError('Enter your remarks.');

            return;
        }

        setProcessing(true);
        setError('');
        router.patch(
            `/superadmin/rejected-payments/${selected.id}/resubmit`,
            { remarks: remarks.trim() },
            {
                preserveScroll: true,
                onSuccess: () => setSelected(null),
                onError: (errors) =>
                    setError(errors.remarks ?? 'Could not resubmit payment.'),
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <section aria-labelledby="rejected-payments-title">
            <Card padding="none" className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <h2
                        id="rejected-payments-title"
                        className="text-sm font-semibold text-slate-900 dark:text-white"
                    >
                        Rejected payments
                    </h2>
                    <Badge tone="danger">{payments.length}</Badge>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                            <tr>
                                <th className="px-5 py-3">School</th>
                                <th className="px-5 py-3">Subscription</th>
                                <th className="px-4 py-3">Amount</th>
                                <th className="px-4 py-3">Rejected</th>
                                <th className="px-5 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {payments.map((payment) => (
                                <tr key={payment.id}>
                                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                                        {payment.school ?? payment.customer}
                                    </td>
                                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                                        {payment.subscription}
                                    </td>
                                    <td className="px-4 py-3 tabular-nums">
                                        Rs{' '}
                                        {Number(payment.amount).toLocaleString(
                                            'en-PK',
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {payment.rejected_at
                                            ? new Date(
                                                  payment.rejected_at,
                                              ).toLocaleDateString('en-PK')
                                            : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                                setSelected(payment);
                                                setRemarks(
                                                    payment.recorder_remarks ??
                                                        '',
                                                );
                                                setError('');
                                            }}
                                        >
                                            View details{' '}
                                            <ArrowUpRightIcon aria-hidden="true" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Modal
                open={selected !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        close();
                    }
                }}
                title="Rejected payment"
                footer={
                    selected && (
                        <>
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={processing}
                                onClick={close}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                disabled={processing}
                                onClick={submit}
                            >
                                Send for review
                            </Button>
                        </>
                    )
                }
            >
                {selected && (
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                            <div>
                                <p className="text-xs text-slate-500">School</p>
                                <p className="mt-1 font-semibold">
                                    {selected.school ?? '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">
                                    Customer
                                </p>
                                <p className="mt-1 font-semibold">
                                    {selected.customer}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">
                                    Subscription
                                </p>
                                <p className="mt-1 font-semibold">
                                    {selected.subscription}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">
                                    Payment
                                </p>
                                <p className="mt-1 font-semibold tabular-nums">
                                    Rs{' '}
                                    {Number(selected.amount).toLocaleString(
                                        'en-PK',
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Method</p>
                                <p className="mt-1 font-semibold">
                                    {selected.payment_method ?? '—'}
                                </p>
                            </div>
                        </div>
                        {selected.receipts.length > 0 && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {selected.receipts.map((url, index) => (
                                    <a
                                        key={`${url}-${index}`}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold text-brand-700 dark:border-slate-700"
                                    >
                                        {/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(
                                            url,
                                        ) && (
                                            <img
                                                src={url}
                                                alt={`Receipt ${index + 1}`}
                                                className="max-h-44 w-full bg-slate-50 object-contain dark:bg-slate-800"
                                            />
                                        )}
                                        <span className="block px-3 py-2">
                                            Receipt {index + 1} ↗
                                        </span>
                                    </a>
                                ))}
                            </div>
                        )}
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
                            <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                                Rejection reason
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-slate-800 dark:text-slate-100">
                                {selected.rejection_reason ?? '—'}
                            </p>
                        </div>
                        <label
                            className="block font-medium text-slate-800 dark:text-slate-100"
                            htmlFor="payment-recorder-remarks"
                        >
                            Your remarks
                        </label>
                        <textarea
                            id="payment-recorder-remarks"
                            rows={4}
                            maxLength={1000}
                            value={remarks}
                            onChange={(event) => {
                                setRemarks(event.target.value);
                                setError('');
                            }}
                            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900"
                        />
                        {error && (
                            <p role="alert" className="text-xs text-rose-600">
                                {error}
                            </p>
                        )}
                    </div>
                )}
            </Modal>
        </section>
    );
}

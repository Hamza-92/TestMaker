import { Head } from '@inertiajs/react';
import {
    CheckIcon,
    CopyIcon,
    LockKeyholeIcon,
    MessageCircleIcon,
} from 'lucide-react';
import { useState } from 'react';
import { qatAnnualFee, useQatTrial } from '@/components/qat/trial-status';
import { Button } from '@/components/tm';

const paymentMethods = [
    {
        id: 'easypaisa',
        name: 'Easy Paisa',
        number: '03034688484',
        accountTitle: 'Muhammad Ashfaq',
        logo: '/images/qat/easypaisa.webp',
    },
    {
        id: 'jazzcash',
        name: 'JazzCash',
        number: '03034688484',
        accountTitle: 'Muhammad Ashfaq',
        logo: '/images/qat/jazzcash.webp',
    },
    {
        id: 'meezan',
        name: 'Meezan Bank',
        number: '1037946331002930',
        branchCode: '1728',
        accountTitle: 'Testmaker',
        logo: '/images/qat/meezan-bank.webp',
    },
] as const;

export default function QatUpgrade({ schoolName }: { schoolName: string }) {
    const trial = useQatTrial();
    const [selected, setSelected] =
        useState<(typeof paymentMethods)[number]['id']>('easypaisa');
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>(
        'idle',
    );
    const method =
        paymentMethods.find(({ id }) => id === selected) ?? paymentMethods[0];
    const whatsAppMessage = encodeURIComponent(
        `Hello TestMaker, I’m sending the QAT subscription payment receipt for ${schoolName}.`,
    );
    const title = trial?.expired
        ? 'Your QAT trial has ended'
        : trial?.locked
          ? `You have used all ${trial.limit} trial papers`
          : 'Activate your QAT subscription';

    async function copyNumber() {
        try {
            await navigator.clipboard.writeText(method.number);
            setCopyStatus('copied');
        } catch {
            setCopyStatus('failed');
        }
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6 pb-8">
            <Head title="Activate QAT subscription" />
            <header className="grid gap-4 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-100 via-white to-violet-100 p-5 shadow-sm dark:border-sky-900 dark:from-sky-950 dark:via-slate-900 dark:to-violet-950 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
                <div className="space-y-2">
                    {trial?.locked && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-white/80 px-2.5 py-1 text-xs font-semibold text-brand-800 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200">
                            <LockKeyholeIcon
                                aria-hidden="true"
                                className="size-3.5"
                            />
                            {trial.expired ? 'Trial expired' : 'Trial complete'}
                        </span>
                    )}
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                        {title}
                    </h1>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {trial?.locked && 'Paper generation is locked. '}
                        Pay <strong>{qatAnnualFee}</strong> to activate your
                        account and keep generating papers.
                    </p>
                </div>
                <div className="rounded-xl border border-brand-200 bg-white px-5 py-3 text-center dark:border-brand-700 dark:bg-slate-900">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Annual fee
                    </p>
                    <p className="text-2xl font-bold tabular-nums text-brand-700 dark:text-sky-300">
                        {qatAnnualFee}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                        Valid till 31 October 2027
                    </p>
                </div>
            </header>

            <fieldset className="space-y-3">
                <legend className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
                    Choose how you want to pay
                </legend>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {paymentMethods.map(({ id, name, logo }) => (
                        <label
                            key={id}
                            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border px-1 py-3 text-center text-xs font-semibold transition-colors focus-within:ring-2 focus-within:ring-brand-500 sm:px-3 sm:py-4 sm:text-sm ${id === selected ? 'border-brand-500 bg-sky-50 text-brand-800 ring-1 ring-brand-500/20 dark:bg-sky-950 dark:text-sky-100' : 'border-sky-200 bg-white text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}
                        >
                            <input
                                type="radio"
                                className="sr-only"
                                name="qat-payment-method"
                                checked={selected === id}
                                onChange={() => {
                                    setSelected(id);
                                    setCopyStatus('idle');
                                }}
                            />
                            <span className="grid size-14 place-items-center rounded-lg bg-white p-1.5 sm:size-16">
                                <img
                                    src={logo}
                                    alt=""
                                    width={192}
                                    height={192}
                                    className="size-full object-contain"
                                />
                            </span>
                            {name}
                        </label>
                    ))}
                </div>
            </fieldset>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-sky-700 via-brand-700 to-indigo-700 p-4 text-white shadow-sm sm:p-5">
                <div className="space-y-1">
                    <p className="text-xs font-medium text-sky-100">
                        Send to this {method.name} account
                    </p>
                    <p className="text-lg font-bold tabular-nums sm:text-2xl">
                        {method.number}
                    </p>
                    <p className="text-sm">
                        Account title · {method.accountTitle}
                    </p>
                    {'branchCode' in method && (
                        <p className="text-sm">
                            Branch code · {method.branchCode}
                        </p>
                    )}
                </div>
                <div className="space-y-2 text-right">
                    <p className="font-bold">{qatAnnualFee}</p>
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => void copyNumber()}
                    >
                        {copyStatus === 'copied' ? (
                            <CheckIcon aria-hidden="true" />
                        ) : (
                            <CopyIcon aria-hidden="true" />
                        )}
                        {copyStatus === 'copied' ? 'Copied' : 'Copy number'}
                    </Button>
                </div>
            </div>
            {copyStatus === 'failed' && (
                <p
                    role="status"
                    className="text-sm text-slate-600 dark:text-slate-300"
                >
                    Select the account number to copy it manually.
                </p>
            )}

            <div className="space-y-4 rounded-xl border border-sky-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
                <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    <li>
                        Send <strong>{qatAnnualFee}</strong> to any account
                        above.
                    </li>
                    <li>
                        Send the receipt screenshot on WhatsApp with your school
                        name <strong>{schoolName}</strong>.
                    </li>
                    <li>Your account is upgraded after verification.</li>
                </ol>
                <Button asChild variant="primary">
                    <a
                        href={`https://wa.me/923034688484?text=${whatsAppMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <MessageCircleIcon aria-hidden="true" /> Send receipt on
                        WhatsApp
                    </a>
                </Button>
            </div>
        </div>
    );
}

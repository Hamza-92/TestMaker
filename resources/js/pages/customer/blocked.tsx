import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    LockIcon,
    MailIcon,
    MessageCircleIcon,
    PhoneIcon,
    SparklesIcon,
} from 'lucide-react';
import { CONTACT_EMAIL, CONTACT_PHONES } from '@/lib/contact';

interface Action {
    href: string;
    label: string;
}

interface Props {
    title?: string;
    message: string;
    heading?: string;
    primary?: Action | null;
    secondary?: Action | null;
    contactSupport?: boolean;
}

export default function Blocked({
    title = 'Feature unavailable',
    heading = 'Not on your plan',
    message,
    primary = { href: '/dashboard', label: 'Back to Dashboard' },
    secondary = null,
    contactSupport = false,
}: Props) {
    return (
        <>
            <Head title={title} />

            <div className="mx-auto flex max-w-2xl flex-col items-center py-16 text-center">
                <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                    <LockIcon className="size-7" />
                </div>

                <p className="mb-2 text-xs font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                    {heading}
                </p>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {title}
                </h1>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {message}
                </p>

                {contactSupport && (
                    <div className="mt-6 w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Contact TestMaker
                        </p>
                        <a
                            href={`mailto:${CONTACT_EMAIL}`}
                            className="flex items-center gap-2 text-sm text-brand-700 hover:underline dark:text-brand-300"
                        >
                            <MailIcon className="size-4 shrink-0" />
                            <span className="break-all">{CONTACT_EMAIL}</span>
                        </a>
                        <p className="mt-4 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Call / WhatsApp
                        </p>
                        <div className="flex flex-wrap gap-x-5 gap-y-2">
                            {CONTACT_PHONES.map((phone) => (
                                <div
                                    key={phone.display}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <a
                                        href={`tel:${phone.tel}`}
                                        className="inline-flex items-center gap-1.5 text-brand-700 hover:underline dark:text-brand-300"
                                        aria-label={`Call ${phone.display}`}
                                    >
                                        <PhoneIcon className="size-4" />
                                        {phone.display}
                                    </a>
                                    <a
                                        href={`https://wa.me/${phone.whatsapp}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-brand-700 hover:text-brand-900 dark:text-brand-300 dark:hover:text-brand-100"
                                        aria-label={`WhatsApp ${phone.display}`}
                                    >
                                        <MessageCircleIcon className="size-4" />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    {primary && (
                        <Link
                            href={primary.href}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            <ArrowLeftIcon className="size-4" />
                            {primary.label}
                        </Link>
                    )}
                    {secondary && (
                        <Link
                            href={secondary.href}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
                        >
                            <SparklesIcon className="size-4" />
                            {secondary.label}
                        </Link>
                    )}
                </div>
            </div>
        </>
    );
}

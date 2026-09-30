import { Link } from '@inertiajs/react';
import { Mail, MessageCircle, Phone, SquareCheckBig } from 'lucide-react';
import {
    CONTACT_EMAIL,
    CONTACT_PHONES,
    PUBLIC_CONTACT_PHONES,
} from '@/lib/contact';

export default function SiteContactBar() {
    const callPhone = PUBLIC_CONTACT_PHONES[2];

    return (
        <div className="border-b border-slate-100 bg-white">
            <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between xl:gap-8">
                <Link
                    href="/"
                    className="inline-flex w-fit items-center gap-2.5 rounded-lg text-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20"
                    aria-label="TestMaker home"
                >
                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:size-11">
                        <SquareCheckBig
                            size={27}
                            strokeWidth={2.4}
                            aria-hidden="true"
                        />
                    </span>
                    <span className="font-display text-[1.45rem] font-extrabold tracking-[-0.05em] sm:text-[1.65rem]">
                        TestMaker
                        <span className="ml-0.5 text-xs font-semibold tracking-normal text-slate-500">
                            .pk
                        </span>
                    </span>
                </Link>

                <div className="grid w-full grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8 xl:max-w-[910px]">
                    <div className="order-1 flex min-w-0 items-center gap-2.5">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:size-10">
                            <Phone size={19} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 leading-tight">
                            <span className="block text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                                Call us
                            </span>
                            <a
                                href={`tel:${callPhone.tel}`}
                                className="mt-1 block text-xs font-bold whitespace-nowrap text-slate-900 hover:text-brand-700 sm:text-[13px]"
                            >
                                {callPhone.display}
                            </a>
                        </div>
                    </div>
                    <div className="order-3 flex min-w-0 items-center gap-2.5 sm:col-span-2 lg:order-2 lg:col-span-1">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:size-10">
                            <Mail size={19} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 leading-tight">
                            <span className="block text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                                Email us
                            </span>
                            <a
                                href={`mailto:${CONTACT_EMAIL}`}
                                className="mt-1 block text-xs font-bold text-slate-900 hover:text-brand-700 sm:text-[13px]"
                            >
                                {CONTACT_EMAIL}
                            </a>
                        </div>
                    </div>
                    <div className="order-2 flex min-w-0 items-center gap-2.5 lg:order-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:size-10">
                            <MessageCircle size={20} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 leading-tight">
                            <span className="block text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                                WhatsApp
                            </span>
                            <div className="mt-1 flex flex-wrap gap-x-1 text-xs font-bold text-slate-900 sm:text-[13px]">
                                {CONTACT_PHONES.map((phone, index) => (
                                    <span
                                        key={phone.display}
                                        className="whitespace-nowrap"
                                    >
                                        {index > 0 && (
                                            <span className="mr-1 text-slate-400">
                                                /
                                            </span>
                                        )}
                                        <a
                                            href={`https://wa.me/${phone.whatsapp}`}
                                            className="hover:text-brand-700"
                                            aria-label={`WhatsApp ${phone.display}`}
                                        >
                                            {phone.display}
                                        </a>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

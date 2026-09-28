import { Mail, Phone } from 'lucide-react';
import { CONTACT_EMAIL, PUBLIC_CONTACT_PHONES } from '@/lib/contact';

export default function SiteContactBar() {
    return (
        <div className="bg-brand-950 text-white">
            <div className="mx-auto flex h-[88px] max-w-[1360px] flex-col items-start justify-center gap-1 px-4 text-[13px] leading-5 sm:h-16 sm:px-6 lg:h-10 lg:flex-row lg:items-center lg:justify-between lg:gap-5 lg:px-8">
                <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap transition-opacity hover:opacity-80"
                    aria-label={`Email ${CONTACT_EMAIL}`}
                >
                    <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>Email us:</span>
                    {CONTACT_EMAIL}
                </a>
                <div className="flex flex-col items-end gap-1 self-end sm:flex-row sm:items-center sm:gap-1.5 lg:self-auto">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <Phone
                            className="size-3.5 shrink-0"
                            aria-hidden="true"
                        />
                        <span>Call / WhatsApp:</span>
                    </span>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                        {PUBLIC_CONTACT_PHONES.map((phone, index) => (
                            <span
                                key={phone.display}
                                className="inline-flex items-center gap-1.5"
                            >
                                {index > 0 && (
                                    <span className="hidden sm:inline">/</span>
                                )}
                                <a
                                    href={`tel:${phone.tel}`}
                                    className="transition-opacity hover:opacity-80"
                                    aria-label={`Call ${phone.display}`}
                                >
                                    {phone.display}
                                </a>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

import { Mail, Phone } from 'lucide-react';
import { CONTACT_EMAIL, CONTACT_PHONES } from '@/lib/contact';

export default function SiteContactBar() {
    return (
        <div className="bg-brand-950 text-white">
            <div className="mx-auto flex h-[64px] max-w-[1360px] flex-col items-start justify-center gap-1 px-4 text-[10px] sm:h-9 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-6 sm:text-[11px] lg:px-8">
                <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap transition-opacity hover:opacity-80"
                    aria-label={`Email ${CONTACT_EMAIL}`}
                >
                    <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>Email us:</span>
                    {CONTACT_EMAIL}
                </a>
                <div className="flex items-center gap-1.5 self-end whitespace-nowrap sm:self-auto">
                    <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>Call / WhatsApp:</span>
                    {CONTACT_PHONES.map((phone, index) => (
                        <span
                            key={phone.display}
                            className="inline-flex items-center gap-1.5"
                        >
                            {index > 0 && <span>/</span>}
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
    );
}

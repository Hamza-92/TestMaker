import { Link, usePage } from '@inertiajs/react';
import { FileText, Images, LayoutList, Tags } from 'lucide-react';

const sections = [
    { label: 'Pages', href: '/superadmin/site/pages', icon: FileText },
    { label: 'Pricing', href: '/superadmin/site/pricing', icon: Tags },
    {
        label: 'Navigation',
        href: '/superadmin/site/navigation',
        icon: LayoutList,
    },
    { label: 'Media Library', href: '/superadmin/site/media', icon: Images },
];

export default function SiteSectionNav() {
    const currentUrl = usePage().url;

    return (
        <nav
            aria-label="Public Website management"
            className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-3"
        >
            {sections.map(({ label, href, icon: Icon }) => {
                const active =
                    currentUrl === href || currentUrl.startsWith(`${href}/`);

                return (
                    <Link
                        key={href}
                        href={href}
                        className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition ${active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                    >
                        <Icon size={16} aria-hidden="true" />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}

import { Link, usePage } from '@inertiajs/react';
import { ClipboardCheck } from 'lucide-react';
import type { SiteNavigation } from '@/types/site-cms';

export default function PublicSiteFooter() {
    const navigation = usePage<{ siteNavigation: SiteNavigation }>().props
        .siteNavigation;

    return (
        <footer className="bg-[#0b2035] text-white">
            <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-10">
                <div>
                    <Link href="/" className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#102b46]">
                            <ClipboardCheck size={19} />
                        </span>
                        <span className="font-display text-xl font-extrabold tracking-tight">
                            TestMaker
                        </span>
                    </Link>
                    <p className="mt-4 max-w-xs text-sm leading-6 text-blue-200">
                        A calmer way to create, manage, and deliver assessments.
                    </p>
                </div>
                {navigation.footer.map((group) => (
                    <div key={group.id}>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">
                            {group.label}
                        </p>
                        <div className="mt-4 grid gap-3 text-sm text-blue-100">
                            {group.children.length > 0 ? (
                                group.children.map((item) => (
                                    <a
                                        key={item.id}
                                        href={item.href}
                                        className="hover:text-white"
                                    >
                                        {item.label}
                                    </a>
                                ))
                            ) : (
                                <a
                                    href={group.href}
                                    className="hover:text-white"
                                >
                                    {group.label}
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="border-t border-white/10">
                <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-5 py-5 text-xs text-blue-300 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
                    <span>© {new Date().getFullYear()} TestMaker.</span>
                    <span>
                        Professional assessment tools for modern schools.
                    </span>
                </div>
            </div>
        </footer>
    );
}

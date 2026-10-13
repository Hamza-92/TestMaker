import { Link, usePage } from '@inertiajs/react';
import {
    ArrowUp,
    ArrowUpRight,
    ChevronDown,
    Menu,
    SquareCheckBig,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import SiteContactBar from '@/components/site-contact-bar';
import { dashboard, login, register } from '@/routes';
import type { Auth } from '@/types/auth';
import type { SiteNavigation } from '@/types/site-cms';

export default function SiteHeader({ auth }: { auth: Auth }) {
    const primaryNavigation = usePage<{ siteNavigation: SiteNavigation }>()
        .props.siteNavigation.header;
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const isAuthenticated = Boolean(auth?.user);

    useEffect(() => {
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsMenuOpen(false);
            }
        };

        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
        document.addEventListener('keydown', closeOnEscape);

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isMenuOpen]);

    useEffect(() => {
        const updateBackToTop = () =>
            setShowBackToTop(window.scrollY > window.innerHeight * 0.75);
        updateBackToTop();

        window.addEventListener('scroll', updateBackToTop, { passive: true });

        return () => window.removeEventListener('scroll', updateBackToTop);
    }, []);

    const closeMenu = () => setIsMenuOpen(false);
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    return (
        <>
            <div className="contents lg:sticky lg:top-0 lg:z-50 lg:block">
                <SiteContactBar />
                <header className="sticky top-0 z-50 shadow-[0_4px_16px_rgba(15,23,42,0.08)] lg:static">
                    <div className="bg-brand-950 text-white">
                        <div className="mx-auto flex min-h-[60px] w-full max-w-[1360px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                            <nav
                                className="hidden items-center gap-1 lg:flex xl:gap-4"
                                aria-label="Primary navigation"
                            >
                                {primaryNavigation.map((item) => (
                                    <div
                                        key={item.id}
                                        className="group relative"
                                    >
                                        <a
                                            href={item.href}
                                            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                        >
                                            {item.label}
                                            {item.children.length > 0 && (
                                                <ChevronDown
                                                    size={14}
                                                    strokeWidth={2}
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </a>
                                        {item.children.length > 0 && (
                                            <div className="invisible absolute left-0 top-full z-50 min-w-48 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-800 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                                                {item.children.map((child) => (
                                                    <a
                                                        key={child.id}
                                                        href={child.href}
                                                        className="block rounded-lg px-3 py-2 text-sm hover:bg-brand-50 hover:text-brand-700 focus:bg-brand-50 focus:outline-none"
                                                    >
                                                        {child.label}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </nav>

                            <button
                                type="button"
                                aria-label={
                                    isMenuOpen
                                        ? 'Close navigation menu'
                                        : 'Open navigation menu'
                                }
                                aria-expanded={isMenuOpen}
                                aria-controls="mobile-navigation"
                                onClick={() => setIsMenuOpen((open) => !open)}
                                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:hidden"
                            >
                                {isMenuOpen ? (
                                    <X size={20} aria-hidden="true" />
                                ) : (
                                    <Menu size={20} aria-hidden="true" />
                                )}
                                Menu
                            </button>

                            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                                {!isAuthenticated && (
                                    <Link
                                        href={login()}
                                        className="hidden min-h-11 items-center rounded-lg px-2 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:inline-flex"
                                    >
                                        Login
                                    </Link>
                                )}
                                <Link
                                    href={
                                        isAuthenticated
                                            ? dashboard()
                                            : register()
                                    }
                                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white transition hover:bg-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:px-4 sm:text-sm"
                                >
                                    {isAuthenticated
                                        ? 'Go to Dashboard'
                                        : 'Sign Up Free'}
                                    <ArrowUpRight
                                        size={15}
                                        aria-hidden="true"
                                    />
                                </Link>
                            </div>
                        </div>
                    </div>
                    {isMenuOpen && (
                        <>
                            <button
                                type="button"
                                aria-label="Close navigation menu"
                                onClick={closeMenu}
                                className="site-mobile-overlay fixed inset-0 z-[60] bg-slate-900/35 backdrop-blur-[2px] lg:hidden"
                            />
                            <aside
                                id="mobile-navigation"
                                aria-label="Mobile navigation"
                                className="site-mobile-panel fixed right-0 top-0 z-[70] flex h-[100dvh] w-[min(88vw,360px)] flex-col overflow-y-auto border-l border-slate-200 bg-white px-5 pb-7 pt-5 shadow-[-12px_0_32px_rgba(15,23,42,0.1)] lg:hidden"
                            >
                                <div className="flex items-center justify-between border-b border-slate-200 pb-5">
                                    <Link
                                        href="/"
                                        onClick={closeMenu}
                                        className="flex items-center gap-2.5 text-slate-900"
                                        aria-label="TestMaker home"
                                    >
                                        <SquareCheckBig
                                            size={28}
                                            className="text-brand-600"
                                        />
                                        <span className="font-display text-xl font-extrabold tracking-[-0.045em]">
                                            TestMaker
                                        </span>
                                    </Link>
                                    <button
                                        type="button"
                                        aria-label="Close navigation menu"
                                        onClick={closeMenu}
                                        className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-slate-300 text-slate-800 hover:border-brand-300 hover:text-brand-700"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <nav
                                    className="mt-8 grid gap-1"
                                    aria-label="Mobile page links"
                                >
                                    {primaryNavigation.map((item) => (
                                        <div key={item.id}>
                                            <a
                                                href={item.href}
                                                onClick={closeMenu}
                                                className="flex min-h-12 items-center justify-between rounded-[10px] px-3 text-base font-medium text-slate-800 transition hover:bg-brand-50 hover:text-brand-700"
                                            >
                                                {item.label}
                                                {item.children.length > 0 ? (
                                                    <ChevronDown size={16} />
                                                ) : (
                                                    <ArrowUpRight size={16} />
                                                )}
                                            </a>
                                            {item.children.map((child) => (
                                                <a
                                                    key={child.id}
                                                    href={child.href}
                                                    onClick={closeMenu}
                                                    className="ml-4 flex min-h-10 items-center rounded-lg px-3 text-sm text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                                                >
                                                    {child.label}
                                                </a>
                                            ))}
                                        </div>
                                    ))}
                                </nav>
                                <div className="mt-auto grid gap-3 border-t border-slate-200 pt-6">
                                    {!isAuthenticated && (
                                        <Link
                                            href={login()}
                                            onClick={closeMenu}
                                            className="min-h-12 rounded-[10px] px-4 py-3 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50"
                                        >
                                            Login
                                        </Link>
                                    )}
                                    <Link
                                        href={
                                            isAuthenticated
                                                ? dashboard()
                                                : register()
                                        }
                                        onClick={closeMenu}
                                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
                                    >
                                        {isAuthenticated
                                            ? 'Go to Dashboard'
                                            : 'Sign Up Free'}{' '}
                                        <ArrowUpRight size={15} />
                                    </Link>
                                </div>
                            </aside>
                        </>
                    )}
                </header>
            </div>

            {showBackToTop && (
                <button
                    type="button"
                    onClick={scrollToTop}
                    aria-label="Back to top"
                    title="Back to top"
                    className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-[0_12px_28px_rgba(37,99,235,0.35)] transition duration-200 hover:-translate-y-1 hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/30"
                >
                    <ArrowUp size={20} strokeWidth={2.5} />
                </button>
            )}
        </>
    );
}

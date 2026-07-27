import { Link } from '@inertiajs/react';
import { ArrowUpRight, ChevronDown, Menu, SquareCheckBig, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { dashboard, login, register } from '@/routes';
import type { Auth } from '@/types/auth';

const primaryNavigation = [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'How it Works', href: '#how-it-works' },
    { label: 'Resources', href: '#resources', hasMenu: true },
    { label: 'About Us', href: '#about' },
];

export default function SiteHeader({ auth }: { auth: Auth }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isAuthenticated = Boolean(auth?.user);

    useEffect(() => {
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsMenuOpen(false);
        };

        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
        document.addEventListener('keydown', closeOnEscape);

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isMenuOpen]);

    const closeMenu = () => setIsMenuOpen(false);
    const primaryHref = isAuthenticated ? dashboard() : login();
    const secondaryHref = isAuthenticated ? dashboard() : register();

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
            <div className="mx-auto flex h-[74px] w-full max-w-[1360px] items-center justify-between px-4 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-2.5 rounded-lg text-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20" aria-label="TestMaker home">
                    <SquareCheckBig size={30} strokeWidth={2.4} className="text-brand-600" aria-hidden="true" />
                    <span className="font-display text-[1.28rem] font-extrabold tracking-[-0.045em]">TestMaker</span>
                </Link>

                <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
                    {primaryNavigation.map((item) => (
                        <a key={item.label} href={item.href} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-1.5 text-sm font-medium text-slate-700 transition hover:text-brand-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20">
                            {item.label}
                            {item.hasMenu && <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />}
                        </a>
                    ))}
                </nav>

                <div className="hidden items-center gap-5 sm:flex">
                    <Link href={primaryHref} className="min-h-11 rounded-lg px-1.5 py-3 text-sm font-medium text-slate-700 transition hover:text-brand-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20">
                        {isAuthenticated ? 'Open app' : 'Login'}
                    </Link>
                    <Link href={secondaryHref} className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/25 active:bg-brand-800">
                        {isAuthenticated ? 'Go to Dashboard' : 'Sign Up Free'}
                        <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                </div>

                <button type="button" aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={isMenuOpen} aria-controls="mobile-navigation" onClick={() => setIsMenuOpen((open) => !open)} className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-slate-300 text-slate-800 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20 sm:hidden">
                    {isMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
                </button>
            </div>

            {isMenuOpen && (
                <>
                    <button type="button" aria-label="Close navigation menu" onClick={closeMenu} className="site-mobile-overlay fixed inset-0 z-[60] bg-slate-900/35 backdrop-blur-[2px] sm:hidden" />
                    <aside id="mobile-navigation" aria-label="Mobile navigation" className="site-mobile-panel fixed right-0 top-0 z-[70] flex h-[100dvh] w-[min(88vw,360px)] flex-col border-l border-slate-200 bg-white px-5 pb-7 pt-5 shadow-[-12px_0_32px_rgba(15,23,42,0.1)] sm:hidden">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
                            <Link href="/" onClick={closeMenu} className="flex items-center gap-2.5 text-slate-900" aria-label="TestMaker home"><SquareCheckBig size={28} className="text-brand-600" /><span className="font-display text-xl font-extrabold tracking-[-0.045em]">TestMaker</span></Link>
                            <button type="button" aria-label="Close navigation menu" onClick={closeMenu} className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-slate-300 text-slate-800 hover:border-brand-300 hover:text-brand-700"><X size={20} /></button>
                        </div>
                        <nav className="mt-8 grid gap-1" aria-label="Mobile page links">
                            {primaryNavigation.map((item) => <a key={item.label} href={item.href} onClick={closeMenu} className="flex min-h-12 items-center justify-between rounded-[10px] px-3 text-base font-medium text-slate-800 transition hover:bg-brand-50 hover:text-brand-700">{item.label}{item.hasMenu ? <ChevronDown size={16} /> : <ArrowUpRight size={16} />}</a>)}
                        </nav>
                        <div className="mt-auto grid gap-3 border-t border-slate-200 pt-6">
                            <Link href={primaryHref} onClick={closeMenu} className="min-h-12 rounded-[10px] px-4 py-3 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50">{isAuthenticated ? 'Open app' : 'Login'}</Link>
                            <Link href={secondaryHref} onClick={closeMenu} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700">{isAuthenticated ? 'Go to Dashboard' : 'Sign Up Free'} <ArrowUpRight size={15} /></Link>
                        </div>
                    </aside>
                </>
            )}
        </header>
    );
}

import { Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, SquareCheckBig } from 'lucide-react';
import { login } from '@/routes';

type AuthHeaderProps = {
    page: 'login' | 'register';
};

export default function AuthHeader({ page }: AuthHeaderProps) {
    return (
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl">
            <div className="mx-auto flex h-[74px] w-full max-w-[1240px] items-center justify-between px-4 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-2.5 rounded-lg text-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20" aria-label="TestMaker home">
                    <SquareCheckBig size={30} strokeWidth={2.4} className="text-brand-600" aria-hidden="true" />
                    <span className="font-display text-[1.28rem] font-extrabold tracking-[-0.045em]">TestMaker</span>
                </Link>
                {page === 'login' ? (
                    <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-[10px] px-3 text-sm font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20"><ArrowLeft size={15} aria-hidden="true" /> Back to home</Link>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-slate-500"><span className="hidden sm:inline">Already have an account?</span><Link href={login()} className="inline-flex min-h-10 items-center gap-2 rounded-[10px] px-3 font-semibold text-brand-700 transition hover:bg-brand-50 hover:text-brand-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20">Log in <ArrowRight size={15} aria-hidden="true" /></Link></div>
                )}
            </div>
        </header>
    );
}

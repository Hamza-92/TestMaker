import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Check, CheckCircle2, ClipboardCheck, HelpCircle, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import SiteHeader from '@/components/site-header';
import { dashboard, register } from '@/routes';
import type { Auth } from '@/types/auth';

type PricingPageProps = { auth: Auth };

const plans = [
    {
        name: '30-Day Free Trial',
        eyebrow: 'Try TestMaker first',
        price: '30 days',
        description: 'Explore the complete assessment workflow with no payment required.',
        features: ['Full paper builder', 'Core question types', 'No commitment', 'Download and print papers'],
        featured: true,
        action: 'Start free trial',
    },
    {
        name: 'Play Group to 8th',
        eyebrow: 'Junior school package',
        price: 'Rs 9,000',
        suffix: '/ year',
        description: 'A practical package for schools building consistent papers across junior classes.',
        features: ['1-year access', 'Unlimited printouts', 'Shared school workflow', 'Classes Play Group to 8th'],
        action: 'Choose this plan',
    },
    {
        name: 'Play to 12th',
        eyebrow: 'Full-school package',
        price: 'Rs 12,000',
        suffix: '/ year',
        description: 'A complete package for schools supporting learners through higher classes.',
        features: ['1-year access', 'Unlimited printouts', 'Broad class coverage', 'Classes Play Group to 12th'],
        action: 'Choose this plan',
    },
    {
        name: 'Online Assessment',
        eyebrow: 'Digital testing package',
        price: 'Talk to us',
        description: 'Add online tests and digital delivery when your school is ready to extend beyond paper.',
        features: ['Online MCQ tests', 'Shareable test links', 'Student attempts', 'Results overview'],
        action: 'Ask about online tests',
    },
    {
        name: 'School Plus',
        eyebrow: 'For growing teams',
        price: 'Talk to us',
        description: 'A flexible setup for schools that need more collaboration, support, or tailored access.',
        features: ['Multiple teacher accounts', 'School-wide standards', 'Priority onboarding', 'Flexible permissions'],
        action: 'Talk to our team',
    },
    {
        name: 'Custom Partnership',
        eyebrow: 'For institutions',
        price: 'Let’s plan it',
        description: 'Build an assessment workflow around your institution, network, or training program.',
        features: ['Custom requirements review', 'Implementation guidance', 'Usage planning', 'Dedicated support'],
        action: 'Start a conversation',
    },
];

function PlanCard({ plan }: { plan: (typeof plans)[number] }) {
    const isTrial = plan.featured;

    return (
        <article className={`relative flex h-full flex-col rounded-[24px] border p-6 shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(15,23,42,0.1)] sm:p-7 ${isTrial ? 'border-brand-500 bg-brand-600 text-white shadow-[0_22px_50px_rgba(37,99,235,0.24)]' : 'border-slate-200 bg-white text-slate-900'}`}>
            {isTrial && <span className="absolute -top-3 left-6 rounded-full bg-amber-300 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-950">Most popular</span>}
            <p className={`text-xs font-bold uppercase tracking-[0.14em] ${isTrial ? 'text-blue-100' : 'text-brand-700'}`}>{plan.eyebrow}</p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.03em]">{plan.name}</h2>
            <p className={`mt-3 min-h-[72px] text-sm leading-6 ${isTrial ? 'text-blue-100' : 'text-slate-600'}`}>{plan.description}</p>
            <div className="mt-7 flex items-baseline gap-2">
                <span className="font-display text-3xl font-extrabold tracking-[-0.04em]">{plan.price}</span>
                {plan.suffix && <span className={`text-sm ${isTrial ? 'text-blue-100' : 'text-slate-500'}`}>{plan.suffix}</span>}
            </div>
            <ul className={`mt-7 grid flex-1 gap-3 border-t pt-6 text-sm ${isTrial ? 'border-white/20 text-blue-50' : 'border-slate-100 text-slate-600'}`}>
                {plan.features.map((feature) => <li key={feature} className="flex items-start gap-2"><CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${isTrial ? 'text-blue-100' : 'text-emerald-500'}`} />{feature}</li>)}
            </ul>
            <Link href={isTrial ? register() : '/login'} className={`mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-4 py-3 text-sm font-bold transition focus:outline-none focus-visible:ring-4 ${isTrial ? 'bg-white text-brand-700 hover:bg-blue-50 focus-visible:ring-white/40' : 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-600/25'}`}>
                {isTrial ? plan.action : 'Get started'} <ArrowRight size={15} />
            </Link>
        </article>
    );
}

export default function Pricing() {
    const { auth } = usePage<PricingPageProps>().props;
    const isAuthenticated = Boolean(auth?.user);

    return (
        <>
            <Head title="Pricing" />
            <div id="top" className="min-h-screen overflow-x-hidden bg-white text-slate-900">
                <SiteHeader auth={auth} />
                <main className="pt-[74px]">
                    <section className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(180deg,#EFF6FF_0%,#FFFFFF_84%)] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
                        <div className="pointer-events-none absolute -right-28 top-8 h-80 w-80 rounded-full bg-brand-100/80 blur-3xl" />
                        <div className="pointer-events-none absolute left-1/2 top-0 h-28 w-28 -translate-x-1/2 opacity-50 [background-image:radial-gradient(#93c5fd_1.5px,transparent_1.5px)] [background-size:13px_13px]" />
                        <div className="relative mx-auto max-w-3xl text-center">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">Simple, transparent plans</p>
                            <h1 className="mt-4 font-display text-[40px] font-extrabold leading-tight tracking-[-0.06em] text-slate-900 sm:text-[54px]">Choose the right way to get started.</h1>
                            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Start free, then choose the package that fits your classes, your teachers, and the way your school works.</p>
                            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-medium text-slate-600">
                                <span className="inline-flex items-center gap-2"><Check size={16} className="text-emerald-600" /> No credit card for trial</span>
                                <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" /> Secure school workspace</span>
                            </div>
                        </div>
                    </section>

                    <section className="bg-[#f8fafc] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                        <div className="mx-auto max-w-[1240px]">
                            <div className="grid gap-5 lg:grid-cols-3">
                                {plans.slice(0, 3).map((plan) => <PlanCard key={plan.name} plan={plan} />)}
                            </div>

                            <div className="mt-20 text-center">
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">More ways to work with TestMaker</p>
                                <h2 className="mt-3 font-display text-[30px] font-bold leading-tight tracking-[-0.05em] text-slate-900 sm:text-[38px]">Plans for the next stage of your school.</h2>
                                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">Need online delivery, more collaboration, or a tailored setup? Explore the additional options below.</p>
                            </div>
                            <div className="mt-10 grid gap-5 lg:grid-cols-3">
                                {plans.slice(3).map((plan) => <PlanCard key={plan.name} plan={plan} />)}
                            </div>
                        </div>
                    </section>

                    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                        <div className="mx-auto grid max-w-[1080px] gap-6 md:grid-cols-3">
                            {[
                                { icon: Sparkles, title: 'Start without pressure', text: 'Use the 30-day trial to see how the full workflow feels before choosing a paid plan.' },
                                { icon: UsersRound, title: 'Built for school teams', text: 'Keep teachers and coordinators aligned around consistent, reusable assessment work.' },
                                { icon: HelpCircle, title: 'Need a hand?', text: 'Tell us what your school needs and we can help you choose the most practical setup.' },
                            ].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-[20px] border border-slate-200 bg-slate-50 p-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm"><Icon size={21} /></span><h2 className="mt-5 font-display text-lg font-bold text-slate-900">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>)}
                        </div>
                    </section>

                    <section className="bg-[#eaf2ff] px-4 py-14 sm:px-6 lg:px-8">
                        <div className="mx-auto flex max-w-[1080px] flex-col items-start justify-between gap-6 rounded-[24px] bg-[#102b46] px-7 py-8 text-white sm:px-10 md:flex-row md:items-center">
                            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Ready to begin?</p><h2 className="mt-3 font-display text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">Make your next assessment easier to build.</h2></div>
                            <Link href={isAuthenticated ? dashboard() : register()} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-brand-700 transition hover:bg-blue-50">{isAuthenticated ? 'Go to dashboard' : 'Start for free'} <ArrowRight size={16} /></Link>
                        </div>
                    </section>
                </main>
                <footer className="bg-[#0b2035] px-5 py-8 text-white sm:px-8">
                    <div className="mx-auto flex max-w-[1240px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <Link href="/" className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#102b46]"><ClipboardCheck size={19} /></span><span className="font-display text-xl font-extrabold tracking-[-0.04em]">TestMaker</span></Link>
                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-blue-200"><Link href="/" className="transition hover:text-white">Home</Link><a href="/pricing" className="text-white">Pricing</a><Link href={isAuthenticated ? dashboard() : register()} className="transition hover:text-white">{isAuthenticated ? 'Dashboard' : 'Create an account'}</Link></div>
                    </div>
                </footer>
            </div>
        </>
    );
}

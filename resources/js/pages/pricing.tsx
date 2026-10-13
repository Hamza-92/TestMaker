import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Check } from 'lucide-react';
import PublicSiteFooter from '@/components/public-site-footer';
import SiteHeader from '@/components/site-header';
import type { Auth } from '@/types/auth';
import type {
    PricingContent,
    PricingPlan,
    PricingSection,
} from '@/types/site-pricing';

type PricingPageProps = {
    auth: Auth;
    content: PricingContent;
    preview?: boolean;
};

function PlanCard({
    plan,
    style,
}: {
    plan: PricingPlan;
    style: PricingContent['layout']['card_style'];
}) {
    const prominent = plan.featured;

    return (
        <article
            className={`relative flex h-full flex-col rounded-2xl border p-6 sm:p-7 ${prominent ? 'border-brand-600 bg-brand-950 text-white shadow-[0_14px_40px_rgba(15,23,42,0.13)]' : style === 'soft' ? 'border-slate-100 bg-slate-50 text-slate-900' : 'border-slate-200 bg-white text-slate-900'}`}
        >
            {plan.badge && (
                <span
                    className={`mb-5 w-fit rounded-full px-3 py-1 text-xs font-semibold ${prominent ? 'bg-white/15 text-white' : 'bg-brand-50 text-brand-700'}`}
                >
                    {plan.badge}
                </span>
            )}
            <p
                className={`text-xs font-semibold uppercase tracking-[0.13em] ${prominent ? 'text-blue-200' : 'text-brand-700'}`}
            >
                {plan.eyebrow}
            </p>
            <h3 className="mt-2 font-display text-2xl font-bold tracking-tight">
                {plan.name}
            </h3>
            <p
                className={`mt-3 text-sm leading-6 ${prominent ? 'text-blue-100' : 'text-slate-600'}`}
            >
                {plan.description}
            </p>
            <div className="mt-7 flex flex-wrap items-baseline gap-2">
                <span className="font-display text-3xl font-extrabold tracking-tight">
                    {plan.price}
                </span>
                {plan.period && (
                    <span
                        className={`text-sm ${prominent ? 'text-blue-200' : 'text-slate-500'}`}
                    >
                        {plan.period}
                    </span>
                )}
            </div>
            <ul
                className={`mt-6 flex-1 space-y-3 border-t pt-6 text-sm ${prominent ? 'border-white/20' : 'border-slate-200'}`}
            >
                {plan.features.map((feature, index) => (
                    <li
                        key={`${index}-${feature}`}
                        className="flex items-start gap-2.5"
                    >
                        <Check
                            size={16}
                            className={`mt-0.5 shrink-0 ${prominent ? 'text-blue-200' : 'text-emerald-600'}`}
                            aria-hidden="true"
                        />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>
            <a
                href={plan.action_url}
                className={`mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 ${prominent ? 'bg-white text-brand-900 hover:bg-blue-50 focus-visible:ring-white/40' : 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-600/20'}`}
            >
                {plan.action_label}
                <ArrowRight size={16} aria-hidden="true" />
            </a>
        </article>
    );
}

function PricingSections({ content }: { content: PricingContent }) {
    const mainPlans = content.plans.filter(
        (plan) => plan.visible && plan.group === 'main',
    );
    const additionalPlans = content.plans.filter(
        (plan) => plan.visible && plan.group === 'additional',
    );
    const columns =
        content.layout.plan_columns === 2
            ? 'lg:grid-cols-2'
            : content.layout.plan_columns === 4
              ? 'lg:grid-cols-4'
              : 'lg:grid-cols-3';

    const sections: Record<PricingSection, React.ReactNode> = {
        plans: (
            <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div className="mx-auto max-w-[1200px]">
                    <div className="max-w-2xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
                            {content.plans_section.eyebrow}
                        </p>
                        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                            {content.plans_section.title}
                        </h2>
                        <p className="mt-4 leading-7 text-slate-600">
                            {content.plans_section.description}
                        </p>
                    </div>
                    {mainPlans.length > 0 && (
                        <div
                            className={`mt-10 grid gap-5 md:grid-cols-2 ${columns}`}
                        >
                            {mainPlans.map((plan) => (
                                <PlanCard
                                    key={plan.id}
                                    plan={plan}
                                    style={content.layout.card_style}
                                />
                            ))}
                        </div>
                    )}
                    {additionalPlans.length > 0 && (
                        <div className="mt-16">
                            <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                                {content.plans_section.additional_title}
                            </h3>
                            <div
                                className={`mt-6 grid gap-5 md:grid-cols-2 ${columns}`}
                            >
                                {additionalPlans.map((plan) => (
                                    <PlanCard
                                        key={plan.id}
                                        plan={plan}
                                        style={content.layout.card_style}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        ),
        benefits: (
            <section className="border-y border-slate-100 bg-slate-50 px-4 py-14 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-[1200px]">
                    <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                        {content.benefits.title}
                    </h2>
                    <div className="mt-7 grid gap-5 md:grid-cols-3">
                        {content.benefits.items.map((item, index) => (
                            <div
                                key={`${index}-${item.title}`}
                                className="rounded-2xl border border-slate-200 bg-white p-6"
                            >
                                <h3 className="font-semibold text-slate-900">
                                    {item.title}
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        ),
        faq: (
            <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-[800px]">
                    <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">
                        {content.faq.title}
                    </h2>
                    <div className="mt-7 divide-y divide-slate-200 border-y border-slate-200">
                        {content.faq.items.map((item, index) => (
                            <details
                                key={`${index}-${item.question}`}
                                className="group py-5"
                            >
                                <summary className="cursor-pointer text-base font-semibold text-slate-900">
                                    {item.question}
                                </summary>
                                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                                    {item.answer}
                                </p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>
        ),
        cta: (
            <section className="bg-brand-950 px-4 py-16 text-white sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-[1200px] flex-col gap-7 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-2xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
                            {content.cta.eyebrow}
                        </p>
                        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight">
                            {content.cta.title}
                        </h2>
                        <p className="mt-3 leading-7 text-blue-100">
                            {content.cta.description}
                        </p>
                    </div>
                    <a
                        href={content.cta.button_url}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-900 transition hover:bg-blue-50"
                    >
                        {content.cta.button_label}
                        <ArrowRight size={16} aria-hidden="true" />
                    </a>
                </div>
            </section>
        ),
    };

    return (
        <>
            {content.section_order
                .filter((section) => content.visibility[section])
                .map((section) => (
                    <div key={section}>{sections[section]}</div>
                ))}
        </>
    );
}

export default function Pricing() {
    const {
        auth,
        content,
        preview = false,
    } = usePage<PricingPageProps>().props;

    return (
        <>
            <Head title={content.seo.title}>
                <meta name="description" content={content.seo.description} />
            </Head>
            <div id="top" className="min-h-screen bg-white text-slate-900">
                {preview && (
                    <div className="bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">
                        Draft preview ·{' '}
                        <Link
                            href="/superadmin/site/pricing"
                            className="underline"
                        >
                            Back to editor
                        </Link>
                    </div>
                )}
                <SiteHeader auth={auth} />
                <main>
                    <section
                        className={`px-4 py-16 sm:px-6 lg:px-8 lg:py-24 ${content.layout.hero_background === 'soft' ? 'bg-slate-50' : 'bg-white'}`}
                    >
                        <div
                            className={`mx-auto max-w-[1200px] ${content.layout.hero_alignment === 'center' ? 'text-center' : 'text-left'}`}
                        >
                            <div
                                className={
                                    content.layout.hero_alignment === 'center'
                                        ? 'mx-auto max-w-3xl'
                                        : 'max-w-3xl'
                                }
                            >
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                                    {content.hero.eyebrow}
                                </p>
                                <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                                    {content.hero.title}
                                </h1>
                                <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">
                                    {content.hero.description}
                                </p>
                            </div>
                        </div>
                    </section>
                    <PricingSections content={content} />
                </main>
                <PublicSiteFooter />
            </div>
        </>
    );
}

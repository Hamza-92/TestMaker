import { Link } from '@inertiajs/react';
import { ArrowRight, Check } from 'lucide-react';

export default function QatWebsiteSection() {
    return (
        <section
            id="qat-papers"
            className="bg-white px-4 py-14 sm:px-6 lg:px-8"
        >
            <div className="relative mx-auto grid max-w-[1240px] items-center gap-5 overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-7 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
                <div className="relative z-10">
                    <p className="text-sm font-bold text-brand-700">
                        For PEF partner schools
                    </p>
                    <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                        Your next QAT practice paper starts here.
                    </h2>
                    <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                        Create PEF pattern papers automatically or choose your
                        own questions. Follow the monthly QAT syllabus, with
                        English and Urdu papers and answer keys.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-slate-700">
                        {[
                            'Automatic & manual generation',
                            'Ready to print',
                        ].map((feature) => (
                            <span
                                key={feature}
                                className="inline-flex items-center gap-2"
                            >
                                <Check
                                    aria-hidden="true"
                                    className="size-4 text-emerald-600"
                                />
                                {feature}
                            </span>
                        ))}
                    </div>
                    <Link
                        href="/qat"
                        className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-brand-600 px-6 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
                    >
                        Explore QAT papers{' '}
                        <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                </div>
                <img
                    src="/images/qat/generation-header.webp"
                    alt="PEF QAT checklist with school books and stationery"
                    width="952"
                    height="488"
                    loading="lazy"
                    className="mx-auto h-auto w-full max-w-lg"
                />
            </div>
        </section>
    );
}

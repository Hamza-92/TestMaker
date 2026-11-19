import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    CalendarDays,
    Check,
    ChevronDown,
    ClipboardCheck,
    FileCheck2,
    Languages,
    MousePointer2,
    Printer,
    Sparkles,
    Zap,
} from 'lucide-react';
import { useState } from 'react';
import PublicSiteFooter from '@/components/public-site-footer';
import { qatAnnualFee } from '@/components/qat/trial-status';
import SiteHeader from '@/components/site-header';
import type { Auth } from '@/types/auth';

type Props = {
    auth: Auth;
    canRegister: boolean;
    trialLimit: number;
    trialDurationDays: number;
};

const features = [
    {
        icon: CalendarDays,
        title: 'Monthly syllabus, sorted',
        description:
            'Choose the academic year and preparation month to work with the QAT syllabus.',
        color: 'bg-emerald-50 text-emerald-700',
    },
    {
        icon: Languages,
        title: 'English & Urdu',
        description:
            'Practice papers in English and Urdu, formatted for each subject.',
        color: 'bg-violet-50 text-violet-700',
    },
    {
        icon: FileCheck2,
        title: 'Answer keys included',
        description:
            'Open the answer key alongside your paper for checking and classroom review.',
        color: 'bg-amber-50 text-amber-700',
    },
    {
        icon: Printer,
        title: 'Made for the classroom',
        description:
            'Adjust the paper layout, print a clean copy, or download it as a PDF.',
        color: 'bg-sky-50 text-sky-700',
    },
];

const sampleContent = {
    english: {
        subject: 'English',
        heading: 'Choose the correct option.',
        question: 'Which word is a noun?',
        options: ['Quickly', 'School', 'Run', 'Beautiful'],
        shortHeading: 'Answer the following question.',
        shortQuestion: 'Write two sentences about your school.',
        answer: 'B. School',
    },
    urdu: {
        subject: 'اردو',
        heading: 'درست جواب کا انتخاب کریں۔',
        question: 'درج ذیل میں سے اسم کون سا ہے؟',
        options: ['تیز', 'کتاب', 'چلنا', 'خوب صورت'],
        shortHeading: 'درج ذیل سوال کا جواب دیں۔',
        shortQuestion: 'اپنے سکول کے بارے میں دو جملے لکھیں۔',
        answer: 'ب۔ کتاب',
    },
};

function SamplePaper() {
    const [medium, setMedium] = useState<'english' | 'urdu'>('english');
    const sample = sampleContent[medium];
    const urdu = medium === 'urdu';

    return (
        <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-violet-50 p-4 sm:p-7">
            <div
                role="group"
                aria-label="Sample paper language"
                className="mb-5 flex w-fit gap-1 rounded-xl border border-slate-200 bg-white p-1"
            >
                {(['english', 'urdu'] as const).map((language) => (
                    <button
                        key={language}
                        type="button"
                        aria-pressed={medium === language}
                        onClick={() => setMedium(language)}
                        className={`min-h-10 rounded-lg px-5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${medium === language ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        {language === 'english' ? 'English' : 'Urdu'}
                    </button>
                ))}
            </div>
            <div
                dir={urdu ? 'rtl' : 'ltr'}
                lang={urdu ? 'ur' : 'en'}
                className={`rounded-xl border border-slate-200 bg-white p-5 font-serif text-slate-900 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.3)] sm:p-8 ${urdu ? 'leading-loose' : ''}`}
            >
                <p className="text-center text-xl font-bold">
                    {urdu ? 'کیو اے ٹی مشقی پرچہ' : 'QAT Practice Paper'}
                </p>
                <p className="mt-1 text-center text-sm">{sample.subject}</p>
                <div className="mt-5 flex flex-wrap justify-between gap-2 border-y border-slate-400 py-2 text-xs">
                    <span>{urdu ? 'نام' : 'Name'} __________________</span>
                    <span>{urdu ? 'تاریخ' : 'Date'} __________</span>
                </div>
                <p className="mt-5 bg-sky-50 px-2 py-1.5 text-sm font-bold">
                    {urdu ? 'سوال ۱۔' : 'Q.1.'} {sample.heading}
                </p>
                <p className="mt-3 text-sm">1. {sample.question}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:gap-3">
                    {sample.options.map((option, index) => (
                        <div
                            key={option}
                            className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2"
                        >
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-slate-400 text-[10px]">
                                {urdu
                                    ? ['ا', 'ب', 'ج', 'د'][index]
                                    : ['A', 'B', 'C', 'D'][index]}
                            </span>
                            {option}
                        </div>
                    ))}
                </div>
                <p className="mt-5 bg-sky-50 px-2 py-1.5 text-sm font-bold">
                    {urdu ? 'سوال ۲۔' : 'Q.2.'} {sample.shortHeading}
                </p>
                <p className="mt-3 text-sm">{sample.shortQuestion}</p>
                <div aria-hidden="true" className="mt-6 space-y-6">
                    <div className="border-b border-slate-200" />
                    <div className="border-b border-slate-200" />
                </div>
                <p className="mt-5 text-xs text-slate-600">
                    {urdu ? 'جواب' : 'Answer key'} · {sample.answer}
                </p>
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                Illustrative preview. Your paper follows the selected subject,
                syllabus and template.
            </p>
        </div>
    );
}

export default function QatLanding() {
    const { auth, canRegister, trialLimit, trialDurationDays } =
        usePage<Props>().props;
    const signedIn = Boolean(auth?.user);
    const ctaHref = signedIn
        ? '/dashboard'
        : canRegister
          ? '/register?trial=qat'
          : '/login';
    const ctaText = signedIn
        ? 'Open your workspace'
        : canRegister
          ? 'Start free QAT trial'
          : 'Log in to TestMaker';
    const ctaClass =
        'inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-brand-600 px-6 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600';
    const questions = [
        {
            question: 'What is included in the free trial?',
            answer: `You can generate ${trialLimit} QAT papers during ${trialDurationDays} days of trial access. Try automatic generation or manually pick questions. Trial papers carry a watermark.`,
        },
        {
            question: 'Do unsaved papers count towards the trial?',
            answer: `Yes. Each generated paper counts, including unsaved previews. Generating two variants uses two trial papers. After your final preview is closed, access locks until you upgrade.`,
        },
        {
            question:
                'Can I use the monthly syllabus or choose my own chapters?',
            answer: 'Automatic generation uses the QAT monthly syllabus. Manual generation lets you select chapters and pick questions yourself or use an available template.',
        },
        {
            question: 'How do I activate my subscription?',
            answer: `The QAT annual subscription costs ${qatAnnualFee}. Pay through Easy Paisa, JazzCash or Meezan Bank, then send your receipt and school name on WhatsApp using the upgrade page. Access is activated after payment verification.`,
        },
        {
            question:
                'I already have a TestMaker account. Should I register again?',
            answer: 'Log in with your existing account and contact TestMaker to enable QAT access for your school.',
        },
    ];

    return (
        <>
            <Head title="QAT practice papers for PEF schools">
                <meta
                    name="description"
                    content={`Create PEF QAT practice papers with automatic and manual generation, English and Urdu support, and answer keys. Try ${trialLimit} papers free. Annual subscription ${qatAnnualFee}.`}
                />
            </Head>
            <div
                id="top"
                className="min-h-screen overflow-x-clip bg-white text-slate-900"
            >
                <SiteHeader
                    auth={auth}
                    registerHref={
                        canRegister ? '/register?trial=qat' : '/login'
                    }
                    registerLabel={canRegister ? 'Start QAT trial' : 'Log in'}
                />
                <main>
                    <section className="relative overflow-hidden border-b border-sky-100 bg-gradient-to-br from-[#eef8ff] via-white to-[#fff7eb]">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute right-0 top-12 h-48 w-48 opacity-40 [background-image:radial-gradient(#9bb9f0_1.5px,transparent_1.5px)] [background-size:18px_18px]"
                        />
                        <div className="relative mx-auto grid max-w-[1240px] items-center gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-4 lg:py-24">
                            <div className="relative z-10">
                                <p className="text-sm font-bold text-brand-700">
                                    PEF QAT paper generator
                                </p>
                                <h1 className="mt-4 max-w-2xl font-display text-4xl font-extrabold leading-[1.12] tracking-[-0.045em] sm:text-5xl lg:text-[58px]">
                                    More practice.
                                    <br />
                                    Less paper prep.
                                    <br />
                                    <span className="text-brand-600">
                                        Ready for QAT.
                                    </span>
                                </h1>
                                <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                                    Create QAT practice papers on the PEF
                                    pattern for your school. Choose a monthly
                                    syllabus, generate automatically or pick
                                    your questions, and get a paper ready to
                                    print.
                                </p>
                                <div className="mt-7 flex flex-wrap gap-3">
                                    <Link href={ctaHref} className={ctaClass}>
                                        {ctaText}
                                        <ArrowRight
                                            aria-hidden="true"
                                            className="size-4"
                                        />
                                    </Link>
                                    <a
                                        href="#sample-papers"
                                        className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-colors hover:border-brand-300 hover:bg-sky-50"
                                    >
                                        See a sample{' '}
                                        <BookOpen
                                            aria-hidden="true"
                                            className="size-4"
                                        />
                                    </a>
                                </div>
                                <p className="mt-4 text-sm text-slate-500">
                                    {trialLimit} free papers ·{' '}
                                    {trialDurationDays}-day trial · No credit
                                    card needed
                                </p>
                            </div>
                            <div className="relative mx-auto w-full max-w-xl lg:w-[115%] lg:max-w-none">
                                <img
                                    src="/images/qat/generation-header.webp"
                                    alt="PEF QAT practice checklist with books and pencils"
                                    width="952"
                                    height="488"
                                    fetchPriority="high"
                                    className="relative h-auto w-full"
                                />
                            </div>
                        </div>
                        <div className="border-t border-sky-100 bg-white/70">
                            <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-center gap-x-9 gap-y-3 px-5 py-5 text-sm font-semibold text-slate-600 sm:px-8 lg:justify-between">
                                <span>For PEF partner schools</span>
                                {['NSP', 'FAS', 'EVS', 'PSRP', 'NSSE'].map(
                                    (program) => (
                                        <span
                                            key={program}
                                            className="font-display text-base font-bold tracking-wide text-[#173c6b]"
                                        >
                                            {program}
                                        </span>
                                    ),
                                )}
                            </div>
                        </div>
                    </section>

                    <section
                        id="qat-features"
                        className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:py-20"
                    >
                        <div className="max-w-2xl">
                            <p className="text-sm font-bold text-brand-700">
                                Your questions. Your way.
                            </p>
                            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                                Two ways to build a better practice paper.
                            </h2>
                            <p className="mt-4 text-base leading-7 text-slate-600">
                                Start with the syllabus or take control of every
                                question. Both journeys lead to a paper you can
                                review and print.
                            </p>
                        </div>
                        <div className="mt-9 grid gap-6 md:grid-cols-2">
                            <article className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-7 sm:p-8">
                                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
                                    <Zap
                                        aria-hidden="true"
                                        className="size-6"
                                    />
                                </span>
                                <h3 className="mt-6 font-display text-2xl font-bold tracking-tight">
                                    Automatic paper
                                </h3>
                                <p className="mt-3 max-w-sm text-sm leading-7 text-slate-600">
                                    Select your class, subject and preparation
                                    month. Choose a PEF template and let
                                    TestMaker pick the questions.
                                </p>
                                <ul className="mt-5 space-y-3 text-sm text-slate-700">
                                    {[
                                        'QAT monthly syllabus',
                                        'Template question distribution',
                                        'Paper variants and OR choices',
                                    ].map((text) => (
                                        <li
                                            key={text}
                                            className="flex items-center gap-2"
                                        >
                                            <Check
                                                aria-hidden="true"
                                                className="size-4 shrink-0 text-brand-600"
                                            />
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                            </article>
                            <article className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-7 sm:p-8">
                                <span className="flex size-12 items-center justify-center rounded-2xl bg-violet-600 text-white">
                                    <MousePointer2
                                        aria-hidden="true"
                                        className="size-6"
                                    />
                                </span>
                                <h3 className="mt-6 font-display text-2xl font-bold tracking-tight">
                                    Manual paper
                                </h3>
                                <p className="mt-3 max-w-sm text-sm leading-7 text-slate-600">
                                    Choose the chapters you want to cover.
                                    Handpick questions or use a template to
                                    select questions from those chapters.
                                </p>
                                <ul className="mt-5 space-y-3 text-sm text-slate-700">
                                    {[
                                        'Custom chapter selection',
                                        'Browse and pick questions',
                                        'Review selections before generating',
                                    ].map((text) => (
                                        <li
                                            key={text}
                                            className="flex items-center gap-2"
                                        >
                                            <Check
                                                aria-hidden="true"
                                                className="size-4 shrink-0 text-violet-600"
                                            />
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        </div>
                        <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
                            {features.map(
                                ({ icon: Icon, title, description, color }) => (
                                    <div key={title}>
                                        <span
                                            className={`flex size-11 items-center justify-center rounded-xl ${color}`}
                                        >
                                            <Icon
                                                aria-hidden="true"
                                                className="size-5"
                                            />
                                        </span>
                                        <h3 className="mt-4 text-base font-bold">
                                            {title}
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">
                                            {description}
                                        </p>
                                    </div>
                                ),
                            )}
                        </div>
                    </section>

                    <section
                        id="sample-papers"
                        className="border-y border-slate-100 bg-[#f8fbff] px-5 py-16 sm:px-8 lg:py-20"
                    >
                        <div className="mx-auto grid max-w-[1240px] items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
                            <div>
                                <p className="text-sm font-bold text-brand-700">
                                    A look inside the paper
                                </p>
                                <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                                    Clear questions.
                                    <br />
                                    Classroom-ready pages.
                                </h2>
                                <p className="mt-5 text-base leading-7 text-slate-600">
                                    English and Urdu papers follow their subject
                                    medium. Adjust objective options, section
                                    labels and spacing in the paper workspace,
                                    then print or download.
                                </p>
                                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-sky-100 bg-white p-5">
                                    <ClipboardCheck
                                        aria-hidden="true"
                                        className="mt-0.5 size-5 shrink-0 text-brand-600"
                                    />
                                    <p className="text-sm leading-6 text-slate-600">
                                        Try it with your own class and subject.
                                        Every generated paper includes access to
                                        its answer key.
                                    </p>
                                </div>
                            </div>
                            <SamplePaper />
                        </div>
                    </section>

                    <section
                        id="qat-pricing"
                        className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:py-20"
                    >
                        <div className="grid items-center gap-9 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-7 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:p-12">
                            <div>
                                <p className="text-sm font-bold text-brand-700">
                                    Try it with your next class
                                </p>
                                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                                    Your first {trialLimit} papers are on us.
                                </h2>
                                <p className="mt-4 text-base leading-7 text-slate-600">
                                    Create your school account and explore QAT
                                    generation for {trialDurationDays} days, up
                                    to {trialLimit} papers. Upgrade when you are
                                    ready to keep preparing.
                                </p>
                                <Link
                                    href={ctaHref}
                                    className={`${ctaClass} mt-7`}
                                >
                                    {ctaText}
                                    <ArrowRight
                                        aria-hidden="true"
                                        className="size-4"
                                    />
                                </Link>
                                <p className="mt-4 text-xs leading-6 text-slate-500">
                                    Generated previews and paper variants count
                                    towards the trial. Trial access and saved
                                    papers lock after the final preview is
                                    closed.
                                </p>
                            </div>
                            <div className="rounded-2xl bg-[#112b53] p-7 text-white shadow-lg sm:p-8">
                                <div className="flex items-center gap-2 text-sm font-semibold text-sky-200">
                                    <Sparkles
                                        aria-hidden="true"
                                        className="size-4"
                                    />
                                    QAT annual subscription
                                </div>
                                <p className="mt-5 font-display text-4xl font-extrabold tracking-tight">
                                    {qatAnnualFee}
                                    <span className="ml-2 text-sm font-normal text-sky-200">
                                        / year
                                    </span>
                                </p>
                                <ul className="mt-6 space-y-3 border-t border-white/15 pt-6 text-sm text-sky-50">
                                    {[
                                        'Automatic and manual paper generation',
                                        'Available QAT classes and subjects',
                                        'Monthly syllabus and paper templates',
                                        'English and Urdu papers with answer keys',
                                        'Save, print and download your papers',
                                    ].map((text) => (
                                        <li
                                            key={text}
                                            className="flex items-center gap-3"
                                        >
                                            <Check
                                                aria-hidden="true"
                                                className="size-4 shrink-0 text-emerald-300"
                                            />
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-6 text-xs leading-6 text-sky-200">
                                    Pay through Easy Paisa, JazzCash or Meezan
                                    Bank. Activation follows payment
                                    verification.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-3xl px-5 pb-16 sm:px-8 lg:pb-24">
                        <h2 className="font-display text-3xl font-bold tracking-tight">
                            A few things you may want to know.
                        </h2>
                        <div className="mt-7 divide-y divide-slate-200 border-y border-slate-200">
                            {questions.map(({ question, answer }) => (
                                <details key={question} className="group py-5">
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-5 rounded-md text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600 [&::-webkit-details-marker]:hidden">
                                        {question}
                                        <ChevronDown
                                            aria-hidden="true"
                                            className="size-4 shrink-0 text-brand-600 transition-transform group-open:rotate-180"
                                        />
                                    </summary>
                                    <p className="mt-3 pr-6 text-sm leading-7 text-slate-600">
                                        {answer}
                                    </p>
                                </details>
                            ))}
                        </div>
                    </section>
                </main>
                <PublicSiteFooter />
            </div>
        </>
    );
}

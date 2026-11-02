import {
    BookOpenCheckIcon,
    CheckCheckIcon,
    Layers3Icon,
    LanguagesIcon,
    PrinterIcon,
    ZapIcon,
} from 'lucide-react';

export function QatGenerationHeader({ mode }: { mode: 'auto' | 'manual' }) {
    const isAuto = mode === 'auto';
    const features = [
        {
            label: isAuto ? 'Fast generation' : 'Your question choice',
            icon: isAuto ? ZapIcon : CheckCheckIcon,
            color: 'from-emerald-400 to-emerald-600 shadow-emerald-500/20',
        },
        {
            label: isAuto ? 'PEF pattern' : 'Custom syllabus',
            icon: Layers3Icon,
            color: 'from-sky-300 to-sky-500 shadow-sky-500/20',
        },
        {
            label: isAuto ? 'Chapter-wise selection' : 'English & Urdu',
            icon: isAuto ? BookOpenCheckIcon : LanguagesIcon,
            color: 'from-violet-400 to-violet-600 shadow-violet-500/20',
        },
        {
            label: 'Ready to print',
            icon: PrinterIcon,
            color: 'from-amber-300 to-orange-500 shadow-orange-500/20',
        },
    ];

    return (
        <header
            aria-labelledby="qat-generation-title"
            className="relative isolate overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-[#f3f8ff] via-[#f7fbff] to-[#e8f8f0] shadow-[0_8px_32px_-12px_rgba(59,130,246,0.18)] dark:border-sky-900/50 dark:from-slate-900 dark:via-[#132344] dark:to-[#113c3a]"
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-white/65 blur-3xl dark:bg-sky-500/10"
            />
            <div className="relative z-10 space-y-6 px-5 pb-2 pt-6 sm:px-7 sm:pt-7 md:py-8 md:pr-[40%] lg:pl-8 xl:space-y-7">
                <div className="space-y-2">
                    <h1
                        id="qat-generation-title"
                        className="text-3xl font-bold leading-tight tracking-tight text-[#112650] dark:text-slate-50 sm:text-[2rem] xl:text-4xl"
                    >
                        {isAuto ? 'Auto' : 'Manual'}{' '}
                        <span className="text-brand-600 dark:text-sky-400">
                            paper generation
                        </span>
                    </h1>
                    <p className="max-w-xl text-sm font-medium leading-relaxed text-[#425b7b] dark:text-slate-300 sm:text-base">
                        {isAuto
                            ? 'Create PEF pattern papers in just a few clicks'
                            : 'Create your paper, with the questions you choose'}
                    </p>
                </div>
                <ul className="grid max-w-2xl grid-cols-2 gap-x-4 gap-y-4 xl:grid-cols-4 xl:gap-x-3">
                    {features.map(({ label, icon: Icon, color }) => (
                        <li
                            key={label}
                            className="flex min-w-0 items-center gap-2.5"
                        >
                            <span
                                className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-white/35 bg-gradient-to-br text-white shadow-md ${color}`}
                            >
                                <Icon
                                    className="size-5"
                                    strokeWidth={2.1}
                                    aria-hidden="true"
                                />
                            </span>
                            <span className="max-w-24 text-xs font-semibold leading-relaxed text-[#345071] dark:text-slate-200">
                                {label}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
            <img
                src="/images/qat/generation-header.webp"
                alt=""
                aria-hidden="true"
                width={960}
                height={487}
                fetchPriority="high"
                decoding="async"
                className="pointer-events-none relative mx-auto -mb-3 h-36 w-full max-w-sm select-none object-contain object-bottom sm:h-44 md:absolute md:inset-y-0 md:-right-3 md:mb-0 md:h-full md:w-[38%] md:max-w-none md:object-right-bottom lg:right-0"
            />
        </header>
    );
}

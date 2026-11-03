const numberTones = {
    blue: 'from-sky-400 via-brand-600 to-blue-700 shadow-blue-600/20',
    green: 'from-emerald-400 via-emerald-500 to-teal-700 shadow-emerald-600/20',
    purple: 'from-violet-400 via-violet-600 to-purple-800 shadow-violet-600/20',
};

export function QatStepHeader({
    id,
    step,
    title,
    description,
    image,
    tone = 'blue',
}: {
    id: string;
    step: number;
    title: string;
    description: string;
    image: string;
    tone?: keyof typeof numberTones;
}) {
    return (
        <div
            data-qat-step-header
            className="relative min-h-24 overflow-hidden px-5 py-4 sm:px-6"
        >
            <img
                src={image}
                alt=""
                aria-hidden="true"
                decoding="async"
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain object-right-bottom"
            />
            <div className="relative z-10 flex items-center gap-3 sm:gap-4">
                <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full border border-white/50 bg-gradient-to-br text-xl font-bold text-white shadow-sm dark:border-white/20 ${numberTones[tone]}`}
                >
                    {step}
                </span>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-2 sm:max-w-[75%] sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                        <h2
                            id={id}
                            className="text-lg font-bold leading-snug tracking-tight text-[#112650] dark:text-slate-50 sm:text-xl"
                        >
                            {title}
                        </h2>
                        <p className="text-xs font-medium leading-relaxed text-[#526985] dark:text-slate-400 sm:text-[13px]">
                            {description}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

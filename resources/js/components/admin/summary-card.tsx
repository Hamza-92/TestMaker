import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { cardVariants } from '@/components/tm/card';
import { iconCardStyle } from '@/lib/icon-appearance';
import { cn } from '@/lib/utils';

type Tone = 'blue' | 'violet' | 'amber' | 'rose' | 'emerald';

const toneAppearance: Record<Tone, { background: string; accent: string }> = {
    blue: { background: 'bg-sky-600', accent: '#0284c7' },
    violet: { background: 'bg-violet-600', accent: '#7c3aed' },
    amber: { background: 'bg-amber-500', accent: '#f59e0b' },
    rose: { background: 'bg-rose-600', accent: '#e11d48' },
    emerald: { background: 'bg-emerald-600', accent: '#059669' },
};

export interface SummaryCardProps {
    label: string;
    value: string;
    icon: LucideIcon;
    tone: Tone;
    href?: string;
}

export function SummaryCard({
    label,
    value,
    icon: Icon,
    tone,
    href,
}: SummaryCardProps) {
    const { background, accent } = toneAppearance[tone];
    const className = cn(
        cardVariants({ padding: 'sm', interactive: true }),
        'block min-w-0',
        href &&
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
    );
    const content = (
        <div className="relative">
            <span
                className={cn(
                    'absolute right-0 top-0 flex size-9 items-center justify-center rounded-lg text-white shadow-sm',
                    background,
                )}
            >
                <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col pr-12">
                <p className="order-2 mt-3 text-2xl font-bold tabular-nums leading-none tracking-tight text-slate-950 dark:text-white">
                    {value}
                </p>
                <p className="order-1 break-words pt-0.5 text-xs font-semibold leading-tight text-slate-600 dark:text-slate-300">
                    {label}
                </p>
            </div>
        </div>
    );

    return href ? (
        <Link href={href} className={className} style={iconCardStyle(accent)}>
            {content}
        </Link>
    ) : (
        <div className={className} style={iconCardStyle(accent)}>
            {content}
        </div>
    );
}

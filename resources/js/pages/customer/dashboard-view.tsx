import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangleIcon,
    ArrowRightIcon,
    ArrowUpRightIcon,
    BookmarkCheckIcon,
    CalendarDaysIcon,
    CheckIcon,
    ChevronDownIcon,
    BadgeCheckIcon,
    Clock3Icon,
    FileClockIcon,
    FilePlus2Icon,
    FileTextIcon,
    PencilLineIcon,
    MegaphoneIcon,
    SchoolIcon,
    SparklesIcon,
    Trash2Icon,
    WrenchIcon,
    XIcon,
    UserPlusIcon,
    UsersRoundIcon,
} from 'lucide-react';
import type { CSSProperties, ElementType } from 'react';
import { useState } from 'react';
import { Badge, Button, Card, PageHeader } from '@/components/tm';
import { patternIcon } from '@/lib/pattern-appearance';
import { cn } from '@/lib/utils';

type SubjectPeriod = 'weekly' | 'monthly' | 'yearly';

interface Props {
    school: {
        name: string;
        logo: string | null;
        plan_name: string;
        subscription_ends_at: string | null;
        days_remaining: number | null;
        subscription_remaining_percent: number;
        total_teachers: number;
        total_classes: number;
    };
    stats: {
        papers_generated: number;
        saved_papers: number;
        questions_used: number;
        active_teachers: number;
        drafts: number;
        total_teachers: number;
    };
    patterns: Array<{
        id: number;
        name: string;
        short_name: string | null;
        description: string | null;
        icon: string;
        color: string;
        class_count: number;
        classes_label: string;
    }>;
    activities: Array<{
        id: string;
        type: string;
        message: string;
        created_at: string | null;
    }>;
    subject_usage: Record<
        SubjectPeriod,
        Array<{ name: string; count: number; percentage: number }>
    >;
    permissions: {
        can_generate_papers: boolean;
        can_add_teacher: boolean;
    };
    announcements: {
        banner: Announcement | null;
        updates: Announcement[];
    };
}

type AnnouncementType =
    | 'feature'
    | 'update'
    | 'maintenance'
    | 'important'
    | 'event';
interface Announcement {
    id: number;
    title: string;
    summary: string | null;
    body: string | null;
    type: AnnouncementType;
    action_label: string | null;
    action_url: string | null;
    published_at: string | null;
    is_dismissible: boolean;
}

function announcementTone(type: AnnouncementType) {
    return {
        feature:
            'border-violet-200 bg-violet-50/80 text-violet-950 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-100',
        update: 'border-sky-200 bg-sky-50/80 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100',
        maintenance:
            'border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100',
        important:
            'border-rose-200 bg-rose-50/80 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100',
        event: 'border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100',
    }[type];
}

function AnnouncementIcon({ type }: { type: AnnouncementType }) {
    const Icon =
        type === 'feature'
            ? SparklesIcon
            : type === 'maintenance'
              ? WrenchIcon
              : type === 'important'
                ? AlertTriangleIcon
                : type === 'event'
                  ? CalendarDaysIcon
                  : MegaphoneIcon;

    return <Icon className="size-4" />;
}

function isExternalUrl(value: string) {
    return /^https?:\/\//i.test(value);
}

function AnnouncementBanner({ announcement }: { announcement: Announcement }) {
    const [visible, setVisible] = useState(true);

    if (!visible) {
        return null;
    }

    const tone = announcementTone(announcement.type);
    const action =
        announcement.action_url && announcement.action_label ? (
            isExternalUrl(announcement.action_url) ? (
                <a
                    href={announcement.action_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4"
                >
                    {announcement.action_label}
                    <ArrowRightIcon className="size-3" />
                </a>
            ) : (
                <Link
                    href={announcement.action_url}
                    className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4"
                >
                    {announcement.action_label}
                    <ArrowRightIcon className="size-3" />
                </Link>
            )
        ) : null;

    const dismiss = () => {
        setVisible(false);

        if (announcement.is_dismissible) {
            router.post(
                `/announcements/${announcement.id}/dismiss`,
                { surface: 'banner' },
                { preserveScroll: true, preserveState: true },
            );
        }
    };

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-xl border p-4 shadow-sm sm:p-5',
                tone,
            )}
        >
            <div className="flex items-start gap-3.5 pr-7">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/70 shadow-sm dark:bg-slate-900/40">
                    <AnnouncementIcon type={announcement.type} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-semibold">
                            {announcement.title}
                        </p>
                        <span className="text-[10px] font-semibold tracking-wide uppercase opacity-60">
                            {announcement.type}
                        </span>
                    </div>
                    {(announcement.summary || announcement.body) && (
                        <p className="mt-1 max-w-3xl text-xs leading-relaxed opacity-75">
                            {announcement.summary || announcement.body}
                        </p>
                    )}
                    {action && <div className="mt-3">{action}</div>}
                </div>
            </div>
            {announcement.is_dismissible && (
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Dismiss announcement"
                    className="absolute top-3 right-3 rounded-lg p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                >
                    <XIcon className="size-4" />
                </button>
            )}
        </div>
    );
}

function updateIconTone(type: AnnouncementType) {
    return {
        feature:
            'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300',
        update: 'bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300',
        maintenance:
            'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300',
        important:
            'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300',
        event: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300',
    }[type];
}

function LatestUpdatesCard({ updates }: { updates: Announcement[] }) {
    if (updates.length === 0) {
        return null;
    }

    return (
        <Card padding="none" className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300">
                    <MegaphoneIcon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Latest Updates
                    </h2>
                    <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                        News and helpful updates
                    </p>
                </div>
                <Badge>{updates.length}</Badge>
            </div>
            <div className="max-h-80 overflow-y-auto overscroll-contain">
                {updates.map((update) => {
                    const content = (
                        <>
                            <div
                                className={cn(
                                    'flex size-9 shrink-0 items-center justify-center rounded-xl',
                                    updateIconTone(update.type),
                                )}
                            >
                                <AnnouncementIcon type={update.type} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start gap-2">
                                    <p className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                                        {update.title}
                                    </p>
                                    {update.action_url && (
                                        <ArrowUpRightIcon className="mt-0.5 size-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-slate-500" />
                                    )}
                                </div>
                                {update.summary && (
                                    <p className="mt-1 line-clamp-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                                        {update.summary}
                                    </p>
                                )}
                                <p className="mt-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    {relativeTime(update.published_at)}
                                </p>
                            </div>
                        </>
                    );

                    return update.action_url ? (
                        <Link
                            key={update.id}
                            href={update.action_url}
                            className="group flex gap-3.5 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                            {content}
                        </Link>
                    ) : (
                        <div
                            key={update.id}
                            className="flex gap-3.5 px-4 py-3.5"
                        >
                            {content}
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
const PERIOD_LABELS: Record<SubjectPeriod, string> = {
    weekly: 'This week',
    monthly: 'This month',
    yearly: 'This year',
};
const SUBJECT_COLORS = ['#4f46e5', '#0284c7', '#10b981', '#f59e0b', '#f43f5e'];

function assetUrl(value: string | null) {
    if (!value) {
        return null;
    }

    if (/^(https?:|data:|blob:|\/)/.test(value)) {
        return value;
    }

    return `/storage/${value.replace(/^storage\//, '')}`;
}

function initials(value: string) {
    return value
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join('');
}

function formatDate(value: string | null) {
    if (!value) {
        return 'No expiry';
    }

    return new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}

function relativeTime(value: string | null) {
    if (!value) {
        return 'Recently';
    }

    const seconds = Math.max(
        0,
        Math.round((Date.now() - new Date(value).getTime()) / 1000),
    );

    if (seconds < 60) {
        return 'Just now';
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes} min ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours} hr ago`;
    }

    const days = Math.floor(hours / 24);

    return days < 7
        ? `${days} day${days === 1 ? '' : 's'} ago`
        : formatDate(value);
}

function ProgressRing({ value }: { value: number }) {
    const safe = Math.max(0, Math.min(100, value));
    const circumference = 2 * Math.PI * 43;

    return (
        <div
            className="group/ring relative size-20 shrink-0 overflow-hidden rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 sm:size-24"
            tabIndex={0}
            aria-label={`${safe}% subscription remaining`}
        >
            <svg
                className="size-full -rotate-90"
                viewBox="0 0 100 100"
                aria-hidden="true"
            >
                <circle
                    cx="50"
                    cy="50"
                    r="43"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="7"
                    className="text-brand-100 dark:text-brand-950"
                />
                <circle
                    cx="50"
                    cy="50"
                    r="43"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={
                        circumference - (safe / 100) * circumference
                    }
                    className="text-brand-600 transition-[stroke-dashoffset] duration-500 ease-out dark:text-brand-400"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-center">
                <span className="text-xl font-bold tracking-tight text-slate-950 tabular-nums transition-opacity duration-200 group-hover/ring:opacity-0 group-focus/ring:opacity-0 sm:text-2xl dark:text-white">
                    {safe}%
                </span>
                <span className="pointer-events-none absolute max-w-14 px-1 text-[9px] leading-tight font-semibold text-slate-500 opacity-0 transition-opacity duration-200 group-hover/ring:opacity-100 group-focus/ring:opacity-100 sm:text-[10px] dark:text-slate-400">
                    plan remaining
                </span>
            </div>
        </div>
    );
}

function SchoolMetric({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: ElementType;
    label: string;
    value: string | number;
    tone: string;
}) {
    return (
        <div className="flex min-w-0 items-center gap-2.5 border-slate-200/80 py-1 sm:border-l sm:not-first:pl-4 sm:first:border-l-0 sm:first:pl-0 dark:border-slate-700/80">
            <div
                className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg',
                    tone,
                )}
            >
                <Icon className="size-4" />
            </div>
            <div className="min-w-0">
                <p className="truncate text-[10px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                    {label}
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                    {value}
                </p>
            </div>
        </div>
    );
}

function ActionCard({
    href,
    title,
    description,
    icon: Icon,
    tone,
}: {
    href: string;
    title: string;
    description: string;
    icon: ElementType;
    tone: 'violet' | 'emerald';
}) {
    const violet = tone === 'violet';

    return (
        <Link
            href={href}
            className={cn(
                'tm-lift group flex min-h-24 items-center justify-between gap-4 rounded-xl border p-4',
                violet
                    ? 'border-violet-100 bg-violet-50 hover:border-violet-200 dark:border-violet-900/60 dark:bg-violet-950/35'
                    : 'border-emerald-100 bg-emerald-50 hover:border-emerald-200 dark:border-emerald-900/60 dark:bg-emerald-950/30',
            )}
            style={
                {
                    '--tm-accent': violet ? '#7c3aed' : '#059669',
                } as CSSProperties
            }
        >
            <div className="min-w-0">
                <p
                    className={cn(
                        'text-sm font-semibold',
                        violet
                            ? 'text-violet-950 dark:text-violet-100'
                            : 'text-emerald-950 dark:text-emerald-100',
                    )}
                >
                    {title}
                </p>
                <p className="mt-1 max-w-44 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {description}
                </p>
            </div>
            <div
                className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm',
                    violet
                        ? 'bg-violet-600 dark:bg-violet-500'
                        : 'bg-emerald-600 dark:bg-emerald-500',
                )}
                style={{
                    boxShadow: violet
                        ? '0 8px 18px -6px rgba(124, 58, 237, 0.55)'
                        : '0 8px 18px -6px rgba(5, 150, 105, 0.55)',
                }}
            >
                <Icon className="size-5" />
            </div>
        </Link>
    );
}

function ActivityIcon({ type }: { type: string }) {
    let Icon = PencilLineIcon;
    let tone =
        'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300';

    if (type.includes('deleted') || type.includes('removed')) {
        Icon = Trash2Icon;
        tone =
            'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300';
    } else if (type.startsWith('teacher')) {
        Icon = UserPlusIcon;
        tone =
            'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300';
    } else if (type.includes('draft')) {
        Icon = FileClockIcon;
        tone =
            'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300';
    } else if (type.includes('generated')) {
        Icon = FilePlus2Icon;
        tone =
            'bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300';
    } else if (type.includes('saved')) {
        Icon = BookmarkCheckIcon;
        tone =
            'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300';
    }

    return (
        <div
            className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg',
                tone,
            )}
        >
            <Icon className="size-3.5" />
        </div>
    );
}

function SubjectDonut({
    items,
}: {
    items: Array<{ name: string; count: number; percentage: number }>;
}) {
    const segments = items.map((item, index) => ({
        item,
        index,
        offset: items
            .slice(0, index)
            .reduce((sum, previous) => sum + previous.percentage, 0),
    }));

    return (
        <div className="relative size-32 shrink-0">
            <svg
                className="size-full -rotate-90"
                viewBox="0 0 100 100"
                role="img"
                aria-label="Most used subjects"
            >
                <circle
                    cx="50"
                    cy="50"
                    r="36"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="15"
                    className="text-slate-100 dark:text-slate-800"
                />
                {segments.map(({ item, index, offset }) => (
                    <circle
                        key={item.name}
                        cx="50"
                        cy="50"
                        r="36"
                        pathLength="100"
                        fill="none"
                        stroke={SUBJECT_COLORS[index % SUBJECT_COLORS.length]}
                        strokeWidth="15"
                        strokeDasharray={`${item.percentage} ${100 - item.percentage}`}
                        strokeDashoffset={-offset}
                    />
                ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-slate-900 tabular-nums dark:text-slate-100">
                    {items.reduce((sum, item) => sum + item.count, 0)}
                </span>
                <span className="text-[9px] font-medium tracking-wide text-slate-400 uppercase">
                    papers
                </span>
            </div>
        </div>
    );
}

export default function CustomerDashboard({
    school,
    stats,
    patterns,
    activities,
    subject_usage: subjectUsage,
    permissions,
    announcements,
}: Props) {
    const [period, setPeriod] = useState<SubjectPeriod>('monthly');
    const subjects = subjectUsage[period];
    const logoUrl = assetUrl(school.logo);
    const statCards = [
        {
            label: 'Papers Generated',
            value: stats.papers_generated,
            detail: `${stats.drafts} draft${stats.drafts === 1 ? '' : 's'} in progress`,
            icon: FilePlus2Icon,
            tone: 'bg-violet-600 text-white',
            accent: '#7c3aed',
        },
        {
            label: 'Saved Papers',
            value: stats.saved_papers,
            detail: 'Ready to print or reuse',
            icon: BookmarkCheckIcon,
            tone: 'bg-emerald-600 text-white',
            accent: '#059669',
        },
        {
            label: 'Questions Used',
            value: stats.questions_used,
            detail: 'Across generated papers',
            icon: FileTextIcon,
            tone: 'bg-amber-500 text-white',
            accent: '#f59e0b',
        },
        {
            label: 'Active Teachers',
            value: stats.active_teachers,
            detail: `${stats.total_teachers} teacher${stats.total_teachers === 1 ? '' : 's'} total`,
            icon: UsersRoundIcon,
            tone: 'bg-sky-600 text-white',
            accent: '#0284c7',
        },
    ];

    return (
        <>
            <Head title="Dashboard" />
            <div className="w-full space-y-5">
                <PageHeader
                    className="hidden"
                    title="Dashboard"
                    meta={new Intl.DateTimeFormat(undefined, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                    }).format(new Date())}
                />

                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
                    <div className="min-w-0 space-y-5">
                        <Card
                            padding="none"
                            className="overflow-hidden border-brand-100 bg-brand-50 dark:border-brand-900/60 dark:bg-brand-950/25"
                        >
                            <div className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-5">
                                <div className="flex min-w-0 items-center justify-between gap-3 sm:gap-4">
                                    <div className="flex min-w-0 items-center gap-3.5">
                                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-white shadow-sm sm:size-14 dark:border-slate-700 dark:bg-slate-900">
                                            {logoUrl ? (
                                                <img
                                                    src={logoUrl}
                                                    alt={school.name}
                                                    className="size-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-sm font-bold text-brand-700 dark:text-brand-300">
                                                    {initials(school.name)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                <h2 className="truncate text-base font-semibold text-slate-950 sm:text-lg dark:text-white">
                                                    {school.name}
                                                </h2>
                                                <BadgeCheckIcon
                                                    className="size-4 shrink-0 fill-brand-600 text-white dark:fill-brand-500"
                                                    aria-label="Verified school"
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                <span className="font-normal">
                                                    Subscription Plan:
                                                </span>{' '}
                                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                    {school.plan_name}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex justify-center">
                                        <ProgressRing
                                            value={
                                                school.subscription_remaining_percent
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-3 border-t border-brand-100 pt-3 sm:grid-cols-4 sm:pt-4 dark:border-brand-900/60">
                                    <SchoolMetric
                                        icon={CalendarDaysIcon}
                                        label="Subscription Ends"
                                        value={formatDate(
                                            school.subscription_ends_at,
                                        )}
                                        tone="bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-200"
                                    />
                                    <SchoolMetric
                                        icon={Clock3Icon}
                                        label="Days Remaining"
                                        value={
                                            school.days_remaining === null
                                                ? '?'
                                                : `${school.days_remaining} days`
                                        }
                                        tone="bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                    />
                                    <SchoolMetric
                                        icon={UsersRoundIcon}
                                        label="Total Teachers"
                                        value={school.total_teachers}
                                        tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    />
                                    <SchoolMetric
                                        icon={SchoolIcon}
                                        label="Total Classes"
                                        value={school.total_classes}
                                        tone="bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                                    />
                                </div>
                            </div>
                        </Card>

                        {announcements.banner && (
                            <AnnouncementBanner
                                announcement={announcements.banner}
                            />
                        )}

                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            {statCards.map(
                                (
                                    {
                                        label,
                                        value,
                                        detail,
                                        icon: Icon,
                                        tone,
                                        accent,
                                    },
                                    index,
                                ) => (
                                    <Card
                                        key={label}
                                        padding="sm"
                                        interactive
                                        className="tm-appear min-w-0"
                                        style={
                                            {
                                                '--tm-accent': accent,
                                                animationDelay: `${index * 45}ms`,
                                            } as CSSProperties
                                        }
                                    >
                                        <div className="relative">
                                            <div
                                                className={cn(
                                                    'absolute top-0 right-0 flex size-9 items-center justify-center rounded-lg shadow-sm',
                                                    tone,
                                                )}
                                            >
                                                <Icon className="size-5" />
                                            </div>
                                            <div className="flex min-w-0 flex-col pr-12">
                                                <p className="order-2 mt-3 text-2xl leading-none font-bold tracking-tight text-slate-950 tabular-nums dark:text-white">
                                                    {value.toLocaleString()}
                                                </p>
                                                <p className="order-1 pt-0.5 text-xs leading-tight font-semibold break-words text-slate-600 dark:text-slate-300">
                                                    {label}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="hidden">{detail}</p>
                                    </Card>
                                ),
                            )}
                        </div>

                        <Card padding="md" className="overflow-hidden">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    Select Pattern / Syllabus
                                </h2>
                                <Button asChild variant="secondary" size="sm">
                                    <Link href="/papers/generate">
                                        View All Patterns
                                    </Link>
                                </Button>
                            </div>
                            {/* Pattern options remain in the same card body. */}

                            {patterns.length === 0 ? (
                                <div className="py-10 text-center">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                        No patterns available
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Your active plan does not include a
                                        pattern yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                                    {patterns.map((pattern, index) => {
                                        const PatternIcon = patternIcon(
                                            pattern.icon,
                                        );

                                        return (
                                            <Link
                                                key={pattern.id}
                                                href={`/papers/generate?pattern=${pattern.id}`}
                                                className="tm-lift tm-appear group flex min-h-32 flex-col rounded-xl p-4 text-white shadow-sm"
                                                style={
                                                    {
                                                        backgroundColor:
                                                            pattern.color,
                                                        '--tm-accent':
                                                            pattern.color,
                                                        animationDelay: `${index * 35}ms`,
                                                    } as CSSProperties
                                                }
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex size-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                                                        <PatternIcon className="size-5" />
                                                    </div>
                                                    <span className="flex size-7 items-center justify-center rounded-full bg-white text-slate-900 transition-transform duration-200 group-hover:translate-x-0.5">
                                                        <ArrowRightIcon className="size-3.5" />
                                                    </span>
                                                </div>
                                                <div className="mt-auto pt-4">
                                                    <p className="truncate text-sm font-semibold">
                                                        {pattern.name}
                                                    </p>
                                                    {pattern.description && (
                                                        <p className="mt-0.5 truncate text-[10px] text-white/75">
                                                            {
                                                                pattern.description
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </div>

                    <aside className="min-w-0 space-y-4">
                        {permissions.can_generate_papers && (
                            <ActionCard
                                href="/papers/generate"
                                title="Generate New Paper"
                                description="Create a new paper in just a few clicks"
                                icon={FilePlus2Icon}
                                tone="violet"
                            />
                        )}
                        {permissions.can_add_teacher && (
                            <ActionCard
                                href="/teachers/add"
                                title="Add New Teacher"
                                description="Invite and add a teacher to your school"
                                icon={UserPlusIcon}
                                tone="emerald"
                            />
                        )}

                        <LatestUpdatesCard updates={announcements.updates} />

                        <Card padding="none" className="overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3.5">
                                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    Recent Activity
                                </h2>
                                <Badge>{activities.length} latest</Badge>
                            </div>
                            {activities.length === 0 ? (
                                <div className="border-t border-slate-100 px-5 py-10 text-center dark:border-slate-800">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                        No activity yet
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        New paper and teacher activity will
                                        appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="border-t border-slate-100 px-4 py-1.5 dark:border-slate-800">
                                    {activities.map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="flex gap-3 py-2.5"
                                        >
                                            <ActivityIcon
                                                type={activity.type}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="line-clamp-2 text-xs leading-relaxed font-medium text-slate-700 dark:text-slate-200">
                                                    {activity.message}
                                                </p>
                                                <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                                                    {relativeTime(
                                                        activity.created_at,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>

                        <Card padding="none" className="overflow-visible">
                            <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
                                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    Most Used Subjects
                                </h2>
                                <Menu as="div" className="relative shrink-0">
                                    <MenuButton className="flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100">
                                        {PERIOD_LABELS[period]}
                                        <ChevronDownIcon className="size-3.5" />
                                    </MenuButton>
                                    <MenuItems
                                        transition
                                        anchor="bottom end"
                                        className="z-30 mt-1 w-32 origin-top-right rounded-lg border border-slate-200 bg-white p-1 shadow-lg transition duration-150 ease-out focus:outline-none data-closed:scale-95 data-closed:opacity-0 dark:border-slate-700 dark:bg-slate-900"
                                    >
                                        {(
                                            Object.keys(
                                                PERIOD_LABELS,
                                            ) as SubjectPeriod[]
                                        ).map((option) => (
                                            <MenuItem key={option}>
                                                {({ focus }) => (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setPeriod(option)
                                                        }
                                                        className={cn(
                                                            'flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300',
                                                            focus &&
                                                                'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white',
                                                        )}
                                                    >
                                                        {PERIOD_LABELS[option]}
                                                        {period === option && (
                                                            <CheckIcon className="size-3.5 text-brand-600 dark:text-brand-400" />
                                                        )}
                                                    </button>
                                                )}
                                            </MenuItem>
                                        ))}
                                    </MenuItems>
                                </Menu>
                            </div>

                            {subjects.length === 0 ? (
                                <div className="px-5 py-10 text-center">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                        No subject usage yet
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Saved papers in this period will build
                                        the chart.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4 px-4 pt-4 pb-5 sm:flex-row xl:flex-col 2xl:flex-row">
                                    <SubjectDonut items={subjects} />
                                    <div className="w-full min-w-0 flex-1 space-y-2.5">
                                        {subjects.map((subject, index) => (
                                            <div
                                                key={subject.name}
                                                className="flex min-w-0 items-center gap-2"
                                            >
                                                <span
                                                    className="size-2 shrink-0 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            SUBJECT_COLORS[
                                                                index %
                                                                    SUBJECT_COLORS.length
                                                            ],
                                                    }}
                                                />
                                                <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                                    {subject.name}
                                                </span>
                                                <span className="text-[11px] font-semibold text-slate-500 tabular-nums dark:text-slate-400">
                                                    {subject.percentage}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    </aside>
                </div>
            </div>
        </>
    );
}

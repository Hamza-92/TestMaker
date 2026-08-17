import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangleIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    CalendarDaysIcon,
    MegaphoneIcon,
    SparklesIcon,
    WrenchIcon,
} from 'lucide-react';
import type { ElementType } from 'react';
import { Badge, Button, Card, PageHeader } from '@/components/tm';
import { cn } from '@/lib/utils';

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
    details_url: string;
    published_at: string | null;
}

interface Props {
    announcements: Announcement[];
}

const TYPE_META: Record<
    AnnouncementType,
    { label: string; icon: ElementType; tone: string }
> = {
    feature: {
        label: 'New feature',
        icon: SparklesIcon,
        tone: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
    },
    update: {
        label: 'Product update',
        icon: MegaphoneIcon,
        tone: 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300',
    },
    maintenance: {
        label: 'Maintenance',
        icon: WrenchIcon,
        tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    },
    important: {
        label: 'Important',
        icon: AlertTriangleIcon,
        tone: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    },
    event: {
        label: 'Event',
        icon: CalendarDaysIcon,
        tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
};

function formatDate(value: string | null) {
    return value
        ? new Intl.DateTimeFormat(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
          }).format(new Date(value))
        : 'Recently';
}

export default function AnnouncementsPage({ announcements }: Props) {
    return (
        <>
            <Head title="News & Updates" />
            <div className="space-y-5">
                <PageHeader
                    title="News & Updates"
                    meta={`${announcements.length} published ${announcements.length === 1 ? 'update' : 'updates'}`}
                    actions={
                        <Button asChild variant="secondary">
                            <Link href="/dashboard">
                                <ArrowLeftIcon className="size-4" /> Dashboard
                            </Link>
                        </Button>
                    }
                />

                {announcements.length === 0 ? (
                    <Card className="py-16 text-center">
                        <MegaphoneIcon className="mx-auto size-8 text-slate-300 dark:text-slate-600" />
                        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                            No updates right now
                        </p>
                    </Card>
                ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {announcements.map((announcement) => {
                            const meta = TYPE_META[announcement.type];
                            const Icon = meta.icon;

                            return (
                                <Link
                                    key={announcement.id}
                                    href={announcement.details_url}
                                    className="group block"
                                >
                                    <Card
                                        interactive
                                        className="h-full transition-colors group-hover:border-brand-200 dark:group-hover:border-brand-800"
                                    >
                                        <div className="flex items-start gap-3.5">
                                            <div
                                                className={cn(
                                                    'flex size-10 shrink-0 items-center justify-center rounded-xl',
                                                    meta.tone,
                                                )}
                                            >
                                                <Icon className="size-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                        {announcement.title}
                                                    </h2>
                                                    <Badge>{meta.label}</Badge>
                                                </div>
                                                {announcement.summary && (
                                                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                                        {announcement.summary}
                                                    </p>
                                                )}
                                                <div className="mt-4 flex items-center justify-between gap-3 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                                    <span>
                                                        {formatDate(
                                                            announcement.published_at,
                                                        )}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 text-brand-600 transition-transform group-hover:translate-x-0.5 dark:text-brand-400">
                                                        Read update{' '}
                                                        <ArrowRightIcon className="size-3" />
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}

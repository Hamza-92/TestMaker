import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ArrowUpRightIcon,
    CalendarDaysIcon,
    MegaphoneIcon,
} from 'lucide-react';
import { Badge, Button, Card, PageHeader } from '@/components/tm';

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
    banner_direction: 'auto' | 'ltr' | 'rtl';
    banner_font: 'default' | 'urdu';
    action_label: string | null;
    action_url: string | null;
    published_at: string | null;
}

interface Props {
    announcement: Announcement;
}

const TYPE_LABELS: Record<AnnouncementType, string> = {
    feature: 'New feature',
    update: 'Product update',
    maintenance: 'Maintenance',
    important: 'Important',
    event: 'Event',
};

function isExternal(value: string) {
    return /^https?:\/\//i.test(value);
}

function formatDate(value: string | null) {
    return value
        ? new Intl.DateTimeFormat(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
          }).format(new Date(value))
        : 'Recently published';
}

export default function AnnouncementShow({ announcement }: Props) {
    const direction =
        announcement.banner_direction === 'auto'
            ? /[\u0590-\u08ff]/.test(announcement.title)
                ? 'rtl'
                : 'ltr'
            : announcement.banner_direction;
    const fontFamily =
        announcement.banner_font === 'urdu'
            ? '"Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif'
            : undefined;

    return (
        <>
            <Head title={announcement.title} />
            <div className="mx-auto max-w-4xl space-y-5">
                <PageHeader
                    title="News & Updates"
                    actions={
                        <Button asChild variant="secondary">
                            <Link href="/announcements">
                                <ArrowLeftIcon className="size-4" /> All updates
                            </Link>
                        </Button>
                    }
                />
                <Card className="overflow-hidden p-0">
                    <div
                        className="border-b border-brand-100 bg-brand-50/70 px-5 py-6 sm:px-8 sm:py-8 dark:border-brand-900/50 dark:bg-brand-950/20"
                        dir={direction}
                        style={{ fontFamily }}
                    >
                        <div className="flex items-center gap-2 text-xs font-semibold text-brand-700 dark:text-brand-300">
                            <MegaphoneIcon className="size-4" />
                            <Badge>{TYPE_LABELS[announcement.type]}</Badge>
                        </div>
                        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
                            {announcement.title}
                        </h1>
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <CalendarDaysIcon className="size-3.5" />{' '}
                            {formatDate(announcement.published_at)}
                        </div>
                    </div>
                    <div
                        className="space-y-6 px-5 py-6 sm:px-8 sm:py-8"
                        dir={direction}
                        style={{ fontFamily }}
                    >
                        {announcement.summary && (
                            <p className="text-base leading-relaxed font-medium text-slate-700 dark:text-slate-200">
                                {announcement.summary}
                            </p>
                        )}
                        {announcement.body && (
                            <div className="text-sm leading-7 whitespace-pre-wrap text-slate-600 dark:text-slate-300">
                                {announcement.body}
                            </div>
                        )}
                        {!announcement.summary && !announcement.body && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                No additional details were provided.
                            </p>
                        )}
                        {announcement.action_url &&
                            announcement.action_label &&
                            (isExternal(announcement.action_url) ? (
                                <a
                                    href={announcement.action_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                                >
                                    {announcement.action_label}
                                    <ArrowUpRightIcon className="size-4" />
                                </a>
                            ) : (
                                <Link
                                    href={announcement.action_url}
                                    className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                                >
                                    {announcement.action_label}
                                    <ArrowUpRightIcon className="size-4" />
                                </Link>
                            ))}
                    </div>
                </Card>
            </div>
        </>
    );
}

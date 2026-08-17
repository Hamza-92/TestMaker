import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangleIcon,
    CalendarDaysIcon,
    CheckCircle2Icon,
    Edit3Icon,
    MegaphoneIcon,
    MoreHorizontalIcon,
    PlusIcon,
    SparklesIcon,
    Trash2Icon,
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
type AnnouncementStatus = 'draft' | 'published' | 'archived';

interface Announcement {
    id: number;
    title: string;
    summary: string | null;
    body: string | null;
    type: AnnouncementType;
    placement: 'banner' | 'card' | 'both';
    status: AnnouncementStatus;
    action_label: string | null;
    action_url: string | null;
    starts_at: string | null;
    ends_at: string | null;
    published_at: string | null;
    is_dismissible: boolean;
    sort_order: number;
}

interface Props {
    announcements: Announcement[];
}

const TYPE_META: Record<
    AnnouncementType,
    { label: string; icon: ElementType; className: string }
> = {
    feature: {
        label: 'New feature',
        icon: SparklesIcon,
        className:
            'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
    },
    update: {
        label: 'Product update',
        icon: MegaphoneIcon,
        className:
            'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    },
    maintenance: {
        label: 'Maintenance',
        icon: WrenchIcon,
        className:
            'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    },
    important: {
        label: 'Important',
        icon: AlertTriangleIcon,
        className:
            'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    },
    event: {
        label: 'Event',
        icon: CalendarDaysIcon,
        className:
            'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
};

const STATUS_META: Record<
    AnnouncementStatus,
    { label: string; className: string }
> = {
    draft: {
        label: 'Draft',
        className:
            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    },
    published: {
        label: 'Published',
        className:
            'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
    archived: {
        label: 'Archived',
        className:
            'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    },
};

function formatDate(value: string | null) {
    if (!value) {
        return null;
    }

    return new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}

function scheduleLabel(announcement: Announcement) {
    const start = formatDate(announcement.starts_at);
    const end = formatDate(announcement.ends_at);

    if (start && end) {
        return `${start} – ${end}`;
    }

    if (start) {
        return `From ${start}`;
    }

    if (end) {
        return `Until ${end}`;
    }

    return 'Always active when published';
}

export default function AnnouncementsPage({ announcements }: Props) {
    const remove = (announcement: Announcement) => {
        if (!window.confirm(`Delete “${announcement.title}”?`)) {
            return;
        }

        router.delete(`/superadmin/announcements/${announcement.id}`);
    };

    return (
        <>
            <Head title="News & Updates" />
            <div className="w-full min-w-0 space-y-6 p-4 md:p-6">
                <PageHeader
                    title="News & Updates"
                    meta="Customer-facing product news and important updates"
                    actions={
                        <Button asChild>
                            <Link href="/superadmin/announcements/add">
                                <PlusIcon className="size-4" /> New announcement
                            </Link>
                        </Button>
                    }
                />

                <Card padding="none" className="overflow-hidden">
                    <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
                        <div>
                            <h2 className="text-sm font-semibold">
                                All announcements
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Published announcements appear on the customer
                                dashboard according to their placement and
                                schedule.
                            </p>
                        </div>
                        <Badge>{announcements.length} total</Badge>
                    </div>

                    {announcements.length === 0 ? (
                        <div className="px-5 py-16 text-center">
                            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <MegaphoneIcon className="size-6" />
                            </div>
                            <h3 className="mt-4 text-sm font-semibold">
                                No announcements yet
                            </h3>
                            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                                Create your first update to keep customers
                                informed about what is new.
                            </p>
                            <Button
                                asChild
                                variant="secondary"
                                className="mt-5"
                            >
                                <Link href="/superadmin/announcements/add">
                                    Create announcement
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {announcements.map((announcement) => {
                                const type = TYPE_META[announcement.type];
                                const status = STATUS_META[announcement.status];
                                const TypeIcon = type.icon;

                                return (
                                    <div
                                        key={announcement.id}
                                        className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                                    >
                                        <div className="flex min-w-0 items-start gap-3">
                                            <div
                                                className={cn(
                                                    'flex size-9 shrink-0 items-center justify-center rounded-xl',
                                                    type.className,
                                                )}
                                            >
                                                <TypeIcon className="size-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-sm font-semibold">
                                                        {announcement.title}
                                                    </h3>
                                                    <span
                                                        className={cn(
                                                            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                                            status.className,
                                                        )}
                                                    >
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                    {announcement.summary ||
                                                        announcement.body ||
                                                        'No summary provided.'}
                                                </p>
                                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                                                    <span>{type.label}</span>
                                                    <span>•</span>
                                                    <span>
                                                        {announcement.placement ===
                                                        'both'
                                                            ? 'Banner + updates'
                                                            : announcement.placement ===
                                                                'banner'
                                                              ? 'Banner'
                                                              : 'Updates card'}
                                                    </span>
                                                    <span>•</span>
                                                    <span>
                                                        {scheduleLabel(
                                                            announcement,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2 lg:pl-4">
                                            <Button
                                                asChild
                                                variant="secondary"
                                                size="sm"
                                            >
                                                <Link
                                                    href={`/superadmin/announcements/${announcement.id}/edit`}
                                                >
                                                    <Edit3Icon className="size-3.5" />{' '}
                                                    Edit
                                                </Link>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label={`Delete ${announcement.title}`}
                                                onClick={() =>
                                                    remove(announcement)
                                                }
                                            >
                                                <Trash2Icon className="size-4 text-destructive" />
                                            </Button>
                                            <MoreHorizontalIcon
                                                className="hidden size-4 text-muted-foreground sm:block"
                                                aria-hidden="true"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>

                <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
                    <div className="flex gap-2 rounded-xl border bg-muted/20 p-3">
                        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <span>
                            Use Published status to make an update visible.
                        </span>
                    </div>
                    <div className="flex gap-2 rounded-xl border bg-muted/20 p-3">
                        <CalendarDaysIcon className="mt-0.5 size-4 shrink-0 text-sky-600" />
                        <span>
                            Schedule a start and end date for time-sensitive
                            notices.
                        </span>
                    </div>
                    <div className="flex gap-2 rounded-xl border bg-muted/20 p-3">
                        <MegaphoneIcon className="mt-0.5 size-4 shrink-0 text-violet-600" />
                        <span>
                            Choose banner, updates card, or both placements.
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}

AnnouncementsPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'News & Updates' },
    ],
};

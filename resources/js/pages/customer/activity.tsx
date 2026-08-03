import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    FileTextIcon,
    HistoryIcon,
    PencilIcon,
    PlusIcon,
    SaveIcon,
    Trash2Icon,
    UserPlusIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Button,
    Card,
    EmptyState,
    PageHeader,
    Pagination,
    SearchInput,
    Tabs,
} from '@/components/tm';
import type { PageMeta, TabItem } from '@/components/tm';

type Category = 'all' | 'papers' | 'teachers';

interface Activity {
    id: string;
    type: string;
    category: 'papers' | 'teachers';
    label: string;
    action: string;
    message: string;
    created_at: string | null;
}

interface Props {
    items: PageMeta & { data: Activity[] };
    counts: { all: number; papers: number; teachers: number };
    filters?: { category?: Category; q?: string };
}

function relativeTime(value: string | null): string {
    if (!value) {
        return 'Just now';
    }

    const date = new Date(value);
    const seconds = Math.max(
        0,
        Math.floor((Date.now() - date.getTime()) / 1000),
    );

    if (seconds < 60) {
        return 'Just now';
    }

    if (seconds < 3600) {
        return Math.floor(seconds / 60) + ' min ago';
    }

    if (seconds < 86400) {
        return Math.floor(seconds / 3600) + ' hr ago';
    }

    if (seconds < 604800) {
        return Math.floor(seconds / 86400) + ' days ago';
    }

    return date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        ...(date.getFullYear() === new Date().getFullYear()
            ? {}
            : { year: 'numeric' }),
    });
}

function eventStyle(activity: Activity) {
    if (activity.category === 'teachers') {
        if (activity.action === 'removed') {
            return {
                icon: Trash2Icon,
                tone: 'danger' as const,
                surface:
                    'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
            };
        }

        return {
            icon: UserPlusIcon,
            tone: 'saved' as const,
            surface:
                'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
        };
    }

    if (activity.action === 'deleted') {
        return {
            icon: Trash2Icon,
            tone: 'danger' as const,
            surface:
                'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
        };
    }

    if (activity.action === 'drafted') {
        return {
            icon: SaveIcon,
            tone: 'draft' as const,
            surface:
                'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
        };
    }

    if (activity.action === 'generated') {
        return {
            icon: PlusIcon,
            tone: 'info' as const,
            surface:
                'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300',
        };
    }

    if (activity.action === 'updated') {
        return {
            icon: PencilIcon,
            tone: 'neutral' as const,
            surface:
                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        };
    }

    return {
        icon: FileTextIcon,
        tone: 'saved' as const,
        surface:
            'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
    };
}

export default function ActivityPage({ items, counts, filters }: Props) {
    const category = filters?.category ?? 'all';
    const [search, setSearch] = useState(filters?.q ?? '');

    const tabs = useMemo<TabItem<Category>[]>(
        () => [
            { value: 'all', label: 'All activity', count: counts.all },
            { value: 'papers', label: 'Papers', count: counts.papers },
            { value: 'teachers', label: 'Teachers', count: counts.teachers },
        ],
        [counts],
    );

    const navigate = useCallback(
        (nextCategory: Category, nextSearch = search, page = 1) => {
            const query: Record<string, string> = {};

            if (nextCategory !== 'all') {
                query.category = nextCategory;
            }

            if (nextSearch.trim()) {
                query.q = nextSearch.trim();
            }

            if (page > 1) {
                query.page = String(page);
            }

            router.get('/customer/activity', query, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        },
        [search],
    );

    useEffect(() => {
        const handle = window.setTimeout(() => {
            if (search !== (filters?.q ?? '')) {
                navigate(category, search, 1);
            }
        }, 300);

        return () => window.clearTimeout(handle);
    }, [search, filters?.q, category, navigate]);

    return (
        <>
            <Head title="Activity Log" />

            <div className="space-y-5">
                <PageHeader
                    title="Activity Log"
                    meta={
                        items.total +
                        ' recorded ' +
                        (items.total === 1 ? 'event' : 'events')
                    }
                    actions={
                        <Button asChild>
                            <Link href="/dashboard">
                                <ArrowLeftIcon />
                                Dashboard
                            </Link>
                        </Button>
                    }
                />

                <Card
                    padding="sm"
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                    <Tabs
                        items={tabs}
                        value={category}
                        onChange={(value) => navigate(value, search)}
                    />
                    <SearchInput
                        value={search}
                        onValueChange={setSearch}
                        placeholder="Search activity"
                        aria-label="Search activity"
                        className="w-full sm:w-64"
                    />
                </Card>

                {items.data.length === 0 ? (
                    <EmptyState
                        icon={HistoryIcon}
                        title={
                            search || category !== 'all'
                                ? 'No matching activity'
                                : 'No activity yet'
                        }
                        hint={
                            search || category !== 'all'
                                ? 'Try another search or view all activity.'
                                : 'Paper and teacher actions will appear here as they happen.'
                        }
                        action={
                            search || category !== 'all' ? (
                                <Button
                                    onClick={() => {
                                        setSearch('');
                                        navigate('all', '');
                                    }}
                                >
                                    Clear filters
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <>
                        <Card padding="none" className="overflow-hidden">
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {items.data.map((activity) => {
                                    const style = eventStyle(activity);
                                    const Icon = style.icon;

                                    return (
                                        <div
                                            key={activity.id}
                                            className="flex items-start gap-3 p-4 transition-colors hover:bg-slate-50/70 sm:gap-4 sm:px-5 dark:hover:bg-slate-800/40"
                                        >
                                            <div
                                                className={
                                                    'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ' +
                                                    style.surface
                                                }
                                            >
                                                <Icon className="size-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                    {activity.message}
                                                </p>
                                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                                    <Badge tone={style.tone}>
                                                        {activity.label}
                                                    </Badge>
                                                    <span className="text-xs text-slate-400 dark:text-slate-500">
                                                        {relativeTime(
                                                            activity.created_at,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                        <Pagination
                            meta={items}
                            onPageChange={(page) =>
                                navigate(category, search, page)
                            }
                            label="events"
                        />
                    </>
                )}
            </div>
        </>
    );
}

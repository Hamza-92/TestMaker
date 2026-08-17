import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeftIcon, EyeIcon, MegaphoneIcon, SaveIcon } from 'lucide-react';
import { Button, Card, PageHeader } from '@/components/tm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    is_dismissible: boolean;
    sort_order: number;
}

interface Props {
    announcement: Announcement | null;
}
interface FormData {
    title: string;
    summary: string;
    body: string;
    type: AnnouncementType;
    placement: 'banner' | 'card' | 'both';
    status: AnnouncementStatus;
    action_label: string;
    action_url: string;
    starts_at: string;
    ends_at: string;
    is_dismissible: boolean;
    sort_order: number;
    [key: string]: string | number | boolean;
}

function dateInput(value: string | null) {
    return value ? value.slice(0, 16) : '';
}

export default function AnnouncementForm({ announcement }: Props) {
    const editing = announcement !== null;
    const { data, setData, post, put, processing, errors } = useForm<FormData>({
        title: announcement?.title ?? '',
        summary: announcement?.summary ?? '',
        body: announcement?.body ?? '',
        type: announcement?.type ?? 'update',
        placement: announcement?.placement ?? 'both',
        status: announcement?.status ?? 'draft',
        action_label: announcement?.action_label ?? '',
        action_url: announcement?.action_url ?? '',
        starts_at: dateInput(announcement?.starts_at ?? null),
        ends_at: dateInput(announcement?.ends_at ?? null),
        is_dismissible: announcement?.is_dismissible ?? true,
        sort_order: announcement?.sort_order ?? 0,
    });

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        if (editing) {
            put(`/superadmin/announcements/${announcement.id}`);
        } else {
            post('/superadmin/announcements');
        }
    };

    const fieldError = (field: string) => errors[field as keyof typeof errors];

    return (
        <>
            <Head title={editing ? 'Edit Announcement' : 'New Announcement'} />
            <div className="w-full min-w-0 space-y-6 p-4 md:p-6">
                <PageHeader
                    title={editing ? 'Edit announcement' : 'New announcement'}
                    meta="Create a clear, concise customer-facing update"
                    actions={
                        <Button asChild variant="secondary">
                            <Link href="/superadmin/announcements">
                                <ArrowLeftIcon className="size-4" /> Back
                            </Link>
                        </Button>
                    }
                />

                <form
                    onSubmit={submit}
                    className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]"
                >
                    <Card className="space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <MegaphoneIcon className="size-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold">
                                    Announcement content
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Keep the title short and put the most useful
                                    detail in the summary.
                                </p>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="title">
                                Title{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="title"
                                value={data.title}
                                maxLength={150}
                                onChange={(e) =>
                                    setData('title', e.target.value)
                                }
                                placeholder="e.g. New paper templates are now available"
                            />
                            {fieldError('title') && (
                                <p className="text-xs text-destructive">
                                    {fieldError('title')}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="summary">Summary</Label>
                            <textarea
                                className="min-h-20 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                id="summary"
                                value={data.summary}
                                maxLength={500}
                                rows={3}
                                onChange={(e) =>
                                    setData('summary', e.target.value)
                                }
                                placeholder="A short sentence shown in the dashboard banner and updates card."
                            />
                            {fieldError('summary') && (
                                <p className="text-xs text-destructive">
                                    {fieldError('summary')}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="body">Details</Label>
                            <textarea
                                className="min-h-20 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                id="body"
                                value={data.body}
                                maxLength={5000}
                                rows={7}
                                onChange={(e) =>
                                    setData('body', e.target.value)
                                }
                                placeholder="Optional extra context. Keep it plain text and easy to scan."
                            />
                            {fieldError('body') && (
                                <p className="text-xs text-destructive">
                                    {fieldError('body')}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="action_label">
                                    Button label
                                </Label>
                                <Input
                                    id="action_label"
                                    value={data.action_label}
                                    maxLength={50}
                                    onChange={(e) =>
                                        setData('action_label', e.target.value)
                                    }
                                    placeholder="Learn more"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="action_url">Button link</Label>
                                <Input
                                    id="action_url"
                                    value={data.action_url}
                                    onChange={(e) =>
                                        setData('action_url', e.target.value)
                                    }
                                    placeholder="/papers or https://…"
                                />
                                {fieldError('action_url') && (
                                    <p className="text-xs text-destructive">
                                        {fieldError('action_url')}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>

                    <div className="space-y-5">
                        <Card className="space-y-5">
                            <div>
                                <h2 className="text-sm font-semibold">
                                    Publishing
                                </h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Control where and when customers see this
                                    update.
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="type">Update type</Label>
                                <select
                                    id="type"
                                    value={data.type}
                                    onChange={(e) =>
                                        setData(
                                            'type',
                                            e.target.value as AnnouncementType,
                                        )
                                    }
                                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                                >
                                    <option value="update">
                                        Product update
                                    </option>
                                    <option value="feature">New feature</option>
                                    <option value="maintenance">
                                        Maintenance
                                    </option>
                                    <option value="important">
                                        Important notice
                                    </option>
                                    <option value="event">Event</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="placement">Placement</Label>
                                <select
                                    id="placement"
                                    value={data.placement}
                                    onChange={(e) =>
                                        setData(
                                            'placement',
                                            e.target
                                                .value as FormData['placement'],
                                        )
                                    }
                                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                                >
                                    <option value="both">
                                        Banner + updates card
                                    </option>
                                    <option value="banner">
                                        Dashboard banner only
                                    </option>
                                    <option value="card">
                                        Updates card only
                                    </option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="status">Status</Label>
                                <select
                                    id="status"
                                    value={data.status}
                                    onChange={(e) =>
                                        setData(
                                            'status',
                                            e.target
                                                .value as AnnouncementStatus,
                                        )
                                    }
                                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="starts_at">Starts at</Label>
                                    <Input
                                        id="starts_at"
                                        type="datetime-local"
                                        value={data.starts_at}
                                        onChange={(e) =>
                                            setData('starts_at', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="ends_at">Ends at</Label>
                                    <Input
                                        id="ends_at"
                                        type="datetime-local"
                                        value={data.ends_at}
                                        onChange={(e) =>
                                            setData('ends_at', e.target.value)
                                        }
                                    />
                                    {fieldError('ends_at') && (
                                        <p className="text-xs text-destructive">
                                            {fieldError('ends_at')}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="sort_order">Priority</Label>
                                    <Input
                                        id="sort_order"
                                        type="number"
                                        min={0}
                                        max={9999}
                                        value={data.sort_order}
                                        onChange={(e) =>
                                            setData(
                                                'sort_order',
                                                Number(e.target.value),
                                            )
                                        }
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Higher values appear first.
                                    </p>
                                </div>
                                <label className="flex items-center gap-2 pt-6 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={data.is_dismissible}
                                        onChange={(e) =>
                                            setData(
                                                'is_dismissible',
                                                e.target.checked,
                                            )
                                        }
                                        className="size-4 rounded border-input"
                                    />{' '}
                                    Allow customers to dismiss
                                </label>
                            </div>
                        </Card>
                        <Card
                            className="overflow-hidden bg-muted/20"
                            padding="none"
                        >
                            <div className="flex items-center gap-2 border-b px-4 py-3">
                                <EyeIcon className="size-4 text-muted-foreground" />
                                <h2 className="text-sm font-semibold">
                                    Preview
                                </h2>
                            </div>
                            <div className="p-4">
                                <div
                                    className={cn(
                                        'rounded-xl border p-4',
                                        data.type === 'important'
                                            ? 'border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/20'
                                            : 'border-primary/20 bg-primary/5',
                                    )}
                                >
                                    <p className="text-sm font-semibold">
                                        {data.title ||
                                            'Your announcement title'}
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                        {data.summary ||
                                            'Your short summary will appear here.'}
                                    </p>
                                    {data.action_label && (
                                        <span className="mt-3 inline-flex rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">
                                            {data.action_label}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>
                    <div className="flex justify-end gap-3 xl:col-span-2">
                        <Button asChild type="button" variant="secondary">
                            <Link href="/superadmin/announcements">Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <SaveIcon className="size-4" />
                            {processing
                                ? 'Saving…'
                                : editing
                                  ? 'Save changes'
                                  : 'Create announcement'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

AnnouncementForm.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'News & Updates', href: '/superadmin/announcements' },
        { title: 'Announcement' },
    ],
};

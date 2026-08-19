import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CalendarClockIcon,
    EyeIcon,
    MegaphoneIcon,
    SaveIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { Button, Card, PageHeader } from '@/components/tm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    banner_style: 'standard' | 'ticker';
    banner_direction: 'auto' | 'ltr' | 'rtl';
    banner_font: 'default' | 'urdu';
    banner_background: string | null;
    banner_text_color: string | null;
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
    banner_style: 'standard' | 'ticker';
    banner_direction: 'auto' | 'ltr' | 'rtl';
    banner_font: 'default' | 'urdu';
    banner_background: string;
    banner_text_color: string;
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

function openDatePicker(id: string) {
    const input = document.getElementById(id) as
        | (HTMLInputElement & {
              showPicker?: () => void;
          })
        | null;

    if (input?.showPicker) {
        input.showPicker();
    } else {
        input?.focus();
    }
}
export default function AnnouncementForm({ announcement }: Props) {
    const editing = announcement !== null;
    const { data, setData, post, put, processing, errors } = useForm<FormData>({
        title: announcement?.title ?? '',
        summary: announcement?.summary ?? '',
        body: announcement?.body ?? '',
        type: announcement?.type ?? 'update',
        placement: announcement?.placement ?? 'both',
        banner_style: announcement?.banner_style ?? 'standard',
        banner_direction: announcement?.banner_direction ?? 'auto',
        banner_font: announcement?.banner_font ?? 'default',
        banner_background: announcement?.banner_background ?? '#eff6ff',
        banner_text_color: announcement?.banner_text_color ?? '#0f172a',
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
    const previewStyle: CSSProperties = {
        direction: data.banner_direction === 'rtl' ? 'rtl' : 'ltr',
        fontFamily:
            data.banner_font === 'urdu'
                ? '"Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif'
                : undefined,
        ...(data.banner_background
            ? { backgroundColor: data.banner_background }
            : {}),
        ...(data.banner_text_color ? { color: data.banner_text_color } : {}),
    };

    return (
        <>
            <Head title={editing ? 'Edit Announcement' : 'New Announcement'} />
            <div className="w-full min-w-0 space-y-6 p-4 md:p-6">
                <PageHeader
                    title={editing ? 'Edit announcement' : 'New announcement'}
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
                    className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_28rem]"
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
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="type">Update type</Label>
                                <Select
                                    value={data.type}
                                    onValueChange={(value) =>
                                        setData(
                                            'type',
                                            value as AnnouncementType,
                                        )
                                    }
                                >
                                    <SelectTrigger id="type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="update">
                                            Product update
                                        </SelectItem>
                                        <SelectItem value="feature">
                                            New feature
                                        </SelectItem>
                                        <SelectItem value="maintenance">
                                            Maintenance
                                        </SelectItem>
                                        <SelectItem value="important">
                                            Important notice
                                        </SelectItem>
                                        <SelectItem value="event">
                                            Event
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="placement">Placement</Label>
                                <Select
                                    value={data.placement}
                                    onValueChange={(value) =>
                                        setData(
                                            'placement',
                                            value as FormData['placement'],
                                        )
                                    }
                                >
                                    <SelectTrigger id="placement">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="both">
                                            Banner + updates card
                                        </SelectItem>
                                        <SelectItem value="banner">
                                            Dashboard banner only
                                        </SelectItem>
                                        <SelectItem value="card">
                                            Updates card only
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={data.status}
                                    onValueChange={(value) =>
                                        setData(
                                            'status',
                                            value as AnnouncementStatus,
                                        )
                                    }
                                >
                                    <SelectTrigger id="status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">
                                            Draft
                                        </SelectItem>
                                        <SelectItem value="published">
                                            Published
                                        </SelectItem>
                                        <SelectItem value="archived">
                                            Archived
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="starts_at">Starts at</Label>
                                    <div className="relative">
                                        <Input
                                            id="starts_at"
                                            type="datetime-local"
                                            value={data.starts_at}
                                            onChange={(e) =>
                                                setData(
                                                    'starts_at',
                                                    e.target.value,
                                                )
                                            }
                                            onClick={() =>
                                                openDatePicker('starts_at')
                                            }
                                            className="pr-10 [color-scheme:light] dark:[color-scheme:dark]"
                                        />
                                        <button
                                            type="button"
                                            aria-label="Open start date picker"
                                            onClick={() =>
                                                openDatePicker('starts_at')
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                        >
                                            <CalendarClockIcon className="size-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="ends_at">Ends at</Label>
                                    <div className="relative">
                                        <Input
                                            id="ends_at"
                                            type="datetime-local"
                                            value={data.ends_at}
                                            onChange={(e) =>
                                                setData(
                                                    'ends_at',
                                                    e.target.value,
                                                )
                                            }
                                            onClick={() =>
                                                openDatePicker('ends_at')
                                            }
                                            className="pr-10 [color-scheme:light] dark:[color-scheme:dark]"
                                        />
                                        <button
                                            type="button"
                                            aria-label="Open end date picker"
                                            onClick={() =>
                                                openDatePicker('ends_at')
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                        >
                                            <CalendarClockIcon className="size-4" />
                                        </button>
                                    </div>
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
                        <Card className="space-y-5">
                            <div>
                                <h2 className="text-sm font-semibold">
                                    Banner appearance
                                </h2>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="banner_style">
                                        Banner style
                                    </Label>
                                    <Select
                                        value={data.banner_style}
                                        onValueChange={(value) =>
                                            setData(
                                                'banner_style',
                                                value as FormData['banner_style'],
                                            )
                                        }
                                    >
                                        <SelectTrigger id="banner_style">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standard">
                                                Standard banner
                                            </SelectItem>
                                            <SelectItem value="ticker">
                                                Looping ticker
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="banner_direction">
                                        Text direction
                                    </Label>
                                    <Select
                                        value={data.banner_direction}
                                        onValueChange={(value) =>
                                            setData(
                                                'banner_direction',
                                                value as FormData['banner_direction'],
                                            )
                                        }
                                    >
                                        <SelectTrigger id="banner_direction">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="auto">
                                                Auto detect
                                            </SelectItem>
                                            <SelectItem value="ltr">
                                                Left to right
                                            </SelectItem>
                                            <SelectItem value="rtl">
                                                Right to left (Urdu)
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="banner_font">
                                        Banner font
                                    </Label>
                                    <Select
                                        value={data.banner_font}
                                        onValueChange={(value) =>
                                            setData(
                                                'banner_font',
                                                value as FormData['banner_font'],
                                            )
                                        }
                                    >
                                        <SelectTrigger id="banner_font">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default">
                                                Default app font
                                            </SelectItem>
                                            <SelectItem value="urdu">
                                                Urdu Nastaleeq
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="banner_background">
                                        Background color
                                    </Label>
                                    <Input
                                        id="banner_background"
                                        type="color"
                                        value={data.banner_background}
                                        onChange={(event) =>
                                            setData(
                                                'banner_background',
                                                event.target.value,
                                            )
                                        }
                                        className="h-10 cursor-pointer p-1"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="banner_text_color">
                                        Text color
                                    </Label>
                                    <Input
                                        id="banner_text_color"
                                        type="color"
                                        value={data.banner_text_color}
                                        onChange={(event) =>
                                            setData(
                                                'banner_text_color',
                                                event.target.value,
                                            )
                                        }
                                        className="h-10 cursor-pointer p-1"
                                    />
                                </div>
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
                                    style={previewStyle}
                                    dir={previewStyle.direction}
                                >
                                    <p className="text-sm font-semibold">
                                        {data.title ||
                                            'Your announcement title'}
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed opacity-70">
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

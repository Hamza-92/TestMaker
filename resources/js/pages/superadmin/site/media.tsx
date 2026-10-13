import { Head, router } from '@inertiajs/react';
import { ImagePlus, Pencil, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import SiteSectionNav from '@/components/site-section-nav';
import { Button, Card, Input, PageHeader, SearchInput } from '@/components/tm';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { SiteMediaItem } from '@/types/site-cms';

interface MediaRow extends SiteMediaItem {
    inUse: boolean;
    byte_size: number;
}

interface Props {
    media: MediaRow[];
    canEdit: boolean;
}

export default function SiteMedia({ media, canEdit }: Props) {
    const [search, setSearch] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [altText, setAltText] = useState('');
    const [caption, setCaption] = useState('');
    const [selected, setSelected] = useState<MediaRow | null>(null);
    const [editAlt, setEditAlt] = useState('');
    const [editCaption, setEditCaption] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const previewUrl = useMemo(
        () => (file ? URL.createObjectURL(file) : null),
        [file],
    );

    useEffect(
        () => () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        },
        [previewUrl],
    );

    const filtered = useMemo(() => {
        const query = search.toLowerCase().trim();

        return media.filter((item) =>
            `${item.name} ${item.alt_text} ${item.caption ?? ''}`
                .toLowerCase()
                .includes(query),
        );
    }, [media, search]);

    function upload(event: React.FormEvent) {
        event.preventDefault();

        if (!file) {
            return;
        }

        setProcessing(true);
        setErrors({});
        router.post(
            '/superadmin/site/media',
            { image: file, alt_text: altText, caption },
            {
                forceFormData: true,
                preserveState: 'errors',
                onSuccess: () => {
                    setFile(null);
                    setAltText('');
                    setCaption('');
                },
                onError: (nextErrors) => setErrors(nextErrors),
                onFinish: () => setProcessing(false),
            },
        );
    }

    function openEdit(item: MediaRow) {
        setSelected(item);
        setEditAlt(item.alt_text);
        setEditCaption(item.caption ?? '');
        setErrors({});
    }

    function saveDetails(event: React.FormEvent) {
        event.preventDefault();

        if (!selected) {
            return;
        }

        setProcessing(true);
        setErrors({});
        router.put(
            `/superadmin/site/media/${selected.id}`,
            { alt_text: editAlt, caption: editCaption },
            {
                preserveState: 'errors',
                onSuccess: () => setSelected(null),
                onError: (nextErrors) => setErrors(nextErrors),
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <>
            <Head title="Media Library · Public Website" />
            <div className="space-y-6 p-4 md:p-6">
                <PageHeader
                    title="Media Library"
                    meta={`${media.length} images`}
                />
                <SiteSectionNav />
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-4">
                        <SearchInput
                            value={search}
                            onValueChange={setSearch}
                            placeholder="Search images"
                            aria-label="Search images"
                            className="max-w-sm"
                        />
                        {filtered.length === 0 ? (
                            <Card className="py-16 text-center text-sm text-slate-500">
                                No images found.
                            </Card>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {filtered.map((item) => (
                                    <Card
                                        key={item.id}
                                        padding="none"
                                        className="overflow-hidden"
                                    >
                                        <img
                                            src={item.url}
                                            alt={item.alt_text}
                                            loading="lazy"
                                            className="aspect-[4/3] w-full bg-slate-100 object-cover"
                                        />
                                        <div className="space-y-2 p-4">
                                            <p className="truncate text-sm font-semibold text-slate-900">
                                                {item.name}
                                            </p>
                                            <p className="line-clamp-2 min-h-9 text-xs text-slate-500">
                                                {item.alt_text}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-slate-400">
                                                    {Math.round(
                                                        item.byte_size / 1024,
                                                    )}{' '}
                                                    KB
                                                </span>
                                                {canEdit && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            openEdit(item)
                                                        }
                                                    >
                                                        <Pencil />
                                                        Edit
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                    {canEdit && (
                        <Card className="h-fit space-y-4 xl:sticky xl:top-6">
                            <div className="flex items-center gap-2">
                                <ImagePlus className="size-5 text-brand-600" />
                                <h2 className="font-semibold text-slate-900">
                                    Add image
                                </h2>
                            </div>
                            <form onSubmit={upload} className="space-y-4">
                                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-center hover:border-brand-300">
                                    {previewUrl ? (
                                        <img
                                            src={previewUrl}
                                            alt="Selected image preview"
                                            className="max-h-36 rounded-lg object-contain"
                                        />
                                    ) : (
                                        <UploadCloud className="size-7 text-slate-400" />
                                    )}
                                    <span className="text-sm font-medium text-slate-700">
                                        {file?.name ??
                                            'Choose a JPG, PNG, or WebP image'}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Up to 2 MB
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="sr-only"
                                        onChange={(event) =>
                                            setFile(
                                                event.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                </label>
                                {errors.image && (
                                    <p className="text-xs text-rose-600">
                                        {errors.image}
                                    </p>
                                )}
                                <div className="space-y-1.5">
                                    <Label htmlFor="media-alt">Alt text</Label>
                                    <Input
                                        id="media-alt"
                                        value={altText}
                                        onChange={(event) =>
                                            setAltText(event.target.value)
                                        }
                                        placeholder="Describe what the image shows"
                                    />
                                    {errors.alt_text && (
                                        <p className="text-xs text-rose-600">
                                            {errors.alt_text}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="media-caption">
                                        Caption
                                    </Label>
                                    <Input
                                        id="media-caption"
                                        value={caption}
                                        onChange={(event) =>
                                            setCaption(event.target.value)
                                        }
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full"
                                    disabled={processing || !file}
                                >
                                    Upload image
                                </Button>
                            </form>
                        </Card>
                    )}
                </div>
            </div>
            <Dialog
                open={selected !== null}
                onOpenChange={(open) => !open && setSelected(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Image details</DialogTitle>
                        <DialogDescription>
                            Alt text helps visitors who use screen readers
                            understand the image.
                        </DialogDescription>
                    </DialogHeader>
                    {selected && (
                        <form onSubmit={saveDetails} className="space-y-4">
                            <img
                                src={selected.url}
                                alt={selected.alt_text}
                                className="max-h-56 w-full rounded-lg bg-slate-50 object-contain"
                            />
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-media-alt">Alt text</Label>
                                <Input
                                    id="edit-media-alt"
                                    value={editAlt}
                                    onChange={(event) =>
                                        setEditAlt(event.target.value)
                                    }
                                />
                                {errors.alt_text && (
                                    <p className="text-xs text-rose-600">
                                        {errors.alt_text}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-media-caption">
                                    Caption
                                </Label>
                                <Input
                                    id="edit-media-caption"
                                    value={editCaption}
                                    onChange={(event) =>
                                        setEditCaption(event.target.value)
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-rose-600"
                                    disabled={processing || selected.inUse}
                                    title={
                                        selected.inUse
                                            ? 'Remove this image from pages before deleting it'
                                            : undefined
                                    }
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                'Delete this image from the media library?',
                                            )
                                        ) {
                                            router.delete(
                                                `/superadmin/site/media/${selected.id}`,
                                                {
                                                    onSuccess: () =>
                                                        setSelected(null),
                                                },
                                            );
                                        }
                                    }}
                                >
                                    <Trash2 />
                                    Delete
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={processing}
                                >
                                    Save details
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

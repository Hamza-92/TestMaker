import type { FormDataConvertible } from '@inertiajs/core';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    Eye,
    Plus,
    RotateCcw,
    Save,
    Send,
    Trash2,
} from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import SiteSectionNav from '@/components/site-section-nav';
import { Button, Card, Input, PageHeader, Tabs } from '@/components/tm';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type {
    SiteContentSection,
    SiteMediaItem,
    SitePageContent,
} from '@/types/site-cms';

const SiteRichEditor = lazy(() => import('@/components/site-rich-editor'));

interface Props {
    page: { id: number; slug: string };
    content: SitePageContent;
    version: number;
    publishedAt: string | null;
    revisions: Array<{ id: number; number: number; created_at: string }>;
    media: SiteMediaItem[];
    canEdit: boolean;
}

type SectionType = SiteContentSection['type'];
type Panel = 'content' | 'seo' | 'history';

const sectionLabels: Record<SectionType, string> = {
    text: 'Text',
    gallery: 'Gallery',
    cta: 'Call to action',
    columns: 'Columns',
};

function Field({
    label,
    value,
    onChange,
    multiline = false,
    disabled = false,
    hint,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    multiline?: boolean;
    disabled?: boolean;
    hint?: string;
}) {
    return (
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            <span>{label}</span>
            {multiline ? (
                <textarea
                    className="flex min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    disabled={disabled}
                    rows={3}
                />
            ) : (
                <Input
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    disabled={disabled}
                />
            )}
            {hint && (
                <span className="block text-xs font-normal text-slate-500">
                    {hint}
                </span>
            )}
        </label>
    );
}

export default function SitePageEditor(props: Props) {
    return (
        <SitePageEditorInner
            key={`${props.page.id}:${props.version}`}
            {...props}
        />
    );
}

function SitePageEditorInner({
    page,
    content: initialContent,
    version,
    publishedAt,
    revisions,
    media,
    canEdit,
}: Props) {
    const [content, setContent] = useState(initialContent);
    const [slug, setSlug] = useState(page.slug);
    const [panel, setPanel] = useState<Panel>('content');
    const [selectedId, setSelectedId] = useState<string | null>(
        initialContent.sections[0]?.id ?? null,
    );
    const [columnIndex, setColumnIndex] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const dirty =
        JSON.stringify(content) !== JSON.stringify(initialContent) ||
        slug !== page.slug;
    const selected = content.sections.find(
        (section) => section.id === selectedId,
    );

    function patchHero(patch: Partial<SitePageContent['hero']>) {
        setContent((current) => ({
            ...current,
            hero: { ...current.hero, ...patch },
        }));
    }

    function patchSection(id: string, patch: Partial<SiteContentSection>) {
        setContent((current) => ({
            ...current,
            sections: current.sections.map((section) =>
                section.id === id ? { ...section, ...patch } : section,
            ),
        }));
    }

    function patchColumn(sectionId: string, columnId: string, body: string) {
        setContent((current) => ({
            ...current,
            sections: current.sections.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          columns: (section.columns ?? []).map((column) =>
                              column.id === columnId
                                  ? { ...column, body }
                                  : column,
                          ),
                      }
                    : section,
            ),
        }));
    }

    function addSection(type: SectionType) {
        const id = crypto.randomUUID();
        setContent((current) => ({
            ...current,
            sections: [
                ...current.sections,
                {
                    id,
                    type,
                    title: sectionLabels[type],
                    body: '',
                    image_ids: [],
                    columns:
                        type === 'columns'
                            ? [
                                  { id: crypto.randomUUID(), body: '' },
                                  { id: crypto.randomUUID(), body: '' },
                              ]
                            : [],
                    button_label: '',
                    button_url: '',
                    visible: true,
                },
            ],
        }));
        setSelectedId(id);
        setColumnIndex(0);
        setPanel('content');
    }

    function moveSection(id: string, direction: -1 | 1) {
        setContent((current) => {
            const sections = [...current.sections];
            const index = sections.findIndex((section) => section.id === id);
            const next = index + direction;

            if (index < 0 || next < 0 || next >= sections.length) {
                return current;
            }

            [sections[index], sections[next]] = [
                sections[next],
                sections[index],
            ];

            return { ...current, sections };
        });
    }

    function removeSection(id: string) {
        if (!window.confirm('Remove this section from the draft?')) {
            return;
        }

        setContent((current) => ({
            ...current,
            sections: current.sections.filter((section) => section.id !== id),
        }));
        setSelectedId(null);
    }

    function save(publish: boolean) {
        if (!canEdit || processing) {
            return;
        }

        setProcessing(true);
        setErrors({});
        router.put(
            `/superadmin/site/pages/${page.id}`,
            {
                slug,
                version,
                publish,
                content: content as unknown as FormDataConvertible,
            },
            {
                preserveScroll: true,
                onError: setErrors,
                onFinish: () => setProcessing(false),
            },
        );
    }

    function restore(revisionId: number) {
        if (!window.confirm('Restore this published version to the draft?')) {
            return;
        }

        router.post(
            `/superadmin/site/pages/${page.id}/revisions/${revisionId}/restore`,
            { version },
            { onError: setErrors },
        );
    }

    function unpublish() {
        if (!window.confirm('Take this page offline?')) {
            return;
        }

        router.post(
            `/superadmin/site/pages/${page.id}/unpublish`,
            { version },
            { onError: setErrors },
        );
    }

    function archive() {
        if (
            !window.confirm(
                'Archive this page? Remove it from navigation first.',
            )
        ) {
            return;
        }

        router.delete(`/superadmin/site/pages/${page.id}`, {
            onError: setErrors,
        });
    }

    return (
        <>
            <Head title={`${content.hero.title} · Public Website`} />
            <div className="space-y-6 p-4 pb-28 md:p-6">
                <SiteSectionNav />
                <PageHeader
                    title={content.hero.title || 'Edit page'}
                    meta={
                        publishedAt
                            ? `Published ${new Date(publishedAt).toLocaleString()}`
                            : 'Draft'
                    }
                    actions={
                        <>
                            <Button asChild variant="secondary">
                                <Link
                                    href={`/superadmin/site/pages/${page.id}/preview`}
                                    target="_blank"
                                >
                                    <Eye /> Preview saved draft
                                </Link>
                            </Button>
                            {publishedAt && (
                                <Button asChild variant="secondary">
                                    <Link
                                        href={`/${page.slug}`}
                                        target="_blank"
                                    >
                                        Live page
                                    </Link>
                                </Button>
                            )}
                        </>
                    }
                />
                {dirty && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        You have unsaved changes. Save the draft to update its
                        preview.
                    </p>
                )}
                {Object.keys(errors).length > 0 && (
                    <div
                        role="alert"
                        className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                    >
                        <p className="font-semibold">
                            Please check these fields:
                        </p>
                        <ul className="mt-2 list-disc pl-5">
                            {Object.entries(errors)
                                .slice(0, 8)
                                .map(([field, message]) => (
                                    <li key={field}>{message}</li>
                                ))}
                        </ul>
                    </div>
                )}
                <Tabs
                    items={[
                        { value: 'content', label: 'Content' },
                        { value: 'seo', label: 'URL & search' },
                        {
                            value: 'history',
                            label: 'History',
                            count: revisions.length || undefined,
                        },
                    ]}
                    value={panel}
                    onChange={setPanel}
                />
                {panel === 'content' && (
                    <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
                        <Card className="h-fit space-y-4 xl:sticky xl:top-5">
                            <div>
                                <h2 className="font-semibold">Page sections</h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Arrange sections in the order they appear.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedId(null);
                                    setColumnIndex(0);
                                }}
                                className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-medium ${selectedId === null ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-slate-200 hover:bg-slate-50'}`}
                            >
                                Page heading
                            </button>
                            <div className="space-y-2">
                                {content.sections.map((section, index) => (
                                    <div
                                        key={section.id}
                                        className={`flex items-center gap-1 rounded-lg border p-1 ${selectedId === section.id ? 'border-brand-400 bg-brand-50' : 'border-slate-200'}`}
                                    >
                                        <button
                                            type="button"
                                            className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-sm"
                                            onClick={() => {
                                                setSelectedId(section.id);
                                                setColumnIndex(0);
                                            }}
                                        >
                                            {section.title ||
                                                sectionLabels[section.type]}
                                            {!section.visible && (
                                                <span className="ml-1 text-xs text-slate-400">
                                                    Hidden
                                                </span>
                                            )}
                                        </button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label="Move section up"
                                            disabled={!canEdit || index === 0}
                                            onClick={() =>
                                                moveSection(section.id, -1)
                                            }
                                        >
                                            <ArrowUp />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label="Move section down"
                                            disabled={
                                                !canEdit ||
                                                index ===
                                                    content.sections.length - 1
                                            }
                                            onClick={() =>
                                                moveSection(section.id, 1)
                                            }
                                        >
                                            <ArrowDown />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            {canEdit && (
                                <div className="grid gap-2 border-t border-slate-200 pt-4">
                                    {(
                                        [
                                            'text',
                                            'columns',
                                            'gallery',
                                            'cta',
                                        ] as SectionType[]
                                    ).map((type) => (
                                        <Button
                                            key={type}
                                            type="button"
                                            variant="secondary"
                                            onClick={() => addSection(type)}
                                        >
                                            <Plus /> Add{' '}
                                            {sectionLabels[type].toLowerCase()}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </Card>
                        <Card className="space-y-5">
                            {selected ? (
                                <>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                {sectionLabels[selected.type]}
                                            </p>
                                            <h2 className="text-lg font-semibold">
                                                {selected.title}
                                            </h2>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="section-visible">
                                                Visible
                                            </Label>
                                            <Switch
                                                id="section-visible"
                                                checked={selected.visible}
                                                disabled={!canEdit}
                                                onCheckedChange={(visible) =>
                                                    patchSection(selected.id, {
                                                        visible,
                                                    })
                                                }
                                            />
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                aria-label="Remove section"
                                                disabled={!canEdit}
                                                onClick={() =>
                                                    removeSection(selected.id)
                                                }
                                            >
                                                <Trash2 className="text-rose-600" />
                                            </Button>
                                        </div>
                                    </div>
                                    <Field
                                        label="Section heading"
                                        value={selected.title}
                                        onChange={(title) =>
                                            patchSection(selected.id, { title })
                                        }
                                        disabled={!canEdit}
                                    />
                                    {selected.type !== 'gallery' &&
                                        selected.type !== 'columns' && (
                                            <div className="space-y-2">
                                                <Label>Section text</Label>
                                                <Suspense
                                                    fallback={
                                                        <p className="text-sm text-slate-500">
                                                            Loading editor…
                                                        </p>
                                                    }
                                                >
                                                    <SiteRichEditor
                                                        key={selected.id}
                                                        value={selected.body}
                                                        media={media}
                                                        onChange={(body) =>
                                                            patchSection(
                                                                selected.id,
                                                                { body },
                                                            )
                                                        }
                                                        disabled={!canEdit}
                                                    />
                                                </Suspense>
                                            </div>
                                        )}
                                    {selected.type === 'columns' &&
                                        (() => {
                                            const columns =
                                                selected.columns ?? [];
                                            const activeColumn =
                                                columns[columnIndex] ??
                                                columns[0];

                                            return (
                                                <div className="space-y-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-700">
                                                                Responsive
                                                                columns
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                Columns sit side
                                                                by side on wide
                                                                screens and
                                                                stack on phones.
                                                                Add text or
                                                                images to each
                                                                column.
                                                            </p>
                                                        </div>
                                                        {canEdit &&
                                                            (columns.length ===
                                                            2 ? (
                                                                <Button
                                                                    type="button"
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        patchSection(
                                                                            selected.id,
                                                                            {
                                                                                columns:
                                                                                    [
                                                                                        ...columns,
                                                                                        {
                                                                                            id: crypto.randomUUID(),
                                                                                            body: '',
                                                                                        },
                                                                                    ],
                                                                            },
                                                                        )
                                                                    }
                                                                >
                                                                    <Plus />{' '}
                                                                    Third column
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    type="button"
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        if (
                                                                            columns[2]
                                                                                ?.body &&
                                                                            !window.confirm(
                                                                                'Remove the third column and its content?',
                                                                            )
                                                                        ) {
                                                                            return;
                                                                        }

                                                                        patchSection(
                                                                            selected.id,
                                                                            {
                                                                                columns:
                                                                                    columns.slice(
                                                                                        0,
                                                                                        2,
                                                                                    ),
                                                                            },
                                                                        );
                                                                        setColumnIndex(
                                                                            0,
                                                                        );
                                                                    }}
                                                                >
                                                                    Two columns
                                                                </Button>
                                                            ))}
                                                    </div>
                                                    <Tabs
                                                        items={columns.map(
                                                            (
                                                                column,
                                                                index,
                                                            ) => ({
                                                                value: String(
                                                                    index,
                                                                ),
                                                                label: `Column ${index + 1}`,
                                                            }),
                                                        )}
                                                        value={String(
                                                            Math.min(
                                                                columnIndex,
                                                                columns.length -
                                                                    1,
                                                            ),
                                                        )}
                                                        onChange={(value) =>
                                                            setColumnIndex(
                                                                Number(value),
                                                            )
                                                        }
                                                    />
                                                    {activeColumn && (
                                                        <div className="space-y-2">
                                                            <Label>
                                                                Column{' '}
                                                                {columnIndex +
                                                                    1}{' '}
                                                                content
                                                            </Label>
                                                            <Suspense
                                                                fallback={
                                                                    <p className="text-sm text-slate-500">
                                                                        Loading
                                                                        editor…
                                                                    </p>
                                                                }
                                                            >
                                                                <SiteRichEditor
                                                                    key={
                                                                        activeColumn.id
                                                                    }
                                                                    value={
                                                                        activeColumn.body
                                                                    }
                                                                    media={
                                                                        media
                                                                    }
                                                                    onChange={(
                                                                        body,
                                                                    ) =>
                                                                        patchColumn(
                                                                            selected.id,
                                                                            activeColumn.id,
                                                                            body,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        !canEdit
                                                                    }
                                                                />
                                                            </Suspense>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    {selected.type === 'gallery' && (
                                        <div className="space-y-3">
                                            <p className="text-sm text-slate-600">
                                                Choose images from the media
                                                library. Alt text and captions
                                                are managed there.
                                            </p>
                                            {media.length === 0 ? (
                                                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                                                    No images yet.{' '}
                                                    <Link
                                                        href="/superadmin/site/media"
                                                        className="text-brand-700 underline"
                                                    >
                                                        Open the media library
                                                    </Link>{' '}
                                                    to upload one.
                                                </p>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                                                    {media.map((image) => (
                                                        <label
                                                            key={image.id}
                                                            className={`cursor-pointer overflow-hidden rounded-lg border ${selected.image_ids.includes(image.id) ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200'}`}
                                                        >
                                                            <img
                                                                src={image.url}
                                                                alt={
                                                                    image.alt_text
                                                                }
                                                                className="aspect-[4/3] w-full object-cover"
                                                            />
                                                            <span className="flex items-center gap-2 p-2 text-xs">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selected.image_ids.includes(
                                                                        image.id,
                                                                    )}
                                                                    disabled={
                                                                        !canEdit
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        patchSection(
                                                                            selected.id,
                                                                            {
                                                                                image_ids:
                                                                                    event
                                                                                        .target
                                                                                        .checked
                                                                                        ? [
                                                                                              ...selected.image_ids,
                                                                                              image.id,
                                                                                          ]
                                                                                        : selected.image_ids.filter(
                                                                                              (
                                                                                                  id,
                                                                                              ) =>
                                                                                                  id !==
                                                                                                  image.id,
                                                                                          ),
                                                                            },
                                                                        )
                                                                    }
                                                                />
                                                                <span className="truncate">
                                                                    {image.name}
                                                                </span>
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {selected.type === 'cta' && (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <Field
                                                label="Button text"
                                                value={selected.button_label}
                                                onChange={(button_label) =>
                                                    patchSection(selected.id, {
                                                        button_label,
                                                    })
                                                }
                                                disabled={!canEdit}
                                            />
                                            <Field
                                                label="Button link"
                                                value={selected.button_url}
                                                onChange={(button_url) =>
                                                    patchSection(selected.id, {
                                                        button_url,
                                                    })
                                                }
                                                disabled={!canEdit}
                                            />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <h2 className="text-lg font-semibold">
                                        Page heading
                                    </h2>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field
                                            label="Eyebrow"
                                            value={content.hero.eyebrow}
                                            onChange={(eyebrow) =>
                                                patchHero({ eyebrow })
                                            }
                                            disabled={!canEdit}
                                        />
                                        <Field
                                            label="Headline"
                                            value={content.hero.title}
                                            onChange={(title) =>
                                                patchHero({ title })
                                            }
                                            disabled={!canEdit}
                                        />
                                    </div>
                                    <Field
                                        label="Introduction"
                                        value={content.hero.description}
                                        onChange={(description) =>
                                            patchHero({ description })
                                        }
                                        disabled={!canEdit}
                                        multiline
                                    />
                                </>
                            )}
                        </Card>
                    </div>
                )}
                {panel === 'seo' && (
                    <Card className="max-w-3xl space-y-5">
                        <div>
                            <h2 className="text-lg font-semibold">
                                URL & search listing
                            </h2>
                            <p className="text-sm text-slate-500">
                                Changing a published URL will change links to
                                this page.
                            </p>
                        </div>
                        <Field
                            label="Page URL"
                            value={slug}
                            onChange={setSlug}
                            disabled={!canEdit}
                            hint={`testmaker.pk/${slug}`}
                        />
                        <Field
                            label="Search title"
                            value={content.seo.title}
                            onChange={(title) =>
                                setContent((current) => ({
                                    ...current,
                                    seo: { ...current.seo, title },
                                }))
                            }
                            disabled={!canEdit}
                        />
                        <Field
                            label="Search description"
                            value={content.seo.description}
                            onChange={(description) =>
                                setContent((current) => ({
                                    ...current,
                                    seo: { ...current.seo, description },
                                }))
                            }
                            disabled={!canEdit}
                            multiline
                        />
                    </Card>
                )}
                {panel === 'history' && (
                    <div className="max-w-3xl space-y-5">
                        <Card className="space-y-3">
                            <h2 className="text-lg font-semibold">
                                Published versions
                            </h2>
                            {revisions.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    Versions appear after publishing.
                                </p>
                            ) : (
                                revisions.map((revision) => (
                                    <div
                                        key={revision.id}
                                        className="flex items-center justify-between gap-3 border-t border-slate-100 py-3 text-sm"
                                    >
                                        <span>
                                            Version {revision.number} ·{' '}
                                            {new Date(
                                                revision.created_at,
                                            ).toLocaleString()}
                                        </span>
                                        {canEdit && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    restore(revision.id)
                                                }
                                            >
                                                <RotateCcw /> Restore to draft
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </Card>
                        {canEdit && (
                            <Card className="space-y-3">
                                <h2 className="text-lg font-semibold">
                                    Page status
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {publishedAt && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={unpublish}
                                        >
                                            Unpublish page
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        variant="danger"
                                        onClick={archive}
                                    >
                                        Archive page
                                    </Button>
                                </div>
                            </Card>
                        )}
                    </div>
                )}
                {canEdit && (
                    <div className="sticky bottom-4 z-20 flex flex-wrap justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={processing}
                            onClick={() => save(false)}
                        >
                            <Save /> Save draft
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            disabled={processing}
                            onClick={() => save(true)}
                        >
                            <Send /> Publish page
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}

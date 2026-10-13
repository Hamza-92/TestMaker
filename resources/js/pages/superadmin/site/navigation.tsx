import type { FormDataConvertible } from '@inertiajs/core';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    Eye,
    Link2,
    Plus,
    Save,
    Send,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import SiteSectionNav from '@/components/site-section-nav';
import { Button, Card, Input, PageHeader, Tabs } from '@/components/tm';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { SiteMenuItem, SiteMenuKey } from '@/types/site-cms';

interface MenuData {
    items: SiteMenuItem[];
    version: number;
    publishedAt: string | null;
}

interface Props {
    menus: Record<SiteMenuKey, MenuData>;
    pages: Array<{
        id: number;
        label: string;
        slug: string;
        published: boolean;
    }>;
    canEdit: boolean;
}

function newItem(): SiteMenuItem {
    return {
        id: crypto.randomUUID(),
        label: 'New link',
        type: 'url',
        url: '/',
        page_id: null,
        visible: true,
        children: [],
    };
}

function move<T>(items: T[], index: number, direction: -1 | 1): T[] {
    const next = [...items];
    const target = index + direction;

    if (target < 0 || target >= next.length) {
        return items;
    }

    [next[index], next[target]] = [next[target], next[index]];

    return next;
}

export default function SiteNavigationEditor({ menus, pages, canEdit }: Props) {
    const [active, setActive] = useState<SiteMenuKey>('header');
    const [drafts, setDrafts] = useState<Record<SiteMenuKey, SiteMenuItem[]>>({
        header: menus.header.items,
        footer: menus.footer.items,
    });
    const [selectedId, setSelectedId] = useState<string | null>(
        menus.header.items[0]?.id ?? null,
    );
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const items = drafts[active];
    const selected = items
        .flatMap((item) => [item, ...item.children])
        .find((item) => item.id === selectedId);
    const selectedParent = items.find((item) =>
        item.children.some((child) => child.id === selectedId),
    );
    const dirty = JSON.stringify(items) !== JSON.stringify(menus[active].items);

    function setItems(next: SiteMenuItem[]) {
        setDrafts((current) => ({ ...current, [active]: next }));
    }

    function patchItem(id: string, patch: Partial<SiteMenuItem>) {
        setItems(
            items.map((item) =>
                item.id === id
                    ? { ...item, ...patch }
                    : {
                          ...item,
                          children: item.children.map((child) =>
                              child.id === id ? { ...child, ...patch } : child,
                          ),
                      },
            ),
        );
    }

    function removeItem(id: string) {
        setItems(
            items
                .filter((item) => item.id !== id)
                .map((item) => ({
                    ...item,
                    children: item.children.filter((child) => child.id !== id),
                })),
        );
        setSelectedId(null);
    }

    function moveItem(id: string, direction: -1 | 1) {
        const parentIndex = items.findIndex((item) => item.id === id);

        if (parentIndex >= 0) {
            setItems(move(items, parentIndex, direction));

            return;
        }

        setItems(
            items.map((item) => {
                const childIndex = item.children.findIndex(
                    (child) => child.id === id,
                );

                return childIndex >= 0
                    ? {
                          ...item,
                          children: move(item.children, childIndex, direction),
                      }
                    : item;
            }),
        );
    }

    function save(publish: boolean) {
        if (processing || !canEdit) {
            return;
        }

        setProcessing(true);
        setErrors({});
        router.put(
            `/superadmin/site/navigation/${active}`,
            {
                version: menus[active].version,
                publish,
                items: items as unknown as FormDataConvertible,
            },
            {
                preserveState: 'errors',
                onError: (nextErrors) => setErrors(nextErrors),
                onFinish: () => setProcessing(false),
            },
        );
    }

    function switchMenu(key: SiteMenuKey) {
        setActive(key);
        setSelectedId(drafts[key][0]?.id ?? null);
        setErrors({});
    }

    return (
        <>
            <Head title="Navigation · Public Website" />
            <div className="space-y-6 p-4 pb-28 md:p-6">
                <PageHeader
                    title="Navigation"
                    meta="Control the public header and footer menus"
                    actions={
                        <Button asChild variant="secondary">
                            <Link
                                href="/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Eye />
                                Live website
                            </Link>
                        </Button>
                    }
                />
                <SiteSectionNav />
                <div className="flex flex-wrap items-center gap-3">
                    <Tabs<SiteMenuKey>
                        items={[
                            { value: 'header', label: 'Header menu' },
                            { value: 'footer', label: 'Footer menu' },
                        ]}
                        value={active}
                        onChange={switchMenu}
                    />
                    <span className="text-xs text-slate-500">
                        {menus[active].publishedAt
                            ? `Published ${new Date(menus[active].publishedAt).toLocaleString()}`
                            : 'Not published'}
                    </span>
                </div>
                {dirty && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        You have unsaved changes in this menu.
                    </p>
                )}
                {Object.keys(errors).length > 0 && (
                    <div
                        role="alert"
                        className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                    >
                        {Object.entries(errors)
                            .slice(0, 6)
                            .map(([field, message]) => (
                                <p key={field}>{message}</p>
                            ))}
                    </div>
                )}
                <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
                    <Card padding="none" className="h-fit overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                            <h2 className="font-semibold text-slate-900">
                                {active === 'header'
                                    ? 'Header links'
                                    : 'Footer groups'}
                            </h2>
                            {canEdit && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={processing || items.length >= 12}
                                    onClick={() => {
                                        const item = newItem();
                                        setItems([...items, item]);
                                        setSelectedId(item.id);
                                    }}
                                >
                                    <Plus />
                                    Add
                                </Button>
                            )}
                        </div>
                        <div className="space-y-1 p-2">
                            {items.length === 0 && (
                                <p className="px-3 py-10 text-center text-sm text-slate-500">
                                    No links yet. Add one to begin.
                                </p>
                            )}
                            {items.map((item, index) => (
                                <div key={item.id}>
                                    <div
                                        className={`flex items-center gap-1 rounded-lg pr-1 ${selectedId === item.id ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedId(item.id)
                                            }
                                            className="min-w-0 flex-1 px-3 py-3 text-left"
                                        >
                                            <span className="block truncate text-sm font-medium text-slate-900">
                                                {item.label}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {item.children.length} nested ·{' '}
                                                {item.visible
                                                    ? 'Visible'
                                                    : 'Hidden'}
                                            </span>
                                        </button>
                                        {canEdit && (
                                            <>
                                                <Button
                                                    size="icon-sm"
                                                    variant="ghost"
                                                    disabled={index === 0}
                                                    onClick={() =>
                                                        moveItem(item.id, -1)
                                                    }
                                                    aria-label={`Move ${item.label} up`}
                                                >
                                                    <ArrowUp />
                                                </Button>
                                                <Button
                                                    size="icon-sm"
                                                    variant="ghost"
                                                    disabled={
                                                        index ===
                                                        items.length - 1
                                                    }
                                                    onClick={() =>
                                                        moveItem(item.id, 1)
                                                    }
                                                    aria-label={`Move ${item.label} down`}
                                                >
                                                    <ArrowDown />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                    {item.children.map((child, childIndex) => (
                                        <div
                                            key={child.id}
                                            className={`ml-5 flex items-center gap-1 rounded-lg pr-1 ${selectedId === child.id ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedId(child.id)
                                                }
                                                className="min-w-0 flex-1 px-3 py-2 text-left text-sm text-slate-600"
                                            >
                                                <span className="block truncate">
                                                    ↳ {child.label}
                                                </span>
                                            </button>
                                            {canEdit && (
                                                <>
                                                    <Button
                                                        size="icon-sm"
                                                        variant="ghost"
                                                        disabled={
                                                            childIndex === 0
                                                        }
                                                        onClick={() =>
                                                            moveItem(
                                                                child.id,
                                                                -1,
                                                            )
                                                        }
                                                        aria-label={`Move ${child.label} up`}
                                                    >
                                                        <ArrowUp />
                                                    </Button>
                                                    <Button
                                                        size="icon-sm"
                                                        variant="ghost"
                                                        disabled={
                                                            childIndex ===
                                                            item.children
                                                                .length -
                                                                1
                                                        }
                                                        onClick={() =>
                                                            moveItem(
                                                                child.id,
                                                                1,
                                                            )
                                                        }
                                                        aria-label={`Move ${child.label} down`}
                                                    >
                                                        <ArrowDown />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </Card>
                    <Card className="h-fit space-y-5">
                        {selected ? (
                            <>
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <h2 className="font-semibold text-slate-900">
                                            Edit link
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            {selectedParent
                                                ? `Nested under ${selectedParent.label}`
                                                : 'Top level'}
                                        </p>
                                    </div>
                                    {canEdit && (
                                        <Button
                                            size="icon-sm"
                                            variant="ghost"
                                            className="text-rose-600"
                                            onClick={() =>
                                                removeItem(selected.id)
                                            }
                                            aria-label="Remove link"
                                        >
                                            <Trash2 />
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="menu-label">Label</Label>
                                    <Input
                                        id="menu-label"
                                        value={selected.label}
                                        disabled={!canEdit}
                                        onChange={(event) =>
                                            patchItem(selected.id, {
                                                label: event.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={selected.visible}
                                        disabled={!canEdit}
                                        onCheckedChange={(visible) =>
                                            patchItem(selected.id, { visible })
                                        }
                                        aria-label="Show link"
                                    />
                                    <span className="text-sm text-slate-700">
                                        Show on website
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <Label>Destination</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            variant={
                                                selected.type === 'url'
                                                    ? 'primary'
                                                    : 'secondary'
                                            }
                                            disabled={!canEdit}
                                            onClick={() =>
                                                patchItem(selected.id, {
                                                    type: 'url',
                                                    url: selected.url || '/',
                                                    page_id: null,
                                                })
                                            }
                                        >
                                            <Link2 /> Custom URL
                                        </Button>
                                        <Button
                                            variant={
                                                selected.type === 'page'
                                                    ? 'primary'
                                                    : 'secondary'
                                            }
                                            disabled={!canEdit}
                                            onClick={() =>
                                                patchItem(selected.id, {
                                                    type: 'page',
                                                    url: null,
                                                    page_id:
                                                        pages[0]?.id ?? null,
                                                })
                                            }
                                        >
                                            Page
                                        </Button>
                                    </div>
                                    {selected.type === 'url' ? (
                                        <Input
                                            value={selected.url ?? ''}
                                            disabled={!canEdit}
                                            onChange={(event) =>
                                                patchItem(selected.id, {
                                                    url: event.target.value,
                                                })
                                            }
                                            aria-label="Custom URL"
                                            placeholder="/about-us or https://example.com"
                                        />
                                    ) : (
                                        <Select
                                            value={
                                                selected.page_id?.toString() ??
                                                'none'
                                            }
                                            disabled={!canEdit}
                                            onValueChange={(value) =>
                                                patchItem(selected.id, {
                                                    page_id:
                                                        value === 'none'
                                                            ? null
                                                            : Number(value),
                                                })
                                            }
                                        >
                                            <SelectTrigger aria-label="Choose page">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    Choose a page
                                                </SelectItem>
                                                {pages.map((page) => (
                                                    <SelectItem
                                                        key={page.id}
                                                        value={page.id.toString()}
                                                    >
                                                        {page.label}
                                                        {page.published
                                                            ? ''
                                                            : ' (draft)'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                                {!selectedParent && canEdit && (
                                    <Button
                                        variant="secondary"
                                        disabled={selected.children.length >= 8}
                                        onClick={() => {
                                            const child = newItem();
                                            patchItem(selected.id, {
                                                children: [
                                                    ...selected.children,
                                                    child,
                                                ],
                                            });
                                            setSelectedId(child.id);
                                        }}
                                    >
                                        <Plus />
                                        Add nested link
                                    </Button>
                                )}
                            </>
                        ) : (
                            <div className="py-16 text-center text-sm text-slate-500">
                                Select a link to edit its label and destination.
                            </div>
                        )}
                    </Card>
                </div>
                {canEdit && (
                    <div className="sticky bottom-4 z-20 flex justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                        <Button
                            variant="secondary"
                            disabled={processing}
                            onClick={() => save(false)}
                        >
                            <Save />
                            Save draft
                        </Button>
                        <Button
                            variant="primary"
                            disabled={processing}
                            onClick={() => save(true)}
                        >
                            <Send />
                            Publish menu
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}

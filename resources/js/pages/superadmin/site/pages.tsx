import { Head, Link, router } from '@inertiajs/react';
import { ArrowUpRight, FilePlus2, Pencil, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import SiteSectionNav from '@/components/site-section-nav';
import { Button, Card, PageHeader, SearchInput, Tabs } from '@/components/tm';
import { Input } from '@/components/tm';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface PageRow {
    id: number;
    title: string;
    slug: string;
    template: string;
    publishedAt: string | null;
    updatedAt: string | null;
    archived: boolean;
}

interface Props {
    pages: PageRow[];
    canEdit: boolean;
}

type Filter = 'all' | 'published' | 'draft' | 'archived';

function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

export default function SitePages({ pages, canEdit }: Props) {
    const [filter, setFilter] = useState<Filter>('all');
    const [search, setSearch] = useState('');
    const [creating, setCreating] = useState(false);
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [slugEdited, setSlugEdited] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const filtered = useMemo(() => {
        const query = search.toLowerCase().trim();

        return pages.filter((page) => {
            if (filter === 'archived' && !page.archived) {
                return false;
            }

            if (
                filter === 'published' &&
                (!page.publishedAt || page.archived)
            ) {
                return false;
            }

            if (filter === 'draft' && (page.publishedAt || page.archived)) {
                return false;
            }

            if (filter === 'all' && page.archived) {
                return false;
            }

            return (
                !query ||
                `${page.title} ${page.slug}`.toLowerCase().includes(query)
            );
        });
    }, [filter, pages, search]);

    function createPage(event: React.FormEvent) {
        event.preventDefault();
        setProcessing(true);
        setErrors({});
        router.post(
            '/superadmin/site/pages',
            { title, slug },
            {
                preserveState: 'errors',
                onError: (nextErrors) => setErrors(nextErrors),
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <>
            <Head title="Pages · Public Website" />
            <div className="space-y-6 p-4 md:p-6">
                <PageHeader
                    title="Public Website"
                    meta={`${pages.filter((page) => !page.archived).length} pages`}
                    actions={
                        canEdit && (
                            <Button
                                variant="primary"
                                onClick={() => setCreating(true)}
                            >
                                <FilePlus2 />
                                New page
                            </Button>
                        )
                    }
                />
                <SiteSectionNav />
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Tabs<Filter>
                        items={[
                            { value: 'all', label: 'All' },
                            { value: 'published', label: 'Published' },
                            { value: 'draft', label: 'Drafts' },
                            { value: 'archived', label: 'Archived' },
                        ]}
                        value={filter}
                        onChange={setFilter}
                    />
                    <SearchInput
                        value={search}
                        onValueChange={setSearch}
                        placeholder="Search pages"
                        aria-label="Search pages"
                        className="w-full sm:w-72"
                    />
                </div>
                <Card padding="none" className="overflow-hidden">
                    <div className="hidden grid-cols-[minmax(0,1fr)_180px_140px_150px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
                        <span>Page</span>
                        <span>URL</span>
                        <span>Status</span>
                        <span className="text-right">Actions</span>
                    </div>
                    {filtered.length === 0 ? (
                        <div className="px-6 py-16 text-center text-sm text-slate-500">
                            No pages match this view.
                        </div>
                    ) : (
                        filtered.map((page) => {
                            const editUrl =
                                page.template === 'pricing'
                                    ? '/superadmin/site/pricing'
                                    : `/superadmin/site/pages/${page.id}/edit`;
                            const publicUrl = `/${page.slug}`;

                            return (
                                <div
                                    key={page.id}
                                    className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-0 md:grid-cols-[minmax(0,1fr)_180px_140px_150px] md:items-center md:gap-4"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-900">
                                            {page.title}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {page.template === 'pricing'
                                                ? 'Pricing layout'
                                                : 'Content page'}
                                            {page.updatedAt &&
                                                ` · Updated ${new Date(page.updatedAt).toLocaleDateString()}`}
                                        </p>
                                    </div>
                                    <span className="truncate text-sm text-slate-500">
                                        {publicUrl}
                                    </span>
                                    <span
                                        className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${page.archived ? 'bg-slate-100 text-slate-600' : page.publishedAt ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                                    >
                                        {page.archived
                                            ? 'Archived'
                                            : page.publishedAt
                                              ? 'Published'
                                              : 'Draft'}
                                    </span>
                                    <div className="flex items-center gap-1 md:justify-end">
                                        {page.archived ? (
                                            canEdit && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() =>
                                                        router.post(
                                                            `/superadmin/site/pages/${page.id}/restore`,
                                                        )
                                                    }
                                                >
                                                    <RotateCcw />
                                                    Restore
                                                </Button>
                                            )
                                        ) : (
                                            <>
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    variant="ghost"
                                                >
                                                    <Link href={editUrl}>
                                                        <Pencil />
                                                        Edit
                                                    </Link>
                                                </Button>
                                                {page.publishedAt && (
                                                    <Button
                                                        asChild
                                                        size="icon-sm"
                                                        variant="ghost"
                                                    >
                                                        <a
                                                            href={publicUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            aria-label={`View ${page.title}`}
                                                        >
                                                            <ArrowUpRight />
                                                        </a>
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </Card>
            </div>
            <Dialog open={creating} onOpenChange={setCreating}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create a page</DialogTitle>
                        <DialogDescription>
                            Start with a title and URL. The page remains private
                            until you publish it.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={createPage} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="new-page-title">Page title</Label>
                            <Input
                                id="new-page-title"
                                value={title}
                                onChange={(event) => {
                                    const nextTitle = event.target.value;
                                    setTitle(nextTitle);

                                    if (!slugEdited) {
                                        setSlug(slugify(nextTitle));
                                    }
                                }}
                                autoFocus
                            />
                            {errors.title && (
                                <p className="text-xs text-rose-600">
                                    {errors.title}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="new-page-slug">Page URL</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500">
                                    /
                                </span>
                                <Input
                                    id="new-page-slug"
                                    value={slug}
                                    onChange={(event) => {
                                        setSlug(slugify(event.target.value));
                                        setSlugEdited(true);
                                    }}
                                />
                            </div>
                            {errors.slug && (
                                <p className="text-xs text-rose-600">
                                    {errors.slug}
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                onClick={() => setCreating(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={processing}
                            >
                                Create draft
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

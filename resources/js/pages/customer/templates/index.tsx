import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    CalendarIcon,
    LayersIcon,
    LayoutTemplateIcon,
    PencilIcon,
    PlusIcon,
    SearchIcon,
    SparklesIcon,
    Trash2Icon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '../papers/paper-layouts/confirm-dialog';

interface Template {
    id: number;
    name: string;
    description: string | null;
    section_count: number;
    total_marks: number;
    updated_at: string;
}

interface Props {
    templates: Template[];
    filters?: { q?: string };
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function TemplatesIndex({ templates, filters }: Props) {
    const [search, setSearch] = useState(filters?.q ?? '');
    const [renaming, setRenaming] = useState<Template | null>(null);
    const [deleting, setDeleting] = useState<Template | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const handle = window.setTimeout(() => {
            const current = filters?.q ?? '';
            if (search === current) return;
            router.get(
                '/templates',
                search ? { q: search } : {},
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 300);
        return () => window.clearTimeout(handle);
    }, [search, filters?.q]);

    function handleDelete() {
        if (!deleting || isDeleting) return;
        setIsDeleting(true);
        router.delete(`/templates/${deleting.id}`, {
            onFinish: () => {
                setIsDeleting(false);
                setDeleting(null);
            },
        });
    }

    return (
        <>
            <Head title="My Templates" />

            <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                            <LayoutTemplateIcon className="size-5" />
                            My Templates
                        </h1>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            Reusable paper layouts &mdash; sections, marks, and settings, no questions attached.
                        </p>
                    </div>
                    <Link
                        href="/papers/generate"
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
                    >
                        <PlusIcon className="size-4" />
                        New Paper
                    </Link>
                </div>

                <div className="relative max-w-sm">
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search templates"
                        className="pl-9"
                    />
                </div>

                {templates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                            <LayoutTemplateIcon className="size-6" />
                        </div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            No templates yet
                        </p>
                        <p className="mt-0.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                            Build a paper on Generate Paper and click <span className="font-medium">Save as Template</span> to reuse its layout later.
                        </p>
                        <Link
                            href="/papers/generate"
                            className="mt-5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                        >
                            <PlusIcon className="size-4" />
                            Generate a Paper
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {templates.map((template) => (
                            <div
                                key={template.id}
                                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-500/40"
                            >
                                <div>
                                    <div className="mb-2 flex items-center gap-2">
                                        <div className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                            <LayoutTemplateIcon className="size-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                {template.name}
                                            </p>
                                            {template.description && (
                                                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                                                    {template.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                            <LayersIcon className="size-3" />
                                            {template.section_count} section{template.section_count === 1 ? '' : 's'}
                                        </span>
                                        {template.total_marks > 0 && (
                                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                                {template.total_marks} marks
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-1">
                                            <CalendarIcon className="size-3" />
                                            {formatDate(template.updated_at)}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between gap-2">
                                    <Link
                                        href={`/papers/generate?template=${template.id}`}
                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                                    >
                                        <SparklesIcon className="size-3.5" />
                                        Use Template
                                    </Link>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setRenaming(template)}
                                            title="Rename"
                                            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                        >
                                            <PencilIcon className="size-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeleting(template)}
                                            title="Delete"
                                            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                                        >
                                            <Trash2Icon className="size-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {renaming && (
                <RenameTemplateDialog
                    template={renaming}
                    onClose={() => setRenaming(null)}
                />
            )}

            {deleting && (
                <ConfirmDialog
                    variant="danger"
                    title="Delete template"
                    message={`Delete "${deleting.name}"? This cannot be undone.`}
                    confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleting(null)}
                />
            )}
        </>
    );
}

interface RenameFormValues {
    name: string;
    description: string;
    [key: string]: string;
}

function RenameTemplateDialog({
    template,
    onClose,
}: {
    template: Template;
    onClose: () => void;
}) {
    const { data, setData, put, processing, errors } = useForm<RenameFormValues>({
        name: template.name,
        description: template.description ?? '',
    });

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        put(`/templates/${template.id}`, { onSuccess: onClose });
    }

    return (
        <div
            role="presentation"
            onMouseDown={onClose}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4"
        >
            <section
                role="dialog"
                aria-modal="true"
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Rename Template
                    </h2>
                </div>
                <form onSubmit={submit} className="space-y-4 px-6 py-5">
                    <div className="space-y-1.5">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            autoFocus
                        />
                        {errors.name && <p className="text-xs text-rose-600">{errors.name}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="description">Description</Label>
                        <Input
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Short description"
                        />
                        {errors.description && (
                            <p className="text-xs text-rose-600">{errors.description}</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing || !data.name.trim()}
                            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

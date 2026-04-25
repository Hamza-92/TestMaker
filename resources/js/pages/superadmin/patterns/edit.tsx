import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeftIcon, SaveIcon, TagIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Pattern {
    id: number;
    name: string;
    short_name: string | null;
    status: number;
}

interface FormData {
    _method: string;
    name: string;
    short_name: string;
    status: string;
    [key: string]: string | boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Field({ label, required, error, children }: {
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="min-w-0 space-y-1.5">
            <Label className="flex items-center gap-1">
                {label}
                {required && <span className="text-destructive text-xs">*</span>}
            </Label>
            {children}
            {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EditPattern({ pattern }: { pattern: Pattern }) {
    const { data, setData, post, processing, errors } = useForm<FormData>({
        _method:    'put',
        name:       pattern.name,
        short_name: pattern.short_name ?? '',
        status:     String(pattern.status),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/superadmin/patterns/${pattern.id}`);
    };

    return (
        <>
            <Head title={`Edit Pattern - ${pattern.name}`} />
            <div className="mx-auto w-full max-w-2xl min-w-0 space-y-6 p-4 md:p-6">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex min-w-0 items-center gap-4">
                    <Link
                        href="/superadmin/patterns"
                        className="hover:bg-accent border-input flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <h1 className="h1-semibold">Edit Pattern</h1>
                        <p className="text-muted-foreground text-sm">Update pattern details</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-5">
                    <div className="w-full min-w-0 space-y-5 rounded-xl border p-5 shadow-sm">

                        {/* Section Header */}
                        <div className="flex items-start gap-3">
                            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                                <TagIcon className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Pattern Details</p>
                                <p className="text-muted-foreground text-xs">Name, abbreviation and status</p>
                            </div>
                        </div>
                        <Separator />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Pattern Name" required error={errors.name}>
                                <Input
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g. Federal Board"
                                />
                            </Field>
                            <Field label="Short Name" error={errors.short_name}>
                                <Input
                                    value={data.short_name}
                                    onChange={(e) => setData('short_name', e.target.value)}
                                    placeholder="e.g. FBISE"
                                />
                            </Field>
                        </div>

                        <Field label="Status" required error={errors.status}>
                            <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">
                                        <span className="flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-emerald-500" /> Active
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="0">
                                        <span className="flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-gray-400" /> Inactive
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>

                    {/* ── Actions ──────────────────────────────────────────── */}
                    <div className="flex items-center justify-end gap-3 pb-2">
                        <Link
                            href="/superadmin/patterns"
                            className="border-input hover:bg-accent flex h-9 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-9 items-center gap-2 rounded-lg px-5 text-sm font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <SaveIcon className="size-4" />
                            {processing ? 'Saving…' : 'Update Pattern'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

EditPattern.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Patterns', href: '/superadmin/patterns' },
        { title: 'Edit Pattern' },
    ],
};

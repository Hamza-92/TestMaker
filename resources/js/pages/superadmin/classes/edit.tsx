import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeftIcon, CheckSquareIcon, SaveIcon, SchoolIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Pattern {
    id: number;
    name: string;
    short_name: string | null;
}

interface SchoolClassData {
    id: number;
    name: string;
    status: number;
    pattern_ids: number[];
}

interface FormData {
    _method: string;
    name: string;
    status: string;
    pattern_ids: number[];
    [key: string]: string | number[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Field({ label, required, error, children }: {
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
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
export default function EditClass({ schoolClass, patterns }: { schoolClass: SchoolClassData; patterns: Pattern[] }) {
    const { data, setData, post, processing, errors } = useForm<FormData>({
        _method:     'put',
        name:        schoolClass.name,
        status:      String(schoolClass.status),
        pattern_ids: schoolClass.pattern_ids,
    });

    const allSelected  = patterns.length > 0 && data.pattern_ids.length === patterns.length;
    const someSelected = data.pattern_ids.length > 0 && !allSelected;

    const togglePattern = (id: number) => {
        setData('pattern_ids',
            data.pattern_ids.includes(id)
                ? data.pattern_ids.filter((x) => x !== id)
                : [...data.pattern_ids, id],
        );
    };

    const toggleAll = () => {
        setData('pattern_ids', allSelected ? [] : patterns.map((p) => p.id));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/superadmin/classes/${schoolClass.id}`);
    };

    return (
        <>
            <Head title={`Edit Class - ${schoolClass.name}`} />
            <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/superadmin/classes"
                        className="hover:bg-accent border-input flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <h1 className="h1-semibold">Edit Class</h1>
                        <p className="text-muted-foreground text-sm">Update class details and pattern links</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* ── Section 1: Class Details ─────────────────────────── */}
                    <div className="space-y-5 rounded-xl border p-5 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                                <SchoolIcon className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Class Details</p>
                                <p className="text-muted-foreground text-xs">Name and status</p>
                            </div>
                        </div>
                        <Separator />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Class Name" required error={errors.name}>
                                <Input
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g. Class 9"
                                />
                            </Field>
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
                    </div>

                    {/* ── Section 2: Pattern Selection ─────────────────────── */}
                    <div className="space-y-5 rounded-xl border p-5 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                                <CheckSquareIcon className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Linked Patterns</p>
                                <p className="text-muted-foreground text-xs">
                                    Select which patterns this class belongs to
                                </p>
                            </div>
                        </div>
                        <Separator />

                        {errors.pattern_ids && (
                            <p className="text-destructive text-xs">{errors.pattern_ids}</p>
                        )}

                        {patterns.length === 0 ? (
                            <p className="text-muted-foreground text-sm italic">
                                No active patterns available. <Link href="/superadmin/patterns/add" className="text-primary hover:underline">Add a pattern</Link> first.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {/* Select All */}
                                <label className="bg-muted/40 hover:bg-muted/70 flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors">
                                    <Checkbox
                                        checked={allSelected}
                                        data-state={someSelected ? 'indeterminate' : undefined}
                                        onCheckedChange={toggleAll}
                                    />
                                    <span className="text-sm font-medium">Select all patterns</span>
                                    <span className="text-muted-foreground ml-auto text-xs">
                                        {data.pattern_ids.length} / {patterns.length} selected
                                    </span>
                                </label>

                                <Separator />

                                {/* Individual Patterns */}
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {patterns.map((pattern) => {
                                        const checked = data.pattern_ids.includes(pattern.id);
                                        return (
                                            <label
                                                key={pattern.id}
                                                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                                                    checked
                                                        ? 'border-primary/40 bg-primary/5'
                                                        : 'hover:bg-muted/40'
                                                }`}
                                            >
                                                <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={() => togglePattern(pattern.id)}
                                                />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">{pattern.name}</p>
                                                    {pattern.short_name && (
                                                        <p className="text-muted-foreground text-xs">{pattern.short_name}</p>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Actions ──────────────────────────────────────────── */}
                    <div className="flex items-center justify-end gap-3 pb-2">
                        <Link
                            href="/superadmin/classes"
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
                            {processing ? 'Saving…' : 'Update Class'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

EditClass.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Classes', href: '/superadmin/classes' },
        { title: 'Edit Class' },
    ],
};

import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CheckSquareIcon,
    SaveIcon,
    SchoolIcon,
} from 'lucide-react';
import { IconColorField } from '@/components/icon-color-field';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Pattern {
    id: number;
    name: string;
    short_name: string | null;
}

interface FormData {
    color: string;
    name: string;
    status: string;
    pattern_ids: number[];
    [key: string]: string | number[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Field({
    label,
    required,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="min-w-0 space-y-1.5">
            <Label className="flex items-center gap-1">
                {label}
                {required && (
                    <span className="text-xs text-destructive">*</span>
                )}
            </Label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AddClass({ patterns }: { patterns: Pattern[] }) {
    const { data, setData, post, processing, errors } = useForm<FormData>({
        color: '',
        name: '',
        status: '1',
        pattern_ids: [],
    });

    const allSelected =
        patterns.length > 0 && data.pattern_ids.length === patterns.length;
    const someSelected = data.pattern_ids.length > 0 && !allSelected;

    const togglePattern = (id: number) => {
        setData(
            'pattern_ids',
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
        post('/superadmin/classes');
    };

    return (
        <>
            <Head title="Add Class" />
            <div className="mx-auto w-full max-w-2xl min-w-0 space-y-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex min-w-0 items-center gap-4">
                    <Link
                        href="/superadmin/classes"
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-input transition-colors hover:bg-accent"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <h1 className="h1-semibold">Add Class</h1>
                        <p className="text-sm text-muted-foreground">
                            Create a new class and link it to patterns
                        </p>
                    </div>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="w-full min-w-0 space-y-5"
                >
                    {/* ── Section 1: Class Details ─────────────────────────── */}
                    <div className="w-full min-w-0 space-y-5 rounded-xl border p-5 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <SchoolIcon className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">
                                    Class Details
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Name and status
                                </p>
                            </div>
                        </div>
                        <Separator />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                label="Class Name"
                                required
                                error={errors.name}
                            >
                                <Input
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    placeholder="e.g. Class 9"
                                />
                            </Field>
                            <Field
                                label="Status"
                                required
                                error={errors.status}
                            >
                                <Select
                                    value={data.status}
                                    onValueChange={(v) => setData('status', v)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">
                                            <span className="flex items-center gap-2">
                                                <span className="size-2 rounded-full bg-emerald-500" />{' '}
                                                Active
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="0">
                                            <span className="flex items-center gap-2">
                                                <span className="size-2 rounded-full bg-gray-400" />{' '}
                                                Inactive
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                    </div>

                    <div className="w-full min-w-0 rounded-xl border p-5 shadow-sm">
                        <IconColorField
                            color={data.color}
                            onChange={(color) => setData('color', color)}
                            icon={SchoolIcon}
                            error={errors.color}
                        />
                    </div>

                    {/* ── Section 2: Pattern Selection ─────────────────────── */}
                    <div className="w-full min-w-0 space-y-5 rounded-xl border p-5 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <CheckSquareIcon className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">
                                    Linked Patterns
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Select which patterns this class belongs to
                                </p>
                            </div>
                        </div>
                        <Separator />

                        {errors.pattern_ids && (
                            <p className="text-xs text-destructive">
                                {errors.pattern_ids}
                            </p>
                        )}

                        {patterns.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">
                                No active patterns available.{' '}
                                <Link
                                    href="/superadmin/patterns/add"
                                    className="text-primary hover:underline"
                                >
                                    Add a pattern
                                </Link>{' '}
                                first.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {/* Select All */}
                                <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3 transition-colors hover:bg-muted/70">
                                    <Checkbox
                                        checked={allSelected}
                                        data-state={
                                            someSelected
                                                ? 'indeterminate'
                                                : undefined
                                        }
                                        onCheckedChange={toggleAll}
                                    />
                                    <span className="text-sm font-medium">
                                        Select all patterns
                                    </span>
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        {data.pattern_ids.length} /{' '}
                                        {patterns.length} selected
                                    </span>
                                </label>

                                <Separator />

                                {/* Individual Patterns */}
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {patterns.map((pattern) => {
                                        const checked =
                                            data.pattern_ids.includes(
                                                pattern.id,
                                            );

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
                                                    onCheckedChange={() =>
                                                        togglePattern(
                                                            pattern.id,
                                                        )
                                                    }
                                                />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">
                                                        {pattern.name}
                                                    </p>
                                                    {pattern.short_name && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {pattern.short_name}
                                                        </p>
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
                            className="flex h-9 items-center gap-2 rounded-lg border border-input px-4 text-sm font-medium transition-colors hover:bg-accent"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <SaveIcon className="size-4" />
                            {processing ? 'Saving…' : 'Save Class'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

AddClass.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Classes', href: '/superadmin/classes' },
        { title: 'Add Class', href: '/superadmin/classes/add' },
    ],
};

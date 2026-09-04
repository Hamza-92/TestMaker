import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeftIcon, BookOpenIcon, LinkIcon, SaveIcon } from 'lucide-react';
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
interface ClassItem {
    id: number;
    name: string;
}

interface PatternWithClasses {
    id: number;
    name: string;
    short_name: string | null;
    classes: ClassItem[];
}

interface Link_ {
    class_id: number;
    pattern_id: number;
    subject_type: string;
}

interface FormData {
    name_eng: string;
    name_ur: string;
    subject_type: string;
    status: string;
    links: Link_[];
    [key: string]: string | Link_[];
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
export default function AddSubject({
    patterns,
}: {
    patterns: PatternWithClasses[];
}) {
    const { data, setData, post, processing, errors } = useForm<FormData>({
        name_eng: '',
        name_ur: '',
        subject_type: 'chapter-wise',
        status: '1',
        links: [],
    });

    const isLinked = (class_id: number, pattern_id: number) =>
        data.links.some(
            (l) => l.class_id === class_id && l.pattern_id === pattern_id,
        );

    const toggleLink = (class_id: number, pattern_id: number) => {
        if (isLinked(class_id, pattern_id)) {
            setData(
                'links',
                data.links.filter(
                    (l) =>
                        !(
                            l.class_id === class_id &&
                            l.pattern_id === pattern_id
                        ),
                ),
            );
        } else {
            setData('links', [
                ...data.links,
                { class_id, pattern_id, subject_type: data.subject_type },
            ]);
        }
    };

    const setLinkSubjectType = (
        class_id: number,
        pattern_id: number,
        subject_type: string,
    ) => {
        setData(
            'links',
            data.links.map((link) =>
                link.class_id === class_id && link.pattern_id === pattern_id
                    ? { ...link, subject_type }
                    : link,
            ),
        );
    };

    const isPatternAllSelected = (pattern: PatternWithClasses) =>
        pattern.classes.every((c) => isLinked(c.id, pattern.id));

    const isPatternSomeSelected = (pattern: PatternWithClasses) =>
        pattern.classes.some((c) => isLinked(c.id, pattern.id));

    const togglePattern = (pattern: PatternWithClasses) => {
        if (isPatternAllSelected(pattern)) {
            // Deselect all classes in this pattern
            setData(
                'links',
                data.links.filter((l) => l.pattern_id !== pattern.id),
            );
        } else {
            // Select all classes in this pattern (add missing ones)
            const toAdd = pattern.classes
                .filter((c) => !isLinked(c.id, pattern.id))
                .map((c) => ({
                    class_id: c.id,
                    pattern_id: pattern.id,
                    subject_type: data.subject_type,
                }));
            setData('links', [...data.links, ...toAdd]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/superadmin/subjects');
    };

    const totalSelected = data.links.length;

    return (
        <>
            <Head title="Add Subject" />
            <div className="mx-auto w-full max-w-2xl min-w-0 space-y-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex min-w-0 items-center gap-4">
                    <Link
                        href="/superadmin/subjects"
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-input transition-colors hover:bg-accent"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <h1 className="h1-semibold">Add Subject</h1>
                        <p className="text-sm text-muted-foreground">
                            Create a new subject and link it to pattern–class
                            combinations
                        </p>
                    </div>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="w-full min-w-0 space-y-5"
                >
                    {/* ── Section 1: Subject Details ───────────────────────── */}
                    <div className="w-full min-w-0 space-y-5 rounded-xl border p-5 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <BookOpenIcon className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">
                                    Subject Details
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Name, default structure and status
                                </p>
                            </div>
                        </div>
                        <Separator />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                label="Name (English)"
                                required
                                error={errors.name_eng}
                            >
                                <Input
                                    value={data.name_eng}
                                    onChange={(e) =>
                                        setData('name_eng', e.target.value)
                                    }
                                    placeholder="e.g. Biology"
                                />
                            </Field>
                            <Field label="Name (Urdu)" error={errors.name_ur}>
                                <Input
                                    value={data.name_ur}
                                    onChange={(e) =>
                                        setData('name_ur', e.target.value)
                                    }
                                    placeholder="e.g. حیاتیات"
                                    dir="rtl"
                                />
                            </Field>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                label="Default Structure"
                                required
                                error={errors.subject_type}
                            >
                                <Select
                                    value={data.subject_type}
                                    onValueChange={(v) =>
                                        setData('subject_type', v)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="chapter-wise">
                                            Chapter-wise
                                        </SelectItem>
                                        <SelectItem value="topic-wise">
                                            Topic-wise
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Used when a new class link is selected.
                                </p>
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

                    {/* ── Section 2: Class–Pattern Links ───────────────────── */}
                    <div className="w-full min-w-0 space-y-5 rounded-xl border p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <LinkIcon className="size-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">
                                        Class Links
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Choose exactly which pattern → class
                                        combinations this subject belongs to
                                    </p>
                                </div>
                            </div>
                            {totalSelected > 0 && (
                                <span className="shrink-0 text-xs font-medium text-primary">
                                    {totalSelected} selected
                                </span>
                            )}
                        </div>
                        <Separator />

                        {patterns.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">
                                No patterns with linked classes found.{' '}
                                <Link
                                    href="/superadmin/classes"
                                    className="text-primary hover:underline"
                                >
                                    Set up classes
                                </Link>{' '}
                                first.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {patterns.map((pattern) => {
                                    const allSel =
                                        isPatternAllSelected(pattern);
                                    const someSel =
                                        isPatternSomeSelected(pattern);

                                    return (
                                        <div
                                            key={pattern.id}
                                            className="overflow-hidden rounded-lg border"
                                        >
                                            {/* Pattern header row */}
                                            <label className="flex cursor-pointer items-center gap-3 bg-muted/50 px-4 py-3 transition-colors hover:bg-muted/80">
                                                <Checkbox
                                                    checked={allSel}
                                                    data-state={
                                                        someSel && !allSel
                                                            ? 'indeterminate'
                                                            : undefined
                                                    }
                                                    onCheckedChange={() =>
                                                        togglePattern(pattern)
                                                    }
                                                />
                                                <span className="text-sm font-semibold">
                                                    {pattern.name}
                                                </span>
                                                {pattern.short_name && (
                                                    <span className="text-xs text-muted-foreground">
                                                        ({pattern.short_name})
                                                    </span>
                                                )}
                                                <span className="ml-auto text-xs text-muted-foreground">
                                                    {
                                                        pattern.classes.filter(
                                                            (c) =>
                                                                isLinked(
                                                                    c.id,
                                                                    pattern.id,
                                                                ),
                                                        ).length
                                                    }{' '}
                                                    / {pattern.classes.length}
                                                </span>
                                            </label>

                                            {/* Class checkboxes */}
                                            <div className="grid gap-px bg-border sm:grid-cols-2">
                                                {pattern.classes.map((cls) => {
                                                    const checked = isLinked(
                                                        cls.id,
                                                        pattern.id,
                                                    );

                                                    return (
                                                        <div
                                                            key={cls.id}
                                                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                                                checked
                                                                    ? 'bg-primary/5'
                                                                    : 'bg-background hover:bg-muted/40'
                                                            }`}
                                                        >
                                                            <Checkbox
                                                                checked={
                                                                    checked
                                                                }
                                                                onCheckedChange={() =>
                                                                    toggleLink(
                                                                        cls.id,
                                                                        pattern.id,
                                                                    )
                                                                }
                                                            />
                                                            <button
                                                                type="button"
                                                                className="min-w-0 flex-1 text-left"
                                                                onClick={() =>
                                                                    toggleLink(
                                                                        cls.id,
                                                                        pattern.id,
                                                                    )
                                                                }
                                                            >
                                                                {cls.name}
                                                            </button>
                                                            {checked && (
                                                                <Select
                                                                    value={
                                                                        data.links.find(
                                                                            (
                                                                                link,
                                                                            ) =>
                                                                                link.class_id ===
                                                                                    cls.id &&
                                                                                link.pattern_id ===
                                                                                    pattern.id,
                                                                        )
                                                                            ?.subject_type ??
                                                                        data.subject_type
                                                                    }
                                                                    onValueChange={(
                                                                        value,
                                                                    ) =>
                                                                        setLinkSubjectType(
                                                                            cls.id,
                                                                            pattern.id,
                                                                            value,
                                                                        )
                                                                    }
                                                                >
                                                                    <SelectTrigger className="h-8 w-36 bg-background">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="chapter-wise">
                                                                            Chapter-wise
                                                                        </SelectItem>
                                                                        <SelectItem value="topic-wise">
                                                                            Topic-wise
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── Actions ──────────────────────────────────────────── */}
                    <div className="flex items-center justify-end gap-3 pb-2">
                        <Link
                            href="/superadmin/subjects"
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
                            {processing ? 'Saving…' : 'Save Subject'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

AddSubject.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Subjects', href: '/superadmin/subjects' },
        { title: 'Add Subject', href: '/superadmin/subjects/add' },
    ],
};

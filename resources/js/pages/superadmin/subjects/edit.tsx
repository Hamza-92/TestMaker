import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeftIcon, BookOpenIcon, LinkIcon, SaveIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface LinkItem {
    class_id: number;
    pattern_id: number;
}

interface SubjectData {
    id: number;
    name_eng: string;
    name_ur: string | null;
    subject_type: string;
    status: number;
}

interface FormData {
    _method: string;
    name_eng: string;
    name_ur: string;
    subject_type: string;
    status: string;
    links: LinkItem[];
    [key: string]: string | LinkItem[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Field({ label, required, error, children }: {
    label: string; required?: boolean; error?: string; children: React.ReactNode;
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
export default function EditSubject({
    subject,
    patterns,
    existingLinks,
}: {
    subject: SubjectData;
    patterns: PatternWithClasses[];
    existingLinks: LinkItem[];
}) {
    const { data, setData, post, processing, errors } = useForm<FormData>({
        _method:      'put',
        name_eng:     subject.name_eng,
        name_ur:      subject.name_ur ?? '',
        subject_type: subject.subject_type,
        status:       String(subject.status),
        links:        existingLinks,
    });

    const isLinked = (class_id: number, pattern_id: number) =>
        data.links.some((l) => l.class_id === class_id && l.pattern_id === pattern_id);

    const toggleLink = (class_id: number, pattern_id: number) => {
        if (isLinked(class_id, pattern_id)) {
            setData('links', data.links.filter((l) => !(l.class_id === class_id && l.pattern_id === pattern_id)));
        } else {
            setData('links', [...data.links, { class_id, pattern_id }]);
        }
    };

    const isPatternAllSelected = (pattern: PatternWithClasses) =>
        pattern.classes.every((c) => isLinked(c.id, pattern.id));

    const isPatternSomeSelected = (pattern: PatternWithClasses) =>
        pattern.classes.some((c) => isLinked(c.id, pattern.id));

    const togglePattern = (pattern: PatternWithClasses) => {
        if (isPatternAllSelected(pattern)) {
            setData('links', data.links.filter((l) => l.pattern_id !== pattern.id));
        } else {
            const existing = data.links.filter((l) => l.pattern_id !== pattern.id);
            const toAdd = pattern.classes.map((c) => ({ class_id: c.id, pattern_id: pattern.id }));
            setData('links', [...existing, ...toAdd]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/superadmin/subjects/${subject.id}`);
    };

    const totalSelected = data.links.length;

    return (
        <>
            <Head title={`Edit Subject - ${subject.name_eng}`} />
            <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/superadmin/subjects"
                        className="hover:bg-accent border-input flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <h1 className="h1-semibold">Edit Subject</h1>
                        <p className="text-muted-foreground text-sm">Update subject details and class links</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* ── Section 1: Subject Details ───────────────────────── */}
                    <div className="space-y-5 rounded-xl border p-5 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                                <BookOpenIcon className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Subject Details</p>
                                <p className="text-muted-foreground text-xs">Name, type and status</p>
                            </div>
                        </div>
                        <Separator />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Name (English)" required error={errors.name_eng}>
                                <Input
                                    value={data.name_eng}
                                    onChange={(e) => setData('name_eng', e.target.value)}
                                    placeholder="e.g. Biology"
                                />
                            </Field>
                            <Field label="Name (Urdu)" error={errors.name_ur}>
                                <Input
                                    value={data.name_ur}
                                    onChange={(e) => setData('name_ur', e.target.value)}
                                    placeholder="e.g. حیاتیات"
                                    dir="rtl"
                                />
                            </Field>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Subject Type" required error={errors.subject_type}>
                                <Select value={data.subject_type} onValueChange={(v) => setData('subject_type', v)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="chapter-wise">Chapter-wise</SelectItem>
                                        <SelectItem value="topic-wise">Topic-wise</SelectItem>
                                    </SelectContent>
                                </Select>
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

                    {/* ── Section 2: Class–Pattern Links ───────────────────── */}
                    <div className="space-y-5 rounded-xl border p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                                    <LinkIcon className="size-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Class Links</p>
                                    <p className="text-muted-foreground text-xs">
                                        Choose exactly which pattern → class combinations this subject belongs to
                                    </p>
                                </div>
                            </div>
                            {totalSelected > 0 && (
                                <span className="text-primary shrink-0 text-xs font-medium">{totalSelected} selected</span>
                            )}
                        </div>
                        <Separator />

                        {patterns.length === 0 ? (
                            <p className="text-muted-foreground text-sm italic">
                                No patterns with linked classes found.{' '}
                                <Link href="/superadmin/classes" className="text-primary hover:underline">Set up classes</Link> first.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {patterns.map((pattern) => {
                                    const allSel  = isPatternAllSelected(pattern);
                                    const someSel = isPatternSomeSelected(pattern);
                                    return (
                                        <div key={pattern.id} className="rounded-lg border overflow-hidden">
                                            {/* Pattern header row */}
                                            <label className="bg-muted/50 flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/80 transition-colors">
                                                <Checkbox
                                                    checked={allSel}
                                                    data-state={someSel && !allSel ? 'indeterminate' : undefined}
                                                    onCheckedChange={() => togglePattern(pattern)}
                                                />
                                                <span className="text-sm font-semibold">{pattern.name}</span>
                                                {pattern.short_name && (
                                                    <span className="text-muted-foreground text-xs">({pattern.short_name})</span>
                                                )}
                                                <span className="text-muted-foreground ml-auto text-xs">
                                                    {pattern.classes.filter((c) => isLinked(c.id, pattern.id)).length} / {pattern.classes.length}
                                                </span>
                                            </label>

                                            {/* Class checkboxes */}
                                            <div className="grid gap-px bg-border sm:grid-cols-2">
                                                {pattern.classes.map((cls) => {
                                                    const checked = isLinked(cls.id, pattern.id);
                                                    return (
                                                        <label
                                                            key={cls.id}
                                                            className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                                                checked ? 'bg-primary/5' : 'bg-background hover:bg-muted/40'
                                                            }`}
                                                        >
                                                            <Checkbox
                                                                checked={checked}
                                                                onCheckedChange={() => toggleLink(cls.id, pattern.id)}
                                                            />
                                                            {cls.name}
                                                        </label>
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
                            {processing ? 'Saving…' : 'Update Subject'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

EditSubject.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Subjects', href: '/superadmin/subjects' },
        { title: 'Edit Subject' },
    ],
};

import { Link } from '@inertiajs/react';
import type { InertiaFormProps } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    FileTextIcon,
    Layers3Icon,
    SaveIcon,
    TargetIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export interface QuestionSchemaOption {
    key: string;
    kind: 'objective' | 'subjective';
    label: string;
    description: string;
    settings: {
        supports_answer_toggle: boolean;
        supports_single_toggle: boolean;
    };
}

export interface QuestionTypeFormData {
    name: string;
    name_ur: string;
    heading_en: string;
    heading_ur: string;
    description_en: string;
    description_ur: string;
    have_answer: boolean;
    is_single: boolean;
    is_objective: boolean;
    schema_key: string;
    status: string;
    [key: string]: boolean | string;
}

interface QuestionTypeFormProps {
    title: string;
    submitLabel: string;
    backHref: string;
    form: InertiaFormProps<QuestionTypeFormData>;
    questionSchemas: QuestionSchemaOption[];
    lockedKind?: 'objective' | 'subjective';
    onSubmit: (event: React.FormEvent) => void;
}

function SectionCard({
    children,
    icon,
    title,
}: {
    children: ReactNode;
    icon: ReactNode;
    title: string;
}) {
    return (
        <section className="w-full min-w-0 space-y-4 rounded-2xl border border-primary/10 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {icon}
                </span>
                <h3 className="text-sm font-semibold">{title}</h3>
            </div>
            <Separator />
            {children}
        </section>
    );
}

function Field({
    label,
    required,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="min-w-0 space-y-1.5">
            <Label className="flex items-center gap-1">
                {label}
                {required ? (
                    <span className="text-xs text-destructive">*</span>
                ) : null}
            </Label>
            {children}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
    );
}

function KindCard({
    active,
    icon,
    label,
    onClick,
}: {
    active: boolean;
    icon: ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'rounded-2xl border p-4 text-left transition-colors',
                active
                    ? 'border-primary/30 bg-primary/5 shadow-sm'
                    : 'border-border bg-background hover:bg-muted/40',
            )}
        >
            <div className="flex items-center gap-3">
                <span
                    className={cn(
                        'inline-flex size-10 items-center justify-center rounded-xl',
                        active ? 'bg-primary text-primary-foreground' : 'bg-muted',
                    )}
                >
                    {icon}
                </span>
                <p className="font-semibold">{label}</p>
            </div>
        </button>
    );
}

function SwitchRow({
    checked,
    label,
    onCheckedChange,
}: {
    checked: boolean;
    label: string;
    onCheckedChange: (checked: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/20 px-4 py-3">
            <p className="font-medium">{label}</p>
            <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </div>
    );
}

export function QuestionTypeForm({
    title,
    submitLabel,
    backHref,
    form,
    questionSchemas,
    lockedKind,
    onSubmit,
}: QuestionTypeFormProps) {
    const filteredSchemas = questionSchemas.filter(
        (schema) =>
            schema.kind === (form.data.is_objective ? 'objective' : 'subjective'),
    );
    const selectedSchema =
        filteredSchemas.find((schema) => schema.key === form.data.schema_key) ??
        filteredSchemas[0] ??
        null;

    const schemaFields = (
        <>
            <Field
                label="Schema"
                required
                error={form.errors.schema_key}
            >
                <Select
                    value={form.data.schema_key}
                    onValueChange={(value) =>
                        form.setData('schema_key', value)
                    }
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select schema" />
                    </SelectTrigger>
                    <SelectContent>
                        {filteredSchemas.map((schema) => (
                            <SelectItem
                                key={schema.key}
                                value={schema.key}
                            >
                                {schema.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>

            {selectedSchema ? (
                <div className="grid gap-3 md:grid-cols-2 md:col-span-2">
                    {selectedSchema.settings.supports_answer_toggle ? (
                        <SwitchRow
                            checked={form.data.have_answer}
                            label="Answers"
                            onCheckedChange={(checked) =>
                                form.setData('have_answer', checked)
                            }
                        />
                    ) : null}

                    {selectedSchema.settings.supports_single_toggle ? (
                        <SwitchRow
                            checked={form.data.is_single}
                            label="Single correct"
                            onCheckedChange={(checked) =>
                                form.setData('is_single', checked)
                            }
                        />
                    ) : null}
                </div>
            ) : null}
        </>
    );

    return (
        <div className="mx-auto w-full max-w-5xl min-w-0 space-y-6 p-4 md:p-6">
            <div className="flex min-w-0 items-center gap-4">
                <Link
                    href={backHref}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-input transition-colors hover:bg-accent"
                >
                    <ArrowLeftIcon className="size-4" />
                </Link>
                <div>
                    <h1 className="h1-semibold">{title}</h1>
                </div>
            </div>

            <form onSubmit={onSubmit} className="w-full min-w-0 space-y-5">
                <SectionCard
                    icon={<FileTextIcon className="size-4" />}
                    title="Details"
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Type Name" required error={form.errors.name}>
                            <Input
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                            />
                        </Field>

                        <Field label="Type Name (Urdu)" error={form.errors.name_ur}>
                            <Input
                                dir="rtl"
                                value={form.data.name_ur}
                                onChange={(event) =>
                                    form.setData('name_ur', event.target.value)
                                }
                            />
                        </Field>

                        <Field
                            label="Heading (English)"
                            required
                            error={form.errors.heading_en}
                        >
                            <Input
                                value={form.data.heading_en}
                                onChange={(event) =>
                                    form.setData('heading_en', event.target.value)
                                }
                            />
                        </Field>

                        <Field
                            label="Heading (Urdu)"
                            error={form.errors.heading_ur}
                        >
                            <Input
                                dir="rtl"
                                value={form.data.heading_ur}
                                onChange={(event) =>
                                    form.setData('heading_ur', event.target.value)
                                }
                            />
                        </Field>

                        <Field
                            label="Status"
                            required
                            error={form.errors.status}
                        >
                            <Select
                                value={form.data.status}
                                onValueChange={(value) =>
                                    form.setData('status', value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Active</SelectItem>
                                    <SelectItem value="0">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>

                        {lockedKind ? schemaFields : null}
                    </div>
                </SectionCard>

                {!lockedKind ? (
                    <SectionCard
                        icon={<Layers3Icon className="size-4" />}
                        title="Structure"
                    >
                        <div className="grid gap-3 md:grid-cols-2">
                            <KindCard
                                active={!form.data.is_objective}
                                label="Subjective"
                                icon={<FileTextIcon className="size-4" />}
                                onClick={() => {
                                    const firstSchema = questionSchemas.find(
                                        (schema) => schema.kind === 'subjective',
                                    );
                                    form.setData({
                                        ...form.data,
                                        is_objective: false,
                                        schema_key: firstSchema?.key ?? '',
                                        is_single: false,
                                    });
                                }}
                            />

                            <KindCard
                                active={form.data.is_objective}
                                label="Objective"
                                icon={<TargetIcon className="size-4" />}
                                onClick={() => {
                                    const firstSchema = questionSchemas.find(
                                        (schema) => schema.kind === 'objective',
                                    );
                                    form.setData({
                                        ...form.data,
                                        is_objective: true,
                                        schema_key: firstSchema?.key ?? '',
                                    });
                                }}
                            />
                        </div>

                        <div>{schemaFields}</div>
                    </SectionCard>
                ) : null}

                <div className="flex items-center justify-end gap-3 pb-2">
                    <Button asChild variant="outline">
                        <Link href={backHref}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        <SaveIcon className="size-4" />
                        {form.processing ? 'Saving...' : submitLabel}
                    </Button>
                </div>
            </form>
        </div>
    );
}

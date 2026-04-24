import { Link } from '@inertiajs/react';
import type { InertiaFormProps } from '@inertiajs/react';
import {
    AlignLeftIcon,
    ArrowLeftIcon,
    CheckCircle2Icon,
    Columns3Icon,
    LanguagesIcon,
    Layers3Icon,
    SaveIcon,
    ScanTextIcon,
    TargetIcon,
    TextCursorInputIcon,
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
import { cn } from '@/lib/utils';

export interface ObjectiveTypeOption {
    id: number;
    name: string;
    heading_en: string;
}

export interface QuestionTypeFormData {
    name: string;
    name_ur: string;
    heading_en: string;
    heading_ur: string;
    description_en: string;
    description_ur: string;
    have_exercise: boolean;
    have_statement: boolean;
    statement_label: string;
    have_description: boolean;
    description_label: string;
    have_answer: boolean;
    is_single: boolean;
    is_objective: boolean;
    objective_type_id: string;
    column_per_row: string;
    status: string;
    [key: string]: boolean | string;
}

interface QuestionTypeFormProps {
    title: string;
    submitLabel: string;
    backHref: string;
    form: InertiaFormProps<QuestionTypeFormData>;
    objectiveTypes: ObjectiveTypeOption[];
    onSubmit: (event: React.FormEvent) => void;
}

const textareaClassName =
    'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[108px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px]';

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
        <section className="space-y-4 rounded-xl border p-5 shadow-sm">
            <div className="flex items-center gap-3">
                <span className="bg-primary/10 text-primary inline-flex size-9 items-center justify-center rounded-lg">
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
        <div className="space-y-1.5">
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

function ToggleTile({
    checked,
    icon,
    label,
    onClick,
}: {
    checked: boolean;
    icon: ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                checked
                    ? 'border-primary/25 bg-primary/5 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/40',
            )}
        >
            <span className="flex items-center gap-3">
                <span
                    className={cn(
                        'inline-flex size-9 items-center justify-center rounded-lg',
                        checked ? 'bg-white/80' : 'bg-muted',
                    )}
                >
                    {icon}
                </span>
                <span className="text-sm font-medium">{label}</span>
            </span>
            <span
                className={cn(
                    'inline-flex h-6 w-11 items-center rounded-full px-1 transition-colors',
                    checked ? 'bg-primary' : 'bg-muted',
                )}
            >
                <span
                    className={cn(
                        'size-4 rounded-full bg-white transition-transform',
                        checked ? 'translate-x-5' : 'translate-x-0',
                    )}
                />
            </span>
        </button>
    );
}

export function QuestionTypeForm({
    title,
    submitLabel,
    backHref,
    form,
    objectiveTypes,
    onSubmit,
}: QuestionTypeFormProps) {
    return (
        <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
            <div className="flex items-center gap-4">
                <Link
                    href={backHref}
                    className="border-input hover:bg-accent flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                >
                    <ArrowLeftIcon className="size-4" />
                </Link>
                <h1 className="h1-semibold">{title}</h1>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
                <SectionCard
                    icon={<TextCursorInputIcon className="size-4" />}
                    title="Identity"
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Name" required error={form.errors.name}>
                            <Input
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                            />
                        </Field>

                        <Field label="Name (Urdu)" error={form.errors.name_ur}>
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
                                    form.setData(
                                        'heading_en',
                                        event.target.value,
                                    )
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
                                    form.setData(
                                        'heading_ur',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>

                        <Field label="Status" required error={form.errors.status}>
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

                        <Field
                            label="Columns Per Row"
                            required
                            error={form.errors.column_per_row}
                        >
                            <Select
                                value={form.data.column_per_row}
                                onValueChange={(value) =>
                                    form.setData('column_per_row', value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5, 6].map((value) => (
                                        <SelectItem
                                            key={value}
                                            value={String(value)}
                                        >
                                            {value}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>

                        <div className="md:col-span-2">
                            <Field
                                label="Objective Type"
                                error={form.errors.objective_type_id}
                            >
                                <Select
                                    value={form.data.objective_type_id || 'none'}
                                    disabled={!form.data.is_objective}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'objective_type_id',
                                            value === 'none' ? '' : value,
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue
                                            placeholder={
                                                form.data.is_objective
                                                    ? 'Select type'
                                                    : 'Enable objective'
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {objectiveTypes.map((item) => (
                                            <SelectItem
                                                key={item.id}
                                                value={String(item.id)}
                                            >
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard
                    icon={<LanguagesIcon className="size-4" />}
                    title="Copy"
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field
                            label="Description (English)"
                            error={form.errors.description_en}
                        >
                            <textarea
                                rows={4}
                                value={form.data.description_en}
                                onChange={(event) =>
                                    form.setData(
                                        'description_en',
                                        event.target.value,
                                    )
                                }
                                className={textareaClassName}
                            />
                        </Field>

                        <Field
                            label="Description (Urdu)"
                            error={form.errors.description_ur}
                        >
                            <textarea
                                dir="rtl"
                                rows={4}
                                value={form.data.description_ur}
                                onChange={(event) =>
                                    form.setData(
                                        'description_ur',
                                        event.target.value,
                                    )
                                }
                                className={textareaClassName}
                            />
                        </Field>
                    </div>
                </SectionCard>

                <SectionCard
                    icon={<Layers3Icon className="size-4" />}
                    title="Behaviour"
                >
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <ToggleTile
                            checked={form.data.have_exercise}
                            icon={<Columns3Icon className="size-4" />}
                            label="Exercise"
                            onClick={() =>
                                form.setData(
                                    'have_exercise',
                                    !form.data.have_exercise,
                                )
                            }
                        />

                        <ToggleTile
                            checked={form.data.have_statement}
                            icon={<ScanTextIcon className="size-4" />}
                            label="Statement"
                            onClick={() =>
                                form.setData({
                                    ...form.data,
                                    have_statement: !form.data.have_statement,
                                    statement_label: form.data.have_statement
                                        ? ''
                                        : form.data.statement_label ||
                                          'Statement',
                                })
                            }
                        />

                        <ToggleTile
                            checked={form.data.have_description}
                            icon={<AlignLeftIcon className="size-4" />}
                            label="Description"
                            onClick={() =>
                                form.setData({
                                    ...form.data,
                                    have_description:
                                        !form.data.have_description,
                                    description_label:
                                        form.data.have_description
                                            ? ''
                                            : form.data.description_label ||
                                              'Description',
                                })
                            }
                        />

                        <ToggleTile
                            checked={form.data.have_answer}
                            icon={<CheckCircle2Icon className="size-4" />}
                            label="Answer"
                            onClick={() =>
                                form.setData(
                                    'have_answer',
                                    !form.data.have_answer,
                                )
                            }
                        />

                        <ToggleTile
                            checked={form.data.is_single}
                            icon={<Columns3Icon className="size-4" />}
                            label="Single"
                            onClick={() =>
                                form.setData('is_single', !form.data.is_single)
                            }
                        />

                        <ToggleTile
                            checked={form.data.is_objective}
                            icon={<TargetIcon className="size-4" />}
                            label="Objective"
                            onClick={() =>
                                form.setData({
                                    ...form.data,
                                    is_objective: !form.data.is_objective,
                                    objective_type_id: form.data.is_objective
                                        ? ''
                                        : form.data.objective_type_id,
                                })
                            }
                        />
                    </div>

                    {form.data.have_statement || form.data.have_description ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            {form.data.have_statement ? (
                                <Field
                                    label="Statement Label"
                                    error={form.errors.statement_label}
                                >
                                    <Input
                                        value={form.data.statement_label}
                                        onChange={(event) =>
                                            form.setData(
                                                'statement_label',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                            ) : null}

                            {form.data.have_description ? (
                                <Field
                                    label="Description Label"
                                    error={form.errors.description_label}
                                >
                                    <Input
                                        value={form.data.description_label}
                                        onChange={(event) =>
                                            form.setData(
                                                'description_label',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                            ) : null}
                        </div>
                    ) : null}
                </SectionCard>

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

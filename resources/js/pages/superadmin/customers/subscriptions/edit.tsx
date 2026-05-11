import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CalendarIcon,
    ClipboardListIcon,
    FileTextIcon,
    HashIcon,
    SaveIcon,
    SchoolIcon,
    UsersIcon,
} from 'lucide-react';
import { useRef } from 'react';
import { HierarchicalAccessControl } from '@/components/subscription-access-control';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import type {
    AccessClass,
    AccessPattern,
    AccessSubject,
    ClassSubjectMap,
    PatternClassMap,
    SubscriptionAccessScope,
} from '@/lib/subscription-access';

interface Customer {
    id: number;
    name: string;
    email: string;
    school_name: string | null;
}

interface SubscriptionData {
    id: number;
    name: string;
    amount: string;
    allowed_questions: number | null;
    started_at: string | null;
    expired_at: string | null;
    status: string;
    allow_teachers: boolean;
    max_teachers: number | null;
    is_question_based: boolean;
    access_scope: SubscriptionAccessScope | null;
}

interface Props {
    customer: Customer;
    subscription: SubscriptionData;
    patterns: AccessPattern[];
    classes: AccessClass[];
    subjects: AccessSubject[];
    patternClassMap: PatternClassMap;
    classSubjectMap: ClassSubjectMap;
}

interface FormData {
    name: string;
    amount: string;
    is_question_based: boolean;
    allowed_questions: string;
    started_at: string;
    expired_at: string;
    status: string;
    access_scope: SubscriptionAccessScope | null;
    allow_teachers: boolean;
    max_teachers: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
    return (
        <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-sm font-medium">{title}</p>
                {description && <p className="text-muted-foreground text-xs">{description}</p>}
            </div>
        </div>
    );
}

function Field({ label, required, error, hint, children }: {
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="min-w-0 space-y-1.5">
            <Label className="flex items-center gap-1">
                {label}
                {required && <span className="text-destructive text-xs">*</span>}
            </Label>
            {children}
            {hint && !error && <p className="text-muted-foreground text-xs">{hint}</p>}
            {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
    );
}

function InputWithIcon({ icon, ...props }: React.ComponentProps<'input'> & { icon: React.ReactNode }) {
    return (
        <div className="relative min-w-0">
            <div className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 [&_svg]:size-4">
                {icon}
            </div>
            <Input className="pl-9" {...props} />
        </div>
    );
}

function ToggleField({ icon, label, checked, onCheckedChange }: {
    icon: React.ReactNode;
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}) {
    return (
        <div className="min-w-0 space-y-1.5">
            <Label>{label}</Label>
            <div className="border-input flex h-9 items-center gap-2 rounded-md border px-3">
                <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
                <span className="text-muted-foreground flex-1 text-sm">{checked ? 'Yes' : 'No'}</span>
                <Switch checked={checked} onCheckedChange={onCheckedChange} />
            </div>
        </div>
    );
}

function DateInput({ className, ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <div className="relative">
            <Input
                ref={ref}
                type="date"
                className={`pr-9${className ? ` ${className}` : ''}`}
                {...props}
            />
            <button
                type="button"
                tabIndex={-1}
                onClick={() => ref.current?.showPicker?.()}
                className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
            >
                <CalendarIcon className="size-4" />
            </button>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditCustomerSubscription({ customer, subscription, patterns, classes, subjects, patternClassMap, classSubjectMap }: Props) {
    const { data, setData, put, processing, errors } = useForm<FormData>({
        name: subscription.name,
        amount: subscription.amount,
        is_question_based: subscription.is_question_based,
        allowed_questions: subscription.allowed_questions != null ? String(subscription.allowed_questions) : '',
        started_at: subscription.started_at ?? '',
        expired_at: subscription.expired_at ?? '',
        status: subscription.status,
        access_scope: subscription.access_scope,
        allow_teachers: subscription.allow_teachers,
        max_teachers: subscription.max_teachers != null ? String(subscription.max_teachers) : '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/superadmin/customers/${customer.id}/subscriptions/${subscription.id}`);
    };

    return (
        <>
            <Head title={`Edit Subscription — ${subscription.name}`} />

            <div className="w-full min-w-0 space-y-6 p-4 md:p-6">
                <div className="flex min-w-0 items-center gap-4">
                    <Link
                        href={`/superadmin/customers/${customer.id}/subscriptions/${subscription.id}`}
                        className="hover:bg-accent border-input flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <h1 className="h1-semibold">Edit Subscription</h1>
                    </div>
                </div>

                <div className="w-full min-w-0 rounded-xl border p-5 shadow-sm">
                    <SectionHeader
                        icon={<SchoolIcon className="size-4" />}
                        title={customer.name}
                        description={customer.school_name ?? customer.email}
                    />
                </div>

                <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-5">

                    {/* ── Subscription Details ───────────────────────────────── */}
                    <div className="w-full min-w-0 space-y-5 rounded-xl border p-5 shadow-sm">
                        <SectionHeader icon={<FileTextIcon className="size-4" />} title="Subscription" />
                        <Separator />

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            <Field label="Plan Name" required error={errors.name}>
                                <InputWithIcon
                                    icon={<FileTextIcon />}
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                />
                            </Field>

                            <Field label="Amount" required error={errors.amount}>
                                <div className="relative">
                                    <div className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-medium">
                                        Rs.
                                    </div>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
                                        className="pl-11"
                                        value={data.amount}
                                        onChange={(e) => setData('amount', e.target.value)}
                                    />
                                </div>
                            </Field>

                            <Field label="Start Date" required error={errors.started_at}>
                                <DateInput
                                    value={data.started_at}
                                    onChange={(e) => setData('started_at', e.target.value)}
                                />
                            </Field>

                            <Field label="Expiry Date" required error={errors.expired_at}>
                                <DateInput
                                    min={data.started_at || undefined}
                                    value={data.expired_at}
                                    onChange={(e) => setData('expired_at', e.target.value)}
                                />
                            </Field>

                            <Field label="Duration (days)">
                                <Input
                                    type="number"
                                    disabled
                                    value={(() => {
                                        if (!data.started_at || !data.expired_at) return '';
                                        const diff = Math.round(
                                            (new Date(data.expired_at).getTime() - new Date(data.started_at).getTime()) /
                                            86_400_000,
                                        );
                                        return diff > 0 ? String(diff) : '';
                                    })()}
                                    placeholder="—"
                                    className="bg-muted/40 text-muted-foreground cursor-default"
                                />
                            </Field>

                            <Field label="Status" required error={errors.status}>
                                <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="expired">Expired</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <ToggleField
                                icon={<ClipboardListIcon />}
                                label="Question Based"
                                checked={data.is_question_based}
                                onCheckedChange={(checked) => {
                                    setData('is_question_based', checked);
                                    if (!checked) setData('allowed_questions', '');
                                }}
                            />

                            {data.is_question_based && (
                                <Field label="Allowed Questions" required error={errors.allowed_questions}>
                                    <InputWithIcon
                                        icon={<HashIcon />}
                                        type="number"
                                        min="0"
                                        value={data.allowed_questions}
                                        onChange={(e) => setData('allowed_questions', e.target.value)}
                                    />
                                </Field>
                            )}

                            <ToggleField
                                icon={<UsersIcon />}
                                label="Allow Teachers"
                                checked={data.allow_teachers}
                                onCheckedChange={(checked) => {
                                    setData('allow_teachers', checked);
                                    if (!checked) setData('max_teachers', '');
                                }}
                            />

                            {data.allow_teachers && (
                                <Field label="Max Teachers" error={errors.max_teachers}>
                                    <InputWithIcon
                                        icon={<UsersIcon />}
                                        type="number"
                                        min="1"
                                        value={data.max_teachers}
                                        onChange={(e) => setData('max_teachers', e.target.value)}
                                    />
                                </Field>
                            )}
                        </div>
                    </div>

                    {/* ── Access Control ─────────────────────────────────────── */}
                    <HierarchicalAccessControl
                        patterns={patterns}
                        classes={classes}
                        subjects={subjects}
                        patternClassMap={patternClassMap}
                        classSubjectMap={classSubjectMap}
                        value={data.access_scope}
                        onChange={(val) => setData('access_scope', val)}
                        error={errors.access_scope}
                    />

                    {/* ── Actions ──────────────────────────────────────────────── */}
                    <div className="flex items-center justify-end gap-3 pb-2">
                        <Link
                            href={`/superadmin/customers/${customer.id}/subscriptions/${subscription.id}`}
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
                            {processing ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

EditCustomerSubscription.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Customers', href: '/superadmin/customers' },
        { title: 'Edit Subscription' },
    ],
};

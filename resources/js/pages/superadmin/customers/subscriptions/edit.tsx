import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CalendarIcon,
    FileTextIcon,
    HashIcon,
    LockIcon,
    SaveIcon,
    SchoolIcon,
    UsersIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { HierarchicalAccessControl } from '@/components/subscription-access-control';

interface Customer {
    id: number;
    name: string;
    email: string;
    school_name: string | null;
}

interface Pattern {
    id: number;
    name: string;
    short_name: string;
}

interface SchoolClass {
    id: number;
    name: string;
}

interface Subject {
    id: number;
    name_eng: string;
    name_ur: string;
}

interface SubscriptionData {
    id: number;
    name: string;
    amount: string;
    allowed_questions: number;
    started_at: string | null;
    duration: number;
    status: string;
    allow_teachers: boolean;
    max_teachers: number | null;
    pattern_access: number[] | null;
    class_access: number[] | null;
    subject_access: number[] | null;
}

interface Props {
    customer: Customer;
    subscription: SubscriptionData;
    patterns: Pattern[];
    classes: SchoolClass[];
    subjects: Subject[];
    patternClassMap: Record<string, number[]>;
    classSubjectMap: Record<string, number[]>;
}

interface FormData {
    name: string;
    amount: string;
    allowed_questions: string;
    started_at: string;
    duration: string;
    status: string;
    pattern_access: number[] | null;
    class_access: number[] | null;
    subject_access: number[] | null;
    allow_teachers: boolean;
    max_teachers: string;
    [key: string]: string | boolean | number[] | null;
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-muted-foreground text-xs">{description}</p>
            </div>
        </div>
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

function InputWithIcon({ icon, ...props }: React.ComponentProps<'input'> & { icon: React.ReactNode }) {
    return (
        <div className="relative">
            <div className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 [&_svg]:size-4">
                {icon}
            </div>
            <Input className="pl-9" {...props} />
        </div>
    );
}


export default function EditCustomerSubscription({ customer, subscription, patterns, classes, subjects, patternClassMap, classSubjectMap }: Props) {
    const { data, setData, put, processing, errors } = useForm<FormData>({
        name: subscription.name,
        amount: subscription.amount,
        allowed_questions: String(subscription.allowed_questions),
        started_at: subscription.started_at ?? '',
        duration: String(subscription.duration),
        status: subscription.status,
        pattern_access: subscription.pattern_access,
        class_access: subscription.class_access,
        subject_access: subscription.subject_access,
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

            <div className="space-y-6 p-4 md:p-6">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/superadmin/customers/${customer.id}/subscriptions/${subscription.id}`}
                        className="hover:bg-accent border-input flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <h1 className="h1-semibold">Edit Subscription</h1>
                        <p className="text-muted-foreground text-sm">{subscription.name}</p>
                    </div>
                </div>

                <div className="rounded-xl border p-5 shadow-sm">
                    <SectionHeader
                        icon={<SchoolIcon className="size-4" />}
                        title={customer.name}
                        description={customer.school_name ?? customer.email}
                    />
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* ── Subscription Details ───────────────────────────────── */}
                    <div className="space-y-5 rounded-xl border p-5 shadow-sm">
                        <SectionHeader
                            icon={<FileTextIcon className="size-4" />}
                            title="Subscription Details"
                            description="Plan name, billing, duration, status, and teacher permissions"
                        />
                        <Separator />

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                                        step="0.01"
                                        className="pl-11"
                                        value={data.amount}
                                        onChange={(e) => setData('amount', e.target.value)}
                                    />
                                </div>
                            </Field>

                            <Field label="Allowed Questions" required error={errors.allowed_questions}>
                                <InputWithIcon
                                    icon={<HashIcon />}
                                    type="number"
                                    min="0"
                                    value={data.allowed_questions}
                                    onChange={(e) => setData('allowed_questions', e.target.value)}
                                />
                            </Field>

                            <Field label="Duration (Days)" required error={errors.duration}>
                                <InputWithIcon
                                    icon={<CalendarIcon />}
                                    type="number"
                                    min="1"
                                    value={data.duration}
                                    onChange={(e) => setData('duration', e.target.value)}
                                />
                            </Field>

                            <Field label="Start Date" required error={errors.started_at}>
                                <Input
                                    type="date"
                                    value={data.started_at}
                                    onChange={(e) => setData('started_at', e.target.value)}
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

                            <div className="col-span-full">
                                <Separator />
                            </div>

                            <div className="col-span-full flex items-center justify-between rounded-lg border p-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
                                        <UsersIcon className="size-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Allow Adding Teachers</p>
                                        <p className="text-muted-foreground text-xs">
                                            Enable this to let the customer manage teacher accounts
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    checked={data.allow_teachers}
                                    onCheckedChange={(checked) => {
                                        setData('allow_teachers', checked);
                                        if (!checked) setData('max_teachers', '');
                                    }}
                                />
                            </div>

                            {data.allow_teachers && (
                                <Field label="Max Teachers" error={errors.max_teachers}>
                                    <InputWithIcon
                                        icon={<UsersIcon />}
                                        type="number"
                                        min="1"
                                        placeholder="Blank = unlimited"
                                        value={data.max_teachers}
                                        onChange={(e) => setData('max_teachers', e.target.value)}
                                    />
                                    <p className="text-muted-foreground text-xs">
                                        Leave blank to allow unlimited teachers.
                                    </p>
                                </Field>
                            )}
                        </div>
                    </div>

                    {/* ── Access Control ─────────────────────────────────────── */}
                    <div className="space-y-4 rounded-xl border p-5 shadow-sm">
                        <SectionHeader
                            icon={<LockIcon className="size-4" />}
                            title="Access Control"
                            description="Define which patterns, classes, and subjects this plan grants access to"
                        />

                        <HierarchicalAccessControl
                            patterns={patterns}
                            classes={classes}
                            subjects={subjects}
                            patternClassMap={patternClassMap}
                            classSubjectMap={classSubjectMap}
                            patternAccess={data.pattern_access as number[] | null}
                            classAccess={data.class_access as number[] | null}
                            subjectAccess={data.subject_access as number[] | null}
                            onPatternChange={(val) => setData('pattern_access', val)}
                            onClassChange={(val) => setData('class_access', val)}
                            onSubjectChange={(val) => setData('subject_access', val)}
                        />
                    </div>

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

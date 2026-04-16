import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CalendarIcon,
    CreditCardIcon,
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
import { Checkbox } from '@/components/ui/checkbox';

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

interface Props {
    customer: Customer;
    patterns: Pattern[];
    classes: SchoolClass[];
    subjects: Subject[];
}

interface FormData {
    name: string;
    amount: string;
    allowed_questions: string;
    started_at: string;
    duration: string;
    status: string;
    payment_method: string;
    account_number: string;
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

/** Checkbox list with a "Select All" header row.
 *  value === null  → all access (every item checked)
 *  value === []    → no items selected
 *  value === [1,2] → specific IDs selected
 */
function AccessSelector<T extends { id: number }>({
    label,
    items,
    renderLabel,
    value,
    onChange,
    error,
}: {
    label: string;
    items: T[];
    renderLabel: (item: T) => string;
    value: number[] | null;
    onChange: (val: number[] | null) => void;
    error?: string;
}) {
    const isAll = value === null;
    const selected = value ?? [];
    const allChecked = isAll || selected.length === items.length;
    const someChecked = !isAll && selected.length > 0 && selected.length < items.length;

    function toggleSelectAll(checked: boolean) {
        onChange(checked ? null : []);
    }

    function toggleItem(id: number, checked: boolean) {
        if (isAll) {
            // was "all" — deselect everything except the one just unchecked
            onChange(checked ? items.map((i) => i.id) : items.map((i) => i.id).filter((v) => v !== id));
        } else {
            const next = checked ? [...selected, id] : selected.filter((v) => v !== id);
            // if every item is now checked, promote back to null (all access)
            onChange(next.length === items.length ? null : next);
        }
    }

    return (
        <div className="space-y-2">
            <div className="border-input rounded-lg border">
                {/* Header row — Select All */}
                <label className="bg-muted/40 flex cursor-pointer items-center gap-2.5 rounded-t-lg border-b px-3 py-2.5">
                    <Checkbox
                        checked={allChecked}
                        data-state={someChecked ? 'indeterminate' : allChecked ? 'checked' : 'unchecked'}
                        onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                        className={someChecked ? 'opacity-60' : ''}
                    />
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-muted-foreground ml-auto text-xs">
                        {isAll ? 'All access' : selected.length === 0 ? 'None selected' : `${selected.length} of ${items.length} selected`}
                    </span>
                </label>

                {/* Item rows */}
                {items.length === 0 ? (
                    <p className="text-muted-foreground px-3 py-3 text-xs">No items available.</p>
                ) : (
                    <div className="grid gap-px p-2 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((item) => (
                            <label
                                key={item.id}
                                className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
                            >
                                <Checkbox
                                    checked={isAll || selected.includes(item.id)}
                                    onCheckedChange={(checked) => toggleItem(item.id, !!checked)}
                                />
                                <span>{renderLabel(item)}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
    );
}

export default function AddCustomerSubscription({ customer, patterns, classes, subjects }: Props) {
    const today = new Date().toISOString().slice(0, 10);

    const { data, setData, post, processing, errors } = useForm<FormData>({
        name: '',
        amount: '',
        allowed_questions: '',
        started_at: today,
        duration: '30',
        status: 'active',
        payment_method: 'cash',
        account_number: '',
        pattern_access: null,
        class_access: null,
        subject_access: null,
        allow_teachers: false,
        max_teachers: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/superadmin/customers/${customer.id}/subscriptions`);
    };

    return (
        <>
            <Head title={`Add Subscription - ${customer.name}`} />

            <div className="space-y-6 p-4 md:p-6">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/superadmin/customers/${customer.id}`}
                        className="hover:bg-accent border-input flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <h1 className="h1-semibold">Add Subscription</h1>
                        <p className="text-muted-foreground text-sm">Create a new subscription for this customer</p>
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

                            <Field label="Payment Method" required error={errors.payment_method}>
                                <Select value={data.payment_method} onValueChange={(value) => setData('payment_method', value)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="online">Online</SelectItem>
                                        <SelectItem value="cheque">Cheque</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Account Number" error={errors.account_number}>
                                <InputWithIcon
                                    icon={<CreditCardIcon />}
                                    value={data.account_number}
                                    onChange={(e) => setData('account_number', e.target.value)}
                                />
                            </Field>

                            {/* ── Teacher Permissions ──────────────────────────── */}
                            <div className="col-span-full">
                                <Separator />
                            </div>

                            {/* Allow Teachers toggle — spans full width */}
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

                            {/* Max Teachers — only visible when teachers are allowed */}
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
                    <div className="space-y-6 rounded-xl border p-5 shadow-sm">
                        <SectionHeader
                            icon={<LockIcon className="size-4" />}
                            title="Access Control"
                            description="Define which patterns, classes, and subjects this plan grants access to"
                        />
                        <Separator />

                        <AccessSelector
                            label="Patterns"
                            items={patterns}
                            renderLabel={(p) => p.short_name ? `${p.name} (${p.short_name})` : p.name}
                            value={data.pattern_access as number[] | null}
                            onChange={(val) => setData('pattern_access', val)}
                            error={errors.pattern_access}
                        />

                        <Separator />

                        <AccessSelector
                            label="Classes"
                            items={classes}
                            renderLabel={(c) => c.name}
                            value={data.class_access as number[] | null}
                            onChange={(val) => setData('class_access', val)}
                            error={errors.class_access}
                        />

                        <Separator />

                        <AccessSelector
                            label="Subjects"
                            items={subjects}
                            renderLabel={(s) => s.name_eng}
                            value={data.subject_access as number[] | null}
                            onChange={(val) => setData('subject_access', val)}
                            error={errors.subject_access}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pb-2">
                        <Link
                            href={`/superadmin/customers/${customer.id}`}
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
                            {processing ? 'Saving...' : 'Save Subscription'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

AddCustomerSubscription.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Customers', href: '/superadmin/customers' },
        { title: 'Add Subscription' },
    ],
};

import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    BanknoteIcon,
    CalendarIcon,
    ClipboardListIcon,
    CoinsIcon,
    CreditCardIcon,
    FileTextIcon,
    HashIcon,
    PaperclipIcon,
    SaveIcon,
    SchoolIcon,
    UsersIcon,
    WalletIcon,
} from 'lucide-react';
import { useRef, useState } from 'react';
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

interface Props {
    customer: Customer;
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
    // Payment
    has_payment: boolean;
    payment_paid: string;
    commission_amount: string;
    payment_method: string;
    next_payment_date: string;
    receipt: File | null;
    payment_notes: string;
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

function CompletionRing({ percent }: { percent: number }) {
    const r      = 20;
    const circ   = 2 * Math.PI * r;
    const offset = circ - (percent / 100) * circ;
    const color  = percent === 100 ? '#10b981' : percent >= 60 ? '#f59e0b' : '#6366f1';
    return (
        <div className="flex shrink-0 items-center gap-2">
            <div className="relative size-12">
                <svg className="size-full -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r={r} fill="none" strokeWidth="4" className="stroke-muted" />
                    <circle cx="24" cy="24" r={r} fill="none" strokeWidth="4" stroke={color}
                        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color }}>
                    {percent}%
                </span>
            </div>
            <div className="hidden text-right sm:block">
                <p className="text-xs font-medium">Subscription</p>
                <p className="text-muted-foreground text-xs">{percent === 100 ? 'Complete' : 'In progress'}</p>
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

export default function AddCustomerSubscription({ customer, patterns, classes, subjects, patternClassMap, classSubjectMap }: Props) {
    const today = new Date().toISOString().slice(0, 10);
    const receiptRef = useRef<HTMLInputElement>(null);
    const [receiptName, setReceiptName] = useState<string | null>(null);

    const { data, setData, post, processing, errors } = useForm<FormData>({
        name: '',
        amount: '',
        is_question_based: false,
        allowed_questions: '',
        started_at: today,
        expired_at: '',
        status: 'active',
        access_scope: null,
        allow_teachers: false,
        max_teachers: '',
        has_payment: false,
        payment_paid: '',
        commission_amount: '',
        payment_method: 'online',
        next_payment_date: '',
        receipt: null,
        payment_notes: '',
    });

    const subAmount = parseInt(data.amount) || 0;
    const paidAmount = parseInt(data.payment_paid) || 0;
    const dues = data.has_payment ? Math.max(0, subAmount - paidAmount) : 0;
    const nextPmtRequired = data.has_payment && dues > 0;

    const completionPercent = Math.round(
        [
            data.name,
            data.amount,
            data.expired_at,
            !data.is_question_based || Boolean(data.allowed_questions),
            !data.has_payment || Boolean(data.payment_paid),
            !data.allow_teachers || Boolean(data.max_teachers),
        ].filter(Boolean).length / 6 * 100,
    );

    const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setData('receipt', file);
        setReceiptName(file ? file.name : null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/superadmin/customers/${customer.id}/subscriptions`);
    };

    return (
        <>
            <Head title={`Add Subscription - ${customer.name}`} />

            <div className="w-full min-w-0 space-y-6 p-4 md:p-6">
                <div className="flex min-w-0 items-center gap-4">
                    <Link
                        href={`/superadmin/customers/${customer.id}`}
                        className="hover:bg-accent border-input flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="h1-semibold">Add Subscription</h1>
                    </div>
                    <CompletionRing percent={completionPercent} />
                </div>

                <div className="w-full min-w-0 rounded-xl border p-5 shadow-sm">
                    <SectionHeader
                        icon={<SchoolIcon className="size-4" />}
                        title={customer.name}
                        description={customer.school_name ?? customer.email}
                    />
                </div>

                <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-5" encType="multipart/form-data">

                    {/* ── Subscription Details + Initial Payment ────────────── */}
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
                                    min={data.started_at || today}
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

                        {/* ── Initial Payment sub-section ────────────────────── */}
                        <Separator />
                        <div className="flex items-center justify-between gap-4">
                            <SectionHeader
                                icon={<WalletIcon className="size-4" />}
                                title="Initial Payment"
                                description="Optionally log a payment with this subscription"
                            />
                            <Switch
                                checked={data.has_payment}
                                onCheckedChange={(checked) => {
                                    setData('has_payment', checked);
                                    if (!checked) {
                                        setData('payment_paid', '');
                                        setData('commission_amount', '');
                                        setData('payment_method', 'online');
                                        setData('next_payment_date', '');
                                        setData('receipt', null);
                                        setData('payment_notes', '');
                                        setReceiptName(null);
                                    }
                                }}
                            />
                        </div>

                        {data.has_payment && (
                            <>
                                {/* Row 1: Amount (ref) | Paid | Dues */}
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <Field label="Subscription Amount">
                                        <div className="relative">
                                            <div className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-medium">
                                                Rs.
                                            </div>
                                            <Input
                                                type="text"
                                                className="bg-muted/40 pl-11"
                                                value={subAmount ? subAmount.toLocaleString() : '—'}
                                                disabled
                                                readOnly
                                            />
                                        </div>
                                    </Field>

                                    <Field label="Paid" required error={errors.payment_paid}>
                                        <div className="relative">
                                            <div className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 [&_svg]:size-4">
                                                <BanknoteIcon />
                                            </div>
                                            <Input
                                                type="number"
                                                min="1"
                                                onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
                                                className="pl-9"
                                                value={data.payment_paid}
                                                onChange={(e) => setData('payment_paid', e.target.value)}
                                            />
                                        </div>
                                    </Field>

                                    <Field label="Dues (auto)">
                                        <div className="relative">
                                            <div className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-medium">
                                                Rs.
                                            </div>
                                            <Input
                                                type="text"
                                                className="bg-muted/40 pl-11 font-medium text-destructive"
                                                value={dues ? dues.toLocaleString() : '0'}
                                                disabled
                                                readOnly
                                            />
                                        </div>
                                    </Field>
                                </div>

                                {/* Row 2: Commission | Method | Next Payment Date */}
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <Field label="Commission Amount" error={errors.commission_amount}>
                                        <div className="relative">
                                            <div className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 [&_svg]:size-4">
                                                <CoinsIcon />
                                            </div>
                                            <Input
                                                type="number"
                                                min="0"
                                                onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
                                                className="pl-9"
                                                value={data.commission_amount}
                                                onChange={(e) => setData('commission_amount', e.target.value)}
                                                placeholder="Optional"
                                            />
                                        </div>
                                    </Field>

                                    <Field label="Payment Method" required error={errors.payment_method}>
                                        <Select value={data.payment_method} onValueChange={(v) => setData('payment_method', v)}>
                                            <SelectTrigger className="w-full">
                                                <div className="flex items-center gap-2">
                                                    <CreditCardIcon className="text-muted-foreground size-4 shrink-0" />
                                                    <SelectValue />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cash">Cash</SelectItem>
                                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                                <SelectItem value="online">Online</SelectItem>
                                                <SelectItem value="cheque">Cheque</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    <Field
                                        label="Next Payment Date"
                                        required={nextPmtRequired}
                                        error={errors.next_payment_date}
                                    >
                                        <DateInput
                                            value={data.next_payment_date}
                                            onChange={(e) => setData('next_payment_date', e.target.value)}
                                        />
                                    </Field>
                                </div>

                                {/* Row 3: Receipt | Notes */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label="Receipt" error={errors.receipt as string | undefined}>
                                        <div
                                            onClick={() => receiptRef.current?.click()}
                                            className="border-input bg-muted/20 hover:bg-muted/40 flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 transition-colors"
                                        >
                                            <PaperclipIcon className="text-muted-foreground size-4 shrink-0" />
                                            <span className="text-muted-foreground flex-1 truncate text-sm">
                                                {receiptName ?? 'Click to upload…'}
                                            </span>
                                            {receiptName && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setData('receipt', null);
                                                        setReceiptName(null);
                                                        if (receiptRef.current) receiptRef.current.value = '';
                                                    }}
                                                    className="text-muted-foreground hover:text-destructive text-xs"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground text-xs">JPG, PNG, PDF, WebP · max 5 MB</p>
                                        <input
                                            ref={receiptRef}
                                            type="file"
                                            accept="image/jpg,image/jpeg,image/png,image/webp,application/pdf"
                                            className="hidden"
                                            onChange={handleReceiptChange}
                                        />
                                    </Field>

                                    <Field label="Submission Note" error={errors.payment_notes}>
                                        <textarea
                                            rows={2}
                                            value={data.payment_notes}
                                            onChange={(e) => setData('payment_notes', e.target.value)}
                                            placeholder="Any notes about this payment…"
                                            className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px]"
                                        />
                                    </Field>
                                </div>
                            </>
                        )}
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

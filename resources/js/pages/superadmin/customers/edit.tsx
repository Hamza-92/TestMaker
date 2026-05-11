import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ImageIcon,
    MailIcon,
    MapPinIcon,
    PhoneIcon,
    SaveIcon,
    SchoolIcon,
    UserIcon,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface Customer {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    account_type: string;
    school_name: string | null;
    logo: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    is_show_address: boolean;
}

interface FormData {
    _method: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    account_type: string;
    school_name: string;
    logo: File | null;
    remove_logo: boolean;
    address: string;
    city: string;
    province: string;
    is_show_address: boolean;
    [key: string]: string | boolean | File | null;
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
                    <circle
                        cx="24" cy="24" r={r}
                        fill="none" strokeWidth="4" stroke={color}
                        strokeDasharray={circ} strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color }}>
                    {percent}%
                </span>
            </div>
            <div className="hidden text-right sm:block">
                <p className="text-xs font-medium">Profile</p>
                <p className="text-muted-foreground text-xs">Complete</p>
            </div>
        </div>
    );
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-muted-foreground text-xs">{description}</p>
            </div>
        </div>
    );
}

function FieldGroup({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 | 4 }) {
    const colClass = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[cols];
    return <div className={`grid min-w-0 gap-4 ${colClass}`}>{children}</div>;
}

function Field({ label, required, error, children }: {
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="min-w-0 space-y-1.5">
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
        <div className="relative min-w-0">
            <div className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 [&_svg]:size-4">
                {icon}
            </div>
            <Input className="pl-9" {...props} />
        </div>
    );
}

export default function EditCustomer({ customer }: { customer: Customer }) {
    const [logoPreview, setLogoPreview] = useState<string | null>(customer.logo ? `/storage/${customer.logo}` : null);
    const logoRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors } = useForm<FormData>({
        _method:         'put',
        name:            customer.name,
        email:           customer.email,
        phone:           customer.phone ?? '',
        status:          customer.status,
        account_type:    customer.account_type,
        school_name:     customer.school_name ?? '',
        logo:            null,
        remove_logo:     false,
        address:         customer.address ?? '',
        city:            customer.city ?? '',
        province:        customer.province ?? '',
        is_show_address: customer.is_show_address,
    });

    const completionPercent = Math.round(
        [
            data.name, data.email, data.phone,
            data.school_name, logoPreview,
            data.address, data.city, data.province,
        ].filter(Boolean).length / 8 * 100,
    );

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setData('logo', file);
        setData('remove_logo', false);
        setLogoPreview(file ? URL.createObjectURL(file) : customer.logo ? `/storage/${customer.logo}` : null);
    };

    const handleRemoveLogo = () => {
        setLogoPreview(null);
        setData('logo', null);
        setData('remove_logo', true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/superadmin/customers/${customer.id}`);
    };

    return (
        <>
            <Head title={`Edit Customer - ${customer.name}`} />
            <div className="w-full min-w-0 space-y-6 p-4 md:p-6">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex min-w-0 items-center gap-4">
                    <Link
                        href={`/superadmin/customers/${customer.id}`}
                        className="hover:bg-accent border-input flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="h1-semibold">Edit Customer</h1>
                        <p className="text-muted-foreground text-sm">Update customer account and school details</p>
                    </div>
                    <CompletionRing percent={completionPercent} />
                </div>

                <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-5">

                    {/* ── Section 1: Account Details ───────────────────────── */}
                    <div className="w-full min-w-0 space-y-4 rounded-xl border p-5 shadow-sm">
                        <SectionHeader
                            icon={<UserIcon className="size-4" />}
                            title="Account Details"
                            description="Basic customer account information"
                        />
                        <Separator />

                        {/* Row 1: Name | Email | Phone | School Name */}
                        <FieldGroup cols={4}>
                            <Field label="Full Name" required error={errors.name}>
                                <InputWithIcon icon={<UserIcon />} value={data.name} onChange={(e) => setData('name', e.target.value)} />
                            </Field>
                            <Field label="Email Address" required error={errors.email}>
                                <InputWithIcon
                                    icon={<MailIcon />}
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                />
                            </Field>
                            <Field label="Phone Number" required error={errors.phone}>
                                <InputWithIcon
                                    icon={<PhoneIcon />}
                                    type="tel"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                />
                            </Field>
                            <Field label="School Name" error={errors.school_name}>
                                <InputWithIcon
                                    icon={<SchoolIcon />}
                                    value={data.school_name}
                                    onChange={(e) => setData('school_name', e.target.value)}
                                />
                            </Field>
                        </FieldGroup>

                        {/* Row 2: Status | Account Type */}
                        <FieldGroup cols={2}>
                            <Field label="Status" required error={errors.status}>
                                <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="suspended">Suspended</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Account Type" required error={errors.account_type}>
                                <Select value={data.account_type} onValueChange={(value) => setData('account_type', value)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="trial">
                                            <span className="flex items-center gap-2">
                                                <span className="size-2 rounded-full bg-amber-400" /> Trial
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="paid">
                                            <span className="flex items-center gap-2">
                                                <span className="size-2 rounded-full bg-emerald-500" /> Paid
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                        </FieldGroup>
                    </div>

                    {/* ── Section 2: Location & Logo ───────────────────────── */}
                    <div className="w-full min-w-0 space-y-4 rounded-xl border p-5 shadow-sm">
                        <SectionHeader
                            icon={<SchoolIcon className="size-4" />}
                            title="Location & Logo"
                            description="School logo and geographic information"
                        />
                        <Separator />

                        {/* Logo */}
                        <div className="space-y-1.5">
                            <Label>School Logo</Label>
                            <div className="flex items-center gap-3">
                                <div
                                    onClick={() => logoRef.current?.click()}
                                    className="border-input bg-muted/30 hover:bg-muted/60 flex size-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors"
                                >
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" className="size-full object-cover" />
                                    ) : (
                                        <ImageIcon className="text-muted-foreground size-5" />
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => logoRef.current?.click()}
                                        className="border-input hover:bg-accent flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors"
                                    >
                                        {logoPreview ? 'Change' : 'Upload'}
                                    </button>
                                    {logoPreview && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveLogo}
                                            className="text-destructive text-xs hover:underline"
                                        >
                                            Remove
                                        </button>
                                    )}
                                    <p className="text-muted-foreground text-xs">PNG, JPG · max 2MB</p>
                                </div>
                            </div>
                            {errors.logo && <p className="text-destructive text-xs">{errors.logo as string}</p>}
                            <input ref={logoRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoChange} />
                        </div>

                        {/* Address | City | Province | Show Address */}
                        <FieldGroup cols={4}>
                            <Field label="Address" error={errors.address}>
                                <InputWithIcon
                                    icon={<MapPinIcon />}
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                />
                            </Field>
                            <Field label="City" error={errors.city}>
                                <Input value={data.city} onChange={(e) => setData('city', e.target.value)} />
                            </Field>
                            <Field label="Province" error={errors.province}>
                                <Input value={data.province} onChange={(e) => setData('province', e.target.value)} />
                            </Field>
                            <div className="flex items-end pb-1">
                                <div className="flex items-center gap-2.5">
                                    <Checkbox
                                        id="is_show_address"
                                        checked={data.is_show_address}
                                        onCheckedChange={(checked) => setData('is_show_address', Boolean(checked))}
                                    />
                                    <label htmlFor="is_show_address" className="cursor-pointer select-none text-sm">
                                        Show address publicly
                                    </label>
                                </div>
                            </div>
                        </FieldGroup>
                    </div>

                    {/* ── Actions ──────────────────────────────────────────── */}
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
                            {processing ? 'Saving...' : 'Update Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

EditCustomer.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Customers', href: '/superadmin/customers' },
        { title: 'Edit Customer' },
    ],
};

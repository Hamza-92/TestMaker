import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    EyeIcon,
    EyeOffIcon,
    ImageIcon,
    KeyRoundIcon,
    LockIcon,
    MailIcon,
    MapPinIcon,
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

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormData {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    status: string;
    school_name: string;
    logo: File | null;
    address: string;
    city: string;
    province: string;
    is_show_address: boolean;
    [key: string]: string | boolean | File | null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
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

function FieldGroup({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
    const colClass = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }[cols];
    return <div className={`grid gap-4 ${colClass}`}>{children}</div>;
}

function Field({ label, required, error, children }: {
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AddCustomer() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm]   = useState(false);
    const [logoPreview, setLogoPreview]   = useState<string | null>(null);
    const logoRef                         = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors } = useForm<FormData>({
        name:                  '',
        email:                 '',
        password:              '',
        password_confirmation: '',
        status:                'active',
        school_name:           '',
        logo:                  null,
        address:               '',
        city:                  '',
        province:              '',
        is_show_address:       false,
    });

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setData('logo', file);
        setLogoPreview(file ? URL.createObjectURL(file) : null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/superadmin/customers');
    };

    return (
        <>
            <Head title="Add Customer" />
            <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/superadmin/customers"
                        className="hover:bg-accent border-input flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <h1 className="h1-semibold">Add Customer</h1>
                        <p className="text-muted-foreground text-sm">Register a new customer account</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* ── Section 1: Account & Security ────────────────────── */}
                    <div className="space-y-5 rounded-xl border p-5 shadow-sm">
                        <SectionHeader
                            icon={<UserIcon className="size-4" />}
                            title="Account & Security"
                            description="Login credentials and account status"
                        />
                        <Separator />

                        {/* Row 1: Name + Email */}
                        <FieldGroup cols={2}>
                            <Field label="Full Name" required error={errors.name}>
                                <InputWithIcon
                                    icon={<UserIcon />}
                                    placeholder="John Doe"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                />
                            </Field>
                            <Field label="Email Address" required error={errors.email}>
                                <InputWithIcon
                                    icon={<MailIcon />}
                                    type="email"
                                    placeholder="john@example.com"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                />
                            </Field>
                        </FieldGroup>

                        {/* Row 2: Password + Confirm + Status */}
                        <FieldGroup cols={3}>
                            <Field label="Password" required error={errors.password}>
                                <div className="relative">
                                    <div className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
                                        <LockIcon className="size-4" />
                                    </div>
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Min. 8 characters"
                                        className="px-9"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                                    >
                                        {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                                    </button>
                                </div>
                            </Field>
                            <Field label="Confirm Password" required error={errors.password_confirmation}>
                                <div className="relative">
                                    <div className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
                                        <KeyRoundIcon className="size-4" />
                                    </div>
                                    <Input
                                        type={showConfirm ? 'text' : 'password'}
                                        placeholder="Re-enter password"
                                        className="px-9"
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm((v) => !v)}
                                        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                                    >
                                        {showConfirm ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                                    </button>
                                </div>
                            </Field>
                            <Field label="Status" required error={errors.status}>
                                <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">
                                            <span className="flex items-center gap-2">
                                                <span className="size-2 rounded-full bg-emerald-500" /> Active
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="inactive">
                                            <span className="flex items-center gap-2">
                                                <span className="size-2 rounded-full bg-gray-400" /> Inactive
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="suspended">
                                            <span className="flex items-center gap-2">
                                                <span className="size-2 rounded-full bg-red-500" /> Suspended
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                        </FieldGroup>
                    </div>

                    {/* ── Section 2: School & Location ─────────────────────── */}
                    <div className="space-y-5 rounded-xl border p-5 shadow-sm">
                        <SectionHeader
                            icon={<SchoolIcon className="size-4" />}
                            title="School & Location"
                            description="School details and geographic information"
                        />
                        <Separator />

                        {/* Row 1: School name + Logo upload side by side */}
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                            {/* Logo */}
                            <div className="space-y-1.5">
                                <Label>School Logo</Label>
                                <div className="flex items-center gap-3">
                                    <div
                                        onClick={() => logoRef.current?.click()}
                                        className="border-input bg-muted/30 hover:bg-muted/60 flex size-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors"
                                    >
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Logo" className="size-full object-cover" />
                                        ) : (
                                            <ImageIcon className="text-muted-foreground size-6" />
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <button
                                            type="button"
                                            onClick={() => logoRef.current?.click()}
                                            className="border-input hover:bg-accent flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors"
                                        >
                                            {logoPreview ? 'Change' : 'Upload'}
                                        </button>
                                        <p className="text-muted-foreground text-xs">PNG, JPG · max 2MB</p>
                                        {logoPreview && (
                                            <button
                                                type="button"
                                                onClick={() => { setLogoPreview(null); setData('logo', null); }}
                                                className="text-destructive text-xs hover:underline"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {errors.logo && <p className="text-destructive text-xs">{errors.logo as string}</p>}
                                <input ref={logoRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoChange} />
                            </div>

                            {/* School name fills remaining space */}
                            <div className="flex-1">
                                <Field label="School Name" error={errors.school_name}>
                                    <InputWithIcon
                                        icon={<SchoolIcon />}
                                        placeholder="Greenwood High School"
                                        value={data.school_name}
                                        onChange={(e) => setData('school_name', e.target.value)}
                                    />
                                </Field>
                            </div>
                        </div>

                        {/* Row 2: City + Province + Address */}
                        <FieldGroup cols={3}>
                            <Field label="City" error={errors.city}>
                                <Input
                                    placeholder="Karachi"
                                    value={data.city}
                                    onChange={(e) => setData('city', e.target.value)}
                                />
                            </Field>
                            <Field label="Province" error={errors.province}>
                                <Input
                                    placeholder="Sindh"
                                    value={data.province}
                                    onChange={(e) => setData('province', e.target.value)}
                                />
                            </Field>
                            <Field label="Address" error={errors.address}>
                                <InputWithIcon
                                    icon={<MapPinIcon />}
                                    placeholder="123 Main Street"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                />
                            </Field>
                        </FieldGroup>

                        {/* Show address toggle */}
                        <div className="flex items-center gap-2.5">
                            <Checkbox
                                id="is_show_address"
                                checked={data.is_show_address}
                                onCheckedChange={(checked) => setData('is_show_address', Boolean(checked))}
                            />
                            <label htmlFor="is_show_address" className="cursor-pointer select-none text-sm">
                                Show address publicly on profile
                            </label>
                        </div>
                    </div>

                    {/* ── Actions ──────────────────────────────────────────── */}
                    <div className="flex items-center justify-end gap-3 pb-2">
                        <Link
                            href="/superadmin/customers"
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
                            {processing ? 'Saving…' : 'Save Customer'}
                        </button>
                    </div>

                </form>
            </div>
        </>
    );
}

AddCustomer.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Customers', href: '/superadmin/customers' },
        { title: 'Add Customer', href: '/superadmin/customers/add' },
    ],
};

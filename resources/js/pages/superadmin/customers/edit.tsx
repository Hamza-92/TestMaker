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
    school_name: string;
    logo: File | null;
    remove_logo: boolean;
    address: string;
    city: string;
    province: string;
    is_show_address: boolean;
    [key: string]: string | boolean | File | null;
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

function FieldGroup({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
    const colClass = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }[cols];
    return <div className={`grid gap-4 ${colClass}`}>{children}</div>;
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

export default function EditCustomer({ customer }: { customer: Customer }) {
    const [logoPreview, setLogoPreview] = useState<string | null>(customer.logo ? `/storage/${customer.logo}` : null);
    const logoRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors } = useForm<FormData>({
        _method: 'put',
        name: customer.name,
        email: customer.email,
        phone: customer.phone ?? '',
        status: customer.status,
        school_name: customer.school_name ?? '',
        logo: null,
        remove_logo: false,
        address: customer.address ?? '',
        city: customer.city ?? '',
        province: customer.province ?? '',
        is_show_address: customer.is_show_address,
    });

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
            <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/superadmin/customers/${customer.id}`}
                        className="hover:bg-accent border-input flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <h1 className="h1-semibold">Edit Customer</h1>
                        <p className="text-muted-foreground text-sm">Update customer account and school details</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-5 rounded-xl border p-5 shadow-sm">
                        <SectionHeader
                            icon={<UserIcon className="size-4" />}
                            title="Account Details"
                            description="Basic customer account information"
                        />
                        <Separator />

                        <FieldGroup cols={3}>
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
                        </FieldGroup>

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
                            <Field label="School Name" error={errors.school_name}>
                                <InputWithIcon
                                    icon={<SchoolIcon />}
                                    value={data.school_name}
                                    onChange={(e) => setData('school_name', e.target.value)}
                                />
                            </Field>
                        </FieldGroup>
                    </div>

                    <div className="space-y-5 rounded-xl border p-5 shadow-sm">
                        <SectionHeader
                            icon={<SchoolIcon className="size-4" />}
                            title="School & Location"
                            description="Logo and geographic information"
                        />
                        <Separator />

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
                                            onClick={handleRemoveLogo}
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

                        <Field label="Address" error={errors.address}>
                            <InputWithIcon
                                icon={<MapPinIcon />}
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                            />
                        </Field>

                        <div className="grid gap-4 sm:grid-cols-3">
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
                        </div>
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

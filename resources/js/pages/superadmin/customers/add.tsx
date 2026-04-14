import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    BuildingIcon,
    GlobeIcon,
    MailIcon,
    MapPinIcon,
    NotebookPenIcon,
    PhoneIcon,
    SaveIcon,
    UserIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormData {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company: string;
    website: string;
    plan: string;
    status: string;
    country: string;
    city: string;
    address: string;
    notes: string;
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

function FieldGroup({ children }: { children: React.ReactNode }) {
    return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AddCustomer() {
    const { data, setData, post, processing, errors } = useForm<FormData>({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        website: '',
        plan: '',
        status: '',
        country: '',
        city: '',
        address: '',
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/superadmin/customers');
    };

    return (
        <>
            <Head title="Add Customer" />
            <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">

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
                        <p className="text-muted-foreground text-sm">Fill in the details to register a new customer</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* ── Personal Info ────────────────────────────────────── */}
                    <div className="rounded-xl border p-5 shadow-sm space-y-5">
                        <SectionHeader
                            icon={<UserIcon className="size-4" />}
                            title="Personal Information"
                            description="Basic identity details of the customer"
                        />
                        <Separator />
                        <FieldGroup>
                            <Field label="First Name" required error={errors.first_name}>
                                <InputWithIcon
                                    icon={<UserIcon />}
                                    placeholder="John"
                                    value={data.first_name}
                                    onChange={(e) => setData('first_name', e.target.value)}
                                />
                            </Field>
                            <Field label="Last Name" required error={errors.last_name}>
                                <Input
                                    placeholder="Doe"
                                    value={data.last_name}
                                    onChange={(e) => setData('last_name', e.target.value)}
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
                            <Field label="Phone Number" error={errors.phone}>
                                <InputWithIcon
                                    icon={<PhoneIcon />}
                                    type="tel"
                                    placeholder="+1 555-0100"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                />
                            </Field>
                        </FieldGroup>
                    </div>

                    {/* ── Company Info ─────────────────────────────────────── */}
                    <div className="rounded-xl border p-5 shadow-sm space-y-5">
                        <SectionHeader
                            icon={<BuildingIcon className="size-4" />}
                            title="Company Details"
                            description="Optional business information"
                        />
                        <Separator />
                        <FieldGroup>
                            <Field label="Company" error={errors.company}>
                                <InputWithIcon
                                    icon={<BuildingIcon />}
                                    placeholder="Acme Inc."
                                    value={data.company}
                                    onChange={(e) => setData('company', e.target.value)}
                                />
                            </Field>
                            <Field label="Website" error={errors.website}>
                                <InputWithIcon
                                    icon={<GlobeIcon />}
                                    type="url"
                                    placeholder="https://example.com"
                                    value={data.website}
                                    onChange={(e) => setData('website', e.target.value)}
                                />
                            </Field>
                        </FieldGroup>
                    </div>

                    {/* ── Account Settings ─────────────────────────────────── */}
                    <div className="rounded-xl border p-5 shadow-sm space-y-5">
                        <SectionHeader
                            icon={<NotebookPenIcon className="size-4" />}
                            title="Account Settings"
                            description="Plan and status for this customer"
                        />
                        <Separator />
                        <FieldGroup>
                            <Field label="Plan" required error={errors.plan}>
                                <Select value={data.plan} onValueChange={(v) => setData('plan', v)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="basic">Basic</SelectItem>
                                        <SelectItem value="pro">Pro</SelectItem>
                                        <SelectItem value="enterprise">Enterprise</SelectItem>
                                    </SelectContent>
                                </Select>
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
                                        <SelectItem value="pending">
                                            <span className="flex items-center gap-2">
                                                <span className="size-2 rounded-full bg-amber-500" /> Pending
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                        </FieldGroup>
                    </div>

                    {/* ── Location ─────────────────────────────────────────── */}
                    <div className="rounded-xl border p-5 shadow-sm space-y-5">
                        <SectionHeader
                            icon={<MapPinIcon className="size-4" />}
                            title="Location"
                            description="Customer's geographic information"
                        />
                        <Separator />
                        <FieldGroup>
                            <Field label="Country" error={errors.country}>
                                <Select value={data.country} onValueChange={(v) => setData('country', v)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="us">🇺🇸 United States</SelectItem>
                                        <SelectItem value="gb">🇬🇧 United Kingdom</SelectItem>
                                        <SelectItem value="ca">🇨🇦 Canada</SelectItem>
                                        <SelectItem value="au">🇦🇺 Australia</SelectItem>
                                        <SelectItem value="de">🇩🇪 Germany</SelectItem>
                                        <SelectItem value="fr">🇫🇷 France</SelectItem>
                                        <SelectItem value="pk">🇵🇰 Pakistan</SelectItem>
                                        <SelectItem value="in">🇮🇳 India</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="City" error={errors.city}>
                                <InputWithIcon
                                    icon={<MapPinIcon />}
                                    placeholder="New York"
                                    value={data.city}
                                    onChange={(e) => setData('city', e.target.value)}
                                />
                            </Field>
                        </FieldGroup>
                        <Field label="Street Address" error={errors.address}>
                            <Input
                                placeholder="123 Main Street, Suite 4"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                            />
                        </Field>
                    </div>

                    {/* ── Notes ────────────────────────────────────────────── */}
                    <div className="rounded-xl border p-5 shadow-sm space-y-5">
                        <SectionHeader
                            icon={<NotebookPenIcon className="size-4" />}
                            title="Notes"
                            description="Internal notes visible only to admins"
                        />
                        <Separator />
                        <div className="space-y-1.5">
                            <textarea
                                rows={4}
                                placeholder="Add any relevant notes about this customer…"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:opacity-50"
                            />
                            {errors.notes && <p className="text-destructive text-xs">{errors.notes}</p>}
                        </div>
                    </div>

                    {/* ── Actions ──────────────────────────────────────────── */}
                    <div className="flex items-center justify-end gap-3 pb-4">
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

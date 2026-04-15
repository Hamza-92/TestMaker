import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CalendarIcon,
    FileTextIcon,
    HashIcon,
    IndianRupeeIcon,
    SaveIcon,
    SchoolIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface Customer {
    id: number;
    name: string;
    email: string;
    school_name: string | null;
}

interface FormData {
    name: string;
    amount: string;
    allowed_questions: string;
    started_at: string;
    duration: string;
    status: string;
    [key: string]: string;
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

export default function AddCustomerSubscription({ customer }: { customer: Customer }) {
    const today = new Date().toISOString().slice(0, 10);

    const { data, setData, post, processing, errors } = useForm<FormData>({
        name: '',
        amount: '',
        allowed_questions: '',
        started_at: today,
        duration: '30',
        status: 'active',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/superadmin/customers/${customer.id}/subscriptions`);
    };

    return (
        <>
            <Head title={`Add Subscription - ${customer.name}`} />

            <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
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
                    <div className="space-y-5 rounded-xl border p-5 shadow-sm">
                        <SectionHeader
                            icon={<FileTextIcon className="size-4" />}
                            title="Subscription Details"
                            description="Plan name, billing, duration, and status"
                        />
                        <Separator />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Plan Name" required error={errors.name}>
                                <InputWithIcon
                                    icon={<FileTextIcon />}
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                />
                            </Field>

                            <Field label="Amount" required error={errors.amount}>
                                <InputWithIcon
                                    icon={<IndianRupeeIcon />}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                />
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

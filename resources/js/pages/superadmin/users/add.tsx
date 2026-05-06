import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, KeyRoundIcon, LockIcon, MailIcon, SaveIcon, UserIcon } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface FormData {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    status: string;
    [key: string]: string;
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
                        fill="none"
                        strokeWidth="4"
                        stroke={color}
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
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
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">{icon}</div>
            <div className="min-w-0">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-muted-foreground text-xs">{description}</p>
            </div>
        </div>
    );
}

export default function AddUser() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, post, processing, errors } = useForm<FormData>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        status: 'active',
    });

    const completionPercent = Math.round(
        [data.name, data.email, data.password, data.password_confirmation].filter(Boolean).length / 4 * 100,
    );

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/superadmin/users');
    }

    return (
        <>
            <Head title="Add User" />

            <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/superadmin/users"
                        className="text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="h1-semibold">Add User</h1>
                        <p className="text-muted-foreground text-sm">Create a new superadmin account</p>
                    </div>
                    <CompletionRing percent={completionPercent} />
                </div>

                <form onSubmit={submit} className="space-y-6">
                    {/* Account Info */}
                    <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-5">
                        <SectionHeader
                            icon={<UserIcon className="size-4" />}
                            title="Account Info"
                            description="Basic identity for the new user"
                        />
                        <Separator />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="John Doe"
                                />
                                {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <MailIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="john@example.com"
                                        className="pl-9"
                                    />
                                </div>
                                {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="status">Status</Label>
                            <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                                <SelectTrigger className="w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="suspended">Suspended</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.status && <p className="text-destructive text-xs">{errors.status}</p>}
                        </div>
                    </div>

                    {/* Password */}
                    <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-5">
                        <SectionHeader
                            icon={<LockIcon className="size-4" />}
                            title="Password"
                            description="Set a secure password for this account"
                        />
                        <Separator />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <KeyRoundIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className="pl-9 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                                    >
                                        {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="password_confirmation">Confirm Password</Label>
                                <div className="relative">
                                    <KeyRoundIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                    <Input
                                        id="password_confirmation"
                                        type={showConfirm ? 'text' : 'password'}
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        className="pl-9 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm((v) => !v)}
                                        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                                    >
                                        {showConfirm ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                                    </button>
                                </div>
                                {errors.password_confirmation && (
                                    <p className="text-destructive text-xs">{errors.password_confirmation}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Link
                            href="/superadmin/users"
                            className="border-input bg-background hover:bg-accent inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors disabled:opacity-60"
                        >
                            <SaveIcon className="size-4" />
                            Create User
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

AddUser.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Users', href: '/superadmin/users' },
        { title: 'Add User', href: '/superadmin/users/add' },
    ],
};

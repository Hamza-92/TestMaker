import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    EyeIcon,
    EyeOffIcon,
    KeyRoundIcon,
    LockIcon,
    MailIcon,
    SaveIcon,
    UserIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface FormData {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    status: string;
    [key: string]: string;
}

function SectionHeader({
    icon,
    title,
}: {
    icon: React.ReactNode;
    title: string;
}) {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                {icon}
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
        </div>
    );
}

export default function AddTeacher() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, post, processing, errors } = useForm<FormData>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        status: 'active',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/teachers');
    }

    return (
        <>
            <Head title="Add Teacher" />

            <div className="mx-auto max-w-2xl space-y-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/teachers"
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                            Add Teacher
                        </h1>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            Create a login for a teacher on your school account.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-5">
                    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <SectionHeader icon={<UserIcon className="size-4" />} title="Identity" />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g. Ayesha Khan"
                                />
                                {errors.name && (
                                    <p className="text-xs text-rose-600">{errors.name}</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <MailIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="teacher@school.edu"
                                        className="pl-9"
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-xs text-rose-600">{errors.email}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={data.status}
                                onValueChange={(v) => setData('status', v)}
                            >
                                <SelectTrigger id="status" className="w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="suspended">Suspended</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.status && (
                                <p className="text-xs text-rose-600">{errors.status}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <SectionHeader icon={<LockIcon className="size-4" />} title="Login Password" />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <KeyRoundIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
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
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                    >
                                        {showPassword ? (
                                            <EyeOffIcon className="size-4" />
                                        ) : (
                                            <EyeIcon className="size-4" />
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-xs text-rose-600">{errors.password}</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="password_confirmation">Confirm Password</Label>
                                <div className="relative">
                                    <KeyRoundIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        id="password_confirmation"
                                        type={showConfirm ? 'text' : 'password'}
                                        value={data.password_confirmation}
                                        onChange={(e) =>
                                            setData('password_confirmation', e.target.value)
                                        }
                                        className="pl-9 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm((v) => !v)}
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                    >
                                        {showConfirm ? (
                                            <EyeOffIcon className="size-4" />
                                        ) : (
                                            <EyeIcon className="size-4" />
                                        )}
                                    </button>
                                </div>
                                {errors.password_confirmation && (
                                    <p className="text-xs text-rose-600">
                                        {errors.password_confirmation}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {errors.quota && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                            {errors.quota}
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <Link
                            href="/teachers"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
                        >
                            <SaveIcon className="size-4" />
                            Create Teacher
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

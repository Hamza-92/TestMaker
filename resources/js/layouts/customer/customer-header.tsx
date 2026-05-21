import { usePage } from '@inertiajs/react';
import {
    BellIcon,
    MoonIcon,
    SearchIcon,
    SunIcon,
    MonitorIcon,
    LogOutIcon,
    UserIcon,
    SettingsIcon,
    ChevronDownIcon,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useAppearance } from '@/hooks/use-appearance';
import type { Appearance } from '@/hooks/use-appearance';

function greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

function AppearanceToggle() {
    const { appearance, updateAppearance } = useAppearance();
    const cycle: Appearance[] = ['light', 'dark', 'system'];
    const next = cycle[(cycle.indexOf(appearance) + 1) % cycle.length];

    const Icon = appearance === 'dark' ? MoonIcon : appearance === 'light' ? SunIcon : MonitorIcon;

    return (
        <button
            onClick={() => updateAppearance(next)}
            className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            title={`Switch to ${next} mode`}
        >
            <Icon className="size-4" />
        </button>
    );
}

function NotificationBell() {
    const count = 0;
    return (
        <button className="relative flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100">
            <BellIcon className="size-4" />
            {count > 0 && (
                <span className="absolute right-2 top-2 flex size-2 items-center justify-center rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
        </button>
    );
}

function UserMenu() {
    const page = usePage<{ auth: { user: Record<string, unknown> } }>();
    const user = page.props.auth.user;
    const name = user.name as string;
    const schoolName = (user.school_name as string | null) ?? '';
    const initials = name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
                <div className="flex size-8 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white ring-1 ring-inset ring-teal-500/30 dark:bg-teal-500 dark:ring-teal-400/30">
                    {initials}
                </div>
                <div className="hidden text-left sm:block">
                    <p className="text-sm font-medium leading-none text-slate-800 dark:text-slate-100">{name}</p>
                    {schoolName && (
                        <p className="mt-0.5 text-xs leading-none text-slate-500 dark:text-slate-400">{schoolName}</p>
                    )}
                </div>
                <ChevronDownIcon className="size-3.5 text-slate-400" />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900">
                        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{name}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email as string}</p>
                        </div>
                        <div className="p-1">
                            <MenuItem href="/profile" icon={UserIcon} label="Profile" />
                            <MenuItem href="/settings" icon={SettingsIcon} label="Settings" />
                            <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                            <MenuItem href="/logout" icon={LogOutIcon} label="Log out" method="post" danger />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function MenuItem({
    href,
    icon: Icon,
    label,
    method,
    danger,
}: {
    href: string;
    icon: React.ElementType;
    label: string;
    method?: string;
    danger?: boolean;
}) {
    const baseClasses = [
        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
        danger
            ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10'
            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
    ].join(' ');

    const iconClasses = [
        'size-4',
        danger
            ? 'text-rose-500 dark:text-rose-400'
            : 'text-slate-400 dark:text-slate-500',
    ].join(' ');

    if (method === 'post') {
        return (
            <form action={href} method="post">
                <input
                    type="hidden"
                    name="_token"
                    value={(document.querySelector('meta[name=csrf-token]') as HTMLMetaElement)?.content ?? ''}
                />
                <button type="submit" className={baseClasses}>
                    <Icon className={iconClasses} />
                    {label}
                </button>
            </form>
        );
    }
    return (
        <a href={href} className={baseClasses}>
            <Icon className={iconClasses} />
            {label}
        </a>
    );
}

export function CustomerHeader() {
    const page = usePage<{ auth: { user: Record<string, unknown> } }>();
    const user = page.props.auth.user;
    const schoolName = (user.school_name as string | null) ?? (user.name as string);

    return (
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 md:px-6">
            {/* ── Greeting ──────────────────────────────────────────────────── */}
            <div className="hidden min-w-0 flex-1 lg:block">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {greeting()},{' '}
                    <span className="text-teal-700 dark:text-teal-400">{schoolName}</span>
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    Welcome back to your dashboard
                </p>
            </div>

            {/* ── Search ────────────────────────────────────────────────────── */}
            <div className="relative flex-1 lg:max-w-sm">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                    type="search"
                    placeholder="Search papers, questions, templates…"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400 dark:focus:bg-slate-900 dark:focus:ring-teal-400/20"
                />
            </div>

            {/* ── Actions ───────────────────────────────────────────────────── */}
            <div className="flex items-center gap-1">
                <NotificationBell />
                <AppearanceToggle />
                <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-800" />
                <UserMenu />
            </div>
        </header>
    );
}

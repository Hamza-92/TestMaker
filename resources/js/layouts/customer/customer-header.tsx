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
            className="flex size-9 items-center justify-center rounded-lg border border-transparent transition-colors hover:bg-accent hover:border-border"
            title={`Switch to ${next} mode`}
        >
            <Icon className="size-4 text-muted-foreground" />
        </button>
    );
}

function NotificationBell() {
    const count = 0;
    return (
        <button className="relative flex size-9 items-center justify-center rounded-lg border border-transparent transition-colors hover:bg-accent hover:border-border">
            <BellIcon className="size-4 text-muted-foreground" />
            {count > 0 && (
                <span className="absolute right-1.5 top-1.5 flex size-2 items-center justify-center rounded-full bg-red-500" />
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
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
            >
                <div className="flex size-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                    {initials}
                </div>
                <div className="hidden text-left sm:block">
                    <p className="text-sm font-medium leading-none">{name}</p>
                    {schoolName && (
                        <p className="text-muted-foreground mt-0.5 text-xs leading-none">{schoolName}</p>
                    )}
                </div>
                <ChevronDownIcon className="size-3.5 text-muted-foreground" />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1.5 w-52 rounded-xl border bg-popover shadow-lg">
                        <div className="border-b px-3 py-2.5">
                            <p className="text-sm font-medium">{name}</p>
                            <p className="text-muted-foreground text-xs">{user.email as string}</p>
                        </div>
                        <div className="p-1">
                            <MenuItem href="/profile" icon={UserIcon} label="Profile" />
                            <MenuItem href="/settings" icon={SettingsIcon} label="Settings" />
                            <div className="my-1 border-t" />
                            <MenuItem href="/logout" icon={LogOutIcon} label="Log out" method="post" />
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
}: {
    href: string;
    icon: React.ElementType;
    label: string;
    method?: string;
}) {
    if (method === 'post') {
        return (
            <form action={href} method="post">
                <input type="hidden" name="_token" value={(document.querySelector('meta[name=csrf-token]') as HTMLMetaElement)?.content ?? ''} />
                <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
                >
                    <Icon className="size-4 text-muted-foreground" />
                    {label}
                </button>
            </form>
        );
    }
    return (
        <a
            href={href}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
        >
            <Icon className="size-4 text-muted-foreground" />
            {label}
        </a>
    );
}

export function CustomerHeader() {
    const page = usePage<{ auth: { user: Record<string, unknown> } }>();
    const user = page.props.auth.user;
    const schoolName = (user.school_name as string | null) ?? (user.name as string);

    return (
        <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 md:px-6">
            {/* ── Greeting ──────────────────────────────────────────────────── */}
            <div className="hidden min-w-0 flex-1 lg:block">
                <p className="truncate text-sm font-semibold">
                    {greeting()}, <span className="text-primary">{schoolName}</span>
                </p>
                <p className="text-muted-foreground truncate text-xs">
                    Welcome back to your dashboard
                </p>
            </div>

            {/* ── Search ────────────────────────────────────────────────────── */}
            <div className="relative flex-1 lg:max-w-sm">
                <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <input
                    type="search"
                    placeholder="Search…"
                    className="border-input bg-muted/40 focus:bg-background h-9 w-full rounded-lg border pl-9 pr-3 text-sm outline-none ring-offset-background transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
            </div>

            {/* ── Actions ───────────────────────────────────────────────────── */}
            <div className="flex items-center gap-1">
                <NotificationBell />
                <AppearanceToggle />
                <div className="mx-1 h-5 w-px bg-border" />
                <UserMenu />
            </div>
        </header>
    );
}

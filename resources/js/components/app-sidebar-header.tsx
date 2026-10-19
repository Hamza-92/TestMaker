import { router, usePage } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ChevronDownIcon,
    MonitorIcon,
    MoonIcon,
    SunIcon,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserMenuContent } from '@/components/user-menu-content';
import { useAppearance } from '@/hooks/use-appearance';
import type { Appearance } from '@/hooks/use-appearance';
import { useInitials } from '@/hooks/use-initials';
import type { Auth } from '@/types';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

function AppearanceToggle() {
    const { appearance, updateAppearance } = useAppearance();
    const cycle: Appearance[] = ['light', 'dark', 'system'];
    const next = cycle[(cycle.indexOf(appearance) + 1) % cycle.length];
    const Icon =
        appearance === 'dark'
            ? MoonIcon
            : appearance === 'light'
              ? SunIcon
              : MonitorIcon;

    return (
        <button
            type="button"
            onClick={() => updateAppearance(next)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label={`Switch to ${next} mode`}
            title={`Switch to ${next} mode`}
        >
            <Icon className="size-4" />
        </button>
    );
}

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const getInitials = useInitials();

    return (
        <header
            data-slot="app-sidebar-header"
            className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900 md:px-5"
        >
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <SidebarTrigger className="-ml-1 size-8 cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100" />
                <div className="min-w-0 truncate text-sm">
                    {breadcrumbs.length > 0 ? (
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    ) : (
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                            Administration
                        </span>
                    )}
                </div>
            </div>
            {auth.is_admin_impersonating && (
                <button
                    type="button"
                    onClick={() =>
                        router.post('/superadmin-impersonation/stop')
                    }
                    aria-label="Return to Superadmin"
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-200 dark:hover:bg-brand-900"
                >
                    <ArrowLeftIcon className="size-4" />
                    <span className="hidden sm:inline">
                        Return to Superadmin
                    </span>
                    <span className="sm:hidden">Return</span>
                </button>
            )}
            <div className="flex shrink-0 items-center gap-1">
                <AppearanceToggle />
                <div className="mx-1.5 h-5 w-px bg-slate-200 dark:bg-slate-700" />
                <DropdownMenu>
                    <DropdownMenuTrigger
                        className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left outline-none transition-colors hover:bg-slate-100 data-[state=open]:bg-slate-100 dark:hover:bg-slate-800 dark:data-[state=open]:bg-slate-800"
                        aria-label={`Open account menu for ${auth.user.name}`}
                        data-test="sidebar-menu-button"
                    >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
                            {getInitials(auth.user.name)}
                        </span>
                        <span className="hidden max-w-40 truncate text-[13px] font-medium text-slate-800 dark:text-slate-100 sm:block">
                            {auth.user.name}
                        </span>
                        <ChevronDownIcon className="hidden size-3.5 text-slate-400 sm:block" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

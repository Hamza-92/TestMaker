import { router, usePage } from '@inertiajs/react';
import { ArrowLeftIcon } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { Auth } from '@/types';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth } = usePage<{ auth: Auth }>().props;

    return (
        <header
            data-slot="app-sidebar-header"
            className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear md:px-4"
        >
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            {auth.is_admin_impersonating && (
                <button
                    type="button"
                    onClick={() =>
                        router.post('/superadmin-impersonation/stop')
                    }
                    aria-label="Return to Superadmin"
                    className="ml-auto inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                >
                    <ArrowLeftIcon className="size-4" />
                    <span className="hidden sm:inline">
                        Return to Superadmin
                    </span>
                    <span className="sm:hidden">Return</span>
                </button>
            )}
        </header>
    );
}

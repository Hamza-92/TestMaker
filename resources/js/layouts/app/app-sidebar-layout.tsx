import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    // The mobile sidebar is rendered in a portal under <body>.
    useEffect(() => {
        document.body.classList.add('theme-admin');

        return () => document.body.classList.remove('theme-admin');
    }, []);

    return (
        <AppShell
            variant="sidebar"
            className="theme-admin bg-slate-50 dark:bg-slate-950"
            style={
                {
                    '--sidebar-width': '15rem',
                    '--sidebar-width-icon': '4rem',
                } as CSSProperties
            }
        >
            <AppSidebar />
            <AppContent
                variant="sidebar"
                className="min-w-0 overflow-x-hidden bg-slate-50 dark:bg-slate-950"
            >
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
            </AppContent>
        </AppShell>
    );
}

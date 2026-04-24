import { Link } from '@inertiajs/react';
import {
    BookOpenIcon,
    LayoutGrid,
    ListChecksIcon,
    SchoolIcon,
    ShapesIcon,
    TagIcon,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Customers',
        href: '/superadmin/customers',
        icon: Users,
    },
    {
        title: 'Patterns',
        href: '/superadmin/patterns',
        icon: TagIcon,
    },
    {
        title: 'Classes',
        href: '/superadmin/classes',
        icon: SchoolIcon,
    },
    {
        title: 'Subjects',
        href: '/superadmin/subjects',
        icon: BookOpenIcon,
    },
    {
        title: 'Question Types',
        href: '/superadmin/question-types',
        icon: ShapesIcon,
    },
    {
        title: 'Questions',
        href: '/superadmin/questions',
        icon: ListChecksIcon,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

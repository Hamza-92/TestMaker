import { Link } from '@inertiajs/react';
import {
    BookOpenIcon,
    HelpCircleIcon,
    LayoutGrid,
    SchoolIcon,
    ShapesIcon,
    TagIcon,
    UserCogIcon,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { usePermission } from '@/hooks/use-permission';
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

const baseNavItems: NavItem[] = [
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
        title: 'Questions',
        href: '/superadmin/questions',
        icon: HelpCircleIcon,
    },
    {
        title: 'Question Types',
        href: '/superadmin/question-types',
        icon: ShapesIcon,
        items: [
            {
                title: 'Objective Types',
                href: '/superadmin/question-types/objective',
            },
            {
                title: 'Subjective Types',
                href: '/superadmin/question-types/subjective',
            },
        ],
    },
];

const usersNavItem: NavItem = {
    title: 'Users',
    href: '/superadmin/users',
    icon: UserCogIcon,
};

export function AppSidebar() {
    const { can } = usePermission();

    const navItems = can('users.view') ? [...baseNavItems, usersNavItem] : baseNavItems;

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
                <NavMain items={navItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

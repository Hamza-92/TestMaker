import { Link } from '@inertiajs/react';
import {
    BookOpenIcon,
    DatabaseIcon,
    HelpCircleIcon,
    LayoutGrid,
    SchoolIcon,
    Settings2Icon,
    ShapesIcon,
    TagIcon,
    UserCogIcon,
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
import { usePermission } from '@/hooks/use-permission';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { can } = usePermission();

    const navItems: NavItem[] = [
        { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
        ...(can('customers.view')      ? [{ title: 'Customers',      href: '/superadmin/customers',      icon: Users }] : []),
        ...(can('patterns.view')       ? [{ title: 'Patterns',       href: '/superadmin/patterns',       icon: TagIcon }] : []),
        ...(can('classes.view')        ? [{ title: 'Classes',        href: '/superadmin/classes',        icon: SchoolIcon }] : []),
        ...(can('subjects.view')       ? [{ title: 'Subjects',       href: '/superadmin/subjects',       icon: BookOpenIcon }] : []),
        ...(can('subjects.create')     ? [{ title: 'Data Transfer',  href: '/superadmin/data-transfer',  icon: DatabaseIcon }] : []),
        ...(can('questions.view')      ? [{ title: 'Questions',      href: '/superadmin/questions',      icon: HelpCircleIcon }] : []),
        ...(can('question_types.view') ? [{
            title: 'Question Types',
            href: '/superadmin/question-types',
            icon: ShapesIcon,
            items: [
                { title: 'Objective Types',  href: '/superadmin/question-types/objective' },
                { title: 'Subjective Types', href: '/superadmin/question-types/subjective' },
                { title: 'OR Pairing Settings', href: '/superadmin/question-type-pairings' },
            ],
        }] : []),
        ...(can('users.view')          ? [{ title: 'Users', href: '/superadmin/users', icon: UserCogIcon }] : []),
        ...(can('trial_settings.edit') ? [{ title: 'Trial Settings', href: '/superadmin/trial-settings', icon: Settings2Icon }] : []),
    ];

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

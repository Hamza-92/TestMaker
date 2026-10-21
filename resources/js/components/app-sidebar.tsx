import { Link } from '@inertiajs/react';
import {
    BookOpenIcon,
    CircleDotIcon,
    Clock3Icon,
    MegaphoneIcon,
    Globe2Icon,
    DatabaseIcon,
    HelpCircleIcon,
    LayoutGrid,
    LayoutPanelTopIcon,
    LanguagesIcon,
    CreditCardIcon,
    SchoolIcon,
    Settings2Icon,
    ShapesIcon,
    TagIcon,
    UserCogIcon,
    UserRoundCogIcon,
    Users,
} from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { NavMain } from '@/components/nav-main';
import {
    Sidebar,
    SidebarContent,
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
        ...(can('customers.view') || can('customers.paid.view')
            ? [
                  {
                      title: 'Paid Customers',
                      href: '/superadmin/customers/paid',
                      icon: Users,
                  },
              ]
            : []),
        ...(can('customers.view') || can('customers.trial.view')
            ? [
                  {
                      title: 'Trial Customers',
                      href: '/superadmin/customers/trial',
                      icon: Clock3Icon,
                  },
              ]
            : []),
        ...(can('subscriptions.manage_payments') &&
        can('subscriptions.view') &&
        (can('customers.view') ||
            can('customers.paid.view') ||
            can('customers.trial.view'))
            ? [
                  {
                      title: 'Payments Management',
                      href: '/superadmin/payments',
                      icon: CreditCardIcon,
                      items: [
                          { title: 'Payments', href: '/superadmin/payments' },
                          {
                              title: 'Payment Ledger',
                              href: '/superadmin/payments/ledger',
                          },
                      ],
                  },
              ]
            : []),
        ...(can('patterns.view')
            ? [
                  {
                      title: 'Patterns',
                      href: '/superadmin/patterns',
                      icon: TagIcon,
                  },
                  {
                      title: 'Paper Layouts',
                      href: '/superadmin/paper-layouts',
                      icon: LayoutPanelTopIcon,
                  },
                  {
                      title: 'Objective Layouts',
                      href: '/superadmin/objective-layouts',
                      icon: CircleDotIcon,
                  },
                  {
                      title: 'Circular Labels',
                      href: '/superadmin/circular-labels',
                      icon: CircleDotIcon,
                  },
              ]
            : []),
        ...(can('classes.view')
            ? [
                  {
                      title: 'Classes',
                      href: '/superadmin/classes',
                      icon: SchoolIcon,
                  },
              ]
            : []),
        ...(can('subjects.view')
            ? [
                  {
                      title: 'Subjects',
                      href: '/superadmin/subjects',
                      icon: BookOpenIcon,
                  },
                  {
                      title: 'Arabic Subjects',
                      href: '/superadmin/arabic-subjects',
                      icon: LanguagesIcon,
                  },
              ]
            : []),
        ...(can('data_transfer.manage')
            ? [
                  {
                      title: 'Data Transfer',
                      href: '/superadmin/data-transfer',
                      icon: DatabaseIcon,
                  },
                  {
                      title: 'Export to Old TestMaker',
                      href: '/superadmin/legacy-export',
                      icon: DatabaseIcon,
                  },
              ]
            : []),
        ...(can('user_transfer.manage')
            ? [
                  {
                      title: 'User Transfer',
                      href: '/superadmin/user-transfer',
                      icon: UserRoundCogIcon,
                  },
              ]
            : []),
        ...(can('questions.view')
            ? [
                  {
                      title: 'Questions',
                      href: '/superadmin/questions',
                      icon: HelpCircleIcon,
                  },
              ]
            : []),
        ...(can('question_types.view')
            ? [
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
                          {
                              title: 'Type Settings',
                              href: '/superadmin/question-types/headings',
                          },

                          ...(can('questions.view')
                              ? [
                                    {
                                        title: 'Change Types',
                                        href: '/superadmin/question-types/change',
                                    },
                                ]
                              : []),
                          {
                              title: 'OR Pairing Settings',
                              href: '/superadmin/question-type-pairings',
                          },
                          {
                              title: 'Paper Sections',
                              href: '/superadmin/paper-question-sections',
                          },
                          {
                              title: 'Custom Paper Layout',
                              href: '/superadmin/custom-paper-layouts',
                          },
                          {
                              title: 'Multipart Settings',
                              href: '/superadmin/multipart-question-settings',
                          },
                      ],
                  },
              ]
            : []),
        ...(can('users.view')
            ? [{ title: 'Users', href: '/superadmin/users', icon: UserCogIcon }]
            : []),
        ...(can('trial_settings.edit')
            ? [
                  {
                      title: 'Trial Settings',
                      href: '/superadmin/trial-settings',
                      icon: Settings2Icon,
                  },
              ]
            : []),
        ...(can('announcements.view')
            ? [
                  {
                      title: 'News & Updates',
                      href: '/superadmin/announcements',
                      icon: MegaphoneIcon,
                  },
              ]
            : []),
        ...(can('site_pages.view')
            ? [
                  {
                      title: 'Public Website',
                      href: '/superadmin/site/pages',
                      icon: Globe2Icon,
                      items: [
                          { title: 'Pages', href: '/superadmin/site/pages' },
                          {
                              title: 'Pricing',
                              href: '/superadmin/site/pricing',
                          },
                          {
                              title: 'Navigation',
                              href: '/superadmin/site/navigation',
                          },
                          {
                              title: 'Media Library',
                              href: '/superadmin/site/media',
                          },
                      ],
                  },
              ]
            : []),
    ];

    return (
        <Sidebar collapsible="icon" variant="sidebar" className="border-r-0">
            <SidebarHeader className="h-14 justify-center border-b border-white/10 px-3 py-0 group-data-[collapsible=icon]:px-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="h-11 gap-2.5 px-1 text-white hover:bg-white/[0.06] hover:text-white group-data-[collapsible=icon]:mx-auto"
                        >
                            <Link href={dashboard()} prefetch>
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
                                    <AppLogoIcon className="size-4 fill-current" />
                                </span>
                                <span className="min-w-0 text-left">
                                    <span className="block truncate text-sm font-semibold leading-tight">
                                        TestMaker
                                    </span>
                                    <span className="block truncate text-[11px] leading-tight text-brand-200/60">
                                        Administration
                                    </span>
                                </span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="scrollbar-slim gap-0 overflow-x-hidden px-2 py-3 group-data-[collapsible=icon]:overflow-y-auto">
                <NavMain items={navItems} />
            </SidebarContent>
        </Sidebar>
    );
}

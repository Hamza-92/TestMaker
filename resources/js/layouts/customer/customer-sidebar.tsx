import { Link, usePage } from '@inertiajs/react';
import {
    ActivityIcon,
    BarChart3Icon,
    BookmarkIcon,
    BookOpenIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    DatabaseIcon,
    FilePlusIcon,
    LayoutDashboardIcon,
    LayoutTemplateIcon,
    SchoolIcon,
    SettingsIcon,
    SparklesIcon,
    TrendingUpIcon,
    UsersIcon,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
    {
        title: 'Paper Generation',
        items: [
            { label: 'Generate Paper', href: '/papers/generate', icon: FilePlusIcon },
            { label: 'Question Bank',  href: '/questions',       icon: DatabaseIcon },
            { label: 'Saved Papers',   href: '/papers',          icon: BookmarkIcon },
            { label: 'My Templates',   href: '/templates',       icon: LayoutTemplateIcon },
        ],
    },
    {
        title: 'Management',
        items: [
            { label: 'Teachers',  href: '/teachers',  icon: UsersIcon },
            { label: 'Classes',   href: '/classes',   icon: SchoolIcon },
            { label: 'Subjects',  href: '/subjects',  icon: BookOpenIcon },
            { label: 'Settings',  href: '/settings',  icon: SettingsIcon },
        ],
    },
    {
        title: 'Analytics',
        items: [
            { label: 'Reports',      href: '/reports',   icon: BarChart3Icon },
            { label: 'Activity Log', href: '/activity',  icon: ActivityIcon },
            { label: 'Most Used',    href: '/most-used', icon: TrendingUpIcon },
        ],
    },
];

function NavLink({
    href,
    icon: Icon,
    label,
    collapsed,
    active,
}: {
    href: string;
    icon: React.ElementType;
    label: string;
    collapsed: boolean;
    active: boolean;
}) {
    return (
        <Link
            href={href}
            title={collapsed ? label : undefined}
            className={[
                'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150',
                collapsed ? 'justify-center' : '',
                active
                    ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:ring-indigo-500/25'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100',
            ].join(' ')}
        >
            <Icon
                className={[
                    'size-[15px] shrink-0 transition-colors',
                    active
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300',
                ].join(' ')}
            />
            {!collapsed && <span className="truncate">{label}</span>}
        </Link>
    );
}

export function CustomerSidebar() {
    const { url } = usePage();
    const page = usePage<{ auth: { user: Record<string, unknown> } }>();
    const user = page.props.auth.user;
    const schoolName = (user.school_name as string | null) ?? (user.name as string);

    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={[
                'flex h-screen shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white transition-all duration-300 dark:border-white/5 dark:bg-[#0c1425]',
                collapsed ? 'w-[60px]' : 'w-64',
            ].join(' ')}
        >
            {/* ── Brand ─────────────────────────────────────────────────────── */}
            <div className="flex h-16 shrink-0 items-center gap-3 overflow-hidden border-b border-slate-200 px-3.5 dark:border-white/5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40">
                    T
                </div>
                {!collapsed && (
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">TestMaker</p>
                        <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">{schoolName}</p>
                    </div>
                )}
            </div>

            {/* ── Nav ───────────────────────────────────────────────────────── */}
            <nav className="scrollbar-slim flex-1 space-y-5 overflow-y-auto px-2.5 pb-4 pt-3">
                {/* Dashboard */}
                <div>
                    <NavLink
                        href="/dashboard"
                        icon={LayoutDashboardIcon}
                        label="Dashboard"
                        collapsed={collapsed}
                        active={url === '/dashboard'}
                    />
                </div>

                {/* Groups */}
                {NAV_GROUPS.map((group) => (
                    <div key={group.title}>
                        {!collapsed && (
                            <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600">
                                {group.title}
                            </p>
                        )}
                        {collapsed && (
                            <div className="mx-auto mb-1.5 h-px w-6 bg-slate-200 dark:bg-white/[0.06]" />
                        )}
                        <div className="space-y-0.5">
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.href}
                                    href={item.href}
                                    icon={item.icon}
                                    label={item.label}
                                    collapsed={collapsed}
                                    active={url.startsWith(item.href)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* ── Upgrade card ──────────────────────────────────────────────── */}
            {!collapsed && (
                <div className="mx-2.5 mb-3 rounded-xl border border-indigo-100 bg-indigo-50/80 p-3.5 dark:border-indigo-500/20 dark:bg-indigo-500/[0.08]">
                    <div className="mb-1.5 flex items-center gap-2">
                        <SparklesIcon className="size-3.5 text-indigo-500 dark:text-violet-400" />
                        <span className="text-xs font-semibold text-indigo-900 dark:text-white">Upgrade Plan</span>
                    </div>
                    <p className="mb-3 text-[11px] leading-relaxed text-indigo-600/70 dark:text-slate-400">
                        Unlock unlimited questions and advanced analytics.
                    </p>
                    <button className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-200 transition-opacity hover:opacity-90 dark:shadow-indigo-900/40">
                        View Plans
                    </button>
                </div>
            )}

            {/* ── Collapse toggle ───────────────────────────────────────────── */}
            <div className="border-t border-slate-200 px-2.5 py-3 dark:border-white/5">
                <button
                    onClick={() => setCollapsed((c) => !c)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300"
                >
                    {collapsed ? (
                        <ChevronRightIcon className="mx-auto size-4" />
                    ) : (
                        <>
                            <ChevronLeftIcon className="size-4" />
                            <span>Collapse</span>
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
}

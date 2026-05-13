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
    TrendingUpIcon,
    UsersIcon,
    ZapIcon,
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
        title: 'PAPER GENERATION',
        items: [
            { label: 'Generate Paper', href: '/customer/papers/generate', icon: FilePlusIcon },
            { label: 'Question Bank',  href: '/customer/questions',        icon: DatabaseIcon },
            { label: 'Saved Papers',   href: '/customer/papers',           icon: BookmarkIcon },
            { label: 'My Templates',   href: '/customer/templates',        icon: LayoutTemplateIcon },
        ],
    },
    {
        title: 'MANAGEMENT',
        items: [
            { label: 'Teachers',  href: '/customer/teachers',  icon: UsersIcon },
            { label: 'Classes',   href: '/customer/classes',   icon: SchoolIcon },
            { label: 'Subjects',  href: '/customer/subjects',  icon: BookOpenIcon },
            { label: 'Settings',  href: '/customer/settings',  icon: SettingsIcon },
        ],
    },
    {
        title: 'ANALYTICS',
        items: [
            { label: 'Reports',      href: '/customer/reports',    icon: BarChart3Icon },
            { label: 'Activity Log', href: '/customer/activity',   icon: ActivityIcon },
            { label: 'Most Used',    href: '/customer/most-used',  icon: TrendingUpIcon },
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
                'flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors',
                collapsed ? 'justify-center' : '',
                active
                    ? 'bg-indigo-600 text-white'
                    : 'text-[#a0b4cc] hover:bg-white/10 hover:text-white',
            ].join(' ')}
        >
            <Icon className="size-4 shrink-0" />
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
                'flex h-screen flex-col shrink-0 transition-all duration-300 overflow-hidden',
                collapsed ? 'w-16' : 'w-64',
            ].join(' ')}
            style={{ background: '#0d1b3e', color: '#e8edf5' }}
        >
            {/* ── Brand ─────────────────────────────────────────────────────── */}
            <div className="flex h-16 shrink-0 items-center gap-3 overflow-hidden px-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold text-white">
                    T
                </div>
                {!collapsed && (
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">TestMaker</p>
                        <p className="truncate text-xs" style={{ color: '#7a90b0' }}>
                            {schoolName}
                        </p>
                    </div>
                )}
            </div>

            {/* ── Dashboard ─────────────────────────────────────────────────── */}
            <div className="px-3 pb-2 pt-1">
                <NavLink
                    href="/customer/dashboard"
                    icon={LayoutDashboardIcon}
                    label="Dashboard"
                    collapsed={collapsed}
                    active={url === '/customer/dashboard'}
                />
            </div>

            {/* ── Nav groups ────────────────────────────────────────────────── */}
            <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
                {NAV_GROUPS.map((group) => (
                    <div key={group.title}>
                        {!collapsed && (
                            <p
                                className="mb-1 px-2 text-[10px] font-semibold tracking-widest"
                                style={{ color: '#3a5070' }}
                            >
                                {group.title}
                            </p>
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
                <div className="mx-3 mb-4 rounded-xl p-4" style={{ background: '#132244' }}>
                    <div className="mb-2 flex items-center gap-2">
                        <ZapIcon className="size-4 text-yellow-400" />
                        <span className="text-sm font-semibold text-white">Upgrade Plan</span>
                    </div>
                    <p className="mb-3 text-xs leading-relaxed" style={{ color: '#7a90b0' }}>
                        Unlock unlimited questions and advanced analytics.
                    </p>
                    <button className="w-full rounded-lg bg-indigo-500 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-400">
                        View Plans
                    </button>
                </div>
            )}

            {/* ── Collapse toggle ───────────────────────────────────────────── */}
            <div className="px-3 py-3" style={{ borderTop: '1px solid #1a2f5e' }}>
                <button
                    onClick={() => setCollapsed((c) => !c)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-white/10"
                    style={{ color: '#7a90b0' }}
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

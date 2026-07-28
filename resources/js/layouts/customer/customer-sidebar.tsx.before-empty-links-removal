import { Link, usePage } from '@inertiajs/react';
import {
    ActivityIcon,
    BarChart3Icon,
    BookmarkIcon,
    BookOpenIcon,
    DatabaseIcon,
    FilePlusIcon,
    LayoutDashboardIcon,
    LayoutTemplateIcon,
    SchoolIcon,
    SettingsIcon,
    SparklesIcon,
    TrendingUpIcon,
    UsersIcon,
    XIcon,
} from 'lucide-react';
import { useCustomerSidebar } from './customer-layout';

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
    requires?: string;
}

interface NavGroup {
    title: string;
    items: NavItem[];
    ownerOnly?: boolean;
}

interface SchoolContext {
    school_name: string | null;
    is_owner: boolean;
    allow_teachers: boolean;
    allow_online_mcq_tests: boolean;
    max_teachers: number | null;
    teachers_used: number;
    has_subscription: boolean;
}

interface AuthPageProps {
    auth: {
        user: Record<string, unknown>;
        teacher_permissions?: string[];
        school_context?: SchoolContext | null;
    };
    [key: string]: unknown;
}

const NAV_GROUPS: NavGroup[] = [
    {
        title: 'Paper Generation',
        items: [
            {
                label: 'Generate Paper',
                href: '/papers/generate',
                icon: FilePlusIcon,
                requires: 'generate_papers',
            },
            {
                label: 'Question Bank',
                href: '/questions',
                icon: DatabaseIcon,
                requires: 'view_question_bank',
            },
            {
                label: 'Saved Papers',
                href: '/papers',
                icon: BookmarkIcon,
                requires: 'manage_own_papers',
            },
            {
                label: 'My Templates',
                href: '/templates',
                icon: LayoutTemplateIcon,
                requires: 'manage_own_papers',
            },
            {
                label: 'Online Tests',
                href: '/online-tests',
                icon: SparklesIcon,
                requires: 'manage_online_tests',
            },
        ],
    },
    {
        title: 'Management',
        ownerOnly: true,
        items: [
            { label: 'Teachers', href: '/teachers', icon: UsersIcon },
            { label: 'Classes', href: '/classes', icon: SchoolIcon },
            { label: 'Subjects', href: '/subjects', icon: BookOpenIcon },
            { label: 'Settings', href: '/settings', icon: SettingsIcon },
        ],
    },
    {
        title: 'Analytics',
        ownerOnly: true,
        items: [
            { label: 'Reports', href: '/reports', icon: BarChart3Icon },
            { label: 'Activity Log', href: '/activity', icon: ActivityIcon },
            { label: 'Most Used', href: '/most-used', icon: TrendingUpIcon },
        ],
    },
];

function NavLink({
    href,
    icon: Icon,
    label,
    collapsed,
    active,
    onNavigate,
}: {
    href: string;
    icon: React.ElementType;
    label: string;
    collapsed: boolean;
    active: boolean;
    onNavigate?: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={[
                'group flex items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors duration-150',
                collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-[7px]',
                active
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-brand-100/70 hover:bg-white/[0.06] hover:text-white',
            ].join(' ')}
        >
            <Icon
                className={[
                    'size-4 shrink-0 transition-colors',
                    active
                        ? 'text-white'
                        : 'text-brand-200/60 group-hover:text-white',
                ].join(' ')}
            />
            {!collapsed && <span className="truncate">{label}</span>}
        </Link>
    );
}

/** Pick the single best-matching nav item for the current url. */
function resolveActiveHref(url: string, hrefs: string[]): string | null {
    // Strip query/hash, then normalize trailing slash.
    const path = url.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

    let best: string | null = null;

    for (const href of hrefs) {
        const candidate = href.replace(/\/+$/, '') || '/';
        const matches =
            path === candidate ||
            (candidate !== '/' && path.startsWith(candidate + '/'));

        if (matches && (best === null || candidate.length > best.length)) {
            best = candidate;
        }
    }

    return best;
}

function SidebarContent({
    collapsed,
    onNavigate,
}: {
    collapsed: boolean;
    onNavigate?: () => void;
}) {
    const { url } = usePage();
    const page = usePage<AuthPageProps>();
    const user = page.props.auth.user;
    const teacherPermissions = page.props.auth.teacher_permissions ?? [];
    const schoolContext = page.props.auth.school_context ?? null;
    const isOwner = schoolContext?.is_owner ?? false;
    const schoolName =
        schoolContext?.school_name ??
        (user.school_name as string | null) ??
        (user.name as string);

    const visibleGroups = NAV_GROUPS.map((group) => {
        if (group.ownerOnly && !isOwner) return null;
        const items = group.items.filter((item) => {
            if (item.href === '/online-tests' && !schoolContext?.allow_online_mcq_tests) {
                return false;
            }
            if (isOwner) return true;
            if (!item.requires) return false;
            return teacherPermissions.includes(item.requires);
        });
        return items.length > 0 ? { ...group, items } : null;
    }).filter((g): g is NavGroup => g !== null);

    const allHrefs = [
        '/dashboard',
        ...visibleGroups.flatMap((g) => g.items.map((i) => i.href)),
    ];
    const activeHref = resolveActiveHref(url, allHrefs);

    return (
        <>
            {/* ── Brand ─────────────────────────────────────────────────── */}
            <div
                className={[
                    'flex h-14 shrink-0 items-center gap-2.5 overflow-hidden border-b border-white/10',
                    collapsed ? 'justify-center px-0' : 'px-4',
                ].join(' ')}
            >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white shadow-sm">
                    T
                </div>
                {!collapsed && (
                    <div className="min-w-0">
                        <p className="truncate text-sm leading-tight font-semibold text-white">
                            TestMaker
                        </p>
                        <p className="truncate text-[11px] leading-tight text-brand-200/60">
                            {schoolName}
                        </p>
                    </div>
                )}
            </div>

            {/* ── Nav ───────────────────────────────────────────────────── */}
            <nav
                className={[
                    'scrollbar-slim flex-1 space-y-4 overflow-x-hidden overflow-y-auto pt-3 pb-3',
                    collapsed ? 'px-2' : 'px-3',
                ].join(' ')}
            >
                {/* Dashboard */}
                <NavLink
                    href="/dashboard"
                    icon={LayoutDashboardIcon}
                    label="Dashboard"
                    collapsed={collapsed}
                    active={activeHref === '/dashboard'}
                    onNavigate={onNavigate}
                />

                {/* Groups */}
                {visibleGroups.map((group) => (
                    <div key={group.title}>
                        {collapsed ? (
                            <div className="mx-auto mb-2 h-px w-5 bg-white/10" />
                        ) : (
                            <p className="mb-1 px-2.5 text-[10px] font-semibold tracking-wider text-brand-200/50 uppercase">
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
                                    active={activeHref === item.href}
                                    onNavigate={onNavigate}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* ── Upgrade card ──────────────────────────────────────────── */}
            {!collapsed && (
                <div className="mx-3 mb-3 rounded-lg border border-white/10 bg-white/[0.06] p-3">
                    <div className="mb-1.5 flex items-center gap-2">
                        <div className="flex size-5 items-center justify-center rounded-md bg-amber-400">
                            <SparklesIcon className="size-3 text-amber-950" />
                        </div>
                        <span className="text-xs font-semibold text-white">
                            Upgrade Plan
                        </span>
                    </div>
                    <p className="mb-2.5 text-[11px] leading-relaxed text-brand-100/60">
                        Unlock unlimited questions and advanced analytics.
                    </p>
                    <button className="w-full cursor-pointer rounded-md bg-brand-500 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-400 active:bg-brand-600">
                        View Plans
                    </button>
                </div>
            )}
        </>
    );
}

export function CustomerSidebar() {
    const { collapsed, mobileOpen, setMobileOpen } = useCustomerSidebar();

    return (
        <>
            {/* ── Desktop ───────────────────────────────────────────────── */}
            <aside
                data-customer-sidebar
                className={[
                    'hidden h-screen shrink-0 flex-col overflow-hidden bg-brand-950 transition-[width] duration-200 md:flex',
                    collapsed ? 'w-16' : 'w-60',
                ].join(' ')}
            >
                <SidebarContent collapsed={collapsed} />
            </aside>

            {/* ── Mobile drawer ─────────────────────────────────────────── */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div
                        className="absolute inset-0 bg-slate-950/50"
                        onClick={() => setMobileOpen(false)}
                    />
                    <aside
                        data-customer-sidebar
                        className="absolute inset-y-0 left-0 flex w-60 flex-col overflow-hidden bg-brand-950 shadow-xl"
                    >
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="absolute top-3.5 right-3 flex size-7 items-center justify-center rounded-md text-brand-200/70 transition-colors hover:bg-white/10 hover:text-white"
                            aria-label="Close menu"
                        >
                            <XIcon className="size-4" />
                        </button>
                        <SidebarContent
                            collapsed={false}
                            onNavigate={() => setMobileOpen(false)}
                        />
                    </aside>
                </div>
            )}
        </>
    );
}

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
                'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors duration-150',
                collapsed ? 'justify-center' : '',
                active
                    ? 'bg-teal-50 text-teal-800 dark:bg-teal-500/10 dark:text-teal-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100',
            ].join(' ')}
        >
            {/* Active indicator bar */}
            {active && !collapsed && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-teal-600 dark:bg-teal-400" />
            )}
            <Icon
                className={[
                    'size-[15px] shrink-0 transition-colors',
                    active
                        ? 'text-teal-600 dark:text-teal-400'
                        : 'text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300',
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

export function CustomerSidebar() {
    const { url } = usePage();
    const page = usePage<{ auth: { user: Record<string, unknown> } }>();
    const user = page.props.auth.user;
    const schoolName = (user.school_name as string | null) ?? (user.name as string);

    const [collapsed, setCollapsed] = useState(false);

    // Build the full href list (Dashboard + all groups) and pick the single
    // best match so longer paths win — e.g. `/papers/generate` activates only
    // "Generate Paper", not also "Saved Papers".
    const allHrefs = ['/dashboard', ...NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href))];
    const activeHref = resolveActiveHref(url, allHrefs);

    return (
        <aside
            className={[
                'flex h-screen shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900',
                collapsed ? 'w-[60px]' : 'w-64',
            ].join(' ')}
        >
            {/* ── Brand ─────────────────────────────────────────────────────── */}
            <div className="flex h-16 shrink-0 items-center gap-3 overflow-hidden border-b border-slate-200 px-3.5 dark:border-slate-800">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white ring-1 ring-inset ring-teal-500/30 dark:bg-teal-500 dark:ring-teal-400/30">
                    T
                </div>
                {!collapsed && (
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">TestMaker</p>
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{schoolName}</p>
                    </div>
                )}
            </div>

            {/* ── Nav ───────────────────────────────────────────────────────── */}
            <nav className="scrollbar-slim flex-1 space-y-5 overflow-y-auto px-2.5 pb-4 pt-4">
                {/* Dashboard */}
                <div>
                    <NavLink
                        href="/dashboard"
                        icon={LayoutDashboardIcon}
                        label="Dashboard"
                        collapsed={collapsed}
                        active={activeHref === '/dashboard'}
                    />
                </div>

                {/* Groups */}
                {NAV_GROUPS.map((group) => (
                    <div key={group.title}>
                        {!collapsed && (
                            <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                {group.title}
                            </p>
                        )}
                        {collapsed && (
                            <div className="mx-auto mb-1.5 h-px w-6 bg-slate-200 dark:bg-slate-800" />
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
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* ── Upgrade card ──────────────────────────────────────────────── */}
            {!collapsed && (
                <div className="mx-2.5 mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-500/20 dark:bg-amber-500/[0.08]">
                    <div className="mb-1.5 flex items-center gap-2">
                        <div className="flex size-5 items-center justify-center rounded-md bg-amber-500 dark:bg-amber-400">
                            <SparklesIcon className="size-3 text-white dark:text-amber-950" />
                        </div>
                        <span className="text-xs font-semibold text-amber-900 dark:text-amber-100">Upgrade Plan</span>
                    </div>
                    <p className="mb-3 text-[11px] leading-relaxed text-amber-800/70 dark:text-amber-100/60">
                        Unlock unlimited questions and advanced analytics.
                    </p>
                    <button className="w-full rounded-lg bg-teal-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 active:bg-teal-800 dark:bg-teal-500 dark:hover:bg-teal-400 dark:text-slate-950">
                        View Plans
                    </button>
                </div>
            )}

            {/* ── Collapse toggle ───────────────────────────────────────────── */}
            <div className="border-t border-slate-200 px-2.5 py-3 dark:border-slate-800">
                <button
                    onClick={() => setCollapsed((c) => !c)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200"
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

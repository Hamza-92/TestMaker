import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRightIcon,
    BookmarkIcon,
    BookOpenIcon,
    DatabaseIcon,
    FilePenIcon,
    FilePlusIcon,
    FileTextIcon,
    PlusIcon,
    SparklesIcon,
} from 'lucide-react';

interface Stats {
    papers: number;
    drafts: number;
    questions: number;
    subjects: number;
    classes: number;
}

interface RecentPaper {
    id: number;
    name: string;
    subject: string | null;
    class_name: string | null;
    total_marks: number;
    is_draft: boolean;
    updated_at: string;
}

interface Props {
    stats: Stats;
    recentPapers: RecentPaper[];
}

interface CustomerDashboardPageProps {
    [key: string]: unknown;
    auth: {
        teacher_permissions?: string[];
        school_context?: {
            allow_online_mcq_tests: boolean;
            is_owner: boolean;
        } | null;
    };
}

const STAT_CARDS: {
    key: keyof Stats;
    label: string;
    icon: React.ElementType;
    tile: string;
}[] = [
    {
        key: 'papers',
        label: 'Saved Papers',
        icon: FileTextIcon,
        tile: 'bg-brand-600',
    },
    {
        key: 'drafts',
        label: 'Drafts',
        icon: FilePenIcon,
        tile: 'bg-amber-500',
    },
    {
        key: 'questions',
        label: 'Questions Available',
        icon: DatabaseIcon,
        tile: 'bg-emerald-600',
    },
    {
        key: 'subjects',
        label: 'Subjects',
        icon: BookOpenIcon,
        tile: 'bg-violet-600',
    },
];

function formatDate(isoString: string) {
    return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function CustomerDashboard({ stats, recentPapers }: Props) {
    const page = usePage<CustomerDashboardPageProps>();
    const schoolContext = page.props.auth.school_context;
    const canManageOnlineTests = Boolean(
        schoolContext?.allow_online_mcq_tests &&
        (schoolContext.is_owner ||
            (page.props.auth.teacher_permissions ?? []).includes(
                'manage_online_tests',
            )),
    );

    const quickActions = [
        {
            href: '/papers/generate',
            icon: FilePlusIcon,
            title: 'Generate Paper',
            description: 'Build a new exam paper from the question bank.',
        },
        {
            href: '/questions',
            icon: DatabaseIcon,
            title: 'Question Bank',
            description: 'Browse and manage available questions.',
        },
        {
            href: '/papers',
            icon: BookmarkIcon,
            title: 'Saved Papers',
            description: 'Reopen, print, or edit your saved papers.',
        },
        ...(canManageOnlineTests
            ? [
                  {
                      href: '/online-tests',
                      icon: SparklesIcon,
                      title: 'Online Tests',
                      description:
                          'Create timed MCQ tests and share them with students.',
                  },
              ]
            : []),
    ];

    return (
        <>
            <Head title="Dashboard" />

            <div className="w-full space-y-5">
                {/* ── Page header ───────────────────────────────────────── */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            Dashboard
                        </h1>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            An overview of your papers and question bank.
                        </p>
                    </div>
                    <Link
                        href="/papers/generate"
                        className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 active:bg-brand-800"
                    >
                        <PlusIcon className="size-4" />
                        Generate Paper
                    </Link>
                </div>

                {/* ── Stats ─────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {STAT_CARDS.map(({ key, label, icon: Icon, tile }) => (
                        <div
                            key={key}
                            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                        >
                            <div
                                className={`flex size-10 shrink-0 items-center justify-center rounded-lg text-white ${tile}`}
                            >
                                <Icon className="size-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl leading-tight font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                                    {stats[key].toLocaleString()}
                                </p>
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                    {label}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Quick actions ─────────────────────────────────────── */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {quickActions.map(
                        ({ href, icon: Icon, title, description }) => (
                            <Link
                                key={href}
                                href={href}
                                className="group rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-500/50"
                            >
                                <div className="mb-2.5 flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-500/10 dark:text-brand-400">
                                    <Icon className="size-4.5" />
                                </div>
                                <p className="flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {title}
                                    <ArrowRightIcon className="size-3.5 -translate-x-1 text-brand-600 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 dark:text-brand-400" />
                                </p>
                                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                    {description}
                                </p>
                            </Link>
                        ),
                    )}
                </div>

                {/* ── Recent papers ─────────────────────────────────────── */}
                <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Recent Papers
                        </h2>
                        <Link
                            href="/papers"
                            className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                        >
                            View all
                        </Link>
                    </div>

                    {recentPapers.length === 0 ? (
                        <div className="flex flex-col items-center px-4 py-12 text-center">
                            <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                                <FileTextIcon className="size-5" />
                            </div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                No papers yet
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Generate your first paper to see it here.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {recentPapers.map((paper) => (
                                <Link
                                    key={paper.id}
                                    href={`/papers/${paper.id}/edit`}
                                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                >
                                    <div
                                        className={[
                                            'flex size-8 shrink-0 items-center justify-center rounded-md',
                                            paper.is_draft
                                                ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                                                : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
                                        ].join(' ')}
                                    >
                                        <FileTextIcon className="size-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="flex items-center gap-2 truncate text-[13px] font-medium text-slate-900 dark:text-slate-100">
                                            {paper.name}
                                            {paper.is_draft && (
                                                <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                                    Draft
                                                </span>
                                            )}
                                        </p>
                                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                            {[paper.subject, paper.class_name]
                                                .filter(Boolean)
                                                .join(' · ') || '—'}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        {paper.total_marks > 0 && (
                                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                {paper.total_marks} marks
                                            </p>
                                        )}
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                            {formatDate(paper.updated_at)}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

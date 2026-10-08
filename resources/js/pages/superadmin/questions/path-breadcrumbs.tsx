import { Link } from '@inertiajs/react';
import { ChevronRightIcon } from 'lucide-react';

export interface QuestionBreadcrumb {
    label: string;
    href: string;
}

export function QuestionPathBreadcrumbs({
    items,
}: {
    items: QuestionBreadcrumb[];
}) {
    if (items.length === 0) {
        return null;
    }

    return (
        <nav
            aria-label="Question location"
            className="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400"
        >
            {items.map((item, index) => (
                <span
                    key={item.href}
                    className="inline-flex min-w-0 items-center gap-1"
                >
                    {index > 0 && (
                        <ChevronRightIcon className="size-3.5 shrink-0" />
                    )}
                    <Link
                        href={item.href}
                        className="max-w-48 truncate hover:text-brand-600"
                        prefetch="hover"
                    >
                        {item.label}
                    </Link>
                </span>
            ))}
        </nav>
    );
}

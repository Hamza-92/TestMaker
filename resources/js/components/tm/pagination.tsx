import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';

export interface PageMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

/**
 * Server-side pagination bar. Renders nothing when there is only one page,
 * so callers do not need to guard it.
 */
export function Pagination({
    meta,
    onPageChange,
    /** Noun for the range summary, e.g. "3 papers". */
    label = 'items',
}: {
    meta: PageMeta;
    onPageChange: (page: number) => void;
    label?: string;
}) {
    if (meta.last_page <= 1) {
        return null;
    }

    return (
        <Card
            padding="sm"
            className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400"
        >
            <span className="tabular-nums">
                {meta.from ?? 0}–{meta.to ?? 0} of {meta.total} {label}
            </span>

            <div className="flex items-center gap-1">
                <Button
                    variant="secondary"
                    size="icon-sm"
                    onClick={() => onPageChange(meta.current_page - 1)}
                    disabled={meta.current_page <= 1}
                    aria-label="Previous page"
                >
                    <ChevronLeftIcon />
                </Button>

                <span className="min-w-[3.5rem] text-center font-medium tabular-nums">
                    {meta.current_page} / {meta.last_page}
                </span>

                <Button
                    variant="secondary"
                    size="icon-sm"
                    onClick={() => onPageChange(meta.current_page + 1)}
                    disabled={meta.current_page >= meta.last_page}
                    aria-label="Next page"
                >
                    <ChevronRightIcon />
                </Button>
            </div>
        </Card>
    );
}

import { Link } from '@inertiajs/react';
import { QuestionContent } from '@/pages/customer/papers/paper-layouts/questions/question-content';

export type QuestionPreviewRow = {
    statement_en?: string | null;
    statement_ur?: string | null;
    description_en?: string | null;
    description_ur?: string | null;
    summary_text?: string;
};

const contentClass =
    'break-words [&_img]:inline-block [&_img]:max-h-40 [&_img]:max-w-full [&_img]:object-contain [&_p]:my-0';

function BilingualContent({
    english,
    urdu,
}: {
    english?: string | null;
    urdu?: string | null;
}) {
    return (
        <>
            {english && (
                <QuestionContent value={english} className={contentClass} />
            )}
            {urdu && (
                <div dir="rtl">
                    <QuestionContent value={urdu} className={contentClass} />
                </div>
            )}
        </>
    );
}

export function QuestionPreview({
    row,
    href,
}: {
    row: QuestionPreviewRow;
    href?: string;
}) {
    const statement =
        row.statement_en || row.statement_ur ? (
            <BilingualContent
                english={row.statement_en}
                urdu={row.statement_ur}
            />
        ) : (
            <QuestionContent
                value={row.summary_text || 'Question'}
                className={contentClass}
            />
        );

    return (
        <div className="max-w-[42rem] space-y-2">
            {href ? (
                <Link
                    href={href}
                    className="block space-y-1 font-medium text-slate-900 hover:text-brand-600 dark:text-slate-100"
                >
                    {statement}
                </Link>
            ) : (
                <div className="space-y-1 font-medium text-slate-900 dark:text-slate-100">
                    {statement}
                </div>
            )}
            {(row.description_en || row.description_ur) && (
                <div className="space-y-1 border-l-2 border-slate-200 pl-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Description
                    </span>
                    <BilingualContent
                        english={row.description_en}
                        urdu={row.description_ur}
                    />
                </div>
            )}
        </div>
    );
}

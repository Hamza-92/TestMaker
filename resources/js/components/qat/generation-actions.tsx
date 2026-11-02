import { Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    FileTextIcon,
    LoaderCircleIcon,
} from 'lucide-react';
import type { QatReviewSelection } from '@/components/qat/generation-form';

export function QatGenerationActions({
    sidebarCollapsed,
    saving,
    canGenerate,
    onGenerate,
}: Pick<
    QatReviewSelection,
    'sidebarCollapsed' | 'saving' | 'canGenerate' | 'onGenerate'
>) {
    return (
        <div
            className={`fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-sky-100 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(37,99,235,0.06)] backdrop-blur transition-[left] duration-200 dark:border-slate-800 dark:bg-slate-900/95 md:px-6 ${sidebarCollapsed ? 'md:left-16' : 'md:left-60'} print:hidden`}
        >
            <Link
                href="/qa-tests"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
                <ArrowLeftIcon aria-hidden="true" className="size-4" />
                Back
            </Link>
            <button
                type="button"
                onClick={onGenerate}
                disabled={saving || !canGenerate}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.2)] transition-all hover:from-indigo-600 hover:to-brand-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
                {saving ? (
                    <LoaderCircleIcon
                        aria-hidden="true"
                        className="size-4 animate-spin motion-reduce:animate-none"
                    />
                ) : (
                    <FileTextIcon aria-hidden="true" className="size-4" />
                )}
                {saving ? 'Generating…' : 'Generate paper'}
                <ArrowRightIcon aria-hidden="true" className="size-4" />
            </button>
        </div>
    );
}

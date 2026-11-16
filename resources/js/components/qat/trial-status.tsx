import { Link, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

export const qatAnnualFee = 'Rs 3,600';

export function useQatTrial() {
    const { auth } = usePage<{
        auth: {
            school_context?: {
                qat_trial?: {
                    limit: number;
                    remaining: number;
                    expired: boolean;
                    locked: boolean;
                } | null;
            } | null;
        };
    }>().props;

    return auth.school_context?.qat_trial ?? null;
}

export function QatTrialBanner() {
    const trial = useQatTrial();
    const hasTrial = trial !== null;

    useEffect(() => {
        if (!hasTrial) {
            return;
        }

        function revalidateRestoredPage(event: PageTransitionEvent) {
            if (event.persisted) {
                window.location.reload();
            }
        }

        window.addEventListener('pageshow', revalidateRestoredPage);

        return () => {
            window.removeEventListener('pageshow', revalidateRestoredPage);
        };
    }, [hasTrial]);

    if (!trial) {
        return null;
    }

    return (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-center text-xs font-medium text-slate-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100 print:hidden">
            <span>Trial account</span>
            <span aria-hidden="true">·</span>
            <strong>
                {trial.expired
                    ? 'Trial expired'
                    : `${trial.remaining} of ${trial.limit} papers left`}
            </strong>
            <span aria-hidden="true">·</span>
            <span>Papers carry a trial watermark</span>
            <span aria-hidden="true">·</span>
            <Link
                href="/qa-tests/upgrade"
                className="font-bold text-brand-700 underline underline-offset-2 hover:text-brand-900 dark:text-sky-300"
            >
                Activate for {qatAnnualFee}
            </Link>
        </div>
    );
}

import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { notify } from '@/components/tm/toast';
import type { FlashToast } from '@/types/ui';

interface PageLike {
    props?: { flash?: { toast?: FlashToast | null } };
}

function showFrom(page: PageLike | undefined): void {
    const data = page?.props?.flash?.toast;

    if (data) {
        notify[data.type](data.message);
    }
}

/**
 * The first load is server-rendered and happens before any Inertia visit
 * event fires, so its flash lives only in the root element's data-page.
 */
function initialPage(): PageLike | undefined {
    const el = document.querySelector<HTMLElement>('[data-page]');

    if (!el?.dataset.page) {
        return undefined;
    }

    try {
        return JSON.parse(el.dataset.page) as PageLike;
    } catch {
        return undefined;
    }
}

/**
 * Shows a toast for anything the server flashed:
 *
 *   return redirect()->route('...')->with('toast', [
 *       'type' => 'success', 'message' => 'Saved',
 *   ]);
 *
 * Deliberately event-based rather than using usePage(): <Toaster /> is
 * mounted as a *sibling* of the Inertia app in app.tsx's withApp, so it
 * sits outside PageContext and usePage() would throw there — which blanked
 * the whole page.
 *
 * The original version listened on router.on('flash'), an event Inertia
 * does not have (before / start / progress / success / error / finish /
 * invalid / exception / navigate), so it silently never fired.
 */
export function useFlashToast(): void {
    useEffect(() => {
        showFrom(initialPage());

        return router.on('success', (event) => {
            showFrom(event.detail.page as PageLike);
        });
    }, []);
}

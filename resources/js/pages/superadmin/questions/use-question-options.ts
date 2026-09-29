import { useEffect, useState } from 'react';

export async function fetchQuestionJson<T>(
    url: string,
    signal?: AbortSignal,
): Promise<T> {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        signal,
    });

    if (!response.ok) {
        throw new Error(
            'The requested data could not be loaded. Please try again.',
        );
    }

    return response.json() as Promise<T>;
}

/** Each filter requests only its current parent scope; stale requests are cancelled. */
export function useQuestionJson<T>(url: string | null) {
    const [result, setResult] = useState<{
        url: string;
        data: T | null;
        error: string;
    } | null>(null);
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        if (!url) {
            return;
        }

        const controller = new AbortController();
        fetchQuestionJson<T>(url, controller.signal)
            .then((data) => {
                if (!controller.signal.aborted) {
                    setResult({ url, data, error: '' });
                }
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setResult({
                        url,
                        data: null,
                        error: 'The requested data could not be loaded.',
                    });
                }
            });

        return () => controller.abort();
    }, [url, revision]);

    return {
        data: url && result?.url === url ? result.data : null,
        loading: !!url && result?.url !== url,
        error: url && result?.url === url ? result.error : '',
        retry: () => {
            setResult(null);
            setRevision((value) => value + 1);
        },
    };
}

export function useQuestionOptions<T>(
    url: string | null,
    initialOptions: T[] = [],
) {
    const resource = useQuestionJson<{ options: T[] }>(url);

    return {
        ...resource,
        options: !url ? [] : (resource.data?.options ?? initialOptions),
    };
}

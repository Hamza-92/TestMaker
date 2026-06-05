const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function questionTextToHtml(value: string): string {
    const trimmed = value.trim();

    if (trimmed === '') {
        return '';
    }

    if (HTML_TAG_PATTERN.test(trimmed)) {
        return sanitizeQuestionHtml(trimmed);
    }

    return escapeHtml(value).replace(/\r?\n/g, '<br />');
}

export function questionTextToEditorHtml(value: string): string {
    const html = questionTextToHtml(value);

    return html === '' ? '<p><br></p>' : html;
}

export function sanitizeQuestionHtml(html: string): string {
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
        return fallbackSanitizeHtml(html);
    }

    const doc = new DOMParser().parseFromString(
        `<div>${html}</div>`,
        'text/html',
    );
    const root = doc.body.firstElementChild;

    if (!root) {
        return '';
    }

    root.querySelectorAll(
        'script, style, iframe, object, embed, form, input, button, textarea, select',
    ).forEach((node) => node.remove());

    root.querySelectorAll('*').forEach((node) => {
        Array.from(node.attributes).forEach((attribute) => {
            const name = attribute.name.toLowerCase();
            const value = attribute.value.trim();

            if (name.startsWith('on')) {
                node.removeAttribute(attribute.name);

                return;
            }

            if (
                (name === 'href' || name === 'src') &&
                /^(javascript:|data:text\/html)/i.test(value)
            ) {
                node.removeAttribute(attribute.name);

                return;
            }

            if (
                name === 'style' &&
                /(expression|javascript:|url\s*\()/i.test(value)
            ) {
                node.removeAttribute(attribute.name);
            }
        });
    });

    return root.innerHTML.trim();
}

function fallbackSanitizeHtml(html: string): string {
    return html
        .replace(
            /<\s*(script|style|iframe|object|embed|form|input|button|textarea|select)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
            '',
        )
        .replace(
            /<\s*(script|style|iframe|object|embed|form|input|button|textarea|select)[^>]*\/?>/gi,
            '',
        )
        .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
        .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:.*?\2/gi, '')
        .replace(
            /\sstyle\s*=\s*(['"])[^'"]*(expression|javascript:|url\s*\()[^'"]*\1/gi,
            '',
        );
}

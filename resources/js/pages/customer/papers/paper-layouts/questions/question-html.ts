import DOMPurify from 'dompurify';
import katex from 'katex';

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;
const HTML_ENTITY_PATTERN =
    /&(?:#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]+);/gi;
const FALLBACK_HTML_ENTITIES: Record<string, string> = {
    '&amp;': '&',
    '&apos;': "'",
    '&gt;': '>',
    '&lt;': '<',
    '&nbsp;': '\u00a0',
    '&quot;': '"',
};

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function escapeAttribute(value: string): string {
    return escapeHtml(value).replace(/`/g, '&#096;');
}

export function questionTextToHtml(value: string): string {
    const decodedValue = decodeHtmlEntities(value);
    const trimmed = decodedValue.trim();

    if (trimmed === '') {
        return '';
    }

    if (HTML_TAG_PATTERN.test(trimmed)) {
        return sanitizeQuestionHtml(renderEquationsInHtml(trimmed));
    }

    return escapeHtml(decodedValue).replace(/\r?\n/g, '<br />');
}

export function questionTextToEditorHtml(value: string): string {
    const html = questionTextToHtml(value);

    return html === '' ? '<p><br></p>' : html;
}

export function createEquationHtml({
    latex,
    displayMode,
}: {
    latex: string;
    displayMode: boolean;
}): string {
    const cleanedLatex = latex.trim();
    const rendered = renderLatex(cleanedLatex, displayMode);
    const blockClass = displayMode ? ' tm-equation-block' : '';
    const display = displayMode ? 'block' : 'inline';

    return `<span class="tm-equation${blockClass}" data-latex="${escapeAttribute(cleanedLatex)}" data-display="${display}" contenteditable="false">${rendered}</span>${displayMode ? '<p><br></p>' : '&nbsp;'}`;
}

export function sanitizeQuestionHtml(html: string): string {
    const renderedHtml = renderEquationsInHtml(html);

    if (typeof window === 'undefined') {
        return fallbackSanitizeHtml(renderedHtml);
    }

    return DOMPurify.sanitize(renderedHtml, {
        ADD_ATTR: ['data-latex', 'data-display', 'contenteditable', 'target'],
        ADD_TAGS: ['math', 'mrow', 'mi', 'mn', 'mo', 'msup', 'msub', 'mfrac'],
    }).trim();
}

export function renderLatex(latex: string, displayMode = false): string {
    if (latex.trim() === '') {
        return '';
    }

    return katex.renderToString(latex, {
        displayMode,
        output: 'html',
        strict: false,
        throwOnError: false,
        trust: false,
    });
}

function renderEquationsInHtml(html: string): string {
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
        return html;
    }

    const doc = new DOMParser().parseFromString(
        `<div>${html}</div>`,
        'text/html',
    );
    const root = doc.body.firstElementChild;

    if (!root) {
        return '';
    }

    root.querySelectorAll<HTMLElement>('.tm-equation[data-latex]').forEach(
        (node) => {
            const latex = node.dataset.latex ?? '';
            const displayMode = node.dataset.display === 'block';

            node.classList.add('tm-equation');
            node.classList.toggle('tm-equation-block', displayMode);
            node.setAttribute('contenteditable', 'false');
            node.innerHTML = renderLatex(latex, displayMode);
        },
    );

    return root.innerHTML;
}

function decodeHtmlEntities(value: string): string {
    let decoded = value;

    // A few imported records are encoded more than once. Decode a small,
    // bounded number of passes so those values are printable without turning
    // ordinary ampersands into an unbounded transformation.
    for (let pass = 0; pass < 3; pass += 1) {
        const next = decodeHtmlEntitiesOnce(decoded);

        if (next === decoded) {
            break;
        }

        decoded = next;
    }

    return decoded;
}

function decodeHtmlEntitiesOnce(value: string): string {
    if (!HTML_ENTITY_PATTERN.test(value)) {
        return value;
    }

    HTML_ENTITY_PATTERN.lastIndex = 0;

    if (typeof document !== 'undefined') {
        const decoder = document.createElement('textarea');

        return value.replace(HTML_ENTITY_PATTERN, (entity) => {
            decoder.innerHTML = entity;

            return decoder.value || entity;
        });
    }

    return value.replace(HTML_ENTITY_PATTERN, (entity) => {
        const normalized = entity.toLowerCase();
        const fallback = FALLBACK_HTML_ENTITIES[normalized];

        if (fallback !== undefined) {
            return fallback;
        }

        const numericMatch = normalized.match(/^&#x([0-9a-f]+);$/i);
        const decimalMatch = normalized.match(/^&#(\d+);$/);
        const codePoint = numericMatch
            ? Number.parseInt(numericMatch[1], 16)
            : decimalMatch
              ? Number.parseInt(decimalMatch[1], 10)
              : null;

        if (
            codePoint !== null &&
            codePoint <= 0x10ffff &&
            !(codePoint >= 0xd800 && codePoint <= 0xdfff)
        ) {
            return String.fromCodePoint(codePoint);
        }

        return entity;
    });
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

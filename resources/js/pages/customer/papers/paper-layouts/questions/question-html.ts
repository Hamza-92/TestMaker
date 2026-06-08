import DOMPurify from 'dompurify';
import katex from 'katex';

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

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
    const trimmed = value.trim();

    if (trimmed === '') {
        return '';
    }

    if (HTML_TAG_PATTERN.test(trimmed)) {
        return sanitizeQuestionHtml(renderEquationsInHtml(trimmed));
    }

    return escapeHtml(value).replace(/\r?\n/g, '<br />');
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

const ARABIC_WORD = /[\p{Script=Arabic}\p{Mark}]+/gu;
const URDU_LETTERS =
    /[\u0679\u0688\u0691\u06A9\u06AF\u06BA\u06BE\u06C1\u06C3\u06CC\u06D2\u06D3\u067E\u0686\u0698]/u;
const ARABIC_CUE = /\p{Mark}|[أإةىٱ]/u;

/** Conservative ranges: Urdu-specific letters keep their existing Urdu font. */
export function arabicPassageRanges(text: string): Array<[number, number]> {
    const ranges: Array<[number, number]> = [];
    let start = -1;
    let end = -1;
    let words = 0;

    const finish = () => {
        if (start < 0) {
            return;
        }

        const passage = text.slice(start, end);

        if (
            ARABIC_CUE.test(passage) ||
            (words > 2 && /[\u0647\u064A\u0643]/u.test(passage))
        ) {
            ranges.push([start, end]);
        }

        start = -1;
        end = -1;
        words = 0;
    };

    for (const match of text.matchAll(ARABIC_WORD)) {
        const index = match.index;
        const word = match[0];

        if (URDU_LETTERS.test(word)) {
            finish();
            continue;
        }

        if (start >= 0 && !/^\s+$/u.test(text.slice(end, index))) {
            finish();
        }

        if (start < 0) {
            start = index;
        }

        end = index + word.length;
        words += 1;
    }

    finish();

    return ranges;
}

/** Adds font markers only to Arabic text nodes in already-sanitized HTML. */
export function markArabicQuestionHtml(html: string): string {
    if (
        typeof document === 'undefined' ||
        (!ARABIC_CUE.test(html) && !/[\u0647\u064A\u0643]/u.test(html))
    ) {
        return html;
    }

    const root = document.createElement('div');
    root.innerHTML = html;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];

    while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const parent = node.parentElement;

        if (
            !parent ||
            parent.closest(
                '[lang="ar"], [data-paper-arabic-content], .katex, .tm-equation, math, code, pre',
            )
        ) {
            continue;
        }

        if (arabicPassageRanges(node.textContent ?? '').length > 0) {
            textNodes.push(node);
        }
    }

    for (const node of textNodes) {
        const text = node.textContent ?? '';
        const ranges = arabicPassageRanges(text);
        const fragment = document.createDocumentFragment();
        let cursor = 0;

        for (const [start, end] of ranges) {
            fragment.append(document.createTextNode(text.slice(cursor, start)));
            const arabic = document.createElement('span');
            arabic.lang = 'ar';
            arabic.setAttribute('data-paper-arabic-content', '');
            arabic.textContent = text.slice(start, end);
            fragment.append(arabic);
            cursor = end;
        }

        fragment.append(document.createTextNode(text.slice(cursor)));
        node.replaceWith(fragment);
    }

    return root.innerHTML;
}

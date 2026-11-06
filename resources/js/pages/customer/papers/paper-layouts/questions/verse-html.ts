const BLOCK_TAGS = new Set(['DIV', 'P', 'SECTION', 'BLOCKQUOTE']);
const VERSE_SEPARATOR =
    /[ \t\u00a0\u2003]*\u2003[ \t\u00a0\u2003]*|(?:\u00a0[ \t]*){4,}/u;
const PROSE_HEADING =
    /^(?:questions?\s*[:：]|سوالات\s*[:：۔]|سوال\s*(?:نمبر)?|ترجمہ\s*[:：۔])/iu;

function rangeHtml(range: Range): string {
    const holder = document.createElement('div');
    holder.append(range.cloneContents());

    return holder.innerHTML;
}

function splitAtBreaks(element: Element): string[] {
    const range = element.ownerDocument.createRange();
    range.setStart(element, 0);
    const lines: string[] = [];

    for (const lineBreak of element.querySelectorAll('br')) {
        range.setEndBefore(lineBreak);
        lines.push(rangeHtml(range));
        range.setStartAfter(lineBreak);
    }

    range.setEnd(element, element.childNodes.length);
    lines.push(rangeHtml(range));

    return lines;
}

function verseLines(root: Element): string[] {
    const nodes = Array.from(root.childNodes);
    const blockChildren = nodes.filter(
        (node): node is Element =>
            node.nodeType === Node.ELEMENT_NODE &&
            BLOCK_TAGS.has((node as Element).tagName),
    );

    if (
        blockChildren.length > 0 &&
        nodes.every(
            (node) =>
                blockChildren.includes(node as Element) ||
                (node.nodeType === Node.TEXT_NODE &&
                    (node.textContent ?? '').trim() === ''),
        )
    ) {
        return blockChildren.flatMap(splitAtBreaks);
    }

    return splitAtBreaks(root);
}

function visibleText(html: string): string {
    const holder = document.createElement('div');
    holder.innerHTML = html;

    return (holder.textContent ?? '').replace(/\u00a0/g, ' ').trim();
}

function trimVerseFragment(html: string): string {
    const holder = document.createElement('div');
    holder.innerHTML = html;
    const walker = document.createTreeWalker(holder, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];

    while (walker.nextNode()) {
        textNodes.push(walker.currentNode as Text);
    }

    if (textNodes.length > 0) {
        textNodes[0].textContent = (textNodes[0].textContent ?? '').replace(
            /^[\s\u00a0\u2003]+/u,
            '',
        );
        const last = textNodes[textNodes.length - 1];
        last.textContent = (last.textContent ?? '').replace(
            /[\s\u00a0\u2003]+$/u,
            '',
        );
    }

    return holder.innerHTML;
}

function splitVersePair(html: string): [string, string] | null {
    const holder = document.createElement('div');
    holder.innerHTML = html;
    const walker = document.createTreeWalker(holder, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const match = VERSE_SEPARATOR.exec(node.textContent ?? '');

        if (!match) {
            continue;
        }

        const left = document.createRange();
        left.setStart(holder, 0);
        left.setEnd(node, match.index);
        const right = document.createRange();
        right.setStart(node, match.index + match[0].length);
        right.setEnd(holder, holder.childNodes.length);
        const halves: [string, string] = [
            trimVerseFragment(rangeHtml(left)),
            trimVerseFragment(rangeHtml(right)),
        ];

        return halves.every((half) => visibleText(half) !== '') ? halves : null;
    }

    return null;
}

export function formatVerseHtml(
    html: string,
    direction?: 'ltr' | 'rtl',
): string {
    if (typeof DOMParser === 'undefined' || html.trim() === '') {
        return html;
    }

    const doc = new DOMParser().parseFromString(
        `<div>${html}</div>`,
        'text/html',
    );
    const root = doc.body.firstElementChild;

    if (!root || root.querySelector('table, img, svg, math')) {
        return html;
    }

    const bilingual = Array.from(root.children);

    if (
        bilingual.length === 2 &&
        bilingual.every((element) => element.tagName === 'DIV') &&
        bilingual[1].getAttribute('dir') === 'rtl'
    ) {
        return `<div>${formatVerseHtml(bilingual[0].innerHTML, 'ltr')}</div><div dir="rtl">${formatVerseHtml(bilingual[1].innerHTML, 'rtl')}</div>`;
    }

    const lines = verseLines(root);

    const firstProseLine = lines.findIndex((line) =>
        PROSE_HEADING.test(visibleText(line)),
    );
    const versePart =
        firstProseLine < 0 ? lines : lines.slice(0, firstProseLine);
    const prosePart = firstProseLine < 0 ? [] : lines.slice(firstProseLine);
    const pairs = versePart.map(splitVersePair);
    const nonemptyLines = versePart.filter((line) => visibleText(line) !== '');

    if (pairs.every((pair) => pair === null) && nonemptyLines.length < 2) {
        return html;
    }

    const rtl =
        direction === 'rtl' ||
        (direction === undefined &&
            /[\u0600-\u08ff]/u.test(root.textContent ?? ''));
    const verseRows = versePart
        .map((line, index) => {
            const pair = pairs[index];

            if (pair) {
                return `<div data-paper-verse-pair><span>${pair[0]}</span><span>${pair[1]}</span></div>`;
            }

            return visibleText(line) === ''
                ? '<div data-paper-verse-gap></div>'
                : `<div data-paper-verse-line>${trimVerseFragment(line)}</div>`;
        })
        .join('');
    const prose = prosePart.length
        ? `<div data-paper-verse-prose>${prosePart.join('<br>')}</div>`
        : '';

    return `<div data-paper-verse-block dir="${rtl ? 'rtl' : 'ltr'}">${verseRows}</div>${prose}`;
}

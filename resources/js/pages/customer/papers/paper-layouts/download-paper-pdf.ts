import { getFontEmbedCSS, toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { nextPaperPageEnd } from './pdf-pagination';
import type { PaperInterval } from './pdf-pagination';
import { getPageDimensions } from './types';
import type { PaperSettings } from './types';

const PX_PER_MM = 96 / 25.4;
const PIXEL_RATIO = 300 / 96;
const TRANSPARENT_IMAGE =
    'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
const IMAGE_LOAD_TIMEOUT_MS = 12000;

function timeout<T>(
    promise: Promise<T>,
    message: string,
    duration = 45000,
): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;

    return Promise.race([
        promise,
        new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(message)), duration);
        }),
    ]).finally(() => clearTimeout(timer));
}

async function loadAssets(root: HTMLElement): Promise<number> {
    await timeout(
        document.fonts.ready,
        'Paper fonts took too long to load. Please retry.',
    );
    const loaded = await Promise.all(
        Array.from(root.querySelectorAll('img')).map(async (img) => {
            img.loading = 'eager';

            try {
                await timeout(
                    img.decode(),
                    'Image load timed out',
                    IMAGE_LOAD_TIMEOUT_MS,
                );

                return true;
            } catch {
                if (img.complete && img.naturalWidth > 0) {
                    return true;
                }

                // A missing diagram must not discard the entire paper. Remove
                // it from this export clone so the capture library never tries
                // to fetch or decode the broken source again.
                img.remove();

                return false;
            }
        }),
    );

    return loaded.filter((valid) => !valid).length;
}

function cleanClone(source: HTMLElement): HTMLElement {
    const clone = source.cloneNode(true) as HTMLElement;

    // Additional sets are mounted for printing with `hidden print:block`.
    // They must be displayed when measured and captured outside print media.
    clone.classList.remove('hidden');
    clone.querySelectorAll<HTMLElement>('*').forEach((element) => {
        // Print-hidden controls are the only buttons removed: some headings
        // and question text are themselves editable buttons.
        if (
            element.classList.contains('print:hidden') ||
            element.hasAttribute('data-pdf-exclude')
        ) {
            element.remove();

            return;
        }

        element.removeAttribute('contenteditable');
        element.removeAttribute('autofocus');
        element.removeAttribute('id');

        if (element instanceof HTMLImageElement) {
            element.loading = 'eager';
        }
    });
    Object.assign(clone.style, {
        display: 'block',
        minHeight: '0',
        height: 'auto',
        maxWidth: 'none',
        margin: '0',
        padding: '0',
        overflow: 'visible',
        boxShadow: 'none',
        transform: 'none',
    });

    return clone;
}

/** Keep headings that fit on one line in the measured DOM on one line in the SVG capture. */
function preserveSingleLineHeadings(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('[data-paper-heading]').forEach(
        (heading) => {
            Array.from(heading.children).forEach((child) => {
                if (!(child instanceof HTMLElement)) {
                    return;
                }

                const lineHeight = Number.parseFloat(
                    getComputedStyle(child).lineHeight,
                );

                if (
                    Number.isFinite(lineHeight) &&
                    child.getBoundingClientRect().height <= lineHeight + 2 &&
                    child.scrollWidth <= child.clientWidth + 2
                ) {
                    child.style.whiteSpace = 'nowrap';
                }
            });
        },
    );
}

interface ObjectiveTableBorder {
    top: number;
    bottom: number;
    left: number;
    width: number;
    color: string;
    rowBoundaries: number[];
}

function objectiveTableBorders(root: HTMLElement): ObjectiveTableBorder[] {
    const rootRect = root.getBoundingClientRect();

    return Array.from(
        root.querySelectorAll<HTMLTableElement>('[data-paper-objective-table]'),
    ).map((table) => {
        const rect = table.getBoundingClientRect();
        const firstCell = table.querySelector('th, td');

        return {
            top: rect.top - rootRect.top,
            bottom: rect.bottom - rootRect.top,
            left: rect.left - rootRect.left,
            width: rect.width,
            color: firstCell
                ? getComputedStyle(firstCell).borderTopColor
                : '#000',
            rowBoundaries: Array.from(table.querySelectorAll('tr')).map(
                (row) => row.getBoundingClientRect().bottom - rootRect.top,
            ),
        };
    });
}

function tableBorderAt(
    tables: ObjectiveTableBorder[],
    position: number,
): ObjectiveTableBorder | undefined {
    return tables.find(
        (table) =>
            position > table.top + 1 &&
            position <= table.bottom + 1 &&
            table.rowBoundaries.some(
                (boundary) => Math.abs(boundary - position) <= 1.5,
            ),
    );
}

function measure(root: HTMLElement) {
    const offset = root.getBoundingClientRect().top;
    const interval = (element: Element): PaperInterval => {
        const rect = element.getBoundingClientRect();

        return {
            top: Math.max(0, rect.top - offset),
            bottom: rect.bottom - offset,
        };
    };
    const blocks = Array.from(
        root.querySelectorAll(
            '[data-paper-question], tr, [data-paper-header-frame], [data-bubble-sheet] > div > div',
        ),
    )
        .map(interval)
        .filter((rect) => rect.bottom > rect.top);
    // Keep a heading with the beginning of its following question.
    root.querySelectorAll(
        '[data-paper-heading], [data-paper-federal-section-heading]',
    ).forEach((heading) => {
        const rect = interval(heading);
        const following = blocks.find((block) => block.top >= rect.bottom - 1);
        blocks.push({
            top: rect.top,
            bottom: following
                ? Math.min(following.bottom, following.top + 32)
                : rect.bottom,
        });
    });
    const lines: PaperInterval[] = Array.from(
        root.querySelectorAll('img, svg, .katex'),
    ).map(interval);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const range = document.createRange();

    while (walker.nextNode()) {
        if (!walker.currentNode.textContent?.trim()) {
            continue;
        }

        range.selectNodeContents(walker.currentNode);

        for (const rect of range.getClientRects()) {
            if (rect.height > 0 && rect.width > 0) {
                lines.push({
                    top: Math.max(0, rect.top - offset),
                    bottom: rect.bottom - offset,
                });
            }
        }
    }

    const forcedBreaks = Array.from(
        root.querySelectorAll('[data-bubble-sheet-page="separate"]'),
    )
        .map((element) => interval(element).bottom)
        .sort((a, b) => a - b);

    return { blocks, lines, forcedBreaks };
}

interface ExportOptions {
    papers: HTMLElement[];
    settings: PaperSettings;
    name: string;
    onProgress?: (message: string) => void;
    onMissingImages?: (count: number) => void;
    /** Used by browser regression checks without triggering a download. */
    save?: boolean;
}

/** Raster PDF, generated locally. No paper data is sent to a PDF service. */
export async function downloadPaperPdf({
    papers,
    settings,
    name,
    onProgress,
    onMissingImages,
    save = true,
}: ExportOptions): Promise<jsPDF> {
    if (!papers.length) {
        throw new Error('The paper is not ready to download.');
    }

    const dimensions = getPageDimensions(
        settings.paperSize,
        settings.orientation,
    );
    const width =
        (dimensions.width - settings.marginLeft - settings.marginRight) *
        PX_PER_MM;
    const height =
        (dimensions.height - settings.marginTop - settings.marginBottom) *
        PX_PER_MM;

    if (width < 50 || height < 50) {
        throw new Error(
            'The selected margins leave too little space for the paper.',
        );
    }

    const holder = document.createElement('div');
    holder.setAttribute('aria-hidden', 'true');
    holder.inert = true;
    Object.assign(holder.style, {
        position: 'fixed',
        left: '-100000px',
        top: '0',
        width: `${width}px`,
        background: 'white',
        colorScheme: 'light',
    });
    document.body.append(holder);
    const pdf = new jsPDF({
        orientation: settings.orientation,
        unit: 'mm',
        format: [dimensions.width, dimensions.height],
        compress: true,
    });
    pdf.setProperties({ title: name, creator: 'TestMaker' });
    let pageCount = 0;

    try {
        // Freeze every selected set before the first asynchronous operation.
        const clones = papers.map((source) => {
            const clone = cleanClone(source);
            clone.style.width = `${width}px`;
            holder.append(clone);

            return clone;
        });
        onProgress?.('Loading paper fonts and images…');
        const missingImages = await loadAssets(holder);

        if (missingImages) {
            onMissingImages?.(missingImages);
        }

        // html-to-image rounds font sizes down by default. Preserve the
        // measured typography so pagination and captured line wraps agree.
        const fontSizes = Array.from(
            holder.querySelectorAll<HTMLElement>('*'),
        ).map(
            (element) => [element, getComputedStyle(element).fontSize] as const,
        );
        fontSizes.forEach(([element, size]) =>
            element.style.setProperty('font-size', size),
        );
        const captureStyleProperties = Array.from(
            getComputedStyle(document.documentElement),
        ).filter((property) => property !== 'font-size' && property !== 'font');
        preserveSingleLineHeadings(holder);

        const fontEmbedCSS = await timeout(
            getFontEmbedCSS(holder),
            'Could not prepare the paper fonts. Please retry.',
        );

        if (/url\(\s*["']?(?:https?:|\/)/i.test(fontEmbedCSS)) {
            throw new Error(
                'A paper font could not be embedded. Please retry after it has loaded.',
            );
        }

        const sharedWatermark = holder
            .querySelector('[data-paper-watermark]')
            ?.cloneNode(true) as HTMLElement | undefined;

        for (let setIndex = 0; setIndex < clones.length; setIndex++) {
            const clone = clones[setIndex];
            // Reuse the actual watermark on every exported page, including
            // secondary sets whose print-only markup omits it.
            const watermark = (
                clone.querySelector('[data-paper-watermark]') ?? sharedWatermark
            )?.cloneNode(true) as HTMLElement | undefined;
            clone.querySelector('[data-paper-watermark]')?.remove();

            const geometry = measure(clone);
            const tableBorders = objectiveTableBorders(clone);
            const totalHeight = clone.getBoundingClientRect().height;
            const cloneRect = clone.getBoundingClientRect();
            const tableHeaders: Array<{
                table: HTMLTableElement;
                head: HTMLTableSectionElement;
                top: number;
                bottom: number;
                left: number;
                width: number;
                height: number;
            }> = [];

            if (settings.repeatTableHeaders) {
                clone
                    .querySelectorAll<HTMLTableElement>(
                        '[data-paper-objective-table], [data-paper-federal-or-table]',
                    )
                    .forEach((table) => {
                        const head = table.querySelector('thead');

                        if (!head) {
                            return;
                        }

                        const tableRect = table.getBoundingClientRect();
                        const headRect = head.getBoundingClientRect();

                        tableHeaders.push({
                            table,
                            head,
                            top: tableRect.top - cloneRect.top,
                            bottom: tableRect.bottom - cloneRect.top,
                            left: tableRect.left - cloneRect.left,
                            width: tableRect.width,
                            height: headRect.height,
                        });
                    });
            }

            const questionBounds = Array.from(
                clone.querySelectorAll('[data-paper-question]'),
            ).map((question) => {
                const rect = question.getBoundingClientRect();
                const top = clone.getBoundingClientRect().top;

                return { top: rect.top - top, bottom: rect.bottom - top };
            });
            let start = 0;

            while (start < totalHeight - 0.5) {
                const repeatedTableHeader = tableHeaders.find(
                    (header) =>
                        start > header.top + header.height + 0.5 &&
                        start < header.bottom - 0.5,
                );
                const repeatedTableHeaderHeight =
                    repeatedTableHeader?.height ?? 0;
                // Nastaleeq ascenders can paint just above the CSS line box.
                // Leave a small overlap in the capture, hiding questions from
                // adjacent pages without collapsing their layout.
                const bleed = start > 0 ? 4 : 0;
                const capacity = height - repeatedTableHeaderHeight - bleed;
                const end = nextPaperPageEnd(
                    start,
                    capacity,
                    totalHeight,
                    geometry.blocks,
                    geometry.lines,
                    geometry.forcedBreaks,
                );
                const page = document.createElement('div');
                page.setAttribute('data-print-paper', '');
                // Inherit the same typography and CSS variables as the preview.
                page.style.cssText = clone.style.cssText;
                Object.assign(page.style, {
                    position: 'relative',
                    width: `${width}px`,
                    height: `${height}px`,
                    overflow: 'hidden',
                    background: 'white',
                });

                if (watermark) {
                    page.append(watermark.cloneNode(true));
                }

                const viewport = document.createElement('div');
                Object.assign(viewport.style, {
                    position: 'absolute',
                    top: repeatedTableHeaderHeight + 'px',
                    left: '0',
                    width: `${width}px`,
                    height: `${end - start + bleed}px`,
                    overflow: 'hidden',
                });
                const content = clone.cloneNode(true) as HTMLElement;
                Object.assign(content.style, {
                    position: 'absolute',
                    top: `${-start + bleed}px`,
                    left: '0',
                    background: 'transparent',
                });

                // The overlap used to protect Urdu ascenders must not bring
                // the previous bubble sheet's bottom border onto this page.
                if (
                    geometry.forcedBreaks.some((point) => point <= start + 0.5)
                ) {
                    content
                        .querySelectorAll<HTMLElement>(
                            '[data-bubble-sheet-page="separate"]',
                        )
                        .forEach((sheet) => {
                            sheet.style.visibility = 'hidden';
                        });
                }

                content
                    .querySelectorAll<HTMLElement>('[data-paper-question]')
                    .forEach((question, index) => {
                        const bounds = questionBounds[index];

                        if (
                            bounds &&
                            (bounds.bottom <= start + 0.5 ||
                                bounds.top >= end - 0.5)
                        ) {
                            question.style.visibility = 'hidden';
                        }
                    });
                viewport.append(content);
                page.append(viewport);

                // A collapsed table border straddles its row boundary. When
                // a PDF page ends exactly there, clipping removes half of the
                // rule, so draw the boundary inside both page captures.
                if (settings.questionBorderWidth > 0) {
                    const appendBoundary = (
                        table: ObjectiveTableBorder | undefined,
                        top: number,
                    ) => {
                        if (!table) {
                            return;
                        }

                        const rule = document.createElement('div');
                        Object.assign(rule.style, {
                            position: 'absolute',
                            top: `${top}px`,
                            left: `${table.left}px`,
                            width: `${table.width}px`,
                            borderTop: `${settings.questionBorderWidth}px ${settings.questionBorderStyle} ${table.color}`,
                            zIndex: '3',
                            pointerEvents: 'none',
                        });
                        page.append(rule);
                    };

                    if (start > 0) {
                        appendBoundary(
                            tableBorderAt(tableBorders, start),
                            repeatedTableHeaderHeight + bleed,
                        );
                    }

                    if (end < totalHeight - 0.5) {
                        appendBoundary(
                            tableBorderAt(tableBorders, end),
                            Math.min(
                                height - settings.questionBorderWidth,
                                repeatedTableHeaderHeight +
                                    end -
                                    start +
                                    bleed -
                                    settings.questionBorderWidth,
                            ),
                        );
                    }
                }

                if (repeatedTableHeader) {
                    const repeatedTable = repeatedTableHeader.table.cloneNode(
                        false,
                    ) as HTMLTableElement;
                    const colgroup =
                        repeatedTableHeader.table.querySelector('colgroup');

                    if (colgroup) {
                        repeatedTable.append(colgroup.cloneNode(true));
                    }

                    repeatedTable.append(
                        repeatedTableHeader.head.cloneNode(true),
                    );
                    Object.assign(repeatedTable.style, {
                        position: 'absolute',
                        top: '0',
                        left: repeatedTableHeader.left + 'px',
                        width: repeatedTableHeader.width + 'px',
                        margin: '0',
                        background: '#ffffff',
                        zIndex: '2',
                    });
                    page.append(repeatedTable);
                }

                holder.append(page);
                onProgress?.(`Creating PDF page ${pageCount + 1}…`);

                try {
                    const canvas = await timeout(
                        toCanvas(page, {
                            width,
                            height,
                            pixelRatio: PIXEL_RATIO,
                            backgroundColor: '#ffffff',
                            imagePlaceholder: TRANSPARENT_IMAGE,
                            onImageErrorHandler: () => undefined,
                            fontEmbedCSS,
                            includeStyleProperties: captureStyleProperties,
                            preferredFontFormat: 'woff2',
                            // The capture tree stays on-screen inside the serialized SVG.
                            style: { margin: '0', transform: 'none' },
                        }),
                        'A PDF page took too long to render. Try fewer sets.',
                    );

                    if (pageCount > 0) {
                        pdf.addPage(
                            [dimensions.width, dimensions.height],
                            settings.orientation,
                        );
                    }

                    pdf.addImage(
                        canvas,
                        'PNG',
                        settings.marginLeft,
                        settings.marginTop,
                        width / PX_PER_MM,
                        height / PX_PER_MM,
                        undefined,
                        'FAST',
                    );

                    canvas.width = 0;
                    canvas.height = 0;
                    pageCount++;
                } finally {
                    page.remove();
                }

                start = end;
                await new Promise<void>((resolve) => setTimeout(resolve, 0));
            }

            // Keep the original first-set watermark available for later sets.
            if (watermark && setIndex === 0) {
                clone.append(watermark);
            }
        }

        if (!pageCount) {
            throw new Error('The paper contains no printable content.');
        }

        const filename =
            Array.from(name)
                .map((character) =>
                    character.charCodeAt(0) < 32 ? '-' : character,
                )
                .join('')
                .replace(/[<>:"/\\|?*]/g, '-')
                .trim()
                .slice(0, 140) || 'Paper';

        if (save) {
            pdf.save(`${filename}.pdf`);
        }

        return pdf;
    } finally {
        holder.remove();
    }
}

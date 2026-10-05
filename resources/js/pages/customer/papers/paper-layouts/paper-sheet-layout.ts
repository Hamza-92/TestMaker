import { getPageDimensions } from './types';
import type { PaperSettings } from './types';

const PX_PER_MM = 96 / 25.4;
const GAP_MM = 3;

function within<T>(promise: Promise<T>, duration: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;

    return Promise.race([
        promise,
        new Promise<never>((_, reject) => {
            timer = setTimeout(
                () => reject(new Error('Paper assets timed out')),
                duration,
            );
        }),
    ]).finally(() => clearTimeout(timer));
}

interface Slot {
    x: number;
    y: number;
    width: number;
    height: number;
}

function slotsForSheet(
    count: number,
    landscape: boolean,
    width: number,
    height: number,
): Slot[] {
    const gap = GAP_MM * PX_PER_MM;

    if (count === 2 && landscape) {
        const slotWidth = (width - gap) / 2;

        return [0, 1].map((index) => ({
            x: index * (slotWidth + gap),
            y: 0,
            width: slotWidth,
            height,
        }));
    }

    if (count === 2 || (count === 3 && !landscape)) {
        const slotHeight = (height - gap * (count - 1)) / count;

        return Array.from({ length: count }, (_, index) => ({
            x: 0,
            y: index * (slotHeight + gap),
            width,
            height: slotHeight,
        }));
    }

    const slotWidth = (width - gap) / 2;
    const slotHeight = (height - gap) / 2;
    const slots = Array.from({ length: Math.min(count, 4) }, (_, index) => ({
        x: (index % 2) * (slotWidth + gap),
        y: Math.floor(index / 2) * (slotHeight + gap),
        width: slotWidth,
        height: slotHeight,
    }));

    if (count === 3 && landscape) {
        slots[2] = { x: 0, y: slotHeight + gap, width, height: slotHeight };
    }

    return slots;
}

function copyPrintablePaper(source: HTMLElement, width: number): HTMLElement {
    const clone = source.cloneNode(true) as HTMLElement;

    clone.querySelectorAll<HTMLElement>('*').forEach((element) => {
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
    clone.style.setProperty('width', `${width}px`, 'important');
    clone.style.setProperty('min-height', '0', 'important');

    return clone;
}

/**
 * Compose already-rendered set/copy DOM. Long papers and deliberate page
 * breaks stay with the normal one-paper pagination instead of being clipped.
 */
export async function composePaperSheets(
    sources: HTMLElement[],
    settings: PaperSettings,
): Promise<HTMLElement[] | null> {
    if (
        !settings.multiplePerSheetEnabled ||
        settings.papersPerSheet < 2 ||
        sources.length < 2 ||
        sources.some((source) => source.dataset.paperForcedPageBreak === 'true')
    ) {
        return null;
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
        return null;
    }

    const holder = document.createElement('div');
    Object.assign(holder.style, {
        position: 'fixed',
        left: '-100000px',
        top: '0',
        width: `${width}px`,
        background: 'white',
        colorScheme: 'light',
    });
    document.body.append(holder);

    try {
        const copies = sources.map((source) => {
            const copy = copyPrintablePaper(source, width);
            holder.append(copy);

            return copy;
        });

        await within(document.fonts.ready, 45000);
        await Promise.all(
            Array.from(holder.querySelectorAll('img')).map((image) =>
                within(image.decode(), 12000).catch(() => undefined),
            ),
        );

        const heights = copies.map(
            (copy) => copy.getBoundingClientRect().height,
        );

        if (heights.some((paperHeight) => paperHeight > height + 0.5)) {
            return null;
        }

        const count = Math.min(Math.max(settings.papersPerSheet, 2), 4);
        const sheets: HTMLElement[] = [];

        for (let start = 0; start < copies.length; start += count) {
            const sheet = document.createElement('div');
            sheet.setAttribute('data-print-paper', '');
            sheet.setAttribute('data-multi-paper-sheet', '');
            Object.assign(sheet.style, {
                position: 'relative',
                width: `${width}px`,
                height: `${height}px`,
                margin: '0',
                padding: '0',
                overflow: 'hidden',
                background: '#ffffff',
            });
            sheet.style.setProperty('width', `${width}px`, 'important');
            sheet.style.setProperty('height', `${height}px`, 'important');
            const pageCopies = copies.slice(start, start + count);
            const slots = slotsForSheet(
                count,
                settings.orientation === 'landscape',
                width,
                height,
            );

            pageCopies.forEach((copy, index) => {
                const slot = slots[index];
                // Reflow a short paper at its slot width first, keeping its
                // chosen text size. Scale the original layout only when the
                // narrower version would overflow the slot.
                copy.style.setProperty('width', `${slot.width}px`, 'important');
                const reflowFits =
                    copy.getBoundingClientRect().height <= slot.height + 0.5 &&
                    copy.scrollWidth <= slot.width + 1;
                const renderWidth = reflowFits ? slot.width : width;

                if (!reflowFits) {
                    copy.style.setProperty('width', `${width}px`, 'important');
                }

                const scale = reflowFits
                    ? 1
                    : Math.min(
                          slot.width / width,
                          slot.height / heights[start + index],
                          1,
                      );
                const frame = document.createElement('div');
                Object.assign(frame.style, {
                    position: 'absolute',
                    left: `${slot.x}px`,
                    top: `${slot.y}px`,
                    width: `${slot.width}px`,
                    height: `${slot.height}px`,
                    overflow: 'hidden',
                });
                Object.assign(copy.style, {
                    position: 'absolute',
                    left: `${(slot.width - renderWidth * scale) / 2}px`,
                    top: '0',
                    transformOrigin: 'top left',
                    transform: `scale(${scale})`,
                });
                frame.append(copy);
                sheet.append(frame);
            });
            sheets.push(sheet);
        }

        return sheets;
    } finally {
        holder.remove();
    }
}

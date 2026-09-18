export interface PaperInterval {
    top: number;
    bottom: number;
}

/** Prefer whole questions/rows; only split an oversized question between lines. */
export function nextPaperPageEnd(
    start: number,
    capacity: number,
    height: number,
    blocks: PaperInterval[],
    lines: PaperInterval[],
    forcedBreaks: number[],
): number {
    const limit = Math.min(start + capacity, height);
    let end =
        forcedBreaks.find((point) => point > start + 1 && point <= limit) ??
        limit;

    if (end >= height) {
        return height;
    }

    // Iteration handles overlapping columns, bilingual lines and nested blocks.
    for (let pass = 0; pass < blocks.length + lines.length + 1; pass++) {
        const crossingBlock = blocks.find(
            (block) =>
                block.top > start + 1 &&
                block.bottom - block.top <= capacity &&
                block.top < end - 0.5 &&
                block.bottom > end + 0.5,
        );

        // Font line boxes (especially Nastaleeq) may extend beyond their
        // question's CSS box. Do not chase those boxes backwards across
        // otherwise valid question/row boundaries.
        if (!crossingBlock && end < limit - 0.5) {
            return end;
        }

        const crossingLine = lines.find(
            (line) => line.top < end - 0.5 && line.bottom > end + 0.5,
        );
        const candidate = crossingBlock?.top ?? crossingLine?.top;

        if (candidate === undefined) {
            return end;
        }

        if (candidate <= start + 1) {
            throw new Error(
                'An image or equation is taller than a PDF page. Reduce its size or increase the paper size.',
            );
        }

        end = candidate;
    }

    throw new Error('Could not find a safe page break for this paper.');
}

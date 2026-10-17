import { useEffect, useRef, useState } from 'react';
import type { PaperWatermarkType } from './types';

const PX_PER_MM = 96 / 25.4;

interface PaperWatermarkProps {
    type: PaperWatermarkType;
    schoolName: string;
    logoUrl: string;
    opacity: number;
    pageHeightMm: number;
    marginTopMm: number;
    marginBottomMm: number;
}

export function PaperWatermark({
    type,
    schoolName,
    logoUrl,
    opacity,
    pageHeightMm,
    marginTopMm,
    marginBottomMm,
}: PaperWatermarkProps) {
    const firstWatermark = useRef<HTMLDivElement>(null);
    const [pageCount, setPageCount] = useState(1);
    const printableHeightMm = pageHeightMm - marginTopMm - marginBottomMm;
    const visible = type === 'text' ? schoolName.trim() !== '' : logoUrl !== '';

    useEffect(() => {
        const paper = firstWatermark.current?.parentElement;

        if (!paper || !visible || printableHeightMm <= 0) {
            return;
        }

        const updatePageCount = () => {
            const contentHeight = Math.max(
                0,
                paper.getBoundingClientRect().height -
                    (marginTopMm + marginBottomMm) * PX_PER_MM,
            );
            const pagesByHeight = Math.ceil(
                (contentHeight - 0.5) / (printableHeightMm * PX_PER_MM),
            );
            const forcedPages =
                paper.querySelectorAll('[data-paper-section-page-break]')
                    .length + 1;

            setPageCount(Math.max(1, pagesByHeight, forcedPages));
        };

        updatePageCount();
        const observer = new ResizeObserver(updatePageCount);
        observer.observe(paper);

        return () => observer.disconnect();
    }, [visible, printableHeightMm, marginTopMm, marginBottomMm]);

    if (!visible || printableHeightMm <= 0) {
        return null;
    }

    return Array.from({ length: pageCount }, (_, index) => (
        <div
            key={index}
            ref={index === 0 ? firstWatermark : undefined}
            data-paper-watermark
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 z-0 flex items-center justify-center"
            style={{
                top: `calc(var(--paper-watermark-start, ${marginTopMm}mm) + ${index * printableHeightMm}mm)`,
                height: `${printableHeightMm}mm`,
                opacity,
            }}
        >
            {type === 'text' ? (
                <span
                    className="select-none text-center font-bold uppercase"
                    style={{
                        fontSize: '3.5rem',
                        transform: 'rotate(-30deg)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {schoolName}
                </span>
            ) : (
                <img
                    src={logoUrl}
                    alt=""
                    draggable={false}
                    className="max-h-[45%] max-w-[45%] select-none object-contain"
                />
            )}
        </div>
    ));
}

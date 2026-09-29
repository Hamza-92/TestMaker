import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnnouncementTickerProps {
    text: string;
    direction: 'ltr' | 'rtl';
    duration: number;
    textStyle?: CSSProperties;
    isUrdu?: boolean;
}

export function AnnouncementTicker({
    text,
    direction,
    duration,
    textStyle,
    isUrdu = false,
}: AnnouncementTickerProps) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const firstCopyRef = useRef<HTMLSpanElement>(null);
    const [measurement, setMeasurement] = useState({ distance: 0, copies: 2 });

    useEffect(() => {
        const viewport = viewportRef.current;
        const firstCopy = firstCopyRef.current;

        if (!viewport || !firstCopy) {
            return;
        }

        const update = () => {
            const distance = firstCopy.getBoundingClientRect().width;
            const width = viewport.getBoundingClientRect().width;

            if (distance <= 0 || width <= 0) {
                return;
            }

            const next = {
                distance,
                copies: Math.max(2, Math.ceil(width / distance) + 2),
            };
            setMeasurement((current) =>
                current.distance === next.distance &&
                current.copies === next.copies
                    ? current
                    : next,
            );
        };

        const observer = new ResizeObserver(update);
        observer.observe(viewport);
        observer.observe(firstCopy);
        update();

        return () => observer.disconnect();
    }, [text, direction]);

    const style = {
        ...textStyle,
        '--announcement-ticker-distance': `${measurement.distance}px`,
        animationDuration: `${duration}s`,
        animationPlayState: measurement.distance ? undefined : 'paused',
    } as CSSProperties;

    return (
        <div
            ref={viewportRef}
            className={cn(
                'announcement-ticker',
                isUrdu && 'announcement-ticker-urdu',
            )}
            dir={direction}
            style={textStyle}
        >
            <span className="sr-only">{text}</span>
            <div
                className={cn(
                    'announcement-ticker-track',
                    direction === 'rtl' && 'announcement-ticker-track-rtl',
                )}
                style={style}
                aria-hidden="true"
            >
                {Array.from({ length: measurement.copies }, (_, index) => (
                    <span
                        key={index}
                        ref={index === 0 ? firstCopyRef : undefined}
                        className="announcement-ticker-copy"
                        dir={direction}
                    >
                        <span>{text}</span>
                        <span className="announcement-ticker-separator">•</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

import { useEffect, useRef, useState } from 'react';

type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

interface HeaderLogoProps {
    logoUrl?: string;
    schoolName: string;
    initialSize: number;
    imageClassName: string;
    fallbackClassName: string;
}

const MIN_LOGO_SIZE = 32;
const MAX_LOGO_SIZE = 320;

const HANDLE_CLASS_NAMES: Record<ResizeCorner, string> = {
    nw: '-top-1.5 -left-1.5 cursor-nwse-resize',
    ne: '-top-1.5 -right-1.5 cursor-nesw-resize',
    sw: '-bottom-1.5 -left-1.5 cursor-nesw-resize',
    se: '-bottom-1.5 -right-1.5 cursor-nwse-resize',
};

export function HeaderLogo({
    logoUrl,
    schoolName,
    initialSize,
    imageClassName,
    fallbackClassName,
}: HeaderLogoProps) {
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const [size, setSize] = useState(() =>
        Math.min(Math.max(initialSize, MIN_LOGO_SIZE), MAX_LOGO_SIZE),
    );
    const [isSelected, setIsSelected] = useState(false);
    const logoRef = useRef<HTMLDivElement>(null);
    const resizeRef = useRef<{
        corner: ResizeCorner;
        startX: number;
        startY: number;
        startSize: number;
    } | null>(null);
    const initials =
        schoolName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0])
            .join('')
            .toUpperCase() || 'TM';

    useEffect(() => {
        if (!isSelected) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (!logoRef.current?.contains(event.target as Node)) {
                setIsSelected(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);

        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [isSelected]);

    function handleResizeStart(
        event: React.PointerEvent<HTMLButtonElement>,
        corner: ResizeCorner,
    ) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        resizeRef.current = {
            corner,
            startX: event.clientX,
            startY: event.clientY,
            startSize: size,
        };
    }

    function handleResizeMove(event: React.PointerEvent<HTMLButtonElement>) {
        const active = resizeRef.current;

        if (!active) {
            return;
        }

        const deltaX = event.clientX - active.startX;
        const deltaY = event.clientY - active.startY;
        const horizontalDelta = active.corner.includes('e') ? deltaX : -deltaX;
        const verticalDelta = active.corner.includes('s') ? deltaY : -deltaY;
        const nextSize = active.startSize + (horizontalDelta + verticalDelta) / 2;

        setSize(Math.min(Math.max(nextSize, MIN_LOGO_SIZE), MAX_LOGO_SIZE));
    }

    function handleResizeEnd(event: React.PointerEvent<HTMLButtonElement>) {
        resizeRef.current = null;

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    }

    const initialsOrLogo =
        logoUrl && failedUrl !== logoUrl ? (
            <img
                src={logoUrl}
                alt=""
                draggable={false}
                onError={() => setFailedUrl(logoUrl)}
                className={'block size-full rounded-full object-cover ' + imageClassName}
            />
        ) : (
            <div className={fallbackClassName + ' size-full'}>{initials}</div>
        );

    return (
        <div
            className={'relative shrink-0 select-none ' + (isSelected ? 'z-20' : '')}
            ref={logoRef}
            style={{ width: size, height: size }}
            onClick={(event) => {
                event.stopPropagation();
                setIsSelected(true);
            }}
        >
            {initialsOrLogo}
            {isSelected && (
                <div className="pointer-events-none absolute inset-0 print:hidden">
                    <div className="absolute inset-0 rounded-full ring-2 ring-brand-500 ring-offset-2" />
                    {(Object.keys(HANDLE_CLASS_NAMES) as ResizeCorner[]).map(
                        (corner) => (
                            <button
                                key={corner}
                                type="button"
                                aria-label={'Resize logo ' + corner}
                                className={
                                    'pointer-events-auto absolute size-3 rounded-full border-2 border-white bg-brand-600 shadow-sm ' +
                                    HANDLE_CLASS_NAMES[corner]
                                }
                                onPointerDown={(event) =>
                                    handleResizeStart(event, corner)
                                }
                                onPointerMove={handleResizeMove}
                                onPointerUp={handleResizeEnd}
                                onPointerCancel={handleResizeEnd}
                            />
                        ),
                    )}
                </div>
            )}
        </div>
    );
}

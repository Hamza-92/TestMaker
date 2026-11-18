import {
    ImageUpIcon,
    LockKeyholeIcon,
    UnlockKeyholeIcon,
    XIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import type { PaperImageChange } from './paper-image-edit';

export interface PaperImageTarget {
    selectionId: number;
    image: HTMLImageElement;
    sectionId: string;
    questionId: string;
}

interface Props {
    target: PaperImageTarget;
    onSave: (
        sectionId: string,
        questionId: string,
        change: PaperImageChange,
    ) => void;
    onClose: () => void;
}

const clampSize = (value: number) =>
    Math.max(1, Math.min(4000, Math.round(value)));

export function PaperImageEditor({ target, onSave, onClose }: Props) {
    const { image } = target;
    const original = useRef({
        src: image.getAttribute('src') ?? image.src,
        width: image.style.width,
        height: image.style.height,
        maxHeight: image.style.maxHeight,
    });
    const committed = useRef(false);
    const initialRect = image.getBoundingClientRect();
    const [width, setWidth] = useState(() => clampSize(initialRect.width));
    const [height, setHeight] = useState(() => clampSize(initialRect.height));
    const [locked, setLocked] = useState(true);
    const [rect, setRect] = useState(initialRect);
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const objectUrl = useRef<string | null>(null);
    const stopDragging = useRef<(() => void) | null>(null);
    const ratio = useRef(initialRect.width / Math.max(1, initialRect.height));
    const fileInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const reposition = () => {
            if (image.isConnected) {
                setRect(image.getBoundingClientRect());
            } else {
                onClose();
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
        window.addEventListener('keydown', onKeyDown);

        return () => {
            stopDragging.current?.();

            window.removeEventListener('scroll', reposition, true);
            window.removeEventListener('resize', reposition);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [image, onClose]);

    useEffect(() => {
        const initial = original.current;
        const initialSize = image.getBoundingClientRect();
        image.style.width = `${clampSize(initialSize.width)}px`;
        image.style.height = `${clampSize(initialSize.height)}px`;
        image.style.maxHeight = 'none';

        return () => {
            if (!committed.current) {
                image.setAttribute('src', initial.src);
                image.style.width = initial.width;
                image.style.height = initial.height;
            }

            image.style.maxHeight = initial.maxHeight;

            if (objectUrl.current) {
                URL.revokeObjectURL(objectUrl.current);
            }
        };
    }, [image]);

    function preview(nextWidth: number, nextHeight: number) {
        image.style.width = `${nextWidth}px`;
        image.style.height = `${nextHeight}px`;
        setWidth(nextWidth);
        setHeight(nextHeight);
        setRect(image.getBoundingClientRect());
    }

    function updateWidth(value: number) {
        const next = clampSize(value);
        preview(next, locked ? clampSize(next / ratio.current) : height);
    }

    function updateHeight(value: number) {
        const next = clampSize(value);
        preview(locked ? clampSize(next * ratio.current) : width, next);
    }

    function startResize(
        event: ReactPointerEvent<HTMLButtonElement>,
        horizontal: -1 | 1,
        vertical: -1 | 1,
    ) {
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = width;
        const startHeight = height;

        const move = (pointer: PointerEvent) => {
            const nextWidth = clampSize(
                startWidth + (pointer.clientX - startX) * horizontal,
            );
            const nextHeight = locked
                ? clampSize(nextWidth / ratio.current)
                : clampSize(
                      startHeight + (pointer.clientY - startY) * vertical,
                  );
            preview(nextWidth, nextHeight);
        };
        const stop = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', stop);
            window.removeEventListener('pointercancel', stop);
            stopDragging.current = null;
        };
        stopDragging.current?.();
        stopDragging.current = stop;
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop, { once: true });
        window.addEventListener('pointercancel', stop, { once: true });
    }

    function chooseFile(selected: File | undefined) {
        if (!selected) {
            return;
        }

        if (
            !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(
                selected.type,
            ) ||
            selected.size > 4 * 1024 * 1024
        ) {
            toast.error('Choose a JPEG, PNG, WebP or GIF image under 4 MB.');

            return;
        }

        if (objectUrl.current) {
            URL.revokeObjectURL(objectUrl.current);
        }

        objectUrl.current = URL.createObjectURL(selected);
        preview(width, height);
        image.src = objectUrl.current;
        setFile(selected);
    }

    async function save() {
        setSaving(true);

        try {
            let replacementSrc: string | undefined;

            if (file) {
                const body = new FormData();
                body.append('file', file);
                const token =
                    document.querySelector<HTMLMetaElement>(
                        'meta[name="csrf-token"]',
                    )?.content ?? '';
                const response = await fetch('/papers/images', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': token,
                    },
                    body,
                });

                if (!response.ok) {
                    throw new Error('Image upload failed. Please try again.');
                }

                const result: { location?: string } = await response.json();

                if (!result.location) {
                    throw new Error('Image upload failed. Please try again.');
                }

                replacementSrc = result.location;
            }

            onSave(target.sectionId, target.questionId, {
                originalSrc: original.current.src,
                replacementSrc,
                width,
                height,
            });
            committed.current = true;
            onClose();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Image could not be saved.',
            );
        } finally {
            setSaving(false);
        }
    }

    const barTop = rect.top >= 70 ? rect.top - 60 : rect.bottom + 12;
    const barLeft = Math.max(8, Math.min(rect.left, window.innerWidth - 440));

    return createPortal(
        <div className="print:hidden">
            <div
                className="pointer-events-none fixed z-[100] rounded-sm border-2 border-blue-600 shadow-[0_0_0_2px_white]"
                style={{
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                }}
            >
                {(
                    [
                        [-1, -1],
                        [1, -1],
                        [-1, 1],
                        [1, 1],
                    ] as const
                ).map(([horizontal, vertical]) => (
                    <button
                        key={`${horizontal}:${vertical}`}
                        type="button"
                        aria-label={`Resize image from ${vertical < 0 ? 'top' : 'bottom'} ${horizontal < 0 ? 'left' : 'right'}`}
                        onPointerDown={(event) =>
                            startResize(event, horizontal, vertical)
                        }
                        className="pointer-events-auto absolute size-3 rounded-sm border-2 border-white bg-blue-600 shadow"
                        style={{
                            left: horizontal < 0 ? -7 : undefined,
                            right: horizontal > 0 ? -7 : undefined,
                            top: vertical < 0 ? -7 : undefined,
                            bottom: vertical > 0 ? -7 : undefined,
                            cursor: `${horizontal === vertical ? 'nwse' : 'nesw'}-resize`,
                        }}
                    />
                ))}
            </div>
            <div
                role="toolbar"
                aria-label="Image size and replacement"
                className="fixed z-[101] flex max-w-[calc(100vw-16px)] flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 shadow-xl"
                style={{
                    left: barLeft,
                    top: Math.max(8, Math.min(barTop, window.innerHeight - 58)),
                }}
            >
                <label className="flex items-center gap-1">
                    Width
                    <input
                        autoFocus
                        aria-label="Image width in pixels"
                        type="number"
                        min={1}
                        max={4000}
                        value={width}
                        onChange={(event) =>
                            updateWidth(Number(event.target.value))
                        }
                        className="w-14 rounded border px-1 py-1"
                    />
                </label>
                <button
                    type="button"
                    aria-label={
                        locked ? 'Unlock aspect ratio' : 'Lock aspect ratio'
                    }
                    onClick={() => {
                        ratio.current = width / Math.max(1, height);
                        setLocked(!locked);
                    }}
                    className="rounded p-1 hover:bg-slate-100"
                >
                    {locked ? (
                        <LockKeyholeIcon className="size-3.5" />
                    ) : (
                        <UnlockKeyholeIcon className="size-3.5" />
                    )}
                </button>
                <label className="flex items-center gap-1">
                    Height
                    <input
                        aria-label="Image height in pixels"
                        type="number"
                        min={1}
                        max={4000}
                        value={height}
                        onChange={(event) =>
                            updateHeight(Number(event.target.value))
                        }
                        className="w-14 rounded border px-1 py-1"
                    />
                </label>
                <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => {
                        chooseFile(event.target.files?.[0]);
                        event.currentTarget.value = '';
                    }}
                />
                <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="flex items-center gap-1 rounded border px-2 py-1 hover:bg-slate-50"
                >
                    <ImageUpIcon className="size-3.5" /> Replace
                </button>
                <button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving}
                    className="rounded bg-blue-600 px-2 py-1 font-semibold text-white disabled:opacity-50"
                >
                    {saving ? 'Saving' : 'Apply'}
                </button>
                <button
                    type="button"
                    aria-label="Cancel image changes"
                    onClick={onClose}
                    className="rounded p-1 hover:bg-slate-100"
                >
                    <XIcon className="size-3.5" />
                </button>
            </div>
        </div>,
        document.body,
    );
}

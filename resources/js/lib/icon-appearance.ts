import type { CSSProperties } from 'react';

export const ICON_COLOR_OPTIONS = [
    '#4f46e5',
    '#059669',
    '#0284c7',
    '#ea580c',
    '#0f9fa8',
    '#db2777',
    '#4338ca',
    '#7c3aed',
    '#0891b2',
    '#16a34a',
    '#d97706',
    '#dc2626',
];

export const DEFAULT_ICON_COLOR = '#4f46e5';

function iconColor(color?: string | null): string {
    return /^#[0-9a-f]{6}$/i.test(color ?? '') ? color! : DEFAULT_ICON_COLOR;
}

export function iconCardStyle(
    color?: string | null,
): CSSProperties & { '--tm-accent': string; '--tm-accent-rgb': string } {
    const solid = iconColor(color);

    return {
        '--tm-accent': solid,
        '--tm-accent-rgb': hexRgb(solid).join(', '),
    };
}

function hexRgb(hex: string): [number, number, number] {
    return [1, 3, 5].map((offset) =>
        parseInt(hex.slice(offset, offset + 2), 16),
    ) as [number, number, number];
}

export function iconContainerStyle(color?: string | null): CSSProperties {
    const solid = iconColor(color);

    return {
        color: solid,
        backgroundColor: `rgba(${hexRgb(solid).join(', ')}, 0.1)`,
        boxShadow: `0 3px 9px ${solid}26`,
    };
}

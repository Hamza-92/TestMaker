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
): CSSProperties & { '--tm-accent': string } {
    return { '--tm-accent': iconColor(color) };
}

export function iconContainerStyle(color?: string | null): CSSProperties {
    const solid = iconColor(color);

    return {
        color: solid,
        backgroundColor: `color-mix(in srgb, ${solid} 10%, var(--card, white))`,
        boxShadow: `0 3px 9px ${solid}26`,
    };
}

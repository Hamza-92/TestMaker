import { Badge } from '@/components/ui/badge';

const sourceBadgeColors: Record<
    string,
    { backgroundColor: string; borderColor: string; color: string }
> = {
    exercise: {
        backgroundColor: '#bbf7d0',
        borderColor: '#4ade80',
        color: '#14532d',
    },
    additional: {
        backgroundColor: '#bfdbfe',
        borderColor: '#60a5fa',
        color: '#1e3a8a',
    },
    'past paper': {
        backgroundColor: '#fde68a',
        borderColor: '#fbbf24',
        color: '#78350f',
    },
    'exercise examples': {
        backgroundColor: '#ddd6fe',
        borderColor: '#a78bfa',
        color: '#4c1d95',
    },
    'conceptual questions': {
        backgroundColor: '#fecdd3',
        borderColor: '#fb7185',
        color: '#881337',
    },
};

const neutralBadgeColors = {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    color: '#475569',
};

function normalizeSource(value: string): string {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ');

    return normalized === 'past papers' ? 'past paper' : normalized;
}

export function SourceBadge({
    source,
    label,
}: {
    source: string | null;
    label?: string | null;
}) {
    const colors =
        sourceBadgeColors[normalizeSource(source ?? '')] ??
        sourceBadgeColors[normalizeSource(label ?? '')] ??
        neutralBadgeColors;

    return (
        <Badge variant="outline" className="font-semibold" style={colors}>
            {label || source || 'Not set'}
        </Badge>
    );
}

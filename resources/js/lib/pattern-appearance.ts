import {
    AtomIcon,
    BookOpenIcon,
    FeatherIcon,
    GraduationCapIcon,
    Grid2X2Icon,
    LandmarkIcon,
    LibraryBigIcon,
    LightbulbIcon,
    MountainIcon,
    SchoolIcon,
    ShapesIcon,
    SunIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PatternIconOption {
    value: string;
    label: string;
    icon: LucideIcon;
}

export const PATTERN_ICON_OPTIONS: PatternIconOption[] = [
    { value: 'graduation-cap', label: 'Graduation', icon: GraduationCapIcon },
    { value: 'landmark', label: 'Board', icon: LandmarkIcon },
    { value: 'book-open', label: 'Book', icon: BookOpenIcon },
    { value: 'mountain', label: 'Mountain', icon: MountainIcon },
    { value: 'feather', label: 'Feather', icon: FeatherIcon },
    { value: 'sun', label: 'Sun', icon: SunIcon },
    { value: 'school', label: 'School', icon: SchoolIcon },
    { value: 'lightbulb', label: 'Idea', icon: LightbulbIcon },
    { value: 'grid', label: 'Grid', icon: Grid2X2Icon },
    { value: 'library', label: 'Library', icon: LibraryBigIcon },
    { value: 'atom', label: 'Science', icon: AtomIcon },
    { value: 'shapes', label: 'Shapes', icon: ShapesIcon },
];

export const PATTERN_COLOR_OPTIONS = [
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

export function patternIcon(value: string | null | undefined): LucideIcon {
    return (
        PATTERN_ICON_OPTIONS.find((option) => option.value === value)?.icon ??
        GraduationCapIcon
    );
}

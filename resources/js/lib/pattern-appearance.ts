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

export { ICON_COLOR_OPTIONS as PATTERN_COLOR_OPTIONS } from './icon-appearance';

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

export function patternIcon(value: string | null | undefined): LucideIcon {
    return (
        PATTERN_ICON_OPTIONS.find((option) => option.value === value)?.icon ??
        GraduationCapIcon
    );
}

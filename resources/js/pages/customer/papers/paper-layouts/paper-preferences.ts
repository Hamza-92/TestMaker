import { normalizePaperSettings } from './types';
import type {
    GeneratedPaperHeader,
    PaperSettings,
    PaperViewMode,
} from './types';

export interface PaperPreferences {
    settings: Partial<PaperSettings>;
    header: Partial<
        Pick<GeneratedPaperHeader, 'exam' | 'section' | 'type' | 'duration'>
    >;
    viewMode: PaperViewMode;
    numSets: number;
}

/** Board and subject assignments remain authoritative over account defaults. */
export function persistablePaperSettings(
    settings: PaperSettings,
): Partial<PaperSettings> {
    const result: Partial<PaperSettings> = { ...settings };
    delete result.paperLayout;
    delete result.objectiveLayout;
    delete result.objectiveBubblesEnabled;

    return result;
}

export function preferredPaperSettings(
    preferences?: PaperPreferences | null,
): PaperSettings {
    return normalizePaperSettings(preferences?.settings);
}

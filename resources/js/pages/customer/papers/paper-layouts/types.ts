export type PaperImageSize = 'sm' | 'md' | 'lg';
export type PaperSectionCategory =
    | 'Objective Questions'
    | 'Subjective Questions';

export interface PaperQuestionOption {
    id: string;
    text: string;
}

export interface GeneratedPaperQuestion {
    id: string;
    sourceQuestionId: number | null;
    text: string;
    source: string | null;
    sourceLabel: string | null;
    chapterLabel: string | null;
    topicLabel: string | null;
    imageUrl: string | null;
    imageSize: PaperImageSize;
    options: PaperQuestionOption[];
    answerLines: number;
}

export interface GeneratedPaperSection {
    id: string;
    questionTypeId: number | null;
    category: PaperSectionCategory;
    title: string;
    requiredQuestions: number;
    totalQuestions: number;
    marksEach: number;
    questions: GeneratedPaperQuestion[];
}

export interface GeneratedPaperHeader {
    schoolName: string;
    exam: string;
    className: string;
    section: string;
    subject: string;
    studentName: string;
    type: string;
    date: string;
    duration: string;
    marks: number;
    passingMarks: number;
    rollNo: string;
}

export type PaperEnglishFont = 'sans' | 'serif' | 'mono';
export type PaperUrduFont = 'jameel-noori' | 'noto-nastaliq' | 'mehr-nastaliq';

export interface PaperSettings {
    englishFont: PaperEnglishFont;
    urduFont: PaperUrduFont;
    /** Paper header font size in px (the school/exam/class/subject fields at the top). */
    headerSize: number;
    /** Paper header line-height (unitless multiplier). */
    headerLineHeight: number;
    /** Section heading font size in px (the "Q.1 Title (5x1=5)" rows). */
    headingSize: number;
    /** Section heading line-height (unitless multiplier). */
    headingLineHeight: number;
    /** Body / question + option font size in px. */
    questionSize: number;
    /** Question line-height (unitless multiplier). */
    questionLineHeight: number;
    /** Paper border enabled state. */
    paperBorderEnabled: boolean;
    /** Paper border width in pixels. */
    paperBorderWidth: number;
    /** Paper border style for the paper frame. */
    paperBorderStyle: 'solid' | 'dashed' | 'dotted';
}

export const DEFAULT_PAPER_SETTINGS: PaperSettings = {
    englishFont: 'sans',
    urduFont: 'jameel-noori',
    headerSize: 14,
    headerLineHeight: 1.5,
    headingSize: 14,
    headingLineHeight: 1.5,
    questionSize: 14,
    questionLineHeight: 1.5,
    paperBorderEnabled: true,
    paperBorderWidth: 1,
    paperBorderStyle: 'solid',
};

const ENGLISH_FONT_VALUES = new Set<PaperEnglishFont>(['sans', 'serif', 'mono']);
const URDU_FONT_VALUES = new Set<PaperUrduFont>([
    'jameel-noori',
    'noto-nastaliq',
    'mehr-nastaliq',
]);

/**
 * Coerce a settings blob from a saved paper into the current PaperSettings
 * shape. Handles two backwards-compat cases:
 *   - The original single `fontFamily` field (sans/serif/mono) is folded into
 *     `englishFont` and the default Urdu font is filled in.
 *   - Anything missing or unrecognized falls back to DEFAULT_PAPER_SETTINGS.
 */
export function normalizePaperSettings(raw: unknown): PaperSettings {
    if (!raw || typeof raw !== 'object') {
        return { ...DEFAULT_PAPER_SETTINGS };
    }

    const source = raw as Record<string, unknown>;
    const legacyFont = source.fontFamily;
    const englishCandidate =
        (source.englishFont as PaperEnglishFont | undefined) ??
        (typeof legacyFont === 'string'
            ? (legacyFont as PaperEnglishFont)
            : undefined);
    const urduCandidate = source.urduFont as PaperUrduFont | undefined;

    return {
        englishFont:
            englishCandidate && ENGLISH_FONT_VALUES.has(englishCandidate)
                ? englishCandidate
                : DEFAULT_PAPER_SETTINGS.englishFont,
        urduFont:
            urduCandidate && URDU_FONT_VALUES.has(urduCandidate)
                ? urduCandidate
                : DEFAULT_PAPER_SETTINGS.urduFont,
        headerSize:
            typeof source.headerSize === 'number'
                ? source.headerSize
                : DEFAULT_PAPER_SETTINGS.headerSize,
        headerLineHeight:
            typeof source.headerLineHeight === 'number'
                ? source.headerLineHeight
                : DEFAULT_PAPER_SETTINGS.headerLineHeight,
        headingSize:
            typeof source.headingSize === 'number'
                ? source.headingSize
                : DEFAULT_PAPER_SETTINGS.headingSize,
        headingLineHeight:
            typeof source.headingLineHeight === 'number'
                ? source.headingLineHeight
                : DEFAULT_PAPER_SETTINGS.headingLineHeight,
        questionSize:
            typeof source.questionSize === 'number'
                ? source.questionSize
                : DEFAULT_PAPER_SETTINGS.questionSize,
        questionLineHeight:
            typeof source.questionLineHeight === 'number'
                ? source.questionLineHeight
                : DEFAULT_PAPER_SETTINGS.questionLineHeight,
        paperBorderEnabled:
            typeof source.paperBorderEnabled === 'boolean'
                ? source.paperBorderEnabled
                : DEFAULT_PAPER_SETTINGS.paperBorderEnabled,
        paperBorderWidth:
            typeof source.paperBorderWidth === 'number'
                ? source.paperBorderWidth
                : DEFAULT_PAPER_SETTINGS.paperBorderWidth,
        paperBorderStyle:
            source.paperBorderStyle === 'dashed' ||
            source.paperBorderStyle === 'dotted' ||
            source.paperBorderStyle === 'solid'
                ? (source.paperBorderStyle as 'solid' | 'dashed' | 'dotted')
                : DEFAULT_PAPER_SETTINGS.paperBorderStyle,
    };
}

export interface GeneratedPaper {
    id: string;
    header: GeneratedPaperHeader;
    sections: GeneratedPaperSection[];
    /** Optional — older papers won't have this. Restore code should fall back to DEFAULT_PAPER_SETTINGS. */
    settings?: PaperSettings;
}

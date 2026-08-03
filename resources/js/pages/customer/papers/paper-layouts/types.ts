export type PaperImageSize = 'sm' | 'md' | 'lg';
export type PaperSectionCategory =
    | 'Objective Questions'
    | 'Subjective Questions';

export interface PaperQuestionOption {
    id: string;
    text: string;
    isCorrect?: boolean;
}

export interface GeneratedPaperPassageQuestion {
    id: string;
    text: string;
    options: PaperQuestionOption[];
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
    passageQuestions?: GeneratedPaperPassageQuestion[];
    answerLines: number;
    answerLineSpacing?: number;
    answerText?: string | null;
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
    /**
     * How many columns this block's questions render in (1–5). Seeded from
     * the question type's `column_per_row` DB value when the section is
     * created; the user can override it per-block from then on. Optional so
     * papers saved before this setting existed still load — renderers fall
     * back per-template via `clampSectionColumns`.
     */
    columns?: number;
}

export const MIN_SECTION_COLUMNS = 1;
export const MAX_SECTION_COLUMNS = 5;

/** Clamp a section's column count into the supported 1–5 range, falling back
 * to `fallback` when the value is missing (older saved papers) or invalid. */
export function clampSectionColumns(
    value: number | null | undefined,
    fallback = MIN_SECTION_COLUMNS,
): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }

    return Math.min(
        Math.max(Math.round(value), MIN_SECTION_COLUMNS),
        MAX_SECTION_COLUMNS,
    );
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
export type PaperSize = 'A4' | 'Letter' | 'Legal';
export type PaperOrientation = 'portrait' | 'landscape';
export type PageNumberPosition =
    | 'footer-center'
    | 'footer-right'
    | 'header-right';
export type PageNumberFormat = 'page-n' | 'n-of-m' | 'just-n';
export type PaperQuestionNumberingFormat =
    | 'default'
    | 'numeric'
    | 'roman'
    | 'alpha';
export type PaperQuestionLayout =
    | 'default'
    | 'stacked'
    | 'columns'
    | 'inline';
export type PaperWatermarkType = 'text' | 'logo';

export interface PaperSettings {
    englishFont: PaperEnglishFont;
    urduFont: PaperUrduFont;
    /** Paper header font size in px (the school/exam/class/subject fields at the top). */
    headerSize: number;
    /** Paper header line-height (unitless multiplier). */
    headerLineHeight: number;
    /** Horizontal inner spacing applied to paper-header cells, in px. */
    headerPaddingX: number;
    /** Vertical inner spacing applied to paper-header cells, in px. */
    headerPaddingY: number;
    /** Section heading font size in px (the "Q.1 Title (5x1=5)" rows). */
    headingSize: number;
    /** Section heading line-height (unitless multiplier). */
    headingLineHeight: number;
    /** Body / question + option font size in px. */
    questionSize: number;
    /** Question line-height (unitless multiplier). */
    questionLineHeight: number;
    /** Header frame border width in px (0 = no border). */
    headerBorderWidth: number;
    headerBorderStyle: PaperBorderStyle;
    /** Bottom border under each section heading row (the "Q.1 Title (5x1=5)" rule). */
    headingBorderWidth: number;
    headingBorderStyle: PaperBorderStyle;
    /** Divider between question rows inside a section. */
    questionBorderWidth: number;
    questionBorderStyle: PaperBorderStyle;
    /** Paper size — affects on-screen dimensions and the printed @page size. */
    paperSize: PaperSize;
    /** Page orientation — swaps the long/short dimension. */
    orientation: PaperOrientation;
    /** Page margins in millimetres (4 sides). 0 = no margin (content runs to the edge). */
    marginTop: number;
    marginRight: number;
    marginBottom: number;
    marginLeft: number;
    /** Vertical gap between the header→first-section and between adjacent sections, in mm. */
    sectionSpacing: number;
    /** Default text colour for everything on the paper (header/heading/questions). */
    textColor: string;
    watermarkType: PaperWatermarkType;
    /** Empty string = no watermark; otherwise this text shows faintly behind the content. */
    watermarkText: string;
    watermarkLogoUrl: string;
    /** 0–100; lower = fainter. Only used when watermarkText is non-empty. */
    watermarkOpacity: number;
    /** Toggle printed page numbers (print-only). */
    pageNumbersEnabled: boolean;
    pageNumberPosition: PageNumberPosition;
    pageNumberFormat: PageNumberFormat;
    /** Print-only: repeat the exam-info header at the top of every printed page. */
    repeatHeaderOnEachPage: boolean;
    /**
     * Overrides the per-section convention (objective=numeric, subjective=roman).
     * 'default' = keep the per-section convention.
     */
    questionNumberingFormat: PaperQuestionNumberingFormat;
    /**
     * Question rendering template applied paper-wide.
     * 'default' = per-category convention (objective→stacked boxed, subjective→2-col grid).
     * Other values force the same template for all sections.
     */
    questionLayout: PaperQuestionLayout;
    /** Which header layout template to use for the exam paper. */
    headerTemplate: PaperHeaderTemplate;
}

export type PaperBorderStyle = 'solid' | 'dashed' | 'dotted';
export type PaperHeaderTemplate = 'classic' | 'banner' | 'formal' | 'centered' | 'tabular';

export const DEFAULT_PAPER_SETTINGS: PaperSettings = {
    englishFont: 'sans',
    urduFont: 'jameel-noori',
    headerSize: 14,
    headerLineHeight: 1,
    headerPaddingX: 8,
    headerPaddingY: 8,
    headingSize: 14,
    headingLineHeight: 1.5,
    questionSize: 14,
    questionLineHeight: 1.5,
    headerBorderWidth: 2,
    headerBorderStyle: 'solid',
    headingBorderWidth: 1,
    headingBorderStyle: 'solid',
    questionBorderWidth: 1,
    questionBorderStyle: 'solid',
    paperSize: 'A4',
    orientation: 'portrait',
    marginTop: 10,
    marginRight: 10,
    marginBottom: 10,
    marginLeft: 10,
    sectionSpacing: 1,
    textColor: '#000000',
    watermarkType: 'text',
    watermarkText: '',
    watermarkLogoUrl: '',
    watermarkOpacity: 8,
    pageNumbersEnabled: false,
    pageNumberPosition: 'footer-center',
    pageNumberFormat: 'page-n',
    repeatHeaderOnEachPage: false,
    questionNumberingFormat: 'default',
    questionLayout: 'default',
    headerTemplate: 'classic',
};

const PAGE_NUMBER_POSITION_VALUES = new Set<PageNumberPosition>([
    'footer-center',
    'footer-right',
    'header-right',
]);
const PAGE_NUMBER_FORMAT_VALUES = new Set<PageNumberFormat>([
    'page-n',
    'n-of-m',
    'just-n',
]);
const QUESTION_NUMBERING_FORMAT_VALUES = new Set<PaperQuestionNumberingFormat>([
    'default',
    'numeric',
    'roman',
    'alpha',
]);
const QUESTION_LAYOUT_VALUES = new Set<PaperQuestionLayout>([
    'default',
    'stacked',
    'columns',
    'inline',
]);
const WATERMARK_TYPE_VALUES = new Set<PaperWatermarkType>(['text', 'logo']);
const HEADER_TEMPLATE_VALUES = new Set<PaperHeaderTemplate>([
    'classic',
    'banner',
    'formal',
    'centered',
    'tabular',
]);

function pickEnum<T extends string>(
    value: unknown,
    allowed: Set<T>,
    fallback: T,
): T {
    return typeof value === 'string' && allowed.has(value as T)
        ? (value as T)
        : fallback;
}

/** Standard page dimensions in millimetres (portrait orientation). */
export const PAGE_SIZES: Record<PaperSize, { width: number; height: number }> =
    {
        A4: { width: 210, height: 297 },
        Letter: { width: 215.9, height: 279.4 },
        Legal: { width: 215.9, height: 355.6 },
    };

export function getPageDimensions(
    size: PaperSize,
    orientation: PaperOrientation,
): { width: number; height: number } {
    const { width, height } = PAGE_SIZES[size];

    return orientation === 'landscape'
        ? { width: height, height: width }
        : { width, height };
}

const PAPER_SIZE_VALUES = new Set<PaperSize>(['A4', 'Letter', 'Legal']);
const ORIENTATION_VALUES = new Set<PaperOrientation>(['portrait', 'landscape']);

const BORDER_STYLE_VALUES = new Set<PaperBorderStyle>([
    'solid',
    'dashed',
    'dotted',
]);

function pickBorderStyle(
    value: unknown,
    fallback: PaperBorderStyle,
): PaperBorderStyle {
    return typeof value === 'string' &&
        BORDER_STYLE_VALUES.has(value as PaperBorderStyle)
        ? (value as PaperBorderStyle)
        : fallback;
}

const ENGLISH_FONT_VALUES = new Set<PaperEnglishFont>([
    'sans',
    'serif',
    'mono',
]);
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
        headerPaddingX:
            typeof source.headerPaddingX === 'number'
                ? source.headerPaddingX
                : typeof source.headerCellPadding === 'number'
                  ? source.headerCellPadding
                  : DEFAULT_PAPER_SETTINGS.headerPaddingX,
        headerPaddingY:
            typeof source.headerPaddingY === 'number'
                ? source.headerPaddingY
                : typeof source.headerCellPadding === 'number'
                  ? source.headerCellPadding
                  : DEFAULT_PAPER_SETTINGS.headerPaddingY,
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
        headerBorderWidth:
            typeof source.headerBorderWidth === 'number'
                ? source.headerBorderWidth
                : DEFAULT_PAPER_SETTINGS.headerBorderWidth,
        headerBorderStyle: pickBorderStyle(
            source.headerBorderStyle,
            DEFAULT_PAPER_SETTINGS.headerBorderStyle,
        ),
        headingBorderWidth:
            typeof source.headingBorderWidth === 'number'
                ? source.headingBorderWidth
                : DEFAULT_PAPER_SETTINGS.headingBorderWidth,
        headingBorderStyle: pickBorderStyle(
            source.headingBorderStyle,
            DEFAULT_PAPER_SETTINGS.headingBorderStyle,
        ),
        questionBorderWidth:
            typeof source.questionBorderWidth === 'number'
                ? source.questionBorderWidth
                : DEFAULT_PAPER_SETTINGS.questionBorderWidth,
        questionBorderStyle: pickBorderStyle(
            source.questionBorderStyle,
            DEFAULT_PAPER_SETTINGS.questionBorderStyle,
        ),
        paperSize:
            typeof source.paperSize === 'string' &&
            PAPER_SIZE_VALUES.has(source.paperSize as PaperSize)
                ? (source.paperSize as PaperSize)
                : DEFAULT_PAPER_SETTINGS.paperSize,
        orientation:
            typeof source.orientation === 'string' &&
            ORIENTATION_VALUES.has(source.orientation as PaperOrientation)
                ? (source.orientation as PaperOrientation)
                : DEFAULT_PAPER_SETTINGS.orientation,
        marginTop:
            typeof source.marginTop === 'number'
                ? source.marginTop
                : DEFAULT_PAPER_SETTINGS.marginTop,
        marginRight:
            typeof source.marginRight === 'number'
                ? source.marginRight
                : DEFAULT_PAPER_SETTINGS.marginRight,
        marginBottom:
            typeof source.marginBottom === 'number'
                ? source.marginBottom
                : DEFAULT_PAPER_SETTINGS.marginBottom,
        marginLeft:
            typeof source.marginLeft === 'number'
                ? source.marginLeft
                : DEFAULT_PAPER_SETTINGS.marginLeft,
        sectionSpacing:
            typeof source.sectionSpacing === 'number'
                ? source.sectionSpacing
                : DEFAULT_PAPER_SETTINGS.sectionSpacing,
        textColor:
            typeof source.textColor === 'string'
                ? source.textColor
                : DEFAULT_PAPER_SETTINGS.textColor,
        watermarkType: pickEnum(
            source.watermarkType,
            WATERMARK_TYPE_VALUES,
            DEFAULT_PAPER_SETTINGS.watermarkType,
        ),
        watermarkText:
            typeof source.watermarkText === 'string'
                ? source.watermarkText
                : DEFAULT_PAPER_SETTINGS.watermarkText,
        watermarkLogoUrl:
            typeof source.watermarkLogoUrl === 'string'
                ? source.watermarkLogoUrl
                : typeof source.watermarkLogoDataUrl === 'string'
                  ? source.watermarkLogoDataUrl
                  : DEFAULT_PAPER_SETTINGS.watermarkLogoUrl,
        watermarkOpacity:
            typeof source.watermarkOpacity === 'number'
                ? source.watermarkOpacity
                : DEFAULT_PAPER_SETTINGS.watermarkOpacity,
        pageNumbersEnabled:
            typeof source.pageNumbersEnabled === 'boolean'
                ? source.pageNumbersEnabled
                : DEFAULT_PAPER_SETTINGS.pageNumbersEnabled,
        pageNumberPosition: pickEnum(
            source.pageNumberPosition,
            PAGE_NUMBER_POSITION_VALUES,
            DEFAULT_PAPER_SETTINGS.pageNumberPosition,
        ),
        pageNumberFormat: pickEnum(
            source.pageNumberFormat,
            PAGE_NUMBER_FORMAT_VALUES,
            DEFAULT_PAPER_SETTINGS.pageNumberFormat,
        ),
        repeatHeaderOnEachPage:
            typeof source.repeatHeaderOnEachPage === 'boolean'
                ? source.repeatHeaderOnEachPage
                : DEFAULT_PAPER_SETTINGS.repeatHeaderOnEachPage,
        questionNumberingFormat: pickEnum(
            source.questionNumberingFormat,
            QUESTION_NUMBERING_FORMAT_VALUES,
            DEFAULT_PAPER_SETTINGS.questionNumberingFormat,
        ),
        questionLayout: pickEnum(
            source.questionLayout,
            QUESTION_LAYOUT_VALUES,
            DEFAULT_PAPER_SETTINGS.questionLayout,
        ),
        headerTemplate: pickEnum(
            source.headerTemplate,
            HEADER_TEMPLATE_VALUES,
            DEFAULT_PAPER_SETTINGS.headerTemplate,
        ),
    };
}

export interface GeneratedPaper {
    id: string;
    header: GeneratedPaperHeader;
    sections: GeneratedPaperSection[];
    /** Optional — older papers won't have this. Restore code should fall back to DEFAULT_PAPER_SETTINGS. */
    settings?: PaperSettings;
}

const ROMAN_NUMERALS = [
    'i',
    'ii',
    'iii',
    'iv',
    'v',
    'vi',
    'vii',
    'viii',
    'ix',
    'x',
    'xi',
    'xii',
    'xiii',
    'xiv',
    'xv',
    'xvi',
    'xvii',
    'xviii',
    'xix',
    'xx',
];

/**
 * Format a per-question label given a 0-based index, the paper-wide override
 * setting, and what the section would have used by default. 'default' falls
 * through to the section-native convention (objective=numeric, subjective=roman).
 */
export function formatQuestionLabel(
    index: number,
    override: PaperQuestionNumberingFormat,
    sectionDefault: 'numeric' | 'roman',
): string {
    const format = override === 'default' ? sectionDefault : override;

    if (format === 'roman') {
        return ROMAN_NUMERALS[index] ?? String(index + 1);
    }

    if (format === 'alpha') {
        // a, b, c, ..., z, aa, ab ... (wrap after 26)
        const n = index;
        const first = String.fromCharCode(97 + (n % 26));
        const repeat = Math.floor(n / 26);

        return repeat > 0 ? String.fromCharCode(96 + repeat) + first : first;
    }

    return String(index + 1);
}

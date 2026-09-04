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
    optionsOnly?: boolean;
    text: string;
    /** One shared statement rendered between the English and Urdu question statements. */
    sameStatement?: string | null;
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

export interface GeneratedMultipartPart {
    key: string;
    typeId: number | null;
    typeTitle: string;
    typeTitleEnglish?: string | null;
    typeTitleUrdu?: string | null;
    /** Render this part's question content right-to-left regardless of paper medium. */
    questionTextRtl?: boolean;
    marksEach: number;
    question: GeneratedPaperQuestion;
}

export interface GeneratedMultipartRow {
    parts: GeneratedMultipartPart[];
}

export interface GeneratedMultipartSection {
    choiceCount: number;
    marksEach: number;
    /** Shared multipart group metadata. Older papers may not have these fields. */
    groupId?: string | null;
    groupChoiceCount?: number | null;
    groupQuestionCount?: number | null;
    headingEnglish?: string | null;
    headingUrdu?: string | null;
    rows: GeneratedMultipartRow[];
}
export interface GeneratedPaperSection {
    id: string;
    questionTypeId: number | null;
    category: PaperSectionCategory;
    title: string;
    /** Separate labels used when both paper mediums are rendered. */
    titleEnglish?: string | null;
    titleUrdu?: string | null;
    /** Render this type's question content right-to-left regardless of paper medium. */
    questionTextRtl?: boolean;
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
    /** Optional metadata for a subjective question type rendered as an OR group. */
    orGroupId?: string | null;
    orPairingId?: number | null;
    orQuestionTypeId?: number | null;
    /** All member question types in this OR group, including this section. */
    orGroupTypeIds?: number[] | null;
    orRole?: 'primary' | 'alternative' | null;
    orLabel?: string | null;
    /** True when the Federal Board layout created this same-type OR companion. */
    federalAutoOr?: boolean;
    multipart?: GeneratedMultipartSection | null;
    /** Stable grouping key used only to place the visible Section A/B/C heading. */
    paperSectionKey?: string | null;
}

export interface GeneratedPaperSectionGroup {
    id: number;
    questionTypeIds: number[];
}

export interface GeneratedPaperSectioning {
    active: boolean;
    groups: GeneratedPaperSectionGroup[];
    medium?: 'English' | 'Urdu' | 'Both';
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

export type PaperEnglishFont =
    | 'times-new-roman'
    | 'jameel-noori'
    | 'sans'
    | 'serif'
    | 'mono';
export type PaperUrduFont = 'jameel-noori' | 'noto-nastaliq' | 'mehr-nastaliq';
/**
 * Nastaliq fonts have different x-heights and built-in vertical metrics.
 * These small per-family adjustments keep Urdu visually comparable to the
 * selected English size while preserving enough leading for tall glyphs.
 */
export const PAPER_URDU_FONT_METRICS: Record<
    PaperUrduFont,
    { sizeScale: number; lineHeightScale: number; verticalOffsetEm: number }
> = {
    'jameel-noori': {
        sizeScale: 1.1,
        lineHeightScale: 1.22,
        verticalOffsetEm: -0.16,
    },
    'noto-nastaliq': {
        sizeScale: 1.24,
        lineHeightScale: 1.3,
        verticalOffsetEm: -0.22,
    },
    'mehr-nastaliq': {
        sizeScale: 1.18,
        lineHeightScale: 1.22,
        verticalOffsetEm: -0.16,
    },
};
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
export type PaperQuestionLayout = 'default' | 'stacked' | 'columns' | 'inline';
export type PaperObjectiveLayout = 'standard' | 'board-table';
export type PaperLayout = 'standard' | 'federal-board';
export type PaperOrGroupLayout = 'stacked' | 'side-by-side';
export type PaperOrGroupDividerStyle = 'line' | 'badge' | 'plain';
export type PaperOrGroupLabel = 'auto' | 'english' | 'urdu' | 'bilingual';
export type PaperWatermarkType = 'text' | 'logo';
export type PaperBubbleSheetNumberFormat = 'number' | 'question';

export interface PaperSettings {
    /** Board-specific rules that control section grouping and question layout. */
    paperLayout: PaperLayout;
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
    /** Whether active, configured paper-section headings are visible. */
    showSections: boolean;
    /** Wrap the complete localized section heading in round brackets. */
    sectionHeadingBrackets: boolean;
    sectionHeadingSize: number;
    sectionHeadingLineHeight: number;
    /** Border around a Section A/B/C heading. Zero means no border. */
    sectionHeadingBorderWidth: number;
    sectionHeadingBorderStyle: PaperBorderStyle;
    /** Print an MCQ bubble sheet immediately below the paper header. */
    bubbleSheetEnabled: boolean;
    /** Show the localized answer-sheet heading above the bubbles. */
    bubbleSheetHeadingEnabled: boolean;
    /** Number of numbered A-D answer rows shown in the bubble sheet. */
    bubbleSheetQuestionCount: number;
    /** Format used for each bubble row label. */
    bubbleSheetNumberFormat: PaperBubbleSheetNumberFormat;
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
    /** Layout used specifically for objective question sections. */
    objectiveLayout: PaperObjectiveLayout;
    /** How paired subjective alternatives are arranged on the paper. */
    orGroupLayout: PaperOrGroupLayout;
    /** Visual treatment of the OR marker between paired alternatives. */
    orGroupDividerStyle: PaperOrGroupDividerStyle;
    /** Language used for the OR marker. 'auto' uses the pairing's saved label. */
    orGroupLabel: PaperOrGroupLabel;
    /** Space between the paired alternatives and their divider, in mm. */
    orGroupGap: number;
    /** Which header layout template to use for the exam paper. */
    headerTemplate: PaperHeaderTemplate;
}

export type PaperBorderStyle = 'solid' | 'dashed' | 'dotted';
export type PaperHeaderTemplate =
    | 'classic'
    | 'banner'
    | 'formal'
    | 'centered'
    | 'tabular';

export const DEFAULT_PAPER_SETTINGS: PaperSettings = {
    paperLayout: 'standard',
    englishFont: 'times-new-roman',
    urduFont: 'jameel-noori',
    headerSize: 12,
    headerLineHeight: 1,
    headerPaddingX: 4,
    headerPaddingY: 0,
    headingSize: 12,
    headingLineHeight: 1,
    questionSize: 12,
    questionLineHeight: 1,
    headerBorderWidth: 1,
    headerBorderStyle: 'solid',
    headingBorderWidth: 1,
    headingBorderStyle: 'solid',
    showSections: true,
    sectionHeadingBrackets: true,
    sectionHeadingSize: 14,
    sectionHeadingLineHeight: 1,
    sectionHeadingBorderWidth: 0,
    sectionHeadingBorderStyle: 'solid',
    bubbleSheetEnabled: false,
    bubbleSheetHeadingEnabled: false,
    bubbleSheetQuestionCount: 20,
    bubbleSheetNumberFormat: 'number',
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
    questionNumberingFormat: 'roman',
    questionLayout: 'default',
    objectiveLayout: 'standard',
    orGroupLayout: 'stacked',
    orGroupDividerStyle: 'line',
    orGroupLabel: 'auto',
    orGroupGap: 1,
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
const OBJECTIVE_LAYOUT_VALUES = new Set<PaperObjectiveLayout>([
    'standard',
    'board-table',
]);
const PAPER_LAYOUT_VALUES = new Set<PaperLayout>(['standard', 'federal-board']);
const OR_GROUP_LAYOUT_VALUES = new Set<PaperOrGroupLayout>([
    'stacked',
    'side-by-side',
]);
const OR_GROUP_DIVIDER_STYLE_VALUES = new Set<PaperOrGroupDividerStyle>([
    'line',
    'badge',
    'plain',
]);
const OR_GROUP_LABEL_VALUES = new Set<PaperOrGroupLabel>([
    'auto',
    'english',
    'urdu',
    'bilingual',
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
    'times-new-roman',
    'jameel-noori',
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
        paperLayout: pickEnum(
            source.paperLayout,
            PAPER_LAYOUT_VALUES,
            DEFAULT_PAPER_SETTINGS.paperLayout,
        ),
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
        showSections:
            typeof source.showSections === 'boolean'
                ? source.showSections
                : DEFAULT_PAPER_SETTINGS.showSections,
        sectionHeadingBrackets:
            typeof source.sectionHeadingBrackets === 'boolean'
                ? source.sectionHeadingBrackets
                : DEFAULT_PAPER_SETTINGS.sectionHeadingBrackets,
        sectionHeadingSize:
            typeof source.sectionHeadingSize === 'number'
                ? source.sectionHeadingSize
                : DEFAULT_PAPER_SETTINGS.sectionHeadingSize,
        sectionHeadingLineHeight:
            typeof source.sectionHeadingLineHeight === 'number'
                ? source.sectionHeadingLineHeight
                : DEFAULT_PAPER_SETTINGS.sectionHeadingLineHeight,
        sectionHeadingBorderWidth:
            typeof source.sectionHeadingBorderWidth === 'number'
                ? source.sectionHeadingBorderWidth
                : DEFAULT_PAPER_SETTINGS.sectionHeadingBorderWidth,
        sectionHeadingBorderStyle: pickBorderStyle(
            source.sectionHeadingBorderStyle,
            DEFAULT_PAPER_SETTINGS.sectionHeadingBorderStyle,
        ),
        bubbleSheetEnabled:
            typeof source.bubbleSheetEnabled === 'boolean'
                ? source.bubbleSheetEnabled
                : DEFAULT_PAPER_SETTINGS.bubbleSheetEnabled,
        bubbleSheetHeadingEnabled:
            typeof source.bubbleSheetHeadingEnabled === 'boolean'
                ? source.bubbleSheetHeadingEnabled
                : DEFAULT_PAPER_SETTINGS.bubbleSheetHeadingEnabled,
        bubbleSheetQuestionCount:
            typeof source.bubbleSheetQuestionCount === 'number' &&
            Number.isFinite(source.bubbleSheetQuestionCount)
                ? Math.min(
                      Math.max(Math.round(source.bubbleSheetQuestionCount), 1),
                      200,
                  )
                : DEFAULT_PAPER_SETTINGS.bubbleSheetQuestionCount,
        bubbleSheetNumberFormat:
            source.bubbleSheetNumberFormat === 'question'
                ? 'question'
                : DEFAULT_PAPER_SETTINGS.bubbleSheetNumberFormat,
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
        objectiveLayout: pickEnum(
            source.objectiveLayout,
            OBJECTIVE_LAYOUT_VALUES,
            DEFAULT_PAPER_SETTINGS.objectiveLayout,
        ),
        orGroupLayout: pickEnum(
            source.orGroupLayout,
            OR_GROUP_LAYOUT_VALUES,
            DEFAULT_PAPER_SETTINGS.orGroupLayout,
        ),
        orGroupDividerStyle: pickEnum(
            source.orGroupDividerStyle,
            OR_GROUP_DIVIDER_STYLE_VALUES,
            DEFAULT_PAPER_SETTINGS.orGroupDividerStyle,
        ),
        orGroupLabel: pickEnum(
            source.orGroupLabel,
            OR_GROUP_LABEL_VALUES,
            DEFAULT_PAPER_SETTINGS.orGroupLabel,
        ),
        orGroupGap:
            typeof source.orGroupGap === 'number' &&
            Number.isFinite(source.orGroupGap)
                ? Math.min(Math.max(source.orGroupGap, 0), 10)
                : DEFAULT_PAPER_SETTINGS.orGroupGap,
        headerTemplate: pickEnum(
            source.headerTemplate,
            HEADER_TEMPLATE_VALUES,
            DEFAULT_PAPER_SETTINGS.headerTemplate,
        ),
    };
}

export function resolveOrGroupLabel(
    settings: PaperSettings,
    savedLabel?: string | null,
): string {
    if (settings.orGroupLabel === 'english') {
        return 'OR';
    }

    if (settings.orGroupLabel === 'urdu') {
        return '\u06cc\u0627';
    }

    if (settings.orGroupLabel === 'bilingual') {
        return 'OR / \u06cc\u0627';
    }

    return savedLabel?.trim() || 'OR';
}

export interface GeneratedPaper {
    id: string;
    header: GeneratedPaperHeader;
    sections: GeneratedPaperSection[];
    /** Optional — older papers won't have this. Restore code should fall back to DEFAULT_PAPER_SETTINGS. */
    settings?: PaperSettings;
    /** Snapshot of the active superadmin grouping used when this paper was generated. */
    sectioning?: GeneratedPaperSectioning;
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

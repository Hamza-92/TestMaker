import type {
    GeneratedPaperSection,
    PaperImageSize,
    PaperQuestionNumberingFormat,
} from '../types';

/**
 * Common props every question-layout template receives. Each template is free
 * to render the section in its own style — stacked, columns, inline, or
 * something new — but the API is identical so swapping templates is a single
 * import change.
 */
export interface SectionTemplateProps {
    section: GeneratedPaperSection;
    index: number;
    /** Number printed in the type heading; null hides it for later objective blocks. */
    headingNumber: number | null;
    /** Number of questions in earlier objective types; subjective types receive zero. */
    questionNumberOffset: number;
    numberingFormat: PaperQuestionNumberingFormat;
    /** Board layouts can move the marks formula into the Section A/B/C heading. */
    hideHeadingMarks?: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onEditSection: (sectionId: string) => void;
    onDeleteSection: (sectionId: string) => void;
    onMoveUp: (sectionId: string) => void;
    onMoveDown: (sectionId: string) => void;
    onShuffleQuestions: (sectionId: string) => void;
    onAddRandomQuestion: (sectionId: string) => void;
    onAddCustomQuestion: (sectionId: string) => void;
    onEditQuestion: (sectionId: string, questionId: string) => void;
    onRandomQuestion: (sectionId: string, questionId: string) => void;
    onPickQuestion: (sectionId: string, questionId: string) => void;
    onRemoveQuestion: (sectionId: string, questionId: string) => void;
    onAnswerLinesChange: (
        sectionId: string,
        questionId: string,
        value: number,
    ) => void;
    onAnswerLineSpacingChange: (
        sectionId: string,
        questionId: string,
        value: number,
    ) => void;
    onQuestionImageSizeChange: (
        sectionId: string,
        questionId: string,
        imageSize: PaperImageSize,
    ) => void;
    /** How many columns (1–5) to arrange this block's questions into. */
    onColumnsChange: (sectionId: string, value: number) => void;
}

export type SectionTemplate = (props: SectionTemplateProps) => React.ReactNode;

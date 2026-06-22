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
    numberingFormat: PaperQuestionNumberingFormat;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onEditSection: (sectionId: string) => void;
    onDeleteSection: (sectionId: string) => void;
    onMoveUp: (sectionId: string) => void;
    onMoveDown: (sectionId: string) => void;
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
}

export type SectionTemplate = (props: SectionTemplateProps) => React.ReactNode;

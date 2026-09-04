import { BoardObjectiveTableSection } from '../sections/board-objective-table-section';
import type {
    PaperObjectiveLayout,
    PaperQuestionLayout,
    PaperSectionCategory,
} from '../types';
import { ColumnsQuestionsTemplate } from './columns-questions-template';
import { InlineQuestionsTemplate } from './inline-questions-template';
import { StackedQuestionsTemplate } from './stacked-questions-template';
import type { SectionTemplate } from './template-props';

export type { SectionTemplate, SectionTemplateProps } from './template-props';
export {
    StackedQuestionsTemplate,
    ColumnsQuestionsTemplate,
    InlineQuestionsTemplate,
};

/**
 * Pick the right template for a section given the paper-wide layout setting
 * and the section's category.
 *
 * 'default' falls back to the per-category convention (objective → stacked
 * boxed look, subjective → 2-column grid) — preserves the behaviour of
 * papers saved before the question-layout setting existed.
 */
export function pickSectionTemplate(
    layout: PaperQuestionLayout,
    category: PaperSectionCategory,
    objectiveLayout: PaperObjectiveLayout = 'standard',
): SectionTemplate {
    if (
        category === 'Objective Questions' &&
        objectiveLayout === 'board-table'
    ) {
        return BoardObjectiveTableSection;
    }

    if (layout === 'stacked') {
return StackedQuestionsTemplate;
}

    if (layout === 'columns') {
return ColumnsQuestionsTemplate;
}

    if (layout === 'inline') {
return InlineQuestionsTemplate;
}

    return category === 'Objective Questions'
        ? StackedQuestionsTemplate
        : ColumnsQuestionsTemplate;
}

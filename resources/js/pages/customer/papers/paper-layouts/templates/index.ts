import { ColumnsQuestionsTemplate } from './columns-questions-template';
import { InlineQuestionsTemplate } from './inline-questions-template';
import { StackedQuestionsTemplate } from './stacked-questions-template';
import type { SectionTemplate } from './template-props';
import type {
    PaperQuestionLayout,
    PaperSectionCategory,
} from '../types';

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
): SectionTemplate {
    if (layout === 'stacked') return StackedQuestionsTemplate;
    if (layout === 'columns') return ColumnsQuestionsTemplate;
    if (layout === 'inline') return InlineQuestionsTemplate;
    return category === 'Objective Questions'
        ? StackedQuestionsTemplate
        : ColumnsQuestionsTemplate;
}

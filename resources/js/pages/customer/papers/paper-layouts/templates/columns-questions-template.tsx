import { TwoColumnSubjectiveSection } from '../sections/two-column-subjective-section';
import type { SectionTemplate } from './template-props';

/**
 * Columns layout — questions render in a 2-column grid. Works for both
 * objective and subjective; for objective questions the options just don't
 * appear (this template focuses on running prose).
 *
 * Delegates to TwoColumnSubjectiveSection for now. Replace this file when
 * you want a different "columns" look.
 */
export const ColumnsQuestionsTemplate: SectionTemplate = (props) => (
    <TwoColumnSubjectiveSection {...props} />
);

import { BoxedObjectiveSection } from '../sections/boxed-objective-section';
import type { SectionTemplate } from './template-props';

/**
 * Stacked layout — questions render top-to-bottom, one per row, inside a
 * bordered "collapsed-table" container. Works for both objective and
 * subjective sections; for subjective questions the options grid simply
 * doesn't render (the question has no options).
 *
 * Currently delegates to BoxedObjectiveSection. To change the look later,
 * rewrite this file — call sites stay unchanged.
 */
export const StackedQuestionsTemplate: SectionTemplate = (props) => (
    <BoxedObjectiveSection {...props} />
);

import { QuestionContent } from '../questions/question-content';
import { SectionControls } from '../sections/section-actions';
import { formatQuestionLabel } from '../types';
import type { SectionTemplate } from './template-props';

const optionLabels = ['a', 'b', 'c', 'd', 'e', 'f'];

/**
 * Inline layout — every question prints as running text in a single flowing
 * paragraph, separated by their question label. Useful for compact "fill in
 * the blanks" or "MCQ list" styles where vertical space is at a premium.
 */
export const InlineQuestionsTemplate: SectionTemplate = ({
    section,
    index,
    numberingFormat,
    canMoveUp,
    canMoveDown,
    onEditSection,
    onDeleteSection,
    onMoveUp,
    onMoveDown,
    onAddRandomQuestion,
    onAddCustomQuestion,
}) => {
    const isObjective = section.category === 'Objective Questions';
    const fallbackFormat = isObjective ? 'numeric' : 'roman';

    return (
        <section className="paper-section text-black">
            <div
                data-paper-heading
                className="grid grid-cols-[3rem_1fr_8rem] text-sm font-bold"
            >
                <div data-paper-heading-divider className="px-1 py-1">
                    Q.{index + 1}
                </div>
                <div data-paper-heading-divider className="px-2 py-1">
                    {section.title}
                </div>
                <div
                    data-paper-heading-divider
                    className="px-2 py-1 text-right"
                >
                    ({section.requiredQuestions}x{section.marksEach}=
                    {section.requiredQuestions * section.marksEach})
                </div>
            </div>

            {/* Inline question stream — each question rendered as a span with a
                bold label prefix, separated by a generous gap. Wraps naturally. */}
            <div data-paper-question-group="inline" className="px-3 py-2 leading-7">
                {section.questions.map((question, qIndex) => {
                    const label = formatQuestionLabel(
                        qIndex,
                        numberingFormat,
                        fallbackFormat,
                    );
                    const options = question.options.slice(0, 4);

                    return (
                        <span
                            key={question.id}
                            data-paper-question
                            className="mr-4 inline align-baseline"
                        >
                            <span className="font-bold">({label})</span>{' '}
                            <QuestionContent
                                value={question.text}
                                inline
                                className="align-baseline"
                            />
                            {options.length > 0 && (
                                <span className="ml-1 align-baseline">
                                    {options.map((option, optionIndex) => (
                                        <span
                                            key={option.id}
                                            className="ml-2 align-baseline"
                                        >
                                            <span className="font-semibold">
                                                ({optionLabels[optionIndex]})
                                            </span>{' '}
                                            <QuestionContent
                                                value={option.text}
                                                inline
                                                className="align-baseline"
                                            />
                                        </span>
                                    ))}
                                </span>
                            )}
                        </span>
                    );
                })}
            </div>

            <SectionControls
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
                canAddRandom={section.questionTypeId !== null}
                onMoveUp={() => onMoveUp(section.id)}
                onMoveDown={() => onMoveDown(section.id)}
                onAddRandom={() => onAddRandomQuestion(section.id)}
                onAddCustom={() => onAddCustomQuestion(section.id)}
                onEdit={() => onEditSection(section.id)}
                onDelete={() => onDeleteSection(section.id)}
            />
        </section>
    );
};

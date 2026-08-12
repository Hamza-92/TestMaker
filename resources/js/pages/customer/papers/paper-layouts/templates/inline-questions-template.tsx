import { BilingualOptionContent } from '../questions/bilingual-option-content';
import { PassageQuestionContent } from '../questions/passage-question-content';
import { QuestionContent } from '../questions/question-content';
import { QuestionTypeHeading } from '../questions/question-type-heading';
import { SectionControls } from '../sections/section-actions';
import { clampSectionColumns, formatQuestionLabel } from '../types';
import type { SectionTemplate } from './template-props';

const optionLabels = ['a', 'b', 'c', 'd', 'e', 'f'];

/**
 * Inline layout — every question prints as running text in a single flowing
 * paragraph, separated by their question label. Useful for compact "fill in
 * the blanks" or "MCQ list" styles where vertical space is at a premium.
 * Columns >1 flow the text into newspaper-style CSS columns.
 */
export const InlineQuestionsTemplate: SectionTemplate = ({
    section,
    index,
    headingNumber,
    numberingFormat,
    canMoveUp,
    canMoveDown,
    onEditSection,
    onDeleteSection,
    onMoveUp,
    onMoveDown,
    onShuffleQuestions,
    onAddRandomQuestion,
    onAddCustomQuestion,
    onColumnsChange,
}) => {
    const isObjective = section.category === 'Objective Questions';
    const fallbackFormat = isObjective ? 'numeric' : 'roman';
    // Legacy default of 1 preserves the original single-flow look for papers
    // saved before per-block columns existed.
    const columns = clampSectionColumns(section.columns, 1);
    const isUrduOnly = Boolean(section.titleUrdu && !section.titleEnglish);

    return (
        <section className="paper-section text-black">
            <QuestionTypeHeading
                index={index}
                headingNumber={headingNumber}
                title={section.title}
                titleEnglish={section.titleEnglish}
                titleUrdu={section.titleUrdu}
                requiredQuestions={section.requiredQuestions}
                marksEach={section.marksEach}
            />

            {/* Inline question stream — each question rendered as a span with a
                bold label prefix, separated by a generous gap. Wraps naturally.
                Columns >1 flow this into CSS newspaper-style columns. */}
            <div
                data-paper-question-group="inline"
                className="px-3 py-2 leading-7"
                style={
                    columns > 1
                        ? { columnCount: columns, columnGap: '1.5rem' }
                        : undefined
                }
            >
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
                            dir={isUrduOnly ? 'rtl' : undefined}
                            data-paper-urdu-content={
                                isUrduOnly ? true : undefined
                            }
                            style={{
                                ...(columns > 1
                                    ? { breakInside: 'avoid' }
                                    : {}),
                                ...(isUrduOnly
                                    ? { fontFamily: 'var(--paper-urdu-font)' }
                                    : {}),
                            }}
                        >
                            {!isObjective &&
                                (isUrduOnly ? (
                                    <>
                                        <span className="font-bold">
                                            {label})
                                        </span>{' '}
                                    </>
                                ) : (
                                    <>
                                        <span className="font-bold">
                                            {label})
                                        </span>{' '}
                                    </>
                                ))}
                            <QuestionContent
                                value={question.text}
                                inline
                                className="align-baseline"
                            />
                            {question.sameStatement && (
                                <>
                                    {' - '}
                                    <QuestionContent
                                        value={question.sameStatement}
                                        inline
                                        className="align-baseline"
                                    />
                                </>
                            )}
                            {options.length > 0 && (
                                <span className="ml-1 align-baseline">
                                    {options.map((option, optionIndex) => (
                                        <span
                                            key={option.id}
                                            className="ml-2 align-baseline"
                                        >
                                            <BilingualOptionContent
                                                value={option.text}
                                                label={
                                                    optionLabels[optionIndex]
                                                }
                                                urduOnly={isUrduOnly}
                                            />
                                        </span>
                                    ))}
                                </span>
                            )}
                            {question.passageQuestions && (
                                <PassageQuestionContent
                                    questions={question.passageQuestions}
                                    inline
                                />
                            )}
                        </span>
                    );
                })}
            </div>

            <SectionControls
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
                canAddRandom={section.questionTypeId !== null}
                columns={columns}
                onMoveUp={() => onMoveUp(section.id)}
                onMoveDown={() => onMoveDown(section.id)}
                onShuffleQuestions={() => onShuffleQuestions(section.id)}
                onAddRandom={() => onAddRandomQuestion(section.id)}
                onAddCustom={() => onAddCustomQuestion(section.id)}
                onEdit={() => onEditSection(section.id)}
                onDelete={() => onDeleteSection(section.id)}
                onColumnsChange={(value) => onColumnsChange(section.id, value)}
            />
        </section>
    );
};

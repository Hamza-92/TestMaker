import { BilingualOptionContent } from '../questions/bilingual-option-content';
import { BilingualQuestionRow } from '../questions/bilingual-question-row';
import { PassageQuestionContent } from '../questions/passage-question-content';
import { QuestionTypeHeading } from '../questions/question-type-heading';
import { clampSectionColumns, formatQuestionLabel } from '../types';
import type {
    GeneratedPaperQuestion,
    GeneratedPaperSection,
    PaperImageSize,
    PaperQuestionNumberingFormat,
} from '../types';
import { QuestionHoverActions, SectionControls } from './section-actions';

interface BoxedObjectiveSectionProps {
    section: GeneratedPaperSection;
    index: number;
    headingNumber: number | null;
    questionNumberOffset: number;
    numberingFormat: PaperQuestionNumberingFormat;
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
    onColumnsChange: (sectionId: string, value: number) => void;
}

const optionLabels = ['a', 'b', 'c', 'd', 'e', 'f'];

export function BoxedObjectiveSection({
    section,
    index,
    headingNumber,
    questionNumberOffset,
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
    onEditQuestion,
    onRandomQuestion,
    onPickQuestion,
    onRemoveQuestion,
    onAnswerLinesChange,
    onAnswerLineSpacingChange,
    onQuestionImageSizeChange,
    onColumnsChange,
}: BoxedObjectiveSectionProps) {
    // Legacy default of 1 preserves the original single-column stacked look
    // for papers saved before per-block columns existed.
    const columns = clampSectionColumns(section.columns, 1);

    return (
        <section className="paper-section">
            {/* Heading is a standalone box ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â border on all 4 sides controlled by --paper-heading-border-*. */}
            <QuestionTypeHeading
                index={index}
                headingNumber={headingNumber}
                title={section.title}
                titleEnglish={section.titleEnglish}
                titleUrdu={section.titleUrdu}
                requiredQuestions={section.requiredQuestions}
                marksEach={section.marksEach}
            />

            {/* Question container ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â border on all 4 sides; question rows act as
                collapsed-table rows, sharing one divider between each. Columns
                >1 arrange the boxed rows into a grid instead of one long stack. */}
            <div
                data-paper-question-group="stacked"
                className={columns > 1 ? 'grid gap-x-6' : undefined}
                style={
                    columns > 1
                        ? {
                              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                          }
                        : undefined
                }
            >
                {section.questions.map((question, questionIndex) => (
                    <ObjectiveQuestionRow
                        key={question.id}
                        question={question}
                        index={questionIndex + questionNumberOffset}
                        numberingFormat={numberingFormat}
                        section={section}
                        onEditQuestion={onEditQuestion}
                        onRandomQuestion={onRandomQuestion}
                        onPickQuestion={onPickQuestion}
                        onRemoveQuestion={onRemoveQuestion}
                        onAnswerLinesChange={onAnswerLinesChange}
                        onAnswerLineSpacingChange={onAnswerLineSpacingChange}
                        onQuestionImageSizeChange={onQuestionImageSizeChange}
                    />
                ))}
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
}

function ObjectiveQuestionRow({
    question,
    index,
    numberingFormat,
    section,
    onEditQuestion,
    onRandomQuestion,
    onPickQuestion,
    onRemoveQuestion,
    onAnswerLinesChange,
    onAnswerLineSpacingChange,
    onQuestionImageSizeChange,
}: {
    question: GeneratedPaperQuestion;
    index: number;
    numberingFormat: PaperQuestionNumberingFormat;
    section: GeneratedPaperSection;
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
}) {
    const options = question.options.slice(0, 4);
    const urduOnly = Boolean(section.titleUrdu && !section.titleEnglish);

    return (
        <div data-paper-question className="group/question relative">
            {!question.optionsOnly && (
                <div className="px-2 py-1 text-sm">
                    <BilingualQuestionRow
                        value={question.text}
                        indexLabel={formatQuestionLabel(
                            index,
                            numberingFormat,
                            'numeric',
                        )}
                        marks={section.marksEach}
                        urduOnly={Boolean(
                            section.titleUrdu && !section.titleEnglish,
                        )}
                        hideMarks={section.category === 'Objective Questions'}
                        sameStatement={question.sameStatement}
                    />
                </div>
            )}
            {question.imageUrl && (
                <div data-paper-question-divider="t" className="px-12 py-2">
                    <img
                        src={question.imageUrl}
                        alt=""
                        className={
                            question.imageSize === 'sm'
                                ? 'max-h-24 object-contain'
                                : question.imageSize === 'lg'
                                  ? 'max-h-64 object-contain'
                                  : 'max-h-40 object-contain'
                        }
                    />
                    <div className="mt-1 flex gap-1 print:hidden">
                        {(['sm', 'md', 'lg'] as const).map((size) => (
                            <button
                                key={size}
                                type="button"
                                onClick={() =>
                                    onQuestionImageSizeChange(
                                        section.id,
                                        question.id,
                                        size,
                                    )
                                }
                                className="border border-slate-300 px-2 py-0.5 text-[11px] uppercase"
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {question.passageQuestions && (
                <div data-paper-question-divider="t" className="px-2 py-1">
                    <PassageQuestionContent
                        questions={question.passageQuestions}
                    />
                </div>
            )}

            {options.length > 0 && (
                <div
                    data-paper-question-divider="t"
                    dir={urduOnly ? 'rtl' : undefined}
                    data-paper-urdu-content={urduOnly ? true : undefined}
                    className={
                        question.optionsOnly
                            ? 'flex w-full items-start text-sm'
                            : undefined
                    }
                >
                    {question.optionsOnly ? (
                        <span className="w-7 shrink-0 px-2 py-1 font-bold">
                            {formatQuestionLabel(
                                index,
                                numberingFormat,
                                'numeric',
                            )}
                            )
                        </span>
                    ) : null}
                    <div
                        className={
                            question.optionsOnly
                                ? 'grid w-full min-w-0 flex-1 grid-cols-4'
                                : urduOnly
                                  ? 'grid grid-cols-4 text-right'
                                  : 'grid grid-cols-4'
                        }
                    >
                        {options.map((option, optionIndex) => (
                            <div
                                key={option.id}
                                data-paper-question-divider="r"
                                className={
                                    urduOnly
                                        ? 'min-w-0 px-2 py-1 text-right'
                                        : 'min-w-0 px-2 py-1'
                                }
                            >
                                <BilingualOptionContent
                                    value={option.text}
                                    label={optionLabels[optionIndex]}
                                    urduOnly={urduOnly}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {question.answerLines > 0 && (
                <div data-paper-question-divider="t" className="flex flex-col">
                    {Array.from({ length: question.answerLines }).map(
                        (_, lineIndex) => (
                            <div
                                key={lineIndex}
                                style={{
                                    height: `${question.answerLineSpacing ?? 20}px`,
                                }}
                                className="border-b border-dotted border-slate-400"
                            />
                        ),
                    )}
                </div>
            )}

            <QuestionHoverActions
                canSwap={section.questionTypeId !== null}
                showAnswerLines
                answerLines={question.answerLines}
                answerLineSpacing={question.answerLineSpacing ?? 20}
                onRandom={() => onRandomQuestion(section.id, question.id)}
                onPick={() => onPickQuestion(section.id, question.id)}
                onEdit={() => onEditQuestion(section.id, question.id)}
                onDelete={() => onRemoveQuestion(section.id, question.id)}
                onAnswerLinesChange={(value) =>
                    onAnswerLinesChange(section.id, question.id, value)
                }
                onAnswerLineSpacingChange={(value) =>
                    onAnswerLineSpacingChange(section.id, question.id, value)
                }
            />
        </div>
    );
}

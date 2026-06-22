import { QuestionContent } from '../questions/question-content';
import { formatQuestionLabel } from '../types';
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

const optionLabels = ['a', 'b', 'c', 'd', 'e', 'f'];

export function BoxedObjectiveSection({
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
    onEditQuestion,
    onRandomQuestion,
    onPickQuestion,
    onRemoveQuestion,
    onAnswerLinesChange,
    onAnswerLineSpacingChange,
    onQuestionImageSizeChange,
}: BoxedObjectiveSectionProps) {
    return (
        <section className="paper-section">
            {/* Heading is a standalone box — border on all 4 sides controlled by --paper-heading-border-*. */}
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

            {/* Question container — border on all 4 sides; question rows act as
                collapsed-table rows, sharing one divider between each. */}
            <div data-paper-question-group="stacked">
                {section.questions.map((question, questionIndex) => (
                    <ObjectiveQuestionRow
                        key={question.id}
                        question={question}
                        index={questionIndex}
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
                onMoveUp={() => onMoveUp(section.id)}
                onMoveDown={() => onMoveDown(section.id)}
                onAddRandom={() => onAddRandomQuestion(section.id)}
                onAddCustom={() => onAddCustomQuestion(section.id)}
                onEdit={() => onEditSection(section.id)}
                onDelete={() => onDeleteSection(section.id)}
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

    return (
        <div data-paper-question className="group/question relative">
            <div className="grid grid-cols-[3rem_1fr] text-sm">
                <div
                    data-paper-question-divider="r"
                    className="px-2 py-1 text-center font-bold"
                >
                    {formatQuestionLabel(index, numberingFormat, 'numeric')}
                </div>
                <QuestionContent
                    value={question.text}
                    className="px-2 py-1 leading-6"
                />
            </div>

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

            {options.length > 0 && (
                <div
                    data-paper-question-divider="t"
                    className="grid grid-cols-4 text-sm"
                >
                    {options.map((option, optionIndex) => (
                        <div
                            key={option.id}
                            data-paper-question-divider="r"
                            className="px-2 py-1"
                        >
                            <span className="font-semibold">
                                ({optionLabels[optionIndex]})
                            </span>{' '}
                            <QuestionContent
                                value={option.text}
                                inline
                                className="align-baseline"
                            />
                        </div>
                    ))}
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

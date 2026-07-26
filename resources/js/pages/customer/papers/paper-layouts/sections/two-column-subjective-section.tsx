import { QuestionContent } from '../questions/question-content';
import { clampSectionColumns, formatQuestionLabel } from '../types';
import type {
    GeneratedPaperQuestion,
    GeneratedPaperSection,
    PaperImageSize,
    PaperQuestionNumberingFormat,
} from '../types';
import { QuestionHoverActions, SectionControls } from './section-actions';

interface TwoColumnSubjectiveSectionProps {
    section: GeneratedPaperSection;
    index: number;
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

export function TwoColumnSubjectiveSection({
    section,
    index,
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
}: TwoColumnSubjectiveSectionProps) {
    // Legacy default of 2 preserves this template's original fixed 2-column
    // look for papers saved before per-block columns existed.
    const columns = clampSectionColumns(section.columns, 2);

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

            {/* Question container — border on all 4 sides; subjective items sit
                in an N-column grid (no inter-row dividers — collapsed-table mode
                only applies to the "stacked" group variant). */}
            <div
                data-paper-question-group="grid"
                className="grid gap-x-8 gap-y-2 px-4 py-3"
                style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
            >
                {section.questions.map((question, questionIndex) => (
                    <SubjectiveQuestionItem
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

function SubjectiveQuestionItem({
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
    return (
        <div
            data-paper-question
            className="group/question relative flex gap-3 pr-28 text-sm leading-6"
        >
            <span className="w-8 shrink-0 font-bold">
                ({formatQuestionLabel(index, numberingFormat, 'roman')})
            </span>
            <div className="min-w-0 flex-1">
                <QuestionContent value={question.text} />
                {question.imageUrl && (
                    <div className="mt-2">
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
                {question.answerLines > 0 && (
                    <div className="mt-2 flex flex-col">
                        {Array.from({ length: question.answerLines }).map(
                            (_, lineIndex) => (
                                <div
                                    key={lineIndex}
                                    style={{
                                        // Per-line height drives both writing
                                        // space and inter-line gap; height=0
                                        // collapses every line's bottom border
                                        // onto the same Y, merging into one rule.
                                        height: `${question.answerLineSpacing ?? 20}px`,
                                    }}
                                    className="border-b border-dotted border-slate-400"
                                />
                            ),
                        )}
                    </div>
                )}
            </div>
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

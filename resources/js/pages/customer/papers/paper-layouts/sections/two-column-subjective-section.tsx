import { QuestionContent } from '../questions/question-content';
import type {
    GeneratedPaperQuestion,
    GeneratedPaperSection,
    PaperImageSize,
} from '../types';
import { QuestionHoverActions, SectionControls } from './section-actions';

interface TwoColumnSubjectiveSectionProps {
    section: GeneratedPaperSection;
    index: number;
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
    onQuestionImageSizeChange: (
        sectionId: string,
        questionId: string,
        imageSize: PaperImageSize,
    ) => void;
}

const roman = [
    'i',
    'ii',
    'iii',
    'iv',
    'v',
    'vi',
    'vii',
    'viii',
    'ix',
    'x',
    'xi',
    'xii',
];

export function TwoColumnSubjectiveSection({
    section,
    index,
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
    onQuestionImageSizeChange,
}: TwoColumnSubjectiveSectionProps) {
    return (
        <section className="paper-section">
            <div className="border border-black text-black">
                <div className="grid grid-cols-[3rem_1fr_8rem] border-b border-black text-sm font-bold">
                    <div className="border-r border-black px-1 py-1">
                        Q.{index + 1}
                    </div>
                    <div className="px-2 py-1">{section.title}</div>
                    <div className="border-l border-black px-2 py-1 text-right">
                        ({section.requiredQuestions}x{section.marksEach}=
                        {section.requiredQuestions * section.marksEach})
                    </div>
                </div>

                <div className="grid gap-x-8 gap-y-2 px-4 py-3 md:grid-cols-2">
                    {section.questions.map((question, questionIndex) => (
                        <SubjectiveQuestionItem
                            key={question.id}
                            question={question}
                            index={questionIndex}
                            section={section}
                            onEditQuestion={onEditQuestion}
                            onRandomQuestion={onRandomQuestion}
                            onPickQuestion={onPickQuestion}
                            onRemoveQuestion={onRemoveQuestion}
                            onAnswerLinesChange={onAnswerLinesChange}
                            onQuestionImageSizeChange={
                                onQuestionImageSizeChange
                            }
                        />
                    ))}
                </div>
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

function SubjectiveQuestionItem({
    question,
    index,
    section,
    onEditQuestion,
    onRandomQuestion,
    onPickQuestion,
    onRemoveQuestion,
    onAnswerLinesChange,
    onQuestionImageSizeChange,
}: {
    question: GeneratedPaperQuestion;
    index: number;
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
    onQuestionImageSizeChange: (
        sectionId: string,
        questionId: string,
        imageSize: PaperImageSize,
    ) => void;
}) {
    return (
        <div className="group/question relative flex gap-3 pr-28 text-sm leading-6">
            <span className="w-8 shrink-0 font-bold">
                ({roman[index] ?? index + 1})
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
                    <div className="mt-2 space-y-1">
                        {Array.from({ length: question.answerLines }).map(
                            (_, lineIndex) => (
                                <div
                                    key={lineIndex}
                                    className="h-4 border-b border-dotted border-slate-400"
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
                onRandom={() => onRandomQuestion(section.id, question.id)}
                onPick={() => onPickQuestion(section.id, question.id)}
                onEdit={() => onEditQuestion(section.id, question.id)}
                onDelete={() => onRemoveQuestion(section.id, question.id)}
                onAnswerLinesChange={(value) =>
                    onAnswerLinesChange(section.id, question.id, value)
                }
            />
        </div>
    );
}

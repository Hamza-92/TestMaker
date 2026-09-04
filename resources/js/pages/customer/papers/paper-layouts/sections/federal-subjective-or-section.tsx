import { PassageQuestionContent } from '../questions/passage-question-content';
import { QuestionTypeHeading } from '../questions/question-type-heading';
import type { SectionTemplateProps } from '../templates/template-props';
import type { GeneratedPaperQuestion } from '../types';
import { BilingualTableContent } from './board-objective-table-section';
import { QuestionHoverActions, SectionControls } from './section-actions';

interface FederalSubjectiveOrSectionProps {
    primary: SectionTemplateProps;
    alternative: SectionTemplateProps;
}

export function FederalSubjectiveOrSection({
    primary,
    alternative,
}: FederalSubjectiveOrSectionProps) {
    const section = primary.section;
    const alternativeSection = alternative.section;

    return (
        <section className="paper-section" data-federal-subjective-section>
            <QuestionTypeHeading
                index={primary.index}
                headingNumber={null}
                title={section.title}
                titleEnglish={section.titleEnglish}
                titleUrdu={section.titleUrdu}
                requiredQuestions={section.requiredQuestions}
                marksEach={section.marksEach}
                hideMarks
            />

            <table data-paper-federal-or-table>
                <colgroup>
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '37%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '37%' }} />
                    <col style={{ width: '7%' }} />
                </colgroup>
                <thead>
                    <tr>
                        <th className="px-1 py-1 text-center font-bold">Q#</th>
                        <th className="px-2 py-1 text-left font-bold">
                            Question
                        </th>
                        <th className="px-1 py-1 text-center font-bold">
                            Marks
                        </th>
                        <th className="px-1 py-1 text-center font-bold">OR</th>
                        <th className="px-2 py-1 text-center font-bold">
                            Question
                        </th>
                        <th className="px-1 py-1 text-center font-bold">
                            Marks
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {section.questions.map((question, index) => (
                        <tr key={question.id} data-paper-question>
                            <td className="px-1 py-1 text-center align-middle font-bold">
                                {index + 1}.
                            </td>
                            <FederalQuestionCell
                                question={question}
                                props={primary}
                            />
                            <td className="px-1 py-1 text-center align-middle font-normal tabular-nums">
                                {section.marksEach}
                            </td>
                            <td className="px-1 py-1 text-center align-middle font-bold">
                                OR
                            </td>
                            {alternativeSection.questions[index] ? (
                                <FederalQuestionCell
                                    question={
                                        alternativeSection.questions[index]
                                    }
                                    props={alternative}
                                />
                            ) : (
                                <td className="px-2 py-1" />
                            )}
                            <td className="px-1 py-1 text-center align-middle font-normal tabular-nums">
                                {section.marksEach}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <SectionControls
                canMoveUp={primary.canMoveUp}
                canMoveDown={primary.canMoveDown}
                canAddRandom={section.questionTypeId !== null}
                columns={1}
                onMoveUp={() => primary.onMoveUp(section.id)}
                onMoveDown={() => primary.onMoveDown(section.id)}
                onShuffleQuestions={() =>
                    primary.onShuffleQuestions(section.id)
                }
                onAddRandom={() => primary.onAddRandomQuestion(section.id)}
                onAddCustom={() => primary.onAddCustomQuestion(section.id)}
                onEdit={() => primary.onEditSection(section.id)}
                onDelete={() => primary.onDeleteSection(section.id)}
                onColumnsChange={() => {}}
                showBlockSettings={false}
            />
        </section>
    );
}

function FederalQuestionCell({
    question,
    props,
}: {
    question: GeneratedPaperQuestion;
    props: SectionTemplateProps;
}) {
    const section = props.section;
    const urduOnly = Boolean(section.titleUrdu && !section.titleEnglish);

    return (
        <td className="group/question relative px-2 py-1 align-top font-normal">
            <BilingualTableContent
                value={question.text}
                urduOnly={urduOnly}
                forceRtl={section.questionTextRtl}
            />
            {question.sameStatement && (
                <div className="mt-0.5">
                    <BilingualTableContent
                        value={question.sameStatement}
                        urduOnly={urduOnly}
                        forceRtl={section.questionTextRtl}
                    />
                </div>
            )}
            {question.imageUrl && (
                <img
                    src={question.imageUrl}
                    alt=""
                    className={
                        question.imageSize === 'sm'
                            ? 'mx-auto mt-1 max-h-24 object-contain'
                            : question.imageSize === 'lg'
                              ? 'mx-auto mt-1 max-h-64 object-contain'
                              : 'mx-auto mt-1 max-h-40 object-contain'
                    }
                />
            )}
            {question.passageQuestions && (
                <PassageQuestionContent
                    questions={question.passageQuestions}
                    rtl={section.questionTextRtl}
                />
            )}
            {question.answerLines > 0 && (
                <div className="mt-2 flex flex-col">
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
                onRandom={() => props.onRandomQuestion(section.id, question.id)}
                onPick={() => props.onPickQuestion(section.id, question.id)}
                onEdit={() => props.onEditQuestion(section.id, question.id)}
                onDelete={() => props.onRemoveQuestion(section.id, question.id)}
                onAnswerLinesChange={(value) =>
                    props.onAnswerLinesChange(section.id, question.id, value)
                }
                onAnswerLineSpacingChange={(value) =>
                    props.onAnswerLineSpacingChange(
                        section.id,
                        question.id,
                        value,
                    )
                }
            />
        </td>
    );
}

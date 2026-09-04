import { splitBilingualParts } from '../questions/bilingual-question-row';
import { QuestionContent } from '../questions/question-content';
import { QuestionTypeHeading } from '../questions/question-type-heading';
import type { SectionTemplateProps } from '../templates/template-props';
import type { GeneratedPaperQuestion } from '../types';
import { BoxedObjectiveSection } from './boxed-objective-section';
import { QuestionHoverActions, SectionControls } from './section-actions';

const OPTION_HEADINGS = ['(A)', '(B)', '(C)', '(D)'] as const;

export function BoardObjectiveTableSection(props: SectionTemplateProps) {
    const { section } = props;
    const supportsTable = section.questions.every(
        (question) => !question.optionsOnly && !question.passageQuestions,
    );

    if (!supportsTable) {
        return <BoxedObjectiveSection {...props} />;
    }

    return (
        <section className="paper-section">
            <QuestionTypeHeading
                index={props.index}
                headingNumber={props.headingNumber}
                title={section.title}
                titleEnglish={section.titleEnglish}
                titleUrdu={section.titleUrdu}
                requiredQuestions={section.requiredQuestions}
                marksEach={section.marksEach}
                hideMarks={props.hideHeadingMarks}
            />

            <table data-paper-objective-table>
                <colgroup>
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '30%' }} />
                    {OPTION_HEADINGS.map((heading) => (
                        <col key={heading} style={{ width: '16%' }} />
                    ))}
                </colgroup>
                <thead>
                    <tr>
                        <th className="px-1 py-1 text-center font-bold">S#</th>
                        <th className="px-2 py-1 text-center font-bold">
                            Question
                        </th>
                        {OPTION_HEADINGS.map((heading) => (
                            <th
                                key={heading}
                                className="px-1 py-1 text-center font-bold"
                            >
                                {heading}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {section.questions.map((question, questionIndex) => (
                        <BoardObjectiveTableRow
                            key={question.id}
                            question={question}
                            number={
                                questionIndex + props.questionNumberOffset + 1
                            }
                            props={props}
                        />
                    ))}
                </tbody>
            </table>

            <SectionControls
                canMoveUp={props.canMoveUp}
                canMoveDown={props.canMoveDown}
                canAddRandom={section.questionTypeId !== null}
                columns={1}
                onMoveUp={() => props.onMoveUp(section.id)}
                onMoveDown={() => props.onMoveDown(section.id)}
                onShuffleQuestions={() => props.onShuffleQuestions(section.id)}
                onAddRandom={() => props.onAddRandomQuestion(section.id)}
                onAddCustom={() => props.onAddCustomQuestion(section.id)}
                onEdit={() => props.onEditSection(section.id)}
                onDelete={() => props.onDeleteSection(section.id)}
                onColumnsChange={() => {}}
                showBlockSettings={false}
            />
        </section>
    );
}

function BoardObjectiveTableRow({
    question,
    number,
    props,
}: {
    question: GeneratedPaperQuestion;
    number: number;
    props: SectionTemplateProps;
}) {
    const { section } = props;
    const urduOnly = Boolean(section.titleUrdu && !section.titleEnglish);

    return (
        <tr data-paper-question>
            <td className="px-1 py-1 text-center align-middle font-bold">
                {number}.
            </td>
            <td className="group/question relative px-2 py-1 align-middle font-semibold">
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
                <QuestionHoverActions
                    canSwap={section.questionTypeId !== null}
                    answerLines={question.answerLines}
                    onRandom={() =>
                        props.onRandomQuestion(section.id, question.id)
                    }
                    onPick={() => props.onPickQuestion(section.id, question.id)}
                    onEdit={() => props.onEditQuestion(section.id, question.id)}
                    onDelete={() =>
                        props.onRemoveQuestion(section.id, question.id)
                    }
                    onAnswerLinesChange={(value) =>
                        props.onAnswerLinesChange(
                            section.id,
                            question.id,
                            value,
                        )
                    }
                />
            </td>
            {Array.from({ length: 4 }, (_, optionIndex) => {
                const option = question.options[optionIndex];

                return (
                    <td
                        key={option?.id ?? `empty-${optionIndex}`}
                        className="px-2 py-1 text-center align-middle font-medium"
                    >
                        {option && (
                            <BilingualTableContent
                                value={option.text}
                                urduOnly={urduOnly}
                                forceRtl={section.questionTextRtl}
                                centered
                            />
                        )}
                    </td>
                );
            })}
        </tr>
    );
}

export function BilingualTableContent({
    value,
    urduOnly,
    forceRtl,
    centered = false,
}: {
    value: string;
    urduOnly: boolean;
    forceRtl?: boolean;
    centered?: boolean;
}) {
    const parts = splitBilingualParts(value);

    if (parts) {
        return (
            <div className="flex min-w-0 flex-col gap-0.5">
                <div
                    dir="ltr"
                    className={centered ? 'text-center' : 'text-left'}
                >
                    <QuestionContent value={parts.english} />
                </div>
                <div
                    dir="rtl"
                    data-paper-urdu-content
                    className={centered ? 'text-center' : 'text-right'}
                    style={{ fontFamily: 'var(--paper-urdu-font)' }}
                >
                    <QuestionContent value={parts.urdu} />
                </div>
            </div>
        );
    }

    const rtl = urduOnly || Boolean(forceRtl);

    return (
        <div
            dir={rtl ? 'rtl' : 'ltr'}
            data-paper-urdu-content={rtl ? true : undefined}
            className={
                centered ? 'text-center' : rtl ? 'text-right' : 'text-left'
            }
            style={rtl ? { fontFamily: 'var(--paper-urdu-font)' } : undefined}
        >
            <QuestionContent value={value} />
        </div>
    );
}

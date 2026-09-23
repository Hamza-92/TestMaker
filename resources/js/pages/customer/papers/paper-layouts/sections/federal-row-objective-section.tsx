import { Fragment } from 'react';
import { QuestionTypeHeading } from '../questions/question-type-heading';
import type { SectionTemplateProps } from '../templates/template-props';
import { objectiveQuestionCount } from '../types';
import type {
    GeneratedPaperPassageQuestion,
    GeneratedPaperQuestion,
    PaperQuestionOption,
} from '../types';
import { BilingualTableContent } from './board-objective-table-section';
import { BoxedObjectiveSection } from './boxed-objective-section';
import { QuestionHoverActions, SectionControls } from './section-actions';

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

export function FederalRowObjectiveSection(props: SectionTemplateProps) {
    const { section } = props;
    const supportsTable = section.questions.every(
        (question) => !question.optionsOnly,
    );

    if (!supportsTable) {
        return <BoxedObjectiveSection {...props} />;
    }

    const urduOnly = Boolean(section.titleUrdu && !section.titleEnglish);
    const optionIndexes = urduOnly ? [3, 2, 1, 0] : [0, 1, 2, 3];
    const showBubbles = props.showObjectiveBubbles === true;
    const columnCount = showBubbles ? 10 : 6;

    return (
        <section className="paper-section">
            <QuestionTypeHeading
                index={props.index}
                headingNumber={props.headingNumber}
                showHeadingNumber={props.showHeadingNumber}
                partLabelEnglish={props.partLabelEnglish}
                partLabelUrdu={props.partLabelUrdu}
                title={section.title}
                titleEnglish={section.titleEnglish}
                titleUrdu={section.titleUrdu}
                requiredQuestions={section.requiredQuestions}
                choiceQuestions={section.totalQuestions}
                marksEach={section.marksEach}
                hideMarks={props.hideHeadingMarks}
            />

            <table
                data-paper-federal-row-objectives
                data-paper-objective-table
                dir="ltr"
            >
                <FederalRowColumns
                    showBubbles={showBubbles}
                    urduOnly={urduOnly}
                />
                <thead>
                    <tr>
                        {urduOnly && showBubbles && (
                            <BubbleHeaders optionIndexes={optionIndexes} />
                        )}
                        {urduOnly && (
                            <OptionHeaders optionIndexes={optionIndexes} />
                        )}
                        {!urduOnly && (
                            <th className="px-1 py-1 text-center font-bold">
                                Sr
                            </th>
                        )}
                        <th className="px-1 py-1 text-center font-bold">
                            {urduOnly ? 'سوالات' : 'Questions'}
                        </th>
                        {urduOnly && (
                            <th className="px-1 py-1 text-center font-bold">
                                نمبر
                            </th>
                        )}
                        {!urduOnly && (
                            <OptionHeaders optionIndexes={optionIndexes} />
                        )}
                        {!urduOnly && showBubbles && (
                            <BubbleHeaders optionIndexes={optionIndexes} />
                        )}
                    </tr>
                </thead>
                <tbody>
                    {section.questions.map((question, questionIndex) => {
                        const number =
                            props.questionNumberOffset +
                            section.questions
                                .slice(0, questionIndex)
                                .reduce(
                                    (total, precedingQuestion) =>
                                        total +
                                        objectiveQuestionCount(
                                            precedingQuestion,
                                        ),
                                    0,
                                ) +
                            1;

                        if (question.passageQuestions?.length) {
                            return (
                                <Fragment key={question.id}>
                                    <PassageRow
                                        question={question}
                                        columnCount={columnCount}
                                        urduOnly={urduOnly}
                                        props={props}
                                    />
                                    {question.passageQuestions.map(
                                        (passageQuestion, passageIndex) => (
                                            <FederalPassageQuestionRow
                                                key={passageQuestion.id}
                                                question={passageQuestion}
                                                number={number + passageIndex}
                                                urduOnly={urduOnly}
                                                optionIndexes={optionIndexes}
                                                showBubbles={showBubbles}
                                                props={props}
                                            />
                                        ),
                                    )}
                                </Fragment>
                            );
                        }

                        return (
                            <FederalRow
                                key={question.id}
                                question={question}
                                number={number}
                                urduOnly={urduOnly}
                                optionIndexes={optionIndexes}
                                showBubbles={showBubbles}
                                props={props}
                            />
                        );
                    })}
                </tbody>
            </table>

            <SectionControls
                canMoveUp={props.canMoveUp}
                canMoveDown={props.canMoveDown}
                canAddRandom={section.questionTypeId !== null}
                columns={1}
                onMoveUp={() => props.onMoveUp(section.id)}
                onMoveDown={() => props.onMoveDown(section.id)}
                onShuffleQuestions={() =>
                    props.onShuffleQuestions(section.id)
                }
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

function FederalRowColumns({
    showBubbles,
    urduOnly,
}: {
    showBubbles: boolean;
    urduOnly: boolean;
}) {
    const serial = <col key="serial" style={{ width: '4%' }} />;
    const question = (
        <col key="question" style={{ width: showBubbles ? '27%' : '28%' }} />
    );
    const options = OPTION_LABELS.map((label) => (
        <col
            key={`option-${label}`}
            style={{ width: showBubbles ? '13.5%' : '17%' }}
        />
    ));
    const bubbles = showBubbles
        ? OPTION_LABELS.map((label) => (
              <col key={`bubble-${label}`} style={{ width: '3.75%' }} />
          ))
        : [];

    return (
        <colgroup>
            {urduOnly
                ? [...bubbles, ...options, question, serial]
                : [serial, question, ...options, ...bubbles]}
        </colgroup>
    );
}

function OptionHeaders({ optionIndexes }: { optionIndexes: number[] }) {
    return (
        <>
            {optionIndexes.map((optionIndex) => (
                <th
                    key={`option-heading-${optionIndex}`}
                    className="px-1 py-1 text-center font-bold"
                >
                    {OPTION_LABELS[optionIndex]}
                </th>
            ))}
        </>
    );
}

function BubbleHeaders({ optionIndexes }: { optionIndexes: number[] }) {
    return (
        <>
            {optionIndexes.map((optionIndex) => (
                <th
                    key={`bubble-heading-${optionIndex}`}
                    data-objective-bubble-column
                    className="px-0.5 py-1 text-center font-bold"
                >
                    {OPTION_LABELS[optionIndex]}
                </th>
            ))}
        </>
    );
}

function PassageRow({
    question,
    columnCount,
    urduOnly,
    props,
}: {
    question: GeneratedPaperQuestion;
    columnCount: number;
    urduOnly: boolean;
    props: SectionTemplateProps;
}) {
    const { section } = props;

    return (
        <tr data-paper-question data-paper-passage-row>
            <td
                colSpan={columnCount}
                className="group/question relative px-2 py-1.5 font-normal"
            >
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
                        className="mx-auto mt-1 max-h-24 object-contain"
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
        </tr>
    );
}

function FederalRow({
    question,
    number,
    urduOnly,
    optionIndexes,
    showBubbles,
    props,
}: {
    question: GeneratedPaperQuestion;
    number: number;
    urduOnly: boolean;
    optionIndexes: number[];
    showBubbles: boolean;
    props: SectionTemplateProps;
}) {
    const { section } = props;
    const options = optionIndexes.map(
        (optionIndex) => question.options[optionIndex],
    );

    return (
        <tr data-paper-question>
            {urduOnly && showBubbles && (
                <BubbleCell
                    options={options}
                    showCorrectAnswers={props.showCorrectAnswers === true}
                />
            )}
            {urduOnly && (
                <OptionCells
                    options={options}
                    urduOnly
                    forceRtl={section.questionTextRtl}
                    showCorrectAnswers={props.showCorrectAnswers === true}
                />
            )}
            {!urduOnly && <SerialCell number={number} />}
            <td className="group/question relative px-1.5 py-1 align-middle font-normal">
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
                        className="mx-auto mt-1 max-h-24 object-contain"
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
            {urduOnly && <SerialCell number={number} />}
            {!urduOnly && (
                <OptionCells
                    options={options}
                    urduOnly={false}
                    forceRtl={section.questionTextRtl}
                    showCorrectAnswers={props.showCorrectAnswers === true}
                />
            )}
            {!urduOnly && showBubbles && (
                <BubbleCell
                    options={options}
                    showCorrectAnswers={props.showCorrectAnswers === true}
                />
            )}
        </tr>
    );
}

function FederalPassageQuestionRow({
    question,
    number,
    urduOnly,
    optionIndexes,
    showBubbles,
    props,
}: {
    question: GeneratedPaperPassageQuestion;
    number: number;
    urduOnly: boolean;
    optionIndexes: number[];
    showBubbles: boolean;
    props: SectionTemplateProps;
}) {
    const options = optionIndexes.map(
        (optionIndex) => question.options[optionIndex],
    );

    return (
        <tr data-paper-question>
            {urduOnly && showBubbles && (
                <BubbleCell
                    options={options}
                    showCorrectAnswers={props.showCorrectAnswers === true}
                />
            )}
            {urduOnly && (
                <OptionCells
                    options={options}
                    urduOnly
                    forceRtl={props.section.questionTextRtl}
                    showCorrectAnswers={props.showCorrectAnswers === true}
                />
            )}
            {!urduOnly && <SerialCell number={number} />}
            <td className="px-1.5 py-1 align-middle font-normal">
                <BilingualTableContent
                    value={question.text}
                    urduOnly={urduOnly}
                    forceRtl={props.section.questionTextRtl}
                />
            </td>
            {urduOnly && <SerialCell number={number} />}
            {!urduOnly && (
                <OptionCells
                    options={options}
                    urduOnly={false}
                    forceRtl={props.section.questionTextRtl}
                    showCorrectAnswers={props.showCorrectAnswers === true}
                />
            )}
            {!urduOnly && showBubbles && (
                <BubbleCell
                    options={options}
                    showCorrectAnswers={props.showCorrectAnswers === true}
                />
            )}
        </tr>
    );
}

function SerialCell({ number }: { number: number }) {
    return (
        <td className="px-0.5 py-1 text-center align-middle font-bold">
            {number}
        </td>
    );
}

function OptionCells({
    options,
    urduOnly,
    forceRtl,
    showCorrectAnswers,
}: {
    options: Array<PaperQuestionOption | undefined>;
    urduOnly: boolean;
    forceRtl?: boolean;
    showCorrectAnswers: boolean;
}) {
    return (
        <>
            {options.map((option, index) => (
                <td
                    key={option?.id ?? `empty-option-${index}`}
                    data-paper-correct-option={
                        option?.isCorrect && showCorrectAnswers
                            ? true
                            : undefined
                    }
                    className="px-1.5 py-1 text-center align-middle font-normal"
                >
                    {option && (
                        <BilingualTableContent
                            value={option.text}
                            urduOnly={urduOnly}
                            forceRtl={forceRtl}
                            centered
                            collapseIdentical
                            showCorrectAnswer={
                                showCorrectAnswers && option.isCorrect === true
                            }
                        />
                    )}
                </td>
            ))}
        </>
    );
}

function BubbleCell({
    options,
    showCorrectAnswers,
}: {
    options: Array<PaperQuestionOption | undefined>;
    showCorrectAnswers: boolean;
}) {
    return (
        <td
            colSpan={OPTION_LABELS.length}
            data-objective-bubble-group
            className="px-0 py-1 align-middle"
        >
            <div className="grid grid-cols-4 items-center">
                {options.map((option, index) => {
                    const filled =
                        showCorrectAnswers && option?.isCorrect === true;

                    return (
                        <span
                            key={option?.id ?? `empty-bubble-${index}`}
                            className="text-center"
                        >
                            <span
                                data-objective-bubble
                                data-filled={filled ? true : undefined}
                                aria-label="Answer bubble"
                            />
                        </span>
                    );
                })}
            </div>
        </td>
    );
}

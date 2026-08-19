import {
    BilingualQuestionRow,
    splitBilingualParts,
} from '../questions/bilingual-question-row';
import { QuestionContent } from '../questions/question-content';
import type { GeneratedPaperSection } from '../types';

interface Props {
    section: GeneratedPaperSection;
    headingNumber: number | null;
    showHeading: boolean;
}

export function MultipartSection({
    section,
    headingNumber,
    showHeading,
}: Props) {
    const multipart = section.multipart;

    if (!multipart) {
        return null;
    }

    const headingEnglish =
        section.titleEnglish?.trim() ||
        (section.titleUrdu
            ? ''
            : multipart.headingEnglish?.trim() || section.title.trim());
    const headingUrdu =
        section.titleUrdu?.trim() ||
        (!section.titleEnglish ? multipart.headingUrdu?.trim() || '' : '');
    const isBilingualHeading = headingEnglish !== '' && headingUrdu !== '';
    const isUrduHeading = headingUrdu !== '' && headingEnglish === '';
    const urduOnly = Boolean(section.titleUrdu && !section.titleEnglish);
    const groupChoiceCount = multipart.groupChoiceCount;
    const groupQuestionCount =
        multipart.groupQuestionCount ?? multipart.rows.length;
    const showChoice =
        typeof groupChoiceCount === 'number' &&
        groupChoiceCount > 0 &&
        groupChoiceCount <= groupQuestionCount;
    const choiceMarks =
        showChoice && typeof groupChoiceCount === 'number'
            ? groupChoiceCount * multipart.marksEach
            : null;
    const choiceMarksLabel =
        choiceMarks === null || typeof groupChoiceCount !== 'number'
            ? ''
            : ' (' +
              multipart.marksEach +
              ' x ' +
              groupChoiceCount +
              ' = ' +
              choiceMarks +
              ')';
    const choiceLabelEnglish =
        showChoice && typeof groupChoiceCount === 'number'
            ? '[Any ' + groupChoiceCount + ']' + choiceMarksLabel
            : '';
    const choiceLabelUrdu =
        showChoice && typeof groupChoiceCount === 'number'
            ? '[کوئی سے بھی ' + groupChoiceCount + ']'
            : '';

    return (
        <section data-paper-multipart className="space-y-1">
            {showHeading && (
                <div
                    className={
                        isBilingualHeading
                            ? 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-3 border border-black px-2 py-1 text-sm font-bold'
                            : 'flex items-start justify-between gap-3 border border-black px-2 py-1 text-sm font-bold'
                    }
                >
                    <div
                        className={
                            isUrduHeading
                                ? 'min-w-0 text-right'
                                : 'min-w-0 text-left'
                        }
                        dir={isUrduHeading ? 'rtl' : 'ltr'}
                        data-paper-urdu-content={
                            isUrduHeading ? true : undefined
                        }
                        style={
                            isUrduHeading
                                ? {
                                      direction: 'rtl',
                                      fontFamily: 'var(--paper-urdu-font)',
                                      textAlign: 'right',
                                  }
                                : undefined
                        }
                    >
                        <QuestionContent
                            value={isUrduHeading ? headingUrdu : headingEnglish}
                            inline
                            className={
                                isUrduHeading
                                    ? 'text-right align-baseline'
                                    : 'align-baseline'
                            }
                        />
                        {showChoice && (
                            <span className="ml-1 align-baseline whitespace-nowrap">
                                {isUrduHeading ? (
                                    <>
                                        {choiceLabelUrdu}
                                        {choiceMarksLabel !== '' && (
                                            <span
                                                dir="ltr"
                                                className="inline-block"
                                                style={{
                                                    direction: 'ltr',
                                                    unicodeBidi: 'isolate',
                                                }}
                                            >
                                                {choiceMarksLabel}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    choiceLabelEnglish
                                )}
                            </span>
                        )}
                    </div>
                    {isBilingualHeading && <div />}
                    {isBilingualHeading && (
                        <div
                            className="min-w-0 text-right"
                            dir="rtl"
                            data-paper-urdu-content
                            style={{ fontFamily: 'var(--paper-urdu-font)' }}
                        >
                            <QuestionContent
                                value={headingUrdu}
                                inline
                                className="text-right align-baseline"
                            />
                            {showChoice && (
                                <span className="mr-1 align-baseline whitespace-nowrap">
                                    {choiceLabelUrdu}
                                    {choiceMarksLabel !== '' && (
                                        <span
                                            dir="ltr"
                                            className="inline-block"
                                            style={{
                                                direction: 'ltr',
                                                unicodeBidi: 'isolate',
                                            }}
                                        >
                                            {choiceMarksLabel}
                                        </span>
                                    )}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}{' '}
            <div className="space-y-0.5 px-2">
                {multipart.rows.map((row, rowIndex) => (
                    <div
                        key={`multipart-row-${rowIndex}`}
                        className="break-inside-avoid text-sm leading-6"
                    >
                        {row.parts.map((part, partIndex) => {
                            const partLabel = `(${String.fromCharCode(97 + partIndex)}`;
                            const indexLabel =
                                partIndex === 0 && headingNumber !== null
                                    ? `Q.${headingNumber}:- ${partLabel}`
                                    : partLabel;

                            const urduIndexLabel =
                                partIndex === 0 && headingNumber !== null
                                    ? `سوال نمبر ${headingNumber}:- ${partLabel}`
                                    : partLabel;

                            const questionValue = part.question.text || ' ';
                            const questionRow = (
                                <BilingualQuestionRow
                                    value={questionValue}
                                    indexLabel={indexLabel}
                                    urduIndexLabel={urduIndexLabel}
                                    marks={part.marksEach}
                                    urduOnly={urduOnly}
                                    sameStatement={part.question.sameStatement}
                                />
                            );
                            const hasBilingualContent =
                                splitBilingualParts(questionValue) !== null;
                            const partMarks = part.marksEach > 0 && (
                                <span className="shrink-0 whitespace-nowrap">
                                    ({part.marksEach})
                                </span>
                            );

                            return (
                                <div
                                    key={`${rowIndex}-${part.key}`}
                                    className="break-inside-avoid"
                                >
                                    {hasBilingualContent ? (
                                        questionRow
                                    ) : (
                                        <div
                                            className="flex items-start gap-2"
                                            dir={urduOnly ? 'rtl' : 'ltr'}
                                        >
                                            <div className="min-w-0 flex-1">
                                                {questionRow}
                                            </div>
                                            {partMarks}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </section>
    );
}

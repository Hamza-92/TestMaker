import { QuestionContent } from './question-content';

interface QuestionTypeHeadingProps {
    index: number;
    headingNumber?: number | null;
    showHeadingNumber?: boolean;
    partLabelEnglish?: string | null;
    partLabelUrdu?: string | null;
    title: string;
    titleEnglish?: string | null;
    titleUrdu?: string | null;
    requiredQuestions: number;
    choiceQuestions: number;
    marksEach: number;
    hideMarks?: boolean;
}

export function QuestionTypeHeading({
    index,
    headingNumber,
    showHeadingNumber = true,
    partLabelEnglish = null,
    partLabelUrdu = null,
    title,
    titleEnglish,
    titleUrdu,
    requiredQuestions,
    choiceQuestions,
    marksEach,
    hideMarks = false,
}: QuestionTypeHeadingProps) {
    const hideInternalSchemaLabel = (value: string | null | undefined) =>
        value?.trim().toLowerCase() === 'subjective_same_statement';
    const english = hideInternalSchemaLabel(titleEnglish)
        ? ''
        : titleEnglish?.trim() || '';
    const urdu = hideInternalSchemaLabel(titleUrdu)
        ? ''
        : titleUrdu?.trim() || '';
    const visibleTitle = hideInternalSchemaLabel(title) ? '' : title;
    const isBilingual = english !== '' && urdu !== '';
    const totalMarks = Number((requiredQuestions * marksEach).toFixed(2));
    const showRequiredChoice = requiredQuestions < choiceQuestions;
    const englishChoiceLabel = showRequiredChoice
        ? `[Any ${requiredQuestions}]`
        : '';
    const urduChoiceLabel = showRequiredChoice
        ? `[\u06a9\u0648\u0626\u06cc \u0633\u06d2 \u0628\u06be\u06cc ${requiredQuestions}]`
        : '';
    const printedHeadingNumber =
        headingNumber === undefined ? index + 1 : headingNumber;
    const numberPrefix = (urduMedium: boolean) =>
        printedHeadingNumber === null ? null : (
            <span
                aria-hidden={showHeadingNumber ? undefined : true}
                className={
                    showHeadingNumber
                        ? 'font-bold'
                        : 'invisible font-bold whitespace-pre'
                }
            >
                {urduMedium
                    ? `سوال نمبر ${printedHeadingNumber}:-`
                    : `Q.${printedHeadingNumber}:-`}
            </span>
        );

    if (!isBilingual) {
        const isUrdu = urdu !== '' && english === '';

        return (
            <div
                data-paper-heading
                className="flex items-start justify-between gap-3 px-2 py-1 text-sm font-bold"
                dir={isUrdu ? 'rtl' : 'ltr'}
            >
                <div
                    className={
                        isUrdu ? 'min-w-0 text-right' : 'min-w-0 text-left'
                    }
                    style={
                        isUrdu
                            ? { fontFamily: 'var(--paper-urdu-font)' }
                            : undefined
                    }
                    data-paper-urdu-content={isUrdu ? true : undefined}
                >
                    {isUrdu ? (
                        <>
                            {numberPrefix(true)}{' '}
                            {partLabelUrdu && (
                                <span className="font-bold">
                                    ({partLabelUrdu})
                                </span>
                            )}{' '}
                            <QuestionContent
                                value={urdu}
                                inline
                                className="text-right align-baseline"
                            />
                            {showRequiredChoice && (
                                <span className="mr-1 align-baseline whitespace-nowrap">
                                    {urduChoiceLabel}
                                </span>
                            )}
                        </>
                    ) : (
                        <>
                            {numberPrefix(false)}{' '}
                            {partLabelEnglish && (
                                <span className="font-bold">
                                    ({partLabelEnglish})
                                </span>
                            )}{' '}
                            <QuestionContent
                                value={english || visibleTitle}
                                inline
                                className="align-baseline"
                            />
                            {showRequiredChoice && (
                                <span className="ml-1 align-baseline whitespace-nowrap">
                                    {englishChoiceLabel}
                                </span>
                            )}
                        </>
                    )}
                </div>
                {!hideMarks && (
                    <div className="shrink-0 whitespace-nowrap">
                        ({requiredQuestions}x{marksEach}={totalMarks})
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            data-paper-heading
            className={
                hideMarks
                    ? 'grid grid-cols-2 items-start gap-x-3 px-2 py-1 text-sm font-bold'
                    : 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-3 px-2 py-1 text-sm font-bold'
            }
        >
            <div className="min-w-0 text-left" dir="ltr">
                {numberPrefix(false)}{' '}
                {partLabelEnglish && (
                    <span className="font-bold">({partLabelEnglish})</span>
                )}{' '}
                <QuestionContent
                    value={english}
                    inline
                    className="align-baseline"
                />
                {showRequiredChoice && (
                    <span className="ml-1 align-baseline whitespace-nowrap">
                        {englishChoiceLabel}
                    </span>
                )}
            </div>
            {!hideMarks && (
                <div className="shrink-0 self-start text-center whitespace-nowrap">
                    ({requiredQuestions}x{marksEach}={totalMarks})
                </div>
            )}
            <div
                className="min-w-0 text-right"
                dir="rtl"
                data-paper-urdu-content
                style={{ fontFamily: 'var(--paper-urdu-font)' }}
            >
                {numberPrefix(true)}{' '}
                {partLabelUrdu && (
                    <span className="font-bold">({partLabelUrdu})</span>
                )}{' '}
                <QuestionContent
                    value={urdu}
                    inline
                    className="text-right align-baseline"
                />
                {showRequiredChoice && (
                    <span className="mr-1 align-baseline whitespace-nowrap">
                        {urduChoiceLabel}
                    </span>
                )}
            </div>
        </div>
    );
}

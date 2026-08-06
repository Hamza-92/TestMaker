import { QuestionContent } from './question-content';

interface QuestionTypeHeadingProps {
    index: number;
    title: string;
    titleEnglish?: string | null;
    titleUrdu?: string | null;
    requiredQuestions: number;
    marksEach: number;
}

export function QuestionTypeHeading({
    index,
    title,
    titleEnglish,
    titleUrdu,
    requiredQuestions,
    marksEach,
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
    const totalMarks = requiredQuestions * marksEach;

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
                        isUrdu
                            ? 'min-w-0 text-right'
                            : 'min-w-0 text-left'
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
                            <span className="font-bold">
                                &#1587;&#1608;&#1575;&#1604; &#1606;&#1605;&#1576;&#1585; {index + 1}:-
                            </span>{' '}
                            <QuestionContent
                                value={urdu}
                                inline
                                className="align-baseline text-right"
                            />
                        </>
                    ) : (
                        <>
                            <span className="font-bold">Q.{index + 1}:-</span>{' '}
                            <QuestionContent
                                value={english || visibleTitle}
                                inline
                                className="align-baseline"
                            />
                        </>
                    )}
                </div>
                <div className="shrink-0 whitespace-nowrap">
                    ({requiredQuestions}x{marksEach}={totalMarks})
                </div>
            </div>
        );
    }

    return (
        <div
            data-paper-heading
            className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-3 px-2 py-1 text-sm font-bold"
        >
            <div className="min-w-0 text-left" dir="ltr">
                <span className="font-bold">Q.{index + 1}:-</span>{' '}
                <QuestionContent
                    value={english}
                    inline
                    className="align-baseline"
                />
            </div>
            <div className="shrink-0 self-start whitespace-nowrap text-center">
                ({requiredQuestions}x{marksEach}={totalMarks})
            </div>
            <div
                className="min-w-0 text-right"
                dir="rtl"
                data-paper-urdu-content
                style={{ fontFamily: 'var(--paper-urdu-font)' }}
            >
                <span className="font-bold">
                    &#1587;&#1608;&#1575;&#1604; &#1606;&#1605;&#1576;&#1585; {index + 1}:-
                </span>{' '}
                <QuestionContent
                    value={urdu}
                    inline
                    className="align-baseline text-right"
                />
            </div>
        </div>
    );
}
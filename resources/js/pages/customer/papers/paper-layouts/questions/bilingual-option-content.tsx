import {
    bilingualPartsHaveSameVisibleText,
    containsUrduScript,
    splitBilingualParts,
} from './bilingual-question-row';
import { QuestionContent } from './question-content';

interface BilingualOptionContentProps {
    value: string;
    label: string;
    urduOnly?: boolean;
    showCorrectAnswer?: boolean;
    circleLabel?: boolean;
}

export function OptionBubbleLabel({
    label,
    filled = false,
}: {
    label: string;
    filled?: boolean;
}) {
    return (
        <span
            data-paper-option-bubble
            data-filled={filled ? true : undefined}
            dir="ltr"
            className="paper-option-bubble"
            aria-label={filled ? `Correct option ${label}` : `Option ${label}`}
        >
            {label}
        </span>
    );
}

export function CorrectAnswerTick({ show }: { show: boolean }) {
    if (!show) {
        return null;
    }

    return (
        <span
            data-paper-correct-answer
            aria-label="Correct answer"
            className="ml-1 inline-block font-bold"
            style={{ fontFamily: 'Arial, sans-serif' }}
        >
            ✓
        </span>
    );
}

/**
 * Options use two readable rows when both mediums are printed. Keeping the
 * scripts in separate blocks prevents a wrapped English line from colliding
 * with the Nastaliq line below it.
 */
function canRenderCompact(parts: { english: string; urdu: string }): boolean {
    const englishLength = plainTextLength(parts.english);
    const urduLength = plainTextLength(parts.urdu);

    return (
        englishLength > 0 &&
        urduLength > 0 &&
        englishLength <= 18 &&
        urduLength <= 18 &&
        englishLength + Math.ceil(urduLength * 0.85) <= 30
    );
}

function plainTextLength(value: string): number {
    return value
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim().length;
}
export function BilingualOptionContent({
    value,
    label,
    urduOnly = false,
    showCorrectAnswer = false,
    circleLabel = false,
}: BilingualOptionContentProps) {
    const parts = splitBilingualParts(value);
    const optionLabel = (showTick = true) =>
        circleLabel ? (
            <OptionBubbleLabel label={label} filled={showCorrectAnswer} />
        ) : (
            <>
                ({label})
                <CorrectAnswerTick show={showTick && showCorrectAnswer} />
            </>
        );

    if (parts && bilingualPartsHaveSameVisibleText(parts)) {
        const isUrdu = containsUrduScript(parts.english);

        return (
            <span
                dir={isUrdu ? 'rtl' : 'ltr'}
                data-paper-urdu-content={isUrdu ? true : undefined}
                data-paper-correct-option={
                    showCorrectAnswer && !circleLabel ? true : undefined
                }
                className={
                    isUrdu
                        ? 'paper-option-line text-right'
                        : 'paper-option-line'
                }
                style={
                    isUrdu
                        ? { fontFamily: 'var(--paper-urdu-font)' }
                        : undefined
                }
            >
                <span dir="ltr" className="font-semibold">
                    {optionLabel()}
                </span>{' '}
                <QuestionContent
                    value={parts.english}
                    inline
                    className="align-baseline"
                />
            </span>
        );
    }

    if (parts && canRenderCompact(parts)) {
        return (
            <span
                data-paper-bilingual-option
                data-paper-correct-option={
                    showCorrectAnswer && !circleLabel ? true : undefined
                }
                className="paper-bilingual-option paper-bilingual-option--compact"
            >
                <span dir="ltr" className="paper-bilingual-option__english">
                    <span className="font-semibold">{optionLabel()}</span>{' '}
                    <QuestionContent
                        value={parts.english}
                        inline
                        className="align-baseline"
                    />
                </span>
                <span
                    aria-hidden="true"
                    className="paper-bilingual-option__separator"
                >
                    /
                </span>
                <span
                    dir="rtl"
                    data-paper-urdu-content
                    className="paper-bilingual-option__urdu"
                    style={{ fontFamily: 'var(--paper-urdu-font)' }}
                >
                    <QuestionContent
                        value={parts.urdu}
                        inline
                        className="text-right align-baseline"
                    />
                </span>
            </span>
        );
    }

    if (parts) {
        return (
            <span
                data-paper-bilingual-option
                data-paper-correct-option={
                    showCorrectAnswer && !circleLabel ? true : undefined
                }
                className="paper-bilingual-option"
            >
                <span dir="ltr" className="paper-bilingual-option__english">
                    <span className="font-semibold">{optionLabel()}</span>{' '}
                    <QuestionContent
                        value={parts.english}
                        inline
                        className="align-baseline"
                    />
                </span>
                <span
                    dir="rtl"
                    data-paper-urdu-content
                    className="paper-bilingual-option__urdu"
                    style={{ fontFamily: 'var(--paper-urdu-font)' }}
                >
                    <span dir="ltr" className="font-semibold">
                        {optionLabel(false)}
                    </span>{' '}
                    <QuestionContent
                        value={parts.urdu}
                        inline
                        className="text-right align-baseline"
                    />
                </span>
            </span>
        );
    }

    return (
        <span
            dir={urduOnly ? 'rtl' : 'ltr'}
            data-paper-urdu-content={urduOnly ? true : undefined}
            data-paper-correct-option={
                showCorrectAnswer && !circleLabel ? true : undefined
            }
            className={
                urduOnly ? 'paper-option-line text-right' : 'paper-option-line'
            }
            style={
                urduOnly ? { fontFamily: 'var(--paper-urdu-font)' } : undefined
            }
        >
            <span className="font-semibold">
                {circleLabel ? optionLabel() : `(${label})`}
            </span>{' '}
            {!circleLabel && <CorrectAnswerTick show={showCorrectAnswer} />}{' '}
            <QuestionContent value={value} inline className="align-baseline" />
        </span>
    );
}

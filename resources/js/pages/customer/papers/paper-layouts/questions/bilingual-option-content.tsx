import { splitBilingualParts } from './bilingual-question-row';
import { QuestionContent } from './question-content';

interface BilingualOptionContentProps {
    value: string;
    label: string;
    urduOnly?: boolean;
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
}: BilingualOptionContentProps) {
    const parts = splitBilingualParts(value);

    if (parts && canRenderCompact(parts)) {
        return (
            <span
                data-paper-bilingual-option
                className="paper-bilingual-option paper-bilingual-option--compact"
            >
                <span dir="ltr" className="paper-bilingual-option__english">
                    <span className="font-semibold">({label})</span>{' '}
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
                className="paper-bilingual-option"
            >
                <span dir="ltr" className="paper-bilingual-option__english">
                    <span className="font-semibold">({label})</span>{' '}
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
                        ({label})
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
            className={
                urduOnly ? 'paper-option-line text-right' : 'paper-option-line'
            }
            style={
                urduOnly ? { fontFamily: 'var(--paper-urdu-font)' } : undefined
            }
        >
            <span className="font-semibold">({label})</span>{' '}
            <QuestionContent value={value} inline className="align-baseline" />
        </span>
    );
}

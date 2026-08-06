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
export function BilingualOptionContent({
    value,
    label,
    urduOnly = false,
}: BilingualOptionContentProps) {
    const parts = splitBilingualParts(value);

    if (parts) {
        return (
            <span data-paper-bilingual-option className="paper-bilingual-option">
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
                    <span dir="ltr" className="font-semibold">({label})</span>{' '}
                    <QuestionContent
                        value={parts.urdu}
                        inline
                        className="align-baseline text-right"
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
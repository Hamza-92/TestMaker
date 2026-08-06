import { QuestionContent } from './question-content';
import { questionTextToHtml } from './question-html';

interface BilingualQuestionRowProps {
    value: string;
    indexLabel: string;
    marks: number;
    urduOnly?: boolean;
    hideMarks?: boolean;
}

export interface BilingualParts {
    english: string;
    urdu: string;
}

export function BilingualQuestionRow({
    value,
    indexLabel,
    marks,
    urduOnly = false,
    hideMarks = false,
}: BilingualQuestionRowProps) {
    const parts = splitBilingualParts(value);

    if (!parts) {
        if (urduOnly) {
            return (
                <div
                    dir="rtl"
                    data-paper-urdu-content
                    className="min-w-0 text-right"
                    style={{ fontFamily: 'var(--paper-urdu-font)' }}
                >
                    <span className="font-bold">
                        &#1587;&#1608;&#1575;&#1604; &#1606;&#1605;&#1576;&#1585; {indexLabel}:-
                    </span>{' '}
                    <QuestionContent
                        value={value}
                        inline
                        className="align-baseline text-right"
                    />
                </div>
            );
        }

        return (
            <div className="min-w-0 text-left">
                <span className="font-bold">Q. No. {indexLabel}:-</span>{' '}
                <QuestionContent value={value} inline className="align-baseline" />
            </div>
        );
    }

    return (
        <div
            className={
                hideMarks
                    ? 'grid min-w-0 grid-cols-2 items-start gap-x-3'
                    : 'grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-3'
            }
        >
            <div dir="ltr" className="min-w-0 text-left">
                <span className="font-bold">Q. No. {indexLabel}:-</span>{' '}
                <QuestionContent
                    value={parts.english}
                    inline
                    className="align-baseline"
                />
            </div>

            {!hideMarks && (
                <span className="self-start px-1 text-center text-xs font-semibold">
                    ({marks})
                </span>
            )}

            <div
                dir="rtl"
                data-paper-urdu-content
                className="min-w-0 text-right"
                style={{ fontFamily: 'var(--paper-urdu-font)' }}
            >
                <span className="font-bold">
                    &#1587;&#1608;&#1575;&#1604; &#1606;&#1605;&#1576;&#1585; {indexLabel}:-
                </span>{' '}
                <QuestionContent
                    value={parts.urdu}
                    inline
                    className="align-baseline text-right"
                />
            </div>
        </div>
    );
}

export function splitBilingualParts(value: string): BilingualParts | null {
    const html = questionTextToHtml(value);

    if (typeof document !== 'undefined') {
        const root = document.createElement('div');
        root.innerHTML = html;
        const children = Array.from(root.children);

        if (children.length === 2) {
            const [english, urdu] = children;

            if (urdu.getAttribute('dir') === 'rtl') {
                return {
                    english: english.innerHTML,
                    urdu: urdu.innerHTML,
                };
            }
        }
    }

    const match = html.match(
        /^<div>([\s\S]*?)<\/div><div[^>]*dir=["']rtl["'][^>]*>([\s\S]*?)<\/div>$/i,
    );

    return match ? { english: match[1], urdu: match[2] } : null;
}
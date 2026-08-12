import { QuestionContent } from './question-content';
import { questionTextToHtml } from './question-html';

interface BilingualQuestionRowProps {
    value: string;
    indexLabel: string;
    marks: number;
    urduOnly?: boolean;
    hideMarks?: boolean;
    sameStatement?: string | null;
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
    sameStatement = null,
}: BilingualQuestionRowProps) {
    const parts = splitBilingualParts(value);
    const sharedParts = sameStatement
        ? splitBilingualParts(sameStatement)
        : null;

    if (sameStatement && parts) {
        return (
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-3">
                <div dir="ltr" className="min-w-0 text-left">
                    <span className="font-bold">{indexLabel})</span>{' '}
                    <QuestionContent
                        value={parts.english}
                        inline
                        className="align-baseline"
                    />
                </div>

                <div dir="ltr" className="max-w-[18rem] min-w-0 text-center">
                    <QuestionContent
                        value={sharedParts?.english ?? sameStatement}
                        inline
                        className="align-baseline"
                    />
                </div>

                <div
                    dir="rtl"
                    data-paper-urdu-content
                    className="min-w-0 text-right"
                    style={{ fontFamily: 'var(--paper-urdu-font)' }}
                >
                    <span className="font-bold">{indexLabel})</span>{' '}
                    <QuestionContent
                        value={parts.urdu}
                        inline
                        className="text-right align-baseline"
                    />
                </div>
            </div>
        );
    }

    if (!parts) {
        if (urduOnly) {
            return (
                <div
                    dir="rtl"
                    data-paper-urdu-content
                    className="min-w-0 text-right"
                    style={{ fontFamily: 'var(--paper-urdu-font)' }}
                >
                    <span className="font-bold">{indexLabel})</span>{' '}
                    <QuestionContent
                        value={value}
                        inline
                        className="text-right align-baseline"
                    />
                    {sameStatement && (
                        <>
                            {' - '}
                            <QuestionContent
                                value={sameStatement}
                                inline
                                className="text-right align-baseline"
                            />
                        </>
                    )}
                </div>
            );
        }

        return (
            <div className="min-w-0 text-left">
                <span className="font-bold">{indexLabel})</span>{' '}
                <QuestionContent
                    value={value}
                    inline
                    className="align-baseline"
                />
                {sameStatement && (
                    <>
                        {' - '}
                        <QuestionContent
                            value={sameStatement}
                            inline
                            className="align-baseline"
                        />
                    </>
                )}
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
                <span className="font-bold">{indexLabel})</span>{' '}
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
                <span className="font-bold">{indexLabel})</span>{' '}
                <QuestionContent
                    value={parts.urdu}
                    inline
                    className="text-right align-baseline"
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

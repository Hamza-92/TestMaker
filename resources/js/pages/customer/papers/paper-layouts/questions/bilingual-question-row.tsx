import { QuestionContent } from './question-content';
import { questionTextToHtml } from './question-html';

interface BilingualQuestionRowProps {
    value: string;
    indexLabel: string;
    urduIndexLabel?: string;
    marks: number;
    urduOnly?: boolean;
    forceRtl?: boolean;
    hideMarks?: boolean;
    sameStatement?: string | null;
}

export interface BilingualParts {
    english: string;
    urdu: string;
}

function normalizedVisibleText(value: string): string {
    let text = value;

    if (typeof document !== 'undefined') {
        const root = document.createElement('div');
        root.innerHTML = value;
        text = root.textContent ?? '';
    } else {
        text = value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ');
    }

    return text
        .normalize('NFKC')
        .replace(/[\u200b-\u200f\u2066-\u2069\ufeff]/g, '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function bilingualPartsHaveSameVisibleText(
    parts: BilingualParts,
): boolean {
    const english = normalizedVisibleText(parts.english);
    const urdu = normalizedVisibleText(parts.urdu);
    const compactEnglish = english.replace(/\s+/g, '');
    const compactUrdu = urdu.replace(/\s+/g, '');

    return compactEnglish !== '' && compactEnglish === compactUrdu;
}

export function containsUrduScript(value: string): boolean {
    return /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/.test(
        normalizedVisibleText(value),
    );
}

export function BilingualQuestionRow({
    value,
    indexLabel,
    urduIndexLabel = indexLabel,
    marks,
    urduOnly = false,
    forceRtl = false,
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
                <div
                    dir="ltr"
                    className="flex min-w-0 items-baseline text-left"
                >
                    <span className="shrink-0 font-bold">{indexLabel})</span>{' '}
                    <QuestionContent
                        value={parts.english}
                        inline
                        className="min-w-0 flex-1 align-baseline"
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
                    className="flex min-w-0 items-baseline text-right"
                    style={{ fontFamily: 'var(--paper-urdu-font)' }}
                >
                    <span className="shrink-0 font-bold">
                        {urduIndexLabel})
                    </span>{' '}
                    <QuestionContent
                        value={parts.urdu}
                        inline
                        className="min-w-0 flex-1 text-right align-baseline"
                    />
                </div>
            </div>
        );
    }

    if (!parts) {
        if (urduOnly || forceRtl) {
            return (
                <div
                    dir="rtl"
                    data-paper-urdu-content
                    className="flex min-w-0 items-baseline text-right"
                    style={{ fontFamily: 'var(--paper-urdu-font)' }}
                >
                    <span className="shrink-0 font-bold">
                        {urduIndexLabel})
                    </span>{' '}
                    <QuestionContent
                        value={value}
                        inline
                        className="min-w-0 flex-1 text-right align-baseline"
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
            <div className="flex min-w-0 items-baseline text-left">
                <span className="shrink-0 font-bold">{indexLabel})</span>{' '}
                <QuestionContent
                    value={value}
                    inline
                    className="min-w-0 flex-1 align-baseline"
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
            <div dir="ltr" className="flex min-w-0 items-baseline text-left">
                <span className="shrink-0 font-bold">{indexLabel})</span>{' '}
                <QuestionContent
                    value={parts.english}
                    inline
                    className="min-w-0 flex-1 align-baseline"
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
                className="flex min-w-0 items-baseline text-right"
                style={{ fontFamily: 'var(--paper-urdu-font)' }}
            >
                <span className="shrink-0 font-bold">{urduIndexLabel})</span>{' '}
                <QuestionContent
                    value={parts.urdu}
                    inline
                    className="min-w-0 flex-1 text-right align-baseline"
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

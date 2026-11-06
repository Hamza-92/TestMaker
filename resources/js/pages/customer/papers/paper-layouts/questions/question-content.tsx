import 'katex/dist/katex.min.css';
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { markArabicQuestionHtml } from './arabic-question-font';
import { questionTextToHtml } from './question-html';
import { formatVerseHtml } from './verse-html';

interface QuestionContentProps {
    value: string;
    className?: string;
    inline?: boolean;
    as?: 'div' | 'span';
    verseLayout?: boolean;
    verseDirection?: 'ltr' | 'rtl';
}

const ArabicQuestionFontContext = createContext(false);

export function ArabicQuestionFontProvider({
    enabled,
    children,
}: {
    enabled: boolean;
    children: ReactNode;
}) {
    return (
        <ArabicQuestionFontContext.Provider value={enabled}>
            {children}
        </ArabicQuestionFontContext.Provider>
    );
}

export function QuestionContent({
    value,
    className,
    inline = false,
    as: Component = 'div',
    verseLayout = false,
    verseDirection,
}: QuestionContentProps) {
    const enableArabicFont = useContext(ArabicQuestionFontContext);
    const sourceHtml = questionTextToHtml(value);
    const html = verseLayout
        ? formatVerseHtml(sourceHtml, verseDirection)
        : sourceHtml;

    return (
        <Component
            className={cn('paper-rich-text', inline && 'inline', className)}
            dangerouslySetInnerHTML={{
                __html: enableArabicFont ? markArabicQuestionHtml(html) : html,
            }}
        />
    );
}

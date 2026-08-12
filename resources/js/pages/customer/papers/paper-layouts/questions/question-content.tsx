import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';
import { questionTextToHtml } from './question-html';

interface QuestionContentProps {
    value: string;
    className?: string;
    inline?: boolean;
    as?: 'div' | 'span';
}

export function QuestionContent({
    value,
    className,
    inline = false,
    as: Component = 'div',
}: QuestionContentProps) {
    return (
        <Component
            className={cn('paper-rich-text', inline && 'inline', className)}
            dangerouslySetInnerHTML={{ __html: questionTextToHtml(value) }}
        />
    );
}

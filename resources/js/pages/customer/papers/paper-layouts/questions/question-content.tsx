import { cn } from '@/lib/utils';
import { questionTextToHtml } from './question-html';

interface QuestionContentProps {
    value: string;
    className?: string;
    inline?: boolean;
}

export function QuestionContent({
    value,
    className,
    inline = false,
}: QuestionContentProps) {
    return (
        <div
            className={cn('paper-rich-text', inline && 'inline', className)}
            dangerouslySetInnerHTML={{ __html: questionTextToHtml(value) }}
        />
    );
}

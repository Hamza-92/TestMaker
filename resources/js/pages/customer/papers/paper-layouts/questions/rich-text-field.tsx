import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { QuestionContent } from './question-content';

interface RichTextFieldProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    placeholder?: string;
    ariaLabel?: string;
}

function richTextToPlainText(value: string): string {
    const withoutTags = value
        .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]*>/g, ' ');

    if (typeof DOMParser === 'undefined') {
        return withoutTags
            .replace(/&(?:nbsp|npsp);/gi, ' ')
            .replace(/&#(?:160|xA0);/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&#0*39;|&apos;/gi, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }

    return (
        new DOMParser().parseFromString(withoutTags, 'text/html').body
            .textContent ?? withoutTags
    )
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Shows sanitized stored rich text in paper previews/prints while retaining
 * the existing click-to-edit behaviour of header inputs.
 */
export function RichTextField({
    value,
    onChange,
    className,
    placeholder,
    ariaLabel,
}: RichTextFieldProps) {
    const editableValue = useMemo(() => richTextToPlainText(value), [value]);
    const renderedValue = value.trim() || placeholder || '';

    return (
        <span
            className={cn(
                'group/rich-text-field relative block min-h-[1.25em] min-w-0',
                className,
            )}
        >
            <input
                autoComplete="off"
                value={editableValue}
                onChange={(event) => onChange(event.target.value)}
                aria-label={ariaLabel ?? placeholder}
                placeholder={placeholder}
                className="peer absolute inset-0 z-10 h-full w-full bg-inherit [color:inherit] opacity-0 outline-none [font:inherit] focus:opacity-100 print:hidden"
            />
            <QuestionContent
                as="span"
                inline
                value={renderedValue}
                className={cn(
                    'pointer-events-none block min-h-[1.25em] min-w-0 overflow-hidden peer-focus:invisible print:visible',
                    !value.trim() && 'opacity-50',
                )}
            />
        </span>
    );
}

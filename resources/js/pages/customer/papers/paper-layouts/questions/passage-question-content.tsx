import { cn } from '@/lib/utils';
import type { GeneratedPaperPassageQuestion } from '../types';
import { QuestionContent } from './question-content';

const optionLabels = ['a', 'b', 'c', 'd', 'e', 'f'];

export function PassageQuestionContent({
    questions,
    inline = false,
    rtl = false,
}: {
    questions: GeneratedPaperPassageQuestion[];
    inline?: boolean;
    rtl?: boolean;
}) {
    if (inline) {
        return (
            <span
                dir={rtl ? 'rtl' : undefined}
                data-paper-urdu-content={rtl ? true : undefined}
                className={cn(
                    'ml-2 block align-top',
                    rtl && 'mr-2 ml-0 text-right',
                )}
                style={
                    rtl ? { fontFamily: 'var(--paper-urdu-font)' } : undefined
                }
            >
                <span className="flex flex-col gap-1">
                    {questions.map((question, questionIndex) => (
                        <span
                            key={question.id}
                            className="inline-flex flex-wrap items-baseline gap-x-1"
                        >
                            <span className="font-semibold">
                                {questionIndex + 1}.
                            </span>
                            <QuestionContent
                                value={question.text}
                                inline
                                className="align-baseline"
                            />
                            <PassageOptions
                                options={question.options}
                                inline
                                rtl={rtl}
                            />
                        </span>
                    ))}
                </span>
            </span>
        );
    }

    return (
        <div
            dir={rtl ? 'rtl' : undefined}
            data-paper-urdu-content={rtl ? true : undefined}
            className={cn('mt-2 space-y-2', rtl && 'text-right')}
            style={rtl ? { fontFamily: 'var(--paper-urdu-font)' } : undefined}
        >
            {questions.map((question, questionIndex) => (
                <div key={question.id} className="py-1">
                    <div className="flex items-start gap-2">
                        <span className="shrink-0 font-semibold">
                            {questionIndex + 1}.
                        </span>
                        <QuestionContent
                            value={question.text}
                            className="min-w-0 flex-1"
                        />
                    </div>
                    <PassageOptions options={question.options} rtl={rtl} />
                </div>
            ))}
        </div>
    );
}

function PassageOptions({
    options,
    inline = false,
    rtl = false,
}: {
    options: GeneratedPaperPassageQuestion['options'];
    inline?: boolean;
    rtl?: boolean;
}) {
    if (options.length === 0) {
        return null;
    }

    if (inline) {
        return (
            <span className="ml-1 inline-flex flex-wrap items-baseline gap-x-2">
                {options.map((option, optionIndex) => (
                    <span
                        key={option.id}
                        className="inline-flex items-baseline"
                    >
                        <span className="font-semibold">
                            ({optionLabels[optionIndex] ?? optionIndex + 1})
                        </span>{' '}
                        <QuestionContent
                            value={option.text}
                            inline
                            className="align-baseline"
                        />
                    </span>
                ))}
            </span>
        );
    }

    return (
        <div
            className={cn(
                'mt-1 grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2',
                rtl ? 'pr-6' : 'pl-6',
            )}
        >
            {options.map((option, optionIndex) => (
                <div key={option.id} className="flex items-start gap-1">
                    <span className="shrink-0 font-semibold">
                        ({optionLabels[optionIndex] ?? optionIndex + 1})
                    </span>
                    <QuestionContent
                        value={option.text}
                        inline
                        className="min-w-0 align-baseline"
                    />
                </div>
            ))}
        </div>
    );
}

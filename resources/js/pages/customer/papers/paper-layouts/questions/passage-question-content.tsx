import type { GeneratedPaperPassageQuestion } from '../types';
import { QuestionContent } from './question-content';

const optionLabels = ['a', 'b', 'c', 'd', 'e', 'f'];

export function PassageQuestionContent({
    questions,
    inline = false,
}: {
    questions: GeneratedPaperPassageQuestion[];
    inline?: boolean;
}) {
    if (inline) {
        return (
            <span className="ml-2 block align-top">
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
                            />
                        </span>
                    ))}
                </span>
            </span>
        );
    }

    return (
        <div className="mt-2 space-y-2">
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
                    <PassageOptions options={question.options} />
                </div>
            ))}
        </div>
    );
}

function PassageOptions({
    options,
    inline = false,
}: {
    options: GeneratedPaperPassageQuestion['options'];
    inline?: boolean;
}) {
    if (options.length === 0) {
        return null;
    }

    if (inline) {
        return (
            <span className="ml-1 inline-flex flex-wrap items-baseline gap-x-2">
                {options.map((option, optionIndex) => (
                    <span key={option.id} className="inline-flex items-baseline">
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
        <div className="mt-1 grid grid-cols-1 gap-x-3 gap-y-1 pl-6 sm:grid-cols-2">
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

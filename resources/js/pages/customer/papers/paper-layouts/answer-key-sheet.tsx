import { KeyRoundIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { optionLetter, setLabelFor } from './paper-variant';
import { QuestionContent } from './questions/question-content';
import type {
    GeneratedPaper,
    GeneratedPaperQuestion,
    GeneratedPaperSection,
    PaperSettings,
} from './types';

interface Props {
    paper: GeneratedPaper;
    setIndex: number;
    settings: PaperSettings;
    style: CSSProperties;
}

function answerForQuestion(question: GeneratedPaperQuestion): string {
    if (question.passageQuestions?.length) {
        return question.passageQuestions
            .map((passageQuestion, index) => {
                const correctLetters = passageQuestion.options
                    .map((option, optionIndex) =>
                        option.isCorrect ? optionLetter(optionIndex) : null,
                    )
                    .filter((letter): letter is string => letter !== null);

                return (
                    String(index + 1) +
                    '. ' +
                    (correctLetters.join(', ') || '-')
                );
            })
            .join('; ');
    }

    if (question.options.length > 0) {
        const correctLetters = question.options
            .map((option, index) =>
                option.isCorrect ? optionLetter(index) : null,
            )
            .filter((letter): letter is string => letter !== null);

        if (correctLetters.length > 0) {
            return correctLetters.join(', ');
        }
    }

    if (question.answerText) {
        return question.answerText;
    }

    return '\u2014';
}

export function AnswerKeySheet({ paper, setIndex, settings, style }: Props) {
    const showSetLabel = paper.sections.length > 0;

    return (
        <div style={style} className="answer-key-sheet space-y-4">
            <div
                className="flex items-center justify-between border-b pb-2"
                style={{ borderColor: settings.textColor + '40' }}
            >
                <div className="flex items-center gap-2">
                    <KeyRoundIcon
                        className="size-5"
                        style={{ color: settings.textColor }}
                    />
                    <p
                        className="text-base font-semibold"
                        style={{ color: settings.textColor }}
                    >
                        Answer Key
                    </p>
                </div>
                {showSetLabel && (
                    <p
                        className="text-xs font-semibold tracking-wider uppercase"
                        style={{ color: settings.textColor }}
                    >
                        Set {setLabelFor(setIndex)}
                    </p>
                )}
            </div>
            <div className="space-y-4">
                {paper.sections.map((section, sectionIndex) => (
                    <SectionAnswers
                        key={section.id}
                        section={section}
                        sectionIndex={sectionIndex}
                        settings={settings}
                    />
                ))}
            </div>
        </div>
    );
}

function SectionAnswers({
    section,
    sectionIndex,
    settings,
}: {
    section: GeneratedPaperSection;
    sectionIndex: number;
    settings: PaperSettings;
}) {
    return (
        <div>
            <p
                className="mb-1.5 text-sm font-semibold"
                style={{ color: settings.textColor }}
            >
                <span>Q.{sectionIndex + 1}</span>{' '}
                <QuestionContent as="span" inline value={section.title} />
            </p>
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                {section.questions.map((question, questionIndex) => (
                    <div
                        key={question.id}
                        className="flex gap-2 text-sm"
                        style={{ color: settings.textColor }}
                    >
                        <span className="min-w-[1.75rem] font-medium">
                            {sectionIndex + 1}.{questionIndex + 1}
                        </span>
                        <QuestionContent
                            as="span"
                            inline
                            value={answerForQuestion(question)}
                            className="flex-1 break-words"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

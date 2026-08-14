import { KeyRoundIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { optionLetter, setLabelFor } from './paper-variant';
import { QuestionContent } from './questions/question-content';
import { resolveOrGroupLabel } from './types';
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

function answerSectionNumber(
    sections: GeneratedPaperSection[],
    sectionIndex: number,
): number {
    const section = sections[sectionIndex];

    if (section.category === 'Objective Questions') {
        return 1;
    }

    if (section.orRole === 'alternative' && section.orGroupId) {
        const primaryIndex = sections.findIndex(
            (candidate) =>
                candidate.orGroupId === section.orGroupId &&
                candidate.orRole === 'primary',
        );

        if (primaryIndex >= 0) {
            return answerSectionNumber(sections, primaryIndex);
        }
    }

    return (
        2 +
        sections
            .slice(0, sectionIndex)
            .filter(
                (candidate) =>
                    candidate.category === 'Subjective Questions' &&
                    candidate.orRole !== 'alternative',
            ).length
    );
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
                {paper.sections.map((section, sectionIndex) => {
                    if (section.orRole === 'alternative') {
                        return null;
                    }

                    const alternativeIndex =
                        section.orRole === 'primary' && section.orGroupId
                            ? paper.sections.findIndex(
                                  (candidate) =>
                                      candidate.orGroupId ===
                                          section.orGroupId &&
                                      candidate.orRole === 'alternative',
                              )
                            : -1;
                    const sectionNumber = answerSectionNumber(
                        paper.sections,
                        sectionIndex,
                    );

                    if (alternativeIndex < 0) {
                        return (
                            <SectionAnswers
                                key={section.id}
                                section={section}
                                sectionNumber={sectionNumber}
                                settings={settings}
                            />
                        );
                    }

                    const alternative = paper.sections[alternativeIndex];
                    const sideBySide =
                        settings.orGroupLayout === 'side-by-side';

                    return (
                        <div
                            key={section.orGroupId ?? section.id}
                            className={
                                sideBySide
                                    ? 'grid items-stretch'
                                    : 'flex flex-col'
                            }
                            style={
                                sideBySide
                                    ? {
                                          gridTemplateColumns:
                                              'minmax(0, 1fr) auto minmax(0, 1fr)',
                                          columnGap: `${settings.orGroupGap}mm`,
                                      }
                                    : {
                                          rowGap: `${settings.orGroupGap}mm`,
                                      }
                            }
                        >
                            <div className="min-w-0">
                                <SectionAnswers
                                    section={section}
                                    sectionNumber={sectionNumber}
                                    settings={settings}
                                />
                            </div>
                            <AnswerKeyOrDivider
                                label={resolveOrGroupLabel(
                                    settings,
                                    section.orLabel,
                                )}
                                settings={settings}
                                orientation={
                                    sideBySide ? 'vertical' : 'horizontal'
                                }
                            />
                            <div className="min-w-0">
                                <SectionAnswers
                                    section={alternative}
                                    sectionNumber={sectionNumber}
                                    settings={settings}
                                    showOrPrefix={false}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function AnswerKeyOrDivider({
    label,
    settings,
    orientation,
}: {
    label: string;
    settings: PaperSettings;
    orientation: 'horizontal' | 'vertical';
}) {
    const showLine = settings.orGroupDividerStyle === 'line';
    const showBadge = settings.orGroupDividerStyle === 'badge';
    const marker = (
        <span
            className={
                showBadge
                    ? 'shrink-0 rounded-full border px-1.5 py-0.5 font-bold'
                    : 'shrink-0 px-1 font-bold'
            }
            style={showBadge ? { borderColor: settings.textColor } : undefined}
        >
            {label}
        </span>
    );

    if (orientation === 'vertical') {
        return (
            <div
                role="separator"
                aria-label="OR alternative"
                className="flex min-h-[2rem] justify-center self-stretch"
                style={{ color: settings.textColor }}
            >
                <div className="flex flex-col items-center">
                    {showLine && (
                        <span
                            className="w-px flex-1"
                            style={{ backgroundColor: settings.textColor }}
                        />
                    )}
                    {marker}
                    {showLine && (
                        <span
                            className="w-px flex-1"
                            style={{ backgroundColor: settings.textColor }}
                        />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            role="separator"
            aria-label="OR alternative"
            className="flex items-center justify-center gap-2"
            style={{ color: settings.textColor }}
        >
            {showLine && (
                <span
                    className="h-px flex-1"
                    style={{ backgroundColor: settings.textColor }}
                />
            )}
            {marker}
            {showLine && (
                <span
                    className="h-px flex-1"
                    style={{ backgroundColor: settings.textColor }}
                />
            )}
        </div>
    );
}

function SectionAnswers({
    section,
    sectionNumber,
    settings,
    showOrPrefix = true,
}: {
    section: GeneratedPaperSection;
    sectionNumber: number;
    settings: PaperSettings;
    showOrPrefix?: boolean;
}) {
    return (
        <div>
            <p
                className="mb-1.5 text-sm font-semibold"
                style={{ color: settings.textColor }}
            >
                {section.orRole === 'alternative' ? (
                    showOrPrefix ? (
                        <span>
                            {resolveOrGroupLabel(settings, section.orLabel)} ·
                        </span>
                    ) : null
                ) : (
                    <span>Q.{sectionNumber}</span>
                )}{' '}
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
                            {sectionNumber}.{questionIndex + 1}
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

import { QuestionContent } from '../questions/question-content';
import type { GeneratedPaperSection } from '../types';

interface Props {
    section: GeneratedPaperSection;
    headingNumber: number | null;
    showHeading: boolean;
}

export function MultipartSection({
    section,
    headingNumber,
    showHeading,
}: Props) {
    const multipart = section.multipart;

    if (!multipart) {
        return null;
    }

    const headingEnglish =
        multipart.headingEnglish?.trim() ||
        section.titleEnglish?.trim() ||
        section.title;
    const headingUrdu =
        multipart.headingUrdu?.trim() || section.titleUrdu?.trim() || '';

    return (
        <section data-paper-multipart className="space-y-1">
            {showHeading && (
                <div className="flex items-start justify-between gap-3 border border-black px-2 py-1 text-sm font-bold">
                    <div className="min-w-0" dir="ltr">
                        <QuestionContent value={headingEnglish} inline />
                    </div>
                    {headingUrdu && (
                        <div
                            className="min-w-0 text-right"
                            dir="rtl"
                            data-paper-urdu-content
                        >
                            <QuestionContent value={headingUrdu} inline />
                        </div>
                    )}
                </div>
            )}
            <div className="space-y-0.5 px-2">
                {multipart.rows.map((row, rowIndex) => (
                    <div
                        key={`multipart-row-${rowIndex}`}
                        className="break-inside-avoid text-sm"
                    >
                        {row.parts.map((part, partIndex) => {
                            const partLabel = `(${part.key.toLowerCase()})`;
                            const questionContent = (
                                <QuestionContent
                                    as="span"
                                    inline
                                    value={part.question.text || ' '}
                                />
                            );

                            if (partIndex === 0) {
                                return (
                                    <div
                                        key={`${rowIndex}-${part.key}`}
                                        className="flex break-inside-avoid items-start gap-1"
                                    >
                                        <div className="min-w-0 flex-1">
                                            {headingNumber !== null && (
                                                <span className="font-semibold">
                                                    Q.{headingNumber}:-{' '}
                                                </span>
                                            )}
                                            <span className="font-semibold">
                                                {partLabel}{' '}
                                            </span>
                                            {questionContent}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={`${rowIndex}-${part.key}`}
                                    className="flex break-inside-avoid items-start gap-1"
                                >
                                    <span className="shrink-0 font-semibold">
                                        {partLabel}
                                    </span>
                                    {questionContent}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </section>
    );
}

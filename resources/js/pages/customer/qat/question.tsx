import { QuestionContent } from '@/pages/customer/papers/paper-layouts/questions/question-content';

export type QatQuestion = {
    id: number;
    chapter_id: number;
    chapter_name: string;
    question_type_id: number;
    type_name: string;
    is_objective: boolean;
    schema_key: string;
    statement_en: string;
    statement_ur: string;
    description_en: string;
    description_ur: string;
    content: Record<string, unknown>;
    options: Record<string, unknown>[];
    marks?: number;
};

function field(data: Record<string, unknown>, key: string): string {
    return typeof data[key] === 'string' ? (data[key] as string) : '';
}

function records(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value)
        ? value.filter(
              (item): item is Record<string, unknown> =>
                  item !== null && typeof item === 'object',
          )
        : [];
}

function LocalizedText({ en, ur }: { en?: string; ur?: string }) {
    if (!en && !ur) {
        return null;
    }

    return (
        <div className="space-y-1">
            {en && <QuestionContent value={en} />}
            {ur && (
                <div dir="rtl" lang="ur" className="text-right">
                    <QuestionContent value={ur} />
                </div>
            )}
        </div>
    );
}

export function QatQuestionContent({ question }: { question: QatQuestion }) {
    const content = question.content ?? {};
    const promptEn = field(content, 'prompt_en');
    const promptUr = field(content, 'prompt_ur');
    const introEn = field(content, 'intro_en');
    const introUr = field(content, 'intro_ur');
    const passageEn = field(content, 'passage_en');
    const passageUr = field(content, 'passage_ur');
    const options = question.options.length
        ? question.options
        : records(content.options);
    const items = records(content.items);
    const pairs = records(content.pairs);

    return (
        <div className="space-y-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            <LocalizedText
                en={question.statement_en || promptEn || introEn}
                ur={question.statement_ur || promptUr || introUr}
            />
            {(question.statement_en || question.statement_ur) &&
                (promptEn || promptUr) && (
                    <LocalizedText en={promptEn} ur={promptUr} />
                )}
            {(passageEn || passageUr) && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <LocalizedText en={passageEn} ur={passageUr} />
                </div>
            )}
            <LocalizedText
                en={field(content, 'shared_en') || question.description_en}
                ur={field(content, 'shared_ur') || question.description_ur}
            />
            {options.length > 0 && (
                <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                    {options.map((option, index) => (
                        <div key={index} className="flex gap-2">
                            <span className="font-semibold">
                                {String.fromCharCode(65 + index)}.
                            </span>
                            <LocalizedText
                                en={
                                    field(option, 'text_en') ||
                                    field(option, 'text')
                                }
                                ur={field(option, 'text_ur')}
                            />
                        </div>
                    ))}
                </div>
            )}
            {items.length > 0 && (
                <ol className="list-[lower-alpha] space-y-2 pl-5">
                    {items.map((item, index) => (
                        <li key={index}>
                            <LocalizedText
                                en={
                                    field(item, 'prompt_en') ||
                                    field(item, 'statement_en')
                                }
                                ur={
                                    field(item, 'prompt_ur') ||
                                    field(item, 'statement_ur')
                                }
                            />
                            {records(item.options).length > 0 && (
                                <div className="mt-1 grid gap-1 sm:grid-cols-2">
                                    {records(item.options).map(
                                        (option, optionIndex) => (
                                            <div
                                                key={optionIndex}
                                                className="flex gap-2"
                                            >
                                                <span>
                                                    {String.fromCharCode(
                                                        65 + optionIndex,
                                                    )}
                                                    .
                                                </span>
                                                <LocalizedText
                                                    en={field(
                                                        option,
                                                        'text_en',
                                                    )}
                                                    ur={field(
                                                        option,
                                                        'text_ur',
                                                    )}
                                                />
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ol>
            )}
            {pairs.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <strong className="text-xs">Column A</strong>
                        {pairs.map((pair, index) => (
                            <div key={index} className="flex gap-2">
                                <span>{index + 1}.</span>
                                <LocalizedText
                                    en={field(pair, 'left_en')}
                                    ur={field(pair, 'left_ur')}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="space-y-2">
                        <strong className="text-xs">Column B</strong>
                        {pairs.map((_, index) => {
                            const pair = pairs[(index + 1) % pairs.length];

                            return (
                                <div key={index} className="flex gap-2">
                                    <span>
                                        {String.fromCharCode(65 + index)}.
                                    </span>
                                    <LocalizedText
                                        en={field(pair, 'right_en')}
                                        ur={field(pair, 'right_ur')}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {question.schema_key === 'objective_true_false' && (
                <p className="text-xs text-slate-500">True / False</p>
            )}
        </div>
    );
}

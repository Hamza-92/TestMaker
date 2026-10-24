import { QuestionContent } from '@/pages/customer/papers/paper-layouts/questions/question-content';

export type QatQuestion = {
    id: number;
    chapter_id: number;
    chapter_name: string;
    topic_name?: string | null;
    source_label?: string | null;
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

function sameText(first: string, second: string): boolean {
    const normalize = (value: string) =>
        value
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    return normalize(first) === normalize(second);
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

export function QatQuestionStatement({ question }: { question: QatQuestion }) {
    const content = question.content ?? {};
    const firstItem = records(content.items)[0] ?? {};
    const en =
        question.statement_en ||
        field(content, 'prompt_en') ||
        field(content, 'intro_en') ||
        field(content, 'passage_en') ||
        field(firstItem, 'prompt_en');
    const ur =
        question.statement_ur ||
        field(content, 'prompt_ur') ||
        field(content, 'intro_ur') ||
        field(content, 'passage_ur') ||
        field(firstItem, 'prompt_ur');

    return (
        <div
            className={`${en && ur ? 'grid grid-cols-2 gap-4' : ''} text-sm leading-relaxed text-slate-800 dark:text-slate-200`}
        >
            {en && (
                <div className="min-w-0" lang="en">
                    <QuestionContent value={en} />
                </div>
            )}
            {ur && (
                <div className="min-w-0 text-right" dir="rtl" lang="ur">
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
    const primaryEn = question.statement_en || promptEn || introEn;
    const primaryUr = question.statement_ur || promptUr || introUr;
    const secondaryEn =
        promptEn && !sameText(primaryEn, promptEn) ? promptEn : '';
    const secondaryUr =
        promptUr && !sameText(primaryUr, promptUr) ? promptUr : '';
    const detailEn = field(content, 'shared_en') || question.description_en;
    const detailUr = field(content, 'shared_ur') || question.description_ur;

    return (
        <div className="space-y-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            <LocalizedText en={primaryEn} ur={primaryUr} />
            {(secondaryEn || secondaryUr) && (
                <LocalizedText en={secondaryEn} ur={secondaryUr} />
            )}
            {(passageEn || passageUr) && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <LocalizedText en={passageEn} ur={passageUr} />
                </div>
            )}
            <LocalizedText
                en={sameText(detailEn, primaryEn) ? '' : detailEn}
                ur={sameText(detailUr, primaryUr) ? '' : detailUr}
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

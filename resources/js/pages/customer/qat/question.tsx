import { useMemo } from 'react';
import { QuestionContent } from '@/pages/customer/papers/paper-layouts/questions/question-content';
import { questionTextToHtml } from '@/pages/customer/papers/paper-layouts/questions/question-html';

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

const LATEX_DELIMITERS =
    /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g;

function renderDelimitedLatex(value: string): string {
    if (typeof DOMParser === 'undefined' || !LATEX_DELIMITERS.test(value)) {
        LATEX_DELIMITERS.lastIndex = 0;

        return value;
    }

    LATEX_DELIMITERS.lastIndex = 0;
    const doc = new DOMParser().parseFromString(
        `<div>${questionTextToHtml(value)}</div>`,
        'text/html',
    );
    const root = doc.body.firstElementChild;

    if (!root) {
        return value;
    }

    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node: Node | null;

    while ((node = walker.nextNode())) {
        if (!node.parentElement?.closest('code, pre, .tm-equation, .katex')) {
            textNodes.push(node as Text);
        }
    }

    textNodes.forEach((textNode) => {
        const source = textNode.textContent ?? '';
        const matches = [...source.matchAll(LATEX_DELIMITERS)];

        if (!matches.length) {
            return;
        }

        const fragment = doc.createDocumentFragment();
        let offset = 0;

        matches.forEach((match) => {
            const start = match.index ?? offset;

            fragment.append(doc.createTextNode(source.slice(offset, start)));
            const equation = doc.createElement('span');
            const latex = match[1] ?? match[2] ?? match[3] ?? match[4] ?? '';
            const isBlock = match[1] !== undefined || match[2] !== undefined;

            equation.className = isBlock
                ? 'tm-equation tm-equation-block'
                : 'tm-equation';
            equation.dataset.latex = latex;
            equation.dataset.display = isBlock ? 'block' : 'inline';
            equation.textContent = latex;
            fragment.append(equation);
            offset = start + match[0].length;
        });

        fragment.append(doc.createTextNode(source.slice(offset)));
        textNode.replaceWith(fragment);
    });

    return root.innerHTML;
}

function QatRichText({ value }: { value: string }) {
    const content = useMemo(() => renderDelimitedLatex(value), [value]);

    return <QuestionContent value={content} />;
}

function ObjectiveOptions({
    options,
    direction,
    medium,
}: {
    options: Record<string, unknown>[];
    direction: 'ltr' | 'rtl';
    medium: 'english' | 'urdu' | 'both';
}) {
    return (
        <table
            role="presentation"
            dir={direction}
            className="qat-objective-options w-full table-fixed border-collapse text-xs"
        >
            <tbody>
                <tr>
                    {options.map((option, index) => {
                        const en =
                            field(option, 'text_en') || field(option, 'text');
                        const ur = field(option, 'text_ur');

                        return (
                            <td
                                key={index}
                                className="min-w-0 border border-slate-700 px-1 py-1 align-middle"
                            >
                                <div className="flex items-start gap-1">
                                    <span className="shrink-0 rounded-full border border-slate-700 px-1 font-bold leading-4">
                                        {String.fromCharCode(65 + index)}
                                    </span>
                                    <div className="min-w-0 flex-1 break-words">
                                        {en && medium !== 'urdu' && (
                                            <div dir="ltr" lang="en">
                                                <QatRichText value={en} />
                                            </div>
                                        )}
                                        {ur && medium !== 'english' && (
                                            <div
                                                dir="rtl"
                                                lang="ur"
                                                className="text-right"
                                            >
                                                <QatRichText value={ur} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>
                        );
                    })}
                </tr>
            </tbody>
        </table>
    );
}

function ObjectiveLine({
    number,
    en,
    ur,
    options,
}: {
    number: string;
    en: string;
    ur: string;
    options: Record<string, unknown>[];
}) {
    const bilingual = Boolean(en && ur);
    const direction = ur && !en ? 'rtl' : 'ltr';
    const medium = bilingual ? 'both' : ur ? 'urdu' : 'english';
    const numberLabel = <span className="shrink-0 font-bold">{number}.</span>;
    const statement = (
        <div
            className={bilingual ? 'grid min-w-0 grid-cols-2 gap-3' : 'min-w-0'}
        >
            {en && (
                <div dir="ltr" lang="en" className="min-w-0 text-left">
                    <QatRichText value={en} />
                </div>
            )}
            {ur && (
                <div dir="rtl" lang="ur" className="min-w-0 text-right">
                    <QatRichText value={ur} />
                </div>
            )}
        </div>
    );

    if (!en && !ur && options.length) {
        return (
            <div className="flex items-start gap-2">
                {numberLabel}
                <ObjectiveOptions
                    options={options}
                    direction="ltr"
                    medium="both"
                />
            </div>
        );
    }

    if (bilingual || !options.length) {
        return (
            <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                    {numberLabel}
                    <div className="min-w-0 flex-1">{statement}</div>
                </div>
                {options.length > 0 && (
                    <ObjectiveOptions
                        options={options}
                        direction="ltr"
                        medium={medium}
                    />
                )}
            </div>
        );
    }

    return (
        <div
            dir={direction}
            className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1.5fr)] items-start gap-2"
        >
            {numberLabel}
            {statement}
            <ObjectiveOptions
                options={options}
                direction={direction}
                medium={medium}
            />
        </div>
    );
}

export function QatObjectiveQuestion({
    question,
    number,
}: {
    question: QatQuestion;
    number: number;
}) {
    const content = question.content ?? {};
    const items = records(content.items);
    const options = question.options.length
        ? question.options
        : records(content.options);
    const trueFalseOptions =
        question.schema_key === 'objective_true_false'
            ? [
                  { text_en: 'True', text_ur: 'درست' },
                  { text_en: 'False', text_ur: 'غلط' },
              ]
            : [];
    const primaryEn =
        question.statement_en ||
        field(content, 'prompt_en') ||
        field(content, 'intro_en') ||
        field(content, 'passage_en');
    const primaryUr =
        question.statement_ur ||
        field(content, 'prompt_ur') ||
        field(content, 'intro_ur') ||
        field(content, 'passage_ur');
    const passageEn = field(content, 'passage_en');
    const passageUr = field(content, 'passage_ur');
    const extraPassageEn = sameText(passageEn, primaryEn) ? '' : passageEn;
    const extraPassageUr = sameText(passageUr, primaryUr) ? '' : passageUr;
    const detailEn = field(content, 'shared_en') || question.description_en;
    const detailUr = field(content, 'shared_ur') || question.description_ur;
    const extraDetailEn = sameText(detailEn, primaryEn) ? '' : detailEn;
    const extraDetailUr = sameText(detailUr, primaryUr) ? '' : detailUr;

    return (
        <div className="qat-objective-question space-y-2 text-sm leading-relaxed">
            <ObjectiveLine
                number={String(number)}
                en={primaryEn}
                ur={primaryUr}
                options={options.length ? options : trueFalseOptions}
            />
            {(extraPassageEn ||
                extraPassageUr ||
                extraDetailEn ||
                extraDetailUr) && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                    <div dir="ltr" lang="en">
                        {extraPassageEn && (
                            <QatRichText value={extraPassageEn} />
                        )}
                        {extraDetailEn && <QatRichText value={extraDetailEn} />}
                    </div>
                    <div dir="rtl" lang="ur" className="text-right">
                        {extraPassageUr && (
                            <QatRichText value={extraPassageUr} />
                        )}
                        {extraDetailUr && <QatRichText value={extraDetailUr} />}
                    </div>
                </div>
            )}
            {items.map((item, index) => (
                <ObjectiveLine
                    key={index}
                    number={`${number}.${String.fromCharCode(97 + index)}`}
                    en={field(item, 'prompt_en') || field(item, 'statement_en')}
                    ur={field(item, 'prompt_ur') || field(item, 'statement_ur')}
                    options={records(item.options)}
                />
            ))}
        </div>
    );
}

function LocalizedText({ en, ur }: { en?: string; ur?: string }) {
    if (!en && !ur) {
        return null;
    }

    return (
        <div className="space-y-1">
            {en && <QatRichText value={en} />}
            {ur && (
                <div dir="rtl" lang="ur" className="text-right">
                    <QatRichText value={ur} />
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
                    <QatRichText value={en} />
                </div>
            )}
            {ur && (
                <div className="min-w-0 text-right" dir="rtl" lang="ur">
                    <QatRichText value={ur} />
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

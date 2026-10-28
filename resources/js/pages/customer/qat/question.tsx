import { Fragment, useMemo } from 'react';
import {
    bilingualPartsHaveSameVisibleText,
    containsUrduScript,
} from '@/pages/customer/papers/paper-layouts/questions/bilingual-question-row';
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

function normalizeMathDescription(value: string): string {
    return value
        .replace(/[\u0660-\u0669]/g, (digit) =>
            String(digit.charCodeAt(0) - 0x0660),
        )
        .replace(/[\u06f0-\u06f9]/g, (digit) =>
            String(digit.charCodeAt(0) - 0x06f0),
        )
        .replace(/[\u060c\uff0c]/g, ',');
}

function reversedNumericProduct(first: string, second: string): boolean {
    const factors = (value: string) => {
        let visible = value;

        if (typeof document !== 'undefined') {
            const element = document.createElement('div');
            element.innerHTML = value;
            visible = element.textContent ?? '';
        }

        const parts = normalizeMathDescription(visible)
            .normalize('NFKC')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&(?:amp;)?(?:nbsp|#160);/gi, ' ')
            .replace(/&(?:amp;)?(?:times|#215|#xD7);/gi, '×')
            .replace(/[\u200b-\u200f\u2066-\u2069\ufeff\s]/g, '')
            .split('×');

        return parts.length > 1 && parts.every((part) => /^\d+$/.test(part))
            ? parts
            : null;
    };
    const englishFactors = factors(first);
    const urduFactors = factors(second);

    return Boolean(
        englishFactors &&
        urduFactors &&
        englishFactors.length === urduFactors.length &&
        englishFactors.every(
            (factor, index) =>
                factor === urduFactors[urduFactors.length - index - 1],
        ),
    );
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

function QatRichText({
    value,
    inline = false,
}: {
    value: string;
    inline?: boolean;
}) {
    const content = useMemo(() => renderDelimitedLatex(value), [value]);

    return <QuestionContent value={content} inline={inline} />;
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
            className="qat-objective-options w-full table-fixed border-collapse"
        >
            <tbody>
                <tr>
                    {options.map((option, index) => {
                        const en =
                            field(option, 'text_en') || field(option, 'text');
                        const ur = field(option, 'text_ur');
                        const sharedOption =
                            medium === 'both' &&
                            en &&
                            ur &&
                            (bilingualPartsHaveSameVisibleText({
                                english: normalizeMathDescription(en),
                                urdu: normalizeMathDescription(ur),
                            }) ||
                                reversedNumericProduct(en, ur)) &&
                            (!/<(?:img|svg|math|iframe|video)\b/i.test(
                                `${en}${ur}`,
                            ) ||
                                en.trim() === ur.trim());
                        const sharedOptionIsUrdu =
                            sharedOption && containsUrduScript(en);

                        return (
                            <Fragment key={index}>
                                <td className="w-[4%] border border-slate-700 px-0.5 py-1 text-center align-middle">
                                    <span
                                        className="inline-grid size-[1.45em] place-items-center rounded-full border border-slate-700 align-middle text-[0.9em] font-bold leading-none"
                                        style={{
                                            fontFamily: 'Arial, sans-serif',
                                        }}
                                    >
                                        <span className="translate-y-[0.08em]">
                                            {String.fromCharCode(65 + index)}
                                        </span>
                                    </span>
                                </td>
                                <td className="w-[21%] min-w-0 border border-slate-700 px-1 py-1 align-middle">
                                    <div
                                        className={`flex min-w-0 flex-wrap items-baseline gap-x-1 break-words ${sharedOptionIsUrdu ? 'justify-end' : 'justify-between'}`}
                                    >
                                        {en && medium !== 'urdu' && (
                                            <div
                                                dir={
                                                    sharedOptionIsUrdu
                                                        ? 'rtl'
                                                        : 'ltr'
                                                }
                                                lang={
                                                    sharedOptionIsUrdu
                                                        ? 'ur'
                                                        : 'en'
                                                }
                                                className={`w-max max-w-full shrink-0 ${sharedOptionIsUrdu ? 'text-right' : 'text-left'}`}
                                            >
                                                <QatRichText
                                                    value={en}
                                                    inline
                                                />
                                            </div>
                                        )}
                                        {ur &&
                                            medium !== 'english' &&
                                            !sharedOption && (
                                                <div
                                                    dir="rtl"
                                                    lang="ur"
                                                    className="w-max max-w-full shrink-0 text-right"
                                                >
                                                    <QatRichText
                                                        value={ur}
                                                        inline
                                                    />
                                                </div>
                                            )}
                                    </div>
                                </td>
                            </Fragment>
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
    const englishStatement = en && (
        <div
            dir="ltr"
            lang="en"
            className="flex min-w-0 items-start gap-1.5 text-left"
        >
            <span className="qat-question-number shrink-0 font-bold">
                {number}.
            </span>
            <div className="min-w-0 flex-1">
                <QatRichText value={en} />
            </div>
        </div>
    );
    const urduStatement = ur && (
        <div
            dir="rtl"
            lang="ur"
            className="flex min-w-0 items-start gap-1.5 text-right"
        >
            <span dir="ltr" className="qat-question-number shrink-0 font-bold">
                {number}.
            </span>
            <div className="min-w-0 flex-1">
                <QatRichText value={ur} />
            </div>
        </div>
    );

    if (!en && !ur && options.length) {
        return (
            <div className="flex items-start gap-2">
                <span className="qat-question-number shrink-0 font-bold">
                    {number}.
                </span>
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
                <div className={bilingual ? 'grid grid-cols-2 gap-3' : ''}>
                    {englishStatement}
                    {urduStatement}
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
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] items-start gap-2"
        >
            {englishStatement || urduStatement}
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
        <div className="qat-objective-question space-y-2">
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

function LocalizedText({
    en,
    ur,
    number,
    sideBySide = false,
    shared,
}: {
    en?: string;
    ur?: string;
    number?: string;
    sideBySide?: boolean;
    shared?: string;
}) {
    if (!en && !ur && !shared) {
        return null;
    }

    return (
        <div
            className={
                shared
                    ? 'grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-3'
                    : sideBySide && en && ur
                      ? 'grid min-w-0 flex-1 grid-cols-2 gap-3'
                      : 'min-w-0 flex-1 space-y-1'
            }
        >
            {en && (
                <div
                    dir="ltr"
                    lang="en"
                    className="flex min-w-0 items-start gap-1.5 text-left"
                >
                    {number !== undefined && (
                        <span className="qat-question-number shrink-0 font-semibold">
                            {number}.
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <QatRichText value={en} />
                    </div>
                </div>
            )}
            {shared && !en && <div />}
            {shared && (
                <div
                    dir="auto"
                    lang={containsUrduScript(shared) ? 'ur' : 'en'}
                    className="min-w-0 max-w-[18rem] text-center"
                >
                    <QatRichText value={shared} inline />
                </div>
            )}
            {ur && (
                <div
                    dir="rtl"
                    lang="ur"
                    className="flex min-w-0 items-start gap-1.5 text-right"
                >
                    {number !== undefined && (
                        <span
                            dir="ltr"
                            className="qat-question-number shrink-0 font-semibold"
                        >
                            {number}.
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <QatRichText value={ur} />
                    </div>
                </div>
            )}
            {shared && !ur && <div />}
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

export function QatQuestionContent({
    question,
    number,
}: {
    question: QatQuestion;
    number: string;
}) {
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
    const singleItem = items.length === 1 ? (items[0] ?? null) : null;
    const promoteSingleItem =
        singleItem !== null &&
        sameText(primaryEn, '') &&
        sameText(primaryUr, '') &&
        records(singleItem.options).length === 0;
    const statementEn = promoteSingleItem
        ? field(singleItem, 'prompt_en') || field(singleItem, 'statement_en')
        : primaryEn;
    const statementUr = promoteSingleItem
        ? field(singleItem, 'prompt_ur') || field(singleItem, 'statement_ur')
        : primaryUr;
    const secondaryEn =
        promptEn && !sameText(primaryEn, promptEn) ? promptEn : '';
    const secondaryUr =
        promptUr && !sameText(primaryUr, promptUr) ? promptUr : '';
    const detailEn = field(content, 'shared_en') || question.description_en;
    const detailUr = field(content, 'shared_ur') || question.description_ur;
    const visibleDetailEn = sameText(detailEn, statementEn) ? '' : detailEn;
    const visibleDetailUr = sameText(detailUr, statementUr) ? '' : detailUr;
    const hasSharedStatement =
        question.schema_key === 'subjective_same_statement' ||
        'shared_en' in content ||
        'shared_ur' in content;
    const sharedDescription =
        (visibleDetailEn || visibleDetailUr) &&
        (hasSharedStatement ||
            !visibleDetailEn ||
            !visibleDetailUr ||
            bilingualPartsHaveSameVisibleText({
                english: normalizeMathDescription(visibleDetailEn),
                urdu: normalizeMathDescription(visibleDetailUr),
            }) ||
            visibleDetailEn.trim() === visibleDetailUr.trim())
            ? visibleDetailEn || visibleDetailUr
            : '';

    return (
        <div className="space-y-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            <LocalizedText
                en={statementEn}
                ur={statementUr}
                number={number}
                sideBySide
                shared={sharedDescription}
            />
            {!statementEn && !statementUr && (
                <span className="qat-question-number font-semibold">
                    {number}.
                </span>
            )}
            {(secondaryEn || secondaryUr) && (
                <LocalizedText en={secondaryEn} ur={secondaryUr} sideBySide />
            )}
            {(passageEn || passageUr) && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <LocalizedText en={passageEn} ur={passageUr} sideBySide />
                </div>
            )}
            {!sharedDescription && (
                <LocalizedText
                    en={visibleDetailEn}
                    ur={visibleDetailUr}
                    sideBySide
                />
            )}
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
            {items.length > 0 && !promoteSingleItem && (
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
                                sideBySide
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

import type { GeneratedPaper, GeneratedPaperQuestion, GeneratedPaperSection } from './types';

export const SET_LABELS = ['A', 'B', 'C'] as const;
export type SetLabel = (typeof SET_LABELS)[number];

export function setLabelFor(index: number): SetLabel {
    return SET_LABELS[index % SET_LABELS.length];
}

function seedFromString(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function mulberry32(seed: number): () => number {
    let state = seed >>> 0;
    return function next(): number {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffleWith<T>(items: readonly T[], random: () => number): T[] {
    const clone = items.slice();
    for (let i = clone.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [clone[i], clone[j]] = [clone[j], clone[i]];
    }
    return clone;
}

export function variantForSet(paper: GeneratedPaper, setIndex: number): GeneratedPaper {
    if (setIndex <= 0) {
        return paper;
    }

    const random = mulberry32(seedFromString(`set:${setIndex}`));

    const sections: GeneratedPaperSection[] = paper.sections.map((section) => {
        const shuffledQuestions = shuffleWith(section.questions, random).map(
            (question): GeneratedPaperQuestion => ({
                ...question,
                options: question.options.length > 0
                    ? shuffleWith(question.options, random)
                    : question.options,
                passageQuestions: question.passageQuestions
                    ? shuffleWith(question.passageQuestions, random).map(
                          (passageQuestion) => ({
                              ...passageQuestion,
                              options: passageQuestion.options.length > 0
                                  ? shuffleWith(
                                        passageQuestion.options,
                                        random,
                                    )
                                  : passageQuestion.options,
                          }),
                      )
                    : question.passageQuestions,
            }),
        );

        return {
            ...section,
            questions: shuffledQuestions,
        };
    });

    return { ...paper, sections };
}

export function optionLetter(index: number): string {
    return String.fromCharCode(65 + (index % 26));
}

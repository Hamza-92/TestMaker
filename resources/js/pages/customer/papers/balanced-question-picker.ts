export interface BalancedQuestionCandidate {
    id: number;
    chapter: {
        id: number;
    };
    topic: {
        id: number;
    } | null;
}

export interface BalancedQuestionSelectionState {
    chapterCounts: Map<number, number>;
    topicCounts: Map<string, number>;
}

export function createBalancedQuestionSelectionState(): BalancedQuestionSelectionState {
    return {
        chapterCounts: new Map(),
        topicCounts: new Map(),
    };
}

function topicKey(question: BalancedQuestionCandidate): string {
    return `${question.chapter.id}:${question.topic?.id ?? 'chapter'}`;
}

export function recordBalancedQuestion(
    state: BalancedQuestionSelectionState,
    question: BalancedQuestionCandidate,
): void {
    state.chapterCounts.set(
        question.chapter.id,
        (state.chapterCounts.get(question.chapter.id) ?? 0) + 1,
    );

    const key = topicKey(question);
    state.topicCounts.set(key, (state.topicCounts.get(key) ?? 0) + 1);
}

function randomItem<T>(items: readonly T[], random: () => number): T {
    const randomIndex = Math.min(
        items.length - 1,
        Math.max(0, Math.floor(random() * items.length)),
    );

    return items[randomIndex];
}

/**
 * Picks from the least-used available chapter, then from its least-used
 * available topic. Exhausted scopes naturally drop out and their share is
 * redistributed among the scopes that still contain eligible questions.
 */
export function pickBalancedQuestions<T extends BalancedQuestionCandidate>(
    questions: readonly T[],
    target: number,
    state: BalancedQuestionSelectionState = createBalancedQuestionSelectionState(),
    random: () => number = Math.random,
): T[] {
    const remaining = [...questions];
    const picked: T[] = [];
    const normalizedTarget = Number.isFinite(target)
        ? Math.max(0, Math.floor(target))
        : 0;
    const limit = Math.min(normalizedTarget, remaining.length);

    while (picked.length < limit && remaining.length > 0) {
        const availableChapterIds = Array.from(
            new Set(remaining.map((question) => question.chapter.id)),
        );
        const lowestChapterCount = Math.min(
            ...availableChapterIds.map(
                (chapterId) => state.chapterCounts.get(chapterId) ?? 0,
            ),
        );
        const chapterId = randomItem(
            availableChapterIds.filter(
                (candidate) =>
                    (state.chapterCounts.get(candidate) ?? 0) ===
                    lowestChapterCount,
            ),
            random,
        );
        const chapterQuestions = remaining.filter(
            (question) => question.chapter.id === chapterId,
        );
        const availableTopicKeys = Array.from(
            new Set(chapterQuestions.map((question) => topicKey(question))),
        );
        const lowestTopicCount = Math.min(
            ...availableTopicKeys.map((key) => state.topicCounts.get(key) ?? 0),
        );
        const selectedTopicKey = randomItem(
            availableTopicKeys.filter(
                (key) => (state.topicCounts.get(key) ?? 0) === lowestTopicCount,
            ),
            random,
        );
        const question = randomItem(
            chapterQuestions.filter(
                (candidate) => topicKey(candidate) === selectedTopicKey,
            ),
            random,
        );

        picked.push(question);
        recordBalancedQuestion(state, question);

        const questionIndex = remaining.findIndex(
            (candidate) => candidate.id === question.id,
        );

        if (questionIndex >= 0) {
            remaining.splice(questionIndex, 1);
        }
    }

    return picked;
}

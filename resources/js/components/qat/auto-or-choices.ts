export type AutoOrGroup = {
    type_ids: number[];
    random_pick: boolean;
};

export type AutoOrChoice = {
    question_type_id: number;
    variants: number[][];
};

type Capacities = Map<number, number>;

export function canUseOrChoices(
    choices: number[][] | undefined,
    capacities: Capacities,
    variants: number,
) {
    if (choices?.length !== variants) {
        return false;
    }

    const remaining = new Map(capacities);

    return choices.every((types) => {
        if (types.length === 0 || new Set(types).size !== types.length) {
            return false;
        }

        return types.every((type) => {
            const capacity = remaining.get(type) ?? 0;
            remaining.set(type, capacity - 1);

            return capacity > 0;
        });
    });
}

export function defaultOrChoices(
    group: AutoOrGroup,
    capacities: Capacities,
    variants: number,
    seed: number,
): number[][] {
    if (!group.random_pick) {
        const fixed = Array.from({ length: variants }, () => group.type_ids);

        return canUseOrChoices(fixed, capacities, variants) ? fixed : [];
    }

    const remaining = new Map(capacities);
    const choices: number[][] = [];
    let state = seed >>> 0;
    const choose = (size: number) => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

        return Math.floor((state / 4294967296) * size);
    };

    for (let variant = 0; variant < variants; variant++) {
        const eligible = group.type_ids.filter(
            (id) => (remaining.get(id) ?? 0) > 0,
        );
        const capacity = eligible.reduce(
            (total, id) => total + (remaining.get(id) ?? 0),
            0,
        );
        const maximum = Math.min(
            eligible.length,
            capacity - (variants - variant - 1),
        );

        if (maximum < 1) {
            return [];
        }

        const selected = new Set<number>();
        const count = choose(maximum) + 1;

        for (let index = 0; index < count; index++) {
            const [id] = eligible.splice(choose(eligible.length), 1);
            selected.add(id);
            remaining.set(id, (remaining.get(id) ?? 0) - 1);
        }

        choices.push(group.type_ids.filter((id) => selected.has(id)));
    }

    return choices;
}

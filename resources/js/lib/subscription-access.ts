export interface AccessPattern {
    id: number;
    name: string;
    short_name: string;
}

export interface AccessClass {
    id: number;
    name: string;
}

export interface AccessSubject {
    id: number;
    name_eng: string;
    name_ur: string;
}

export interface AccessScopeClassRule {
    subjects: number[] | null;
}

export interface AccessScopePatternRule {
    classes: Record<string, AccessScopeClassRule>;
}

export type SubscriptionAccessScope = Record<string, AccessScopePatternRule>;
export type PatternClassMap = Record<string, number[]>;
export type ClassSubjectMap = Record<string, number[]>;

export function sortIds(ids: number[]): number[] {
    return [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))].sort((a, b) => a - b);
}

export function getAvailableClassIds(patternId: number, patternClassMap: PatternClassMap): number[] {
    return sortIds(patternClassMap[String(patternId)] ?? []);
}

export function getAvailableSubjectIds(patternId: number, classId: number, classSubjectMap: ClassSubjectMap): number[] {
    return sortIds(classSubjectMap[`${patternId}:${classId}`] ?? []);
}

export function getSelectedClassIds(scope: SubscriptionAccessScope | null, patternId: number): number[] {
    if (!scope) {
        return [];
    }

    return sortIds(Object.keys(scope[String(patternId)]?.classes ?? {}).map(Number));
}

export function getSelectedSubjectIds(
    scope: SubscriptionAccessScope | null,
    patternId: number,
    classId: number,
    classSubjectMap: ClassSubjectMap,
): number[] {
    if (!scope) {
        return [];
    }

    const classRule = scope[String(patternId)]?.classes?.[String(classId)];
    const availableSubjectIds = getAvailableSubjectIds(patternId, classId, classSubjectMap);

    if (!classRule) {
        return [];
    }

    return classRule.subjects === null ? availableSubjectIds : sortIds(classRule.subjects);
}

export function summarizeScope(
    scope: SubscriptionAccessScope | null,
    patternClassMap: PatternClassMap,
    classSubjectMap: ClassSubjectMap,
) {
    if (scope === null) {
        return {
            patternCount: null,
            classCount: null,
            subjectCount: null,
        };
    }

    const patternIds = sortIds(Object.keys(scope).map(Number));
    const classIds = new Set<number>();
    const subjectIds = new Set<number>();

    patternIds.forEach((patternId) => {
        const selectedClassIds = getSelectedClassIds(scope, patternId);
        selectedClassIds.forEach((classId) => {
            classIds.add(classId);

            getSelectedSubjectIds(scope, patternId, classId, classSubjectMap).forEach((subjectId) => {
                subjectIds.add(subjectId);
            });
        });
    });

    return {
        patternCount: patternIds.length,
        classCount: classIds.size,
        subjectCount: subjectIds.size,
    };
}

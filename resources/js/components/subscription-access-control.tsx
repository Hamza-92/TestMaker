import { BookOpenIcon, ChevronDownIcon, GraduationCapIcon, LayoutGridIcon, LockIcon } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    getAvailableClassIds,
    getAvailableSubjectIds,
    getSelectedClassIds,
    getSelectedSubjectIds,
    sortIds,
    summarizeScope,
} from '@/lib/subscription-access';
import type {
    AccessClass,
    AccessPattern,
    AccessSubject,
    ClassSubjectMap,
    PatternClassMap,
    SubscriptionAccessScope,
} from '@/lib/subscription-access';
import { cn } from '@/lib/utils';

interface Props {
    patterns: AccessPattern[];
    classes: AccessClass[];
    subjects: AccessSubject[];
    patternClassMap: PatternClassMap;
    classSubjectMap: ClassSubjectMap;
    value: SubscriptionAccessScope | null;
    onChange: (value: SubscriptionAccessScope | null) => void;
    error?: string;
}

export function HierarchicalAccessControl({
    patterns,
    classes,
    subjects,
    patternClassMap,
    classSubjectMap,
    value,
    onChange,
    error,
}: Props) {
    const [openPatterns, setOpenPatterns] = useState<Record<string, boolean>>({});
    const [openClasses, setOpenClasses] = useState<Record<string, boolean>>({});

    const classLookup = Object.fromEntries(classes.map((schoolClass) => [schoolClass.id, schoolClass]));
    const subjectLookup = Object.fromEntries(subjects.map((subject) => [subject.id, subject]));

    const totalClassCount = new Set(Object.values(patternClassMap).flat()).size;
    const totalSubjectCount = new Set(Object.values(classSubjectMap).flat()).size;
    const summary = summarizeScope(value, patternClassMap, classSubjectMap);

    function cloneScope(scope: SubscriptionAccessScope): SubscriptionAccessScope {
        return Object.fromEntries(
            Object.entries(scope).map(([patternId, patternRule]) => [
                patternId,
                {
                    classes: Object.fromEntries(
                        Object.entries(patternRule.classes).map(([classId, classRule]) => [
                            classId,
                            { subjects: classRule.subjects === null ? null : [...classRule.subjects] },
                        ]),
                    ),
                },
            ]),
        );
    }

    function buildClassRule(patternId: number, classId: number) {
        const availableSubjectIds = getAvailableSubjectIds(patternId, classId, classSubjectMap);

        return {
            subjects: availableSubjectIds.length === 0 ? [] : null,
        };
    }

    function buildPatternRule(patternId: number) {
        return {
            classes: Object.fromEntries(
                getAvailableClassIds(patternId, patternClassMap).map((classId) => [
                    String(classId),
                    buildClassRule(patternId, classId),
                ]),
            ),
        };
    }

    function buildFullScope(): SubscriptionAccessScope {
        return Object.fromEntries(
            patterns.map((pattern) => [
                String(pattern.id),
                buildPatternRule(pattern.id),
            ]),
        );
    }

    function arraysMatch(left: number[], right: number[]) {
        if (left.length !== right.length) {
            return false;
        }

        return left.every((item, index) => item === right[index]);
    }

    function isFullScope(scope: SubscriptionAccessScope) {
        if (Object.keys(scope).length !== patterns.length) {
            return false;
        }

        return patterns.every((pattern) => {
            const availableClassIds = getAvailableClassIds(pattern.id, patternClassMap);
            const selectedClassIds = getSelectedClassIds(scope, pattern.id);

            if (!arraysMatch(availableClassIds, selectedClassIds)) {
                return false;
            }

            return availableClassIds.every((classId) => {
                const availableSubjectIds = getAvailableSubjectIds(pattern.id, classId, classSubjectMap);
                const classRule = scope[String(pattern.id)]?.classes[String(classId)];

                if (!classRule) {
                    return false;
                }

                if (availableSubjectIds.length === 0 || classRule.subjects === null) {
                    return true;
                }

                return arraysMatch(sortIds(classRule.subjects), availableSubjectIds);
            });
        });
    }

    function commitScope(nextScope: SubscriptionAccessScope) {
        onChange(isFullScope(nextScope) ? null : nextScope);
    }

    function updateScope(mutator: (scope: SubscriptionAccessScope) => void) {
        const currentScope = value === null ? buildFullScope() : value;
        const nextScope = cloneScope(currentScope);
        mutator(nextScope);
        commitScope(nextScope);
    }

    function patternOpenKey(patternId: number) {
        return String(patternId);
    }

    function classOpenKey(patternId: number, classId: number) {
        return `${patternId}:${classId}`;
    }

    function isPatternOpen(patternId: number) {
        return openPatterns[patternOpenKey(patternId)] ?? false;
    }

    function isClassOpen(patternId: number, classId: number) {
        return openClasses[classOpenKey(patternId, classId)] ?? false;
    }

    function setPatternOpen(patternId: number, nextOpen: boolean) {
        setOpenPatterns((current) => ({
            ...current,
            [patternOpenKey(patternId)]: nextOpen,
        }));
    }

    function setClassOpen(patternId: number, classId: number, nextOpen: boolean) {
        setOpenClasses((current) => ({
            ...current,
            [classOpenKey(patternId, classId)]: nextOpen,
        }));
    }

    function handleFullAccessToggle(checked: boolean) {
        onChange(checked ? null : buildFullScope());
    }

    function handlePatternToggle(patternId: number, checked: boolean) {
        updateScope((scope) => {
            if (checked) {
                scope[String(patternId)] = buildPatternRule(patternId);

                return;
            }

            delete scope[String(patternId)];
        });

        if (checked) {
            setPatternOpen(patternId, true);
        }
    }

    function handlePatternSelectAllClasses(patternId: number, checked: boolean) {
        updateScope((scope) => {
            const patternRule = scope[String(patternId)];

            if (!patternRule) {
                return;
            }

            patternRule.classes = checked ? buildPatternRule(patternId).classes : {};
        });

        if (checked) {
            setPatternOpen(patternId, true);
        }
    }

    function handleClassToggle(patternId: number, classId: number, checked: boolean) {
        updateScope((scope) => {
            const patternRule = scope[String(patternId)];

            if (!patternRule) {
                return;
            }

            if (checked) {
                patternRule.classes[String(classId)] = buildClassRule(patternId, classId);

                return;
            }

            delete patternRule.classes[String(classId)];
        });

        if (checked) {
            setPatternOpen(patternId, true);
            setClassOpen(patternId, classId, true);
        }
    }

    function handleSubjectSelectAll(patternId: number, classId: number, checked: boolean) {
        updateScope((scope) => {
            const classRule = scope[String(patternId)]?.classes[String(classId)];

            if (!classRule) {
                return;
            }

            classRule.subjects = checked
                ? getAvailableSubjectIds(patternId, classId, classSubjectMap).length === 0
                    ? []
                    : null
                : [];
        });

        if (checked) {
            setPatternOpen(patternId, true);
            setClassOpen(patternId, classId, true);
        }
    }

    function handleSubjectToggle(patternId: number, classId: number, subjectId: number, checked: boolean) {
        updateScope((scope) => {
            const availableSubjectIds = getAvailableSubjectIds(patternId, classId, classSubjectMap);
            const classRule = scope[String(patternId)]?.classes[String(classId)];

            if (!classRule) {
                return;
            }

            const currentSubjectIds = classRule.subjects === null ? availableSubjectIds : sortIds(classRule.subjects);
            const nextSubjectIds = checked
                ? sortIds([...currentSubjectIds, subjectId])
                : currentSubjectIds.filter((currentId) => currentId !== subjectId);

            classRule.subjects = arraysMatch(nextSubjectIds, availableSubjectIds) ? null : nextSubjectIds;
        });
    }

    const effectiveScope = value ?? buildFullScope();

    return (
        <div className="space-y-4">
            <div className="rounded-xl border bg-card shadow-sm">
                <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                                <LockIcon className="size-4" />
                            </span>
                            <p className="text-sm font-semibold">Access Scope</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <SummaryBadge
                                icon={<BookOpenIcon className="size-3.5" />}
                                label="Patterns"
                                value={summary.patternCount}
                                total={patterns.length}
                            />
                            <SummaryBadge
                                icon={<GraduationCapIcon className="size-3.5" />}
                                label="Classes"
                                value={summary.classCount}
                                total={totalClassCount}
                            />
                            <SummaryBadge
                                icon={<LayoutGridIcon className="size-3.5" />}
                                label="Subjects"
                                value={summary.subjectCount}
                                total={totalSubjectCount}
                            />
                        </div>
                    </div>

                    <label className="bg-muted/40 flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3">
                        <Checkbox
                            checked={value === null}
                            onCheckedChange={(checked) => handleFullAccessToggle(checked === true)}
                        />
                        <span className="text-sm font-medium">Full access</span>
                    </label>
                </div>

                <div className="space-y-3 p-4">
                    {patterns.map((pattern) => {
                        const patternRule = effectiveScope[String(pattern.id)];
                        const patternSelected = Boolean(patternRule);
                        const patternIsOpen = isPatternOpen(pattern.id);
                        const availableClassIds = getAvailableClassIds(pattern.id, patternClassMap);
                        const selectedClassIds = getSelectedClassIds(effectiveScope, pattern.id);
                        const allClassesSelected =
                            availableClassIds.length > 0 && selectedClassIds.length === availableClassIds.length;

                        return (
                            <Collapsible
                                key={pattern.id}
                                open={patternIsOpen}
                                onOpenChange={(nextOpen) => setPatternOpen(pattern.id, nextOpen)}
                            >
                                <div
                                    className={cn(
                                        'rounded-xl border transition-colors',
                                        patternSelected ? 'border-primary/25 bg-card' : 'border-dashed bg-muted/10',
                                    )}
                                >
                                    <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                            <Checkbox
                                                checked={patternSelected}
                                                onCheckedChange={(checked) => handlePatternToggle(pattern.id, checked === true)}
                                            />

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="truncate text-sm font-semibold">{pattern.name}</p>
                                                    {pattern.short_name && (
                                                        <Badge variant="outline" className="text-[11px]">
                                                            {pattern.short_name}
                                                        </Badge>
                                                    )}
                                                    <Badge
                                                        variant="outline"
                                                        className="border-blue-200 bg-blue-50 text-[11px] text-blue-700"
                                                    >
                                                        {selectedClassIds.length} / {availableClassIds.length}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <label className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium">
                                                <Checkbox
                                                    checked={allClassesSelected}
                                                    disabled={!patternSelected || availableClassIds.length === 0}
                                                    onCheckedChange={(checked) =>
                                                        handlePatternSelectAllClasses(pattern.id, checked === true)
                                                    }
                                                />
                                                <span>All classes</span>
                                            </label>

                                            <CollapsibleTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="hover:bg-accent inline-flex size-8 items-center justify-center rounded-md border"
                                                >
                                                    <ChevronDownIcon
                                                        className={cn(
                                                            'size-4 transition-transform',
                                                            patternIsOpen && 'rotate-180',
                                                        )}
                                                    />
                                                </button>
                                            </CollapsibleTrigger>
                                        </div>
                                    </div>

                                    <CollapsibleContent>
                                        <div className="border-t px-4 py-4">
                                            {availableClassIds.length === 0 ? (
                                                <p className="text-muted-foreground text-xs italic">No classes</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {availableClassIds.map((classId) => {
                                                        const schoolClass = classLookup[classId];
                                                        const classSelected = Boolean(patternRule?.classes[String(classId)]);
                                                        const classIsOpen = isClassOpen(pattern.id, classId);
                                                        const availableSubjectIds = getAvailableSubjectIds(
                                                            pattern.id,
                                                            classId,
                                                            classSubjectMap,
                                                        );
                                                        const selectedSubjectIds = getSelectedSubjectIds(
                                                            effectiveScope,
                                                            pattern.id,
                                                            classId,
                                                            classSubjectMap,
                                                        );
                                                        const allSubjectsSelected =
                                                            availableSubjectIds.length > 0 &&
                                                            selectedSubjectIds.length === availableSubjectIds.length;

                                                        return (
                                                            <Collapsible
                                                                key={classId}
                                                                open={classIsOpen}
                                                                onOpenChange={(nextOpen) =>
                                                                    setClassOpen(pattern.id, classId, nextOpen)
                                                                }
                                                            >
                                                                <div
                                                                    className={cn(
                                                                        'rounded-lg border transition-colors',
                                                                        classSelected
                                                                            ? 'border-primary/20 bg-muted/20'
                                                                            : 'border-dashed bg-background',
                                                                    )}
                                                                >
                                                                    <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
                                                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                                                            <Checkbox
                                                                                checked={classSelected}
                                                                                disabled={!patternSelected}
                                                                                onCheckedChange={(checked) =>
                                                                                    handleClassToggle(
                                                                                        pattern.id,
                                                                                        classId,
                                                                                        checked === true,
                                                                                    )
                                                                                }
                                                                            />

                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <p className="truncate text-sm font-medium">
                                                                                        {schoolClass?.name ?? `Class #${classId}`}
                                                                                    </p>
                                                                                    <Badge
                                                                                        variant="outline"
                                                                                        className={cn(
                                                                                            'text-[11px]',
                                                                                            classSelected
                                                                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                                                : 'border-muted bg-background text-muted-foreground',
                                                                                        )}
                                                                                    >
                                                                                        {selectedSubjectIds.length} / {availableSubjectIds.length}
                                                                                    </Badge>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center gap-2">
                                                                            <label className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium">
                                                                                <Checkbox
                                                                                    checked={allSubjectsSelected}
                                                                                    disabled={!classSelected || availableSubjectIds.length === 0}
                                                                                    onCheckedChange={(checked) =>
                                                                                        handleSubjectSelectAll(
                                                                                            pattern.id,
                                                                                            classId,
                                                                                            checked === true,
                                                                                        )
                                                                                    }
                                                                                />
                                                                                <span>All subjects</span>
                                                                            </label>

                                                                            <CollapsibleTrigger asChild>
                                                                                <button
                                                                                    type="button"
                                                                                    className="hover:bg-accent inline-flex size-8 items-center justify-center rounded-md border"
                                                                                >
                                                                                    <ChevronDownIcon
                                                                                        className={cn(
                                                                                            'size-4 transition-transform',
                                                                                            classIsOpen && 'rotate-180',
                                                                                        )}
                                                                                    />
                                                                                </button>
                                                                            </CollapsibleTrigger>
                                                                        </div>
                                                                    </div>

                                                                    <CollapsibleContent>
                                                                        <div className="border-t px-3 py-3">
                                                                            {availableSubjectIds.length === 0 ? (
                                                                                <p className="text-muted-foreground text-xs italic">
                                                                                    No subjects
                                                                                </p>
                                                                            ) : (
                                                                                <div
                                                                                    className={cn(
                                                                                        'grid gap-2 sm:grid-cols-2 xl:grid-cols-3',
                                                                                        !classSelected && 'opacity-60',
                                                                                    )}
                                                                                >
                                                                                    {availableSubjectIds.map((subjectId) => {
                                                                                        const subject = subjectLookup[subjectId];
                                                                                        const checked = selectedSubjectIds.includes(subjectId);

                                                                                        return (
                                                                                            <label
                                                                                                key={subjectId}
                                                                                                className="hover:bg-accent flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 transition-colors"
                                                                                            >
                                                                                                <Checkbox
                                                                                                    checked={checked}
                                                                                                    disabled={!classSelected}
                                                                                                    onCheckedChange={(nextChecked) =>
                                                                                                        handleSubjectToggle(
                                                                                                            pattern.id,
                                                                                                            classId,
                                                                                                            subjectId,
                                                                                                            nextChecked === true,
                                                                                                        )
                                                                                                    }
                                                                                                />

                                                                                                <div className="min-w-0">
                                                                                                    <p className="truncate text-sm font-medium">
                                                                                                        {subject?.name_eng ?? `Subject #${subjectId}`}
                                                                                                    </p>
                                                                                                    {subject?.name_ur && (
                                                                                                        <p className="text-muted-foreground truncate text-xs">
                                                                                                            {subject.name_ur}
                                                                                                        </p>
                                                                                                    )}
                                                                                                </div>
                                                                                            </label>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </CollapsibleContent>
                                                                </div>
                                                            </Collapsible>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </CollapsibleContent>
                                </div>
                            </Collapsible>
                        );
                    })}
                </div>
            </div>

            {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
    );
}

function SummaryBadge({
    icon,
    label,
    value,
    total,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | null;
    total: number;
}) {
    return (
        <Badge variant="outline" className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium">
            <span className="text-muted-foreground">{icon}</span>
            <span>{label}</span>
            <span className="text-muted-foreground">{value === null ? `All ${total}` : `${value} / ${total}`}</span>
        </Badge>
    );
}

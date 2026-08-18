import { Head, router } from '@inertiajs/react';
import {
    ArrowLeftRightIcon,
    Link2Icon,
    LoaderCircleIcon,
    PlusIcon,
    Trash2Icon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    FloatingCombobox,
    type ComboboxOptionItem,
} from '@/components/ui/floating-combobox';
import { Switch } from '@/components/ui/switch';
import { usePermission } from '@/hooks/use-permission';

interface ScopeCatalog {
    patterns: Array<{ id: number; name: string; short_name?: string | null }>;
    patternClasses: Array<{ pattern_id: number; id: number; name: string }>;
    classSubjects: Array<{
        pattern_id: number;
        class_id: number;
        subject_id: number;
        name: string;
    }>;
}

interface SelectedScope {
    pattern_id: number;
    class_id: number;
    subject_id: number;
}

interface QuestionTypeOption {
    id: number;
    name: string;
}

interface OrGroup {
    id: number;
    question_types: QuestionTypeOption[];
    is_active: boolean;
    is_available: boolean;
}

type FormErrors = Record<string, string>;

export default function QuestionTypePairings({
    scopeCatalog,
    selectedScope,
    questionTypes,
    groups,
}: {
    scopeCatalog: ScopeCatalog;
    selectedScope: SelectedScope | null;
    questionTypes: QuestionTypeOption[];
    groups: OrGroup[];
}) {
    const { can } = usePermission();
    const canEdit = can('question_types.edit');
    const [patternId, setPatternId] = useState<number | null>(
        selectedScope?.pattern_id ?? null,
    );
    const [classId, setClassId] = useState<number | null>(
        selectedScope?.class_id ?? null,
    );
    const [subjectId, setSubjectId] = useState<number | null>(
        selectedScope?.subject_id ?? null,
    );
    const [selectedTypeIds, setSelectedTypeIds] = useState<number[]>([]);
    const [scopeLoading, setScopeLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [busyGroupId, setBusyGroupId] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<OrGroup | null>(null);
    const [errors, setErrors] = useState<FormErrors>({});

    const patternOptions = useMemo<ComboboxOptionItem[]>(
        () =>
            scopeCatalog.patterns.map((pattern) => ({
                id: pattern.id,
                label: pattern.name,
            })),
        [scopeCatalog.patterns],
    );
    const scopedClasses = useMemo(
        () =>
            scopeCatalog.patternClasses.filter(
                (item) => item.pattern_id === patternId,
            ),
        [scopeCatalog.patternClasses, patternId],
    );
    const classOptions = useMemo<ComboboxOptionItem[]>(
        () =>
            scopedClasses.map((schoolClass) => ({
                id: schoolClass.id,
                label: schoolClass.name,
            })),
        [scopedClasses],
    );
    const scopedSubjects = useMemo(
        () =>
            scopeCatalog.classSubjects.filter(
                (item) =>
                    item.pattern_id === patternId && item.class_id === classId,
            ),
        [scopeCatalog.classSubjects, patternId, classId],
    );
    const subjectOptions = useMemo<ComboboxOptionItem[]>(
        () =>
            scopedSubjects.map((subject) => ({
                id: subject.subject_id,
                label: subject.name,
            })),
        [scopedSubjects],
    );
    const selectedPatternOption = findComboboxOption(patternOptions, patternId);
    const selectedClassOption = findComboboxOption(classOptions, classId);
    const selectedSubjectOption = findComboboxOption(subjectOptions, subjectId);
    const selectedPattern =
        scopeCatalog.patterns.find((pattern) => pattern.id === patternId) ??
        null;
    const selectedClass =
        scopedClasses.find((schoolClass) => schoolClass.id === classId) ?? null;
    const displayTypeName = (name: string) =>
        questionTypeDisplayName(name, selectedPattern, selectedClass);
    const loadedScopeMatches =
        selectedScope !== null &&
        selectedScope.pattern_id === patternId &&
        selectedScope.class_id === classId &&
        selectedScope.subject_id === subjectId;
    const scopedTypes = loadedScopeMatches ? questionTypes : [];
    const scopedGroups = loadedScopeMatches ? groups : [];

    const clearGroupForm = () => {
        setSelectedTypeIds([]);
        setErrors({});
    };

    const selectPattern = (value: ComboboxOptionItem | null) => {
        setPatternId(value === null ? null : Number(value.id));
        setClassId(null);
        setSubjectId(null);
        clearGroupForm();
    };

    const selectClass = (value: ComboboxOptionItem | null) => {
        setClassId(value === null ? null : Number(value.id));
        setSubjectId(null);
        clearGroupForm();
    };

    const selectSubject = (value: ComboboxOptionItem | null) => {
        const nextSubjectId = value === null ? null : Number(value.id);
        setSubjectId(nextSubjectId);
        clearGroupForm();

        if (patternId === null || classId === null || nextSubjectId === null) {
            return;
        }

        setScopeLoading(true);
        router.get(
            '/superadmin/question-type-pairings',
            {
                pattern_id: patternId,
                class_id: classId,
                subject_id: nextSubjectId,
            },
            {
                only: ['selectedScope', 'questionTypes', 'groups'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => setScopeLoading(false),
            },
        );
    };

    const createGroup = () => {
        if (
            !canEdit ||
            patternId === null ||
            classId === null ||
            subjectId === null ||
            selectedTypeIds.length < 2
        ) {
            return;
        }

        setSubmitting(true);
        setErrors({});
        router.post(
            '/superadmin/question-type-pairings',
            {
                pattern_id: patternId,
                class_id: classId,
                subject_id: subjectId,
                question_type_ids: selectedTypeIds,
            },
            {
                preserveScroll: true,
                onError: (nextErrors) => setErrors(nextErrors),
                onSuccess: clearGroupForm,
                onFinish: () => setSubmitting(false),
            },
        );
    };

    const toggleGroup = (group: OrGroup) => {
        if (!canEdit || busyGroupId !== null) {
            return;
        }

        setBusyGroupId(group.id);
        setErrors({});
        router.patch(
            `/superadmin/question-type-pairings/${group.id}`,
            { is_active: !group.is_active },
            {
                preserveScroll: true,
                onError: (nextErrors) => setErrors(nextErrors),
                onFinish: () => setBusyGroupId(null),
            },
        );
    };

    const removeGroup = () => {
        if (!canEdit || deleteTarget === null) {
            return;
        }

        setBusyGroupId(deleteTarget.id);
        router.delete(`/superadmin/question-type-pairings/${deleteTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
            onFinish: () => setBusyGroupId(null),
        });
    };

    return (
        <>
            <Head title="OR Group Settings" />

            <div className="space-y-5 p-4 md:p-6">
                <div>
                    <h1 className="h1-semibold">OR Group Settings</h1>
                </div>

                <section className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <Link2Icon className="size-4" />
                        </div>
                        <h2 className="text-sm font-semibold">Group scope</h2>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                        <FloatingCombobox
                            label="Pattern"
                            options={patternOptions}
                            value={selectedPatternOption}
                            onChange={selectPattern}
                        />
                        <FloatingCombobox
                            label="Class"
                            options={classOptions}
                            value={selectedClassOption}
                            onChange={selectClass}
                            disabled={patternId === null}
                        />
                        <FloatingCombobox
                            label="Subject"
                            options={subjectOptions}
                            value={selectedSubjectOption}
                            onChange={selectSubject}
                            disabled={classId === null}
                        />
                    </div>
                    {errors.subject_id && (
                        <p className="mt-2 text-xs text-destructive">
                            {errors.subject_id}
                        </p>
                    )}
                </section>

                {scopeLoading && (
                    <div className="flex min-h-48 items-center justify-center rounded-xl border bg-card">
                        <LoaderCircleIcon className="size-5 animate-spin text-primary" />
                        <span className="ml-2 text-sm text-muted-foreground">
                            Loading scoped question types…
                        </span>
                    </div>
                )}

                {!scopeLoading && !loadedScopeMatches && (
                    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 px-6 text-center">
                        <ArrowLeftRightIcon className="mb-3 size-8 text-muted-foreground/60" />
                        <p className="font-medium">Select a complete scope</p>
                        <p className="mt-1 max-w-md text-sm text-muted-foreground">
                            Choose a pattern, class, and subject to see only the
                            subjective types available there.
                        </p>
                    </div>
                )}

                {!scopeLoading && loadedScopeMatches && (
                    <>
                        <section className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-sm font-semibold">
                                        Create an OR group
                                    </h2>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Select two or more subjective types that
                                        can be offered as alternatives.
                                    </p>
                                </div>
                                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                                    {selectedTypeIds.length} selected
                                </span>
                            </div>

                            {scopedTypes.length < 2 ? (
                                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                                    At least two active subjective types with
                                    questions are required to create a group.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {selectedTypeIds.map((typeId, index) => (
                                            <TypeSelect
                                                key={`${index}-${typeId}`}
                                                label={`Question type ${index + 1}`}
                                                value={typeId}
                                                types={scopedTypes}
                                                excludeIds={selectedTypeIds.filter(
                                                    (_, selectedIndex) =>
                                                        selectedIndex !== index,
                                                )}
                                                disabled={!canEdit}
                                                displayName={displayTypeName}
                                                onChange={(id) => {
                                                    if (id === null) {
                                                        setSelectedTypeIds((current) =>
                                                            current.filter(
                                                                (_, selectedIndex) =>
                                                                    selectedIndex !== index,
                                                            ),
                                                        );
                                                    } else {
                                                        setSelectedTypeIds((current) =>
                                                            current.map((currentId, selectedIndex) =>
                                                                selectedIndex === index
                                                                    ? id
                                                                    : currentId,
                                                            ),
                                                        );
                                                    }
                                                    setErrors({});
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setSelectedTypeIds((current) => [
                                                    ...current,
                                                    0,
                                                ])
                                            }
                                            disabled={
                                                !canEdit ||
                                                selectedTypeIds.length >=
                                                    scopedTypes.length
                                            }
                                        >
                                            <PlusIcon />
                                            Add another type
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={createGroup}
                                            disabled={
                                                !canEdit ||
                                                selectedTypeIds.length < 2 ||
                                                selectedTypeIds.some((id) => id < 1) ||
                                                submitting
                                            }
                                        >
                                            {submitting ? (
                                                <LoaderCircleIcon className="animate-spin" />
                                            ) : (
                                                <Link2Icon />
                                            )}
                                            Add OR group
                                        </Button>
                                    </div>
                                    {errors.question_type_ids && (
                                        <p className="text-xs text-destructive">
                                            {errors.question_type_ids}
                                        </p>
                                    )}
                                </div>
                            )}
                        </section>

                        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                            <div className="border-b px-4 py-4 md:px-5">
                                <h2 className="text-sm font-semibold">
                                    Configured OR groups
                                </h2>
                            </div>

                            {errors.is_active && (
                                <div className="border-b bg-destructive/5 px-4 py-2 text-xs text-destructive md:px-5">
                                    {errors.is_active}
                                </div>
                            )}

                            {scopedGroups.length === 0 ? (
                                <div className="px-5 py-12 text-center">
                                    <ArrowLeftRightIcon className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                                    <p className="text-sm font-medium">
                                        No OR groups configured
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Select at least two eligible types above
                                        to create one.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {scopedGroups.map((group) => (
                                        <div
                                            key={group.id}
                                            className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-5"
                                        >
                                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                {group.question_types.map((type, index) => (
                                                    <div
                                                        key={type.id}
                                                        className="flex min-w-0 items-center gap-2"
                                                    >
                                                        {index > 0 && (
                                                            <span className="shrink-0 text-xs font-bold text-primary">
                                                                OR
                                                            </span>
                                                        )}
                                                        <TypeBox
                                                            type={type}
                                                            displayName={displayTypeName}
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex items-center justify-between gap-3 md:justify-end">
                                                {!group.is_available && (
                                                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                                                        Type unavailable
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">
                                                        {group.is_active
                                                            ? 'Active'
                                                            : 'Inactive'}
                                                    </span>
                                                    <Switch
                                                        checked={group.is_active}
                                                        onCheckedChange={() =>
                                                            toggleGroup(group)
                                                        }
                                                        disabled={
                                                            !canEdit ||
                                                            busyGroupId !== null ||
                                                            (!group.is_available &&
                                                                !group.is_active)
                                                        }
                                                    />
                                                    {canEdit && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground hover:text-destructive"
                                                            onClick={() =>
                                                                setDeleteTarget(group)
                                                            }
                                                            disabled={
                                                                busyGroupId !== null
                                                            }
                                                            title="Remove OR group"
                                                        >
                                                            <Trash2Icon />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>

            <Dialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <DialogContent>
                    <DialogTitle>Remove OR group?</DialogTitle>
                    <DialogDescription>
                        This removes the OR group containing{' '}
                        <strong>
                            {deleteTarget?.question_types
                                .map((type) => displayTypeName(type.name))
                                .join(' OR ')}
                        </strong>{' '}
                        from this scope. It can be created again later.
                    </DialogDescription>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                            disabled={busyGroupId !== null}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={removeGroup}
                            disabled={busyGroupId !== null}
                        >
                            {busyGroupId !== null && (
                                <LoaderCircleIcon className="animate-spin" />
                            )}
                            Remove group
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function TypeSelect({
    label,
    value,
    types,
    excludeIds,
    disabled,
    displayName,
    onChange,
}: {
    label: string;
    value: number;
    types: QuestionTypeOption[];
    excludeIds: number[];
    disabled: boolean;
    displayName: (name: string) => string;
    onChange: (id: number | null) => void;
}) {
    const options = useMemo<ComboboxOptionItem[]>(
        () =>
            types
                .filter((type) => !excludeIds.includes(type.id))
                .map((type) => ({
                    id: type.id,
                    label: displayName(type.name),
                })),
        [displayName, excludeIds, types],
    );

    return (
        <FloatingCombobox
            label={label}
            options={options}
            value={findComboboxOption(options, value || null)}
            onChange={(option) =>
                onChange(option === null ? null : Number(option.id))
            }
            disabled={disabled}
        />
    );
}

function TypeBox({
    type,
    displayName,
}: {
    type: Pick<QuestionTypeOption, 'id' | 'name'>;
    displayName: (name: string) => string;
}) {
    return (
        <div className="min-w-0 rounded-lg border bg-muted/20 px-3 py-2">
            <p className="break-words text-sm font-medium">
                {displayName(type.name)}
            </p>
        </div>
    );
}

function findComboboxOption(
    options: ComboboxOptionItem[],
    id: number | null,
): ComboboxOptionItem | null {
    return options.find((option) => Number(option.id) === id) ?? null;
}

function normalizeScopeText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function questionTypeDisplayName(
    name: string,
    pattern: ScopeCatalog['patterns'][number] | null,
    schoolClass: ScopeCatalog['patternClasses'][number] | null,
): string {
    const suffixMatch = name.match(/\s*\(([^()]*)\)\s*$/);

    if (!suffixMatch || !pattern || !schoolClass) {
        return name;
    }

    const suffix = normalizeScopeText(suffixMatch[1]);
    const patternTokens = [pattern.name, pattern.short_name ?? '']
        .map(normalizeScopeText)
        .filter(Boolean);
    const classToken = normalizeScopeText(schoolClass.name);
    const classNumber = schoolClass.name.match(/\d+/)?.[0] ?? null;
    const suffixNumber = suffixMatch[1].match(/\d+/)?.[0] ?? null;
    const containsPattern = patternTokens.some((token) =>
        suffix.includes(token),
    );
    const containsClass =
        suffix.includes(classToken) ||
        (classNumber !== null && classNumber === suffixNumber);
    const exactScopeLabels = [
        ...patternTokens,
        classToken,
        ...patternTokens.flatMap((token) => [
            classToken + token,
            token + classToken,
        ]),
    ];

    if (
        !exactScopeLabels.includes(suffix) &&
        !(containsPattern && containsClass)
    ) {
        return name;
    }

    return name.slice(0, suffixMatch.index).trim();
}

QuestionTypePairings.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Question Types', href: '/superadmin/question-types' },
        {
            title: 'OR Group Settings',
            href: '/superadmin/question-type-pairings',
        },
    ],
};
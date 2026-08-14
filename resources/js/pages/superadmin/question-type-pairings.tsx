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
    FloatingCombobox
    
} from '@/components/ui/floating-combobox';
import type {ComboboxOptionItem} from '@/components/ui/floating-combobox';
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

interface Pairing {
    id: number;
    question_type_a: Pick<QuestionTypeOption, 'id' | 'name'>;
    question_type_b: Pick<QuestionTypeOption, 'id' | 'name'>;
    is_active: boolean;
    is_available: boolean;
}

type FormErrors = Record<string, string>;

export default function QuestionTypePairings({
    scopeCatalog,
    selectedScope,
    questionTypes,
    pairings,
}: {
    scopeCatalog: ScopeCatalog;
    selectedScope: SelectedScope | null;
    questionTypes: QuestionTypeOption[];
    pairings: Pairing[];
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
    const [firstTypeId, setFirstTypeId] = useState<number | null>(null);
    const [secondTypeId, setSecondTypeId] = useState<number | null>(null);
    const [scopeLoading, setScopeLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [busyPairingId, setBusyPairingId] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Pairing | null>(null);
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
    const scopedPairings = loadedScopeMatches ? pairings : [];

    const clearPairForm = () => {
        setFirstTypeId(null);
        setSecondTypeId(null);
        setErrors({});
    };

    const selectPattern = (value: ComboboxOptionItem | null) => {
        setPatternId(value === null ? null : Number(value.id));
        setClassId(null);
        setSubjectId(null);
        clearPairForm();
    };

    const selectClass = (value: ComboboxOptionItem | null) => {
        setClassId(value === null ? null : Number(value.id));
        setSubjectId(null);
        clearPairForm();
    };

    const selectSubject = (value: ComboboxOptionItem | null) => {
        const nextSubjectId = value === null ? null : Number(value.id);
        setSubjectId(nextSubjectId);
        clearPairForm();

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
                only: ['selectedScope', 'questionTypes', 'pairings'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => setScopeLoading(false),
            },
        );
    };

    const createPairing = () => {
        if (
            !canEdit ||
            patternId === null ||
            classId === null ||
            subjectId === null ||
            firstTypeId === null ||
            secondTypeId === null
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
                question_type_a_id: firstTypeId,
                question_type_b_id: secondTypeId,
            },
            {
                preserveScroll: true,
                onError: (nextErrors) => setErrors(nextErrors),
                onSuccess: clearPairForm,
                onFinish: () => setSubmitting(false),
            },
        );
    };

    const togglePairing = (pairing: Pairing) => {
        if (!canEdit || busyPairingId !== null) {
            return;
        }

        setBusyPairingId(pairing.id);
        setErrors({});
        router.patch(
            `/superadmin/question-type-pairings/${pairing.id}`,
            { is_active: !pairing.is_active },
            {
                preserveScroll: true,
                onError: (nextErrors) => setErrors(nextErrors),
                onFinish: () => setBusyPairingId(null),
            },
        );
    };

    const removePairing = () => {
        if (!canEdit || deleteTarget === null) {
            return;
        }

        setBusyPairingId(deleteTarget.id);
        router.delete(`/superadmin/question-type-pairings/${deleteTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
            onFinish: () => setBusyPairingId(null),
        });
    };

    return (
        <>
            <Head title="OR Pairing Settings" />

            <div className="space-y-5 p-4 md:p-6">
                <div>
                    <h1 className="h1-semibold">OR Pairing Settings</h1>
                </div>

                <section className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <Link2Icon className="size-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold">
                                Pairing scope
                            </h2>
                        </div>
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
                            <div className="mb-4">
                                <h2 className="text-sm font-semibold">
                                    Create an OR pair
                                </h2>
                            </div>

                            {scopedTypes.length < 2 ? (
                                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                                    At least two active subjective types with
                                    questions are required to create a pair.
                                </div>
                            ) : (
                                <div className="grid items-end gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]">
                                    <TypeSelect
                                        label="First question type"
                                        value={firstTypeId}
                                        types={scopedTypes}
                                        disabled={!canEdit}
                                        error={errors.question_type_a_id}
                                        displayName={displayTypeName}
                                        onChange={(id) => {
                                            setFirstTypeId(id);

                                            if (id === secondTypeId) {
                                                setSecondTypeId(null);
                                            }

                                            setErrors({});
                                        }}
                                    />
                                    <div className="flex h-11 items-center justify-center px-1 text-xs font-bold text-primary">
                                        OR
                                    </div>
                                    <TypeSelect
                                        label="Second question type"
                                        value={secondTypeId}
                                        types={scopedTypes.filter(
                                            (type) => type.id !== firstTypeId,
                                        )}
                                        disabled={!canEdit}
                                        error={errors.question_type_b_id}
                                        displayName={displayTypeName}
                                        onChange={(id) => {
                                            setSecondTypeId(id);
                                            setErrors({});
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        onClick={createPairing}
                                        className="h-11"
                                        disabled={
                                            !canEdit ||
                                            firstTypeId === null ||
                                            secondTypeId === null ||
                                            submitting
                                        }
                                    >
                                        {submitting ? (
                                            <LoaderCircleIcon className="animate-spin" />
                                        ) : (
                                            <PlusIcon />
                                        )}
                                        Add pair
                                    </Button>
                                </div>
                            )}
                        </section>

                        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                            <div className="border-b px-4 py-4 md:px-5">
                                <h2 className="text-sm font-semibold">
                                    Configured pairs
                                </h2>
                            </div>

                            {errors.is_active && (
                                <div className="border-b bg-destructive/5 px-4 py-2 text-xs text-destructive md:px-5">
                                    {errors.is_active}
                                </div>
                            )}

                            {scopedPairings.length === 0 ? (
                                <div className="px-5 py-12 text-center">
                                    <ArrowLeftRightIcon className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                                    <p className="text-sm font-medium">
                                        No OR pairs configured
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Select two eligible types above to
                                        create one.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {scopedPairings.map((pairing) => (
                                        <div
                                            key={pairing.id}
                                            className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-5"
                                        >
                                            <div className="grid min-w-0 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-3">
                                                <TypeBox
                                                    type={
                                                        pairing.question_type_a
                                                    }
                                                    displayName={
                                                        displayTypeName
                                                    }
                                                />
                                                <div className="flex shrink-0 flex-col items-center text-primary">
                                                    <span className="text-[10px] font-bold">
                                                        OR
                                                    </span>
                                                    <ArrowLeftRightIcon className="size-4" />
                                                </div>
                                                <TypeBox
                                                    type={
                                                        pairing.question_type_b
                                                    }
                                                    displayName={
                                                        displayTypeName
                                                    }
                                                />
                                            </div>

                                            <div className="flex items-center justify-between gap-3 md:justify-end">
                                                {!pairing.is_available && (
                                                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                                                        Type unavailable
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">
                                                        {pairing.is_active
                                                            ? 'Active'
                                                            : 'Inactive'}
                                                    </span>
                                                    <Switch
                                                        checked={
                                                            pairing.is_active
                                                        }
                                                        onCheckedChange={() =>
                                                            togglePairing(
                                                                pairing,
                                                            )
                                                        }
                                                        disabled={
                                                            !canEdit ||
                                                            busyPairingId !==
                                                                null ||
                                                            (!pairing.is_available &&
                                                                !pairing.is_active)
                                                        }
                                                    />
                                                    {canEdit && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground hover:text-destructive"
                                                            onClick={() =>
                                                                setDeleteTarget(
                                                                    pairing,
                                                                )
                                                            }
                                                            disabled={
                                                                busyPairingId !==
                                                                null
                                                            }
                                                            title="Remove pair"
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
                    <DialogTitle>Remove OR pairing?</DialogTitle>
                    <DialogDescription>
                        This removes the pairing between{' '}
                        <strong>{deleteTarget?.question_type_a.name}</strong>{' '}
                        and{' '}
                        <strong>{deleteTarget?.question_type_b.name}</strong>{' '}
                        from this scope. It can be created again later.
                    </DialogDescription>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                            disabled={busyPairingId !== null}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={removePairing}
                            disabled={busyPairingId !== null}
                        >
                            {busyPairingId !== null && (
                                <LoaderCircleIcon className="animate-spin" />
                            )}
                            Remove pair
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
    disabled,
    error,
    displayName,
    onChange,
}: {
    label: string;
    value: number | null;
    types: QuestionTypeOption[];
    disabled: boolean;
    error?: string;
    displayName: (name: string) => string;
    onChange: (id: number | null) => void;
}) {
    const options = useMemo<ComboboxOptionItem[]>(
        () =>
            types.map((type) => ({
                id: type.id,
                label: displayName(type.name),
            })),
        [displayName, types],
    );

    return (
        <div className="space-y-1.5">
            <FloatingCombobox
                label={label}
                options={options}
                value={findComboboxOption(options, value)}
                onChange={(option) =>
                    onChange(option === null ? null : Number(option.id))
                }
                disabled={disabled}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
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
        <div className="min-w-0 flex-1 rounded-lg border bg-muted/20 px-3 py-2">
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
            title: 'OR Pairing Settings',
            href: '/superadmin/question-type-pairings',
        },
    ],
};

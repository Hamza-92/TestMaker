import { router } from '@inertiajs/react';
import { Columns3Icon, SaveIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FloatingCombobox } from '@/components/ui/floating-combobox';
import type { ComboboxOptionItem } from '@/components/ui/floating-combobox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { usePermission } from '@/hooks/use-permission';

interface ScopeCatalog {
    patterns: Array<{ id: number; name: string }>;
    patternClasses: Array<{ pattern_id: number; id: number; name: string }>;
    classSubjects: Array<{
        pattern_id: number;
        class_id: number;
        subject_id: number;
        name: string;
    }>;
}

interface QuestionTypeRow {
    id: number;
    name: string;
    name_ur: string | null;
    columns: number;
    apply_to_both: boolean;
}

interface Scope {
    patternId: number;
    classId: number;
    subjectId: number;
}

function findOption(options: ComboboxOptionItem[], id: number | null) {
    return options.find((option) => Number(option.id) === id) ?? null;
}

export default function SubjectiveColumnSettings({
    scopeCatalog,
    selectedScope,
    questionTypes,
}: {
    scopeCatalog: ScopeCatalog;
    selectedScope: Scope | null;
    questionTypes: QuestionTypeRow[];
}) {
    const { can } = usePermission();
    const canEdit = can('question_types.edit');
    const [patternId, setPatternId] = useState<number | null>(
        selectedScope?.patternId ?? null,
    );
    const [classId, setClassId] = useState<number | null>(
        selectedScope?.classId ?? null,
    );
    const [subjectId, setSubjectId] = useState<number | null>(
        selectedScope?.subjectId ?? null,
    );
    const [values, setValues] = useState<
        Record<number, { columns: number; apply_to_both: boolean }>
    >(() =>
        Object.fromEntries(
            questionTypes.map((type) => [
                type.id,
                {
                    columns: type.columns,
                    apply_to_both: type.apply_to_both,
                },
            ]),
        ),
    );
    const [savingId, setSavingId] = useState<number | null>(null);

    const patternOptions = useMemo<ComboboxOptionItem[]>(
        () =>
            scopeCatalog.patterns.map((item) => ({
                id: item.id,
                label: item.name,
            })),
        [scopeCatalog.patterns],
    );
    const classOptions = useMemo<ComboboxOptionItem[]>(
        () =>
            scopeCatalog.patternClasses
                .filter((item) => item.pattern_id === patternId)
                .map((item) => ({ id: item.id, label: item.name })),
        [scopeCatalog.patternClasses, patternId],
    );
    const subjectOptions = useMemo<ComboboxOptionItem[]>(
        () =>
            scopeCatalog.classSubjects
                .filter(
                    (item) =>
                        item.pattern_id === patternId &&
                        item.class_id === classId,
                )
                .map((item) => ({ id: item.subject_id, label: item.name })),
        [scopeCatalog.classSubjects, patternId, classId],
    );

    function selectScope(
        pattern: number | null,
        schoolClass: number | null,
        subject: number | null,
    ) {
        setPatternId(pattern);
        setClassId(schoolClass);
        setSubjectId(subject);
        setValues({});

        if (pattern && schoolClass && subject) {
            router.get(
                '/superadmin/subjective-column-settings',
                {
                    pattern_id: pattern,
                    class_id: schoolClass,
                    subject_id: subject,
                },
                { preserveState: false, preserveScroll: true, replace: true },
            );
        }
    }

    function save(typeId: number) {
        if (!canEdit || !patternId || !classId || !subjectId) {
            return;
        }

        setSavingId(typeId);
        router.put(
            '/superadmin/subjective-column-settings',
            {
                pattern_id: patternId,
                class_id: classId,
                subject_id: subjectId,
                question_type_id: typeId,
                columns: values[typeId]?.columns ?? 1,
                apply_to_both: values[typeId]?.apply_to_both ?? false,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => toast.success('Column setting saved.'),
                onError: (errors) =>
                    toast.error(
                        Object.values(errors)[0] ??
                            'Unable to save column setting.',
                    ),
                onFinish: () => setSavingId(null),
            },
        );
    }

    const loaded =
        selectedScope?.patternId === patternId &&
        selectedScope?.classId === classId &&
        selectedScope?.subjectId === subjectId;

    return (
        <div className="w-full min-w-0 space-y-6 p-4 md:p-6">
            <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                    <Columns3Icon className="size-5" />
                </span>
                <h1 className="text-2xl font-semibold">Question Columns</h1>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <div className="grid gap-3 md:grid-cols-3">
                    <FloatingCombobox
                        label="Pattern"
                        value={findOption(patternOptions, patternId)}
                        options={patternOptions}
                        onChange={(value) =>
                            selectScope(
                                value ? Number(value.id) : null,
                                null,
                                null,
                            )
                        }
                        placeholder="Pattern"
                    />
                    <FloatingCombobox
                        label="Class"
                        value={findOption(classOptions, classId)}
                        options={classOptions}
                        onChange={(value) =>
                            selectScope(
                                patternId,
                                value ? Number(value.id) : null,
                                null,
                            )
                        }
                        placeholder="Class"
                        disabled={!patternId}
                    />
                    <FloatingCombobox
                        label="Subject"
                        value={findOption(subjectOptions, subjectId)}
                        options={subjectOptions}
                        onChange={(value) =>
                            selectScope(
                                patternId,
                                classId,
                                value ? Number(value.id) : null,
                            )
                        }
                        placeholder="Subject"
                        disabled={!classId}
                    />
                </div>
            </div>

            {loaded && (
                <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
                    <div className="min-w-[640px]">
                        <div className="grid grid-cols-[minmax(0,1fr)_7rem_9rem_5rem] gap-3 border-b bg-muted/40 px-5 py-3 text-sm font-medium">
                            <span>Subjective type</span>
                            <span>Columns</span>
                            <span>Bilingual</span>
                            <span />
                        </div>
                        {questionTypes.map((type) => {
                            const value = values[type.id] ?? {
                                columns: type.columns,
                                apply_to_both: type.apply_to_both,
                            };

                            return (
                                <div
                                    key={type.id}
                                    className="grid grid-cols-[minmax(0,1fr)_7rem_9rem_5rem] items-center gap-3 border-b px-5 py-3 last:border-b-0"
                                >
                                    <div className="min-w-0 text-sm font-medium">
                                        {type.name}
                                        {type.name_ur && (
                                            <span className="ml-2 text-muted-foreground">
                                                {type.name_ur}
                                            </span>
                                        )}
                                    </div>
                                    <Select
                                        value={String(value.columns)}
                                        disabled={!canEdit}
                                        onValueChange={(next) =>
                                            setValues((current) => ({
                                                ...current,
                                                [type.id]: {
                                                    ...value,
                                                    columns: Number(next),
                                                },
                                            }))
                                        }
                                    >
                                        <SelectTrigger
                                            aria-label={`${type.name} columns`}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[1, 2, 3, 4, 5].map((count) => (
                                                <SelectItem
                                                    key={count}
                                                    value={String(count)}
                                                >
                                                    {count}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Switch
                                        aria-label={`${type.name} apply to bilingual papers`}
                                        checked={value.apply_to_both}
                                        disabled={!canEdit}
                                        onCheckedChange={(checked) =>
                                            setValues((current) => ({
                                                ...current,
                                                [type.id]: {
                                                    ...value,
                                                    apply_to_both: checked,
                                                },
                                            }))
                                        }
                                    />
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        title={`Save ${type.name}`}
                                        disabled={!canEdit || savingId !== null}
                                        onClick={() => save(type.id)}
                                    >
                                        <SaveIcon className="size-4" />
                                    </Button>
                                </div>
                            );
                        })}
                        {questionTypes.length === 0 && (
                            <div className="px-5 py-8 text-sm text-muted-foreground">
                                No subjective question types in this subject.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

SubjectiveColumnSettings.layout = {
    breadcrumbs: [
        {
            title: 'Question Columns',
            href: '/superadmin/subjective-column-settings',
        },
    ],
};

import { router } from '@inertiajs/react';
import { RulerIcon, SaveIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FloatingCombobox } from '@/components/ui/floating-combobox';
import type { ComboboxOptionItem } from '@/components/ui/floating-combobox';
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

interface Scope {
    patternId: number;
    classId: number;
    subjectId: number;
}

interface QuestionTypeRow {
    id: number;
    name: string;
    name_ur: string | null;
    lines: number;
    page_break: boolean;
}

function findOption(options: ComboboxOptionItem[], id: number | null) {
    return options.find((option) => Number(option.id) === id) ?? null;
}

export default function ESheetAnswerSpaces({
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
    const [values, setValues] = useState<Record<number, number>>(() =>
        Object.fromEntries(questionTypes.map((type) => [type.id, type.lines])),
    );
    const [saving, setSaving] = useState(false);
    const [pageBreaks, setPageBreaks] = useState<Record<number, boolean>>({});

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
        setPageBreaks({});

        if (pattern && schoolClass && subject) {
            router.get(
                '/superadmin/e-sheet-answer-spaces',
                {
                    pattern_id: pattern,
                    class_id: schoolClass,
                    subject_id: subject,
                },
                { preserveState: false, preserveScroll: true, replace: true },
            );
        }
    }

    function save() {
        if (!canEdit || !patternId || !classId || !subjectId || saving) {
            return;
        }

        setSaving(true);
        router.put(
            '/superadmin/e-sheet-answer-spaces',
            {
                pattern_id: patternId,
                class_id: classId,
                subject_id: subjectId,
                settings: questionTypes.map((type) => ({
                    question_type_id: type.id,
                    lines: values[type.id] ?? type.lines,
                    page_break: pageBreaks[type.id] ?? type.page_break,
                })),
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => toast.success('E-Sheet answer spaces saved.'),
                onError: (errors) =>
                    toast.error(
                        Object.values(errors)[0] ??
                            'Unable to save answer spaces.',
                    ),
                onFinish: () => setSaving(false),
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
                    <RulerIcon className="size-5" />
                </span>
                <h1 className="text-2xl font-semibold">
                    E-Sheet Answer Spaces
                </h1>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <div className="grid gap-3 md:grid-cols-3">
                    <FloatingCombobox
                        label="Pattern"
                        value={findOption(patternOptions, patternId)}
                        options={patternOptions}
                        placeholder="Pattern"
                        onChange={(value) =>
                            selectScope(
                                value ? Number(value.id) : null,
                                null,
                                null,
                            )
                        }
                    />
                    <FloatingCombobox
                        label="Class"
                        value={findOption(classOptions, classId)}
                        options={classOptions}
                        placeholder="Class"
                        disabled={!patternId}
                        onChange={(value) =>
                            selectScope(
                                patternId,
                                value ? Number(value.id) : null,
                                null,
                            )
                        }
                    />
                    <FloatingCombobox
                        label="Subject"
                        value={findOption(subjectOptions, subjectId)}
                        options={subjectOptions}
                        placeholder="Subject"
                        disabled={!classId}
                        onChange={(value) =>
                            selectScope(
                                patternId,
                                classId,
                                value ? Number(value.id) : null,
                            )
                        }
                    />
                </div>
            </div>

            {loaded && (
                <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                    <div className="grid grid-cols-[minmax(0,1fr)_4rem_5rem] gap-3 border-b bg-muted/40 px-5 py-3 text-sm font-medium sm:grid-cols-[minmax(0,1fr)_7rem_6rem]">
                        <span>Subjective question type</span>
                        <span>Lines</span>
                        <span>Page break</span>
                    </div>
                    {questionTypes.map((type) => (
                        <div
                            key={type.id}
                            className="grid grid-cols-[minmax(0,1fr)_4rem_5rem] items-center gap-3 border-b px-5 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_7rem_6rem]"
                        >
                            <div className="min-w-0 text-sm font-medium">
                                {type.name}
                                {type.name_ur && (
                                    <span className="ml-2 text-muted-foreground">
                                        {type.name_ur}
                                    </span>
                                )}
                            </div>
                            <input
                                aria-label={`${type.name} answer lines`}
                                type="number"
                                min={1}
                                max={30}
                                step={1}
                                value={values[type.id] ?? type.lines}
                                disabled={!canEdit}
                                onChange={(event) =>
                                    setValues((current) => ({
                                        ...current,
                                        [type.id]: Number(event.target.value),
                                    }))
                                }
                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-brand-500 disabled:opacity-50"
                            />
                            <Switch
                                aria-label={`Start ${type.name} on a new page`}
                                checked={pageBreaks[type.id] ?? type.page_break}
                                disabled={!canEdit}
                                onCheckedChange={(checked) =>
                                    setPageBreaks((current) => ({
                                        ...current,
                                        [type.id]: checked,
                                    }))
                                }
                            />
                        </div>
                    ))}
                    {questionTypes.length === 0 && (
                        <div className="px-5 py-8 text-sm text-muted-foreground">
                            No subjective question types in this subject.
                        </div>
                    )}
                    {canEdit && questionTypes.length > 0 && (
                        <div className="flex justify-end border-t px-5 py-3">
                            <Button onClick={save} disabled={saving}>
                                <SaveIcon className="mr-2 size-4" /> Save
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

ESheetAnswerSpaces.layout = {
    breadcrumbs: [
        {
            title: 'E-Sheet Answer Spaces',
            href: '/superadmin/e-sheet-answer-spaces',
        },
    ],
};

import { router } from '@inertiajs/react';
import { Layers3Icon, SaveIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FloatingCombobox } from '@/components/ui/floating-combobox';
import type { ComboboxOptionItem } from '@/components/ui/floating-combobox';
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

interface MultipartSetting {
    id: number;
    is_active: boolean;
    part_type_ids: number[];
    heading_en: string | null;
    heading_ur: string | null;
}

function findOption(options: ComboboxOptionItem[], id: number | null) {
    return options.find((option) => Number(option.id) === id) ?? null;
}

export default function MultipartQuestionSettings({
    scopeCatalog,
    selectedScope,
    questionTypes,
    setting,
}: {
    scopeCatalog: ScopeCatalog;
    selectedScope: SelectedScope | null;
    questionTypes: QuestionTypeOption[];
    setting: MultipartSetting | null;
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
    const [active, setActive] = useState(setting?.is_active ?? false);
    const [selectedTypeIds, setSelectedTypeIds] = useState<number[]>(
        setting?.part_type_ids ?? [],
    );
    const [headingEn, setHeadingEn] = useState(setting?.heading_en ?? '');
    const [headingUr, setHeadingUr] = useState(setting?.heading_ur ?? '');
    const [saving, setSaving] = useState(false);

    const patternOptions = useMemo(
        () =>
            scopeCatalog.patterns.map((item) => ({
                id: item.id,
                label: item.name,
            })),
        [scopeCatalog.patterns],
    );
    const classOptions = useMemo(
        () =>
            scopeCatalog.patternClasses
                .filter((item) => item.pattern_id === patternId)
                .map((item) => ({ id: item.id, label: item.name })),
        [scopeCatalog.patternClasses, patternId],
    );
    const subjectOptions = useMemo(
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
    const loaded = Boolean(
        selectedScope &&
            selectedScope.pattern_id === patternId &&
            selectedScope.class_id === classId &&
            selectedScope.subject_id === subjectId,
    );

    const resetForm = () => {
        setActive(false);
        setSelectedTypeIds([]);
        setHeadingEn('');
        setHeadingUr('');
    };

    const selectScope = (
        nextPatternId: number | null,
        nextClassId: number | null,
        nextSubjectId: number | null,
    ) => {
        setPatternId(nextPatternId);
        setClassId(nextClassId);
        setSubjectId(nextSubjectId);
        resetForm();

        if (nextPatternId && nextClassId && nextSubjectId) {
            router.get(
                '/superadmin/multipart-question-settings',
                {
                    pattern_id: nextPatternId,
                    class_id: nextClassId,
                    subject_id: nextSubjectId,
                },
                { preserveState: true, preserveScroll: true },
            );
        }
    };

    const save = () => {
        if (!canEdit || !patternId || !classId || !subjectId) {
            return;
        }

        setSaving(true);
        const payload = {
            pattern_id: patternId,
            class_id: classId,
            subject_id: subjectId,
            is_active: active,
            max_parts: Math.max(2, selectedTypeIds.length),
            choice_count: 1,
            heading_en: headingEn,
            heading_ur: headingUr,
            part_type_ids: selectedTypeIds,
        };
        const options = {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        };

        if (setting?.id && loaded) {
            router.patch(
                `/superadmin/multipart-question-settings/${setting.id}`,
                payload,
                options,
            );
        } else {
            router.post(
                '/superadmin/multipart-question-settings',
                payload,
                options,
            );
        }
    };

    return (
        <div className="w-full min-w-0 space-y-6 p-4 md:p-6">
            <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                    <Layers3Icon className="size-5" />
                </span>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    Multi Part Questions
                </h1>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
                <div key={`${patternId}-${classId}-${subjectId}-${setting?.id ?? 'new'}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            English Heading
                            <input
                                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-slate-700"
                                value={headingEn}
                                onChange={(event) =>
                                    setHeadingEn(event.target.value)
                                }
                                disabled={!canEdit}
                            />
                        </label>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            Urdu Heading
                            <input
                                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-slate-700"
                                dir="rtl"
                                value={headingUr}
                                onChange={(event) =>
                                    setHeadingUr(event.target.value)
                                }
                                disabled={!canEdit}
                            />
                        </label>
                    </div>

                    <div className="mt-5 flex justify-end border-y border-slate-100 py-4 dark:border-slate-800">
                        <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                Active
                            </span>
                            <Switch
                                checked={active}
                                onCheckedChange={setActive}
                                disabled={!canEdit}
                            />
                        </div>
                    </div>

                    <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {questionTypes.map((type) => {
                            const checked = selectedTypeIds.includes(type.id);

                            return (
                                <label
                                    key={type.id}
                                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm transition ${
                                        checked
                                            ? 'border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-200'
                                            : 'border-slate-200 text-slate-700 hover:border-brand-300 dark:border-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="size-4 accent-brand-600"
                                        checked={checked}
                                        onChange={() =>
                                            setSelectedTypeIds((current) =>
                                                checked
                                                    ? current.filter(
                                                          (id) => id !== type.id,
                                                      )
                                                    : [...current, type.id],
                                            )
                                        }
                                        disabled={!canEdit}
                                    />
                                    <span>{type.name}</span>
                                </label>
                            );
                        })}
                    </div>

                    <div className="mt-6 flex justify-end">
                        <Button onClick={save} disabled={!canEdit || saving || selectedTypeIds.length < 2}>
                            <SaveIcon className="mr-2 size-4" />
                            {saving ? 'Saving…' : 'Save'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

MultipartQuestionSettings.layout = {
    breadcrumbs: [
        {
            title: 'Multi Part Questions',
            href: '/superadmin/multipart-question-settings',
        },
    ],
};
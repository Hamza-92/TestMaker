import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    HeadingIcon,
    PencilIcon,
    PlusIcon,
    SaveIcon,
    Trash2Icon,
} from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { FloatingCombobox } from '@/components/ui/floating-combobox';
import type { ComboboxOptionItem } from '@/components/ui/floating-combobox';
import { Input } from '@/components/ui/input';
import { usePermission } from '@/hooks/use-permission';

interface QuestionType {
    id: number;
    name: string;
    name_ur: string | null;
    heading_en: string;
    heading_ur: string | null;
    is_objective: boolean;
}

interface Catalog {
    patterns: { id: number; name: string }[];
    patternClasses: { pattern_id: number; id: number; name: string }[];
    classSubjects: {
        pattern_id: number;
        class_id: number;
        subject_id: number;
        name: string;
    }[];
}

interface HeadingRule {
    id: number;
    pattern_id: number;
    class_id: number | null;
    subject_id: number | null;
    heading_en: string | null;
    heading_ur: string | null;
}

interface RuleForm {
    pattern_id: number | null;
    class_id: number | null;
    subject_id: number | null;
    heading_en: string;
    heading_ur: string;
}

function optionFor(options: ComboboxOptionItem[], id: number | null) {
    return options.find((option) => Number(option.id) === id) ?? null;
}

export default function QuestionTypeHeadingRules({
    questionType,
    catalog,
    rules,
}: {
    questionType: QuestionType;
    catalog: Catalog;
    rules: HeadingRule[];
}) {
    const { can } = usePermission();
    const canEdit = can('question_types.edit');
    const form = useForm<RuleForm>({
        pattern_id: null,
        class_id: null,
        subject_id: null,
        heading_en: '',
        heading_ur: '',
    });
    const patternOptions = useMemo<ComboboxOptionItem[]>(
        () =>
            catalog.patterns.map((pattern) => ({
                id: pattern.id,
                label: pattern.name,
            })),
        [catalog.patterns],
    );
    const classOptions = useMemo<ComboboxOptionItem[]>(
        () =>
            catalog.patternClasses
                .filter((item) => item.pattern_id === form.data.pattern_id)
                .map((item) => ({ id: item.id, label: item.name })),
        [catalog.patternClasses, form.data.pattern_id],
    );
    const subjectOptions = useMemo<ComboboxOptionItem[]>(
        () =>
            catalog.classSubjects
                .filter(
                    (item) =>
                        item.pattern_id === form.data.pattern_id &&
                        item.class_id === form.data.class_id,
                )
                .map((item) => ({ id: item.subject_id, label: item.name })),
        [catalog.classSubjects, form.data.class_id, form.data.pattern_id],
    );
    const exactRule = rules.find(
        (rule) =>
            rule.pattern_id === form.data.pattern_id &&
            rule.class_id === form.data.class_id &&
            rule.subject_id === form.data.subject_id,
    );

    function inheritedHeading(field: 'heading_en' | 'heading_ur') {
        let heading = questionType[field] ?? '';

        if (form.data.pattern_id === null) {
            return heading;
        }

        const matchingRules = rules
            .filter(
                (rule) =>
                    rule.id !== exactRule?.id &&
                    rule.pattern_id === form.data.pattern_id &&
                    (rule.class_id === null ||
                        rule.class_id === form.data.class_id) &&
                    (rule.subject_id === null ||
                        rule.subject_id === form.data.subject_id),
            )
            .sort(
                (left, right) =>
                    Number(left.class_id !== null) -
                        Number(right.class_id !== null) ||
                    Number(left.subject_id !== null) -
                        Number(right.subject_id !== null),
            );

        for (const rule of matchingRules) {
            if (rule?.[field]) {
                heading = rule[field] ?? heading;
            }
        }

        return heading;
    }

    function loadScope(
        patternId: number | null,
        classId: number | null,
        subjectId: number | null,
    ) {
        const rule = rules.find(
            (item) =>
                item.pattern_id === patternId &&
                item.class_id === classId &&
                item.subject_id === subjectId,
        );
        form.clearErrors();
        form.setData({
            pattern_id: patternId,
            class_id: classId,
            subject_id: subjectId,
            heading_en: rule?.heading_en ?? '',
            heading_ur: rule?.heading_ur ?? '',
        });
    }

    function submit(event: React.FormEvent) {
        event.preventDefault();
        form.put(`/superadmin/question-types/${questionType.id}/headings`, {
            preserveScroll: true,
            preserveState: 'errors',
            onSuccess: () => form.reset(),
        });
    }

    function editRule(rule: HeadingRule) {
        loadScope(
            rule.pattern_id,
            rule.class_id ?? null,
            rule.subject_id ?? null,
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function deleteRule(rule: HeadingRule) {
        if (!window.confirm('Remove this heading rule?')) {
            return;
        }

        router.delete(
            `/superadmin/question-types/${questionType.id}/headings/${rule.id}`,
            { preserveScroll: true },
        );
    }

    function scopeLabel(rule: HeadingRule) {
        const pattern =
            catalog.patterns.find((item) => item.id === rule.pattern_id)
                ?.name ?? `Pattern #${rule.pattern_id}`;
        const schoolClass =
            catalog.patternClasses.find(
                (item) =>
                    item.pattern_id === rule.pattern_id &&
                    item.id === rule.class_id,
            )?.name ??
            (rule.class_id === null ? null : `Class #${rule.class_id}`);
        const subject =
            catalog.classSubjects.find(
                (item) =>
                    item.pattern_id === rule.pattern_id &&
                    item.class_id === rule.class_id &&
                    item.subject_id === rule.subject_id,
            )?.name ??
            (rule.subject_id === null ? null : `Subject #${rule.subject_id}`);

        return [pattern, schoolClass, subject].filter(Boolean).join(' / ');
    }

    return (
        <>
            <Head title={`${questionType.name} Headings`} />
            <div className="space-y-5 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/superadmin/question-types/headings"
                            className="flex size-10 items-center justify-center rounded-xl border hover:bg-accent"
                            aria-label="Back to type headings"
                        >
                            <ArrowLeftIcon className="size-4" />
                        </Link>
                        <div>
                            <h1 className="h1-semibold">
                                {questionType.name} Headings
                            </h1>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border bg-card px-4 py-3 text-sm shadow-sm">
                    <span className="flex items-center gap-2 font-semibold">
                        <HeadingIcon className="size-4 text-primary" />
                        Default
                    </span>
                    <span>{questionType.heading_en}</span>
                    {questionType.heading_ur && (
                        <span
                            dir="rtl"
                            className="text-right"
                            style={{
                                fontFamily: '"Jameel Noori Nastaleeq", serif',
                                fontSize: '16px',
                            }}
                        >
                            {questionType.heading_ur}
                        </span>
                    )}
                </div>

                <div>
                    <form
                        onSubmit={submit}
                        className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
                    >
                        <div className="flex items-center gap-2">
                            <PlusIcon className="size-4 text-primary" />
                            <h2 className="font-semibold">
                                {exactRule
                                    ? 'Edit heading rule'
                                    : 'Add heading rule'}
                            </h2>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                            <FloatingCombobox
                                label="Pattern"
                                options={patternOptions}
                                value={optionFor(
                                    patternOptions,
                                    form.data.pattern_id,
                                )}
                                onChange={(option) =>
                                    loadScope(
                                        option ? Number(option.id) : null,
                                        null,
                                        null,
                                    )
                                }
                                disabled={!canEdit || form.processing}
                                placeholder="Choose pattern"
                            />
                            <div>
                                <FloatingCombobox
                                    label="Class"
                                    options={classOptions}
                                    value={optionFor(
                                        classOptions,
                                        form.data.class_id,
                                    )}
                                    onChange={(option) =>
                                        loadScope(
                                            form.data.pattern_id,
                                            option ? Number(option.id) : null,
                                            null,
                                        )
                                    }
                                    disabled={
                                        !canEdit ||
                                        form.processing ||
                                        form.data.pattern_id === null
                                    }
                                    placeholder="All classes"
                                />
                            </div>
                            <div>
                                <FloatingCombobox
                                    label="Subject"
                                    options={subjectOptions}
                                    value={optionFor(
                                        subjectOptions,
                                        form.data.subject_id,
                                    )}
                                    onChange={(option) =>
                                        loadScope(
                                            form.data.pattern_id,
                                            form.data.class_id,
                                            option ? Number(option.id) : null,
                                        )
                                    }
                                    disabled={
                                        !canEdit ||
                                        form.processing ||
                                        form.data.class_id === null
                                    }
                                    placeholder="All subjects"
                                />
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="heading-en"
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    English heading
                                </label>
                                <Input
                                    id="heading-en"
                                    type="text"
                                    maxLength={150}
                                    value={form.data.heading_en}
                                    onChange={(event) =>
                                        form.setData(
                                            'heading_en',
                                            event.target.value,
                                        )
                                    }
                                    disabled={!canEdit || form.processing}
                                    placeholder={`Inherited: ${inheritedHeading('heading_en')}`}
                                />
                                {form.errors.heading_en && (
                                    <p className="mt-1 text-xs text-destructive">
                                        {form.errors.heading_en}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label
                                    htmlFor="heading-ur"
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Urdu heading
                                </label>
                                <Input
                                    id="heading-ur"
                                    type="text"
                                    dir="rtl"
                                    maxLength={150}
                                    value={form.data.heading_ur}
                                    onChange={(event) =>
                                        form.setData(
                                            'heading_ur',
                                            event.target.value,
                                        )
                                    }
                                    disabled={!canEdit || form.processing}
                                    placeholder={
                                        inheritedHeading('heading_ur') ||
                                        'Inherited Urdu heading'
                                    }
                                    className="text-right"
                                    style={{
                                        fontFamily:
                                            '"Jameel Noori Nastaleeq", serif',
                                        fontSize: '16px',
                                    }}
                                />
                                {form.errors.heading_ur && (
                                    <p className="mt-1 text-xs text-destructive">
                                        {form.errors.heading_ur}
                                    </p>
                                )}
                            </div>
                        </div>

                        {canEdit && (
                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={
                                        form.processing ||
                                        form.data.pattern_id === null ||
                                        (!form.data.heading_en.trim() &&
                                            !form.data.heading_ur.trim())
                                    }
                                >
                                    <SaveIcon className="size-4" />
                                    {form.processing
                                        ? 'Saving…'
                                        : exactRule
                                          ? 'Update rule'
                                          : 'Add rule'}
                                </Button>
                            </div>
                        )}
                    </form>
                </div>

                <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
                        <h2 className="font-semibold">Heading rules</h2>
                        <span className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                            {rules.length}
                        </span>
                    </div>
                    {rules.length === 0 ? (
                        <div className="px-5 py-7 text-center text-sm text-muted-foreground">
                            No heading rules.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] table-fixed text-sm">
                                <thead className="border-b bg-muted/30 text-left text-xs font-semibold text-muted-foreground">
                                    <tr>
                                        <th className="w-1/4 px-5 py-2.5">
                                            Scope
                                        </th>
                                        <th className="w-[32%] px-5 py-2.5">
                                            English heading
                                        </th>
                                        <th className="w-[32%] px-5 py-2.5 text-right">
                                            Urdu heading
                                        </th>
                                        <th className="w-24 px-5 py-2.5 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {rules.map((rule) => (
                                        <tr key={rule.id}>
                                            <td className="px-5 py-3 font-medium">
                                                {scopeLabel(rule)}
                                            </td>
                                            <td className="px-5 py-3 text-muted-foreground">
                                                {rule.heading_en ||
                                                    'Inherit English'}
                                            </td>
                                            <td
                                                dir="rtl"
                                                className="px-5 py-3 text-right text-muted-foreground"
                                                style={{
                                                    fontFamily:
                                                        '"Jameel Noori Nastaleeq", serif',
                                                    fontSize: '16px',
                                                }}
                                            >
                                                {rule.heading_ur ||
                                                    'اردو عنوان وراثت میں'}
                                            </td>
                                            <td className="px-5 py-3">
                                                {canEdit && (
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                editRule(rule)
                                                            }
                                                            title="Edit rule"
                                                            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                                                        >
                                                            <PencilIcon className="size-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                deleteRule(rule)
                                                            }
                                                            title="Delete rule"
                                                            className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                        >
                                                            <Trash2Icon className="size-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

QuestionTypeHeadingRules.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Type Headings', href: '/superadmin/question-types/headings' },
        { title: 'Rules' },
    ],
};

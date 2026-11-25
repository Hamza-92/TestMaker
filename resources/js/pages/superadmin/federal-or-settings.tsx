import { Head, Link, router, useForm } from '@inertiajs/react';
import { Layers3Icon } from 'lucide-react';
import { useState } from 'react';
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
import { usePermission } from '@/hooks/use-permission';

const PAGE_URL = '/superadmin/paper-layouts/federal-or';

interface FederalOrOptions {
    subjectId: number;
    questionTypes: { id: number; name: string }[];
    singleQuestionTypeIds: number[];
}

interface FederalSubject {
    id: number;
    patternId: number;
    patternName: string;
    classId: number;
    className: string;
    name: string;
}

export default function FederalOrSettings({
    federalSubjects,
    federalOr,
}: {
    federalSubjects: FederalSubject[];
    federalOr: FederalOrOptions | null;
}) {
    const { can } = usePermission();
    const initialScope = federalSubjects.find(
        (item) => item.id === federalOr?.subjectId,
    );
    const [patternId, setPatternId] = useState<number | null>(
        initialScope?.patternId ?? null,
    );
    const [classId, setClassId] = useState<number | null>(
        initialScope?.classId ?? null,
    );
    const [subjectId, setSubjectId] = useState<number | null>(
        initialScope?.id ?? null,
    );

    const patternOptions = Array.from(
        new Map(
            federalSubjects.map((item) => [item.patternId, item.patternName]),
        ),
        ([id, label]) => ({ id, label }),
    );
    const patternSubjects = federalSubjects.filter(
        (item) => item.patternId === patternId,
    );
    const classOptions = Array.from(
        new Map(patternSubjects.map((item) => [item.classId, item.className])),
        ([id, label]) => ({ id, label }),
    );
    const subjectOptions = patternSubjects
        .filter((item) => item.classId === classId)
        .map((item) => ({ id: item.id, label: item.name }));
    const loadedOptions = federalOr?.subjectId === subjectId ? federalOr : null;

    return (
        <>
            <Head title="Federal Board OR pairing" />
            <div className="space-y-5 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="h1-semibold">Federal Board OR pairing</h1>
                    <Button variant="outline" asChild>
                        <Link href="/superadmin/paper-layouts">
                            Back to Paper Layouts
                        </Link>
                    </Button>
                </div>
                <section className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <Layers3Icon className="size-5 text-primary" />
                        <h2 className="text-sm font-semibold">Federal scope</h2>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                        <FloatingCombobox
                            label="Pattern"
                            options={patternOptions}
                            value={findOption(patternOptions, patternId)}
                            onChange={(item) => {
                                setPatternId(item ? Number(item.id) : null);
                                setClassId(null);
                                setSubjectId(null);
                            }}
                        />
                        <FloatingCombobox
                            label="Class"
                            options={classOptions}
                            value={findOption(classOptions, classId)}
                            disabled={patternId === null}
                            onChange={(item) => {
                                setClassId(item ? Number(item.id) : null);
                                setSubjectId(null);
                            }}
                        />
                        <FloatingCombobox
                            label="Subject"
                            options={subjectOptions}
                            value={findOption(subjectOptions, subjectId)}
                            disabled={classId === null}
                            onChange={(item) => {
                                const id = item ? Number(item.id) : null;
                                setSubjectId(id);

                                if (id !== null) {
                                    router.get(
                                        PAGE_URL,
                                        { federal_subject: id },
                                        {
                                            preserveScroll: true,
                                            replace: true,
                                        },
                                    );
                                }
                            }}
                        />
                    </div>
                </section>

                {loadedOptions ? (
                    <FederalOrForm
                        key={loadedOptions.subjectId}
                        options={loadedOptions}
                        canEdit={can('patterns.edit')}
                    />
                ) : (
                    <div className="rounded-xl border border-dashed bg-muted/10 px-6 py-14 text-center text-sm text-muted-foreground">
                        {federalSubjects.length === 0
                            ? 'No subjects use the Federal Board layout.'
                            : 'Select a pattern, class, and subject to configure OR pairing.'}
                    </div>
                )}
            </div>
        </>
    );
}

function findOption(options: ComboboxOptionItem[], id: number | null) {
    return options.find((item) => Number(item.id) === id) ?? null;
}

function FederalOrForm({
    options,
    canEdit,
}: {
    options: FederalOrOptions;
    canEdit: boolean;
}) {
    const form = useForm({
        single_question_type_ids: options.singleQuestionTypeIds,
    });

    return (
        <form
            className="space-y-4 rounded-xl border bg-card p-5 shadow-sm"
            onSubmit={(event) => {
                event.preventDefault();

                form.put(PAGE_URL + '/' + options.subjectId, {
                    preserveScroll: true,
                    onSuccess: () => form.setDefaults(),
                });
            }}
        >
            <h2 className="text-sm font-semibold">Subjective question types</h2>
            {options.questionTypes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    No subjective question types are available.
                </p>
            )}
            {options.questionTypes.length > 0 && (
                <div className="max-w-2xl divide-y rounded-lg border">
                    {options.questionTypes.map((type) => (
                        <div
                            key={type.id}
                            className="flex flex-wrap items-center justify-between gap-2 p-3"
                        >
                            <span className="text-sm font-medium">
                                {type.name}
                            </span>
                            <Select
                                disabled={!canEdit || form.processing}
                                value={
                                    form.data.single_question_type_ids.includes(
                                        type.id,
                                    )
                                        ? 'single'
                                        : 'pair'
                                }
                                onValueChange={(mode) =>
                                    form.setData((data) => ({
                                        ...data,
                                        single_question_type_ids:
                                            mode === 'single'
                                                ? [
                                                      ...data.single_question_type_ids,
                                                      type.id,
                                                  ]
                                                : data.single_question_type_ids.filter(
                                                      (id) => id !== type.id,
                                                  ),
                                    }))
                                }
                            >
                                <SelectTrigger
                                    className="w-40"
                                    aria-label={type.name + ' OR pairing'}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pair">
                                        OR pair
                                    </SelectItem>
                                    <SelectItem value="single">
                                        Single question
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>
            )}

            {form.errors.single_question_type_ids && (
                <p role="alert" className="text-sm text-destructive">
                    {form.errors.single_question_type_ids}
                </p>
            )}
            {canEdit && options.questionTypes.length > 0 && (
                <Button
                    type="submit"
                    disabled={!form.isDirty || form.processing}
                >
                    {form.processing
                        ? 'Saving…'
                        : form.recentlySuccessful
                          ? 'Saved'
                          : 'Save OR settings'}
                </Button>
            )}
        </form>
    );
}

FederalOrSettings.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Paper Layouts', href: '/superadmin/paper-layouts' },
        { title: 'Federal OR pairing', href: PAGE_URL },
    ],
};

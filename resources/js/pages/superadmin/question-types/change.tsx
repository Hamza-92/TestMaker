import { Head, router } from '@inertiajs/react';
import { ArrowRightLeftIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
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

interface TypeOption {
    id: number;
    name: string;
    is_objective: boolean;
    schema_key: string;
}

interface ScopedType extends TypeOption {
    questions_count: number;
}

interface Filters {
    pattern_id: number | null;
    class_id: number | null;
    subject_id: number | null;
}

const NONE = '__none__';

export default function ChangeQuestionTypes({
    catalog,
    filters,
    scopedTypes,
    questionTypes,
}: {
    catalog: Catalog;
    filters: Filters;
    scopedTypes: ScopedType[];
    questionTypes: TypeOption[];
}) {
    const { can } = usePermission();
    const canEditQuestions = can('questions.edit');
    const [patternId, setPatternId] = useState(
        filters.pattern_id ? String(filters.pattern_id) : '',
    );
    const [classId, setClassId] = useState(
        filters.class_id ? String(filters.class_id) : '',
    );
    const [subjectId, setSubjectId] = useState(
        filters.subject_id ? String(filters.subject_id) : '',
    );
    const [sourceType, setSourceType] = useState<ScopedType | null>(null);
    const [targetTypeId, setTargetTypeId] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    const classOptions = useMemo(
        () =>
            catalog.patternClasses.filter(
                (item) => String(item.pattern_id) === patternId,
            ),
        [catalog.patternClasses, patternId],
    );
    const subjectOptions = useMemo(
        () =>
            catalog.classSubjects.filter(
                (item) =>
                    String(item.pattern_id) === patternId &&
                    String(item.class_id) === classId,
            ),
        [catalog.classSubjects, classId, patternId],
    );
    const scopeLoaded =
        String(filters.pattern_id ?? '') === patternId &&
        String(filters.class_id ?? '') === classId &&
        String(filters.subject_id ?? '') === subjectId;
    const compatibleTypes = useMemo(
        () =>
            sourceType === null
                ? []
                : questionTypes.filter(
                      (type) =>
                          type.id !== sourceType.id &&
                          type.schema_key === sourceType.schema_key,
                  ),
        [questionTypes, sourceType],
    );
    const targetOptions = useMemo<ComboboxOptionItem[]>(
        () =>
            compatibleTypes.map((type) => ({
                id: type.id,
                label: type.name,
            })),
        [compatibleTypes],
    );

    const loadScope = (nextSubjectId: string) => {
        setSubjectId(nextSubjectId);

        if (!patternId || !classId || !nextSubjectId) {
            return;
        }

        router.get(
            '/superadmin/question-types/change',
            {
                pattern_id: Number(patternId),
                class_id: Number(classId),
                subject_id: Number(nextSubjectId),
            },
            {
                preserveState: true,
                replace: true,
                only: ['filters', 'scopedTypes'],
            },
        );
    };

    const closeModal = () => {
        if (processing) {
            return;
        }

        setSourceType(null);
        setTargetTypeId(null);
        setError('');
    };

    const changeType = () => {
        if (!sourceType || !targetTypeId || !scopeLoaded) {
            return;
        }

        setProcessing(true);
        setError('');
        router.patch(
            '/superadmin/question-types/change',
            {
                pattern_id: Number(patternId),
                class_id: Number(classId),
                subject_id: Number(subjectId),
                source_question_type_id: sourceType.id,
                question_type_id: targetTypeId,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSourceType(null);
                    setTargetTypeId(null);
                    setError('');
                },
                onError: (errors) =>
                    setError(
                        Object.values(errors)[0] ??
                            'The question type could not be changed.',
                    ),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <>
            <Head title="Change Question Types" />
            <div className="space-y-5 p-4 md:p-6">
                <h1 className="h1-semibold">Change Question Types</h1>

                <section className="rounded-2xl border bg-card p-4 shadow-sm">
                    <div className="grid gap-3 md:grid-cols-3">
                        <Select
                            value={patternId || NONE}
                            onValueChange={(value) => {
                                setPatternId(value === NONE ? '' : value);
                                setClassId('');
                                setSubjectId('');
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Pattern" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NONE}>Pattern</SelectItem>
                                {catalog.patterns.map((pattern) => (
                                    <SelectItem
                                        key={pattern.id}
                                        value={String(pattern.id)}
                                    >
                                        {pattern.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={classId || NONE}
                            onValueChange={(value) => {
                                setClassId(value === NONE ? '' : value);
                                setSubjectId('');
                            }}
                            disabled={!patternId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Class" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NONE}>Class</SelectItem>
                                {classOptions.map((schoolClass) => (
                                    <SelectItem
                                        key={schoolClass.id}
                                        value={String(schoolClass.id)}
                                    >
                                        {schoolClass.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={subjectId || NONE}
                            onValueChange={(value) =>
                                loadScope(value === NONE ? '' : value)
                            }
                            disabled={!classId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Subject" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NONE}>Subject</SelectItem>
                                {subjectOptions.map((subject) => (
                                    <SelectItem
                                        key={subject.subject_id}
                                        value={String(subject.subject_id)}
                                    >
                                        {subject.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </section>

                {scopeLoaded && (
                    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px] text-sm">
                                <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                                    <tr>
                                        <th className="px-5 py-3 font-medium">
                                            Question type
                                        </th>
                                        <th className="w-32 px-5 py-3 font-medium">
                                            Kind
                                        </th>
                                        <th className="w-32 px-5 py-3 text-right font-medium">
                                            Questions
                                        </th>
                                        <th className="w-32 px-5 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {scopedTypes.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-5 py-10 text-center text-muted-foreground"
                                            >
                                                No question types found.
                                            </td>
                                        </tr>
                                    ) : (
                                        scopedTypes.map((type) => (
                                            <tr key={type.id}>
                                                <td className="px-5 py-3 font-medium">
                                                    {type.name}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <Badge variant="outline">
                                                        {type.is_objective
                                                            ? 'Objective'
                                                            : 'Subjective'}
                                                    </Badge>
                                                </td>
                                                <td className="px-5 py-3 text-right tabular-nums">
                                                    {type.questions_count.toLocaleString()}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    {canEditQuestions && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSourceType(
                                                                    type,
                                                                );
                                                                setTargetTypeId(
                                                                    null,
                                                                );
                                                                setError('');
                                                            }}
                                                        >
                                                            <ArrowRightLeftIcon className="size-4" />
                                                            Change
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>

            <Dialog
                open={sourceType !== null}
                onOpenChange={(open) => !open && closeModal()}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogTitle>Change {sourceType?.name}</DialogTitle>
                    <DialogDescription className="sr-only">
                        Choose the new question type.
                    </DialogDescription>

                    <FloatingCombobox
                        label="New question type"
                        options={targetOptions}
                        value={
                            targetOptions.find(
                                (option) => Number(option.id) === targetTypeId,
                            ) ?? null
                        }
                        onChange={(option) => {
                            setTargetTypeId(
                                option === null ? null : Number(option.id),
                            );
                            setError('');
                        }}
                        disabled={processing}
                        placeholder="Select question type"
                    />

                    {compatibleTypes.length === 0 ? (
                        <p className="text-sm text-destructive">
                            No compatible question type is available.
                        </p>
                    ) : null}
                    {error ? (
                        <p className="text-sm text-destructive">{error}</p>
                    ) : null}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={closeModal}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={changeType}
                            disabled={processing || targetTypeId === null}
                        >
                            {processing ? 'Changing…' : 'Change type'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

ChangeQuestionTypes.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Question Types', href: '/superadmin/question-types' },
        { title: 'Change Types' },
    ],
};

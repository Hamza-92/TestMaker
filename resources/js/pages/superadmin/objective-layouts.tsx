import { Head, useForm } from '@inertiajs/react';
import {
    CheckCircle2Icon,
    ChevronDownIcon,
    CircleDotIcon,
    SaveIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { usePermission } from '@/hooks/use-permission';

interface LayoutDefinition {
    key: string;
    name: string;
}

interface SubjectItem {
    id: number;
    name: string;
    name_ur: string | null;
    medium: string | null;
    objective_layout: string;
    show_bubbles: boolean;
}

interface ClassItem {
    id: number;
    name: string;
    subjects: SubjectItem[];
}

interface PatternItem {
    id: number;
    name: string;
    short_name: string | null;
    classes: ClassItem[];
}

interface Assignment {
    pattern_id: number;
    class_id: number;
    subject_id: number;
    objective_layout: string;
    show_bubbles: boolean;
}

interface FormData {
    assignments: Assignment[];
    [key: string]: Assignment[];
}

function assignmentKey(
    assignment: Pick<Assignment, 'pattern_id' | 'class_id' | 'subject_id'>,
): string {
    return `${assignment.pattern_id}:${assignment.class_id}:${assignment.subject_id}`;
}

export default function ObjectiveLayouts({
    layouts,
    patterns,
}: {
    layouts: LayoutDefinition[];
    patterns: PatternItem[];
}) {
    const { can } = usePermission();
    const canEdit = can('patterns.edit');
    const initialAssignments = useMemo(
        () =>
            patterns.flatMap((pattern) =>
                pattern.classes.flatMap((schoolClass) =>
                    schoolClass.subjects.map((subject) => ({
                        pattern_id: pattern.id,
                        class_id: schoolClass.id,
                        subject_id: subject.id,
                        objective_layout: subject.objective_layout,
                        show_bubbles: subject.show_bubbles,
                    })),
                ),
            ),
        [patterns],
    );
    const {
        data,
        setData,
        transform,
        put,
        processing,
        errors,
        recentlySuccessful,
    } = useForm<FormData>({ assignments: initialAssignments });
    const initialByScope = useMemo(
        () =>
            new Map(
                initialAssignments.map((assignment) => [
                    assignmentKey(assignment),
                    assignment,
                ]),
            ),
        [initialAssignments],
    );
    const assignmentsByScope = useMemo(
        () =>
            new Map(
                data.assignments.map((assignment) => [
                    assignmentKey(assignment),
                    assignment,
                ]),
            ),
        [data.assignments],
    );
    const changedAssignments = useMemo(
        () =>
            data.assignments.filter((assignment) => {
                const original = initialByScope.get(assignmentKey(assignment));

                return (
                    original?.objective_layout !==
                        assignment.objective_layout ||
                    original?.show_bubbles !== assignment.show_bubbles
                );
            }),
        [data.assignments, initialByScope],
    );
    const isDirty = changedAssignments.length > 0;

    function updateAssignment(
        patternId: number,
        classId: number,
        subjectId: number,
        patch: Partial<Pick<Assignment, 'objective_layout' | 'show_bubbles'>>,
    ) {
        setData(
            'assignments',
            data.assignments.map((assignment) => {
                if (
                    assignment.pattern_id !== patternId ||
                    assignment.class_id !== classId ||
                    assignment.subject_id !== subjectId
                ) {
                    return assignment;
                }

                const next = { ...assignment, ...patch };

                if (next.objective_layout !== 'federal-row') {
                    next.show_bubbles = false;
                }

                return next;
            }),
        );
    }

    function submit(event: React.FormEvent) {
        event.preventDefault();
        transform(() => ({ assignments: changedAssignments }));
        put('/superadmin/objective-layouts', { preserveScroll: true });
    }

    return (
        <>
            <Head title="Objective Layouts" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="h1-semibold">Objective Layouts</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Assign the one-line Federal objective table per
                            subject and choose whether answer bubbles appear.
                        </p>
                    </div>
                    {canEdit && (
                        <Button
                            type="submit"
                            form="objective-layout-assignments"
                            disabled={!isDirty || processing}
                            className="gap-2"
                        >
                            {recentlySuccessful ? (
                                <CheckCircle2Icon className="size-4" />
                            ) : (
                                <SaveIcon className="size-4" />
                            )}
                            {processing
                                ? 'Saving…'
                                : recentlySuccessful
                                  ? 'Saved'
                                  : 'Save assignments'}
                        </Button>
                    )}
                </div>

                <form
                    id="objective-layout-assignments"
                    onSubmit={submit}
                    className="overflow-hidden rounded-xl border bg-card shadow-sm"
                >
                    <div className="flex items-start gap-3 border-b bg-muted/20 p-5">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <CircleDotIcon className="size-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold">
                                Subject assignments
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Default preserves the current paper. The
                                one-line layout prints one table row per MCQ;
                                bubbles are controlled separately.
                            </p>
                        </div>
                    </div>

                    {errors.assignments && (
                        <p className="border-b bg-destructive/5 px-5 py-3 text-sm text-destructive">
                            {errors.assignments}
                        </p>
                    )}

                    <div className="divide-y">
                        {patterns.map((pattern) => {
                            const patternAssignments = data.assignments.filter(
                                (item) => item.pattern_id === pattern.id,
                            );
                            const configuredCount = patternAssignments.filter(
                                (item) =>
                                    item.objective_layout === 'federal-row',
                            ).length;

                            return (
                                <Collapsible key={pattern.id}>
                                    <CollapsibleTrigger
                                        type="button"
                                        className="group flex w-full items-center justify-between gap-4 bg-muted/10 px-5 py-3 text-left transition-colors hover:bg-muted/20"
                                    >
                                        <div>
                                            <p className="font-semibold">
                                                {pattern.name}
                                                {pattern.short_name
                                                    ? ` (${pattern.short_name})`
                                                    : ''}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {configuredCount > 0
                                                    ? `${configuredCount} subject${configuredCount === 1 ? '' : 's'} configured`
                                                    : 'No objective overrides'}
                                            </p>
                                        </div>
                                        <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="border-t">
                                        <div className="divide-y">
                                            {pattern.classes.map(
                                                (schoolClass) => (
                                                    <Collapsible
                                                        key={schoolClass.id}
                                                    >
                                                        <CollapsibleTrigger
                                                            type="button"
                                                            className="group flex w-full items-center justify-between bg-background px-5 py-3 pl-8 text-left hover:bg-muted/10"
                                                        >
                                                            <span className="text-sm font-medium">
                                                                {
                                                                    schoolClass.name
                                                                }
                                                            </span>
                                                            <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent className="border-t">
                                                            <div className="divide-y">
                                                                {schoolClass.subjects.map(
                                                                    (
                                                                        subject,
                                                                    ) => {
                                                                        const assignment =
                                                                            assignmentsByScope.get(
                                                                                assignmentKey(
                                                                                    {
                                                                                        pattern_id:
                                                                                            pattern.id,
                                                                                        class_id:
                                                                                            schoolClass.id,
                                                                                        subject_id:
                                                                                            subject.id,
                                                                                    },
                                                                                ),
                                                                            );

                                                                        if (
                                                                            !assignment
                                                                        ) {
                                                                            return null;
                                                                        }

                                                                        const oneLine =
                                                                            assignment.objective_layout ===
                                                                            'federal-row';

                                                                        return (
                                                                            <div
                                                                                key={
                                                                                    subject.id
                                                                                }
                                                                                className="grid gap-3 px-5 py-3 pl-12 md:grid-cols-[minmax(0,1fr)_260px_150px] md:items-center"
                                                                            >
                                                                                <div className="min-w-0">
                                                                                    <p className="truncate text-sm font-medium">
                                                                                        {
                                                                                            subject.name
                                                                                        }
                                                                                    </p>
                                                                                    <p className="text-xs text-muted-foreground">
                                                                                        {subject.medium ||
                                                                                            'No medium'}
                                                                                        {subject.name_ur
                                                                                            ? ` · ${subject.name_ur}`
                                                                                            : ''}
                                                                                    </p>
                                                                                </div>
                                                                                <Select
                                                                                    value={
                                                                                        assignment.objective_layout
                                                                                    }
                                                                                    disabled={
                                                                                        !canEdit
                                                                                    }
                                                                                    onValueChange={(
                                                                                        value,
                                                                                    ) =>
                                                                                        updateAssignment(
                                                                                            pattern.id,
                                                                                            schoolClass.id,
                                                                                            subject.id,
                                                                                            {
                                                                                                objective_layout:
                                                                                                    value,
                                                                                            },
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <SelectTrigger>
                                                                                        <SelectValue />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        {layouts.map(
                                                                                            (
                                                                                                layout,
                                                                                            ) => (
                                                                                                <SelectItem
                                                                                                    key={
                                                                                                        layout.key
                                                                                                    }
                                                                                                    value={
                                                                                                        layout.key
                                                                                                    }
                                                                                                >
                                                                                                    {
                                                                                                        layout.name
                                                                                                    }
                                                                                                </SelectItem>
                                                                                            ),
                                                                                        )}
                                                                                    </SelectContent>
                                                                                </Select>
                                                                                <label className="flex items-center justify-between gap-3 text-sm">
                                                                                    <span
                                                                                        className={
                                                                                            oneLine
                                                                                                ? ''
                                                                                                : 'text-muted-foreground'
                                                                                        }
                                                                                    >
                                                                                        Show
                                                                                        bubbles
                                                                                    </span>
                                                                                    <Switch
                                                                                        checked={
                                                                                            assignment.show_bubbles
                                                                                        }
                                                                                        disabled={
                                                                                            !canEdit ||
                                                                                            !oneLine
                                                                                        }
                                                                                        onCheckedChange={(
                                                                                            checked,
                                                                                        ) =>
                                                                                            updateAssignment(
                                                                                                pattern.id,
                                                                                                schoolClass.id,
                                                                                                subject.id,
                                                                                                {
                                                                                                    show_bubbles:
                                                                                                        checked,
                                                                                                },
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                </label>
                                                                            </div>
                                                                        );
                                                                    },
                                                                )}
                                                            </div>
                                                        </CollapsibleContent>
                                                    </Collapsible>
                                                ),
                                            )}
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            );
                        })}
                    </div>
                </form>
            </div>
        </>
    );
}

ObjectiveLayouts.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Objective Layouts', href: '/superadmin/objective-layouts' },
    ],
};

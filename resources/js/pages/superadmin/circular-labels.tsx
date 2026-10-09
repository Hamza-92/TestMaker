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
import { Switch } from '@/components/ui/switch';
import { usePermission } from '@/hooks/use-permission';

interface ClassItem {
    id: number;
    name: string;
    status: number;
    circular_labels_default: boolean;
}

interface PatternItem {
    id: number;
    name: string;
    short_name: string | null;
    status: number;
    classes: ClassItem[];
}

interface Assignment {
    pattern_id: number;
    class_id: number;
    enabled: boolean;
}

interface FormData {
    assignments: Assignment[];
    [key: string]: Assignment[];
}

function scopeKey(patternId: number, classId: number): string {
    return `${patternId}:${classId}`;
}

export default function CircularLabels({
    patterns,
}: {
    patterns: PatternItem[];
}) {
    const { can } = usePermission();
    const canEdit = can('patterns.edit');
    const initialAssignments = useMemo(
        () =>
            patterns.flatMap((pattern) =>
                pattern.classes.map((schoolClass) => ({
                    pattern_id: pattern.id,
                    class_id: schoolClass.id,
                    enabled: schoolClass.circular_labels_default,
                })),
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
                    scopeKey(assignment.pattern_id, assignment.class_id),
                    assignment.enabled,
                ]),
            ),
        [initialAssignments],
    );
    const assignmentsByScope = useMemo(
        () =>
            new Map(
                data.assignments.map((assignment) => [
                    scopeKey(assignment.pattern_id, assignment.class_id),
                    assignment,
                ]),
            ),
        [data.assignments],
    );
    const changedAssignments = useMemo(
        () =>
            data.assignments.filter(
                (assignment) =>
                    initialByScope.get(
                        scopeKey(assignment.pattern_id, assignment.class_id),
                    ) !== assignment.enabled,
            ),
        [data.assignments, initialByScope],
    );

    function updateAssignment(
        patternId: number,
        classId: number,
        enabled: boolean,
    ) {
        setData(
            'assignments',
            data.assignments.map((assignment) =>
                assignment.pattern_id === patternId &&
                assignment.class_id === classId
                    ? { ...assignment, enabled }
                    : assignment,
            ),
        );
    }

    function submit(event: React.FormEvent) {
        event.preventDefault();

        if (!canEdit || changedAssignments.length === 0 || processing) {
            return;
        }

        transform(() => ({ assignments: changedAssignments }));
        put('/superadmin/circular-labels', { preserveScroll: true });
    }

    return (
        <>
            <Head title="Circular Labels" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="h1-semibold">Circular Labels</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Choose the pattern and classes whose new papers
                            start with circular objective option labels.
                        </p>
                    </div>
                    {canEdit && (
                        <Button
                            type="submit"
                            form="circular-label-assignments"
                            disabled={
                                changedAssignments.length === 0 || processing
                            }
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
                    id="circular-label-assignments"
                    onSubmit={submit}
                    className="overflow-hidden rounded-xl border bg-card shadow-sm"
                >
                    <div className="flex items-start gap-3 border-b bg-muted/20 p-5">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <CircleDotIcon className="size-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold">
                                Pattern and class defaults
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                The Circular Labels switch on the paper remains
                                available to turn this on or off for an
                                individual paper.
                            </p>
                        </div>
                    </div>

                    {errors.assignments && (
                        <p className="border-b bg-destructive/5 px-5 py-3 text-sm text-destructive">
                            {errors.assignments}
                        </p>
                    )}

                    {patterns.length === 0 ? (
                        <p className="p-8 text-center text-sm text-muted-foreground">
                            No patterns are available.
                        </p>
                    ) : (
                        <div className="divide-y">
                            {patterns.map((pattern) => {
                                const enabledCount = pattern.classes.filter(
                                    (schoolClass) =>
                                        assignmentsByScope.get(
                                            scopeKey(
                                                pattern.id,
                                                schoolClass.id,
                                            ),
                                        )?.enabled,
                                ).length;

                                return (
                                    <Collapsible key={pattern.id}>
                                        <CollapsibleTrigger
                                            type="button"
                                            className="group flex w-full items-center justify-between gap-4 bg-muted/10 px-5 py-3 text-left transition-colors hover:bg-muted/20"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="font-semibold">
                                                        {pattern.name}
                                                    </p>
                                                    {pattern.short_name && (
                                                        <span className="text-xs text-muted-foreground">
                                                            (
                                                            {pattern.short_name}
                                                            )
                                                        </span>
                                                    )}
                                                    {pattern.status !== 1 && (
                                                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                                            Inactive pattern
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {enabledCount} of{' '}
                                                    {pattern.classes.length}{' '}
                                                    classes enabled
                                                </p>
                                            </div>
                                            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="border-t">
                                            {pattern.classes.length === 0 ? (
                                                <p className="px-5 py-4 text-sm text-muted-foreground">
                                                    No classes are linked to
                                                    this pattern.
                                                </p>
                                            ) : (
                                                <div className="divide-y">
                                                    {pattern.classes.map(
                                                        (schoolClass) => {
                                                            const enabled =
                                                                assignmentsByScope.get(
                                                                    scopeKey(
                                                                        pattern.id,
                                                                        schoolClass.id,
                                                                    ),
                                                                )?.enabled ??
                                                                false;

                                                            return (
                                                                <div
                                                                    key={
                                                                        schoolClass.id
                                                                    }
                                                                    className="flex items-center justify-between gap-4 px-5 py-3 sm:pl-10"
                                                                >
                                                                    <div className="flex min-w-0 items-center gap-2">
                                                                        <span className="text-sm font-medium">
                                                                            {
                                                                                schoolClass.name
                                                                            }
                                                                        </span>
                                                                        {schoolClass.status !==
                                                                            1 && (
                                                                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                                                                Inactive
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <Switch
                                                                        checked={
                                                                            enabled
                                                                        }
                                                                        onCheckedChange={(
                                                                            checked,
                                                                        ) =>
                                                                            updateAssignment(
                                                                                pattern.id,
                                                                                schoolClass.id,
                                                                                checked,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            !canEdit ||
                                                                            processing
                                                                        }
                                                                        aria-label={`Circular labels by default for ${pattern.name}, ${schoolClass.name}`}
                                                                    />
                                                                </div>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            )}
                                        </CollapsibleContent>
                                    </Collapsible>
                                );
                            })}
                        </div>
                    )}
                </form>
            </div>
        </>
    );
}

CircularLabels.layout = {
    breadcrumbs: [
        { title: 'Patterns', href: '/superadmin/patterns' },
        { title: 'Circular Labels', href: '/superadmin/circular-labels' },
    ],
};

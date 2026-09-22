import { Head, useForm } from '@inertiajs/react';
import {
    CheckCircle2Icon,
    ChevronDownIcon,
    LayoutPanelTopIcon,
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
import { usePermission } from '@/hooks/use-permission';

interface PaperLayoutDefinition {
    key: string;
    name: string;
    description: string;
    features: string[];
    patterns_count: number;
}

interface ClassItem {
    id: number;
    name: string;
    status: number;
    paper_layout: string;
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
    paper_layout: string;
}

interface FormData {
    assignments: Assignment[];
    [key: string]: Assignment[];
}

export default function PaperLayouts({
    layouts,
    patterns,
}: {
    layouts: PaperLayoutDefinition[];
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
                    paper_layout: schoolClass.paper_layout,
                })),
            ),
        [patterns],
    );
    const { data, setData, put, processing, errors, recentlySuccessful } =
        useForm<FormData>({ assignments: initialAssignments });

    const isDirty = data.assignments.some((assignment) => {
        const original = initialAssignments.find(
            (item) =>
                item.pattern_id === assignment.pattern_id &&
                item.class_id === assignment.class_id,
        );

        return original?.paper_layout !== assignment.paper_layout;
    });

    const updateLayout = (
        patternId: number,
        classId: number,
        paperLayout: string,
    ) => {
        setData(
            'assignments',
            data.assignments.map((assignment) =>
                assignment.pattern_id === patternId &&
                assignment.class_id === classId
                    ? { ...assignment, paper_layout: paperLayout }
                    : assignment,
            ),
        );
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        put('/superadmin/paper-layouts/assignments', {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Paper Layouts" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="h1-semibold">Paper Layouts</h1>
                    </div>
                    {canEdit && (
                        <Button
                            type="submit"
                            form="paper-layout-assignments"
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
                    id="paper-layout-assignments"
                    onSubmit={submit}
                    className="overflow-hidden rounded-xl border bg-card shadow-sm"
                >
                    <div className="flex items-start gap-3 border-b bg-muted/20 p-5">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <LayoutPanelTopIcon className="size-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold">
                                Pattern and class assignments
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                New papers use the layout assigned to the
                                selected pattern and class. Subject-specific
                                custom layouts continue to take priority.
                            </p>
                        </div>
                    </div>

                    {errors.assignments && (
                        <p className="border-b bg-destructive/5 px-5 py-3 text-sm text-destructive">
                            {errors.assignments}
                        </p>
                    )}

                    {patterns.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            No patterns are available.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {patterns.map((pattern) => {
                                const patternAssignments =
                                    data.assignments.filter(
                                        (assignment) =>
                                            assignment.pattern_id ===
                                            pattern.id,
                                    );
                                const layoutSummary = layouts
                                    .filter(
                                        (layout) => layout.key !== 'standard',
                                    )
                                    .map((layout) => {
                                        const count = patternAssignments.filter(
                                            (assignment) =>
                                                assignment.paper_layout ===
                                                layout.key,
                                        ).length;

                                        return count > 0
                                            ? layout.name + ': ' + count
                                            : null;
                                    })
                                    .filter(
                                        (summary): summary is string =>
                                            summary !== null,
                                    )
                                    .join(' · ');

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
                                                    {pattern.classes.length}{' '}
                                                    {pattern.classes.length ===
                                                    1
                                                        ? 'class'
                                                        : 'classes'}
                                                    {' · '}
                                                    {layoutSummary ||
                                                        'All use Standard'}
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
                                                            const assignment =
                                                                data.assignments.find(
                                                                    (item) =>
                                                                        item.pattern_id ===
                                                                            pattern.id &&
                                                                        item.class_id ===
                                                                            schoolClass.id,
                                                                );

                                                            return (
                                                                <div
                                                                    key={
                                                                        schoolClass.id
                                                                    }
                                                                    className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:pl-10"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-sm font-medium">
                                                                            {
                                                                                schoolClass.name
                                                                            }
                                                                        </p>
                                                                        {schoolClass.status !==
                                                                            1 && (
                                                                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                                                                Inactive
                                                                                class
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <Select
                                                                        value={
                                                                            assignment?.paper_layout ??
                                                                            'standard'
                                                                        }
                                                                        onValueChange={(
                                                                            value,
                                                                        ) =>
                                                                            updateLayout(
                                                                                pattern.id,
                                                                                schoolClass.id,
                                                                                value,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            !canEdit ||
                                                                            processing
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="w-full sm:w-56">
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

PaperLayouts.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Paper Layouts', href: '/superadmin/paper-layouts' },
    ],
};

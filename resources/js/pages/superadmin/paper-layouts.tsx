import { Head, useForm } from '@inertiajs/react';
import {
    CheckCircle2Icon,
    LayoutPanelTopIcon,
    SaveIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
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

interface PatternItem {
    id: number;
    name: string;
    short_name: string | null;
    paper_layout: string;
    status: number;
}

interface Assignment {
    pattern_id: number;
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
            patterns.map((pattern) => ({
                pattern_id: pattern.id,
                paper_layout: pattern.paper_layout,
            })),
        [patterns],
    );
    const { data, setData, put, processing, errors, recentlySuccessful } =
        useForm<FormData>({ assignments: initialAssignments });

    const isDirty = data.assignments.some((assignment) => {
        const original = initialAssignments.find(
            (item) => item.pattern_id === assignment.pattern_id,
        );

        return original?.paper_layout !== assignment.paper_layout;
    });

    const updateLayout = (patternId: number, paperLayout: string) => {
        setData(
            'assignments',
            data.assignments.map((assignment) =>
                assignment.pattern_id === patternId
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
                                Pattern assignments
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                New papers use the layout assigned to their
                                selected pattern. Saved papers keep their saved
                                layout.
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
                                const assignment = data.assignments.find(
                                    (item) => item.pattern_id === pattern.id,
                                );

                                return (
                                    <div
                                        key={pattern.id}
                                        className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-medium">
                                                    {pattern.name}
                                                </p>
                                                {pattern.short_name && (
                                                    <span className="text-xs text-muted-foreground">
                                                        ({pattern.short_name})
                                                    </span>
                                                )}
                                                {pattern.status !== 1 && (
                                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                                        Inactive
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Select
                                            value={
                                                assignment?.paper_layout ??
                                                'standard'
                                            }
                                            onValueChange={(value) =>
                                                updateLayout(pattern.id, value)
                                            }
                                            disabled={!canEdit || processing}
                                        >
                                            <SelectTrigger className="w-full sm:w-56">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {layouts.map((layout) => (
                                                    <SelectItem
                                                        key={layout.key}
                                                        value={layout.key}
                                                    >
                                                        {layout.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
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

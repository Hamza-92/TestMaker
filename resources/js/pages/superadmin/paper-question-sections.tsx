import { Head, router } from '@inertiajs/react';
import { Layers3Icon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
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
    pattern_id: number;
    class_id: number;
    subject_id: number;
}
interface TypeOption {
    id: number;
    name: string;
}
interface PaperSection {
    id: number;
    sort_order: number;
    question_types: TypeOption[];
}

export default function PaperQuestionSections({
    scopeCatalog,
    selectedScope,
    questionTypes,
    sections,
    sectioningActive,
}: {
    scopeCatalog: ScopeCatalog;
    selectedScope: Scope | null;
    questionTypes: TypeOption[];
    sections: PaperSection[];
    sectioningActive: boolean;
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
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<PaperSection | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [deleteTarget, setDeleteTarget] = useState<PaperSection | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [scopeToggleBusy, setScopeToggleBusy] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const patternOptions = useMemo(
        () => scopeCatalog.patterns.map(option),
        [scopeCatalog.patterns],
    );
    const classOptions = useMemo(
        () =>
            scopeCatalog.patternClasses
                .filter((item) => item.pattern_id === patternId)
                .map(option),
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
    const loaded =
        selectedScope?.pattern_id === patternId &&
        selectedScope?.class_id === classId &&
        selectedScope?.subject_id === subjectId;
    const assignedElsewhere = new Set(
        sections
            .filter((section) => section.id !== editing?.id)
            .flatMap((section) =>
                section.question_types.map((type) => type.id),
            ),
    );

    const selectScope = (
        nextPattern: number | null,
        nextClass: number | null,
        nextSubject: number | null,
    ) => {
        setPatternId(nextPattern);
        setClassId(nextClass);
        setSubjectId(nextSubject);
        closeForm();

        if (nextPattern && nextClass && nextSubject) {
            router.get(
                '/superadmin/paper-question-sections',
                {
                    pattern_id: nextPattern,
                    class_id: nextClass,
                    subject_id: nextSubject,
                },
                { preserveState: false, preserveScroll: true, replace: true },
            );
        }
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditing(null);
        setSelectedIds([]);
        setErrors({});
    };

    const openCreate = () => {
        setEditing(null);
        setSelectedIds([]);
        setErrors({});
        setFormOpen(true);
    };

    const openEdit = (section: PaperSection) => {
        setEditing(section);
        setSelectedIds(section.question_types.map((type) => type.id));
        setErrors({});
        setFormOpen(true);
    };

    const save = () => {
        if (!patternId || !classId || !subjectId || selectedIds.length === 0) {
            return;
        }

        setSubmitting(true);
        const url = editing
            ? `/superadmin/paper-question-sections/${editing.id}`
            : '/superadmin/paper-question-sections';
        router[editing ? 'patch' : 'post'](
            url,
            {
                pattern_id: patternId,
                class_id: classId,
                subject_id: subjectId,
                question_type_ids: selectedIds,
            },
            {
                preserveScroll: true,
                onSuccess: closeForm,
                onError: setErrors,
                onFinish: () => setSubmitting(false),
            },
        );
    };

    const toggleScope = (isActive: boolean) => {
        if (!patternId || !classId || !subjectId || scopeToggleBusy) {
            return;
        }

        setScopeToggleBusy(true);
        router.patch(
            '/superadmin/paper-question-sections/scope',
            {
                pattern_id: patternId,
                class_id: classId,
                subject_id: subjectId,
                is_active: isActive,
            },
            {
                preserveScroll: true,
                onFinish: () => setScopeToggleBusy(false),
            },
        );
    };

    return (
        <>
            <Head title="Paper Sections" />
            <div className="space-y-5 p-4 md:p-6">
                <h1 className="h1-semibold">Paper Sections</h1>
                <section className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <Layers3Icon className="size-5 text-primary" />
                        <h2 className="text-sm font-semibold">Section scope</h2>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                        <FloatingCombobox
                            label="Pattern"
                            options={patternOptions}
                            value={find(patternOptions, patternId)}
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
                            options={classOptions}
                            value={find(classOptions, classId)}
                            onChange={(value) =>
                                selectScope(
                                    patternId,
                                    value ? Number(value.id) : null,
                                    null,
                                )
                            }
                            disabled={!patternId}
                        />
                        <FloatingCombobox
                            label="Subject"
                            options={subjectOptions}
                            value={find(subjectOptions, subjectId)}
                            onChange={(value) =>
                                selectScope(
                                    patternId,
                                    classId,
                                    value ? Number(value.id) : null,
                                )
                            }
                            disabled={!classId}
                        />
                    </div>
                </section>

                {!loaded ? (
                    <div className="rounded-xl border border-dashed bg-muted/10 px-6 py-14 text-center text-sm text-muted-foreground">
                        Select a pattern, class, and subject to configure paper
                        sections.
                    </div>
                ) : (
                    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b px-4 py-4 md:px-5">
                            <div>
                                <h2 className="text-sm font-semibold">
                                    Configured sections
                                </h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Section A is reserved for all objective
                                    question types.
                                </p>
                            </div>
                            {canEdit && (
                                <div className="flex flex-wrap items-center justify-end gap-3">
                                    <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-1.5">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {sectioningActive
                                                ? 'Sections active'
                                                : 'Sections inactive'}
                                        </span>
                                        <Switch
                                            checked={sectioningActive}
                                            onCheckedChange={toggleScope}
                                            disabled={scopeToggleBusy}
                                            aria-label="Toggle paper sections for this scope"
                                        />
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={openCreate}
                                        disabled={questionTypes.every((type) =>
                                            assignedElsewhere.has(type.id),
                                        )}
                                    >
                                        <PlusIcon />
                                        Create section
                                    </Button>
                                </div>
                            )}
                        </div>
                        <SectionRow
                            label="Section A"
                            types={[
                                { id: 0, name: 'All objective question types' },
                            ]}
                            locked
                        />
                        {sections.map((section) => (
                            <SectionRow
                                key={section.id}
                                label={sectionLabel(section.sort_order)}
                                types={section.question_types}
                                onEdit={() => openEdit(section)}
                                onDelete={() => setDeleteTarget(section)}
                                locked={!canEdit}
                            />
                        ))}
                        {sections.length === 0 && (
                            <div className="border-t px-5 py-10 text-center text-sm text-muted-foreground">
                                No subjective sections configured yet.
                            </div>
                        )}
                    </section>
                )}
            </div>

            <Dialog
                open={formOpen}
                onOpenChange={(open) => !open && !submitting && closeForm()}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogTitle>
                        {editing
                            ? `Edit ${sectionLabel(editing.sort_order)}`
                            : `Create ${sectionLabel(Math.max(2, sections.length + 2))}`}
                    </DialogTitle>
                    <DialogDescription>
                        Select one or more subjective question types for this
                        section.
                    </DialogDescription>
                    <div className="grid max-h-[55vh] gap-2 overflow-y-auto py-2 sm:grid-cols-2">
                        {questionTypes.map((type) => {
                            const unavailable = assignedElsewhere.has(type.id);
                            const checked = selectedIds.includes(type.id);

                            return (
                                <label
                                    key={type.id}
                                    className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm ${unavailable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${checked ? 'border-primary bg-primary/5' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={unavailable || submitting}
                                        onChange={() =>
                                            setSelectedIds((current) =>
                                                checked
                                                    ? current.filter(
                                                          (id) =>
                                                              id !== type.id,
                                                      )
                                                    : [...current, type.id],
                                            )
                                        }
                                    />
                                    <span>{type.name}</span>
                                </label>
                            );
                        })}
                    </div>
                    {errors.question_type_ids && (
                        <p className="text-xs text-destructive">
                            {errors.question_type_ids}
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={closeForm}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={save}
                            disabled={submitting || selectedIds.length === 0}
                        >
                            {editing ? 'Update section' : 'Create section'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <DialogContent>
                    <DialogTitle>
                        Remove{' '}
                        {deleteTarget
                            ? sectionLabel(deleteTarget.sort_order)
                            : 'section'}
                        ?
                    </DialogTitle>
                    <DialogDescription>
                        The following section letters will move up
                        automatically.
                    </DialogDescription>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() =>
                                deleteTarget &&
                                router.delete(
                                    `/superadmin/paper-question-sections/${deleteTarget.id}`,
                                    {
                                        preserveScroll: true,
                                        onSuccess: () => setDeleteTarget(null),
                                    },
                                )
                            }
                        >
                            Remove section
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function SectionRow({
    label,
    types,
    locked,
    onEdit,
    onDelete,
}: {
    label: string;
    types: TypeOption[];
    locked?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}) {
    return (
        <div className="flex flex-col gap-3 border-b px-4 py-4 last:border-b-0 md:flex-row md:items-center md:justify-between md:px-5">
            <div className="min-w-0">
                <h3 className="font-bold text-foreground">{label}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                    {types.map((type) => (
                        <span
                            key={type.id}
                            className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium"
                        >
                            {type.name}
                        </span>
                    ))}
                </div>
            </div>
            {!locked && (
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onEdit}
                        title={`Edit ${label}`}
                    >
                        <PencilIcon />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={onDelete}
                        title={`Remove ${label}`}
                    >
                        <Trash2Icon />
                    </Button>
                </div>
            )}
        </div>
    );
}

function option(item: { id: number; name: string }): ComboboxOptionItem {
    return { id: item.id, label: item.name };
}
function find(options: ComboboxOptionItem[], id: number | null) {
    return options.find((item) => Number(item.id) === id) ?? null;
}
function sectionLabel(order: number) {
    return `Section ${String.fromCharCode(64 + Math.min(26, order))}`;
}

PaperQuestionSections.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        {
            title: 'Paper Sections',
            href: '/superadmin/paper-question-sections',
        },
    ],
};

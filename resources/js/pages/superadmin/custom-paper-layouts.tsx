import { Head, router } from '@inertiajs/react';
import {
    ArrowDownIcon,
    ArrowUpIcon,
    BracketsIcon,
    Link2Icon,
    PlusIcon,
    SaveIcon,
    Trash2Icon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
    pattern_id: number;
    class_id: number;
    subject_id: number;
}
interface TypeOption {
    id: number;
    name: string;
    name_ur?: string | null;
}
interface LayoutItem {
    question_type_id: number;
    shared_number_group: number | null;
    or_group: number | null;
}
interface LayoutSection {
    id?: number;
    items: LayoutItem[];
}
interface Layout {
    id: number;
    is_active: boolean;
    sections: LayoutSection[];
}

export default function CustomPaperLayouts({
    scopeCatalog,
    selectedScope,
    questionTypes,
    multipartTypeIds,
    layout,
}: {
    scopeCatalog: ScopeCatalog;
    selectedScope: Scope | null;
    questionTypes: TypeOption[];
    multipartTypeIds: number[];
    layout: Layout | null;
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
    const [active, setActive] = useState(layout?.is_active ?? false);
    const [sections, setSections] = useState<LayoutSection[]>(
        layout?.sections.length
            ? layout.sections
            : [{ items: questionTypes.map((type) => itemFor(type.id)) }],
    );
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const typesById = useMemo(
        () => new Map(questionTypes.map((type) => [type.id, type])),
        [questionTypes],
    );
    const assignedIds = new Set(
        sections.flatMap((section) =>
            section.items.map((item) => item.question_type_id),
        ),
    );
    const unassigned = questionTypes.filter(
        (type) => !assignedIds.has(type.id),
    );
    const patternOptions = scopeCatalog.patterns.map(option);
    const classOptions = scopeCatalog.patternClasses
        .filter((item) => item.pattern_id === patternId)
        .map(option);
    const subjectOptions = scopeCatalog.classSubjects
        .filter(
            (item) =>
                item.pattern_id === patternId && item.class_id === classId,
        )
        .map((item) => ({ id: item.subject_id, label: item.name }));
    const loaded =
        selectedScope?.pattern_id === patternId &&
        selectedScope?.class_id === classId &&
        selectedScope?.subject_id === subjectId;

    function selectScope(
        nextPattern: number | null,
        nextClass: number | null,
        nextSubject: number | null,
    ) {
        setPatternId(nextPattern);
        setClassId(nextClass);
        setSubjectId(nextSubject);

        if (nextPattern && nextClass && nextSubject) {
            router.get(
                '/superadmin/custom-paper-layouts',
                {
                    pattern_id: nextPattern,
                    class_id: nextClass,
                    subject_id: nextSubject,
                },
                { preserveState: false, replace: true },
            );
        }
    }

    function updateItem(
        typeId: number,
        update: (item: LayoutItem) => LayoutItem,
    ) {
        setSections((current) =>
            current.map((section) => ({
                ...section,
                items: section.items.map((item) =>
                    item.question_type_id === typeId ? update(item) : item,
                ),
            })),
        );
    }

    function moveWithin(
        sectionIndex: number,
        itemIndex: number,
        direction: -1 | 1,
    ) {
        setSections((current) =>
            current.map((section, index) => {
                if (index !== sectionIndex) {
                    return section;
                }

                const target = itemIndex + direction;

                if (target < 0 || target >= section.items.length) {
                    return section;
                }

                const items = [...section.items];
                [items[itemIndex], items[target]] = [
                    items[target],
                    items[itemIndex],
                ];

                return { ...section, items };
            }),
        );
    }

    function moveToSection(typeId: number, targetIndex: number) {
        setSections((current) => {
            const movingTypeIds = multipartTypeIds.includes(typeId)
                ? multipartTypeIds
                : [typeId];
            const moving = current
                .flatMap((section) => section.items)
                .filter((item) =>
                    movingTypeIds.includes(item.question_type_id),
                );

            if (moving.length === 0) {
                return current;
            }

            return current.map((section, index) => ({
                ...section,
                items:
                    index === targetIndex
                        ? [
                              ...section.items.filter(
                                  (item) =>
                                      !movingTypeIds.includes(
                                          item.question_type_id,
                                      ),
                              ),
                              ...moving,
                          ]
                        : section.items.filter(
                              (item) =>
                                  !movingTypeIds.includes(
                                      item.question_type_id,
                                  ),
                          ),
            }));
        });
    }

    function applyGroup(kind: 'shared_number_group' | 'or_group') {
        if (selectedIds.length < 2) {
            setError('Select at least two question types first.');

            return;
        }

        const selectedSections = sections
            .map((section, index) =>
                section.items.some((item) =>
                    selectedIds.includes(item.question_type_id),
                )
                    ? index
                    : -1,
            )
            .filter((index) => index >= 0);

        if (new Set(selectedSections).size !== 1) {
            setError('Grouped question types must be in the same section.');

            return;
        }

        if (kind === 'or_group') {
            const sharedGroups = sections
                .flatMap((section) => section.items)
                .filter((item) => selectedIds.includes(item.question_type_id))
                .map((item) => item.shared_number_group);

            if (new Set(sharedGroups).size !== 1) {
                setError(
                    'OR members must use the same shared question number.',
                );

                return;
            }
        }

        const nextGroup =
            Math.max(
                0,
                ...sections.flatMap((section) =>
                    section.items.map((item) => item[kind] ?? 0),
                ),
            ) + 1;
        selectedIds.forEach((typeId) =>
            updateItem(typeId, (item) => ({ ...item, [kind]: nextGroup })),
        );
        setSelectedIds([]);
        setError(null);
    }

    function clearGroups() {
        selectedIds.forEach((typeId) =>
            updateItem(typeId, (item) => ({
                ...item,
                shared_number_group: null,
                or_group: null,
            })),
        );
        setSelectedIds([]);
        setError(null);
    }

    function save() {
        if (!patternId || !classId || !subjectId) {
            return;
        }

        const nonEmptySections = sections.filter(
            (section) => section.items.length > 0,
        );

        if (nonEmptySections.length === 0) {
            setError('Add at least one subjective section.');

            return;
        }

        setSubmitting(true);
        setError(null);
        router.put(
            '/superadmin/custom-paper-layouts',
            {
                pattern_id: patternId,
                class_id: classId,
                subject_id: subjectId,
                is_active: active,
                sections: JSON.parse(JSON.stringify(nonEmptySections)),
            },
            {
                preserveScroll: true,
                onError: (errors) =>
                    setError(
                        String(
                            errors.sections ??
                                'Unable to save the custom layout.',
                        ),
                    ),
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <>
            <Head title="Custom Paper Layouts" />
            <div className="space-y-5 p-4 md:p-6">
                <div>
                    <h1 className="h1-semibold">Custom Paper Layouts</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Arrange scoped question types into sections, shared
                        question numbers, and OR groups.
                    </p>
                </div>
                <section className="rounded-xl border bg-card p-4 shadow-sm">
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
                            options={subjectOptions}
                            value={find(subjectOptions, subjectId)}
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
                </section>
                {loaded && (
                    <>
                        <section className="rounded-xl border bg-card p-4 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={active}
                                        onCheckedChange={setActive}
                                        disabled={!canEdit}
                                    />
                                    <div>
                                        <p className="text-sm font-semibold">
                                            Use this custom layout
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            When inactive, existing paper
                                            settings continue unchanged.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            applyGroup('shared_number_group')
                                        }
                                        disabled={!canEdit}
                                    >
                                        <BracketsIcon />
                                        Share question number
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyGroup('or_group')}
                                        disabled={!canEdit}
                                    >
                                        <Link2Icon />
                                        Create OR group
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={clearGroups}
                                        disabled={
                                            !canEdit || selectedIds.length === 0
                                        }
                                    >
                                        Clear groups
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={save}
                                        disabled={!canEdit || submitting}
                                    >
                                        <SaveIcon />
                                        Save layout
                                    </Button>
                                </div>
                            </div>
                            {error && (
                                <p className="mt-3 text-sm text-destructive">
                                    {error}
                                </p>
                            )}
                        </section>
                        <div className="rounded-xl border bg-card p-4 shadow-sm">
                            <h2 className="font-bold">Section A</h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                All objective question types (fixed as Q.1)
                            </p>
                        </div>
                        {sections.map((section, sectionIndex) => (
                            <section
                                key={section.id ?? `new-${sectionIndex}`}
                                className="rounded-xl border bg-card shadow-sm"
                            >
                                <div className="flex items-center justify-between border-b px-4 py-3">
                                    <h2 className="font-bold">
                                        Section{' '}
                                        {String.fromCharCode(66 + sectionIndex)}
                                    </h2>
                                    {canEdit && sections.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                setSections((current) =>
                                                    current.filter(
                                                        (_, index) =>
                                                            index !==
                                                            sectionIndex,
                                                    ),
                                                )
                                            }
                                        >
                                            <Trash2Icon />
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-2 p-4">
                                    {section.items.map((item, itemIndex) => {
                                        const type = typesById.get(
                                            item.question_type_id,
                                        );
                                        const isMultipartType =
                                            multipartTypeIds.includes(
                                                item.question_type_id,
                                            );

                                        return (
                                            <div
                                                key={item.question_type_id}
                                                className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/10 p-3"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(
                                                        item.question_type_id,
                                                    )}
                                                    disabled={isMultipartType}
                                                    onChange={() =>
                                                        setSelectedIds(
                                                            (current) =>
                                                                current.includes(
                                                                    item.question_type_id,
                                                                )
                                                                    ? current.filter(
                                                                          (
                                                                              id,
                                                                          ) =>
                                                                              id !==
                                                                              item.question_type_id,
                                                                      )
                                                                    : [
                                                                          ...current,
                                                                          item.question_type_id,
                                                                      ],
                                                        )
                                                    }
                                                />
                                                <div className="min-w-48 flex-1">
                                                    <p className="text-sm font-semibold">
                                                        {type?.name ??
                                                            'Unknown type'}
                                                    </p>
                                                    {type?.name_ur && (
                                                        <p
                                                            dir="rtl"
                                                            className="text-xs text-muted-foreground"
                                                        >
                                                            {type.name_ur}
                                                        </p>
                                                    )}
                                                </div>
                                                {item.shared_number_group && (
                                                    <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                                        Shared Q{' '}
                                                        {
                                                            item.shared_number_group
                                                        }
                                                    </span>
                                                )}
                                                {item.or_group && (
                                                    <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                                                        OR {item.or_group}
                                                    </span>
                                                )}
                                                {isMultipartType && (
                                                    <span className="rounded bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700">
                                                        Multipart block
                                                    </span>
                                                )}
                                                <select
                                                    className="h-8 rounded-md border bg-background px-2 text-xs"
                                                    value={sectionIndex}
                                                    onChange={(event) =>
                                                        moveToSection(
                                                            item.question_type_id,
                                                            Number(
                                                                event.target
                                                                    .value,
                                                            ),
                                                        )
                                                    }
                                                    disabled={!canEdit}
                                                >
                                                    {sections.map(
                                                        (_, index) => (
                                                            <option
                                                                key={index}
                                                                value={index}
                                                            >
                                                                Section{' '}
                                                                {String.fromCharCode(
                                                                    66 + index,
                                                                )}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={
                                                        !canEdit ||
                                                        itemIndex === 0
                                                    }
                                                    onClick={() =>
                                                        moveWithin(
                                                            sectionIndex,
                                                            itemIndex,
                                                            -1,
                                                        )
                                                    }
                                                >
                                                    <ArrowUpIcon />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={
                                                        !canEdit ||
                                                        itemIndex ===
                                                            section.items
                                                                .length -
                                                                1
                                                    }
                                                    onClick={() =>
                                                        moveWithin(
                                                            sectionIndex,
                                                            itemIndex,
                                                            1,
                                                        )
                                                    }
                                                >
                                                    <ArrowDownIcon />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                    {section.items.length === 0 && (
                                        <p className="py-5 text-center text-sm text-muted-foreground">
                                            Move question types into this
                                            section.
                                        </p>
                                    )}
                                </div>
                            </section>
                        ))}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                onClick={() =>
                                    setSections((current) => [
                                        ...current,
                                        { items: [] },
                                    ])
                                }
                                disabled={!canEdit || sections.length >= 25}
                            >
                                <PlusIcon />
                                Add section
                            </Button>
                            {unassigned.map((type) => (
                                <Button
                                    key={type.id}
                                    variant="outline"
                                    onClick={() =>
                                        setSections((current) =>
                                            current.map((section, index) =>
                                                index === 0
                                                    ? {
                                                          ...section,
                                                          items: [
                                                              ...section.items,
                                                              itemFor(type.id),
                                                          ],
                                                      }
                                                    : section,
                                            ),
                                        )
                                    }
                                >
                                    Add {type.name}
                                </Button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

function itemFor(typeId: number): LayoutItem {
    return {
        question_type_id: typeId,
        shared_number_group: null,
        or_group: null,
    };
}
function option(item: { id: number; name: string }): ComboboxOptionItem {
    return { id: item.id, label: item.name };
}
function find(options: ComboboxOptionItem[], id: number | null) {
    return options.find((item) => Number(item.id) === id) ?? null;
}

CustomPaperLayouts.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        {
            title: 'Custom Paper Layouts',
            href: '/superadmin/custom-paper-layouts',
        },
    ],
};

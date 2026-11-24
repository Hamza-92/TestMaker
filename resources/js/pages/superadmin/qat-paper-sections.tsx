import { Head, router, useForm } from '@inertiajs/react';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Button, Card, PageHeader } from '@/components/tm';
import { Switch } from '@/components/ui/switch';
import { selectClass } from './qat-catalogue/shared';

type Option = { id: number; name: string };
type Scope = { catalogue_id: number; class_id: number; subject_id: number };
type Group = {
    label_en: string | null;
    label_ur: string | null;
    question_type_ids: number[];
};
type Settings = {
    is_active: boolean;
    show_objective_section: boolean;
    objective_label_en: string | null;
    objective_label_ur: string | null;
    groups: Group[];
};

const url = '/superadmin/qat-paper-sections';
const inputClass = 'w-full rounded-lg border bg-background px-3 py-2 text-sm';

function Labels({
    english,
    urdu,
    onChange,
}: {
    english: string | null;
    urdu: string | null;
    onChange: (language: 'en' | 'ur', value: string) => void;
}) {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
                English label
                <input
                    className={inputClass}
                    value={english ?? ''}
                    maxLength={255}
                    onChange={(event) => onChange('en', event.target.value)}
                />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
                Urdu label
                <input
                    className={inputClass}
                    value={urdu ?? ''}
                    maxLength={255}
                    dir="rtl"
                    lang="ur"
                    onChange={(event) => onChange('ur', event.target.value)}
                />
            </label>
        </div>
    );
}

function SectionSettings({
    subject,
    settings,
    types,
}: {
    subject: number;
    settings: Settings | null;
    types: Option[];
}) {
    const { data, setData, errors, put, processing, isDirty } =
        useForm<Settings>(
            settings ?? {
                is_active: false,
                show_objective_section: true,
                objective_label_en: null,
                objective_label_ur: null,
                groups: [],
            },
        );
    const knownTypeIds = new Set(types.map(({ id }) => id));
    const assignedIds = new Set(
        data.groups.flatMap((group) => group.question_type_ids),
    );

    function updateGroup(index: number, group: Group) {
        setData(
            'groups',
            data.groups.map((item, position) =>
                position === index ? group : item,
            ),
        );
    }

    function moveGroup(index: number, offset: number) {
        const groups = [...data.groups];
        [groups[index], groups[index + offset]] = [
            groups[index + offset],
            groups[index],
        ];
        setData('groups', groups);
    }

    return (
        <form
            className="space-y-4"
            onSubmit={(event) => {
                event.preventDefault();
                put(`${url}/${subject}`, { preserveScroll: true });
            }}
        >
            <Card className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Switch
                        id="qat-custom-sections"
                        checked={data.is_active}
                        onCheckedChange={(checked) =>
                            setData('is_active', checked)
                        }
                    />
                    <label
                        htmlFor="qat-custom-sections"
                        className="text-sm font-semibold"
                    >
                        Use custom paper sections
                    </label>
                </div>
                <p className="text-sm text-muted-foreground">
                    Applies to all months for this subject. Enter one label to
                    show it on its own, or leave both blank to use the default
                    section heading. Unassigned question types share a final
                    section.
                </p>
            </Card>
            <Card className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-semibold">Objective section</h2>
                    <div className="flex items-center gap-2 text-sm">
                        <label htmlFor="qat-show-objective-heading">
                            Show section heading
                        </label>
                        <Switch
                            id="qat-show-objective-heading"
                            checked={data.show_objective_section}
                            onCheckedChange={(checked) =>
                                setData('show_objective_section', checked)
                            }
                        />
                    </div>
                </div>
                <Labels
                    english={data.objective_label_en}
                    urdu={data.objective_label_ur}
                    onChange={(language, value) =>
                        setData(`objective_label_${language}`, value)
                    }
                />
            </Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">Subjective sections</h2>
                <Button
                    type="button"
                    variant="secondary"
                    disabled={types.every(({ id }) => assignedIds.has(id))}
                    onClick={() =>
                        setData('groups', [
                            ...data.groups,
                            {
                                label_en: null,
                                label_ur: null,
                                question_type_ids: [],
                            },
                        ])
                    }
                >
                    <PlusIcon aria-hidden="true" /> Add section
                </Button>
            </div>
            {data.groups.length === 0 && (
                <Card>
                    <p className="text-sm text-muted-foreground">
                        {types.length
                            ? 'Add a section to group subjective question types.'
                            : 'This subject has no subjective question types.'}
                    </p>
                </Card>
            )}
            {data.groups.map((group, index) => (
                <Card key={index} className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">
                            Subjective section {index + 1}
                        </h3>
                        <div className="flex gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Move section ${index + 1} up`}
                                disabled={index === 0}
                                onClick={() => moveGroup(index, -1)}
                            >
                                <ArrowUpIcon aria-hidden="true" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Move section ${index + 1} down`}
                                disabled={index === data.groups.length - 1}
                                onClick={() => moveGroup(index, 1)}
                            >
                                <ArrowDownIcon aria-hidden="true" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Remove section ${index + 1}`}
                                onClick={() =>
                                    setData(
                                        'groups',
                                        data.groups.filter(
                                            (_, position) => position !== index,
                                        ),
                                    )
                                }
                            >
                                <Trash2Icon aria-hidden="true" />
                            </Button>
                        </div>
                    </div>
                    <Labels
                        english={group.label_en}
                        urdu={group.label_ur}
                        onChange={(language, value) =>
                            updateGroup(index, {
                                ...group,
                                [`label_${language}`]: value,
                            })
                        }
                    />
                    <fieldset>
                        <legend className="mb-2 text-sm font-medium">
                            Question types
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {[
                                ...types,
                                ...group.question_type_ids
                                    .filter((id) => !knownTypeIds.has(id))
                                    .map((id) => ({
                                        id,
                                        name: 'Unavailable question type',
                                    })),
                            ].map(({ id, name }) => {
                                const checked =
                                    group.question_type_ids.includes(id);

                                return (
                                    <label
                                        key={id}
                                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm has-[:disabled]:opacity-50"
                                    >
                                        <input
                                            type="checkbox"
                                            className="size-4 shrink-0 accent-primary"
                                            checked={checked}
                                            disabled={
                                                !checked && assignedIds.has(id)
                                            }
                                            onChange={(event) =>
                                                updateGroup(index, {
                                                    ...group,
                                                    question_type_ids: event
                                                        .target.checked
                                                        ? [
                                                              ...group.question_type_ids,
                                                              id,
                                                          ]
                                                        : group.question_type_ids.filter(
                                                              (type) =>
                                                                  type !== id,
                                                          ),
                                                })
                                            }
                                        />
                                        {name}
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>
                </Card>
            ))}
            {Object.values(errors).length > 0 && (
                <ul role="alert" className="space-y-1 text-sm text-destructive">
                    {[...new Set(Object.values(errors))].map((error) => (
                        <li key={error}>{error}</li>
                    ))}
                </ul>
            )}
            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={
                        processing ||
                        !isDirty ||
                        data.groups.some(
                            (group) => group.question_type_ids.length === 0,
                        )
                    }
                >
                    {processing ? 'Saving…' : 'Save sections'}
                </Button>
            </div>
        </form>
    );
}

export default function QatPaperSections({
    catalogues,
    classes,
    subjects,
    scope,
    types,
    settings,
}: {
    catalogues: Option[];
    classes: Option[];
    subjects: Option[];
    scope: Scope;
    types: Option[];
    settings: Settings | null;
}) {
    const navigate = (selection: Partial<Scope>) =>
        router.get(url, selection, { preserveScroll: true });
    const fields = [
        {
            label: 'Academic year',
            options: catalogues,
            value: scope.catalogue_id,
            change: (id: number) => navigate({ catalogue_id: id }),
        },
        {
            label: 'Class',
            options: classes,
            value: scope.class_id,
            change: (id: number) =>
                navigate({ catalogue_id: scope.catalogue_id, class_id: id }),
        },
        {
            label: 'Subject',
            options: subjects,
            value: scope.subject_id,
            change: (id: number) => navigate({ ...scope, subject_id: id }),
        },
    ];

    return (
        <div className="w-full min-w-0 space-y-5 p-4 md:p-6">
            <Head title="QAT Paper Sections" />
            <PageHeader title="QAT Paper Sections" />
            <Card className="grid gap-4 md:grid-cols-3">
                {fields.map(({ label, options, value, change }) => (
                    <label
                        key={label}
                        className="grid gap-1.5 text-sm font-medium"
                    >
                        {label}
                        <select
                            className={selectClass}
                            value={value}
                            disabled={!options.length}
                            onChange={(event) =>
                                change(Number(event.target.value))
                            }
                        >
                            <option value={0}>
                                Select {label.toLowerCase()}
                            </option>
                            {options.map(({ id, name }) => (
                                <option key={id} value={id}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </label>
                ))}
            </Card>
            {scope.subject_id ? (
                <SectionSettings
                    key={scope.subject_id}
                    subject={scope.subject_id}
                    settings={settings}
                    types={types}
                />
            ) : (
                <Card>
                    <p className="text-sm text-muted-foreground">
                        Select an academic year, class, and subject to configure
                        its paper sections.
                    </p>
                </Card>
            )}
        </div>
    );
}

QatPaperSections.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'QAT Tests', href: '/superadmin/qat-catalogue' },
        { title: 'Paper Sections', href: url },
    ],
};

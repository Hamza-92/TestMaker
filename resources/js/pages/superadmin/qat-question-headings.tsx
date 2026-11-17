import { Head, router, useForm } from '@inertiajs/react';
import { Button, Card, PageHeader } from '@/components/tm';
import { Switch } from '@/components/ui/switch';
import {
    selectClass,
    tableClass,
    tdClass,
    thClass,
} from './qat-catalogue/shared';

type Option = { id: number; name: string };
type Scope = { catalogue_id: number; class_id: number; subject_id: number };

const url = '/superadmin/qat-question-headings';

function HeadingSettings({
    subject,
    types,
    hiddenTypeIds,
}: {
    subject: number;
    types: Option[];
    hiddenTypeIds: number[];
}) {
    const form = useForm({ hidden_type_ids: hiddenTypeIds });

    return (
        <Card>
            <form
                className="space-y-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.put(`${url}/${subject}`, {
                        preserveScroll: true,
                    });
                }}
            >
                <div className="overflow-x-auto">
                    <table className={tableClass}>
                        <thead>
                            <tr>
                                <th scope="col" className={thClass}>
                                    Question type
                                </th>
                                <th
                                    scope="col"
                                    className={`${thClass} text-right`}
                                >
                                    Show heading
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {types.map(({ id, name }) => (
                                <tr key={id}>
                                    <td className={tdClass}>{name}</td>
                                    <td className={`${tdClass} text-right`}>
                                        <Switch
                                            aria-label={`Show heading for ${name}`}
                                            checked={
                                                !form.data.hidden_type_ids.includes(
                                                    id,
                                                )
                                            }
                                            onCheckedChange={(show) =>
                                                form.setData(
                                                    'hidden_type_ids',
                                                    show
                                                        ? form.data.hidden_type_ids.filter(
                                                              (value) =>
                                                                  value !== id,
                                                          )
                                                        : [
                                                              ...form.data
                                                                  .hidden_type_ids,
                                                              id,
                                                          ],
                                                )
                                            }
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {Object.values(form.errors).map((error, index) => (
                    <p
                        key={index}
                        role="alert"
                        className="text-sm text-destructive"
                    >
                        {error}
                    </p>
                ))}
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={form.processing || !form.isDirty}
                    >
                        Save heading settings
                    </Button>
                </div>
            </form>
        </Card>
    );
}

export default function QatQuestionHeadings({
    catalogues,
    classes,
    subjects,
    scope,
    types,
    hiddenTypeIds,
}: {
    catalogues: Option[];
    classes: Option[];
    subjects: Option[];
    scope: Scope;
    types: Option[];
    hiddenTypeIds: number[];
}) {
    const fields = [
        {
            key: 'catalogue_id',
            label: 'Academic year',
            options: catalogues,
            parentScope: {},
        },
        {
            key: 'class_id',
            label: 'Class',
            options: classes,
            parentScope: { catalogue_id: scope.catalogue_id },
        },
        {
            key: 'subject_id',
            label: 'Subject',
            options: subjects,
            parentScope: {
                catalogue_id: scope.catalogue_id,
                class_id: scope.class_id,
            },
        },
    ] as const;

    return (
        <div className="w-full min-w-0 space-y-5 p-4 md:p-6">
            <Head title="QAT Question Headings" />
            <PageHeader title="QAT Question Headings" />
            <Card className="grid gap-4 md:grid-cols-3">
                {fields.map(({ key, label, options, parentScope }) => (
                    <label
                        key={key}
                        className="grid gap-1.5 text-sm font-medium"
                    >
                        {label}
                        <select
                            className={selectClass}
                            value={scope[key]}
                            disabled={!options.length}
                            onChange={(event) =>
                                router.get(
                                    url,
                                    {
                                        ...parentScope,
                                        [key]: Number(
                                            event.currentTarget.value,
                                        ),
                                    },
                                    { preserveScroll: true },
                                )
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
            {types.length > 0 ? (
                <HeadingSettings
                    key={scope.subject_id}
                    subject={scope.subject_id}
                    types={types}
                    hiddenTypeIds={hiddenTypeIds}
                />
            ) : (
                <Card className="text-center text-sm text-muted-foreground">
                    {scope.subject_id
                        ? 'This subject has no question types yet.'
                        : 'Select a subject to manage its paper headings.'}
                </Card>
            )}
        </div>
    );
}

QatQuestionHeadings.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'QAT Tests', href: '/superadmin/qat-catalogue' },
        { title: 'Question Headings', href: url },
    ],
};

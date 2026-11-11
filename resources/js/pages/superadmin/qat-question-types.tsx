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
type Pair = { type_id: number; partner_id: number };
const url = '/superadmin/qat-question-types';

function ScopeSelect({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: Option[];
    value: number;
    onChange: (value: number) => void;
}) {
    return (
        <label className="grid gap-1.5 text-sm font-medium">
            {label}
            <select
                className={selectClass}
                value={value}
                disabled={!options.length}
                onChange={(event) => onChange(Number(event.target.value))}
            >
                <option value={0}>Select {label.toLowerCase()}</option>
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
        </label>
    );
}

function TypeSettings({
    subject,
    types,
    hiddenTypeIds,
    pairs,
}: {
    subject: number;
    types: Option[];
    hiddenTypeIds: number[];
    pairs: Pair[];
}) {
    const { data, setData, put, processing, isDirty, errors } = useForm({
        hidden_type_ids: hiddenTypeIds,
        or_pairs: pairs,
    });

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                put(`${url}/${subject}`, { preserveScroll: true });
            }}
            className="space-y-4"
        >
            <Card padding="none" className="overflow-x-auto">
                <table className={tableClass}>
                    <thead>
                        <tr>
                            <th className={thClass}>Question type</th>
                            <th className={thClass}>Show to customers</th>
                            <th className={thClass}>Allowed OR partner</th>
                        </tr>
                    </thead>
                    <tbody>
                        {types.map((type) => {
                            const partner = data.or_pairs.find(
                                (pair) =>
                                    pair.type_id === type.id ||
                                    pair.partner_id === type.id,
                            );
                            const partnerId = partner
                                ? partner.type_id === type.id
                                    ? partner.partner_id
                                    : partner.type_id
                                : 0;
                            const visible = !data.hidden_type_ids.includes(
                                type.id,
                            );

                            return (
                                <tr key={type.id}>
                                    <th
                                        scope="row"
                                        className={`${tdClass} text-left font-semibold`}
                                    >
                                        {type.name}
                                    </th>
                                    <td className={tdClass}>
                                        <Switch
                                            aria-label={`Show ${type.name} to customers`}
                                            checked={visible}
                                            onCheckedChange={(checked) =>
                                                setData(
                                                    'hidden_type_ids',
                                                    checked
                                                        ? data.hidden_type_ids.filter(
                                                              (id) =>
                                                                  id !==
                                                                  type.id,
                                                          )
                                                        : [
                                                              ...data.hidden_type_ids,
                                                              type.id,
                                                          ],
                                                )
                                            }
                                        />
                                    </td>
                                    <td className={tdClass}>
                                        <select
                                            aria-label={`OR partner for ${type.name}`}
                                            className={`${selectClass} min-w-36 max-w-72`}
                                            value={partnerId}
                                            onChange={(event) => {
                                                const id = Number(
                                                    event.target.value,
                                                );
                                                const remaining =
                                                    data.or_pairs.filter(
                                                        (pair) =>
                                                            ![
                                                                type.id,
                                                                id,
                                                            ].includes(
                                                                pair.type_id,
                                                            ) &&
                                                            ![
                                                                type.id,
                                                                id,
                                                            ].includes(
                                                                pair.partner_id,
                                                            ),
                                                    );
                                                setData(
                                                    'or_pairs',
                                                    id
                                                        ? [
                                                              ...remaining,
                                                              {
                                                                  type_id:
                                                                      type.id,
                                                                  partner_id:
                                                                      id,
                                                              },
                                                          ]
                                                        : remaining,
                                                );
                                            }}
                                        >
                                            <option value={0}>
                                                No partner
                                            </option>
                                            {types
                                                .filter(
                                                    (option) =>
                                                        option.id !== type.id,
                                                )
                                                .map((option) => (
                                                    <option
                                                        key={option.id}
                                                        value={option.id}
                                                    >
                                                        {option.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </Card>
            <div className="flex justify-end">
                <Button
                    type="submit"
                    variant="primary"
                    disabled={processing || !isDirty}
                >
                    {processing ? 'Saving…' : 'Save settings'}
                </Button>
            </div>
            {Object.values(errors).map((error) => (
                <p
                    key={error}
                    role="alert"
                    className="text-sm text-red-600 dark:text-red-400"
                >
                    {error}
                </p>
            ))}
        </form>
    );
}

export default function QatQuestionTypes({
    catalogues,
    classes,
    subjects,
    scope,
    types,
    hiddenTypeIds,
    pairs,
}: {
    catalogues: Option[];
    classes: Option[];
    subjects: Option[];
    scope: Scope;
    types: Option[];
    hiddenTypeIds: number[];
    pairs: Pair[];
}) {
    const navigate = (query: Partial<Scope>) =>
        router.get(url, query, { preserveScroll: true });

    return (
        <div className="w-full min-w-0 space-y-5 p-4 md:p-6">
            <Head title="QAT Question Types" />
            <PageHeader title="QAT Question Types" />
            <Card className="grid gap-4 md:grid-cols-3">
                <ScopeSelect
                    label="Academic year"
                    options={catalogues}
                    value={scope.catalogue_id}
                    onChange={(catalogue_id) => navigate({ catalogue_id })}
                />
                <ScopeSelect
                    label="Class"
                    options={classes}
                    value={scope.class_id}
                    onChange={(class_id) =>
                        navigate({ catalogue_id: scope.catalogue_id, class_id })
                    }
                />
                <ScopeSelect
                    label="Subject"
                    options={subjects}
                    value={scope.subject_id}
                    onChange={(subject_id) =>
                        navigate({
                            catalogue_id: scope.catalogue_id,
                            class_id: scope.class_id,
                            subject_id,
                        })
                    }
                />
            </Card>
            {types.length > 0 ? (
                <TypeSettings
                    key={scope.subject_id}
                    subject={scope.subject_id}
                    types={types}
                    hiddenTypeIds={hiddenTypeIds}
                    pairs={pairs}
                />
            ) : (
                <Card className="text-center text-sm text-muted-foreground">
                    {scope.subject_id
                        ? 'This subject has no question types yet.'
                        : 'Select a subject to manage its question types.'}
                </Card>
            )}
        </div>
    );
}

QatQuestionTypes.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'QAT Tests', href: '/superadmin/qat-catalogue' },
        { title: 'Question Types', href: url },
    ],
};

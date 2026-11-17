import { Head, useForm } from '@inertiajs/react';
import { Button, Card, PageHeader } from '@/components/tm';
import { Switch } from '@/components/ui/switch';
import { HeadingScopePicker } from './qat-catalogue/heading-scope';
import type { HeadingScope } from './qat-catalogue/heading-scope';
import { QatOrGroups } from './qat-catalogue/or-groups';
import type { OrGroup, QuestionType } from './qat-catalogue/or-groups';
import { tableClass, tdClass, thClass } from './qat-catalogue/shared';

const url = '/superadmin/qat-question-types';

function TypeVisibility({
    subject,
    types,
    hiddenTypeIds,
}: {
    subject: number;
    types: QuestionType[];
    hiddenTypeIds: number[];
}) {
    const { data, setData, put, processing, isDirty, errors } = useForm({
        hidden_type_ids: hiddenTypeIds,
    });

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                put(`${url}/${subject}`, { preserveScroll: true });
            }}
        >
            <Card padding="none">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 md:px-5">
                    <h2 className="text-sm font-semibold">
                        Question type visibility
                    </h2>
                    <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        disabled={processing || !isDirty}
                    >
                        {processing ? 'Saving…' : 'Save visibility'}
                    </Button>
                </div>
                {Object.values(errors).map((error) => (
                    <p
                        key={error}
                        role="alert"
                        className="px-4 pt-3 text-sm text-destructive"
                    >
                        {error}
                    </p>
                ))}
                <div className="overflow-x-auto">
                    <table className={tableClass}>
                        <thead>
                            <tr>
                                <th scope="col" className={thClass}>
                                    Question type
                                </th>
                                <th scope="col" className={thClass}>
                                    Show to customers
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {types.map(({ id, name }) => (
                                <tr key={id}>
                                    <th
                                        scope="row"
                                        className={`${tdClass} text-left font-semibold`}
                                    >
                                        {name}
                                    </th>
                                    <td className={tdClass}>
                                        <Switch
                                            aria-label={`Show ${name} to customers`}
                                            checked={
                                                !data.hidden_type_ids.includes(
                                                    id,
                                                )
                                            }
                                            disabled={processing}
                                            onCheckedChange={(checked) =>
                                                setData(
                                                    'hidden_type_ids',
                                                    checked
                                                        ? data.hidden_type_ids.filter(
                                                              (value) =>
                                                                  value !== id,
                                                          )
                                                        : [
                                                              ...data.hidden_type_ids,
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
            </Card>
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
    orGroups,
}: HeadingScope & {
    types: QuestionType[];
    hiddenTypeIds: number[];
    orGroups: OrGroup[];
}) {
    return (
        <div className="w-full min-w-0 space-y-5 p-4 md:p-6">
            <Head title="QAT Question Types" />
            <PageHeader title="QAT Question Types" />
            <HeadingScopePicker
                url={url}
                catalogues={catalogues}
                classes={classes}
                subjects={subjects}
                scope={scope}
            />
            {scope.subject_id ? (
                <>
                    <QatOrGroups
                        key={`groups-${scope.subject_id}`}
                        subject={scope.subject_id}
                        types={types}
                        groups={orGroups}
                    />
                    {types.length > 0 && (
                        <TypeVisibility
                            key={`visibility-${scope.subject_id}`}
                            subject={scope.subject_id}
                            types={types}
                            hiddenTypeIds={hiddenTypeIds}
                        />
                    )}
                </>
            ) : (
                <Card className="text-center text-sm text-muted-foreground">
                    Select a subject to manage its question types.
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

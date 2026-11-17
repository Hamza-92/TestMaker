import { Head, useForm } from '@inertiajs/react';
import { Button, Card, Input, PageHeader } from '@/components/tm';
import { HeadingScopePicker } from './qat-catalogue/heading-scope';
import type {
    HeadingOption,
    HeadingScope,
} from './qat-catalogue/heading-scope';
import { tableClass, tdClass, thClass } from './qat-catalogue/shared';

type HeadingText = Partial<Record<'heading_en' | 'heading_ur', string>>;
type HeadingByType = Record<number, HeadingText>;

const url = '/superadmin/qat-question-heading-text';
const headingFields = [
    { key: 'heading_en', label: 'English heading', direction: 'ltr' },
    { key: 'heading_ur', label: 'Urdu heading', direction: 'rtl' },
] as const;

function HeadingTextForm({
    subject,
    types,
    defaultHeadings,
    overrides,
}: {
    subject: number;
    types: HeadingOption[];
    defaultHeadings: HeadingByType;
    overrides: HeadingByType;
}) {
    const form = useForm({
        overrides: types.map(({ id }) => ({
            question_type_id: id,
            heading_en: overrides[id]?.heading_en ?? '',
            heading_ur: overrides[id]?.heading_ur ?? '',
        })),
    });

    return (
        <Card>
            <form
                className="space-y-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.put(`${url}/${subject}`, { preserveScroll: true });
                }}
            >
                <p className="text-sm text-muted-foreground">
                    Clear a field to use its default heading.
                </p>
                <div className="overflow-x-auto">
                    <table className={tableClass}>
                        <thead>
                            <tr>
                                <th scope="col" className={thClass}>
                                    Question type
                                </th>
                                {headingFields.map(({ key, label }) => (
                                    <th
                                        key={key}
                                        scope="col"
                                        className={thClass}
                                    >
                                        {label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {types.map(({ id, name }, index) => (
                                <tr key={id}>
                                    <td className={tdClass}>{name}</td>
                                    {headingFields.map(
                                        ({ key, label, direction }) => (
                                            <td
                                                key={key}
                                                className={`${tdClass} w-[38%] min-w-48`}
                                            >
                                                <Input
                                                    aria-label={`${label} for ${name}`}
                                                    dir={direction}
                                                    maxLength={255}
                                                    value={
                                                        form.data.overrides[
                                                            index
                                                        ][key]
                                                    }
                                                    placeholder={
                                                        defaultHeadings[id]?.[
                                                            key
                                                        ] || 'Default heading'
                                                    }
                                                    onChange={(event) => {
                                                        const value =
                                                            event.currentTarget
                                                                .value;
                                                        form.setData(
                                                            'overrides',
                                                            form.data.overrides.map(
                                                                (row) =>
                                                                    row.question_type_id ===
                                                                    id
                                                                        ? {
                                                                              ...row,
                                                                              [key]: value,
                                                                          }
                                                                        : row,
                                                            ),
                                                        );
                                                    }}
                                                />
                                            </td>
                                        ),
                                    )}
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
                <div className="flex items-center justify-end gap-3">
                    {form.recentlySuccessful && (
                        <span
                            role="status"
                            className="text-sm text-muted-foreground"
                        >
                            Heading text saved.
                        </span>
                    )}
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={form.processing || !form.isDirty}
                    >
                        {form.processing ? 'Saving…' : 'Save heading text'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}

export default function QatQuestionHeadingText({
    types,
    defaultHeadings,
    overrides,
    catalogues,
    classes,
    subjects,
    scope,
}: HeadingScope & {
    types: HeadingOption[];
    defaultHeadings: HeadingByType;
    overrides: HeadingByType;
}) {
    return (
        <div className="w-full min-w-0 space-y-5 p-4 md:p-6">
            <Head title="QAT Heading Text" />
            <PageHeader title="QAT Heading Text" />
            <HeadingScopePicker
                url={url}
                catalogues={catalogues}
                classes={classes}
                subjects={subjects}
                scope={scope}
            />
            {types.length > 0 ? (
                <HeadingTextForm
                    key={scope.subject_id}
                    subject={scope.subject_id}
                    types={types}
                    defaultHeadings={defaultHeadings}
                    overrides={overrides}
                />
            ) : (
                <Card className="text-center text-sm text-muted-foreground">
                    {scope.subject_id
                        ? 'This subject has no question types yet.'
                        : 'Select a subject to edit its question headings.'}
                </Card>
            )}
        </div>
    );
}

QatQuestionHeadingText.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'QAT Tests', href: '/superadmin/qat-catalogue' },
        { title: 'Heading Text', href: url },
    ],
};

import { router } from '@inertiajs/react';
import { Card } from '@/components/tm';
import { selectClass } from './shared';

type Scope = { catalogue_id: number; class_id: number; subject_id: number };
export type HeadingOption = { id: number; name: string };

export type HeadingScope = {
    catalogues: HeadingOption[];
    classes: HeadingOption[];
    subjects: HeadingOption[];
    scope: Scope;
};

export function HeadingScopePicker({
    url,
    catalogues,
    classes,
    subjects,
    scope,
}: HeadingScope & { url: string }) {
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
        <Card className="grid gap-4 md:grid-cols-3">
            {fields.map(({ key, label, options, parentScope }) => (
                <label key={key} className="grid gap-1.5 text-sm font-medium">
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
                                    [key]: Number(event.currentTarget.value),
                                },
                                { preserveScroll: true },
                            )
                        }
                    >
                        <option value={0}>Select {label.toLowerCase()}</option>
                        {options.map(({ id, name }) => (
                            <option key={id} value={id}>
                                {name}
                            </option>
                        ))}
                    </select>
                </label>
            ))}
        </Card>
    );
}

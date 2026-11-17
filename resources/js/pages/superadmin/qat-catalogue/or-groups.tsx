import { router } from '@inertiajs/react';
import {
    Link2Icon,
    PencilIcon,
    PlusIcon,
    Trash2Icon,
    XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Button, Card } from '@/components/tm';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { FloatingCombobox } from '@/components/ui/floating-combobox';
import { Switch } from '@/components/ui/switch';
import { tableClass, tdClass, thClass } from './shared';

export type QuestionType = { id: number; name: string; is_objective: boolean };
export type OrGroup = { type_ids: number[]; random_pick: boolean };

export function QatOrGroups({
    subject,
    types,
    groups,
}: {
    subject: number;
    types: QuestionType[];
    groups: OrGroup[];
}) {
    const [draft, setDraft] = useState<{
        index: number | null;
        ids: number[];
    } | null>(null);
    const [removeIndex, setRemoveIndex] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const byId = new Map(types.map((type) => [type.id, type]));
    const typeName = (id: number) =>
        byId.get(id)?.name ?? `Question type ${id}`;
    const groupName = (group: OrGroup) =>
        group.type_ids.map(typeName).join(' OR ');
    const usedIds = new Set(
        groups.flatMap(({ type_ids }, index) =>
            index === draft?.index ? [] : type_ids,
        ),
    );
    const available = types.filter(({ id }) => !usedIds.has(id));
    const draftTypes = draft?.ids.map((id) => byId.get(id));
    const mixed =
        new Set(draftTypes?.filter(Boolean).map((type) => type?.is_objective))
            .size > 1;
    const draftIsRandom =
        draft?.index != null && groups[draft.index].random_pick;

    function save(next: OrGroup[], onSuccess?: () => void) {
        setError('');
        setSaving(true);
        router.put(
            `/superadmin/qat-question-types/${subject}/or-groups`,
            { or_groups: next },
            {
                preserveScroll: true,
                onSuccess: () => onSuccess?.(),
                onError: (errors) =>
                    setError(
                        Object.values(errors)[0] ??
                            'Could not save the OR groups.',
                    ),
                onFinish: () => setSaving(false),
            },
        );
    }

    function saveDraft() {
        if (!draft) {
            return;
        }

        const group = {
            type_ids: draft.ids.filter(Boolean),
            random_pick: Boolean(draftIsRandom),
        };
        const next =
            draft.index === null
                ? [...groups, group]
                : groups.map((item, index) =>
                      index === draft.index ? group : item,
                  );
        save(next, () => setDraft(null));
    }

    return (
        <Card padding="none">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 md:px-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Link2Icon
                        className="size-4 text-brand-600"
                        aria-hidden="true"
                    />
                    Configured OR groups
                </h2>
                <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={saving || available.length < 2}
                    onClick={() => {
                        setError('');
                        setDraft({ index: null, ids: [0, 0] });
                    }}
                >
                    <PlusIcon aria-hidden="true" /> Create OR group
                </Button>
            </div>
            {error && !draft && removeIndex === null && (
                <p role="alert" className="px-4 pt-3 text-sm text-destructive">
                    {error}
                </p>
            )}
            {groups.length ? (
                <div className="overflow-x-auto">
                    <table className={tableClass}>
                        <thead>
                            <tr>
                                <th scope="col" className={thClass}>
                                    Question types
                                </th>
                                <th scope="col" className={thClass}>
                                    Random pick
                                </th>
                                <th
                                    scope="col"
                                    className={`${thClass} text-right`}
                                >
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map((group, index) => {
                                const name = groupName(group);

                                return (
                                    <tr key={group.type_ids[0]}>
                                        <td
                                            className={`${tdClass} font-medium`}
                                        >
                                            {name}
                                        </td>
                                        <td className={tdClass}>
                                            <Switch
                                                aria-label={`Random pick for ${name}`}
                                                checked={group.random_pick}
                                                disabled={saving}
                                                onCheckedChange={(
                                                    random_pick,
                                                ) =>
                                                    save(
                                                        groups.map(
                                                            (item, row) =>
                                                                row === index
                                                                    ? {
                                                                          ...item,
                                                                          random_pick,
                                                                      }
                                                                    : item,
                                                        ),
                                                    )
                                                }
                                            />
                                        </td>
                                        <td className={tdClass}>
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    disabled={saving}
                                                    aria-label={`Edit ${name}`}
                                                    title="Edit OR group"
                                                    onClick={() => {
                                                        setError('');
                                                        setDraft({
                                                            index,
                                                            ids: group.type_ids,
                                                        });
                                                    }}
                                                >
                                                    <PencilIcon aria-hidden="true" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    disabled={saving}
                                                    className="text-destructive"
                                                    aria-label={`Remove ${name}`}
                                                    title="Remove OR group"
                                                    onClick={() => {
                                                        setError('');
                                                        setRemoveIndex(index);
                                                    }}
                                                >
                                                    <Trash2Icon aria-hidden="true" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No OR groups configured.
                </p>
            )}

            <Dialog
                open={draft !== null}
                onOpenChange={(open) => {
                    if (!open && !saving) {
                        setDraft(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogTitle>
                        {draft?.index == null
                            ? 'Create OR group'
                            : 'Edit OR group'}
                    </DialogTitle>
                    <DialogDescription>
                        The first question type supplies the count and marks in
                        automatic papers.
                    </DialogDescription>
                    {draft && (
                        <form
                            className="space-y-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                saveDraft();
                            }}
                        >
                            <div className="grid gap-3 md:grid-cols-2">
                                {draft.ids.map((id, index) => {
                                    const options = available
                                        .filter(
                                            (type) =>
                                                !draft.ids.some(
                                                    (selected, row) =>
                                                        row !== index &&
                                                        selected === type.id,
                                                ),
                                        )
                                        .map((type) => ({
                                            id: type.id,
                                            label: type.name,
                                        }));
                                    const selected =
                                        options.find(
                                            (option) => option.id === id,
                                        ) ??
                                        (id
                                            ? { id, label: typeName(id) }
                                            : null);

                                    return (
                                        <div
                                            key={index}
                                            className="flex items-center gap-1.5"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <FloatingCombobox
                                                    label={`Question type ${index + 1}`}
                                                    options={options}
                                                    value={selected}
                                                    disabled={saving}
                                                    stopWheelPropagation
                                                    visibleScrollbar
                                                    onChange={(option) => {
                                                        setError('');
                                                        setDraft({
                                                            ...draft,
                                                            ids: draft.ids.map(
                                                                (value, row) =>
                                                                    row ===
                                                                    index
                                                                        ? Number(
                                                                              option?.id ??
                                                                                  0,
                                                                          )
                                                                        : value,
                                                            ),
                                                        });
                                                    }}
                                                />
                                            </div>
                                            {draft.ids.length > 2 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    disabled={saving}
                                                    aria-label={`Remove question type ${index + 1}`}
                                                    onClick={() =>
                                                        setDraft({
                                                            ...draft,
                                                            ids: draft.ids.filter(
                                                                (_, row) =>
                                                                    row !==
                                                                    index,
                                                            ),
                                                        })
                                                    }
                                                >
                                                    <XIcon aria-hidden="true" />
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={
                                    saving ||
                                    draft.ids.length >= available.length
                                }
                                onClick={() =>
                                    setDraft({
                                        ...draft,
                                        ids: [...draft.ids, 0],
                                    })
                                }
                            >
                                <PlusIcon aria-hidden="true" /> Add another type
                            </Button>
                            {error && (
                                <p
                                    role="alert"
                                    className="text-sm text-destructive"
                                >
                                    {error}
                                </p>
                            )}
                            {mixed &&
                                (draftIsRandom ||
                                    draft.ids.filter(Boolean).length > 2) && (
                                    <p className="text-sm text-destructive">
                                        Choose either objective or subjective
                                        types for this group.
                                    </p>
                                )}
                            <DialogFooter>
                                <Button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => setDraft(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={
                                        saving ||
                                        draft.ids.some((id) => !byId.has(id)) ||
                                        (mixed &&
                                            (draftIsRandom ||
                                                draft.ids.length > 2))
                                    }
                                >
                                    {saving ? 'Saving…' : 'Save OR group'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={removeIndex !== null}
                onOpenChange={(open) => {
                    if (!open && !saving) {
                        setRemoveIndex(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogTitle>Remove OR group?</DialogTitle>
                    <DialogDescription>
                        {removeIndex !== null && groupName(groups[removeIndex])}
                    </DialogDescription>
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            disabled={saving}
                            onClick={() => setRemoveIndex(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            disabled={saving}
                            onClick={() =>
                                save(
                                    groups.filter(
                                        (_, index) => index !== removeIndex,
                                    ),
                                    () => setRemoveIndex(null),
                                )
                            }
                        >
                            Remove group
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

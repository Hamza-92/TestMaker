import { useForm } from '@inertiajs/react';
import { useId } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Button, Input, Modal } from '@/components/tm';

interface ChapterForm {
    chapter_number: string;
    name: string;
    name_ur: string;
    group_name: string;
    group_heading: string;
}

function Field({
    label,
    htmlFor,
    error,
    children,
}: {
    label: string;
    htmlFor: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="min-w-0 space-y-1.5">
            <label
                htmlFor={htmlFor}
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
                {label}
            </label>
            {children}
            {error && (
                <p
                    role="alert"
                    className="text-xs text-rose-600 dark:text-rose-400"
                >
                    {error}
                </p>
            )}
        </div>
    );
}

export function AddChapterModal({
    open,
    onClose,
    action,
    scope,
}: {
    open: boolean;
    onClose: () => void;
    action: string;
    scope: string[];
}) {
    const formId = useId();
    const form = useForm<ChapterForm>({
        chapter_number: '',
        name: '',
        name_ur: '',
        group_name: '',
        group_heading: '',
    });

    function close() {
        if (form.processing) {
            return;
        }

        form.reset();
        form.clearErrors();
        onClose();
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        form.post(action, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onClose();
            },
        });
    }

    return (
        <Modal
            open={open}
            onOpenChange={(nextOpen) => !nextOpen && close()}
            title="Add Chapter"
            className="max-w-xl"
            footer={
                <>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={close}
                        disabled={form.processing}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form={formId}
                        variant="primary"
                        disabled={form.processing}
                    >
                        {form.processing ? 'Adding…' : 'Add Chapter'}
                    </Button>
                </>
            }
        >
            <form id={formId} onSubmit={submit} className="space-y-4">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {scope.map((part, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center gap-1.5"
                        >
                            {index > 0 && <span aria-hidden="true">/</span>}
                            <span>{part}</span>
                        </span>
                    ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-[110px_minmax(0,1fr)]">
                    <Field
                        label="Chapter #"
                        htmlFor={`${formId}-number`}
                        error={form.errors.chapter_number}
                    >
                        <Input
                            id={`${formId}-number`}
                            type="number"
                            min="1"
                            inputMode="numeric"
                            value={form.data.chapter_number}
                            onChange={(event) =>
                                form.setData(
                                    'chapter_number',
                                    event.target.value,
                                )
                            }
                            placeholder="1"
                        />
                    </Field>
                    <Field
                        label="Chapter name"
                        htmlFor={`${formId}-name`}
                        error={form.errors.name}
                    >
                        <Input
                            id={`${formId}-name`}
                            autoFocus
                            required
                            maxLength={150}
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            placeholder="e.g. Introduction to Biology"
                        />
                    </Field>
                </div>

                <Field
                    label="Urdu name"
                    htmlFor={`${formId}-urdu`}
                    error={form.errors.name_ur}
                >
                    <Input
                        id={`${formId}-urdu`}
                        dir="rtl"
                        maxLength={150}
                        value={form.data.name_ur}
                        onChange={(event) =>
                            form.setData('name_ur', event.target.value)
                        }
                    />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        label="Group"
                        htmlFor={`${formId}-group`}
                        error={form.errors.group_name}
                    >
                        <Input
                            id={`${formId}-group`}
                            maxLength={300}
                            value={form.data.group_name}
                            onChange={(event) =>
                                form.setData('group_name', event.target.value)
                            }
                            placeholder="e.g. Group A"
                        />
                    </Field>
                    <Field
                        label="Group heading"
                        htmlFor={`${formId}-heading`}
                        error={form.errors.group_heading}
                    >
                        <Input
                            id={`${formId}-heading`}
                            maxLength={150}
                            value={form.data.group_heading}
                            onChange={(event) =>
                                form.setData(
                                    'group_heading',
                                    event.target.value,
                                )
                            }
                        />
                    </Field>
                </div>
            </form>
        </Modal>
    );
}

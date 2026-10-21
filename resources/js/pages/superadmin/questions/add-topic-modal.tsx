import { useForm } from '@inertiajs/react';
import { useId } from 'react';
import type { FormEvent } from 'react';
import { Button, Input, Modal } from '@/components/tm';

export function AddTopicModal({
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
    const form = useForm({ name: '', name_ur: '' });

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
            title="Add Topic"
            className="max-w-lg"
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
                        {form.processing ? 'Adding…' : 'Add Topic'}
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
                <div className="space-y-1.5">
                    <label
                        htmlFor={`${formId}-name`}
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                        Topic name
                    </label>
                    <Input
                        id={`${formId}-name`}
                        autoFocus
                        required
                        maxLength={150}
                        value={form.data.name}
                        onChange={(event) =>
                            form.setData('name', event.target.value)
                        }
                    />
                    {form.errors.name && (
                        <p
                            role="alert"
                            className="text-xs text-rose-600 dark:text-rose-400"
                        >
                            {form.errors.name}
                        </p>
                    )}
                </div>
                <div className="space-y-1.5">
                    <label
                        htmlFor={`${formId}-urdu`}
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                        Urdu name
                    </label>
                    <Input
                        id={`${formId}-urdu`}
                        dir="rtl"
                        maxLength={150}
                        value={form.data.name_ur}
                        onChange={(event) =>
                            form.setData('name_ur', event.target.value)
                        }
                    />
                    {form.errors.name_ur && (
                        <p
                            role="alert"
                            className="text-xs text-rose-600 dark:text-rose-400"
                        >
                            {form.errors.name_ur}
                        </p>
                    )}
                </div>
            </form>
        </Modal>
    );
}

import { router } from '@inertiajs/react';
import { ArrowRightLeftIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { QuestionTypeOption } from './form';

interface SelectedQuestion {
    id: number;
    question_type: QuestionTypeOption;
}

export function BulkQuestionTypeChangeDialog({
    open,
    onOpenChange,
    questions,
    questionTypes,
    onChanged,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    questions: SelectedQuestion[];
    questionTypes: QuestionTypeOption[];
    onChanged: () => void;
}) {
    const [targetTypeId, setTargetTypeId] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const schemaKeys = useMemo(
        () =>
            new Set(
                questions.map((question) => question.question_type.schema_key),
            ),
        [questions],
    );
    const sourceTypeIds = useMemo(
        () => new Set(questions.map((question) => question.question_type.id)),
        [questions],
    );
    const compatibleTypes = useMemo(() => {
        if (schemaKeys.size !== 1) {
            return [];
        }

        const schemaKey = [...schemaKeys][0];

        return questionTypes.filter(
            (type) =>
                type.status === 1 &&
                type.schema_key === schemaKey &&
                !(sourceTypeIds.size === 1 && sourceTypeIds.has(type.id)),
        );
    }, [questionTypes, schemaKeys, sourceTypeIds]);

    const close = () => {
        if (processing) {
            return;
        }

        setTargetTypeId('');
        setError('');
        onOpenChange(false);
    };

    const submit = () => {
        if (!targetTypeId || questions.length === 0) {
            return;
        }

        setProcessing(true);
        setError('');
        router.patch(
            '/superadmin/questions/type',
            {
                question_ids: questions.map((question) => question.id),
                question_type_id: Number(targetTypeId),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setTargetTypeId('');
                    onOpenChange(false);
                    onChanged();
                },
                onError: (errors) =>
                    setError(
                        Object.values(errors)[0] ??
                            'The question type could not be changed.',
                    ),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
            <DialogContent className="sm:max-w-md">
                <DialogTitle>Change question type</DialogTitle>
                <DialogDescription className="sr-only">
                    Choose the new type for the selected questions.
                </DialogDescription>

                <Select
                    value={targetTypeId}
                    onValueChange={(value) => {
                        setTargetTypeId(value);
                        setError('');
                    }}
                    disabled={processing || compatibleTypes.length === 0}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="New question type" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                        {compatibleTypes.map((type) => (
                            <SelectItem key={type.id} value={String(type.id)}>
                                {type.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {schemaKeys.size !== 1 ? (
                    <p className="text-sm text-destructive">
                        Select questions with the same question structure.
                    </p>
                ) : compatibleTypes.length === 0 ? (
                    <p className="text-sm text-destructive">
                        No compatible question type is available.
                    </p>
                ) : null}
                {error ? (
                    <p className="text-sm text-destructive">{error}</p>
                ) : null}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={close}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={submit}
                        disabled={processing || !targetTypeId}
                    >
                        <ArrowRightLeftIcon className="size-4" />
                        {processing ? 'Changing…' : 'Change type'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

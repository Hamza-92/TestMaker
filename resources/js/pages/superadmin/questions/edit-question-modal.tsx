import { useForm } from '@inertiajs/react';
import { CheckCircle2Icon, XIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/tm';
import { QuestionForm } from './form';
import type {
    ChapterOption,
    MediumOption,
    QuestionFormData,
    QuestionTypeOption,
    SourceOption,
} from './form';
import { fetchQuestionJson } from './use-question-options';

interface EditPayload {
    lockedChapterId?: number;
    backHref?: string;
    question: {
        id: number;
        question_type_id: number;
        chapter_id: number;
        medium_id: number | null;
        topic_id: number | null;
        source: string | null;
        status: number;
        schema_key: string;
        schema: QuestionTypeOption['schema'];
        content: QuestionFormData['content'];
    };
    questionTypes: QuestionTypeOption[];
    chapters: ChapterOption[];
    chapterOptionsUrl?: string;
    sourceOptions: SourceOption[];
    mediumOptions: MediumOption[];
}

function initialValues({
    question,
    mediumOptions,
}: EditPayload): QuestionFormData {
    return {
        question_type_id: String(question.question_type_id),
        chapter_id: String(question.chapter_id),
        topic_id: question.topic_id ? String(question.topic_id) : '',
        source: question.source ?? '',
        medium_id: question.medium_id
            ? String(question.medium_id)
            : String(
                  mediumOptions.find((medium) => medium.name === 'Both')?.id ??
                      mediumOptions[0]?.id ??
                      '',
              ),
        status: String(question.status),
        content: question.content,
    };
}

function EditQuestionForm({
    payload,
    updateUrl,
    footerTarget,
    onClose,
    onSaved,
    onSavingChange,
}: {
    payload: EditPayload;
    updateUrl: string;
    footerTarget: HTMLDivElement | null;
    onClose: () => void;
    onSaved: () => void;
    onSavingChange: (saving: boolean) => void;
}) {
    const form = useForm<QuestionFormData>(initialValues(payload));
    const formId = useId();
    const submittingRef = useRef(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const effectiveQuestionTypes = payload.questionTypes.map((type) =>
        type.id === payload.question.question_type_id
            ? {
                  ...type,
                  schema_key: payload.question.schema_key,
                  schema: payload.question.schema,
              }
            : type,
    );

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (submittingRef.current) {
            return;
        }

        submittingRef.current = true;
        form.clearErrors();
        setSubmitError('');
        setSubmitting(true);
        onSavingChange(true);
        let didSave = false;

        try {
            const response = await fetch(updateUrl, {
                method: 'PUT',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>(
                            'meta[name="csrf-token"]',
                        )?.content ?? '',
                },
                credentials: 'same-origin',
                body: JSON.stringify(form.data),
            });

            if (response.status === 422) {
                const result = (await response.json()) as {
                    errors?: Record<string, string[]>;
                };
                form.setError(
                    Object.fromEntries(
                        Object.entries(result.errors ?? {}).map(
                            ([field, messages]) => [
                                field,
                                messages[0] ?? 'Invalid value.',
                            ],
                        ),
                    ),
                );

                return;
            }

            if (!response.ok) {
                throw new Error('Could not save the question.');
            }

            didSave = true;
        } catch {
            setSubmitError('Could not save the question. Try again.');
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
            onSavingChange(false);
        }

        if (didSave) {
            onClose();
            onSaved();
        }
    }

    return (
        <>
            {submitError && (
                <p role="alert" className="mb-3 text-sm text-rose-600">
                    {submitError}
                </p>
            )}
            <QuestionForm
                title="Edit Question"
                submitLabel="Save Changes"
                backHref={payload.backHref ?? '/superadmin/questions'}
                form={form}
                questionTypes={effectiveQuestionTypes}
                chapters={payload.chapters}
                chapterOptionsUrl={payload.chapterOptionsUrl}
                sourceOptions={payload.sourceOptions}
                mediumOptions={payload.mediumOptions}
                lockedChapterId={payload.lockedChapterId}
                embedded
                submitting={submitting}
                hideActions
                formId={formId}
                onCancel={onClose}
                onSubmit={submit}
            />
            {footerTarget &&
                createPortal(
                    <>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form={formId}
                            variant="primary"
                            disabled={submitting}
                        >
                            <CheckCircle2Icon aria-hidden="true" />
                            {submitting ? 'Saving…' : 'Save Changes'}
                        </Button>
                    </>,
                    footerTarget,
                )}
        </>
    );
}

export default function EditQuestionModal({
    questionId,
    editUrl,
    updateUrl,
    title = 'Edit Question',
    scope,
    onClose,
    onSaved,
}: {
    questionId: number;
    editUrl?: string;
    updateUrl?: string;
    title?: string;
    scope?: string[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const [payload, setPayload] = useState<EditPayload | null>(null);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    const [saving, setSaving] = useState(false);
    const [footerTarget, setFooterTarget] = useState<HTMLDivElement | null>(
        null,
    );

    useEffect(() => {
        const controller = new AbortController();

        fetchQuestionJson<EditPayload>(
            editUrl ?? `/superadmin/questions/${questionId}/edit`,
            controller.signal,
        )
            .then((result) => {
                if (!controller.signal.aborted) {
                    setPayload(result);
                    setError('');
                }
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setError('Could not load the question. Try again.');
                }
            });

        return () => controller.abort();
    }, [editUrl, questionId, retry]);

    function close() {
        if (!saving) {
            onClose();
        }
    }

    return createPortal(
        <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-5"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    close();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-question-title"
                className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div className="min-w-0">
                        <h2
                            id="edit-question-title"
                            className="text-base font-semibold text-slate-950 dark:text-white"
                        >
                            {title}
                        </h2>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {scope?.length
                                ? scope.join(' / ')
                                : `Question #${questionId}`}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={close}
                        disabled={saving}
                        aria-label="Close"
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                        <XIcon className="size-4" aria-hidden="true" />
                    </button>
                </div>
                <div className="min-h-0 overflow-y-auto px-4 py-5 sm:px-6">
                    {error ? (
                        <div
                            role="alert"
                            className="space-y-3 text-sm text-rose-600"
                        >
                            <p>{error}</p>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    setError('');
                                    setRetry((value) => value + 1);
                                }}
                            >
                                Retry
                            </Button>
                        </div>
                    ) : payload ? (
                        <EditQuestionForm
                            payload={payload}
                            updateUrl={
                                updateUrl ??
                                `/superadmin/questions/${questionId}`
                            }
                            footerTarget={footerTarget}
                            onClose={onClose}
                            onSaved={onSaved}
                            onSavingChange={setSaving}
                        />
                    ) : (
                        <div
                            role="status"
                            className="py-12 text-center text-sm text-slate-500"
                        >
                            Loading question…
                        </div>
                    )}
                </div>
                <div
                    ref={setFooterTarget}
                    className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800 sm:px-6"
                />
            </section>
        </div>,
        document.body,
    );
}

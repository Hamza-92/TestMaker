import { router, useForm } from '@inertiajs/react';
import { CheckCircle2Icon, CirclePlusIcon, XIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/tm';
import { createEmptyQuestionContent, QuestionForm } from './form';
import type {
    ChapterOption,
    MediumOption,
    QuestionFormData,
    QuestionTypeOption,
    SourceOption,
} from './form';
import { fetchQuestionJson } from './use-question-options';

interface FormOptions {
    questionTypes: QuestionTypeOption[];
    chapters: ChapterOption[];
    sourceOptions: SourceOption[];
    mediumOptions: MediumOption[];
}

const optionsCache = new WeakMap<object, Promise<FormOptions>>();
const defaultsKey = 'question_add_modal_defaults';

function loadOptions(owner: object, url: string) {
    let cached = optionsCache.get(owner);

    if (!cached) {
        cached = fetchQuestionJson<FormOptions>(url).catch((error: unknown) => {
            optionsCache.delete(owner);

            throw error;
        });
        optionsCache.set(owner, cached);
    }

    return cached;
}

function initialDefaults(
    options: FormOptions,
    chapterId: number,
    topicId: number | null,
): QuestionFormData {
    let sticky: Record<string, string> = {};

    try {
        sticky = JSON.parse(
            sessionStorage.getItem(defaultsKey) ?? '{}',
        ) as Record<string, string>;
    } catch {
        sticky = {};
    }

    return {
        question_type_id: options.questionTypes.some(
            (type) => String(type.id) === sticky.question_type_id,
        )
            ? sticky.question_type_id
            : options.questionTypes.length === 1
              ? String(options.questionTypes[0].id)
              : '',
        chapter_id: String(chapterId),
        topic_id: topicId ? String(topicId) : '',
        source: options.sourceOptions.some(
            (source) => source.value === sticky.source,
        )
            ? sticky.source
            : '',
        status: sticky.status === '0' ? '0' : '1',
        medium_id: options.mediumOptions.some(
            (medium) => String(medium.id) === sticky.medium_id,
        )
            ? sticky.medium_id
            : String(
                  options.mediumOptions.find((medium) => medium.name === 'Both')
                      ?.id ??
                      options.mediumOptions[0]?.id ??
                      '',
              ),
        content: createEmptyQuestionContent(),
    };
}

function QuestionComposer({
    options,
    chapterId,
    topicId,
    onClose,
    onSaved,
    onSavingChange,
    footerTarget,
}: {
    options: FormOptions;
    chapterId: number;
    topicId: number | null;
    onClose: () => void;
    onSaved: (keepOpen: boolean) => void;
    onSavingChange: (saving: boolean) => void;
    footerTarget: HTMLDivElement | null;
}) {
    const form = useForm<QuestionFormData>(
        initialDefaults(options, chapterId, topicId),
    );
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const submittingRef = useRef(false);
    const formId = useId();

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (submittingRef.current) {
            return;
        }

        submittingRef.current = true;
        const submitter = (event.nativeEvent as SubmitEvent)
            .submitter as HTMLButtonElement | null;
        const saveAndAddNew = submitter?.value === 'save-and-add-new';
        const {
            question_type_id,
            chapter_id,
            topic_id,
            source,
            status,
            medium_id,
        } = form.data;

        try {
            sessionStorage.setItem(
                defaultsKey,
                JSON.stringify({ question_type_id, source, status, medium_id }),
            );
        } catch {
            // Storage can be unavailable in private browsing.
        }

        form.clearErrors();
        setSubmitError('');
        setSubmitting(true);
        onSavingChange(true);
        let didSave = false;

        try {
            const response = await fetch('/superadmin/questions', {
                method: 'POST',
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
                throw new Error('Could not save the question. Try again.');
            }

            didSave = true;

            if (saveAndAddNew) {
                form.setData({
                    question_type_id,
                    chapter_id,
                    topic_id,
                    source,
                    status,
                    medium_id,
                    content: createEmptyQuestionContent(),
                });
            }
        } catch {
            setSubmitError('Could not save the question. Try again.');
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
            onSavingChange(false);
        }

        if (didSave) {
            onSaved(saveAndAddNew);
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
                title="Add Question"
                submitLabel="Save Question"
                secondarySubmitLabel="Save & Add New"
                backHref="/superadmin/questions"
                form={form}
                questionTypes={options.questionTypes}
                chapters={options.chapters}
                sourceOptions={options.sourceOptions}
                mediumOptions={options.mediumOptions}
                lockedChapterId={chapterId}
                lockedTopicId={topicId}
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
                            variant="secondary"
                            disabled={submitting}
                        >
                            <CheckCircle2Icon aria-hidden="true" />{' '}
                            {submitting ? 'Saving…' : 'Save Question'}
                        </Button>
                        <Button
                            type="submit"
                            form={formId}
                            name="save_and_add_new"
                            value="save-and-add-new"
                            variant="primary"
                            disabled={submitting}
                        >
                            <CirclePlusIcon aria-hidden="true" /> Save & Add New
                        </Button>
                    </>,
                    footerTarget,
                )}
        </>
    );
}

export default function AddQuestionModal({
    cacheOwner,
    optionsHref,
    chapterId,
    topicId,
    scope,
    onClose,
}: {
    cacheOwner: object;
    optionsHref: string;
    chapterId: number;
    topicId: number | null;
    scope: string[];
    onClose: () => void;
}) {
    const [options, setOptions] = useState<FormOptions | null>(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [retry, setRetry] = useState(0);
    const savedRef = useRef(false);
    const [footerTarget, setFooterTarget] = useState<HTMLDivElement | null>(
        null,
    );

    function close() {
        if (saving) {
            return;
        }

        onClose();

        if (savedRef.current) {
            router.reload({ only: ['items', 'filters'] });
        }
    }

    function saved(keepOpen: boolean) {
        savedRef.current = true;

        if (!keepOpen) {
            onClose();
            router.reload({ only: ['items', 'filters'] });
        }
    }

    useEffect(() => {
        let active = true;
        loadOptions(cacheOwner, optionsHref)
            .then((value) => {
                if (active) {
                    setOptions(value);
                    setError('');
                }
            })
            .catch(() => {
                if (active) {
                    setError('Could not load the question form. Try again.');
                }
            });

        return () => {
            active = false;
        };
    }, [cacheOwner, optionsHref, retry]);

    return createPortal(
        <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-5"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !saving) {
                    close();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-question-title"
                className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div className="min-w-0">
                        <h2
                            id="add-question-title"
                            className="text-base font-semibold text-slate-950 dark:text-white"
                        >
                            Add Question
                        </h2>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {scope.join(' / ')}
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
                            <button
                                type="button"
                                onClick={() => {
                                    setError('');
                                    setRetry((value) => value + 1);
                                }}
                                className="font-semibold underline"
                            >
                                Retry
                            </button>
                        </div>
                    ) : options ? (
                        <QuestionComposer
                            options={options}
                            chapterId={chapterId}
                            topicId={topicId}
                            onClose={close}
                            onSaved={saved}
                            onSavingChange={setSaving}
                            footerTarget={footerTarget}
                        />
                    ) : (
                        <div
                            role="status"
                            className="py-12 text-center text-sm text-slate-500"
                        >
                            Loading question form…
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

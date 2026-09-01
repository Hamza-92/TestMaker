import { Head } from '@inertiajs/react';
import { ArrowRightIcon, CheckCircle2Icon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { FloatingCombobox } from '@/components/ui/floating-combobox';
import type { ComboboxOptionItem } from '@/components/ui/floating-combobox';

const tabs = [
    { key: 'legacy', label: 'Legacy Data Transfer' },
    { key: 'class', label: 'Class-wise Transfer' },
    { key: 'creative', label: 'Creative Data Transfer' },
] as const;

type TransferTab = (typeof tabs)[number]['key'];

interface SourcePattern {
    key: string;
    label: string;
    afaq: number;
}

function isVisibleSourcePattern(pattern: SourcePattern): boolean {
    return !(pattern.label.trim().toLowerCase() === 'punjab');
}

interface CatalogClass {
    id: number;
    name: string;
    status?: number;
}

interface SourceSubject {
    id: number;
    name: string;
    subject_type?: string;
    chapters_count?: number;
    topics_count?: number;
    questions_count?: number;
    exercise_questions_count?: number;
    class_transfer_type?: string;
    uses_exercise_topics?: boolean;
}

interface SourceTopic {
    id: number;
    chapter_id: number;
    name: string;
    questions_count?: number;
}

interface SourceChapter {
    id: number;
    name: string;
    chapter_number?: number | null;
    questions_count?: number;
    topics: SourceTopic[];
}

interface TargetPattern {
    id: number;
    name: string;
    short_name?: string | null;
    status?: number;
}

interface TargetSubject {
    id: number;
    name: string;
    name_eng?: string | null;
    name_ur?: string | null;
    subject_type?: string | null;
    status?: number;
}

interface CatalogResponse {
    source_patterns: SourcePattern[];
    source_classes: CatalogClass[];
    source_subjects: SourceSubject[];
    source_chapters: SourceChapter[];
    target_patterns: TargetPattern[];
    target_classes: CatalogClass[];
    target_subjects: TargetSubject[];
}

interface DataTransferProps {
    sourcePatterns: SourcePattern[];
    targetPatterns: TargetPattern[];
    defaults?: {
        source_pattern?: string;
    };
}

function csrfToken() {
    return (
        (
            document.querySelector(
                'meta[name="csrf-token"]',
            ) as HTMLMetaElement | null
        )?.content ?? ''
    );
}

function comboboxOptions<
    T extends { id: number | string; name?: string; label?: string },
>(items: T[]): ComboboxOptionItem[] {
    return items.map((item) => ({
        id: item.id,
        label: item.label ?? item.name ?? String(item.id),
    }));
}

function selectedOption(
    options: ComboboxOptionItem[],
    id: number | string | null,
): ComboboxOptionItem | null {
    if (id === null || id === '') {
        return null;
    }

    return options.find((option) => String(option.id) === String(id)) ?? null;
}

function SubjectTransferPanel({
    defaults,
    initialSourcePatterns,
    initialTargetPatterns,
}: {
    defaults?: DataTransferProps['defaults'];
    initialSourcePatterns: SourcePattern[];
    initialTargetPatterns: TargetPattern[];
}) {
    const visibleInitialSourcePatterns = initialSourcePatterns.filter(
        isVisibleSourcePattern,
    );

    const [sourcePatterns, setSourcePatterns] = useState(
        visibleInitialSourcePatterns,
    );
    const [sourceClasses, setSourceClasses] = useState<CatalogClass[]>([]);
    const [sourceSubjects, setSourceSubjects] = useState<SourceSubject[]>([]);
    const [sourceChapters, setSourceChapters] = useState<SourceChapter[]>([]);
    const [targetPatterns, setTargetPatterns] = useState(initialTargetPatterns);
    const [targetClasses, setTargetClasses] = useState<CatalogClass[]>([]);
    const [targetSubjects, setTargetSubjects] = useState<TargetSubject[]>([]);

    const defaultSourcePattern = visibleInitialSourcePatterns.some(
        (pattern) => String(pattern.key) === String(defaults?.source_pattern),
    )
        ? defaults?.source_pattern
        : visibleInitialSourcePatterns[0]?.key;

    const [sourcePatternId, setSourcePatternId] = useState(
        defaultSourcePattern ?? '',
    );
    const [sourceClassId, setSourceClassId] = useState<number | null>(null);
    const [sourceSubjectId, setSourceSubjectId] = useState<number | null>(null);
    const [targetPatternId, setTargetPatternId] = useState<number | null>(null);
    const [targetClassId, setTargetClassId] = useState<number | null>(null);
    const [targetSubjectId, setTargetSubjectId] = useState<number | null>(null);
    const [selectedChapterIds, setSelectedChapterIds] = useState<number[]>([]);
    const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
    const [isTransferring, setIsTransferring] = useState(false);
    const [replaceExisting, setReplaceExisting] = useState(false);
    const [convertExercisesToTopics, setConvertExercisesToTopics] =
        useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams();

        if (sourcePatternId) {
            params.set('source_pattern', sourcePatternId);
        }

        if (sourceClassId) {
            params.set('source_class_id', String(sourceClassId));
        }

        if (sourceSubjectId) {
            params.set('source_subject_id', String(sourceSubjectId));
        }

        if (targetPatternId) {
            params.set('target_pattern_id', String(targetPatternId));
        }

        if (targetClassId) {
            params.set('target_class_id', String(targetClassId));
        }

        let cancelled = false;

        fetch(`/superadmin/data-transfer/catalog?${params.toString()}`, {
            headers: { Accept: 'application/json' },
        })
            .then((response) => response.json() as Promise<CatalogResponse>)
            .then((catalog) => {
                if (cancelled) {
                    return;
                }

                setSourcePatterns(
                    catalog.source_patterns.filter(isVisibleSourcePattern),
                );
                setSourceClasses(catalog.source_classes);
                setSourceSubjects(catalog.source_subjects);
                setSourceChapters(catalog.source_chapters);
                setTargetPatterns(catalog.target_patterns);
                setTargetClasses(catalog.target_classes);
                setTargetSubjects(catalog.target_subjects);
            })
            .catch(() => {
                if (!cancelled) {
                    setError('Catalog could not be loaded.');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [
        sourcePatternId,
        sourceClassId,
        sourceSubjectId,
        targetPatternId,
        targetClassId,
    ]);

    const sourcePatternOptions = sourcePatterns.map((pattern) => ({
        id: pattern.key,
        label: pattern.label,
    }));
    const sourceClassOptions = comboboxOptions(sourceClasses);
    const sourceSubjectOptions = comboboxOptions(sourceSubjects);
    const targetPatternOptions = comboboxOptions(targetPatterns);
    const targetClassOptions = comboboxOptions(targetClasses);
    const targetSubjectOptions = comboboxOptions(targetSubjects);

    const canTransfer = useMemo(
        () =>
            Boolean(
                sourcePatternId &&
                sourceClassId &&
                sourceSubjectId &&
                (selectedChapterIds.length > 0 ||
                    selectedTopicIds.length > 0) &&
                targetPatternId &&
                targetClassId &&
                targetSubjectId &&
                !isTransferring,
            ),
        [
            sourcePatternId,
            sourceClassId,
            sourceSubjectId,
            selectedChapterIds.length,
            selectedTopicIds.length,
            targetPatternId,
            targetClassId,
            targetSubjectId,
            isTransferring,
        ],
    );

    const runTransfer = async () => {
        if (!canTransfer) {
            return;
        }

        setIsTransferring(true);
        setProgress(8);
        setMessage('');
        setError('');
        setIsCompletionModalOpen(false);

        const timer = window.setInterval(() => {
            setProgress((value) => (value < 90 ? value + 6 : value));
        }, 700);

        try {
            const response = await fetch('/superadmin/data-transfer', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({
                    source_pattern: sourcePatternId,
                    source_class_id: sourceClassId,
                    source_subject_id: sourceSubjectId,
                    source_chapter_ids: selectedChapterIds,
                    source_topic_ids: selectedTopicIds,
                    convert_exercises_to_topics: convertExercisesToTopics,

                    target_pattern_id: targetPatternId,
                    target_class_id: targetClassId,
                    target_subject_id: targetSubjectId,
                    replace_existing: replaceExisting,
                }),
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.message ?? 'Transfer failed.');
            }

            setProgress(100);
            const totals = payload.report?.totals;
            const assets = payload.report?.assets;
            const missingAssetWarning = assets?.missing
                ? ` ${assets.missing} referenced legacy image${assets.missing === 1 ? '' : 's'} could not be found and ${assets.missing === 1 ? 'was' : 'were'} left unchanged.`
                : '';
            const completionMessage = totals
                ? `Transferred ${totals.chapters} chapters, ${totals.topics} topics, ${totals.questions} questions, and ${totals.options} legacy options. ${assets ? `${assets.copied} images copied; ${assets.reused} reused.` : ''}${missingAssetWarning}`
                : (payload.message ?? 'Completed.');

            setMessage(completionMessage);
            setIsCompletionModalOpen(true);
        } catch (exception) {
            setProgress(0);
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'Transfer failed.',
            );
        } finally {
            window.clearInterval(timer);
            setIsTransferring(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)]">
                <section className="space-y-4 rounded-lg border p-4">
                    <h2 className="text-sm font-semibold">Source</h2>

                    <FloatingCombobox
                        label="Pattern"
                        options={sourcePatternOptions}
                        value={selectedOption(
                            sourcePatternOptions,
                            sourcePatternId,
                        )}
                        onChange={(option) => {
                            setSourcePatternId(String(option?.id ?? ''));
                            setSourceClassId(null);
                            setSourceSubjectId(null);
                            setSourceClasses([]);
                            setSourceSubjects([]);
                            setSourceChapters([]);
                            setSelectedChapterIds([]);
                            setSelectedTopicIds([]);
                            setConvertExercisesToTopics(false);
                            setMessage('');
                            setError('');
                        }}
                    />

                    <FloatingCombobox
                        label="Class"
                        options={sourceClassOptions}
                        value={selectedOption(
                            sourceClassOptions,
                            sourceClassId,
                        )}
                        disabled={!sourcePatternId}
                        onChange={(option) => {
                            setSourceClassId(option ? Number(option.id) : null);
                            setSourceSubjectId(null);
                            setSourceSubjects([]);
                            setSourceChapters([]);
                            setSelectedChapterIds([]);
                            setSelectedTopicIds([]);
                            setConvertExercisesToTopics(false);
                            setMessage('');
                            setError('');
                        }}
                    />

                    <FloatingCombobox
                        label="Subject"
                        options={sourceSubjectOptions}
                        value={selectedOption(
                            sourceSubjectOptions,
                            sourceSubjectId,
                        )}
                        disabled={!sourceClassId}
                        onChange={(option) => {
                            setSourceSubjectId(
                                option ? Number(option.id) : null,
                            );
                            setSourceChapters([]);
                            setSelectedChapterIds([]);
                            setSelectedTopicIds([]);
                            setConvertExercisesToTopics(false);
                            setMessage('');
                            setError('');
                        }}
                    />
                </section>

                <div className="flex items-center justify-center">
                    <span className="flex size-10 items-center justify-center rounded-full border">
                        <ArrowRightIcon className="size-5" />
                    </span>
                </div>

                <section className="space-y-4 rounded-lg border p-4">
                    <h2 className="text-sm font-semibold">Target</h2>

                    <FloatingCombobox
                        label="Pattern"
                        options={targetPatternOptions}
                        value={selectedOption(
                            targetPatternOptions,
                            targetPatternId,
                        )}
                        onChange={(option) => {
                            setTargetPatternId(
                                option ? Number(option.id) : null,
                            );
                            setTargetClassId(null);
                            setTargetSubjectId(null);
                            setReplaceExisting(false);
                            setTargetClasses([]);
                            setTargetSubjects([]);
                            setMessage('');
                            setError('');
                        }}
                    />

                    <FloatingCombobox
                        label="Class"
                        options={targetClassOptions}
                        value={selectedOption(
                            targetClassOptions,
                            targetClassId,
                        )}
                        disabled={!targetPatternId}
                        onChange={(option) => {
                            setTargetClassId(option ? Number(option.id) : null);
                            setTargetSubjectId(null);
                            setReplaceExisting(false);
                            setTargetSubjects([]);
                            setMessage('');
                            setError('');
                        }}
                    />

                    <FloatingCombobox
                        label="Subject"
                        options={targetSubjectOptions}
                        value={selectedOption(
                            targetSubjectOptions,
                            targetSubjectId,
                        )}
                        disabled={!targetClassId}
                        onChange={(option) => {
                            setTargetSubjectId(
                                option ? Number(option.id) : null,
                            );
                            setReplaceExisting(false);
                            setMessage('');
                            setError('');
                        }}
                    />
                </section>
            </div>

            {sourceSubjectId ? (
                <ChapterSelector
                    chapters={sourceChapters}
                    selectedChapterIds={selectedChapterIds}
                    selectedTopicIds={selectedTopicIds}
                    onChapterIdsChange={setSelectedChapterIds}
                    onTopicIdsChange={setSelectedTopicIds}
                />
            ) : null}

            <div className="sticky bottom-0 z-20 -mx-4 space-y-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
                {isTransferring ? (
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                ) : null}

                {error && (
                    <p className="text-right text-sm text-destructive">
                        {error}
                    </p>
                )}

                <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="flex flex-col gap-2">
                        <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
                            <Checkbox
                                checked={convertExercisesToTopics}
                                onCheckedChange={(value) =>
                                    setConvertExercisesToTopics(value === true)
                                }
                            />
                            <span>
                                Create topics from legacy exercises (use for
                                Math).
                            </span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
                            <Checkbox
                                checked={replaceExisting}
                                onCheckedChange={(value) =>
                                    setReplaceExisting(value === true)
                                }
                            />
                            <span>
                                Replace existing content in this exact target
                                scope.
                            </span>
                        </label>
                    </div>
                    <Button
                        type="button"
                        disabled={!canTransfer}
                        onClick={runTransfer}
                    >
                        Transfer Data
                    </Button>
                </div>
            </div>

            <Dialog
                open={isCompletionModalOpen}
                onOpenChange={setIsCompletionModalOpen}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="items-center text-center sm:text-center">
                        <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                            <CheckCircle2Icon className="size-6" />
                        </div>
                        <DialogTitle>Transfer completed</DialogTitle>
                        <DialogDescription className="text-center leading-6">
                            {message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center">
                        <Button
                            type="button"
                            onClick={() => setIsCompletionModalOpen(false)}
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ClassTransferPanel({
    defaults,
    initialSourcePatterns,
    initialTargetPatterns,
}: {
    defaults?: DataTransferProps['defaults'];
    initialSourcePatterns: SourcePattern[];
    initialTargetPatterns: TargetPattern[];
}) {
    const visibleInitialSourcePatterns = initialSourcePatterns.filter(
        isVisibleSourcePattern,
    );
    const defaultSourcePattern = visibleInitialSourcePatterns.some(
        (pattern) => String(pattern.key) === String(defaults?.source_pattern),
    )
        ? defaults?.source_pattern
        : visibleInitialSourcePatterns[0]?.key;

    const [sourcePatterns, setSourcePatterns] = useState(
        visibleInitialSourcePatterns,
    );
    const [sourceClasses, setSourceClasses] = useState<CatalogClass[]>([]);
    const [sourceSubjects, setSourceSubjects] = useState<SourceSubject[]>([]);
    const [targetPatterns, setTargetPatterns] = useState(initialTargetPatterns);
    const [targetClasses, setTargetClasses] = useState<CatalogClass[]>([]);
    const [sourcePatternId, setSourcePatternId] = useState(
        defaultSourcePattern ?? '',
    );
    const [sourceClassId, setSourceClassId] = useState<number | null>(null);
    const [targetPatternId, setTargetPatternId] = useState<number | null>(null);
    const [targetClassId, setTargetClassId] = useState<number | null>(null);
    const [replaceExisting, setReplaceExisting] = useState(false);
    const [isTransferring, setIsTransferring] = useState(false);
    const [progress, setProgress] = useState(0);
    const [transferStatus, setTransferStatus] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams();

        if (sourcePatternId) {
            params.set('source_pattern', sourcePatternId);
        }

        if (sourceClassId) {
            params.set('source_class_id', String(sourceClassId));
        }

        if (targetPatternId) {
            params.set('target_pattern_id', String(targetPatternId));
        }

        if (targetClassId) {
            params.set('target_class_id', String(targetClassId));
        }

        let cancelled = false;

        fetch(`/superadmin/data-transfer/catalog?${params.toString()}`, {
            headers: { Accept: 'application/json' },
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('Catalog could not be loaded.');
                }

                return response.json() as Promise<CatalogResponse>;
            })
            .then((catalog) => {
                if (cancelled) {
                    return;
                }

                setSourcePatterns(
                    catalog.source_patterns.filter(isVisibleSourcePattern),
                );
                setSourceClasses(catalog.source_classes);
                setSourceSubjects(catalog.source_subjects);
                setTargetPatterns(catalog.target_patterns);
                setTargetClasses(catalog.target_classes);
            })
            .catch((exception) => {
                if (!cancelled) {
                    setError(
                        exception instanceof Error
                            ? exception.message
                            : 'Catalog could not be loaded.',
                    );
                }
            });

        return () => {
            cancelled = true;
        };
    }, [sourcePatternId, sourceClassId, targetPatternId, targetClassId]);

    const sourcePatternOptions = sourcePatterns.map((pattern) => ({
        id: pattern.key,
        label: pattern.label,
    }));
    const sourceClassOptions = comboboxOptions(sourceClasses);
    const targetPatternOptions = comboboxOptions(targetPatterns);
    const targetClassOptions = comboboxOptions(targetClasses);
    const canTransfer = Boolean(
        sourcePatternId &&
        sourceClassId &&
        sourceSubjects.length > 0 &&
        targetPatternId &&
        targetClassId &&
        !isTransferring,
    );

    const runTransfer = async () => {
        if (!canTransfer) {
            return;
        }

        setIsTransferring(true);
        setProgress(0);
        setTransferStatus('Preparing class transfer…');
        setMessage('');
        setError('');
        setIsCompletionModalOpen(false);

        const totals = {
            subjects: 0,
            chapters: 0,
            topics: 0,
            questions: 0,
        };
        const assets = { copied: 0, reused: 0, missing: 0 };
        let completedSubjects = 0;

        try {
            for (const [index, subject] of sourceSubjects.entries()) {
                setTransferStatus(
                    `Transferring ${subject.name} (${index + 1} of ${sourceSubjects.length})…`,
                );

                const response = await fetch('/superadmin/data-transfer', {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken(),
                    },
                    body: JSON.stringify({
                        class_wise: true,
                        source_pattern: sourcePatternId,
                        source_class_id: sourceClassId,
                        source_subject_ids: [subject.id],
                        target_pattern_id: targetPatternId,
                        target_class_id: targetClassId,
                        replace_existing: replaceExisting,
                    }),
                });
                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(
                        `${subject.name}: ${payload?.message ?? 'transfer failed.'}`,
                    );
                }

                const subjectTotals = payload?.report?.totals;
                const subjectAssets = payload?.report?.assets;
                totals.subjects += subjectTotals?.subjects ?? 0;
                totals.chapters += subjectTotals?.chapters ?? 0;
                totals.topics += subjectTotals?.topics ?? 0;
                totals.questions += subjectTotals?.questions ?? 0;
                assets.copied += subjectAssets?.copied ?? 0;
                assets.reused += subjectAssets?.reused ?? 0;
                assets.missing += subjectAssets?.missing ?? 0;

                completedSubjects++;
                setProgress(
                    Math.round(
                        (completedSubjects / sourceSubjects.length) * 100,
                    ),
                );
            }

            setTransferStatus('Class transfer completed.');
            const missingAssetWarning = assets.missing
                ? ` ${assets.missing} referenced legacy image${assets.missing === 1 ? '' : 's'} could not be found and ${assets.missing === 1 ? 'was' : 'were'} left unchanged.`
                : '';
            const completionMessage = `Transferred ${totals.subjects} subjects, ${totals.chapters} chapters, ${totals.topics} topics, and ${totals.questions} questions. ${assets.copied} images copied; ${assets.reused} reused.${missingAssetWarning}`;

            setMessage(completionMessage);
            setIsCompletionModalOpen(true);
        } catch (exception) {
            setTransferStatus('Class transfer stopped.');
            const completedMessage = completedSubjects
                ? ` ${completedSubjects} of ${sourceSubjects.length} subjects completed successfully and were kept.`
                : '';
            setError(
                (exception instanceof Error
                    ? exception.message
                    : 'Class transfer failed.') + completedMessage,
            );
        } finally {
            setIsTransferring(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)]">
                <section className="space-y-4 rounded-lg border p-4">
                    <h2 className="text-sm font-semibold">Source class</h2>

                    <FloatingCombobox
                        label="Pattern"
                        options={sourcePatternOptions}
                        value={selectedOption(
                            sourcePatternOptions,
                            sourcePatternId,
                        )}
                        onChange={(option) => {
                            setSourcePatternId(String(option?.id ?? ''));
                            setSourceClassId(null);
                            setSourceClasses([]);
                            setSourceSubjects([]);
                            setMessage('');
                            setError('');
                        }}
                    />

                    <FloatingCombobox
                        label="Class"
                        options={sourceClassOptions}
                        value={selectedOption(
                            sourceClassOptions,
                            sourceClassId,
                        )}
                        disabled={!sourcePatternId}
                        onChange={(option) => {
                            setSourceClassId(option ? Number(option.id) : null);
                            setSourceSubjects([]);
                            setMessage('');
                            setError('');
                        }}
                    />
                </section>

                <div className="flex items-center justify-center">
                    <span className="flex size-10 items-center justify-center rounded-full border">
                        <ArrowRightIcon className="size-5" />
                    </span>
                </div>

                <section className="space-y-4 rounded-lg border p-4">
                    <h2 className="text-sm font-semibold">Target class</h2>

                    <FloatingCombobox
                        label="Pattern"
                        options={targetPatternOptions}
                        value={selectedOption(
                            targetPatternOptions,
                            targetPatternId,
                        )}
                        onChange={(option) => {
                            setTargetPatternId(
                                option ? Number(option.id) : null,
                            );
                            setTargetClassId(null);
                            setTargetClasses([]);
                            setReplaceExisting(false);
                            setMessage('');
                            setError('');
                        }}
                    />

                    <FloatingCombobox
                        label="Class"
                        options={targetClassOptions}
                        value={selectedOption(
                            targetClassOptions,
                            targetClassId,
                        )}
                        disabled={!targetPatternId}
                        onChange={(option) => {
                            setTargetClassId(option ? Number(option.id) : null);
                            setReplaceExisting(false);
                            setMessage('');
                            setError('');
                        }}
                    />
                </section>
            </div>

            {sourceClassId ? (
                <section className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-semibold">Subjects</h2>
                        <span className="text-sm text-muted-foreground">
                            {sourceSubjects.length} found
                        </span>
                    </div>

                    {sourceSubjects.length > 0 ? (
                        <div className="divide-y rounded-lg border">
                            {sourceSubjects.map((subject) => (
                                <div
                                    key={subject.id}
                                    className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">
                                            {subject.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {subject.chapters_count ?? 0}{' '}
                                            chapters ·{' '}
                                            {subject.questions_count ?? 0}{' '}
                                            questions
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                                        {subject.class_transfer_type ===
                                        'topic-wise'
                                            ? subject.uses_exercise_topics
                                                ? 'Topic-wise · Math exercises'
                                                : 'Topic-wise'
                                            : 'Chapter-wise'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                            No transferable subjects were found in this class.
                        </p>
                    )}
                </section>
            ) : null}

            <div className="sticky bottom-0 z-20 -mx-4 space-y-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
                {isTransferring ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate text-muted-foreground">
                                {transferStatus}
                            </span>
                            <span className="shrink-0 font-medium">
                                {progress}%
                            </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                ) : null}

                {error && (
                    <p className="text-right text-sm text-destructive">
                        {error}
                    </p>
                )}

                <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                    <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
                        <Checkbox
                            checked={replaceExisting}
                            onCheckedChange={(value) =>
                                setReplaceExisting(value === true)
                            }
                        />
                        <span>
                            Replace existing content for these subjects.
                        </span>
                    </label>
                    <Button
                        type="button"
                        disabled={!canTransfer}
                        onClick={runTransfer}
                    >
                        {isTransferring
                            ? 'Transferring class…'
                            : 'Transfer Class'}
                    </Button>
                </div>
            </div>

            <Dialog
                open={isCompletionModalOpen}
                onOpenChange={setIsCompletionModalOpen}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="items-center text-center sm:text-center">
                        <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                            <CheckCircle2Icon className="size-6" />
                        </div>
                        <DialogTitle>Class transfer completed</DialogTitle>
                        <DialogDescription className="text-center leading-6">
                            {message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center">
                        <Button
                            type="button"
                            onClick={() => setIsCompletionModalOpen(false)}
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ChapterSelector({
    chapters,
    onChapterIdsChange,
    onTopicIdsChange,
    selectedChapterIds,
    selectedTopicIds,
}: {
    chapters: SourceChapter[];
    onChapterIdsChange: (value: number[]) => void;
    onTopicIdsChange: (value: number[]) => void;
    selectedChapterIds: number[];
    selectedTopicIds: number[];
}) {
    const allChapterIds = chapters.map((chapter) => chapter.id);
    const allTopicIds = chapters.flatMap((chapter) =>
        chapter.topics.map((topic) => topic.id),
    );
    const isAllSelected =
        allChapterIds.length > 0 &&
        allChapterIds.every((id) => selectedChapterIds.includes(id)) &&
        allTopicIds.every((id) => selectedTopicIds.includes(id));

    const toggleChapter = (chapterId: number, checked: boolean) => {
        const chapter = chapters.find((item) => item.id === chapterId);
        const chapterTopicIds = chapter?.topics.map((topic) => topic.id) ?? [];

        onChapterIdsChange(
            checked
                ? Array.from(new Set([...selectedChapterIds, chapterId]))
                : selectedChapterIds.filter((id) => id !== chapterId),
        );

        if (chapterTopicIds.length > 0) {
            onTopicIdsChange(
                checked
                    ? Array.from(
                          new Set([...selectedTopicIds, ...chapterTopicIds]),
                      )
                    : selectedTopicIds.filter(
                          (id) => !chapterTopicIds.includes(id),
                      ),
            );
        }
    };

    const toggleTopic = (
        chapterId: number,
        topicId: number,
        checked: boolean,
    ) => {
        const chapter = chapters.find((item) => item.id === chapterId);
        const chapterTopicIds = chapter?.topics.map((topic) => topic.id) ?? [];
        const nextTopicIds = checked
            ? Array.from(new Set([...selectedTopicIds, topicId]))
            : selectedTopicIds.filter((id) => id !== topicId);
        const hasChapterTopicSelected = chapterTopicIds.some((id) =>
            nextTopicIds.includes(id),
        );

        onTopicIdsChange(nextTopicIds);
        onChapterIdsChange(
            hasChapterTopicSelected
                ? Array.from(new Set([...selectedChapterIds, chapterId]))
                : selectedChapterIds.filter((id) => id !== chapterId),
        );
    };

    const toggleAll = (checked: boolean) => {
        onChapterIdsChange(checked ? allChapterIds : []);
        onTopicIdsChange(checked ? allTopicIds : []);
    };

    return (
        <section className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Chapters</h2>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={(value) => toggleAll(value === true)}
                    />
                    <span>Select All</span>
                </label>
            </div>

            <div className="divide-y rounded-lg border">
                {chapters.map((chapter) => {
                    const isChapterChecked = selectedChapterIds.includes(
                        chapter.id,
                    );

                    return (
                        <div key={chapter.id} className="p-3">
                            <label className="flex cursor-pointer items-center gap-3">
                                <Checkbox
                                    checked={isChapterChecked}
                                    onCheckedChange={(value) =>
                                        toggleChapter(
                                            chapter.id,
                                            value === true,
                                        )
                                    }
                                />
                                <span className="min-w-0 truncate text-sm font-medium">
                                    {chapter.name}
                                </span>
                            </label>

                            {chapter.topics.length > 0 ? (
                                <div className="mt-3 grid gap-2 pl-8 md:grid-cols-2 xl:grid-cols-3">
                                    {chapter.topics.map((topic) => (
                                        <label
                                            key={topic.id}
                                            className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                                        >
                                            <Checkbox
                                                checked={selectedTopicIds.includes(
                                                    topic.id,
                                                )}
                                                onCheckedChange={(value) =>
                                                    toggleTopic(
                                                        chapter.id,
                                                        topic.id,
                                                        value === true,
                                                    )
                                                }
                                            />
                                            <span className="truncate">
                                                {topic.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export default function DataTransfer({
    defaults,
    sourcePatterns,
    targetPatterns,
}: DataTransferProps) {
    const [activeTab, setActiveTab] = useState<TransferTab>('legacy');

    return (
        <>
            <Head title="Data Transfer" />
            <div className="space-y-5 p-4 md:p-6">
                <h1 className="h1-semibold">Data Transfer</h1>

                <div className="border-b">
                    <div className="flex gap-1 overflow-x-auto">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.key;

                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`cursor-pointer border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'border-primary text-foreground'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {activeTab === 'legacy' ? (
                    <SubjectTransferPanel
                        defaults={defaults}
                        initialSourcePatterns={sourcePatterns}
                        initialTargetPatterns={targetPatterns}
                    />
                ) : activeTab === 'class' ? (
                    <ClassTransferPanel
                        defaults={defaults}
                        initialSourcePatterns={sourcePatterns}
                        initialTargetPatterns={targetPatterns}
                    />
                ) : (
                    <section className="min-h-[320px] rounded-lg border p-4" />
                )}
            </div>
        </>
    );
}

DataTransfer.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Data Transfer', href: '/superadmin/data-transfer' },
    ],
};

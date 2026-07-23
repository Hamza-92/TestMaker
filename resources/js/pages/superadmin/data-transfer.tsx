import { Head } from '@inertiajs/react';
import { ArrowRightIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    FloatingCombobox,
    type ComboboxOptionItem,
} from '@/components/ui/floating-combobox';

const tabs = [
    { key: 'legacy', label: 'Legacy Data Transfer' },
    { key: 'creative', label: 'Creative Data Transfer' },
] as const;

type TransferTab = (typeof tabs)[number]['key'];

interface SourcePattern {
    key: string;
    label: string;
    afaq: number;
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
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)
            ?.content ?? ''
    );
}

function comboboxOptions<T extends { id: number | string; name?: string; label?: string }>(
    items: T[],
): ComboboxOptionItem[] {
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
    const [sourcePatterns, setSourcePatterns] = useState(initialSourcePatterns);
    const [sourceClasses, setSourceClasses] = useState<CatalogClass[]>([]);
    const [sourceSubjects, setSourceSubjects] = useState<SourceSubject[]>([]);
    const [sourceChapters, setSourceChapters] = useState<SourceChapter[]>([]);
    const [targetPatterns, setTargetPatterns] = useState(initialTargetPatterns);
    const [targetClasses, setTargetClasses] = useState<CatalogClass[]>([]);
    const [targetSubjects, setTargetSubjects] = useState<TargetSubject[]>([]);

    const [sourcePatternId, setSourcePatternId] = useState(
        defaults?.source_pattern ?? initialSourcePatterns[0]?.key ?? '',
    );
    const [sourceClassId, setSourceClassId] = useState<number | null>(null);
    const [sourceSubjectId, setSourceSubjectId] = useState<number | null>(null);
    const [targetPatternId, setTargetPatternId] = useState<number | null>(null);
    const [targetClassId, setTargetClassId] = useState<number | null>(null);
    const [targetSubjectId, setTargetSubjectId] = useState<number | null>(null);
    const [selectedChapterIds, setSelectedChapterIds] = useState<number[]>([]);
    const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
    const [isTransferring, setIsTransferring] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

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

                setSourcePatterns(catalog.source_patterns);
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
                    (selectedChapterIds.length > 0 || selectedTopicIds.length > 0) &&
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
                    target_pattern_id: targetPatternId,
                    target_class_id: targetClassId,
                    target_subject_id: targetSubjectId,
                }),
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.message ?? 'Transfer failed.');
            }

            setProgress(100);
            setMessage(payload.message ?? 'Completed.');
        } catch (exception) {
            setProgress(0);
            setError(exception instanceof Error ? exception.message : 'Transfer failed.');
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
                        value={selectedOption(sourcePatternOptions, sourcePatternId)}
                        onChange={(option) => {
                            setSourcePatternId(String(option?.id ?? ''));
                            setSourceClassId(null);
                            setSourceSubjectId(null);
                            setSourceClasses([]);
                            setSourceSubjects([]);
                            setSourceChapters([]);
                            setSelectedChapterIds([]);
                            setSelectedTopicIds([]);
                            setMessage('');
                            setError('');
                        }}
                    />

                    <FloatingCombobox
                        label="Class"
                        options={sourceClassOptions}
                        value={selectedOption(sourceClassOptions, sourceClassId)}
                        disabled={!sourcePatternId}
                        onChange={(option) => {
                            setSourceClassId(option ? Number(option.id) : null);
                            setSourceSubjectId(null);
                            setSourceSubjects([]);
                            setSourceChapters([]);
                            setSelectedChapterIds([]);
                            setSelectedTopicIds([]);
                            setMessage('');
                            setError('');
                        }}
                    />

                    <FloatingCombobox
                        label="Subject"
                        options={sourceSubjectOptions}
                        value={selectedOption(sourceSubjectOptions, sourceSubjectId)}
                        disabled={!sourceClassId}
                        onChange={(option) => {
                            setSourceSubjectId(option ? Number(option.id) : null);
                            setSourceChapters([]);
                            setSelectedChapterIds([]);
                            setSelectedTopicIds([]);
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
                        value={selectedOption(targetPatternOptions, targetPatternId)}
                        onChange={(option) => {
                            setTargetPatternId(option ? Number(option.id) : null);
                            setTargetClassId(null);
                            setTargetSubjectId(null);
                            setTargetClasses([]);
                            setTargetSubjects([]);
                            setMessage('');
                            setError('');
                        }}
                    />

                    <FloatingCombobox
                        label="Class"
                        options={targetClassOptions}
                        value={selectedOption(targetClassOptions, targetClassId)}
                        disabled={!targetPatternId}
                        onChange={(option) => {
                            setTargetClassId(option ? Number(option.id) : null);
                            setTargetSubjectId(null);
                            setTargetSubjects([]);
                            setMessage('');
                            setError('');
                        }}
                    />

                    <FloatingCombobox
                        label="Subject"
                        options={targetSubjectOptions}
                        value={selectedOption(targetSubjectOptions, targetSubjectId)}
                        disabled={!targetClassId}
                        onChange={(option) => {
                            setTargetSubjectId(option ? Number(option.id) : null);
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

            <div className="space-y-3">
                {isTransferring ? (
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                ) : null}

                {(message || error) && (
                    <p
                        className={`text-right text-sm ${
                            error ? 'text-destructive' : 'text-muted-foreground'
                        }`}
                    >
                        {error || message}
                    </p>
                )}

                <div className="flex justify-end">
                    <Button type="button" disabled={!canTransfer} onClick={runTransfer}>
                        Transfer Data
                    </Button>
                </div>
            </div>
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
                    ? Array.from(new Set([...selectedTopicIds, ...chapterTopicIds]))
                    : selectedTopicIds.filter((id) => !chapterTopicIds.includes(id)),
            );
        }
    };

    const toggleTopic = (chapterId: number, topicId: number, checked: boolean) => {
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
                    const isChapterChecked = selectedChapterIds.includes(chapter.id);

                    return (
                        <div key={chapter.id} className="p-3">
                            <label className="flex cursor-pointer items-center gap-3">
                                <Checkbox
                                    checked={isChapterChecked}
                                    onCheckedChange={(value) =>
                                        toggleChapter(chapter.id, value === true)
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
                                                checked={selectedTopicIds.includes(topic.id)}
                                                onCheckedChange={(value) =>
                                                    toggleTopic(
                                                        chapter.id,
                                                        topic.id,
                                                        value === true,
                                                    )
                                                }
                                            />
                                            <span className="truncate">{topic.name}</span>
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

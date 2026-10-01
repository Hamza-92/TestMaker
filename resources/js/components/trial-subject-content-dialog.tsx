import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export type TrialContentRules = Record<string, number[]>;

interface TrialTopic {
    id: number;
    name: string;
    name_ur: string | null;
}

interface TrialChapter {
    id: number;
    name: string;
    name_ur: string | null;
    chapter_number: number | null;
    topics: TrialTopic[];
}

interface Props {
    patternId: number;
    classId: number;
    subjectId: number;
    subjectName: string;
    chapterIds: number[] | null;
    topicIds: number[] | null;
    onClose: () => void;
    onApply: (chapters: number[] | null, topics: number[] | null) => void;
}

function sortedIds(ids: number[]): number[] {
    return [...new Set(ids)].sort((left, right) => left - right);
}

export function TrialSubjectContentDialog({
    patternId,
    classId,
    subjectId,
    subjectName,
    chapterIds,
    topicIds,
    onClose,
    onApply,
}: Props) {
    const [draftChapters, setDraftChapters] = useState<number[] | null>(
        chapterIds,
    );
    const [draftTopics, setDraftTopics] = useState<number[] | null>(topicIds);
    const [resource, setResource] = useState<{
        chapters: TrialChapter[];
        error: string | null;
    } | null>(null);

    useEffect(() => {
        const abortController = new AbortController();
        const params = new URLSearchParams({
            pattern_id: String(patternId),
            class_id: String(classId),
            subject_id: String(subjectId),
        });

        fetch(`/superadmin/trial-settings/chapters?${params}`, {
            headers: { Accept: 'application/json' },
            signal: abortController.signal,
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('Unable to load chapters and topics.');
                }

                return response.json() as Promise<{ chapters: TrialChapter[] }>;
            })
            .then((result) => {
                if (!abortController.signal.aborted) {
                    setResource({ chapters: result.chapters, error: null });
                }
            })
            .catch(() => {
                if (!abortController.signal.aborted) {
                    setResource({
                        chapters: [],
                        error: 'Unable to load chapters and topics.',
                    });
                }
            });

        return () => abortController.abort();
    }, [patternId, classId, subjectId]);

    const chapters = resource?.chapters ?? [];
    const allChapterIds = chapters.map((chapter) => chapter.id);
    const selectedChapterIds = draftChapters ?? allChapterIds;
    const availableTopicIds = chapters
        .filter((chapter) => selectedChapterIds.includes(chapter.id))
        .flatMap((chapter) => chapter.topics.map((topic) => topic.id));
    const selectedTopicIds = draftTopics ?? availableTopicIds;

    function toggleChapter(chapter: TrialChapter, checked: boolean) {
        setDraftChapters(
            sortedIds(
                checked
                    ? [...selectedChapterIds, chapter.id]
                    : selectedChapterIds.filter((id) => id !== chapter.id),
            ),
        );

        if (checked && draftTopics !== null) {
            setDraftTopics(
                sortedIds([
                    ...draftTopics,
                    ...chapter.topics.map((topic) => topic.id),
                ]),
            );
        } else if (draftTopics !== null) {
            const removedTopicIds = new Set(
                chapter.topics.map((topic) => topic.id),
            );
            setDraftTopics(
                draftTopics.filter((id) => !removedTopicIds.has(id)),
            );
        }
    }

    function toggleTopic(topicId: number, checked: boolean) {
        setDraftTopics(
            sortedIds(
                checked
                    ? [...selectedTopicIds, topicId]
                    : selectedTopicIds.filter((id) => id !== topicId),
            ),
        );
    }

    function apply() {
        const chaptersRule =
            selectedChapterIds.length === allChapterIds.length
                ? null
                : sortedIds(selectedChapterIds);
        const topicsRule =
            selectedTopicIds.length === availableTopicIds.length
                ? null
                : sortedIds(selectedTopicIds);
        onApply(chaptersRule, topicsRule);
    }

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
                <DialogHeader className="shrink-0 px-6 pt-6 pr-12 pb-3">
                    <DialogTitle>
                        Chapters &amp; topics — {subjectName}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Choose trial chapters and topics for this subject.
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
                    {!resource && (
                        <p className="text-sm text-muted-foreground">
                            Loading chapters and topics…
                        </p>
                    )}
                    {resource?.error && (
                        <p className="text-sm text-destructive">
                            {resource.error}
                        </p>
                    )}
                    {resource && !resource.error && (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-xs">
                                <p className="text-muted-foreground">
                                    {selectedChapterIds.length} of{' '}
                                    {chapters.length} chapters ·{' '}
                                    {selectedTopicIds.length} of{' '}
                                    {availableTopicIds.length} topics
                                </p>
                                <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 font-medium">
                                    <Checkbox
                                        checked={
                                            chapters.length > 0 &&
                                            selectedChapterIds.length ===
                                                allChapterIds.length &&
                                            selectedTopicIds.length ===
                                                availableTopicIds.length
                                        }
                                        disabled={chapters.length === 0}
                                        onCheckedChange={(checked) => {
                                            setDraftChapters(
                                                checked === true ? null : [],
                                            );
                                            setDraftTopics(
                                                checked === true ? null : [],
                                            );
                                        }}
                                    />
                                    Select all
                                </label>
                            </div>
                            {chapters.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    No active chapters in this subject.
                                </p>
                            )}
                            {chapters.map((chapter) => {
                                const selected = selectedChapterIds.includes(
                                    chapter.id,
                                );

                                return (
                                    <div
                                        key={chapter.id}
                                        className="rounded-lg border p-3"
                                    >
                                        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                                            <Checkbox
                                                checked={selected}
                                                onCheckedChange={(checked) =>
                                                    toggleChapter(
                                                        chapter,
                                                        checked === true,
                                                    )
                                                }
                                            />
                                            <span>
                                                {chapter.chapter_number
                                                    ? `${chapter.chapter_number}. `
                                                    : ''}
                                                {chapter.name ||
                                                    chapter.name_ur}
                                            </span>
                                        </label>
                                        {chapter.topics.length > 0 && (
                                            <div className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-2">
                                                {chapter.topics.map((topic) => (
                                                    <label
                                                        key={topic.id}
                                                        className="flex cursor-pointer items-center gap-2 text-xs"
                                                    >
                                                        <Checkbox
                                                            checked={
                                                                selected &&
                                                                selectedTopicIds.includes(
                                                                    topic.id,
                                                                )
                                                            }
                                                            disabled={!selected}
                                                            onCheckedChange={(
                                                                checked,
                                                            ) =>
                                                                toggleTopic(
                                                                    topic.id,
                                                                    checked ===
                                                                        true,
                                                                )
                                                            }
                                                        />
                                                        <span>
                                                            {topic.name ||
                                                                topic.name_ur}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
                    <button
                        type="button"
                        className="rounded-md border px-4 py-2 text-sm"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!resource || Boolean(resource.error)}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                        onClick={apply}
                    >
                        Apply to settings
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

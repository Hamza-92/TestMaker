import { Head } from '@inertiajs/react';
import { ArrowRightIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
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

const sourcePatterns = [
    {
        id: 'short_syllabus',
        name: 'short_syllabus',
        classes: [
            {
                id: '31',
                name: '9th',
                subjects: [
                    {
                        id: '120',
                        name: 'English 2025',
                        chapters: [
                            { id: '120-1', name: 'Unit 1', topics: [] },
                            { id: '120-2', name: 'Unit 2', topics: [] },
                            { id: '120-3', name: 'Unit 3', topics: [] },
                        ],
                    },
                    {
                        id: '122',
                        name: 'Mathematics 2025',
                        chapters: [
                            { id: '122-1', name: 'Real Numbers', topics: [] },
                            { id: '122-2', name: 'Logarithms', topics: [] },
                            { id: '122-3', name: 'Sets and Functions', topics: [] },
                        ],
                    },
                    {
                        id: '116',
                        name: 'Physics 2025',
                        chapters: [
                            {
                                id: '116-1',
                                name: 'Physical Quantities',
                                topics: [
                                    { id: '116-1-1', name: 'Measurements' },
                                    { id: '116-1-2', name: 'Prefixes' },
                                    { id: '116-1-3', name: 'Errors' },
                                ],
                            },
                            {
                                id: '116-2',
                                name: 'Kinematics',
                                topics: [
                                    { id: '116-2-1', name: 'Speed and Velocity' },
                                    { id: '116-2-2', name: 'Acceleration' },
                                    { id: '116-2-3', name: 'Graphs' },
                                ],
                            },
                        ],
                    },
                    {
                        id: '123',
                        name: 'Urdu 2025',
                        chapters: [
                            { id: '123-1', name: 'سبق 1', topics: [] },
                            { id: '123-2', name: 'سبق 2', topics: [] },
                            { id: '123-3', name: 'سبق 3', topics: [] },
                        ],
                    },
                ],
            },
        ],
    },
];

const targetPatterns = [
    {
        id: 'pecta',
        name: 'PECTA',
        classes: [
            {
                id: '9th',
                name: '9th',
                subjects: [
                    { id: 'english', name: 'English 2025' },
                    { id: 'mathematics', name: 'Mathematics 2025' },
                    { id: 'physics', name: 'Physics 2025' },
                    { id: 'urdu', name: 'Urdu 2025' },
                ],
            },
        ],
    },
];

type TransferTab = (typeof tabs)[number]['key'];
type SourceSubject = (typeof sourcePatterns)[number]['classes'][number]['subjects'][number];

function comboboxOptions<T extends { id: string; name: string }>(
    items: T[],
): ComboboxOptionItem[] {
    return items.map((item) => ({
        id: item.id,
        label: item.name,
    }));
}

function selectedOption(
    options: ComboboxOptionItem[],
    id: string,
): ComboboxOptionItem | null {
    return options.find((option) => String(option.id) === id) ?? null;
}

function SubjectTransferPanel() {
    const [sourcePatternId, setSourcePatternId] = useState('');
    const [sourceClassId, setSourceClassId] = useState('');
    const [sourceSubjectId, setSourceSubjectId] = useState('');
    const [targetPatternId, setTargetPatternId] = useState('');
    const [targetClassId, setTargetClassId] = useState('');
    const [targetSubjectId, setTargetSubjectId] = useState('');
    const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
    const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
    const [isTransferring, setIsTransferring] = useState(false);

    const selectedSourcePattern = sourcePatterns.find(
        (pattern) => pattern.id === sourcePatternId,
    );
    const sourceClasses = selectedSourcePattern?.classes ?? [];
    const selectedSourceClass = sourceClasses.find(
        (schoolClass) => schoolClass.id === sourceClassId,
    );
    const sourceSubjects = selectedSourceClass?.subjects ?? [];
    const selectedSourceSubject = sourceSubjects.find(
        (subject) => subject.id === sourceSubjectId,
    );

    const selectedTargetPattern = targetPatterns.find(
        (pattern) => pattern.id === targetPatternId,
    );
    const targetClasses = selectedTargetPattern?.classes ?? [];
    const selectedTargetClass = targetClasses.find(
        (schoolClass) => schoolClass.id === targetClassId,
    );
    const targetSubjects = selectedTargetClass?.subjects ?? [];
    const sourcePatternOptions = comboboxOptions(sourcePatterns);
    const sourceClassOptions = comboboxOptions(sourceClasses);
    const sourceSubjectOptions = comboboxOptions(sourceSubjects);
    const targetPatternOptions = comboboxOptions(targetPatterns);
    const targetClassOptions = comboboxOptions(targetClasses);
    const targetSubjectOptions = comboboxOptions(targetSubjects);

    const canTransfer = useMemo(
        () =>
            sourcePatternId &&
            sourceClassId &&
            sourceSubjectId &&
            (selectedChapterIds.length > 0 || selectedTopicIds.length > 0) &&
            targetPatternId &&
            targetClassId &&
            targetSubjectId,
        [
            sourcePatternId,
            sourceClassId,
            sourceSubjectId,
            selectedChapterIds.length,
            selectedTopicIds.length,
            targetPatternId,
            targetClassId,
            targetSubjectId,
        ],
    );

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
                            setSourceClassId('');
                            setSourceSubjectId('');
                            setSelectedChapterIds([]);
                            setSelectedTopicIds([]);
                            setIsTransferring(false);
                        }}
                    />

                    <FloatingCombobox
                        label="Class"
                        options={sourceClassOptions}
                        value={selectedOption(sourceClassOptions, sourceClassId)}
                        disabled={!sourcePatternId}
                        onChange={(option) => {
                            setSourceClassId(String(option?.id ?? ''));
                            setSourceSubjectId('');
                            setSelectedChapterIds([]);
                            setSelectedTopicIds([]);
                            setIsTransferring(false);
                        }}
                    />

                    <FloatingCombobox
                        label="Subject"
                        options={sourceSubjectOptions}
                        value={selectedOption(sourceSubjectOptions, sourceSubjectId)}
                        disabled={!sourceClassId}
                        onChange={(option) => {
                            setSourceSubjectId(String(option?.id ?? ''));
                            setSelectedChapterIds([]);
                            setSelectedTopicIds([]);
                            setIsTransferring(false);
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
                            setTargetPatternId(String(option?.id ?? ''));
                            setTargetClassId('');
                            setTargetSubjectId('');
                            setIsTransferring(false);
                        }}
                    />

                    <FloatingCombobox
                        label="Class"
                        options={targetClassOptions}
                        value={selectedOption(targetClassOptions, targetClassId)}
                        disabled={!targetPatternId}
                        onChange={(option) => {
                            setTargetClassId(String(option?.id ?? ''));
                            setTargetSubjectId('');
                            setIsTransferring(false);
                        }}
                    />

                    <FloatingCombobox
                        label="Subject"
                        options={targetSubjectOptions}
                        value={selectedOption(targetSubjectOptions, targetSubjectId)}
                        disabled={!targetClassId}
                        onChange={(option) => {
                            setTargetSubjectId(String(option?.id ?? ''));
                            setIsTransferring(false);
                        }}
                    />
                </section>
            </div>

            {selectedSourceSubject ? (
                <ChapterSelector
                    selectedChapterIds={selectedChapterIds}
                    selectedSubject={selectedSourceSubject}
                    selectedTopicIds={selectedTopicIds}
                    onChapterIdsChange={setSelectedChapterIds}
                    onTopicIdsChange={setSelectedTopicIds}
                />
            ) : null}

            <div className="space-y-3">
                {isTransferring ? (
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-1/3 rounded-full bg-primary" />
                    </div>
                ) : null}

                <div className="flex justify-end">
                    <Button
                        type="button"
                        disabled={!canTransfer}
                        onClick={() => setIsTransferring(true)}
                    >
                        Transfer Data
                    </Button>
                </div>
            </div>
        </div>
    );
}

function ChapterSelector({
    onChapterIdsChange,
    onTopicIdsChange,
    selectedChapterIds,
    selectedSubject,
    selectedTopicIds,
}: {
    onChapterIdsChange: (value: string[]) => void;
    onTopicIdsChange: (value: string[]) => void;
    selectedChapterIds: string[];
    selectedSubject: SourceSubject;
    selectedTopicIds: string[];
}) {
    const allChapterIds = selectedSubject.chapters.map((chapter) => chapter.id);
    const allTopicIds = selectedSubject.chapters.flatMap((chapter) =>
        chapter.topics.map((topic) => topic.id),
    );
    const isAllSelected =
        allChapterIds.length > 0 &&
        allChapterIds.every((id) => selectedChapterIds.includes(id)) &&
        allTopicIds.every((id) => selectedTopicIds.includes(id));

    const toggleChapter = (chapterId: string, checked: boolean) => {
        const chapter = selectedSubject.chapters.find((item) => item.id === chapterId);
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

    const toggleTopic = (topicId: string, checked: boolean) => {
        onTopicIdsChange(
            checked
                ? Array.from(new Set([...selectedTopicIds, topicId]))
                : selectedTopicIds.filter((id) => id !== topicId),
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
                {selectedSubject.chapters.map((chapter) => {
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
                                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                    {chapter.topics.map((topic) => (
                                        <label
                                            key={topic.id}
                                            className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                                        >
                                            <Checkbox
                                                checked={selectedTopicIds.includes(topic.id)}
                                                onCheckedChange={(value) =>
                                                    toggleTopic(topic.id, value === true)
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

export default function DataTransfer() {
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
                    <SubjectTransferPanel />
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

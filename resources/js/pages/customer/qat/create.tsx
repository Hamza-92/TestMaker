import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    BookOpenIcon,
    CheckIcon,
    GraduationCapIcon,
    SearchIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/tm';

type QatClass = {
    id: number;
    name: string;
    academic_year: string;
    subject_count: number;
};

type QatSubject = {
    id: number;
    qat_class_id: number;
    name: string;
    class_name: string;
    chapter_count: number;
};

type QatChapter = {
    id: number;
    qat_subject_id: number;
    name: string;
};

export default function QatCreate({
    mode,
    classes,
    subjects,
    chapters,
}: {
    mode: 'auto' | 'manual';
    classes: QatClass[];
    subjects: QatSubject[];
    chapters: QatChapter[];
}) {
    const [step, setStep] = useState(0);
    const [query, setQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
    const [selectedChapterIds, setSelectedChapterIds] = useState<number[]>([]);
    const visibleClasses = useMemo(() => {
        const term = query.trim().toLocaleLowerCase();

        return term
            ? classes.filter((item) =>
                  item.name.toLocaleLowerCase().includes(term),
              )
            : classes;
    }, [classes, query]);
    const selectedClasses = classes.filter((item) =>
        selectedIds.includes(item.id),
    );
    const availableSubjects = subjects.filter((item) =>
        selectedIds.includes(item.qat_class_id),
    );
    const selectedSubjects = availableSubjects.filter((item) =>
        selectedSubjectIds.includes(item.id),
    );
    const availableChapters = chapters.filter((item) =>
        selectedSubjectIds.includes(item.qat_subject_id),
    );
    const visibleSubjects = availableSubjects.filter((item) =>
        `${item.name} ${item.class_name}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
    );
    const visibleChapters = availableChapters.filter((item) =>
        item.name
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
    );
    const visibleOptions =
        step === 0
            ? visibleClasses.map((item) => ({
                  id: item.id,
                  name: item.name,
                  detail: `${item.subject_count} ${item.subject_count === 1 ? 'book' : 'books'}`,
                  selected: selectedIds.includes(item.id),
              }))
            : step === 1
              ? visibleSubjects.map((item) => ({
                    id: item.id,
                    name: item.name,
                    detail: `${item.class_name} · ${item.chapter_count} ${item.chapter_count === 1 ? 'chapter' : 'chapters'}`,
                    selected: selectedSubjectIds.includes(item.id),
                }))
              : visibleChapters.map((item) => ({
                    id: item.id,
                    name: item.name,
                    detail:
                        subjects.find(
                            (subject) => subject.id === item.qat_subject_id,
                        )?.name ?? '',
                    selected: selectedChapterIds.includes(item.id),
                }));
    const selectedCount =
        step === 0
            ? selectedIds.length
            : step === 1
              ? selectedSubjectIds.length
              : selectedChapterIds.length;
    const isAuto = mode === 'auto';

    function toggle(id: number) {
        if (selectedIds.includes(id)) {
            const removedSubjectIds = subjects
                .filter((item) => item.qat_class_id === id)
                .map((item) => item.id);
            setSelectedSubjectIds((current) =>
                current.filter((item) => !removedSubjectIds.includes(item)),
            );
            setSelectedChapterIds((current) =>
                current.filter(
                    (item) =>
                        !removedSubjectIds.includes(
                            chapters.find((chapter) => chapter.id === item)
                                ?.qat_subject_id ?? -1,
                        ),
                ),
            );
        }

        setSelectedIds((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id],
        );
    }

    function toggleSubject(id: number) {
        if (selectedSubjectIds.includes(id)) {
            setSelectedChapterIds((current) =>
                current.filter(
                    (item) =>
                        chapters.find((chapter) => chapter.id === item)
                            ?.qat_subject_id !== id,
                ),
            );
        }

        setSelectedSubjectIds((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id],
        );
    }

    function toggleChapter(id: number) {
        setSelectedChapterIds((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id],
        );
    }

    function selectVisible() {
        if (step === 0) {
            setSelectedIds((current) => [
                ...new Set([
                    ...current,
                    ...visibleClasses.map((item) => item.id),
                ]),
            ]);
        } else if (step === 1) {
            setSelectedSubjectIds((current) => [
                ...new Set([
                    ...current,
                    ...visibleSubjects.map((item) => item.id),
                ]),
            ]);
        } else {
            setSelectedChapterIds((current) => [
                ...new Set([
                    ...current,
                    ...visibleChapters.map((item) => item.id),
                ]),
            ]);
        }
    }

    function clearSelection() {
        if (step === 0) {
            setSelectedIds([]);
            setSelectedSubjectIds([]);
            setSelectedChapterIds([]);
        } else if (step === 1) {
            setSelectedSubjectIds([]);
            setSelectedChapterIds([]);
        } else {
            setSelectedChapterIds([]);
        }
    }

    function changeStep(nextStep: number) {
        setQuery('');
        setStep(nextStep);
    }

    return (
        <div className="w-full space-y-6">
            <Head
                title={`${isAuto ? 'Auto' : 'Manual'} QAT paper · Select ${step === 0 ? 'classes' : step === 1 ? 'subjects' : 'chapters'}`}
            />
            <Button asChild variant="ghost" size="sm" className="-ml-3">
                <Link href="/qa-tests">
                    <ArrowLeftIcon /> QAT Tests
                </Link>
            </Button>
            <PageHeader
                title={
                    isAuto ? 'Auto paper generation' : 'Manual paper generation'
                }
                meta={`Step ${step + 1} of 3`}
                actions={
                    <nav
                        aria-label="Paper generation steps"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                        <ol className="flex items-start gap-2 sm:gap-3">
                            {(['Classes', 'Subject', 'Chapters'] as const).map(
                                (label, index) => (
                                    <li
                                        key={label}
                                        aria-current={
                                            index === step ? 'step' : undefined
                                        }
                                        className="flex items-start gap-2"
                                    >
                                        {index > 0 && (
                                            <span
                                                aria-hidden="true"
                                                className="mt-3 h-px w-3 bg-slate-200 dark:bg-slate-700 sm:w-5"
                                            />
                                        )}
                                        <span className="flex min-w-14 flex-col items-center gap-1">
                                            <span
                                                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                                                    index === step
                                                        ? 'bg-brand-600 text-white dark:bg-brand-500'
                                                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                                }`}
                                            >
                                                {index + 1}
                                            </span>
                                            <span
                                                className={`text-xs font-medium ${
                                                    index === step
                                                        ? 'text-brand-700 dark:text-brand-300'
                                                        : 'text-slate-400 dark:text-slate-500'
                                                }`}
                                            >
                                                {label}
                                            </span>
                                        </span>
                                    </li>
                                ),
                            )}
                        </ol>
                    </nav>
                }
            />

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <Card padding="lg" className="min-w-0 space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                {step === 0
                                    ? 'Choose your classes'
                                    : step === 1
                                      ? 'Choose your subjects'
                                      : 'Choose your chapters'}
                            </h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {step === 0
                                    ? 'Select one or more classes from the active QAT catalogue.'
                                    : step === 1
                                      ? 'Select the books for your chosen classes.'
                                      : 'Select chapters from your chosen books.'}
                            </p>
                        </div>
                        <Badge tone="info">{selectedCount} selected</Badge>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="relative w-full sm:max-w-xs">
                            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                            <input
                                aria-label={`Search QAT ${step === 0 ? 'classes' : step === 1 ? 'subjects' : 'chapters'}`}
                                type="search"
                                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900"
                                placeholder={`Search ${step === 0 ? 'classes' : step === 1 ? 'subjects' : 'chapters'}`}
                                value={query}
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                size="sm"
                                onClick={selectVisible}
                                disabled={
                                    (step === 0
                                        ? visibleClasses
                                        : step === 1
                                          ? visibleSubjects
                                          : visibleChapters
                                    ).length === 0
                                }
                            >
                                Select visible
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearSelection}
                                disabled={selectedCount === 0}
                            >
                                Clear selection
                            </Button>
                        </div>
                    </div>

                    {visibleOptions.length ? (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {visibleOptions.map((item) => (
                                <label
                                    key={item.id}
                                    className={`tm-lift group flex h-20 cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-950 ${
                                        item.selected
                                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                                            : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={item.selected}
                                        onChange={() =>
                                            step === 0
                                                ? toggle(item.id)
                                                : step === 1
                                                  ? toggleSubject(item.id)
                                                  : toggleChapter(item.id)
                                        }
                                        aria-label={`Select ${item.name}, ${item.detail}`}
                                    />
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                        {step === 0 ? (
                                            <GraduationCapIcon className="size-4" />
                                        ) : (
                                            <BookOpenIcon className="size-4" />
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            {item.name}
                                        </span>
                                        <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">
                                            {item.detail}
                                        </span>
                                    </span>
                                    <span
                                        aria-hidden="true"
                                        className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${
                                            item.selected
                                                ? 'border-brand-600 bg-brand-600 text-white'
                                                : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'
                                        }`}
                                    >
                                        {item.selected && (
                                            <CheckIcon className="size-3.5" />
                                        )}
                                    </span>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={BookOpenIcon}
                            title={
                                query
                                    ? `No matching ${step === 0 ? 'classes' : step === 1 ? 'subjects' : 'chapters'}`
                                    : `No QAT ${step === 0 ? 'classes' : step === 1 ? 'subjects' : 'chapters'} available`
                            }
                            hint={
                                query
                                    ? 'Try another name.'
                                    : step === 0
                                      ? 'Active classes will appear after QAT data is added within your access scope.'
                                      : 'No active QAT data is available for your selection.'
                            }
                        />
                    )}
                    <div className="flex items-center justify-between border-t border-slate-200 pt-5 dark:border-slate-800">
                        {step === 0 ? (
                            <Button asChild variant="secondary">
                                <Link href="/qa-tests">
                                    <ArrowLeftIcon /> Previous
                                </Link>
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => changeStep(step - 1)}
                            >
                                <ArrowLeftIcon /> Previous
                            </Button>
                        )}
                        {step < 2 && (
                            <Button
                                type="button"
                                variant="primary"
                                onClick={() => changeStep(step + 1)}
                                disabled={selectedCount === 0}
                            >
                                Next <ArrowRightIcon />
                            </Button>
                        )}
                    </div>
                </Card>

                <Card className="space-y-5 lg:sticky lg:top-6">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Paper summary
                        </h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Step {step + 1} of 3
                        </p>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between gap-3">
                            <span className="text-slate-500 dark:text-slate-400">
                                Mode
                            </span>
                            <span className="font-medium">
                                {isAuto ? 'Auto' : 'Manual'}
                            </span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-slate-500 dark:text-slate-400">
                                Classes
                            </span>
                            <span className="font-semibold tabular-nums">
                                {selectedIds.length}
                            </span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-slate-500 dark:text-slate-400">
                                Books
                            </span>
                            <span className="font-semibold tabular-nums">
                                {selectedSubjectIds.length}
                            </span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-slate-500 dark:text-slate-400">
                                Chapters
                            </span>
                            <span className="font-semibold tabular-nums">
                                {selectedChapterIds.length}
                            </span>
                        </div>
                    </div>
                    <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                        {selectedClasses.length ? (
                            <div className="flex flex-wrap gap-1.5">
                                {selectedClasses.map((item) => (
                                    <Badge key={item.id} tone="info">
                                        {item.name}
                                    </Badge>
                                ))}
                                {selectedSubjects.map((item) => (
                                    <Badge
                                        key={`subject-${item.id}`}
                                        tone="neutral"
                                    >
                                        {item.name}
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                No classes selected yet.
                            </p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}

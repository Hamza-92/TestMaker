import { Head, router } from '@inertiajs/react';
import { LanguagesIcon, SaveIcon, SearchIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { usePermission } from '@/hooks/use-permission';

interface SubjectItem {
    id: number;
    name_eng: string;
    name_ur: string | null;
    status: number;
    is_arabic: boolean;
}

export default function ArabicSubjects({
    subjects,
}: {
    subjects: SubjectItem[];
}) {
    const { can } = usePermission();
    const canEdit = can('subjects.edit');
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>(() =>
        subjects
            .filter((subject) => subject.is_arabic)
            .map((subject) => subject.id),
    );
    const [saving, setSaving] = useState(false);
    const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
    const initialIds = useMemo(
        () =>
            subjects
                .filter((subject) => subject.is_arabic)
                .map((subject) => subject.id),
        [subjects],
    );
    const changed =
        selectedIds.length !== initialIds.length ||
        initialIds.some((id) => !selected.has(id));
    const visibleSubjects = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();

        return query
            ? subjects.filter((subject) =>
                  `${subject.name_eng} ${subject.name_ur ?? ''}`
                      .toLocaleLowerCase()
                      .includes(query),
              )
            : subjects;
    }, [search, subjects]);

    const toggle = (id: number, checked: boolean) => {
        setSelectedIds((current) =>
            checked
                ? [...current, id]
                : current.filter((subjectId) => subjectId !== id),
        );
    };

    const save = () => {
        if (!canEdit || !changed || saving) {
            return;
        }

        setSaving(true);
        router.put(
            '/superadmin/arabic-subjects',
            { subject_ids: selectedIds },
            {
                preserveScroll: true,
                preserveState: false,
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
            <Head title="Arabic Subjects" />

            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                        <LanguagesIcon className="size-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
                            Arabic Subjects
                        </h1>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Apply automatic Arabic font detection on generated
                            papers for these subjects.
                        </p>
                    </div>
                </div>
                <Button
                    onClick={save}
                    disabled={!canEdit || !changed || saving}
                >
                    <SaveIcon className="mr-2 size-4" />
                    {saving ? 'Saving…' : 'Save Changes'}
                </Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
                    <label className="relative block w-full max-w-sm">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search subjects"
                            aria-label="Search subjects"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-950"
                        />
                    </label>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                        {selectedIds.length} of {subjects.length} Arabic
                    </span>
                </div>

                {visibleSubjects.length === 0 ? (
                    <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        No subjects found.
                    </p>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {visibleSubjects.map((subject) => (
                            <div
                                key={subject.id}
                                className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5"
                            >
                                <div className="min-w-0">
                                    <p className="font-medium text-slate-900 dark:text-slate-100">
                                        {subject.name_eng}
                                        {Number(subject.status) !== 1 && (
                                            <span className="ml-2 text-xs font-normal text-slate-400">
                                                Inactive
                                            </span>
                                        )}
                                    </p>
                                    {subject.name_ur && (
                                        <p
                                            className="mt-0.5 text-sm text-slate-500 dark:text-slate-400"
                                            dir="rtl"
                                        >
                                            {subject.name_ur}
                                        </p>
                                    )}
                                </div>
                                <Switch
                                    checked={selected.has(subject.id)}
                                    onCheckedChange={(checked) =>
                                        toggle(subject.id, checked)
                                    }
                                    disabled={!canEdit || saving}
                                    aria-label={`Arabic font for ${subject.name_eng}`}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

ArabicSubjects.layout = {
    breadcrumbs: [
        { title: 'Subjects', href: '/superadmin/subjects' },
        { title: 'Arabic Subjects', href: '/superadmin/arabic-subjects' },
    ],
};

import { Head, Link } from '@inertiajs/react';
import { ChevronDownIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Pattern {
    id: number;
    name: string;
}

interface PatternClass {
    pattern_id: number;
    id: number;
    name: string;
}

interface ClassSubject {
    class_id: number;
    pattern_id: number;
    subject_id: number;
    name: string;
}

interface Props {
    patterns: Pattern[];
    patternClasses: PatternClass[];
    classSubjects: ClassSubject[];
}

// ── Floating-label select ─────────────────────────────────────────────────────

function SelectField({
    label,
    value,
    onChange,
    disabled,
    placeholder,
    children,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    placeholder: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="relative mt-2">
            <label className="absolute -top-2.5 left-3 z-10 bg-white px-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                {label}
                <span className="ml-0.5 text-indigo-500">*</span>
            </label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-3.5 pr-9 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                >
                    <option value="">{placeholder}</option>
                    {children}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GeneratePaper({ patterns, patternClasses, classSubjects }: Props) {
    const [patternId, setPatternId] = useState('');
    const [classId, setClassId]     = useState('');
    const [subjectId, setSubjectId] = useState('');

    const availableClasses = useMemo(
        () => patternClasses.filter((c) => String(c.pattern_id) === patternId),
        [patternClasses, patternId],
    );

    const availableSubjects = useMemo(
        () => classSubjects.filter(
            (s) => String(s.class_id) === classId && String(s.pattern_id) === patternId,
        ),
        [classSubjects, classId, patternId],
    );

    const handlePatternChange = (v: string) => {
        setPatternId(v);
        setClassId('');
        setSubjectId('');
    };

    const handleClassChange = (v: string) => {
        setClassId(v);
        setSubjectId('');
    };

    const canProceed = patternId && classId && subjectId;

    return (
        <>
            <Head title="Generate Paper" />

            <div className="mx-auto max-w-3xl">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900">

                    {/* Gradient top accent */}
                    <div className="h-[3px] bg-linear-to-r from-indigo-600 via-violet-500 to-orange-500" />

                    {/* Body — the 3 cascading selects */}
                    <div className="px-6 py-6">
                        <div className="grid gap-5 sm:grid-cols-3">
                            <SelectField
                                label="Program"
                                value={patternId}
                                onChange={handlePatternChange}
                                placeholder="Select program"
                            >
                                {patterns.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </SelectField>

                            <SelectField
                                label="Class"
                                value={classId}
                                onChange={handleClassChange}
                                disabled={!patternId}
                                placeholder={patternId ? 'Select class' : 'Select program first'}
                            >
                                {availableClasses.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </SelectField>

                            <SelectField
                                label="Subject"
                                value={subjectId}
                                onChange={setSubjectId}
                                disabled={!classId}
                                placeholder={classId ? 'Select subject' : 'Select class first'}
                            >
                                {availableSubjects.map((s) => (
                                    <option key={s.subject_id} value={s.subject_id}>{s.name}</option>
                                ))}
                            </SelectField>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/20">
                        <Link
                            href="/dashboard"
                            className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:border-slate-600 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Close
                        </Link>
                        <button
                            disabled={!canProceed}
                            className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

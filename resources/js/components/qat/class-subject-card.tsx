import { BookOpenIcon, GraduationCapIcon } from 'lucide-react';
import type { QatClassSubjectSelection } from '@/components/qat/generation-form';
import { FloatingCombobox } from '@/components/ui/floating-combobox';

export function QatClassSubjectCard({
    classOptions,
    subjectOptions,
    classId,
    subjectId,
    onClassChange,
    onSubjectChange,
}: QatClassSubjectSelection) {
    return (
        <section
            aria-labelledby="qat-class-subject-title"
            className="relative isolate overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-[#f8fbff] to-blue-50 shadow-[0_6px_24px_-10px_rgba(59,130,246,0.18)] dark:border-sky-900/50 dark:from-[#132344] dark:via-slate-900 dark:to-[#182b53]"
        >
            <img
                src="/images/qat/class-subject.webp"
                alt=""
                aria-hidden="true"
                width={800}
                height={259}
                decoding="async"
                className="pointer-events-none absolute inset-y-0 right-0 h-full w-full max-w-xl select-none object-contain object-right-bottom opacity-60 dark:opacity-40 sm:w-[52%] sm:opacity-100"
            />
            <div className="relative z-10">
                <div className="relative z-10 flex items-center gap-4 px-5 py-4 sm:px-6 sm:pr-[25%]">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/50 bg-gradient-to-br from-sky-400 via-brand-600 to-blue-700 text-xl font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)] dark:border-sky-300/20">
                        1
                    </span>
                    <div className="min-w-0 space-y-1">
                        <h2
                            id="qat-class-subject-title"
                            className="text-lg font-bold leading-snug tracking-tight text-[#112650] dark:text-slate-50 sm:text-xl"
                        >
                            Choose your class &amp; subject
                        </h2>
                        <p className="text-xs font-medium leading-relaxed text-[#526985] dark:text-slate-400 sm:text-[13px]">
                            Select the class and subject for your paper
                        </p>
                    </div>
                </div>
            </div>
            <div className="relative z-10 grid gap-4 px-5 pb-5 pt-1 sm:grid-cols-2 sm:gap-5 sm:pl-[5.25rem] sm:pr-6">
                <div className="min-w-0 space-y-1.5">
                    <span className="block text-xs font-semibold text-[#425b7b] dark:text-slate-300">
                        Class
                    </span>
                    <FloatingCombobox
                        label="Class"
                        hideLabel
                        placeholder="Search classes"
                        leadingIcon={GraduationCapIcon}
                        options={classOptions}
                        value={
                            classOptions.find((item) => item.id === classId) ??
                            null
                        }
                        onChange={(item) =>
                            onClassChange(item ? Number(item.id) : null)
                        }
                    />
                    {!classOptions.length && (
                        <p
                            role="status"
                            className="text-xs text-slate-500 dark:text-slate-400"
                        >
                            No classes available
                        </p>
                    )}
                </div>
                <div className="min-w-0 space-y-1.5">
                    <span className="block text-xs font-semibold text-[#425b7b] dark:text-slate-300">
                        Subject
                    </span>
                    <FloatingCombobox
                        label="Subject"
                        hideLabel
                        placeholder={
                            classId === null
                                ? 'Select a class first'
                                : 'Search subjects'
                        }
                        leadingIcon={BookOpenIcon}
                        disabled={classId === null}
                        options={subjectOptions}
                        value={
                            subjectOptions.find(
                                (item) => item.id === subjectId,
                            ) ?? null
                        }
                        onChange={(item) =>
                            onSubjectChange(item ? Number(item.id) : null)
                        }
                    />
                    {classId !== null && !subjectOptions.length && (
                        <p
                            role="status"
                            className="text-xs text-slate-500 dark:text-slate-400"
                        >
                            No subjects available for this class
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}

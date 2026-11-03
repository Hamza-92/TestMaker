import { BookOpenIcon, GraduationCapIcon } from 'lucide-react';
import type { QatClassSubjectSelection } from '@/components/qat/generation-form';
import { QatStepHeader } from '@/components/qat/step-header';
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
            className="relative isolate overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-[#f8fbff] to-blue-50 shadow-sm dark:border-sky-900/50 dark:from-[#132344] dark:via-slate-900 dark:to-[#182b53]"
        >
            <QatStepHeader
                id="qat-class-subject-title"
                step={1}
                title="Choose your class & subject"
                description="Select the class and subject for your paper"
                image="/images/qat/class-subject.webp"
            />
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

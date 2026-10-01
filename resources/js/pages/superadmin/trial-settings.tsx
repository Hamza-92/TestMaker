import { Head, useForm } from '@inertiajs/react';
import { BookOpenCheckIcon, ClockIcon, SaveIcon } from 'lucide-react';
import { useState } from 'react';
import { HierarchicalAccessControl } from '@/components/subscription-access-control';
import { TrialSubjectContentDialog } from '@/components/trial-subject-content-dialog';
import type { TrialContentRules } from '@/components/trial-subject-content-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import type {
    AccessClass,
    AccessPattern,
    AccessSubject,
    ClassSubjectMap,
    PatternClassMap,
    SubscriptionAccessScope,
} from '@/lib/subscription-access';

interface TrialSettings {
    id: number;
    trial_duration_days: number;
    allow_subjective_answers: boolean;
    access_scope: SubscriptionAccessScope | null;
    chapter_access?: TrialContentRules | null;
    topic_access?: TrialContentRules | null;
}

interface Props {
    settings: TrialSettings;
    patterns: AccessPattern[];
    classes: AccessClass[];
    subjects: AccessSubject[];
    patternClassMap: PatternClassMap;
    classSubjectMap: ClassSubjectMap;
}

interface FormData {
    trial_duration_days: number;
    allow_subjective_answers: boolean;
    access_scope: SubscriptionAccessScope | null;
    chapter_access: TrialContentRules;
    topic_access: TrialContentRules;
    [key: string]:
        | number
        | boolean
        | TrialContentRules
        | SubscriptionAccessScope
        | null;
}

function SectionHeader({
    icon,
    title,
}: {
    icon: React.ReactNode;
    title: string;
}) {
    return (
        <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-sm font-medium">{title}</p>
            </div>
        </div>
    );
}

export default function TrialSettingsPage({
    settings,
    patterns,
    classes,
    subjects,
    patternClassMap,
    classSubjectMap,
}: Props) {
    const { data, setData, put, processing, errors, isDirty } =
        useForm<FormData>({
            trial_duration_days: settings.trial_duration_days,
            allow_subjective_answers: settings.allow_subjective_answers,
            access_scope: settings.access_scope,
            chapter_access: settings.chapter_access ?? {},
            topic_access: settings.topic_access ?? {},
        });
    const [activeSubject, setActiveSubject] = useState<{
        patternId: number;
        classId: number;
        subjectId: number;
    } | null>(null);

    const activeKey = activeSubject
        ? `${activeSubject.patternId}:${activeSubject.classId}:${activeSubject.subjectId}`
        : null;

    function applySubjectContent(
        chapters: number[] | null,
        topics: number[] | null,
    ) {
        if (!activeKey) {
            return;
        }

        const chapterRules = { ...data.chapter_access };
        const topicRules = { ...data.topic_access };

        if (chapters === null) {
            delete chapterRules[activeKey];
        } else {
            chapterRules[activeKey] = chapters;
        }

        if (topics === null) {
            delete topicRules[activeKey];
        } else {
            topicRules[activeKey] = topics;
        }

        setData({
            ...data,
            chapter_access: chapterRules,
            topic_access: topicRules,
        });
        setActiveSubject(null);
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put('/superadmin/trial-settings');
    };

    return (
        <>
            <Head title="Trial Settings" />

            <div className="w-full min-w-0 space-y-6 p-4 md:p-6">
                <div>
                    <h1 className="h1-semibold">Trial Settings</h1>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="w-full min-w-0 space-y-5"
                >
                    {/* Trial Duration */}
                    <div className="w-full min-w-0 space-y-4 rounded-xl border p-5 shadow-sm">
                        <SectionHeader
                            icon={<ClockIcon className="size-4" />}
                            title="Trial Period"
                        />
                        <Separator />

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="trial_duration_days"
                                className="flex items-center gap-1"
                            >
                                Duration (days)
                                <span className="text-xs text-destructive">
                                    *
                                </span>
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="trial_duration_days"
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={data.trial_duration_days}
                                    onChange={(e) =>
                                        setData(
                                            'trial_duration_days',
                                            Number(e.target.value),
                                        )
                                    }
                                    onKeyDown={(e) =>
                                        ['e', 'E', '+', '-', '.'].includes(
                                            e.key,
                                        ) && e.preventDefault()
                                    }
                                    className="w-28"
                                />
                                <span className="text-sm text-muted-foreground">
                                    days
                                </span>
                            </div>
                            {errors.trial_duration_days && (
                                <p className="text-xs text-destructive">
                                    {errors.trial_duration_days}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="w-full min-w-0 space-y-4 rounded-xl border p-5 shadow-sm">
                        <SectionHeader
                            icon={<BookOpenCheckIcon className="size-4" />}
                            title="Trial Features"
                        />
                        <Separator />

                        <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                            <div className="min-w-0">
                                <Label htmlFor="allow_subjective_answers">
                                    Subjective Answers
                                </Label>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Allow trial customers to view and print
                                    subjective answer sheets.
                                </p>
                            </div>
                            <Switch
                                id="allow_subjective_answers"
                                checked={data.allow_subjective_answers}
                                onCheckedChange={(checked) =>
                                    setData('allow_subjective_answers', checked)
                                }
                            />
                        </div>
                    </div>

                    {/* Access Scope */}
                    <div className="min-w-0 space-y-2">
                        <HierarchicalAccessControl
                            patterns={patterns}
                            classes={classes}
                            subjects={subjects}
                            patternClassMap={patternClassMap}
                            classSubjectMap={classSubjectMap}
                            value={data.access_scope}
                            onChange={(val) => setData('access_scope', val)}
                            error={errors.access_scope}
                            subjectAction={(patternId, classId, subjectId) => {
                                const key = `${patternId}:${classId}:${subjectId}`;
                                const customized =
                                    key in data.chapter_access ||
                                    key in data.topic_access;

                                return (
                                    <button
                                        type="button"
                                        className="shrink-0 rounded-md border bg-background px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/5"
                                        onClick={() =>
                                            setActiveSubject({
                                                patternId,
                                                classId,
                                                subjectId,
                                            })
                                        }
                                    >
                                        {customized ? 'Edit' : 'Configure'}
                                    </button>
                                );
                            }}
                        />
                        {(errors.chapter_access || errors.topic_access) && (
                            <p className="text-xs text-destructive">
                                {errors.chapter_access || errors.topic_access}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="sticky bottom-0 z-20 -mx-4 flex items-center justify-end gap-3 border-y bg-background/95 px-4 py-3 shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.35)] backdrop-blur md:-mx-6 md:px-6">
                        <button
                            type="submit"
                            disabled={processing || !isDirty}
                            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <SaveIcon className="size-4" />
                            {processing ? 'Saving…' : 'Save Settings'}
                        </button>
                    </div>
                </form>
                {activeSubject && activeKey && (
                    <TrialSubjectContentDialog
                        key={activeKey}
                        {...activeSubject}
                        subjectName={
                            subjects.find(
                                (subject) =>
                                    subject.id === activeSubject.subjectId,
                            )?.name_eng ?? `Subject #${activeSubject.subjectId}`
                        }
                        chapterIds={data.chapter_access[activeKey] ?? null}
                        topicIds={data.topic_access[activeKey] ?? null}
                        onClose={() => setActiveSubject(null)}
                        onApply={applySubjectContent}
                    />
                )}
            </div>
        </>
    );
}

TrialSettingsPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Trial Settings' },
    ],
};

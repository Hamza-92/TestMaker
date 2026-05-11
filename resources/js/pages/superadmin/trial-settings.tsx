import { Head, useForm } from '@inertiajs/react';
import { ClockIcon, SaveIcon, Settings2Icon } from 'lucide-react';
import { HierarchicalAccessControl } from '@/components/subscription-access-control';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
    access_scope: SubscriptionAccessScope | null;
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
    access_scope: SubscriptionAccessScope | null;
    [key: string]: number | SubscriptionAccessScope | null;
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-sm font-medium">{title}</p>
            </div>
        </div>
    );
}

export default function TrialSettingsPage({ settings, patterns, classes, subjects, patternClassMap, classSubjectMap }: Props) {
    const { data, setData, put, processing, errors, isDirty } = useForm<FormData>({
        trial_duration_days: settings.trial_duration_days,
        access_scope:        settings.access_scope,
    });

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

                <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-5">

                    {/* Trial Duration */}
                    <div className="w-full min-w-0 space-y-4 rounded-xl border p-5 shadow-sm">
                        <SectionHeader icon={<ClockIcon className="size-4" />} title="Trial Period" />
                        <Separator />

                        <div className="space-y-1.5">
                            <Label htmlFor="trial_duration_days" className="flex items-center gap-1">
                                Duration (days)
                                <span className="text-destructive text-xs">*</span>
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="trial_duration_days"
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={data.trial_duration_days}
                                    onChange={(e) => setData('trial_duration_days', Number(e.target.value))}
                                    onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
                                    className="w-28"
                                />
                                <span className="text-muted-foreground text-sm">days</span>
                            </div>
                            {errors.trial_duration_days && (
                                <p className="text-destructive text-xs">{errors.trial_duration_days}</p>
                            )}
                        </div>
                    </div>

                    {/* Access Scope */}
                    <div className="w-full min-w-0 space-y-4 rounded-xl border p-5 shadow-sm">
                        <SectionHeader icon={<Settings2Icon className="size-4" />} title="Access Scope" />
                        <Separator />

                        <HierarchicalAccessControl
                            patterns={patterns}
                            classes={classes}
                            subjects={subjects}
                            patternClassMap={patternClassMap}
                            classSubjectMap={classSubjectMap}
                            value={data.access_scope}
                            onChange={(val) => setData('access_scope', val)}
                            error={errors.access_scope}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pb-2">
                        <button
                            type="submit"
                            disabled={processing || !isDirty}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-9 items-center gap-2 rounded-lg px-5 text-sm font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <SaveIcon className="size-4" />
                            {processing ? 'Saving…' : 'Save Settings'}
                        </button>
                    </div>

                </form>
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

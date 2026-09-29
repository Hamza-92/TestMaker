import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { RotateCcwIcon, SaveIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button, PageHeader } from '@/components/tm';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Auth } from '@/types/auth';
import { GeneratedPaperView } from './papers/generate';
import { ConfirmDialog } from './papers/paper-layouts/confirm-dialog';
import { defaultPaperPreview } from './papers/paper-layouts/default-paper-preview';
import type { PreviewMedium } from './papers/paper-layouts/default-paper-preview';
import {
    persistablePaperSettings,
    preferredPaperSettings,
} from './papers/paper-layouts/paper-preferences';
import type { PaperPreferences } from './papers/paper-layouts/paper-preferences';
import { PaperSettingsPanel } from './papers/paper-layouts/paper-settings-drawer';
import {
    DEFAULT_PAPER_SETTINGS,
    normalizePaperSettings,
} from './papers/paper-layouts/types';
import type {
    GeneratedPaperHeader,
    PaperSettings,
} from './papers/paper-layouts/types';

interface Props {
    paperDefaults: PaperPreferences | null;
    canViewSubjectiveAnswers: boolean;
}

const noop = () => {};

export default function PaperDefaults({
    paperDefaults,
    canViewSubjectiveAnswers,
}: Props) {
    const { auth } = usePage().props as { auth: Auth };
    const initial = {
        settings: preferredPaperSettings(paperDefaults),
        header: {
            exam: '',
            section: '',
            type: '',
            duration: '2 hours',
            ...paperDefaults?.header,
        },
        numSets: paperDefaults?.numSets ?? 1,
        viewMode: paperDefaults?.viewMode ?? 'paper',
    };
    const form = useForm(initial);
    const [medium, setMedium] = useState<PreviewMedium>('Both');
    const [previewHeader, setPreviewHeader] = useState<
        Partial<GeneratedPaperHeader>
    >({});
    const [downloading, setDownloading] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [resetting, setResetting] = useState(false);
    const pdfBusy = useRef(false);
    const previewRef = useRef<HTMLDivElement>(null);
    const logo = typeof auth.user.logo === 'string' ? auth.user.logo : '';
    const logoUrl = logo
        ? /^(https?:|data:|\/)/.test(logo)
            ? logo
            : `/storage/${logo}`
        : '';
    const settings: PaperSettings = {
        ...form.data.settings,
        paperLayout: 'standard',
        objectiveLayout: 'standard',
        objectiveBubblesEnabled: false,
        bubbleSheetEnabled: false,
    };
    const header: GeneratedPaperHeader = {
        schoolName: String(
            auth.user.school_name || auth.user.name || 'School Name',
        ),
        className: '9th',
        subject: 'Sample Paper',
        studentName: '',
        date: '',
        marks: 39,
        passingMarks: 0,
        rollNo: '',
        ...previewHeader,
        ...form.data.header,
    };
    const paper = defaultPaperPreview(settings, header, medium);
    const totalMarks = paper.sections.reduce(
        (total, section) =>
            total + section.requiredQuestions * section.marksEach,
        0,
    );

    useEffect(() => {
        document.body.setAttribute('data-paper-workflow', '');

        return () => document.body.removeAttribute('data-paper-workflow');
    }, []);

    function save() {
        form.transform((data) => ({
            ...data,
            settings: persistablePaperSettings(data.settings),
        }));
        form.put('/customer/settings', {
            preserveScroll: true,
            onSuccess: () => form.setDefaults(),
        });
    }

    function updateSettings(patch: Partial<PaperSettings>) {
        form.setData(
            'settings',
            normalizePaperSettings({
                ...form.data.settings,
                ...patch,
            }),
        );
    }

    function resetDefaults() {
        setResetting(true);
        router.delete('/customer/settings', {
            preserveScroll: true,
            onSuccess: () => {
                const system = {
                    settings: { ...DEFAULT_PAPER_SETTINGS },
                    header: {
                        exam: '',
                        section: '',
                        type: '',
                        duration: '2 hours',
                    },
                    numSets: 1,
                    viewMode: 'paper' as const,
                };
                form.setData(system);
                form.setDefaults(system);
                form.clearErrors();
                setPreviewHeader({});
                setConfirmReset(false);
            },
            onFinish: () => setResetting(false),
        });
    }

    async function downloadPreview() {
        if (pdfBusy.current) {
            return;
        }

        pdfBusy.current = true;
        setDownloading(true);
        const progress = toast.loading('Preparing preview PDF…');

        try {
            const { downloadPaperPdf } =
                await import('./papers/paper-layouts/download-paper-pdf');
            const papers = Array.from(
                previewRef.current?.querySelectorAll<HTMLElement>(
                    '[data-print-paper]',
                ) ?? [],
            ).sort(
                (a, b) =>
                    Number(a.dataset.paperSetIndex) -
                    Number(b.dataset.paperSetIndex),
            );
            await downloadPaperPdf({
                papers,
                settings,
                name: 'Paper Defaults Preview',
                onProgress: (message) =>
                    toast.loading(message, { id: progress }),
            });
            toast.success('Preview PDF downloaded', { id: progress });
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Could not download the preview.',
                { id: progress },
            );
        } finally {
            setDownloading(false);
            pdfBusy.current = false;
        }
    }

    const saveButton = (
        <Button
            variant="primary"
            disabled={form.processing || resetting || !form.isDirty}
            onClick={save}
        >
            <SaveIcon />
            {form.processing ? 'Saving…' : 'Save Defaults'}
        </Button>
    );
    const controls = (
        <>
            <Button
                disabled={form.processing || resetting}
                onClick={() => setConfirmReset(true)}
            >
                <RotateCcwIcon />
                Restore System Defaults
            </Button>
            {saveButton}
        </>
    );

    return (
        <>
            <Head title="Paper Defaults" />
            <div className="space-y-4" ref={previewRef}>
                <div className="print:hidden">
                    <PageHeader
                        title="Paper Defaults"
                        actions={
                            <Button
                                type="button"
                                disabled={form.processing || resetting}
                                onClick={() =>
                                    updateSettings({
                                        ...DEFAULT_PAPER_SETTINGS,
                                    })
                                }
                            >
                                <RotateCcwIcon />
                                Reset Paper Settings
                            </Button>
                        }
                    />
                    {Object.values(form.errors).length > 0 && (
                        <div
                            role="alert"
                            className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                        >
                            {Object.entries(form.errors).map(([key, error]) => (
                                <p key={key}>{error}</p>
                            ))}
                        </div>
                    )}
                </div>
                <PaperSettingsPanel
                    inline
                    settings={settings}
                    defaultWatermarkLogoUrl={logoUrl}
                    onChange={updateSettings}
                />
                <GeneratedPaperView
                    paper={paper}
                    rawPaper={paper}
                    activeSetIndex={0}
                    numSets={1}
                    viewMode="paper"
                    onActiveSetChange={noop}
                    onNumSetsChange={noop}
                    onViewModeChange={noop}
                    printAllSets={false}
                    onPrintAllSets={() => window.print()}
                    isDownloadingPdf={downloading}
                    onDownloadPdf={() => void downloadPreview()}
                    totalMarks={totalMarks}
                    defaultWatermarkLogoUrl={logoUrl}
                    schoolAddress={String(auth.user.address || '')}
                    showSchoolAddress={Boolean(auth.user.is_show_address)}
                    canViewSubjectiveAnswers={canViewSubjectiveAnswers}
                    pickerTarget={null}
                    pickerQuestions={[]}
                    pickerSearch=""
                    usedQuestionIds={new Set()}
                    savedPaperId={null}
                    isDraft={false}
                    isDirty={form.isDirty}
                    isSavingPaper={false}
                    isSavingDraft={false}
                    onOpenSavePaperModal={noop}
                    onOpenSaveAsTemplate={noop}
                    onSaveDraft={noop}
                    onGoBack={noop}
                    onSaveDraftAndBack={noop}
                    onDiscardAndBack={noop}
                    onHeaderChange={(field, value) => {
                        if (
                            field === 'exam' ||
                            field === 'section' ||
                            field === 'type' ||
                            field === 'duration'
                        ) {
                            form.setData('header', {
                                ...form.data.header,
                                [field]: value,
                            });
                        } else {
                            setPreviewHeader((current) => ({
                                ...current,
                                [field]:
                                    field === 'marks' ||
                                    field === 'passingMarks'
                                        ? Number(value) || 0
                                        : value,
                            }));
                        }
                    }}
                    settings={settings}
                    onSettingsChange={updateSettings}
                    onBubbleSheetMediumChange={setMedium}
                    onAddSection={noop}
                    onEditSection={noop}
                    onDeleteSection={noop}
                    onMoveSection={noop}
                    onShuffleQuestions={noop}
                    onEditQuestion={noop}
                    onQuestionImageSizeChange={noop}
                    onQuestionAnswerLinesChange={noop}
                    onQuestionAnswerLineSpacingChange={noop}
                    onRandomQuestion={noop}
                    onPickQuestion={noop}
                    onAddRandomQuestion={noop}
                    onAddCustomQuestion={noop}
                    onRemoveQuestion={noop}
                    onColumnsChange={noop}
                    onPickerSearchChange={noop}
                    onPickerSelect={noop}
                    onPickerClose={noop}
                    previewOnly
                    showSettingsDrawer={false}
                    footerActions={
                        <div className="flex flex-wrap justify-end gap-2">
                            {form.isDirty && (
                                <span className="self-center text-xs font-medium text-amber-600">
                                    Unsaved changes
                                </span>
                            )}
                            <Button asChild>
                                <Link href="/dashboard">Back</Link>
                            </Button>
                            {controls}
                        </div>
                    }
                    toolbarExtras={
                        <Select
                            value={medium}
                            onValueChange={(value) =>
                                setMedium(value as PreviewMedium)
                            }
                        >
                            <SelectTrigger
                                aria-label="Preview medium"
                                className="w-auto rounded-lg border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                            >
                                <span className="font-medium text-slate-500 dark:text-slate-400">
                                    Preview medium
                                </span>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="start">
                                {['English', 'Urdu', 'Both'].map((value) => (
                                    <SelectItem key={value} value={value}>
                                        {value}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    }
                />
            </div>
            {confirmReset && (
                <ConfirmDialog
                    title="Restore System Defaults"
                    message="Replace your saved paper defaults with TestMaker's system defaults? Existing papers and templates will keep their settings."
                    confirmLabel={resetting ? 'Restoring…' : 'Restore Defaults'}
                    onConfirm={resetDefaults}
                    onCancel={() => !resetting && setConfirmReset(false)}
                />
            )}
        </>
    );
}

import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    CalendarIcon,
    FileQuestionIcon,
    LogsIcon,
    PencilIcon,
    SparklesIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface AuditLogEntry {
    id: number;
    event: string | null;
    old_values: Record<string, unknown>;
    new_values: Record<string, unknown>;
    changed_by: string;
    created_at: string | null;
}

interface QuestionData {
    id: number;
    summary_text: string;
    source: string | null;
    source_label?: string | null;
    status: number;
    created_at: string | null;
    updated_at: string | null;
    content: {
        prompt_en?: string;
        prompt_ur?: string;
        guidance_en?: string;
        guidance_ur?: string;
        answer_en?: string;
        answer_ur?: string;
        passage_en?: string;
        passage_ur?: string;
        intro_en?: string;
        intro_ur?: string;
        correct_boolean?: string;
        options?: Array<{
            text_en?: string | null;
            text_ur?: string | null;
            is_correct: boolean;
        }>;
        items?: Array<{
            prompt_en?: string | null;
            prompt_ur?: string | null;
            answer_en?: string | null;
            answer_ur?: string | null;
            options?: Array<{
                text_en?: string | null;
                text_ur?: string | null;
                is_correct: boolean;
            }>;
        }>;
        pairs?: Array<{
            left_en?: string | null;
            left_ur?: string | null;
            right_en?: string | null;
            right_ur?: string | null;
        }>;
    };
    question_type: {
        id: number;
        name: string;
        is_objective: boolean;
        is_single: boolean;
        have_answer: boolean;
        schema_key: string;
        schema: {
            key: string;
            kind: 'objective' | 'subjective';
            label: string;
            description: string;
        };
    };
    chapter: {
        id: number;
        name: string;
        name_ur: string | null;
        chapter_number: number | null;
        subject: {
            id: number;
            name_eng: string;
            name_ur: string | null;
            subject_type: 'chapter-wise' | 'topic-wise';
        };
        class: {
            id: number;
            name: string;
        };
        pattern: {
            id: number;
            name: string;
            short_name: string | null;
        };
    };
    topic: {
        id: number;
        name: string;
        name_ur: string | null;
    } | null;
    options_count: number;
    correct_options_count: number;
    items_count: number;
    options: Array<{
        id: number;
        text_en: string | null;
        text_ur: string | null;
        is_correct: boolean;
        sort_order: number;
    }>;
    audit_logs: AuditLogEntry[];
}

const EVENT_DOT: Record<string, string> = {
    created: 'bg-emerald-500',
    updated: 'bg-blue-500',
    deleted: 'bg-red-500',
    restored: 'bg-violet-500',
};

const EVENT_LABEL: Record<string, string> = {
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    restored: 'Restored',
};

function fmtDate(value: string | null) {
    if (!value) {
        return '-';
    }

    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function fmtDateTime(value: string | null) {
    if (!value) {
        return '-';
    }

    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function statusBadge(status: number) {
    return status === 1 ? (
        <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-100 font-medium text-emerald-700"
        >
            <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />
            Active
        </Badge>
    ) : (
        <Badge
            variant="outline"
            className="border-gray-200 bg-gray-100 font-medium text-gray-600"
        >
            <span className="mr-1 inline-block size-1.5 rounded-full bg-gray-400" />
            Inactive
        </Badge>
    );
}

function SectionHeader({
    icon,
    title,
}: {
    icon: React.ReactNode;
    title: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium">{title}</p>
            </div>
        </div>
    );
}

function chapterLabel(chapter: QuestionData['chapter']) {
    const chapterPart = chapter.chapter_number
        ? `Chapter ${chapter.chapter_number}`
        : chapter.name;

    return [
        chapter.subject.name_eng,
        chapterPart,
        chapter.class.name,
        chapter.pattern.short_name ?? chapter.pattern.name,
    ].join(' / ');
}

function TextPanel({
    english,
    urdu,
    title,
}: {
    english?: string | null;
    urdu?: string | null;
    title: string;
}) {
    return (
        <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
            <SectionHeader
                icon={<SparklesIcon className="size-4" />}
                title={title}
            />
            <Separator />
            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">English</p>
                    <p className="mt-2 text-sm whitespace-pre-wrap">
                        {english || '-'}
                    </p>
                </div>
                <div className="rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">Urdu</p>
                    <p className="mt-2 text-sm whitespace-pre-wrap" dir="rtl">
                        {urdu || '-'}
                    </p>
                </div>
            </div>
        </div>
    );
}

function AuditLogCard({ log }: { log: AuditLogEntry }) {
    const key = (log.event ?? '').toLowerCase();
    const dotClass = EVENT_DOT[key] ?? 'bg-gray-400';
    const label = EVENT_LABEL[key] ?? log.event ?? 'Activity';

    return (
        <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span
                        className={`inline-block size-2 rounded-full ${dotClass}`}
                    />
                    <p className="font-medium">{label}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                    {fmtDateTime(log.created_at)}
                </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
                {log.changed_by}
            </p>
        </div>
    );
}

function renderContent(question: QuestionData) {
    const { content, question_type: questionType } = question;

    switch (questionType.schema.key) {
        case 'objective_mcq':
        case 'objective_blank_choice':
            return (
                <div className="space-y-6">
                    <TextPanel
                        title="Statement"
                        english={content.prompt_en}
                        urdu={content.prompt_ur}
                    />
                    <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                        <SectionHeader
                            icon={<SparklesIcon className="size-4" />}
                            title="Options"
                        />
                        <Separator />
                        <div className="grid gap-3 md:grid-cols-2">
                            {(content.options ?? []).map((option, index) => (
                                <div
                                    key={`option-${index}`}
                                    className="rounded-xl border p-4"
                                >
                                    <div className="mb-2 flex items-center gap-2">
                                        <Badge variant="outline">
                                            Option {index + 1}
                                        </Badge>
                                        {option.is_correct ? (
                                            <Badge>Correct</Badge>
                                        ) : null}
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">
                                        {option.text_en ||
                                            option.text_ur ||
                                            '-'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        case 'objective_true_false':
            return (
                <div className="space-y-6">
                    <TextPanel
                        title="Statement"
                        english={content.prompt_en}
                        urdu={content.prompt_ur}
                    />
                    <div className="rounded-xl border p-5 shadow-sm md:p-6">
                        <SectionHeader
                            icon={<SparklesIcon className="size-4" />}
                            title="Correct Answer"
                        />
                        <Separator />
                        <Badge className="mt-1">
                            {content.correct_boolean === 'false'
                                ? 'False'
                                : 'True'}
                        </Badge>
                    </div>
                </div>
            );
        case 'objective_blank_open':
            return (
                <div className="space-y-6">
                    <TextPanel
                        title="Blank Statement"
                        english={content.prompt_en}
                        urdu={content.prompt_ur}
                    />
                    <TextPanel
                        title="Correct Answer"
                        english={content.answer_en}
                        urdu={content.answer_ur}
                    />
                </div>
            );
        case 'objective_passage_mcq':
            return (
                <div className="space-y-6">
                    <TextPanel
                        title="Passage"
                        english={content.passage_en}
                        urdu={content.passage_ur}
                    />
                    <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                        <SectionHeader
                            icon={<SparklesIcon className="size-4" />}
                            title="Passage Questions"
                        />
                        <Separator />
                        <div className="space-y-4">
                            {(content.items ?? []).map((item, itemIndex) => (
                                <div
                                    key={`item-${itemIndex}`}
                                    className="rounded-xl border p-4"
                                >
                                    <div className="mb-3 flex items-center gap-2">
                                        <Badge variant="outline">
                                            Question {itemIndex + 1}
                                        </Badge>
                                    </div>
                                    <p className="mb-4 text-sm whitespace-pre-wrap">
                                        {item.prompt_en ||
                                            item.prompt_ur ||
                                            '-'}
                                    </p>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {(item.options ?? []).map(
                                            (option, optionIndex) => (
                                                <div
                                                    key={`item-${itemIndex}-option-${optionIndex}`}
                                                    className="rounded-xl border p-3"
                                                >
                                                    <div className="mb-2 flex items-center gap-2">
                                                        <Badge variant="outline">
                                                            Option{' '}
                                                            {optionIndex + 1}
                                                        </Badge>
                                                        {option.is_correct ? (
                                                            <Badge>
                                                                Correct
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                    <p className="text-sm whitespace-pre-wrap">
                                                        {option.text_en ||
                                                            option.text_ur ||
                                                            '-'}
                                                    </p>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        case 'subjective_grouped':
            return (
                <div className="space-y-6">
                    <TextPanel
                        title="Instructions"
                        english={content.intro_en}
                        urdu={content.intro_ur}
                    />
                    <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                        <SectionHeader
                            icon={<SparklesIcon className="size-4" />}
                            title="Question Items"
                        />
                        <Separator />
                        <div className="space-y-4">
                            {(content.items ?? []).map((item, itemIndex) => (
                                <div
                                    key={`subjective-item-${itemIndex}`}
                                    className="rounded-xl border p-4"
                                >
                                    <div className="mb-3 flex items-center gap-2">
                                        <Badge variant="outline">
                                            Item {itemIndex + 1}
                                        </Badge>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">
                                        {item.prompt_en ||
                                            item.prompt_ur ||
                                            '-'}
                                    </p>
                                    {questionType.have_answer ? (
                                        <div className="mt-4 rounded-xl border bg-muted/20 p-3">
                                            <p className="text-xs text-muted-foreground">
                                                Answer
                                            </p>
                                            <p className="mt-1 text-sm whitespace-pre-wrap">
                                                {item.answer_en ||
                                                    item.answer_ur ||
                                                    '-'}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        case 'subjective_pairs':
            return (
                <div className="space-y-6">
                    <TextPanel
                        title="Instructions"
                        english={content.prompt_en}
                        urdu={content.prompt_ur}
                    />
                    <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                        <SectionHeader
                            icon={<SparklesIcon className="size-4" />}
                            title="Pairs"
                        />
                        <Separator />
                        <div className="space-y-3">
                            {(content.pairs ?? []).map((pair, pairIndex) => (
                                <div
                                    key={`pair-${pairIndex}`}
                                    className="grid gap-3 rounded-xl border p-4 md:grid-cols-2"
                                >
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            Left
                                        </p>
                                        <p className="mt-1 text-sm whitespace-pre-wrap">
                                            {pair.left_en ||
                                                pair.left_ur ||
                                                '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            Right
                                        </p>
                                        <p className="mt-1 text-sm whitespace-pre-wrap">
                                            {pair.right_en ||
                                                pair.right_ur ||
                                                '-'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        default:
            return (
                <div className="space-y-6">
                    <TextPanel
                        title="Prompt"
                        english={content.prompt_en}
                        urdu={content.prompt_ur}
                    />
                    <TextPanel
                        title="Guidance"
                        english={content.guidance_en}
                        urdu={content.guidance_ur}
                    />
                    {questionType.have_answer ? (
                        <TextPanel
                            title="Answer"
                            english={content.answer_en}
                            urdu={content.answer_ur}
                        />
                    ) : null}
                </div>
            );
    }
}

export default function ShowQuestion({ question }: { question: QuestionData }) {
    const chapterQuestionsHref = `/superadmin/subjects/${question.chapter.subject.id}/chapters/${question.chapter.id}/questions`;

    return (
        <>
            <Head title={`Question #${question.id}`} />

            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={chapterQuestionsHref}
                            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-input transition-colors hover:bg-accent"
                        >
                            <ArrowLeftIcon className="size-4" />
                        </Link>
                        <div>
                            <h1 className="h1-semibold">
                                {question.summary_text ||
                                    `Question #${question.id}`}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {question.question_type.name}
                            </p>
                        </div>
                    </div>
                    <Button asChild variant="outline" className="sm:shrink-0">
                        <Link
                            href={`/superadmin/questions/${question.id}/edit`}
                        >
                            <PencilIcon className="size-4" />
                            Edit Question
                        </Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl border shadow-sm">
                    <div className="flex flex-wrap items-center gap-6 border-b bg-muted/20 p-5 md:p-6">
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <FileQuestionIcon className="size-7" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-semibold">
                                    {question.question_type.schema.label}
                                </h2>
                                <Badge variant="outline" className="bg-muted">
                                    {question.question_type.is_objective
                                        ? 'Objective'
                                        : 'Subjective'}
                                </Badge>
                                {statusBadge(question.status)}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="bg-muted">
                                    {chapterLabel(question.chapter)}
                                </Badge>
                                {question.topic ? (
                                    <Badge
                                        variant="outline"
                                        className="bg-muted"
                                    >
                                        {question.topic.name}
                                    </Badge>
                                ) : null}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CalendarIcon className="size-3.5" />
                                <span>
                                    Created {fmtDate(question.created_at)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid divide-y sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                        <div className="p-5 text-center">
                            <p className="text-xs text-muted-foreground">
                                Subject
                            </p>
                            <p className="mt-1 font-semibold">
                                {question.chapter.subject.name_eng}
                            </p>
                        </div>
                        <div className="p-5 text-center">
                            <p className="text-xs text-muted-foreground">
                                Source
                            </p>
                            <p className="mt-1 font-semibold">
                                {question.source_label ||
                                    question.source ||
                                    '-'}
                            </p>
                        </div>
                        <div className="p-5 text-center">
                            <p className="text-xs text-muted-foreground">
                                Options
                            </p>
                            <p className="mt-1 font-semibold">
                                {question.options_count}
                            </p>
                        </div>
                        <div className="p-5 text-center">
                            <p className="text-xs text-muted-foreground">
                                Items
                            </p>
                            <p className="mt-1 font-semibold">
                                {question.items_count}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">{renderContent(question)}</div>

                    <div className="space-y-6">
                        <div className="space-y-4 rounded-xl border p-5 shadow-sm md:p-6">
                            <SectionHeader
                                icon={<LogsIcon className="size-4" />}
                                title="Activity"
                            />
                            <Separator />

                            {question.audit_logs.length === 0 ? (
                                <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                                    No activity yet
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {question.audit_logs.map((log) => (
                                        <AuditLogCard key={log.id} log={log} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

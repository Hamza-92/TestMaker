import { Head, useForm } from '@inertiajs/react';
import { createEmptyQuestionContent, QuestionForm } from './form';
import type {
    ChapterOption,
    QuestionFormData,
    QuestionTypeOption,
    SourceOption,
} from './form';

const STICKY_KEY = 'question_add_sticky';

interface StickyDefaults {
    question_type_id: string;
    chapter_id: string;
    topic_id: string;
    source: string;
    status: string;
}

function loadSticky(
    questionTypes: QuestionTypeOption[],
    chapters: ChapterOption[],
    sourceOptions: SourceOption[],
): Partial<StickyDefaults> {
    try {
        const raw = JSON.parse(
            localStorage.getItem(STICKY_KEY) ?? '{}',
        ) as Partial<StickyDefaults>;
        const valid: Partial<StickyDefaults> = {};

        if (
            raw.question_type_id &&
            questionTypes.some(
                (qt) => qt.id.toString() === raw.question_type_id,
            )
        ) {
            valid.question_type_id = raw.question_type_id;
        }

        if (
            raw.chapter_id &&
            chapters.some((c) => c.id.toString() === raw.chapter_id)
        ) {
            valid.chapter_id = raw.chapter_id;
            const chapter = chapters.find(
                (c) => c.id.toString() === raw.chapter_id,
            );
            if (
                chapter &&
                raw.topic_id &&
                chapter.topics.some((t) => t.id.toString() === raw.topic_id)
            ) {
                valid.topic_id = raw.topic_id;
            }
        }

        if (raw.source && sourceOptions.some((s) => s.value === raw.source)) {
            valid.source = raw.source;
        }

        if (raw.status === '0' || raw.status === '1') {
            valid.status = raw.status;
        }

        return valid;
    } catch {
        return {};
    }
}

function saveSticky(data: StickyDefaults) {
    try {
        localStorage.setItem(STICKY_KEY, JSON.stringify(data));
    } catch {}
}

export default function AddQuestion({
    questionTypes,
    chapters,
    sourceOptions,
    defaultChapterId,
    defaultTopicId,
    lockedChapterId,
    lockedTopicId,
    backHref = '/superadmin/questions',
}: {
    questionTypes: QuestionTypeOption[];
    chapters: ChapterOption[];
    sourceOptions: SourceOption[];
    defaultChapterId?: number | null;
    defaultTopicId?: number | null;
    lockedChapterId?: number | null;
    lockedTopicId?: number | null;
    backHref?: string;
}) {
    const sticky = loadSticky(questionTypes, chapters, sourceOptions);

    const scopedChapterId = lockedChapterId ?? defaultChapterId ?? null;
    const initialChapterId = scopedChapterId
        ? scopedChapterId.toString()
        : (sticky.chapter_id ?? '');
    const initialTopicId = lockedTopicId
        ? lockedTopicId.toString()
        : (defaultTopicId?.toString() ?? (scopedChapterId ? '' : (sticky.topic_id ?? '')));

    const form = useForm<QuestionFormData>({
        question_type_id: sticky.question_type_id ?? '',
        chapter_id: initialChapterId,
        topic_id: initialTopicId,
        source: sticky.source ?? '',
        status: sticky.status ?? '1',
        content: createEmptyQuestionContent(),
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const submitter = (event.nativeEvent as SubmitEvent)
            .submitter as HTMLButtonElement | null;
        const saveAndAddNew = submitter?.value === 'save-and-add-new';

        const { question_type_id, chapter_id, topic_id, source, status } =
            form.data;

        saveSticky({ question_type_id, chapter_id, topic_id, source, status });

        const query = new URLSearchParams();

        if (saveAndAddNew) {
            query.set('save_and_add_new', '1');
        }

        if (lockedTopicId) {
            query.set('topic_scoped', '1');
        } else if (lockedChapterId) {
            query.set('chapter_scoped', '1');
        }

        const action = `/superadmin/questions${query.toString() ? `?${query.toString()}` : ''}`;

        form.post(action, {
            preserveScroll: saveAndAddNew,
            onSuccess: () => {
                if (!saveAndAddNew) return;

                form.clearErrors();
                form.setData({
                    question_type_id,
                    chapter_id,
                    topic_id,
                    source,
                    status,
                    content: createEmptyQuestionContent(),
                });
            },
        });
    };

    return (
        <>
            <Head title="Add Question" />
            <QuestionForm
                title="Add Question"
                submitLabel="Save Question"
                backHref={backHref}
                form={form}
                questionTypes={questionTypes}
                chapters={chapters}
                sourceOptions={sourceOptions}
                onSubmit={handleSubmit}
                secondarySubmitLabel="Save & Add New"
                lockedChapterId={lockedChapterId}
                lockedTopicId={lockedTopicId}
            />
        </>
    );
}

AddQuestion.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Questions', href: '/superadmin/questions' },
        { title: 'Add Question', href: '/superadmin/questions/add' },
    ],
};

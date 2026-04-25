import { Head, useForm } from '@inertiajs/react';
import { createEmptyQuestionContent, QuestionForm } from './form';
import type {
    ChapterOption,
    QuestionFormData,
    QuestionTypeOption,
    SourceOption,
} from './form';

export default function AddQuestion({
    questionTypes,
    chapters,
    sourceOptions,
}: {
    questionTypes: QuestionTypeOption[];
    chapters: ChapterOption[];
    sourceOptions: SourceOption[];
}) {
    const form = useForm<QuestionFormData>({
        question_type_id: '',
        chapter_id: '',
        topic_id: '',
        source: '',
        status: '1',
        content: createEmptyQuestionContent(),
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const submitter = (event.nativeEvent as SubmitEvent)
            .submitter as HTMLButtonElement | null;
        const saveAndAddNew = submitter?.value === 'save-and-add-new';
        const chapterId = form.data.chapter_id;
        const topicId = form.data.topic_id;

        form.post(
            saveAndAddNew
                ? '/superadmin/questions?save_and_add_new=1'
                : '/superadmin/questions',
            {
                preserveScroll: saveAndAddNew,
                onSuccess: () => {
                    if (!saveAndAddNew) {
                        return;
                    }

                    form.clearErrors();
                    form.setData({
                        question_type_id: '',
                        chapter_id: chapterId,
                        topic_id: topicId,
                        source: '',
                        status: '1',
                        content: createEmptyQuestionContent(),
                    });
                },
            },
        );
    };

    return (
        <>
            <Head title="Add Question" />
            <QuestionForm
                title="Add Question"
                submitLabel="Save Question"
                backHref="/superadmin/questions"
                form={form}
                questionTypes={questionTypes}
                chapters={chapters}
                sourceOptions={sourceOptions}
                onSubmit={handleSubmit}
                secondarySubmitLabel="Save & Add New"
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

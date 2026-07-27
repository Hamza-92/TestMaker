import { Head, useForm } from '@inertiajs/react';
import { QuestionForm } from './form';
import type {
    ChapterOption,
    QuestionFormData,
    QuestionTypeOption,
    SourceOption,
    MediumOption,
} from './form';

interface QuestionPayload {
    id: number;
    question_type_id: number;
    chapter_id: number;
    medium_id: number | null;
    topic_id: number | null;
    source: string | null;
    status: number;
    content: QuestionFormData['content'];
}

export default function EditQuestion({
    question,
    questionTypes,
    chapters,
    sourceOptions,
    mediumOptions,
    backHref,
}: {
    question: QuestionPayload;
    questionTypes: QuestionTypeOption[];
    chapters: ChapterOption[];
    sourceOptions: SourceOption[];
    mediumOptions: MediumOption[];
    backHref: string;
}) {
    const form = useForm<QuestionFormData>({
        question_type_id: String(question.question_type_id),
        chapter_id: String(question.chapter_id),
        topic_id: question.topic_id ? String(question.topic_id) : '',
        source: question.source ?? '',
        medium_id: question.medium_id ? String(question.medium_id) : String(mediumOptions.find((medium) => medium.name === 'Both')?.id ?? mediumOptions[0]?.id ?? ''),
        status: String(question.status),
        content: question.content,
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.put(`/superadmin/questions/${question.id}`);
    };

    return (
        <>
            <Head title="Edit Question" />
            <QuestionForm
                title="Edit Question"
                submitLabel="Save Changes"
                backHref={backHref}
                form={form}
                questionTypes={questionTypes}
                chapters={chapters}
                sourceOptions={sourceOptions}
                mediumOptions={mediumOptions}
                onSubmit={handleSubmit}
            />
        </>
    );
}

EditQuestion.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Questions', href: '/superadmin/questions' },
        { title: 'Edit Question' },
    ],
};

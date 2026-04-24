import { Head, useForm } from '@inertiajs/react';
import { QuestionForm } from './form';
import type {
    ChapterOption,
    QuestionFormData,
    QuestionTypeOption,
    SourceOption,
} from './form';

interface QuestionPayload {
    id: number;
    question_type_id: number;
    chapter_id: number;
    topic_id: number | null;
    statement_en: string | null;
    statement_ur: string | null;
    description_en: string | null;
    description_ur: string | null;
    answer_en: string | null;
    answer_ur: string | null;
    source: string | null;
    status: number;
    options: Array<{
        id: number;
        text_en: string | null;
        text_ur: string | null;
        is_correct: boolean;
    }>;
}

export default function EditQuestion({
    question,
    questionTypes,
    chapters,
    sourceOptions,
}: {
    question: QuestionPayload;
    questionTypes: QuestionTypeOption[];
    chapters: ChapterOption[];
    sourceOptions: SourceOption[];
}) {
    const form = useForm<QuestionFormData>({
        question_type_id: String(question.question_type_id),
        chapter_id: String(question.chapter_id),
        topic_id: question.topic_id ? String(question.topic_id) : '',
        statement_en: question.statement_en ?? '',
        statement_ur: question.statement_ur ?? '',
        description_en: question.description_en ?? '',
        description_ur: question.description_ur ?? '',
        answer_en: question.answer_en ?? '',
        answer_ur: question.answer_ur ?? '',
        source: question.source ?? '',
        status: String(question.status),
        options: question.options.map((option) => ({
            text_en: option.text_en ?? '',
            text_ur: option.text_ur ?? '',
            is_correct: option.is_correct,
        })),
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
                backHref={`/superadmin/questions/${question.id}`}
                form={form}
                questionTypes={questionTypes}
                chapters={chapters}
                sourceOptions={sourceOptions}
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

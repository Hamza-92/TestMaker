import { Head, useForm } from '@inertiajs/react';
import { QuestionTypeForm } from './form';
import type { QuestionSchemaOption, QuestionTypeFormData } from './form';

interface QuestionTypePayload {
    id: number;
    name: string;
    name_ur: string | null;
    heading_en: string;
    heading_ur: string | null;
    description_en: string | null;
    description_ur: string | null;
    have_answer: boolean;
    is_single: boolean;
    is_objective: boolean;
    schema_key: string;
    status: number;
}

export default function EditQuestionType({
    questionType,
    questionSchemas,
    backHref,
}: {
    questionType: QuestionTypePayload;
    questionSchemas: QuestionSchemaOption[];
    backHref: string;
}) {
    const form = useForm<QuestionTypeFormData>({
        name: questionType.name,
        name_ur: questionType.name_ur ?? '',
        heading_en: questionType.heading_en,
        heading_ur: questionType.heading_ur ?? '',
        description_en: questionType.description_en ?? '',
        description_ur: questionType.description_ur ?? '',
        have_answer: questionType.have_answer,
        is_single: questionType.is_single,
        is_objective: questionType.is_objective,
        schema_key: questionType.schema_key,
        status: String(questionType.status),
    });

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        form.put(`/superadmin/question-types/${questionType.id}`);
    };

    return (
        <>
            <Head title="Edit Question Type" />
            <QuestionTypeForm
                title="Edit Question Type"
                submitLabel="Save Changes"
                backHref={backHref}
                form={form}
                questionSchemas={questionSchemas}
                onSubmit={handleSubmit}
            />
        </>
    );
}

EditQuestionType.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Question Types', href: '/superadmin/question-types' },
        { title: 'Edit Question Type' },
    ],
};

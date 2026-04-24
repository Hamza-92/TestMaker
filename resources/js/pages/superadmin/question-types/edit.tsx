import { Head, useForm } from '@inertiajs/react';
import { QuestionTypeForm } from './form';
import type { ObjectiveTypeOption, QuestionTypeFormData } from './form';

interface QuestionTypePayload {
    id: number;
    name: string;
    name_ur: string | null;
    heading_en: string;
    heading_ur: string | null;
    description_en: string | null;
    description_ur: string | null;
    have_exercise: boolean;
    have_statement: boolean;
    statement_label: string | null;
    have_description: boolean;
    description_label: string | null;
    have_answer: boolean;
    is_single: boolean;
    is_objective: boolean;
    objective_type_id: number | null;
    column_per_row: number;
    status: number;
}

export default function EditQuestionType({
    questionType,
    objectiveTypes,
}: {
    questionType: QuestionTypePayload;
    objectiveTypes: ObjectiveTypeOption[];
}) {
    const form = useForm<QuestionTypeFormData>({
        name: questionType.name,
        name_ur: questionType.name_ur ?? '',
        heading_en: questionType.heading_en,
        heading_ur: questionType.heading_ur ?? '',
        description_en: questionType.description_en ?? '',
        description_ur: questionType.description_ur ?? '',
        have_exercise: questionType.have_exercise,
        have_statement: questionType.have_statement,
        statement_label: questionType.statement_label ?? 'Statement',
        have_description: questionType.have_description,
        description_label: questionType.description_label ?? 'Description',
        have_answer: questionType.have_answer,
        is_single: questionType.is_single,
        is_objective: questionType.is_objective,
        objective_type_id: questionType.objective_type_id
            ? String(questionType.objective_type_id)
            : '',
        column_per_row: String(questionType.column_per_row),
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
                backHref={`/superadmin/question-types/${questionType.id}`}
                form={form}
                objectiveTypes={objectiveTypes}
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

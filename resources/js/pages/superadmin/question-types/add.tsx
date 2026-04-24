import { Head, useForm } from '@inertiajs/react';
import { QuestionTypeForm } from './form';
import type { ObjectiveTypeOption, QuestionTypeFormData } from './form';

export default function AddQuestionType({
    objectiveTypes,
}: {
    objectiveTypes: ObjectiveTypeOption[];
}) {
    const form = useForm<QuestionTypeFormData>({
        name: '',
        name_ur: '',
        heading_en: '',
        heading_ur: '',
        description_en: '',
        description_ur: '',
        have_exercise: false,
        have_statement: true,
        statement_label: 'Statement',
        have_description: false,
        description_label: 'Description',
        have_answer: true,
        is_single: true,
        is_objective: false,
        objective_type_id: '',
        column_per_row: '1',
        status: '1',
    });

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        form.post('/superadmin/question-types');
    };

    return (
        <>
            <Head title="Add Question Type" />
            <QuestionTypeForm
                title="Add Question Type"
                submitLabel="Save Question Type"
                backHref="/superadmin/question-types"
                form={form}
                objectiveTypes={objectiveTypes}
                onSubmit={handleSubmit}
            />
        </>
    );
}

AddQuestionType.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Question Types', href: '/superadmin/question-types' },
        { title: 'Add Question Type', href: '/superadmin/question-types/add' },
    ],
};

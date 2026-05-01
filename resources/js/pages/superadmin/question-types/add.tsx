import { Head, useForm } from '@inertiajs/react';
import { QuestionTypeForm } from './form';
import type { QuestionSchemaOption, QuestionTypeFormData } from './form';

export default function AddQuestionType({
    questionSchemas,
    lockedKind,
}: {
    questionSchemas: QuestionSchemaOption[];
    lockedKind?: 'objective' | 'subjective' | null;
}) {
    const isObjective = lockedKind === 'objective';
    const defaultSchema = questionSchemas.find(
        (s) => s.kind === (lockedKind ?? 'subjective'),
    );

    const form = useForm<QuestionTypeFormData>({
        name: '',
        name_ur: '',
        heading_en: '',
        heading_ur: '',
        description_en: '',
        description_ur: '',
        have_answer: true,
        is_single: false,
        is_objective: isObjective,
        schema_key: defaultSchema?.key ?? 'subjective_standard',
        status: '1',
    });

    const backHref = lockedKind
        ? `/superadmin/question-types/${lockedKind}`
        : '/superadmin/question-types';

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
                backHref={backHref}
                form={form}
                questionSchemas={questionSchemas}
                lockedKind={lockedKind ?? undefined}
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

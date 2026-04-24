<?php

namespace App\Http\Requests\Superadmin;

use App\Models\QuestionType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class QuestionTypeUpsertRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $questionType = $this->route('questionType');
        $questionTypeId = $questionType instanceof QuestionType
            ? $questionType->id
            : null;

        return [
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('question_types', 'name')->ignore($questionTypeId),
            ],
            'name_ur' => ['nullable', 'string', 'max:100'],
            'heading_en' => ['required', 'string', 'max:150'],
            'heading_ur' => ['nullable', 'string', 'max:150'],
            'description_en' => ['nullable', 'string'],
            'description_ur' => ['nullable', 'string'],
            'have_exercise' => ['required', 'boolean'],
            'have_statement' => ['required', 'boolean'],
            'statement_label' => ['nullable', 'string', 'max:100'],
            'have_description' => ['required', 'boolean'],
            'description_label' => ['nullable', 'string', 'max:100'],
            'have_answer' => ['required', 'boolean'],
            'is_single' => ['required', 'boolean'],
            'is_objective' => ['required', 'boolean'],
            'objective_type_id' => [
                'nullable',
                'integer',
                Rule::exists('question_types', 'id')->where(
                    fn ($query) => $query->where('is_objective', true),
                ),
                Rule::notIn(array_filter([$questionTypeId])),
            ],
            'column_per_row' => ['required', 'integer', 'min:1', 'max:6'],
            'status' => ['required', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => $this->normalizeString($this->input('name')),
            'name_ur' => $this->normalizeNullableString($this->input('name_ur')),
            'heading_en' => $this->normalizeString($this->input('heading_en')),
            'heading_ur' => $this->normalizeNullableString($this->input('heading_ur')),
            'description_en' => $this->normalizeNullableString($this->input('description_en')),
            'description_ur' => $this->normalizeNullableString($this->input('description_ur')),
            'statement_label' => $this->normalizeNullableString($this->input('statement_label')),
            'description_label' => $this->normalizeNullableString($this->input('description_label')),
            'have_exercise' => $this->boolean('have_exercise'),
            'have_statement' => $this->boolean('have_statement'),
            'have_description' => $this->boolean('have_description'),
            'have_answer' => $this->boolean('have_answer'),
            'is_single' => $this->boolean('is_single'),
            'is_objective' => $this->boolean('is_objective'),
            'objective_type_id' => filled($this->input('objective_type_id'))
                ? (int) $this->input('objective_type_id')
                : null,
            'column_per_row' => filled($this->input('column_per_row'))
                ? (int) $this->input('column_per_row')
                : null,
            'status' => $this->boolean('status'),
        ]);
    }

    private function normalizeString(mixed $value): string
    {
        return trim((string) $value);
    }

    private function normalizeNullableString(mixed $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }
}

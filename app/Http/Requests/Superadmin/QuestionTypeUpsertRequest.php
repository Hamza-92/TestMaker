<?php

namespace App\Http\Requests\Superadmin;

use App\Models\QuestionType;
use App\Support\Questions\QuestionTypeSchemaRegistry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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
            'have_answer' => ['required', 'boolean'],
            'is_single' => ['required', 'boolean'],
            'is_objective' => ['required', 'boolean'],
            'schema_key' => [
                'required',
                'string',
                Rule::in(array_keys(QuestionTypeSchemaRegistry::definitions())),
            ],
            'objective_type_id' => [
                'nullable',
                'integer',
                Rule::exists('question_types', 'id')->where(
                    fn ($query) => $query->where('is_objective', true),
                ),
                Rule::notIn(array_filter([$questionTypeId])),
            ],
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
            'have_answer' => $this->boolean('have_answer'),
            'is_single' => $this->boolean('is_single'),
            'is_objective' => $this->boolean('is_objective'),
            'schema_key' => $this->normalizeNullableString(
                $this->input('schema_key'),
            ) ?? QuestionTypeSchemaRegistry::infer(
                $this->boolean('is_objective'),
                [
                    'objective_type_id' => $this->input('objective_type_id'),
                    'have_description' => $this->boolean('have_description'),
                    'have_answer' => $this->boolean('have_answer'),
                ],
            ),
            'objective_type_id' => filled($this->input('objective_type_id'))
                ? (int) $this->input('objective_type_id')
                : null,
            'status' => $this->boolean('status'),
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $schema = QuestionTypeSchemaRegistry::resolve(
                $this->input('schema_key'),
                $this->boolean('is_objective'),
            );

            if ($schema['kind'] !== ($this->boolean('is_objective') ? 'objective' : 'subjective')) {
                $validator->errors()->add(
                    'schema_key',
                    'Selected schema does not match the question type kind.',
                );
            }
        });
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

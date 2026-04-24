<?php

namespace App\Http\Requests\Superadmin;

use App\Models\Chapter;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\Topic;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class QuestionUpsertRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'question_type_id' => ['required', 'integer', Rule::exists('question_types', 'id')],
            'chapter_id' => ['required', 'integer', Rule::exists('chapters', 'id')],
            'topic_id' => ['nullable', 'integer', Rule::exists('topics', 'id')],
            'statement_en' => ['nullable', 'string'],
            'statement_ur' => ['nullable', 'string'],
            'description_en' => ['nullable', 'string'],
            'description_ur' => ['nullable', 'string'],
            'answer_en' => ['nullable', 'string'],
            'answer_ur' => ['nullable', 'string'],
            'source' => ['nullable', 'string', 'max:100', Rule::in(Question::sourceValues())],
            'status' => ['required', 'boolean'],
            'options' => ['nullable', 'array'],
            'options.*.text_en' => ['nullable', 'string'],
            'options.*.text_ur' => ['nullable', 'string'],
            'options.*.is_correct' => ['required', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $questionType = QuestionType::query()->find($this->input('question_type_id'));
            $chapter = Chapter::query()->with([
                'subject:id,subject_type',
                'topics' => fn ($query) => $query->where('status', 1)->select('id', 'chapter_id'),
            ])->find($this->input('chapter_id'));

            if (! $questionType || ! $chapter) {
                return;
            }

            $topicId = $this->input('topic_id');
            $statementEn = $this->normalizeNullableString($this->input('statement_en'));
            $statementUr = $this->normalizeNullableString($this->input('statement_ur'));
            $descriptionEn = $this->normalizeNullableString($this->input('description_en'));
            $descriptionUr = $this->normalizeNullableString($this->input('description_ur'));
            $answerEn = $this->normalizeNullableString($this->input('answer_en'));
            $answerUr = $this->normalizeNullableString($this->input('answer_ur'));
            $options = collect($this->input('options', []))
                ->map(fn ($option) => [
                    'text_en' => $this->normalizeNullableString($option['text_en'] ?? null),
                    'text_ur' => $this->normalizeNullableString($option['text_ur'] ?? null),
                    'is_correct' => filter_var($option['is_correct'] ?? false, FILTER_VALIDATE_BOOLEAN),
                ])
                ->filter(fn (array $option) => $option['text_en'] !== null || $option['text_ur'] !== null)
                ->values();

            if ($topicId) {
                $topic = Topic::query()->find($topicId);

                if (! $topic || $topic->chapter_id !== $chapter->id) {
                    $validator->errors()->add('topic_id', 'Selected topic is invalid.');
                }
            }

            if ($chapter->subject?->subject_type !== 'topic-wise' && $topicId) {
                $validator->errors()->add('topic_id', 'Selected topic is invalid.');
            }

            if (
                $chapter->subject?->subject_type === 'topic-wise'
                && $chapter->topics->isNotEmpty()
                && ! $topicId
            ) {
                $validator->errors()->add('topic_id', 'Topic is required.');
            }

            if ($questionType->have_statement && $statementEn === null && $statementUr === null) {
                $validator->errors()->add('statement_en', 'Statement is required.');
            }

            if ($questionType->have_description && $descriptionEn === null && $descriptionUr === null) {
                $validator->errors()->add('description_en', 'Description is required.');
            }

            if (! $questionType->is_objective && $questionType->have_answer && $answerEn === null && $answerUr === null) {
                $validator->errors()->add('answer_en', 'Answer is required.');
            }

            if (! $questionType->is_objective) {
                return;
            }

            if ($options->count() < 2) {
                $validator->errors()->add('options', 'At least two options are required.');

                return;
            }

            $correctCount = $options->where('is_correct', true)->count();

            if ($correctCount < 1) {
                $validator->errors()->add('options', 'Select at least one correct option.');
            }

            if ($questionType->is_single && $correctCount !== 1) {
                $validator->errors()->add('options', 'Single objective questions require exactly one correct option.');
            }
        });
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'question_type_id' => filled($this->input('question_type_id'))
                ? (int) $this->input('question_type_id')
                : null,
            'chapter_id' => filled($this->input('chapter_id'))
                ? (int) $this->input('chapter_id')
                : null,
            'topic_id' => filled($this->input('topic_id')) ? (int) $this->input('topic_id') : null,
            'statement_en' => $this->normalizeNullableString($this->input('statement_en')),
            'statement_ur' => $this->normalizeNullableString($this->input('statement_ur')),
            'description_en' => $this->normalizeNullableString($this->input('description_en')),
            'description_ur' => $this->normalizeNullableString($this->input('description_ur')),
            'answer_en' => $this->normalizeNullableString($this->input('answer_en')),
            'answer_ur' => $this->normalizeNullableString($this->input('answer_ur')),
            'source' => Question::normalizeSource($this->input('source')),
            'status' => $this->boolean('status'),
            'options' => collect($this->input('options', []))
                ->map(fn ($option) => [
                    'text_en' => $this->normalizeNullableString($option['text_en'] ?? null),
                    'text_ur' => $this->normalizeNullableString($option['text_ur'] ?? null),
                    'is_correct' => filter_var($option['is_correct'] ?? false, FILTER_VALIDATE_BOOLEAN),
                ])
                ->all(),
        ]);
    }

    private function normalizeNullableString(mixed $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }
}

<?php

namespace App\Http\Requests\Superadmin;

use App\Models\Chapter;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\Topic;
use App\Support\Questions\QuestionTypeSchemaRegistry;
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
            'content' => ['required', 'array'],
            'source' => ['nullable', 'string', 'max:100', Rule::in(Question::sourceValues())],
            'status' => ['required', 'boolean'],
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
            $content = is_array($this->input('content')) ? $this->input('content') : [];

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

            QuestionTypeSchemaRegistry::validateQuestionContent(
                $questionType,
                $content,
                $validator,
            );
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
            'content' => $this->normalizeContent($this->input('content', [])),
            'source' => Question::normalizeSource($this->input('source')),
            'status' => $this->boolean('status'),
        ]);
    }

    private function normalizeNullableString(mixed $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }

    private function normalizeContent(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $normalized = [];

        foreach ($value as $key => $item) {
            if (is_array($item)) {
                $normalized[$key] = $this->normalizeContent($item);

                continue;
            }

            if ($key === 'is_correct') {
                $normalized[$key] = filter_var($item, FILTER_VALIDATE_BOOLEAN);

                continue;
            }

            if ($key === 'correct_boolean') {
                $normalized[$key] = in_array($item, ['true', 'false'], true)
                    ? $item
                    : '';

                continue;
            }

            $normalized[$key] = $this->normalizeNullableString($item);
        }

        return $normalized;
    }
}

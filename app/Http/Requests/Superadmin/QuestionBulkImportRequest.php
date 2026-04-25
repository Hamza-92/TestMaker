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

class QuestionBulkImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $fileRules = ['nullable', 'file', 'max:10240', 'mimes:csv,txt,xlsx,xls'];

        if ($this->routeIs('superadmin.questions.import.preview')) {
            $fileRules[0] = 'required';
        } elseif (! filled($this->input('preview_token'))) {
            $fileRules[0] = 'required';
        }

        return [
            'question_type_id' => ['required', 'integer', Rule::exists('question_types', 'id')],
            'chapter_id' => ['required', 'integer', Rule::exists('chapters', 'id')],
            'topic_id' => ['nullable', 'integer', Rule::exists('topics', 'id')],
            'source' => ['nullable', 'string', 'max:100', Rule::in(Question::sourceValues())],
            'status' => ['required', 'boolean'],
            'preview_token' => ['nullable', 'string', 'max:120'],
            'file' => $fileRules,
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $questionType = QuestionType::query()->find($this->input('question_type_id'));

            if ($questionType && ! QuestionTypeSchemaRegistry::supportsSimpleImport($questionType)) {
                $validator->errors()->add(
                    'question_type_id',
                    'Bulk import currently supports only simple single-prompt question types.',
                );
            }

            $chapter = Chapter::query()->with([
                'subject:id,subject_type',
                'topics' => fn ($query) => $query
                    ->where('status', 1)
                    ->select('id', 'chapter_id'),
            ])->find($this->input('chapter_id'));

            if (! $chapter) {
                return;
            }

            $topicId = $this->input('topic_id');

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
            'topic_id' => filled($this->input('topic_id'))
                ? (int) $this->input('topic_id')
                : null,
            'source' => Question::normalizeSource($this->input('source')),
            'preview_token' => $this->normalizeNullableString($this->input('preview_token')),
            'status' => $this->boolean('status'),
        ]);
    }

    private function normalizeNullableString(mixed $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }
}

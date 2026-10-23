<?php

namespace App\Http\Requests\Superadmin;

use App\Models\Question;
use App\Models\QuestionType;
use App\Support\Questions\QuestionTypeHeadingResolver;
use App\Support\Questions\QuestionTypeSchemaRegistry;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class QatQuestionUpsertRequest extends QuestionUpsertRequest
{
    public function authorize(): bool
    {
        $question = DB::table('qat_questions')
            ->join('qat_chapters', 'qat_chapters.id', '=', 'qat_questions.qat_chapter_id')
            ->join('qat_subjects', 'qat_subjects.id', '=', 'qat_chapters.qat_subject_id')
            ->where('qat_questions.id', (int) $this->route('qatQuestion'))
            ->where('qat_chapters.id', (int) $this->route('qatChapter'))
            ->where('qat_subjects.id', (int) $this->route('qatSubject'))
            ->where('qat_subjects.qat_class_id', (int) $this->route('qatClass'))
            ->exists();
        abort_unless($question, 404);

        return true;
    }

    public function rules(): array
    {
        $chapterId = (int) $this->route('qatChapter');
        $questionId = (int) $this->route('qatQuestion');

        return [
            'question_type_id' => ['required', 'integer', function ($attribute, $value, $fail) use ($chapterId, $questionId): void {
                if (! QuestionType::query()->whereKey($value)->where('status', 1)->exists()
                    && ! DB::table('qat_questions')->where('id', $questionId)->where('qat_chapter_id', $chapterId)
                        ->where('question_type_id', $value)->exists()) {
                    $fail('Selected question type is invalid.');
                }
            }],
            'chapter_id' => ['required', 'integer', Rule::in([$chapterId])],
            'medium_id' => ['nullable', 'integer', Rule::exists('mediums', 'id')],
            'topic_id' => ['nullable', 'integer', Rule::exists('qat_topics', 'id')->where('qat_chapter_id', $chapterId)],
            'content' => ['required', 'array'],
            'source' => ['nullable', 'string', 'max:100', Rule::in(Question::sourceValues())],
            'status' => ['required', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $chapterId = (int) $this->route('qatChapter');
            $question = DB::table('qat_questions')->where('id', (int) $this->route('qatQuestion'))
                ->where('qat_chapter_id', $chapterId)->first();
            if (! $question || $validator->errors()->has('question_type_id')) {
                return;
            }

            $snapshot = json_decode($question->question_data, true) ?: [];
            $type = (int) $this->input('question_type_id') === (int) $question->question_type_id
                ? new QuestionType((array) ($snapshot['question_type'] ?? []))
                : QuestionType::query()->find($this->input('question_type_id'));
            if (! $type || ! $type->name) {
                $validator->errors()->add('question_type_id', 'Selected question type is invalid.');

                return;
            }

            if ((int) $this->input('question_type_id') === (int) $question->question_type_id) {
                $type->schema_key = $snapshot['schema_key'] ?? $type->schema_key;
            } else {
                $scope = DB::table('qat_chapters')
                    ->join('qat_subjects', 'qat_subjects.id', '=', 'qat_chapters.qat_subject_id')
                    ->join('qat_classes', 'qat_classes.id', '=', 'qat_subjects.qat_class_id')
                    ->where('qat_chapters.id', $chapterId)
                    ->first(['qat_subjects.source_pattern_id', 'qat_classes.source_class_id', 'qat_subjects.subject_id']);
                if (! $scope) {
                    return;
                }
                $type = QuestionTypeHeadingResolver::one(
                    $type, (int) $scope->source_pattern_id, (int) $scope->source_class_id, (int) $scope->subject_id,
                );
            }

            $hasTopics = DB::table('qat_topics')->where('qat_chapter_id', $chapterId)->exists();
            if ($hasTopics && ! $this->input('topic_id')) {
                $validator->errors()->add('topic_id', 'Topic is required.');
            }
            if (! $hasTopics && $this->input('topic_id')) {
                $validator->errors()->add('topic_id', 'Selected topic is invalid.');
            }

            QuestionTypeSchemaRegistry::validateQuestionContent(
                $type,
                is_array($this->input('content')) ? $this->input('content') : [],
                $validator,
            );
        });
    }
}

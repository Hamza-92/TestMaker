<?php

namespace App\Support\Questions;

use App\Enums\AuditEvent;
use App\Models\AuditLog;
use App\Models\Question;
use App\Models\QuestionType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QuestionTypeChanger
{
    public function change(Builder $questions, QuestionType $targetType, string $errorField): int
    {
        $sourceTypes = QuestionType::query()
            ->whereIn(
                'id',
                (clone $questions)->select('questions.question_type_id')->distinct(),
            )
            ->get([
                'id',
                'schema_key',
                'is_objective',
                'objective_type_id',
                'have_description',
                'have_answer',
            ]);

        if ($sourceTypes->isEmpty()) {
            throw ValidationException::withMessages([
                $errorField => 'No questions were found to change.',
            ]);
        }

        $targetSchema = $this->schemaKey($targetType);
        if ($sourceTypes->contains(fn (QuestionType $sourceType) => (bool) $sourceType->is_objective !== (bool) $targetType->is_objective
            || ((bool) $sourceType->is_objective && $this->schemaKey($sourceType) !== $targetSchema)
        )) {
            throw ValidationException::withMessages([
                $errorField => 'Choose a question type of the same objective or subjective kind.',
            ]);
        }

        $sourceSchemaKeys = $sourceTypes->mapWithKeys(
            fn (QuestionType $sourceType) => [$sourceType->id => $this->schemaKey($sourceType)],
        );

        $changed = 0;

        DB::transaction(function () use ($questions, $sourceSchemaKeys, $targetType, &$changed): void {
            (clone $questions)
                ->where('question_type_id', '!=', $targetType->id)
                ->select(['id', 'question_type_id'])
                ->orderBy('id')
                ->chunkById(500, function ($questionChunk) use ($sourceSchemaKeys, $targetType, &$changed): void {
                    $now = now();
                    $questionIds = $questionChunk->pluck('id')->all();

                    foreach ($questionChunk->groupBy('question_type_id') as $sourceTypeId => $sourceQuestions) {
                        Question::query()
                            ->whereKey($sourceQuestions->pluck('id'))
                            ->whereNull('schema_key')
                            ->update(['schema_key' => $sourceSchemaKeys->get($sourceTypeId)]);
                    }

                    AuditLog::query()->insert(
                        $questionChunk->map(fn (Question $question) => [
                            'auditable_type' => $question->getMorphClass(),
                            'auditable_id' => $question->id,
                            'event' => AuditEvent::Updated->value,
                            'old_values' => json_encode([
                                'question_type_id' => $question->question_type_id,
                            ]),
                            'new_values' => json_encode([
                                'question_type_id' => $targetType->id,
                            ]),
                            'changed_by' => auth()->id(),
                            'ip_address' => request()->ip(),
                            'notes' => 'Question type changed in bulk.',
                            'created_at' => $now,
                        ])->all(),
                    );

                    Question::query()
                        ->whereKey($questionIds)
                        ->update(['question_type_id' => $targetType->id]);

                    $changed += count($questionIds);
                });
        });

        return $changed;
    }

    public function schemaKey(QuestionType $questionType): string
    {
        return QuestionTypeSchemaRegistry::resolve(
            $questionType->schema_key,
            $questionType->is_objective,
            [
                'objective_type_id' => $questionType->objective_type_id,
                'have_description' => $questionType->have_description,
                'have_answer' => $questionType->have_answer,
            ],
        )['key'];
    }
}

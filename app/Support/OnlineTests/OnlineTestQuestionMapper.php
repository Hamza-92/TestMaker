<?php

namespace App\Support\OnlineTests;

use App\Models\Question;
use App\Support\Questions\QuestionTypeSchemaRegistry;

class OnlineTestQuestionMapper
{
    private const SUPPORTED_SCHEMA_KEYS = [
        QuestionTypeSchemaRegistry::OBJECTIVE_MCQ,
        QuestionTypeSchemaRegistry::OBJECTIVE_BLANK_CHOICE,
        QuestionTypeSchemaRegistry::OBJECTIVE_TRUE_FALSE,
    ];

    public static function supports(Question $question): bool
    {
        $questionType = $question->questionType;

        if (! $questionType || ! $questionType->is_objective) {
            return false;
        }

        if (! in_array($questionType->schema_key, self::SUPPORTED_SCHEMA_KEYS, true)) {
            return false;
        }

        $options = self::usableOptions($question);

        return count($options) >= 2
            && collect($options)->where('is_correct', true)->count() === 1;
    }

    public static function snapshot(Question $question, int $sortOrder): array
    {
        $options = array_values(array_map(
            fn (array $option, int $index) => [
                'key' => (string) ($index + 1),
                'label' => self::optionLabel($index),
                'text_en' => $option['text_en'],
                'text_ur' => $option['text_ur'],
            ],
            self::usableOptions($question),
            array_keys(self::usableOptions($question)),
        ));

        $correctIndex = collect(self::usableOptions($question))
            ->search(fn (array $option) => $option['is_correct'] === true);

        return [
            'question_id' => $question->id,
            'question_type_id' => $question->question_type_id,
            'chapter_id' => $question->chapter_id,
            'topic_id' => $question->topic_id,
            'payload' => [
                'prompt_en' => self::normalizeText($question->statement_en),
                'prompt_ur' => self::normalizeText($question->statement_ur),
                'question_type' => $question->questionType?->name,
                'chapter_name' => $question->chapter?->name,
                'topic_name' => $question->topic?->name,
                'options' => $options,
            ],
            'correct_option_key' => (string) (($correctIndex === false ? 0 : $correctIndex) + 1),
            'marks' => 1,
            'sort_order' => $sortOrder,
        ];
    }

    public static function normalizeQuestionSelection(iterable $questions): array
    {
        $snapshots = [];

        foreach ($questions as $index => $question) {
            if (! self::supports($question)) {
                continue;
            }

            $snapshots[] = self::snapshot($question, $index + 1);
        }

        return $snapshots;
    }

    private static function usableOptions(Question $question): array
    {
        return $question->options
            ->map(fn ($option) => [
                'text_en' => self::normalizeText($option->text_en),
                'text_ur' => self::normalizeText($option->text_ur),
                'is_correct' => (bool) $option->is_correct,
            ])
            ->filter(fn (array $option) => $option['text_en'] !== null || $option['text_ur'] !== null)
            ->values()
            ->all();
    }

    private static function normalizeText(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    private static function optionLabel(int $index): string
    {
        return chr(65 + $index);
    }
}

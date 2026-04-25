<?php

namespace App\Support\Questions;

use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\QuestionType;
use Illuminate\Support\Arr;
use Illuminate\Validation\Validator;

class QuestionTypeSchemaRegistry
{
    public const OBJECTIVE_MCQ = 'objective_mcq';

    public const OBJECTIVE_TRUE_FALSE = 'objective_true_false';

    public const OBJECTIVE_BLANK_CHOICE = 'objective_blank_choice';

    public const OBJECTIVE_BLANK_OPEN = 'objective_blank_open';

    public const OBJECTIVE_PASSAGE_MCQ = 'objective_passage_mcq';

    public const SUBJECTIVE_STANDARD = 'subjective_standard';

    public const SUBJECTIVE_GROUPED = 'subjective_grouped';

    public const SUBJECTIVE_PAIRS = 'subjective_pairs';

    public static function definitions(): array
    {
        return [
            self::OBJECTIVE_MCQ => [
                'key' => self::OBJECTIVE_MCQ,
                'kind' => 'objective',
                'label' => 'MCQ / Choice Question',
                'description' => 'A single prompt with selectable options.',
                'settings' => [
                    'supports_answer_toggle' => false,
                    'supports_single_toggle' => true,
                ],
            ],
            self::OBJECTIVE_TRUE_FALSE => [
                'key' => self::OBJECTIVE_TRUE_FALSE,
                'kind' => 'objective',
                'label' => 'True / False',
                'description' => 'A statement with a true or false answer.',
                'settings' => [
                    'supports_answer_toggle' => false,
                    'supports_single_toggle' => false,
                ],
            ],
            self::OBJECTIVE_BLANK_CHOICE => [
                'key' => self::OBJECTIVE_BLANK_CHOICE,
                'kind' => 'objective',
                'label' => 'Fill In The Blank With Options',
                'description' => 'A blank-based statement with selectable options.',
                'settings' => [
                    'supports_answer_toggle' => false,
                    'supports_single_toggle' => true,
                ],
            ],
            self::OBJECTIVE_BLANK_OPEN => [
                'key' => self::OBJECTIVE_BLANK_OPEN,
                'kind' => 'objective',
                'label' => 'Fill In The Blank Without Options',
                'description' => 'A blank-based statement with direct answers instead of options.',
                'settings' => [
                    'supports_answer_toggle' => true,
                    'supports_single_toggle' => false,
                ],
            ],
            self::OBJECTIVE_PASSAGE_MCQ => [
                'key' => self::OBJECTIVE_PASSAGE_MCQ,
                'kind' => 'objective',
                'label' => 'Passage Based MCQ',
                'description' => 'A shared passage with multiple MCQ sub-questions.',
                'settings' => [
                    'supports_answer_toggle' => false,
                    'supports_single_toggle' => true,
                ],
            ],
            self::SUBJECTIVE_STANDARD => [
                'key' => self::SUBJECTIVE_STANDARD,
                'kind' => 'subjective',
                'label' => 'Standard Subjective',
                'description' => 'A prompt with optional guidance and answer.',
                'settings' => [
                    'supports_answer_toggle' => true,
                    'supports_single_toggle' => false,
                ],
            ],
            self::SUBJECTIVE_GROUPED => [
                'key' => self::SUBJECTIVE_GROUPED,
                'kind' => 'subjective',
                'label' => 'Grouped Subjective',
                'description' => 'A shared instruction block with multiple subjective prompts.',
                'settings' => [
                    'supports_answer_toggle' => true,
                    'supports_single_toggle' => false,
                ],
            ],
            self::SUBJECTIVE_PAIRS => [
                'key' => self::SUBJECTIVE_PAIRS,
                'kind' => 'subjective',
                'label' => 'Pairs / Matching / Jumble',
                'description' => 'Two-column or pair-based entries such as word meanings and jumble answers.',
                'settings' => [
                    'supports_answer_toggle' => false,
                    'supports_single_toggle' => false,
                ],
            ],
        ];
    }

    public static function options(?bool $isObjective = null): array
    {
        return array_values(array_filter(
            self::definitions(),
            fn (array $definition) => $isObjective === null
                ? true
                : $definition['kind'] === ($isObjective ? 'objective' : 'subjective'),
        ));
    }

    public static function resolve(
        ?string $schemaKey,
        ?bool $isObjective = null,
        array $legacy = [],
    ): array {
        $definitions = self::definitions();
        $resolvedKey = isset($definitions[$schemaKey])
            ? $schemaKey
            : self::infer($isObjective, $legacy);

        return $definitions[$resolvedKey];
    }

    public static function infer(?bool $isObjective, array $legacy = []): string
    {
        if ($isObjective) {
            $objectiveTypeId = (int) ($legacy['objective_type_id'] ?? 0);

            return match ($objectiveTypeId) {
                2 => self::OBJECTIVE_TRUE_FALSE,
                4, 27 => self::OBJECTIVE_BLANK_OPEN,
                5 => self::OBJECTIVE_PASSAGE_MCQ,
                3 => self::OBJECTIVE_BLANK_CHOICE,
                default => self::OBJECTIVE_MCQ,
            };
        }

        if ((bool) ($legacy['have_description'] ?? false) && ! (bool) ($legacy['have_answer'] ?? false)) {
            return self::SUBJECTIVE_GROUPED;
        }

        return self::SUBJECTIVE_STANDARD;
    }

    public static function emptyContent(string $schemaKey): array
    {
        return match ($schemaKey) {
            self::OBJECTIVE_MCQ,
            self::OBJECTIVE_BLANK_CHOICE => [
                'prompt_en' => '',
                'prompt_ur' => '',
                'options' => self::defaultOptions(),
            ],
            self::OBJECTIVE_TRUE_FALSE => [
                'prompt_en' => '',
                'prompt_ur' => '',
                'correct_boolean' => '',
            ],
            self::OBJECTIVE_BLANK_OPEN => [
                'prompt_en' => '',
                'prompt_ur' => '',
                'answer_en' => '',
                'answer_ur' => '',
            ],
            self::OBJECTIVE_PASSAGE_MCQ => [
                'passage_en' => '',
                'passage_ur' => '',
                'items' => [self::emptyObjectiveItem()],
            ],
            self::SUBJECTIVE_GROUPED => [
                'intro_en' => '',
                'intro_ur' => '',
                'items' => [self::emptySubjectiveItem()],
            ],
            self::SUBJECTIVE_PAIRS => [
                'prompt_en' => '',
                'prompt_ur' => '',
                'pairs' => [self::emptyPair()],
            ],
            default => [
                'prompt_en' => '',
                'prompt_ur' => '',
                'guidance_en' => '',
                'guidance_ur' => '',
                'answer_en' => '',
                'answer_ur' => '',
            ],
        };
    }

    public static function legacyAttributes(
        string $schemaKey,
        bool $isObjective,
        array $validated,
    ): array {
        $collectAnswers = (bool) ($validated['have_answer'] ?? false);
        $singleCorrect = (bool) ($validated['is_single'] ?? true);

        return match ($schemaKey) {
            self::OBJECTIVE_TRUE_FALSE => [
                'have_exercise' => false,
                'have_statement' => true,
                'statement_label' => 'Statement',
                'have_description' => false,
                'description_label' => null,
                'have_answer' => false,
                'is_single' => true,
                'objective_type_id' => null,
                'column_per_row' => 1,
            ],
            self::OBJECTIVE_BLANK_OPEN => [
                'have_exercise' => false,
                'have_statement' => true,
                'statement_label' => 'Statement',
                'have_description' => false,
                'description_label' => null,
                'have_answer' => true,
                'is_single' => true,
                'objective_type_id' => null,
                'column_per_row' => 1,
            ],
            self::OBJECTIVE_PASSAGE_MCQ => [
                'have_exercise' => false,
                'have_statement' => true,
                'statement_label' => 'Passage',
                'have_description' => false,
                'description_label' => null,
                'have_answer' => false,
                'is_single' => $singleCorrect,
                'objective_type_id' => null,
                'column_per_row' => 1,
            ],
            self::SUBJECTIVE_GROUPED => [
                'have_exercise' => false,
                'have_statement' => true,
                'statement_label' => 'Instructions',
                'have_description' => false,
                'description_label' => null,
                'have_answer' => $collectAnswers,
                'is_single' => false,
                'objective_type_id' => null,
                'column_per_row' => 1,
            ],
            self::SUBJECTIVE_PAIRS => [
                'have_exercise' => false,
                'have_statement' => true,
                'statement_label' => 'Instructions',
                'have_description' => false,
                'description_label' => null,
                'have_answer' => false,
                'is_single' => false,
                'objective_type_id' => null,
                'column_per_row' => 1,
            ],
            self::SUBJECTIVE_STANDARD => [
                'have_exercise' => false,
                'have_statement' => true,
                'statement_label' => 'Prompt',
                'have_description' => true,
                'description_label' => 'Guidance',
                'have_answer' => $collectAnswers,
                'is_single' => false,
                'objective_type_id' => null,
                'column_per_row' => 1,
            ],
            default => [
                'have_exercise' => false,
                'have_statement' => true,
                'statement_label' => 'Statement',
                'have_description' => false,
                'description_label' => null,
                'have_answer' => false,
                'is_single' => $isObjective ? $singleCorrect : false,
                'objective_type_id' => null,
                'column_per_row' => 1,
            ],
        };
    }

    public static function contentFromQuestion(Question $question, QuestionType $questionType): array
    {
        $schema = self::resolve($questionType->schema_key, $questionType->is_objective, [
            'objective_type_id' => $questionType->objective_type_id,
            'have_description' => $questionType->have_description,
            'have_answer' => $questionType->have_answer,
        ]);
        $schemaKey = $schema['key'];

        $base = self::emptyContent($schemaKey);
        $stored = is_array($question->content) ? $question->content : [];

        if ($stored !== []) {
            return array_replace_recursive($base, $stored);
        }

        return match ($schemaKey) {
            self::OBJECTIVE_MCQ,
            self::OBJECTIVE_BLANK_CHOICE => [
                'prompt_en' => $question->statement_en ?? '',
                'prompt_ur' => $question->statement_ur ?? '',
                'options' => $question->options
                    ->map(fn (QuestionOption $option) => [
                        'text_en' => $option->text_en ?? '',
                        'text_ur' => $option->text_ur ?? '',
                        'is_correct' => $option->is_correct,
                    ])
                    ->values()
                    ->all(),
            ],
            self::OBJECTIVE_TRUE_FALSE => [
                'prompt_en' => $question->statement_en ?? '',
                'prompt_ur' => $question->statement_ur ?? '',
                'correct_boolean' => $question->options->firstWhere('is_correct', true)?->text_en === 'False'
                    ? 'false'
                    : ($question->options->where('is_correct', true)->isNotEmpty() ? 'true' : ''),
            ],
            self::OBJECTIVE_BLANK_OPEN => [
                'prompt_en' => $question->statement_en ?? '',
                'prompt_ur' => $question->statement_ur ?? '',
                'answer_en' => $question->answer_en ?? '',
                'answer_ur' => $question->answer_ur ?? '',
            ],
            self::SUBJECTIVE_GROUPED => [
                'intro_en' => $question->statement_en ?? '',
                'intro_ur' => $question->statement_ur ?? '',
                'items' => [self::emptySubjectiveItem()],
            ],
            self::SUBJECTIVE_PAIRS => [
                'prompt_en' => $question->statement_en ?? '',
                'prompt_ur' => $question->statement_ur ?? '',
                'pairs' => [self::emptyPair()],
            ],
            default => [
                'prompt_en' => $question->statement_en ?? '',
                'prompt_ur' => $question->statement_ur ?? '',
                'guidance_en' => $question->description_en ?? '',
                'guidance_ur' => $question->description_ur ?? '',
                'answer_en' => $question->answer_en ?? '',
                'answer_ur' => $question->answer_ur ?? '',
            ],
        };
    }

    public static function buildQuestionPayload(
        QuestionType $questionType,
        array $content,
    ): array {
        $schema = self::resolve($questionType->schema_key, $questionType->is_objective, [
            'objective_type_id' => $questionType->objective_type_id,
            'have_description' => $questionType->have_description,
            'have_answer' => $questionType->have_answer,
        ]);
        $schemaKey = $schema['key'];
        $normalized = array_replace_recursive(self::emptyContent($schemaKey), $content);

        return match ($schemaKey) {
            self::OBJECTIVE_MCQ,
            self::OBJECTIVE_BLANK_CHOICE => [
                'content' => [
                    'prompt_en' => self::normalizeText($normalized['prompt_en'] ?? null),
                    'prompt_ur' => self::normalizeText($normalized['prompt_ur'] ?? null),
                    'options' => self::normalizeOptions($normalized['options'] ?? []),
                ],
                'statement_en' => self::normalizeText($normalized['prompt_en'] ?? null),
                'statement_ur' => self::normalizeText($normalized['prompt_ur'] ?? null),
                'description_en' => null,
                'description_ur' => null,
                'answer_en' => null,
                'answer_ur' => null,
                'options' => self::mapOptionsForStorage($normalized['options'] ?? []),
            ],
            self::OBJECTIVE_TRUE_FALSE => self::buildTrueFalsePayload($normalized),
            self::OBJECTIVE_BLANK_OPEN => [
                'content' => [
                    'prompt_en' => self::normalizeText($normalized['prompt_en'] ?? null),
                    'prompt_ur' => self::normalizeText($normalized['prompt_ur'] ?? null),
                    'answer_en' => self::normalizeText($normalized['answer_en'] ?? null),
                    'answer_ur' => self::normalizeText($normalized['answer_ur'] ?? null),
                ],
                'statement_en' => self::normalizeText($normalized['prompt_en'] ?? null),
                'statement_ur' => self::normalizeText($normalized['prompt_ur'] ?? null),
                'description_en' => null,
                'description_ur' => null,
                'answer_en' => self::normalizeText($normalized['answer_en'] ?? null),
                'answer_ur' => self::normalizeText($normalized['answer_ur'] ?? null),
                'options' => [],
            ],
            self::OBJECTIVE_PASSAGE_MCQ => [
                'content' => [
                    'passage_en' => self::normalizeText($normalized['passage_en'] ?? null),
                    'passage_ur' => self::normalizeText($normalized['passage_ur'] ?? null),
                    'items' => self::normalizeObjectiveItems($normalized['items'] ?? []),
                ],
                'statement_en' => self::normalizeText($normalized['passage_en'] ?? null),
                'statement_ur' => self::normalizeText($normalized['passage_ur'] ?? null),
                'description_en' => null,
                'description_ur' => null,
                'answer_en' => null,
                'answer_ur' => null,
                'options' => [],
            ],
            self::SUBJECTIVE_GROUPED => [
                'content' => [
                    'intro_en' => self::normalizeText($normalized['intro_en'] ?? null),
                    'intro_ur' => self::normalizeText($normalized['intro_ur'] ?? null),
                    'items' => self::normalizeSubjectiveItems($normalized['items'] ?? []),
                ],
                'statement_en' => self::normalizeText($normalized['intro_en'] ?? null),
                'statement_ur' => self::normalizeText($normalized['intro_ur'] ?? null),
                'description_en' => null,
                'description_ur' => null,
                'answer_en' => null,
                'answer_ur' => null,
                'options' => [],
            ],
            self::SUBJECTIVE_PAIRS => [
                'content' => [
                    'prompt_en' => self::normalizeText($normalized['prompt_en'] ?? null),
                    'prompt_ur' => self::normalizeText($normalized['prompt_ur'] ?? null),
                    'pairs' => self::normalizePairs($normalized['pairs'] ?? []),
                ],
                'statement_en' => self::normalizeText($normalized['prompt_en'] ?? null),
                'statement_ur' => self::normalizeText($normalized['prompt_ur'] ?? null),
                'description_en' => null,
                'description_ur' => null,
                'answer_en' => null,
                'answer_ur' => null,
                'options' => [],
            ],
            default => [
                'content' => [
                    'prompt_en' => self::normalizeText($normalized['prompt_en'] ?? null),
                    'prompt_ur' => self::normalizeText($normalized['prompt_ur'] ?? null),
                    'guidance_en' => self::normalizeText($normalized['guidance_en'] ?? null),
                    'guidance_ur' => self::normalizeText($normalized['guidance_ur'] ?? null),
                    'answer_en' => self::normalizeText($normalized['answer_en'] ?? null),
                    'answer_ur' => self::normalizeText($normalized['answer_ur'] ?? null),
                ],
                'statement_en' => self::normalizeText($normalized['prompt_en'] ?? null),
                'statement_ur' => self::normalizeText($normalized['prompt_ur'] ?? null),
                'description_en' => self::normalizeText($normalized['guidance_en'] ?? null),
                'description_ur' => self::normalizeText($normalized['guidance_ur'] ?? null),
                'answer_en' => $questionType->have_answer
                    ? self::normalizeText($normalized['answer_en'] ?? null)
                    : null,
                'answer_ur' => $questionType->have_answer
                    ? self::normalizeText($normalized['answer_ur'] ?? null)
                    : null,
                'options' => [],
            ],
        };
    }

    public static function validateQuestionContent(
        QuestionType $questionType,
        array $content,
        Validator $validator,
    ): void {
        $schema = self::resolve($questionType->schema_key, $questionType->is_objective, [
            'objective_type_id' => $questionType->objective_type_id,
            'have_description' => $questionType->have_description,
            'have_answer' => $questionType->have_answer,
        ]);

        match ($schema['key']) {
            self::OBJECTIVE_MCQ,
            self::OBJECTIVE_BLANK_CHOICE => self::validateChoiceQuestion(
                $content,
                $validator,
                $questionType->is_single,
            ),
            self::OBJECTIVE_TRUE_FALSE => self::validateTrueFalseQuestion(
                $content,
                $validator,
            ),
            self::OBJECTIVE_BLANK_OPEN => self::validateOpenBlankQuestion(
                $content,
                $validator,
            ),
            self::OBJECTIVE_PASSAGE_MCQ => self::validatePassageQuestion(
                $content,
                $validator,
                $questionType->is_single,
            ),
            self::SUBJECTIVE_GROUPED => self::validateGroupedSubjectiveQuestion(
                $content,
                $validator,
                $questionType->have_answer,
            ),
            self::SUBJECTIVE_PAIRS => self::validatePairsQuestion(
                $content,
                $validator,
            ),
            default => self::validateStandardSubjectiveQuestion(
                $content,
                $validator,
                $questionType->have_answer,
            ),
        };
    }

    public static function summarize(QuestionType $questionType, array $content): string
    {
        $schema = self::resolve($questionType->schema_key, $questionType->is_objective, [
            'objective_type_id' => $questionType->objective_type_id,
            'have_description' => $questionType->have_description,
            'have_answer' => $questionType->have_answer,
        ]);

        return match ($schema['key']) {
            self::OBJECTIVE_PASSAGE_MCQ => self::firstFilled(
                $content['passage_en'] ?? null,
                $content['passage_ur'] ?? null,
                Arr::get($content, 'items.0.prompt_en'),
                Arr::get($content, 'items.0.prompt_ur'),
            ) ?? 'Passage question',
            self::SUBJECTIVE_GROUPED => self::firstFilled(
                $content['intro_en'] ?? null,
                $content['intro_ur'] ?? null,
                Arr::get($content, 'items.0.prompt_en'),
                Arr::get($content, 'items.0.prompt_ur'),
            ) ?? 'Grouped question',
            self::SUBJECTIVE_PAIRS => self::firstFilled(
                $content['prompt_en'] ?? null,
                $content['prompt_ur'] ?? null,
                Arr::get($content, 'pairs.0.left_en'),
                Arr::get($content, 'pairs.0.left_ur'),
            ) ?? 'Pair question',
            default => self::firstFilled(
                $content['prompt_en'] ?? null,
                $content['prompt_ur'] ?? null,
                $content['guidance_en'] ?? null,
                $content['guidance_ur'] ?? null,
                $content['answer_en'] ?? null,
                $content['answer_ur'] ?? null,
            ) ?? 'Question',
        };
    }

    public static function metrics(QuestionType $questionType, array $content, iterable $fallbackOptions = []): array
    {
        $schema = self::resolve($questionType->schema_key, $questionType->is_objective, [
            'objective_type_id' => $questionType->objective_type_id,
            'have_description' => $questionType->have_description,
            'have_answer' => $questionType->have_answer,
        ]);

        return match ($schema['key']) {
            self::OBJECTIVE_PASSAGE_MCQ => [
                'options_count' => collect($content['items'] ?? [])
                    ->sum(fn ($item) => count($item['options'] ?? [])),
                'correct_options_count' => collect($content['items'] ?? [])
                    ->sum(fn ($item) => collect($item['options'] ?? [])
                        ->where('is_correct', true)
                        ->count()),
                'items_count' => count($content['items'] ?? []),
            ],
            self::OBJECTIVE_TRUE_FALSE => [
                'options_count' => 2,
                'correct_options_count' => ($content['correct_boolean'] ?? '') === '' ? 0 : 1,
                'items_count' => 1,
            ],
            self::OBJECTIVE_MCQ,
            self::OBJECTIVE_BLANK_CHOICE => [
                'options_count' => count($content['options'] ?? []),
                'correct_options_count' => collect($content['options'] ?? [])
                    ->where('is_correct', true)
                    ->count(),
                'items_count' => 1,
            ],
            self::SUBJECTIVE_GROUPED => [
                'options_count' => 0,
                'correct_options_count' => 0,
                'items_count' => count($content['items'] ?? []),
            ],
            self::SUBJECTIVE_PAIRS => [
                'options_count' => 0,
                'correct_options_count' => 0,
                'items_count' => count($content['pairs'] ?? []),
            ],
            default => [
                'options_count' => is_iterable($fallbackOptions) ? count(is_array($fallbackOptions) ? $fallbackOptions : iterator_to_array($fallbackOptions)) : 0,
                'correct_options_count' => 0,
                'items_count' => 1,
            ],
        };
    }

    public static function supportsSimpleImport(QuestionType $questionType): bool
    {
        $schema = self::resolve($questionType->schema_key, $questionType->is_objective, [
            'objective_type_id' => $questionType->objective_type_id,
            'have_description' => $questionType->have_description,
            'have_answer' => $questionType->have_answer,
        ]);

        return in_array($schema['key'], [
            self::OBJECTIVE_MCQ,
            self::OBJECTIVE_TRUE_FALSE,
            self::OBJECTIVE_BLANK_CHOICE,
            self::OBJECTIVE_BLANK_OPEN,
            self::SUBJECTIVE_STANDARD,
        ], true);
    }

    private static function buildTrueFalsePayload(array $content): array
    {
        $correct = match ($content['correct_boolean'] ?? '') {
            'true' => 'True',
            'false' => 'False',
            default => null,
        };

        return [
            'content' => [
                'prompt_en' => self::normalizeText($content['prompt_en'] ?? null),
                'prompt_ur' => self::normalizeText($content['prompt_ur'] ?? null),
                'correct_boolean' => $content['correct_boolean'] ?? '',
            ],
            'statement_en' => self::normalizeText($content['prompt_en'] ?? null),
            'statement_ur' => self::normalizeText($content['prompt_ur'] ?? null),
            'description_en' => null,
            'description_ur' => null,
            'answer_en' => $correct,
            'answer_ur' => null,
            'options' => [
                [
                    'text_en' => 'True',
                    'text_ur' => null,
                    'is_correct' => $correct === 'True',
                    'sort_order' => 1,
                ],
                [
                    'text_en' => 'False',
                    'text_ur' => null,
                    'is_correct' => $correct === 'False',
                    'sort_order' => 2,
                ],
            ],
        ];
    }

    private static function validateChoiceQuestion(
        array $content,
        Validator $validator,
        bool $singleCorrect,
    ): void {
        if (! self::hasLocalizedValue($content, 'prompt')) {
            $validator->errors()->add('content.prompt_en', 'Question statement is required.');
        }

        $options = self::normalizeOptions($content['options'] ?? []);
        $usableOptions = array_values(array_filter($options, fn (array $option) => self::firstFilled(
            $option['text_en'] ?? null,
            $option['text_ur'] ?? null,
        ) !== null));

        if (count($usableOptions) < 2) {
            $validator->errors()->add('content.options', 'At least two options are required.');

            return;
        }

        $correctCount = collect($usableOptions)->where('is_correct', true)->count();

        if ($correctCount < 1) {
            $validator->errors()->add('content.options', 'Select at least one correct option.');
        }

        if ($singleCorrect && $correctCount !== 1) {
            $validator->errors()->add('content.options', 'This question type requires exactly one correct option.');
        }
    }

    private static function validateTrueFalseQuestion(
        array $content,
        Validator $validator,
    ): void {
        if (! self::hasLocalizedValue($content, 'prompt')) {
            $validator->errors()->add('content.prompt_en', 'Question statement is required.');
        }

        if (! in_array($content['correct_boolean'] ?? '', ['true', 'false'], true)) {
            $validator->errors()->add('content.correct_boolean', 'Choose whether the statement is true or false.');
        }
    }

    private static function validateOpenBlankQuestion(
        array $content,
        Validator $validator,
    ): void {
        if (! self::hasLocalizedValue($content, 'prompt')) {
            $validator->errors()->add('content.prompt_en', 'Question statement is required.');
        }

        if (! self::hasLocalizedValue($content, 'answer')) {
            $validator->errors()->add('content.answer_en', 'Answer is required for this question type.');
        }
    }

    private static function validatePassageQuestion(
        array $content,
        Validator $validator,
        bool $singleCorrect,
    ): void {
        if (! self::hasLocalizedValue($content, 'passage')) {
            $validator->errors()->add('content.passage_en', 'Passage is required.');
        }

        $items = self::normalizeObjectiveItems($content['items'] ?? []);

        if ($items === []) {
            $validator->errors()->add('content.items', 'Add at least one passage question.');

            return;
        }

        foreach ($items as $index => $item) {
            if (! self::firstFilled($item['prompt_en'] ?? null, $item['prompt_ur'] ?? null)) {
                $validator->errors()->add("content.items.{$index}.prompt_en", 'Each passage question needs a statement.');
            }

            $usableOptions = array_values(array_filter(
                $item['options'] ?? [],
                fn (array $option) => self::firstFilled(
                    $option['text_en'] ?? null,
                    $option['text_ur'] ?? null,
                ) !== null,
            ));

            if (count($usableOptions) < 2) {
                $validator->errors()->add("content.items.{$index}.options", 'Each passage question requires at least two options.');

                continue;
            }

            $correctCount = collect($usableOptions)->where('is_correct', true)->count();

            if ($correctCount < 1) {
                $validator->errors()->add("content.items.{$index}.options", 'Select at least one correct option for each passage question.');
            }

            if ($singleCorrect && $correctCount !== 1) {
                $validator->errors()->add("content.items.{$index}.options", 'Each passage question requires exactly one correct option.');
            }
        }
    }

    private static function validateStandardSubjectiveQuestion(
        array $content,
        Validator $validator,
        bool $collectAnswers,
    ): void {
        if (! self::hasLocalizedValue($content, 'prompt')) {
            $validator->errors()->add('content.prompt_en', 'Prompt is required.');
        }

        if ($collectAnswers && ! self::hasLocalizedValue($content, 'answer')) {
            $validator->errors()->add('content.answer_en', 'Answer is required for this question type.');
        }
    }

    private static function validateGroupedSubjectiveQuestion(
        array $content,
        Validator $validator,
        bool $collectAnswers,
    ): void {
        $items = self::normalizeSubjectiveItems($content['items'] ?? []);

        if ($items === []) {
            $validator->errors()->add('content.items', 'Add at least one grouped question item.');

            return;
        }

        foreach ($items as $index => $item) {
            if (! self::firstFilled($item['prompt_en'] ?? null, $item['prompt_ur'] ?? null)) {
                $validator->errors()->add("content.items.{$index}.prompt_en", 'Each grouped item needs a prompt.');
            }

            if ($collectAnswers && ! self::firstFilled($item['answer_en'] ?? null, $item['answer_ur'] ?? null)) {
                $validator->errors()->add("content.items.{$index}.answer_en", 'Each grouped item needs an answer.');
            }
        }
    }

    private static function validatePairsQuestion(
        array $content,
        Validator $validator,
    ): void {
        $pairs = self::normalizePairs($content['pairs'] ?? []);

        if ($pairs === []) {
            $validator->errors()->add('content.pairs', 'Add at least one pair.');

            return;
        }

        foreach ($pairs as $index => $pair) {
            if (! self::firstFilled($pair['left_en'] ?? null, $pair['left_ur'] ?? null)) {
                $validator->errors()->add("content.pairs.{$index}.left_en", 'Left side is required.');
            }

            if (! self::firstFilled($pair['right_en'] ?? null, $pair['right_ur'] ?? null)) {
                $validator->errors()->add("content.pairs.{$index}.right_en", 'Right side is required.');
            }
        }
    }

    private static function normalizeOptions(array $options): array
    {
        return array_values(array_map(fn (array $option) => [
            'text_en' => self::normalizeText($option['text_en'] ?? null),
            'text_ur' => self::normalizeText($option['text_ur'] ?? null),
            'is_correct' => (bool) ($option['is_correct'] ?? false),
        ], $options));
    }

    private static function mapOptionsForStorage(array $options): array
    {
        return array_values(array_map(
            fn (array $option, int $index) => [
                'text_en' => self::normalizeText($option['text_en'] ?? null),
                'text_ur' => self::normalizeText($option['text_ur'] ?? null),
                'is_correct' => (bool) ($option['is_correct'] ?? false),
                'sort_order' => $index + 1,
            ],
            self::normalizeOptions($options),
            array_keys(self::normalizeOptions($options)),
        ));
    }

    private static function normalizeObjectiveItems(array $items): array
    {
        return array_values(array_map(fn (array $item) => [
            'prompt_en' => self::normalizeText($item['prompt_en'] ?? null),
            'prompt_ur' => self::normalizeText($item['prompt_ur'] ?? null),
            'options' => self::normalizeOptions($item['options'] ?? []),
        ], $items));
    }

    private static function normalizeSubjectiveItems(array $items): array
    {
        return array_values(array_map(fn (array $item) => [
            'prompt_en' => self::normalizeText($item['prompt_en'] ?? null),
            'prompt_ur' => self::normalizeText($item['prompt_ur'] ?? null),
            'answer_en' => self::normalizeText($item['answer_en'] ?? null),
            'answer_ur' => self::normalizeText($item['answer_ur'] ?? null),
        ], $items));
    }

    private static function normalizePairs(array $pairs): array
    {
        return array_values(array_map(fn (array $pair) => [
            'left_en' => self::normalizeText($pair['left_en'] ?? null),
            'left_ur' => self::normalizeText($pair['left_ur'] ?? null),
            'right_en' => self::normalizeText($pair['right_en'] ?? null),
            'right_ur' => self::normalizeText($pair['right_ur'] ?? null),
        ], $pairs));
    }

    private static function defaultOptions(): array
    {
        return array_fill(0, 4, [
            'text_en' => '',
            'text_ur' => '',
            'is_correct' => false,
        ]);
    }

    private static function emptyObjectiveItem(): array
    {
        return [
            'prompt_en' => '',
            'prompt_ur' => '',
            'options' => self::defaultOptions(),
        ];
    }

    private static function emptySubjectiveItem(): array
    {
        return [
            'prompt_en' => '',
            'prompt_ur' => '',
            'answer_en' => '',
            'answer_ur' => '',
        ];
    }

    private static function emptyPair(): array
    {
        return [
            'left_en' => '',
            'left_ur' => '',
            'right_en' => '',
            'right_ur' => '',
        ];
    }

    private static function hasLocalizedValue(array $content, string $prefix): bool
    {
        return self::firstFilled(
            $content["{$prefix}_en"] ?? null,
            $content["{$prefix}_ur"] ?? null,
        ) !== null;
    }

    private static function firstFilled(?string ...$values): ?string
    {
        foreach ($values as $value) {
            $normalized = self::normalizeText($value);

            if ($normalized !== null) {
                return $normalized;
            }
        }

        return null;
    }

    private static function normalizeText(mixed $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }
}

<?php

namespace App\Support\LegacyTransfer;

use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Topic;
use App\Support\Questions\QuestionTypeSchemaRegistry;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class LegacyContentTransferService
{
    private const SOURCE_CONNECTION = 'legacy_mysql';

    private const SOURCE_PATTERNS = [
        'short_syllabus' => [
            'key' => 'short_syllabus',
            'label' => 'AFAQ / short_syllabus',
            'afaq' => 3,
        ],
    ];

    private array $questionTypeMap = [];

    public function sourcePatterns(): array
    {
        return array_values(self::SOURCE_PATTERNS);
    }

    public function sourceClasses(string $sourcePattern): array
    {
        $afaq = $this->sourceAfaq($sourcePattern);

        return $this->source()
            ->table('pk_class as class')
            ->join('pk_chapter as chapter', 'chapter.class_id', '=', 'class.id')
            ->where('chapter.afaq', $afaq)
            ->selectRaw('class.id, class.name, count(distinct chapter.subject_id) as subjects_count, count(distinct chapter.id) as chapters_count')
            ->groupBy('class.id', 'class.name')
            ->orderBy('class.id_order')
            ->orderBy('class.name')
            ->get()
            ->map(fn (object $class) => [
                'id' => (int) $class->id,
                'name' => (string) $class->name,
                'subjects_count' => (int) $class->subjects_count,
                'chapters_count' => (int) $class->chapters_count,
            ])
            ->all();
    }

    public function sourceSubjects(string $sourcePattern, int $sourceClassId): array
    {
        $afaq = $this->sourceAfaq($sourcePattern);

        return $this->source()
            ->table('pk_subject as subject')
            ->join('pk_chapter as chapter', function ($join) use ($sourceClassId, $afaq): void {
                $join->on('chapter.subject_id', '=', 'subject.id')
                    ->where('chapter.class_id', '=', $sourceClassId)
                    ->where('chapter.afaq', '=', $afaq);
            })
            ->leftJoin('pk_topics as topic', 'topic.chapter_id', '=', 'chapter.id')
            ->leftJoin('pk_question as question', function ($join) use ($afaq): void {
                $join->on('question.chapter_id', '=', 'chapter.id')
                    ->where('question.afaq', '=', $afaq);
            })
            ->where('subject.afaq', $afaq)
            ->selectRaw('subject.id, subject.name, subject.status_punjab, subject.status_smart, count(distinct chapter.id) as chapters_count, count(distinct topic.id) as topics_count, count(distinct question.id) as questions_count')
            ->groupBy('subject.id', 'subject.name', 'subject.status_punjab', 'subject.status_smart')
            ->orderBy('subject.name')
            ->get()
            ->map(fn (object $subject) => [
                'id' => (int) $subject->id,
                'name' => (string) $subject->name,
                'status' => (int) ($subject->status_punjab ?: $subject->status_smart ?: 1),
                'chapters_count' => (int) $subject->chapters_count,
                'topics_count' => (int) $subject->topics_count,
                'questions_count' => (int) $subject->questions_count,
                'subject_type' => ((int) $subject->topics_count) > 0 ? 'topic-wise' : 'chapter-wise',
            ])
            ->all();
    }

    public function sourceChapters(string $sourcePattern, int $sourceClassId, int $sourceSubjectId): array
    {
        $afaq = $this->sourceAfaq($sourcePattern);

        $chapters = $this->source()
            ->table('pk_chapter as chapter')
            ->leftJoin('pk_question as question', function ($join) use ($afaq): void {
                $join->on('question.chapter_id', '=', 'chapter.id')
                    ->where('question.afaq', '=', $afaq);
            })
            ->where('chapter.class_id', $sourceClassId)
            ->where('chapter.subject_id', $sourceSubjectId)
            ->where('chapter.afaq', $afaq)
            ->selectRaw('chapter.id, chapter.name, chapter.u_name, chapter.chapter_number, chapter.chapter_type, chapter.sort_int, count(distinct question.id) as questions_count')
            ->groupBy('chapter.id', 'chapter.name', 'chapter.u_name', 'chapter.chapter_number', 'chapter.chapter_type', 'chapter.sort_int')
            ->orderBy('chapter.chapter_number')
            ->orderBy('chapter.sort_int')
            ->orderBy('chapter.id')
            ->get();

        if ($chapters->isEmpty()) {
            return [];
        }

        $chapterIds = $chapters->pluck('id')->map(fn ($id) => (int) $id)->all();
        $topics = $this->source()
            ->table('pk_topics as topic')
            ->leftJoin('pk_question as question', function ($join) use ($afaq): void {
                $join->on('question.topic_id', '=', 'topic.id')
                    ->where('question.afaq', '=', $afaq);
            })
            ->whereIn('topic.chapter_id', $chapterIds)
            ->selectRaw('topic.id, topic.chapter_id, topic.name, topic.u_name, topic.sort_int, count(distinct question.id) as questions_count')
            ->groupBy('topic.id', 'topic.chapter_id', 'topic.name', 'topic.u_name', 'topic.sort_int')
            ->orderBy('topic.sort_int')
            ->orderBy('topic.id')
            ->get()
            ->groupBy('chapter_id');

        return $chapters
            ->map(fn (object $chapter) => [
                'id' => (int) $chapter->id,
                'name' => $this->displayName($chapter->name, $chapter->u_name, "Chapter {$chapter->id}"),
                'name_eng' => $this->nullableString($chapter->name),
                'name_ur' => $this->nullableString($chapter->u_name),
                'chapter_number' => $this->nullableInt($chapter->chapter_number),
                'chapter_type' => $this->nullableString($chapter->chapter_type),
                'questions_count' => (int) $chapter->questions_count,
                'topics' => ($topics->get($chapter->id) ?? collect())
                    ->map(fn (object $topic) => [
                        'id' => (int) $topic->id,
                        'chapter_id' => (int) $topic->chapter_id,
                        'name' => $this->displayName($topic->name, $topic->u_name, "Topic {$topic->id}"),
                        'name_eng' => $this->nullableString($topic->name),
                        'name_ur' => $this->nullableString($topic->u_name),
                        'questions_count' => (int) $topic->questions_count,
                    ])
                    ->values()
                    ->all(),
            ])
            ->values()
            ->all();
    }

    public function targetCatalog(): array
    {
        return [
            'patterns' => $this->targetPatterns(),
            'classes' => SchoolClass::query()
                ->orderBy('name')
                ->get(['id', 'name', 'status'])
                ->map(fn (SchoolClass $class) => $this->targetClassPayload($class))
                ->values()
                ->all(),
            'subjects' => Subject::query()
                ->orderBy('name_eng')
                ->get(['id', 'name_eng', 'name_ur', 'subject_type', 'status'])
                ->map(fn (Subject $subject) => $this->targetSubjectPayload($subject))
                ->values()
                ->all(),
        ];
    }

    public function targetPatterns(): array
    {
        return Pattern::query()
            ->orderBy('name')
            ->get(['id', 'name', 'short_name', 'status'])
            ->map(fn (Pattern $pattern) => [
                'id' => $pattern->id,
                'name' => $pattern->name,
                'short_name' => $pattern->short_name,
                'status' => $pattern->status,
            ])
            ->values()
            ->all();
    }

    public function targetClasses(?int $targetPatternId): array
    {
        if (! $targetPatternId) {
            return [];
        }

        $pattern = Pattern::query()->find($targetPatternId);

        if (! $pattern) {
            return [];
        }

        return $pattern->classes()
            ->orderBy('classes.name')
            ->get(['classes.id', 'classes.name', 'classes.status'])
            ->map(fn (SchoolClass $class) => $this->targetClassPayload($class))
            ->values()
            ->all();
    }

    public function targetSubjects(?int $targetPatternId, ?int $targetClassId): array
    {
        if (! $targetPatternId || ! $targetClassId) {
            return [];
        }

        return Subject::query()
            ->join('class_subjects', 'class_subjects.subject_id', '=', 'subjects.id')
            ->where('class_subjects.pattern_id', $targetPatternId)
            ->where('class_subjects.class_id', $targetClassId)
            ->orderBy('subjects.name_eng')
            ->get(['subjects.id', 'subjects.name_eng', 'subjects.name_ur', 'subjects.subject_type', 'subjects.status'])
            ->map(fn (Subject $subject) => $this->targetSubjectPayload($subject))
            ->values()
            ->all();
    }

    public function transfer(array $options, ?int $creatorId): array
    {
        $sourcePattern = (string) $options['source_pattern'];
        $sourceClassId = (int) $options['source_class_id'];
        $sourceSubjectIds = isset($options['source_subject_id'])
            ? [(int) $options['source_subject_id']]
            : array_values(array_unique(array_map('intval', $options['source_subject_ids'] ?? [])));
        $sourceChapterIds = array_values(array_unique(array_map('intval', $options['source_chapter_ids'] ?? [])));
        $sourceTopicIds = array_values(array_unique(array_map('intval', $options['source_topic_ids'] ?? [])));
        $replaceExisting = (bool) ($options['replace_existing'] ?? false);
        $afaq = $this->sourceAfaq($sourcePattern);
        $sourceClass = $this->source()->table('pk_class')->where('id', $sourceClassId)->first();

        if (! $sourceClass) {
            throw new RuntimeException("Source class {$sourceClassId} was not found.");
        }

        if ($sourceSubjectIds === []) {
            throw new RuntimeException('Select at least one source subject.');
        }

        if (isset($options['source_subject_id']) && $sourceChapterIds === [] && $sourceTopicIds === []) {
            throw new RuntimeException('Select at least one source chapter or topic.');
        }

        $sourceSubjects = $this->source()
            ->table('pk_subject')
            ->whereIn('id', $sourceSubjectIds)
            ->where('afaq', $afaq)
            ->get()
            ->keyBy('id');

        $missingSubjects = array_diff($sourceSubjectIds, $sourceSubjects->keys()->map(fn ($id) => (int) $id)->all());
        if ($missingSubjects !== []) {
            throw new RuntimeException('Missing source subjects: '.implode(', ', $missingSubjects));
        }

        $this->questionTypeMap = [];

        return DB::transaction(function () use (
            $afaq,
            $creatorId,
            $options,
            $replaceExisting,
            $sourceClass,
            $sourceClassId,
            $sourceChapterIds,
            $sourceSubjectIds,
            $sourceSubjects,
            $sourceTopicIds
        ): array {
            $pattern = $this->resolveTargetPattern($options, $creatorId);
            $class = $this->resolveTargetClass($options, $sourceClass, $creatorId);
            $class->patterns()->syncWithoutDetaching([$pattern->id]);

            $report = [
                'pattern' => ['id' => $pattern->id, 'name' => $pattern->name, 'short_name' => $pattern->short_name],
                'class' => ['id' => $class->id, 'name' => $class->name],
                'subjects' => [],
                'totals' => [
                    'subjects' => 0,
                    'chapters' => 0,
                    'topics' => 0,
                    'questions' => 0,
                    'options' => 0,
                    'question_types' => 0,
                ],
            ];

            foreach ($sourceSubjectIds as $sourceSubjectId) {
                $sourceSubject = $sourceSubjects->get($sourceSubjectId);
                $subjectType = $this->sourceSubjectType($sourceClassId, $sourceSubjectId);
                $subject = $this->resolveTargetSubject($sourceSubject, $subjectType, $options, $creatorId);

                ClassSubject::query()->firstOrCreate([
                    'class_id' => $class->id,
                    'pattern_id' => $pattern->id,
                    'subject_id' => $subject->id,
                ]);

                if ($replaceExisting) {
                    Chapter::query()
                        ->where('class_id', $class->id)
                        ->where('pattern_id', $pattern->id)
                        ->where('subject_id', $subject->id)
                        ->delete();
                }

                $subjectReport = $this->transferSubject(
                    afaq: $afaq,
                    creatorId: $creatorId,
                    sourceClassId: $sourceClassId,
                    sourceSubjectId: $sourceSubjectId,
                    sourceChapterIds: $sourceChapterIds,
                    sourceTopicIds: $sourceTopicIds,
                    targetClass: $class,
                    targetPattern: $pattern,
                    targetSubject: $subject,
                );

                $report['subjects'][] = [
                    'id' => $subject->id,
                    'name' => $subject->name_eng,
                    ...$subjectReport,
                ];

                $report['totals']['subjects']++;
                foreach (['chapters', 'topics', 'questions', 'options', 'question_types'] as $key) {
                    $report['totals'][$key] += $subjectReport[$key];
                }
            }

            return $report;
        });
    }

    private function transferSubject(
        int $afaq,
        ?int $creatorId,
        int $sourceClassId,
        int $sourceSubjectId,
        array $sourceChapterIds,
        array $sourceTopicIds,
        SchoolClass $targetClass,
        Pattern $targetPattern,
        Subject $targetSubject,
    ): array {
        $topicMap = [];
        $usedChapterNumbers = [];
        $counts = [
            'chapters' => 0,
            'topics' => 0,
            'questions' => 0,
            'options' => 0,
            'question_types' => 0,
        ];

        $sourceChapters = $this->source()
            ->table('pk_chapter')
            ->where('class_id', $sourceClassId)
            ->where('subject_id', $sourceSubjectId)
            ->where('afaq', $afaq)
            ->when($sourceChapterIds !== [], fn ($query) => $query->whereIn('id', $sourceChapterIds))
            ->orderBy('chapter_number')
            ->orderBy('sort_int')
            ->orderBy('id')
            ->get();

        if ($sourceChapters->isEmpty()) {
            throw new RuntimeException('No source chapters matched the selected filters.');
        }

        foreach ($sourceChapters as $sourceChapter) {
            $chapterNumber = $this->nullableInt($sourceChapter->chapter_number);

            if ($chapterNumber !== null) {
                if (isset($usedChapterNumbers[$chapterNumber])) {
                    $chapterNumber = null;
                } else {
                    $usedChapterNumbers[$chapterNumber] = true;
                }
            }

            $chapterAttributes = [
                'name' => $this->limitedString($sourceChapter->name, 150) ?? "Chapter {$sourceChapter->chapter_number}",
                'name_ur' => $this->limitedString($sourceChapter->u_name, 150),
                'chapter_number' => $chapterNumber,
                'group_name' => $this->nullableString($sourceChapter->chapter_type),
                'group_heading' => null,
                'sort_id' => (int) ($sourceChapter->sort_int ?? 0),
                'status' => (int) ($sourceChapter->status ?? 1),
                'created_by' => $creatorId,
            ];

            $chapter = $this->resolveTargetChapter(
                targetClass: $targetClass,
                targetPattern: $targetPattern,
                targetSubject: $targetSubject,
                attributes: $chapterAttributes,
            );

            $counts['chapters']++;

            $sourceTopics = $this->source()
                ->table('pk_topics')
                ->where('chapter_id', $sourceChapter->id)
                ->when($sourceTopicIds !== [], fn ($query) => $query->whereIn('id', $sourceTopicIds))
                ->orderBy('sort_int')
                ->orderBy('id')
                ->get();

            $chapterTopicIds = [];
            foreach ($sourceTopics as $sourceTopic) {
                $topic = Topic::query()->updateOrCreate([
                    'chapter_id' => $chapter->id,
                    'name' => $this->limitedString($sourceTopic->name, 150) ?? "Topic {$sourceTopic->id}",
                ], [
                    'name_ur' => $this->limitedString($sourceTopic->u_name, 150),
                    'sort_id' => (int) ($sourceTopic->sort_int ?? 0),
                    'status' => (int) ($sourceTopic->status ?? 1),
                    'created_by' => $creatorId,
                ]);

                $topicMap[(int) $sourceTopic->id] = $topic->id;
                $chapterTopicIds[] = $topic->id;
                $counts['topics']++;
            }

            if ($chapterTopicIds !== []) {
                Question::query()
                    ->whereIn('topic_id', $chapterTopicIds)
                    ->delete();
            } else {
                Question::query()
                    ->where('chapter_id', $chapter->id)
                    ->whereNull('topic_id')
                    ->delete();
            }

            $sourceQuestions = $this->source()
                ->table('pk_question')
                ->where('chapter_id', $sourceChapter->id)
                ->where('afaq', $afaq)
                ->when($sourceTopicIds !== [], fn ($query) => $query->whereIn('topic_id', $sourceTopicIds))
                ->when($sourceTopicIds === [] && $sourceTopics->isNotEmpty(), fn ($query) => $query->whereIn('topic_id', $sourceTopics->pluck('id')->all()))
                ->orderBy('id')
                ->get();

            foreach ($sourceQuestions as $sourceQuestion) {
                $sourceOptions = $this->source()
                    ->table('pk_options')
                    ->where('question_id', $sourceQuestion->id)
                    ->orderBy('id')
                    ->get();
                $sourceTypeKey = (string) $sourceQuestion->type_id;
                $knownTypeCount = count($this->questionTypeMap);
                $questionType = $this->resolveQuestionType($sourceQuestion, $sourceOptions->isNotEmpty(), $creatorId);
                if (count($this->questionTypeMap) > $knownTypeCount) {
                    $counts['question_types']++;
                }

                [$payload, $options] = $this->buildQuestionPayload(
                    sourceQuestion: $sourceQuestion,
                    sourceOptions: $sourceOptions->all(),
                    questionType: $questionType,
                    targetChapterId: $chapter->id,
                    targetTopicId: $topicMap[(int) $sourceQuestion->topic_id] ?? null,
                    creatorId: $creatorId,
                );

                $question = Question::query()->create($payload);

                if ($options !== []) {
                    $question->options()->createMany($options);
                }

                $counts['questions']++;
                $counts['options'] += count($options);
            }
        }

        return $counts;
    }

    private function buildQuestionPayload(
        object $sourceQuestion,
        array $sourceOptions,
        QuestionType $questionType,
        int $targetChapterId,
        ?int $targetTopicId,
        ?int $creatorId,
    ): array {
        $schema = QuestionTypeSchemaRegistry::resolve(
            $questionType->schema_key,
            $questionType->is_objective,
            [
                'objective_type_id' => $questionType->objective_type_id,
                'have_description' => $questionType->have_description,
                'have_answer' => $questionType->have_answer,
            ],
        );
        $content = $this->legacyQuestionContent($schema['key'], $sourceQuestion, $sourceOptions);
        $questionPayload = QuestionTypeSchemaRegistry::buildQuestionPayload($questionType, $content);

        return [[
            'question_type_id' => $questionType->id,
            'chapter_id' => $targetChapterId,
            'topic_id' => $targetTopicId,
            'statement_en' => $questionPayload['statement_en'],
            'statement_ur' => $questionPayload['statement_ur'],
            'description_en' => $questionPayload['description_en'],
            'description_ur' => $questionPayload['description_ur'],
            'answer_en' => $questionPayload['answer_en'],
            'answer_ur' => $questionPayload['answer_ur'],
            'content' => $questionPayload['content'],
            'source' => $this->resolveQuestionSource($sourceQuestion),
            'difficulty' => null,
            'status' => (int) ($sourceQuestion->status ?? 1),
            'created_by' => $creatorId,
        ], $questionPayload['options']];
    }

    private function legacyQuestionContent(string $schemaKey, object $question, array $sourceOptions): array
    {
        $statementEn = $this->nullableString($question->statement_en);
        $statementUr = $this->nullableString($question->statement_ur);
        $descriptionEn = $this->nullableString($question->description_en);
        $descriptionUr = $this->nullableString($question->description_ur);
        $answerEn = $this->nullableString($question->answer_en);
        $answerUr = $this->nullableString($question->answer_ur);
        $paragraph = $this->nullableString($question->paragraph_questions);
        $options = $this->legacyOptions($sourceOptions);

        return match ($schemaKey) {
            QuestionTypeSchemaRegistry::OBJECTIVE_MCQ,
            QuestionTypeSchemaRegistry::OBJECTIVE_BLANK_CHOICE => [
                'prompt_en' => $statementEn ?? '',
                'prompt_ur' => $statementUr ?? '',
                'options' => $options,
            ],
            QuestionTypeSchemaRegistry::OBJECTIVE_TRUE_FALSE => [
                'prompt_en' => $statementEn ?? '',
                'prompt_ur' => $statementUr ?? '',
                'correct_boolean' => $this->trueFalseAnswer($answerEn, $answerUr, $options) ?? '',
            ],
            QuestionTypeSchemaRegistry::OBJECTIVE_BLANK_OPEN => [
                'prompt_en' => $statementEn ?? '',
                'prompt_ur' => $statementUr ?? '',
                'answer_en' => $answerEn ?? '',
                'answer_ur' => $answerUr ?? '',
            ],
            QuestionTypeSchemaRegistry::OBJECTIVE_PASSAGE_MCQ => [
                'passage_en' => $paragraph ?? $descriptionEn ?? $statementEn ?? '',
                'passage_ur' => $descriptionUr ?? $statementUr ?? '',
                'items' => [[
                    'prompt_en' => $statementEn ?? '',
                    'prompt_ur' => $statementUr ?? '',
                    'options' => $options,
                ]],
            ],
            QuestionTypeSchemaRegistry::SUBJECTIVE_GROUPED => [
                'intro_en' => $descriptionEn ?? '',
                'intro_ur' => $descriptionUr ?? '',
                'items' => [[
                    'prompt_en' => $statementEn ?? '',
                    'prompt_ur' => $statementUr ?? '',
                    'answer_en' => $answerEn ?? '',
                    'answer_ur' => $answerUr ?? '',
                ]],
            ],
            QuestionTypeSchemaRegistry::SUBJECTIVE_PAIRS => [
                'prompt_en' => $statementEn ?? '',
                'prompt_ur' => $statementUr ?? '',
                'pairs' => [[
                    'left_en' => $statementEn ?? '',
                    'left_ur' => $statementUr ?? '',
                    'right_en' => $answerEn ?? '',
                    'right_ur' => $answerUr ?? '',
                ]],
            ],
            default => [
                'prompt_en' => $statementEn ?? '',
                'prompt_ur' => $statementUr ?? '',
                'guidance_en' => $descriptionEn ?? '',
                'guidance_ur' => $descriptionUr ?? '',
                'answer_en' => $answerEn ?? '',
                'answer_ur' => $answerUr ?? '',
            ],
        };
    }

    private function legacyOptions(array $sourceOptions): array
    {
        return collect($sourceOptions)
            ->map(fn (object $option) => [
                'text_en' => $this->nullableString($option->option_en) ?? $this->nullableString($option->answer_en) ?? '',
                'text_ur' => $this->nullableString($option->option_ur) ?? $this->nullableString($option->answer_ur) ?? '',
                'is_correct' => (bool) ($option->is_correct ?? false),
            ])
            ->filter(fn (array $option) => $option['text_en'] !== '' || $option['text_ur'] !== '')
            ->values()
            ->all();
    }

    private function trueFalseAnswer(?string $answerEn, ?string $answerUr, array $options): ?string
    {
        foreach ([$answerEn, $answerUr] as $answer) {
            $normalized = strtolower(trim((string) $answer));

            if (in_array($normalized, ['true', 't'], true)) {
                return 'true';
            }

            if (in_array($normalized, ['false', 'f'], true)) {
                return 'false';
            }
        }

        $correct = collect($options)->firstWhere('is_correct', true);
        if (! is_array($correct)) {
            return null;
        }

        $text = strtolower(trim((string) ($correct['text_en'] ?: $correct['text_ur'])));

        return match ($text) {
            'true', 't' => 'true',
            'false', 'f' => 'false',
            default => null,
        };
    }

    private function resolveQuestionType(object $sourceQuestion, bool $hasOptions, ?int $creatorId): QuestionType
    {
        $sourceTypeId = (int) $sourceQuestion->type_id;
        $mapKey = "{$sourceTypeId}:".($hasOptions ? 'objective' : 'subjective');

        if (isset($this->questionTypeMap[$mapKey])) {
            return QuestionType::query()->findOrFail($this->questionTypeMap[$mapKey]);
        }

        $sourceType = $this->source()->table('pk_question_types')->where('id', $sourceTypeId)->first()
            ?? $this->resolveQuestionTypeByOrder($sourceTypeId, $hasOptions);

        if (! $sourceType) {
            $sourceType = (object) [
                'type_name' => "Legacy Type {$sourceTypeId}",
                'type_name_ur' => null,
                'heading_en' => "Legacy Type {$sourceTypeId}",
                'heading_ur' => null,
                'description_en' => null,
                'description_ur' => null,
                'have_exercise' => 0,
                'have_statment' => 1,
                'statement_label' => 'Question',
                'have_description' => 0,
                'description_label' => null,
                'have_answer' => $hasOptions ? 0 : 1,
                'is_single' => 1,
                'is_objective' => $hasOptions ? 1 : 0,
                'objective_type_id' => $hasOptions ? 1 : 0,
                'column_per_row' => 1,
            ];
        }

        $isObjective = (bool) ($sourceType->is_objective ?? $hasOptions);
        $schemaKey = QuestionTypeSchemaRegistry::infer($isObjective, [
            'objective_type_id' => (int) ($sourceType->objective_type_id ?? 0),
            'have_description' => (bool) ($sourceType->have_description ?? false),
            'have_answer' => (bool) ($sourceType->have_answer ?? true),
        ]);
        $baseName = $this->limitedString($sourceType->type_name, 100) ?? "Legacy Type {$sourceTypeId}";
        $name = $this->uniqueQuestionTypeName($baseName, $schemaKey);
        $questionType = QuestionType::query()->firstOrCreate(
            ['name' => $name],
            [
                'name_ur' => $this->limitedString($sourceType->type_name_ur ?? null, 100),
                'heading_en' => $this->limitedString($sourceType->heading_en ?? null, 150) ?? $baseName,
                'heading_ur' => $this->limitedString($sourceType->heading_ur ?? null, 150),
                'description_en' => $this->nullableString($sourceType->description_en ?? null),
                'description_ur' => $this->nullableString($sourceType->description_ur ?? null),
                'have_exercise' => (int) ($sourceType->have_exercise ?? 0),
                'have_statement' => (int) ($sourceType->have_statment ?? 1),
                'statement_label' => $this->limitedString($sourceType->statement_label ?? null, 100),
                'have_description' => (int) ($sourceType->have_description ?? 0),
                'description_label' => $this->limitedString($sourceType->description_label ?? null, 100),
                'have_answer' => (int) ($sourceType->have_answer ?? ($hasOptions ? 0 : 1)),
                'is_single' => (int) ($sourceType->is_single ?? 1),
                'is_objective' => $isObjective,
                'schema_key' => $schemaKey,
                'objective_type_id' => null,
                'column_per_row' => (int) ($sourceType->column_per_row ?? 1),
                'status' => 1,
                'created_by' => $creatorId,
            ],
        );

        $this->questionTypeMap[$mapKey] = $questionType->id;

        return $questionType;
    }

    private function resolveQuestionTypeByOrder(int $sourceTypeId, bool $hasOptions): ?object
    {
        $matches = $this->source()
            ->table('pk_question_types')
            ->where('id_order', $sourceTypeId)
            ->get();

        if ($matches->count() <= 1) {
            return $matches->first();
        }

        $preferredObjective = $hasOptions ? 1 : 0;

        return $matches->firstWhere('is_objective', $preferredObjective) ?? $matches->first();
    }

    private function uniqueQuestionTypeName(string $baseName, string $schemaKey): string
    {
        $existing = QuestionType::query()->where('name', $baseName)->first();

        if (! $existing || $existing->schema_key === $schemaKey) {
            return $baseName;
        }

        return Str::limit("{$baseName} ({$schemaKey})", 100, '');
    }

    private function resolveTargetPattern(array $options, ?int $creatorId): Pattern
    {
        if (! empty($options['target_pattern_id'])) {
            return Pattern::query()->findOrFail((int) $options['target_pattern_id']);
        }

        $name = $this->limitedString($options['target_pattern_name'] ?? 'PECTA', 100) ?? 'PECTA';
        $shortName = $this->limitedString($options['target_pattern_short_name'] ?? $name, 50);

        return Pattern::query()->firstOrCreate(
            ['name' => $name],
            [
                'short_name' => $shortName,
                'status' => 1,
                'created_by' => $creatorId,
            ],
        );
    }

    private function resolveTargetClass(array $options, object $sourceClass, ?int $creatorId): SchoolClass
    {
        if (! empty($options['target_class_id'])) {
            return SchoolClass::query()->findOrFail((int) $options['target_class_id']);
        }

        $name = $this->limitedString($options['target_class_name'] ?? $sourceClass->name, 50) ?? (string) $sourceClass->name;

        return SchoolClass::query()->firstOrCreate(
            ['name' => $name],
            [
                'status' => 1,
                'created_by' => $creatorId,
            ],
        );
    }

    private function resolveTargetSubject(object $sourceSubject, string $subjectType, array $options, ?int $creatorId): Subject
    {
        if (! empty($options['target_subject_id'])) {
            return Subject::query()->findOrFail((int) $options['target_subject_id']);
        }

        $name = $this->limitedString($sourceSubject->name, 100) ?? "Subject {$sourceSubject->id}";

        return Subject::query()->firstOrCreate(
            ['name_eng' => $name],
            [
                'name_ur' => null,
                'subject_type' => $subjectType,
                'status' => (int) ($sourceSubject->status_punjab ?: $sourceSubject->status_smart ?: 1),
                'created_by' => $creatorId,
            ],
        );
    }

    private function resolveTargetChapter(
        SchoolClass $targetClass,
        Pattern $targetPattern,
        Subject $targetSubject,
        array $attributes,
    ): Chapter {
        $baseQuery = Chapter::query()
            ->where('subject_id', $targetSubject->id)
            ->where('class_id', $targetClass->id)
            ->where('pattern_id', $targetPattern->id);

        if ($attributes['chapter_number'] !== null) {
            $chapter = (clone $baseQuery)
                ->where('chapter_number', $attributes['chapter_number'])
                ->first();

            if ($chapter) {
                $chapter->update($attributes);

                return $chapter;
            }
        }

        $chapter = (clone $baseQuery)
            ->where('name', $attributes['name'])
            ->where('sort_id', $attributes['sort_id'])
            ->first();

        if ($chapter) {
            $chapter->update($attributes);

            return $chapter;
        }

        return Chapter::query()->create([
            'subject_id' => $targetSubject->id,
            'class_id' => $targetClass->id,
            'pattern_id' => $targetPattern->id,
            ...$attributes,
        ]);
    }

    private function targetClassPayload(SchoolClass $class): array
    {
        return [
            'id' => $class->id,
            'name' => $class->name,
            'status' => $class->status,
        ];
    }

    private function targetSubjectPayload(Subject $subject): array
    {
        return [
            'id' => $subject->id,
            'name' => $this->displayName($subject->name_eng, $subject->name_ur, "Subject {$subject->id}"),
            'name_eng' => $subject->name_eng,
            'name_ur' => $subject->name_ur,
            'subject_type' => $subject->subject_type,
            'status' => $subject->status,
        ];
    }

    private function sourceSubjectType(int $sourceClassId, int $sourceSubjectId): string
    {
        $topicsCount = $this->source()
            ->table('pk_topics as topic')
            ->join('pk_chapter as chapter', 'chapter.id', '=', 'topic.chapter_id')
            ->where('chapter.class_id', $sourceClassId)
            ->where('chapter.subject_id', $sourceSubjectId)
            ->count();

        return $topicsCount > 0 ? 'topic-wise' : 'chapter-wise';
    }

    private function resolveQuestionSource(object $sourceQuestion): ?string
    {
        if ((int) ($sourceQuestion->past_paper_questions ?? 0) === 1) {
            return Question::SOURCE_PAST_PAPER;
        }

        if ((int) ($sourceQuestion->exercise_question ?? 0) === 1 || $this->nullableString($sourceQuestion->exercise) !== null) {
            return Question::SOURCE_EXERCISE;
        }

        return Question::SOURCE_ADDITIONAL;
    }

    private function sourceAfaq(string $sourcePattern): int
    {
        $pattern = self::SOURCE_PATTERNS[$sourcePattern] ?? null;

        if (! $pattern) {
            throw new RuntimeException("Unsupported source pattern: {$sourcePattern}");
        }

        return $pattern['afaq'];
    }

    private function source(): ConnectionInterface
    {
        return DB::connection(self::SOURCE_CONNECTION);
    }

    private function nullableString(mixed $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }

    private function limitedString(mixed $value, int $limit): ?string
    {
        $normalized = $this->nullableString($value);

        return $normalized === null ? null : Str::limit($normalized, $limit, '');
    }

    private function displayName(mixed $english, mixed $urdu, string $fallback): string
    {
        return $this->nullableString($english)
            ?? $this->nullableString($urdu)
            ?? $fallback;
    }

    private function nullableInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int) $value;
    }
}

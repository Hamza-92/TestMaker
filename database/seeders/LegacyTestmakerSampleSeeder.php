<?php

namespace Database\Seeders;

use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\QuestionType;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Topic;
use App\Models\User;
use App\Support\Questions\QuestionTypeSchemaRegistry;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LegacyTestmakerSampleSeeder extends Seeder
{
    private const DEFAULT_LEGACY_DATABASE = 'tmpk_school';

    private array $classesByLegacyId = [];

    private array $patternsByKey = [];

    private array $questionTypesByLegacyId = [];

    private int $chaptersImported = 0;

    private int $topicsImported = 0;

    private int $questionsImported = 0;

    private int $questionsSkipped = 0;

    private int $optionsImported = 0;

    public function run(): void
    {
        $legacy = $this->legacyConnection();
        $creatorId = User::query()->min('id');
        $chaptersPerPattern = (int) env('LEGACY_SAMPLE_CHAPTERS_PER_PATTERN', 20);
        $questionsPerChapter = (int) env('LEGACY_SAMPLE_QUESTIONS_PER_CHAPTER', 6);
        $objectiveQuestionsPerPattern = (int) env('LEGACY_SAMPLE_OBJECTIVE_QUESTIONS_PER_PATTERN', 20);
        $topicsPerChapter = (int) env('LEGACY_SAMPLE_TOPICS_PER_CHAPTER', 8);

        $this->command?->info('Importing sample data from '.$legacy->getDatabaseName().'...');

        DB::transaction(function () use (
            $legacy,
            $creatorId,
            $chaptersPerPattern,
            $questionsPerChapter,
            $objectiveQuestionsPerPattern,
            $topicsPerChapter,
        ): void {
            $this->importPatterns($creatorId);
            $this->importClasses($legacy, $creatorId);

            foreach ($this->patternSpecs() as $spec) {
                $this->importPatternSample(
                    legacy: $legacy,
                    spec: $spec,
                    creatorId: $creatorId,
                    chaptersPerPattern: $chaptersPerPattern,
                    questionsPerChapter: $questionsPerChapter,
                    topicsPerChapter: $topicsPerChapter,
                );
                $this->importObjectiveQuestionSample(
                    legacy: $legacy,
                    spec: $spec,
                    creatorId: $creatorId,
                    limit: $objectiveQuestionsPerPattern,
                );
            }
        });

        $this->command?->info(sprintf(
            'Done. Imported %d chapters, %d topics, %d questions, and %d options. Skipped %d existing questions.',
            $this->chaptersImported,
            $this->topicsImported,
            $this->questionsImported,
            $this->optionsImported,
            $this->questionsSkipped,
        ));
    }

    private function legacyConnection(): \Illuminate\Database\ConnectionInterface
    {
        $database = env('LEGACY_DB_DATABASE', self::DEFAULT_LEGACY_DATABASE);

        config([
            'database.connections.legacy_testmaker' => array_merge(
                config('database.connections.mysql'),
                ['database' => $database],
            ),
        ]);

        DB::purge('legacy_testmaker');
        DB::connection('legacy_testmaker')->statement('SET NAMES utf8mb4');

        return DB::connection('legacy_testmaker');
    }

    private function patternSpecs(): array
    {
        return [
            ['key' => 'afaq_iqbal', 'legacy_afaq' => 1, 'name' => 'AFAQ Iqbal Series', 'short_name' => 'afaq-iqbal'],
            ['key' => 'snc', 'legacy_afaq' => 2, 'name' => 'SNC', 'short_name' => 'snc'],
            ['key' => 'punjab', 'legacy_afaq' => 3, 'name' => 'Punjab', 'short_name' => 'punjab'],
            ['key' => 'pef', 'legacy_afaq' => 3, 'name' => 'PEF', 'short_name' => 'pef', 'pef' => true],
            ['key' => 'federal', 'legacy_afaq' => 4, 'name' => 'Federal', 'short_name' => 'federal'],
            ['key' => 'afaq_sun', 'legacy_afaq' => 5, 'name' => 'AFAQ Sun Series', 'short_name' => 'afaq-sun'],
            ['key' => 'ajk', 'legacy_afaq' => 6, 'name' => 'AJK Board', 'short_name' => 'ajk'],
            ['key' => 'kpk', 'legacy_afaq' => 7, 'name' => 'KPK Board', 'short_name' => 'kpk'],
            ['key' => 'smart', 'legacy_afaq' => 8, 'name' => 'Smart Syllabus', 'short_name' => 'smart'],
        ];
    }

    private function importPatterns(?int $creatorId): void
    {
        foreach ($this->patternSpecs() as $spec) {
            $pattern = Pattern::query()->firstOrCreate(
                ['name' => $spec['name']],
                [
                    'short_name' => $spec['short_name'],
                    'status' => 1,
                    'created_by' => $creatorId,
                ],
            );

            if ($pattern->short_name !== $spec['short_name']) {
                $pattern->forceFill(['short_name' => $spec['short_name']])->save();
            }

            $this->patternsByKey[$spec['key']] = $pattern;
        }
    }

    private function importClasses(\Illuminate\Database\ConnectionInterface $legacy, ?int $creatorId): void
    {
        $legacy->table('pk_class')
            ->orderBy('id_order')
            ->orderBy('id')
            ->get(['id', 'name'])
            ->each(function (object $row) use ($creatorId): void {
                $name = $this->cleanText($row->name, 50) ?: 'Class '.$row->id;

                $class = SchoolClass::query()->firstOrCreate(
                    ['name' => $name],
                    [
                        'status' => 1,
                        'created_by' => $creatorId,
                    ],
                );

                $this->classesByLegacyId[(int) $row->id] = $class;
            });
    }

    private function importPatternSample(
        \Illuminate\Database\ConnectionInterface $legacy,
        array $spec,
        ?int $creatorId,
        int $chaptersPerPattern,
        int $questionsPerChapter,
        int $topicsPerChapter,
    ): void {
        $chapterRows = $this->chapterRowsForPattern($legacy, $spec, $chaptersPerPattern);
        $pattern = $this->patternsByKey[$spec['key']];

        foreach ($chapterRows as $legacyChapter) {
            $class = $this->classesByLegacyId[(int) $legacyChapter->class_id] ?? null;

            if (! $class) {
                continue;
            }

            $subject = $this->subjectFromLegacy($legacy, (int) $legacyChapter->subject_id, $creatorId);
            $this->linkClassToPattern($class, $pattern);
            $this->linkSubjectToClass($class, $pattern, $subject);

            $chapter = $this->chapterFromLegacy($legacyChapter, $class, $pattern, $subject, $creatorId);
            $this->importTopicsForChapter($legacy, $legacyChapter, $chapter, $creatorId, $topicsPerChapter);
            $this->importQuestionsForChapter(
                legacy: $legacy,
                legacyChapter: $legacyChapter,
                chapter: $chapter,
                patternSpec: $spec,
                creatorId: $creatorId,
                limit: $questionsPerChapter,
            );
        }
    }

    private function chapterRowsForPattern(
        \Illuminate\Database\ConnectionInterface $legacy,
        array $spec,
        int $limit,
    ): Collection {
        $query = $legacy->table('pk_chapter')
            ->whereExists(function ($query) use ($spec): void {
                $query->selectRaw('1')
                    ->from('pk_question')
                    ->whereColumn('pk_question.chapter_id', 'pk_chapter.id');

                $this->applyQuestionPatternScope($query, $spec, 'pk_question');
            })
            ->orderBy('class_id')
            ->orderBy('subject_id')
            ->orderBy('chapter_number')
            ->orderBy('id')
            ->limit($limit);

        $this->applyChapterPatternScope($query, $spec, 'pk_chapter');

        return $query->get();
    }

    private function subjectFromLegacy(
        \Illuminate\Database\ConnectionInterface $legacy,
        int $legacySubjectId,
        ?int $creatorId,
    ): Subject {
        $row = $legacy->table('pk_subject')->where('id', $legacySubjectId)->first();
        $name = $this->cleanText($row?->name, 100) ?: 'Legacy Subject '.$legacySubjectId;

        return Subject::query()->firstOrCreate(
            ['name_eng' => $name],
            [
                'name_ur' => null,
                'subject_type' => 'chapter-wise',
                'status' => 1,
                'created_by' => $creatorId,
            ],
        );
    }

    private function linkClassToPattern(SchoolClass $class, Pattern $pattern): void
    {
        DB::table('pattern_classes')->updateOrInsert([
            'pattern_id' => $pattern->id,
            'class_id' => $class->id,
        ]);
    }

    private function linkSubjectToClass(SchoolClass $class, Pattern $pattern, Subject $subject): void
    {
        ClassSubject::query()->firstOrCreate([
            'class_id' => $class->id,
            'pattern_id' => $pattern->id,
            'subject_id' => $subject->id,
        ], [
            'medium_id' => null,
        ]);
    }

    private function chapterFromLegacy(
        object $legacyChapter,
        SchoolClass $class,
        Pattern $pattern,
        Subject $subject,
        ?int $creatorId,
    ): Chapter {
        [$groupName, $groupHeading] = $this->chapterGroup($legacyChapter->chapter_type ?? null);

        $chapter = Chapter::query()->updateOrCreate(
            [
                'subject_id' => $subject->id,
                'class_id' => $class->id,
                'pattern_id' => $pattern->id,
                'chapter_number' => $legacyChapter->chapter_number,
            ],
            [
                'name' => $this->cleanText($legacyChapter->name, 150) ?: 'Chapter '.$legacyChapter->id,
                'name_ur' => $this->cleanText($legacyChapter->u_name, 150),
                'group_name' => $groupName,
                'group_heading' => $groupHeading,
                'sort_id' => (int) ($legacyChapter->sort_int ?? 0),
                'status' => 1,
                'created_by' => $creatorId,
            ],
        );

        $this->chaptersImported++;

        return $chapter;
    }

    private function importTopicsForChapter(
        \Illuminate\Database\ConnectionInterface $legacy,
        object $legacyChapter,
        Chapter $chapter,
        ?int $creatorId,
        int $limit,
    ): void {
        $topics = $legacy->table('pk_topics')
            ->where('chapter_id', $legacyChapter->id)
            ->where('status', 1)
            ->orderBy('sort_int')
            ->orderBy('id')
            ->limit($limit)
            ->get();

        if ($topics->isNotEmpty() && $chapter->subject->subject_type !== 'topic-wise') {
            $chapter->subject->forceFill(['subject_type' => 'topic-wise'])->save();
        }

        foreach ($topics as $topicRow) {
            $this->topicFromLegacy($topicRow, $chapter, $creatorId);
        }
    }

    private function topicFromLegacy(object $topicRow, Chapter $chapter, ?int $creatorId): Topic
    {
        $name = $this->cleanText($topicRow->name, 150)
            ?: $this->cleanText($topicRow->u_name, 150)
            ?: 'Topic '.$topicRow->id;

        $topic = Topic::query()->updateOrCreate(
            [
                'chapter_id' => $chapter->id,
                'name' => $name,
            ],
            [
                'name_ur' => $this->cleanText($topicRow->u_name, 150),
                'sort_id' => (int) ($topicRow->sort_int ?? 0),
                'status' => 1,
                'created_by' => $creatorId,
            ],
        );

        $this->topicsImported++;

        return $topic;
    }

    private function importQuestionsForChapter(
        \Illuminate\Database\ConnectionInterface $legacy,
        object $legacyChapter,
        Chapter $chapter,
        array $patternSpec,
        ?int $creatorId,
        int $limit,
    ): void {
        $objectiveLimit = max(2, (int) ceil($limit / 2));
        $subjectiveLimit = max(1, $limit - $objectiveLimit);

        $questions = $this->questionRowsForChapter(
            legacy: $legacy,
            legacyChapterId: (int) $legacyChapter->id,
            patternSpec: $patternSpec,
            isObjective: true,
            limit: $objectiveLimit,
        )->concat($this->questionRowsForChapter(
            legacy: $legacy,
            legacyChapterId: (int) $legacyChapter->id,
            patternSpec: $patternSpec,
            isObjective: false,
            limit: $subjectiveLimit,
        ));

        if ($questions->isEmpty()) {
            return;
        }

        $optionsByQuestion = $legacy->table('pk_options')
            ->whereIn('question_id', $questions->pluck('id')->all())
            ->orderBy('id')
            ->get()
            ->groupBy('question_id');

        foreach ($questions as $legacyQuestion) {
            $this->storeLegacyQuestion(
                legacy: $legacy,
                legacyQuestion: $legacyQuestion,
                legacyChapter: $legacyChapter,
                chapter: $chapter,
                patternSpec: $patternSpec,
                creatorId: $creatorId,
                legacyOptions: $optionsByQuestion[(int) $legacyQuestion->id] ?? collect(),
            );
        }
    }

    private function importObjectiveQuestionSample(
        \Illuminate\Database\ConnectionInterface $legacy,
        array $spec,
        ?int $creatorId,
        int $limit,
    ): void {
        $query = $legacy->table('pk_question as q')
            ->join('pk_question_types as qt', 'qt.id', '=', 'q.type_id')
            ->where('qt.is_objective', 1)
            ->whereExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('pk_options')
                    ->whereColumn('pk_options.question_id', 'q.id');
            })
            ->whereExists(function ($query) use ($spec): void {
                $query->selectRaw('1')
                    ->from('pk_chapter as ch')
                    ->whereColumn('ch.id', 'q.chapter_id');

                $this->applyChapterPatternScope($query, $spec, 'ch');
            })
            ->orderBy('q.chapter_id')
            ->orderBy('q.type_id')
            ->orderBy('q.id')
            ->limit($limit)
            ->select('q.*');

        $this->applyQuestionPatternScope($query, $spec, 'q');

        $questions = $query->get();

        if ($questions->isEmpty()) {
            return;
        }

        $legacyChapters = $legacy->table('pk_chapter')
            ->whereIn('id', $questions->pluck('chapter_id')->unique()->all())
            ->get()
            ->keyBy('id');
        $optionsByQuestion = $legacy->table('pk_options')
            ->whereIn('question_id', $questions->pluck('id')->all())
            ->orderBy('id')
            ->get()
            ->groupBy('question_id');
        $pattern = $this->patternsByKey[$spec['key']];

        foreach ($questions as $legacyQuestion) {
            $legacyChapter = $legacyChapters[(int) $legacyQuestion->chapter_id] ?? null;
            $class = $this->classesByLegacyId[(int) ($legacyChapter?->class_id ?? 0)] ?? null;

            if (! $legacyChapter || ! $class) {
                continue;
            }

            $subject = $this->subjectFromLegacy($legacy, (int) $legacyChapter->subject_id, $creatorId);
            $this->linkClassToPattern($class, $pattern);
            $this->linkSubjectToClass($class, $pattern, $subject);

            $chapter = $this->chapterFromLegacy($legacyChapter, $class, $pattern, $subject, $creatorId);

            $this->storeLegacyQuestion(
                legacy: $legacy,
                legacyQuestion: $legacyQuestion,
                legacyChapter: $legacyChapter,
                chapter: $chapter,
                patternSpec: $spec,
                creatorId: $creatorId,
                legacyOptions: $optionsByQuestion[(int) $legacyQuestion->id] ?? collect(),
            );
        }
    }

    private function storeLegacyQuestion(
        \Illuminate\Database\ConnectionInterface $legacy,
        object $legacyQuestion,
        object $legacyChapter,
        Chapter $chapter,
        array $patternSpec,
        ?int $creatorId,
        Collection $legacyOptions,
    ): void {
        if ($this->legacyQuestionExists((int) $legacyQuestion->id, $patternSpec['key'])) {
            $this->questionsSkipped++;

            return;
        }

        $questionType = $this->questionTypeFromLegacy($legacy, (int) $legacyQuestion->type_id, $creatorId);
        $topicId = $this->resolveQuestionTopic($legacy, $legacyQuestion, $chapter, $creatorId);
        $payload = $this->questionPayload($legacyQuestion, $questionType, $legacyOptions);

        $payload['content']['_legacy'] = [
            'database' => self::DEFAULT_LEGACY_DATABASE,
            'pattern_key' => $patternSpec['key'],
            'afaq' => (int) $patternSpec['legacy_afaq'],
            'chapter_id' => (int) $legacyChapter->id,
            'question_id' => (int) $legacyQuestion->id,
            'type_id' => (int) $legacyQuestion->type_id,
        ];

        $question = Question::query()->create([
            'question_type_id' => $questionType->id,
            'topic_id' => $topicId,
            'chapter_id' => $chapter->id,
            'statement_en' => $payload['statement_en'],
            'statement_ur' => $payload['statement_ur'],
            'description_en' => $payload['description_en'],
            'description_ur' => $payload['description_ur'],
            'answer_en' => $payload['answer_en'],
            'answer_ur' => $payload['answer_ur'],
            'content' => $payload['content'],
            'source' => $this->questionSource($legacyQuestion),
            'status' => 1,
            'created_by' => $creatorId,
        ]);

        foreach ($payload['options'] as $option) {
            QuestionOption::query()->create([
                'question_id' => $question->id,
                ...$option,
            ]);

            $this->optionsImported++;
        }

        $this->questionsImported++;
    }

    private function questionRowsForChapter(
        \Illuminate\Database\ConnectionInterface $legacy,
        int $legacyChapterId,
        array $patternSpec,
        bool $isObjective,
        int $limit,
    ): Collection {
        $query = $legacy->table('pk_question')
            ->join('pk_question_types', 'pk_question_types.id', '=', 'pk_question.type_id')
            ->where('pk_question.chapter_id', $legacyChapterId)
            ->where('pk_question_types.is_objective', $isObjective ? 1 : 0)
            ->orderBy('pk_question.type_id')
            ->orderBy('pk_question.id')
            ->limit($limit)
            ->select('pk_question.*');

        $this->applyQuestionPatternScope($query, $patternSpec, 'pk_question');

        return $query->get();
    }

    private function applyChapterPatternScope($query, array $spec, string $table): void
    {
        $query->where($table.'.afaq', $spec['legacy_afaq']);

        if (($spec['pef'] ?? false) === true) {
            $query->where($table.'.status_pef', 1);

            return;
        }

        $query->where($table.'.status', 1);
    }

    private function applyQuestionPatternScope($query, array $spec, string $table): void
    {
        $query->where($table.'.afaq', $spec['legacy_afaq']);

        if (($spec['pef'] ?? false) === true) {
            $query->where($table.'.status_pef', 1);

            return;
        }

        $query->where($table.'.status', 1);
    }

    private function questionTypeFromLegacy(
        \Illuminate\Database\ConnectionInterface $legacy,
        int $legacyTypeId,
        ?int $creatorId,
    ): QuestionType {
        if (isset($this->questionTypesByLegacyId[$legacyTypeId])) {
            return $this->questionTypesByLegacyId[$legacyTypeId];
        }

        $row = $legacy->table('pk_question_types')->where('id', $legacyTypeId)->first();
        $isObjective = (bool) ($row?->is_objective ?? false);
        $schemaKey = $isObjective
            ? QuestionTypeSchemaRegistry::infer(true, ['objective_type_id' => (int) ($row?->objective_type_id ?? 0)])
            : QuestionTypeSchemaRegistry::SUBJECTIVE_STANDARD;
        $baseName = $this->cleanText($row?->type_name, 88) ?: 'Legacy Type';
        $name = $this->cleanText($baseName.' [L'.$legacyTypeId.']', 100) ?: 'Legacy Type '.$legacyTypeId;

        $questionType = QuestionType::query()->updateOrCreate(
            ['name' => $name],
            [
                'name_ur' => $this->cleanText($row?->type_name_ur, 100),
                'heading_en' => $this->cleanText($row?->heading_en, 150) ?: $name,
                'heading_ur' => $this->cleanText($row?->heading_ur, 150),
                'description_en' => null,
                'description_ur' => null,
                'have_exercise' => (bool) ($row?->have_exercise ?? false),
                'have_statement' => (bool) ($row?->have_statment ?? true),
                'statement_label' => $this->cleanText($row?->statement_label, 100),
                'have_description' => (bool) ($row?->have_description ?? false),
                'description_label' => $this->cleanText($row?->description_label, 100),
                'have_answer' => (bool) ($row?->have_answer ?? false),
                'is_single' => (bool) ($row?->is_single ?? true),
                'is_objective' => $isObjective,
                'schema_key' => $schemaKey,
                'objective_type_id' => null,
                'column_per_row' => max(1, min(6, (int) ($row?->column_per_row ?: 1))),
                'status' => 1,
                'created_by' => $creatorId,
            ],
        );

        return $this->questionTypesByLegacyId[$legacyTypeId] = $questionType;
    }

    private function resolveQuestionTopic(
        \Illuminate\Database\ConnectionInterface $legacy,
        object $legacyQuestion,
        Chapter $chapter,
        ?int $creatorId,
    ): ?int {
        $legacyTopicId = (int) ($legacyQuestion->topic_id ?? 0);

        if ($legacyTopicId <= 0) {
            return null;
        }

        $topicRow = $legacy->table('pk_topics')
            ->where('id', $legacyTopicId)
            ->where('chapter_id', $legacyQuestion->chapter_id)
            ->first();

        if (! $topicRow) {
            return null;
        }

        if ($chapter->subject->subject_type !== 'topic-wise') {
            $chapter->subject->forceFill(['subject_type' => 'topic-wise'])->save();
        }

        return $this->topicFromLegacy($topicRow, $chapter, $creatorId)->id;
    }

    private function questionPayload(object $legacyQuestion, QuestionType $questionType, Collection $legacyOptions): array
    {
        $schemaKey = QuestionTypeSchemaRegistry::resolve(
            $questionType->schema_key,
            $questionType->is_objective,
        )['key'];

        $content = match ($schemaKey) {
            QuestionTypeSchemaRegistry::OBJECTIVE_MCQ,
            QuestionTypeSchemaRegistry::OBJECTIVE_BLANK_CHOICE => [
                'prompt_en' => $this->cleanText($legacyQuestion->statement_en),
                'prompt_ur' => $this->cleanText($legacyQuestion->statement_ur),
                'options' => $this->legacyOptions($legacyOptions),
            ],
            QuestionTypeSchemaRegistry::OBJECTIVE_TRUE_FALSE => [
                'prompt_en' => $this->cleanText($legacyQuestion->statement_en),
                'prompt_ur' => $this->cleanText($legacyQuestion->statement_ur),
                'correct_boolean' => $this->trueFalseAnswer($legacyOptions, $legacyQuestion),
            ],
            QuestionTypeSchemaRegistry::OBJECTIVE_BLANK_OPEN => [
                'prompt_en' => $this->cleanText($legacyQuestion->statement_en),
                'prompt_ur' => $this->cleanText($legacyQuestion->statement_ur),
                'answer_en' => $this->cleanText($legacyQuestion->answer_en),
                'answer_ur' => $this->cleanText($legacyQuestion->answer_ur),
            ],
            QuestionTypeSchemaRegistry::OBJECTIVE_PASSAGE_MCQ => [
                'passage_en' => $this->cleanText($legacyQuestion->paragraph_questions)
                    ?: $this->cleanText($legacyQuestion->description_en)
                    ?: $this->cleanText($legacyQuestion->statement_en),
                'passage_ur' => $this->cleanText($legacyQuestion->description_ur)
                    ?: $this->cleanText($legacyQuestion->statement_ur),
                'items' => [[
                    'prompt_en' => $this->cleanText($legacyQuestion->statement_en),
                    'prompt_ur' => $this->cleanText($legacyQuestion->statement_ur),
                    'options' => $this->legacyOptions($legacyOptions),
                ]],
            ],
            default => [
                'prompt_en' => $this->cleanText($legacyQuestion->statement_en),
                'prompt_ur' => $this->cleanText($legacyQuestion->statement_ur),
                'guidance_en' => $this->cleanText($legacyQuestion->description_en)
                    ?: $this->cleanText($legacyQuestion->paragraph_questions),
                'guidance_ur' => $this->cleanText($legacyQuestion->description_ur),
                'answer_en' => $this->cleanText($legacyQuestion->answer_en),
                'answer_ur' => $this->cleanText($legacyQuestion->answer_ur),
            ],
        };

        return QuestionTypeSchemaRegistry::buildQuestionPayload($questionType, $content);
    }

    private function legacyOptions(Collection $legacyOptions): array
    {
        return $legacyOptions
            ->map(fn (object $option): array => [
                'text_en' => $this->cleanText($option->option_en) ?: $this->cleanText($option->answer_en),
                'text_ur' => $this->cleanText($option->option_ur) ?: $this->cleanText($option->answer_ur),
                'is_correct' => (bool) ($option->is_correct ?? false),
            ])
            ->filter(fn (array $option): bool => $option['text_en'] !== null || $option['text_ur'] !== null)
            ->values()
            ->all();
    }

    private function trueFalseAnswer(Collection $legacyOptions, object $legacyQuestion): string
    {
        $correct = $legacyOptions->first(fn (object $option): bool => (bool) ($option->is_correct ?? false));
        $answer = strtolower((string) (
            $this->cleanText($correct?->option_en)
            ?: $this->cleanText($correct?->answer_en)
            ?: $this->cleanText($legacyQuestion->answer_en)
        ));

        if (str_contains($answer, 'false') || str_contains($answer, 'f')) {
            return 'false';
        }

        if (str_contains($answer, 'true') || str_contains($answer, 't')) {
            return 'true';
        }

        return '';
    }

    private function legacyQuestionExists(int $legacyQuestionId, string $patternKey): bool
    {
        return DB::table('questions')
            ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(content, '$._legacy.question_id')) = ?", [(string) $legacyQuestionId])
            ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(content, '$._legacy.pattern_key')) = ?", [$patternKey])
            ->exists();
    }

    private function questionSource(object $legacyQuestion): string
    {
        if ((int) ($legacyQuestion->past_paper_questions ?? 0) === 1) {
            return Question::SOURCE_PAST_PAPER;
        }

        if ((int) ($legacyQuestion->exercise_question ?? 0) === 1 || $this->cleanText($legacyQuestion->exercise) !== null) {
            return Question::SOURCE_EXERCISE;
        }

        return Question::SOURCE_ADDITIONAL;
    }

    private function chapterGroup(mixed $chapterType): array
    {
        $heading = $this->cleanText($chapterType, 150);

        if ($heading === null || ! str_contains($heading, ':')) {
            return [null, $heading];
        }

        [$groupName] = explode(':', $heading, 2);

        return [$this->cleanText($groupName, 100), $heading];
    }

    private function cleanText(mixed $value, ?int $limit = null): ?string
    {
        $text = trim((string) $value);

        if ($text === '') {
            return null;
        }

        $text = preg_replace('/<br\s*\/?>/i', "\n", $text) ?? $text;
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = strip_tags($text);
        $text = str_replace("\xc2\xa0", ' ', $text);
        $text = preg_replace('/[ \t]+/u', ' ', $text) ?? $text;
        $text = preg_replace('/\R{3,}/u', "\n\n", $text) ?? $text;
        $text = trim($text);

        if ($text === '') {
            return null;
        }

        return $limit ? Str::substr($text, 0, $limit) : $text;
    }
}

<?php

namespace App\Support\LegacyTransfer;

use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Medium;
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

    /** Legacy same-statement types print each language statement around one shared middle statement. */
    private const LEGACY_SAME_STATEMENT_TYPES = [336, 386];

    /** Math subjects routed directly from chapters.php to exercise.php in the legacy app. */
    private const LEGACY_EXERCISE_BASED_MATH_SUBJECT_IDS = [
        3,
        21,
        22,
        45,
        51,
        60,
        82,
        101,
        122,
        129,
        156,
        158,
        160,
        170,
        178,
        201,
        207,
        214,
    ];

    private const EXERCISE_TOPIC_MINIMUM_COVERAGE = 0.75;

    private const SOURCE_PATTERNS = [
        'punjab' => [
            'key' => 'punjab',
            'label' => 'Punjab',
            'afaq' => 0,
        ],
        'afaq' => [
            'key' => 'afaq',
            'label' => 'AFAQ',
            'afaq' => 1,
        ],
        'oxford' => [
            'key' => 'oxford',
            'label' => 'Oxford',
            'afaq' => 2,
        ],
        'short_syllabus' => [
            'key' => 'short_syllabus',
            'label' => 'Short Syllabus',
            'afaq' => 3,
        ],
        'pef' => [
            'key' => 'pef',
            'label' => 'PEF',
            'afaq' => 3,
        ],
        'fedral' => [
            'key' => 'fedral',
            'label' => 'Federal',
            'afaq' => 4,
        ],
        'afaq_sons' => [
            'key' => 'afaq_sons',
            'label' => 'AFAQ Sons',
            'afaq' => 5,
        ],
        'ajk' => [
            'key' => 'ajk',
            'label' => 'AJK',
            'afaq' => 6,
        ],
        'kpk' => [
            'key' => 'kpk',
            'label' => 'KPK',
            'afaq' => 7,
        ],
        'ss' => [
            'key' => 'ss',
            'label' => 'SS',
            'afaq' => 8,
        ],
        'sindh' => [
            'key' => 'sindh',
            'label' => 'Sindh',
            'afaq' => 9,
        ],
    ];

    private array $questionTypeMap = [];

    private array $mediumIdMap = [];

    public function __construct(private readonly LegacyAssetMigrator $assets) {}

    public function sourcePatterns(): array
    {
        return array_values(self::SOURCE_PATTERNS);
    }

    public function sourceClasses(string $sourcePattern): array
    {
        $afaq = $this->sourceAfaq($sourcePattern);
        $statusColumn = $this->sourceChapterStatusColumn($sourcePattern);

        return $this->source()
            ->table('pk_class as class')
            ->join('pk_chapter as chapter', 'chapter.class_id', '=', 'class.id')
            ->where('chapter.afaq', $afaq)
            ->where("chapter.{$statusColumn}", 1)
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
        $statusColumn = $this->sourceChapterStatusColumn($sourcePattern);

        return $this->source()
            ->table('pk_subject as subject')
            ->join('pk_chapter as chapter', function ($join) use ($sourceClassId, $afaq, $statusColumn): void {
                $join->on('chapter.subject_id', '=', 'subject.id')
                    ->where('chapter.class_id', '=', $sourceClassId)
                    ->where('chapter.afaq', '=', $afaq)
                    ->where("chapter.{$statusColumn}", '=', 1);
            })
            ->leftJoin('pk_question as question', function ($join) use ($afaq, $sourcePattern): void {
                $join->on('question.chapter_id', '=', 'chapter.id')
                    ->where('question.afaq', '=', $afaq)
                    ->where('question.status', '=', 1);
                if ($sourcePattern === 'pef') {
                    $join->where('question.status_pef', '=', 1);
                }
            })
            ->leftJoin('pk_topics as topic', function ($join): void {
                $join->on('topic.chapter_id', '=', 'chapter.id')
                    ->where('topic.status', '=', 1);
            })
            ->when($sourcePattern === 'short_syllabus', fn ($query) => $query
                ->whereIn('subject.afaq', [0, 3])
                ->where('subject.status_smart', 1))
            ->when($sourcePattern === 'pef', fn ($query) => $query->where(function ($query): void {
                $query->where(function ($query): void {
                    $query->where('subject.afaq', 3)->where('subject.status_smart', 1);
                })->orWhere('subject.afaq', 0);
            }))
            ->when($sourcePattern === 'punjab', fn ($query) => $query
                ->where('subject.afaq', 0)
                ->where('subject.status_punjab', 1))
            ->when(in_array($sourcePattern, ['afaq', 'afaq_sons', 'oxford'], true), fn ($query) => $query->where('subject.afaq', $afaq))
            ->when(in_array($sourcePattern, ['fedral', 'ajk', 'kpk', 'ss', 'sindh'], true), fn ($query) => $query->where('subject.status_punjab', 1))
            ->selectRaw("subject.id, subject.name, subject.status_punjab, subject.status_smart, count(distinct chapter.id) as chapters_count, count(distinct topic.id) as topics_count, count(distinct question.id) as questions_count, count(distinct case when trim(coalesce(question.exercise, '')) <> '' then question.id end) as exercise_questions_count")
            ->groupBy('subject.id', 'subject.name', 'subject.status_punjab', 'subject.status_smart')
            ->havingRaw('count(distinct question.id) > 0')
            ->orderBy('subject.name')
            ->get()
            ->map(function (object $subject): array {
                $hasLegacyTopics = ((int) $subject->topics_count) > 0;
                $usesExerciseTopics = ! $hasLegacyTopics
                    && $this->hasExerciseBasedMathData(
                        sourceSubjectId: (int) $subject->id,
                        questionsCount: (int) $subject->questions_count,
                        exerciseQuestionsCount: (int) $subject->exercise_questions_count,
                    );

                return [
                    'id' => (int) $subject->id,
                    'name' => (string) $subject->name,
                    'status' => (int) ($subject->status_punjab ?: $subject->status_smart ?: 1),
                    'chapters_count' => (int) $subject->chapters_count,
                    'topics_count' => (int) $subject->topics_count,
                    'questions_count' => (int) $subject->questions_count,
                    'exercise_questions_count' => (int) $subject->exercise_questions_count,
                    'subject_type' => $hasLegacyTopics ? 'topic-wise' : 'chapter-wise',
                    'class_transfer_type' => ($hasLegacyTopics || $usesExerciseTopics)
                        ? 'topic-wise'
                        : 'chapter-wise',
                    'uses_exercise_topics' => $usesExerciseTopics,
                ];
            })
            ->all();
    }

    public function sourceChapters(string $sourcePattern, int $sourceClassId, int $sourceSubjectId): array
    {
        $afaq = $this->sourceAfaq($sourcePattern);
        $statusColumn = $this->sourceChapterStatusColumn($sourcePattern);

        $chapters = $this->source()
            ->table('pk_chapter as chapter')
            ->leftJoin('pk_question as question', function ($join) use ($afaq, $sourcePattern): void {
                $join->on('question.chapter_id', '=', 'chapter.id')
                    ->where('question.afaq', '=', $afaq)
                    ->where('question.status', '=', 1);
                if ($sourcePattern === 'pef') {
                    $join->where('question.status_pef', '=', 1);
                }
            })
            ->where('chapter.class_id', $sourceClassId)
            ->where('chapter.subject_id', $sourceSubjectId)
            ->where('chapter.afaq', $afaq)
            ->where("chapter.{$statusColumn}", 1)
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
            ->leftJoin('pk_question as question', function ($join) use ($afaq, $sourcePattern): void {
                $join->on('question.topic_id', '=', 'topic.id')
                    ->where('question.afaq', '=', $afaq)
                    ->where('question.status', '=', 1);
                if ($sourcePattern === 'pef') {
                    $join->where('question.status_pef', '=', 1);
                }
            })
            ->whereIn('topic.chapter_id', $chapterIds)
            ->where('topic.status', 1)
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
        // Legacy imports can process thousands of questions and migrated assets.
        // Do not let PHP's default 30-second request timer abort a valid transfer.
        set_time_limit(0);
        ini_set('memory_limit', (string) config('legacy-transfer.memory_limit', '512M'));

        $sourcePattern = (string) $options['source_pattern'];
        $sourceClassId = (int) $options['source_class_id'];
        $classWise = (bool) ($options['class_wise'] ?? false);
        $sourceSubjectIds = isset($options['source_subject_id'])
            ? [(int) $options['source_subject_id']]
            : array_values(array_unique(array_map('intval', $options['source_subject_ids'] ?? [])));
        $sourceChapterIds = array_values(array_unique(array_map('intval', $options['source_chapter_ids'] ?? [])));
        $sourceTopicIds = array_values(array_unique(array_map('intval', $options['source_topic_ids'] ?? [])));
        // A migration imports every legacy source category unless an explicit
        // source filter is supplied by an API caller.
        $exerciseQuestion = isset($options['exercise_question'])
            ? (int) $options['exercise_question']
            : null;
        $convertExercisesToTopics = (bool) ($options['convert_exercises_to_topics'] ?? false);
        $replaceExisting = (bool) ($options['replace_existing'] ?? false);

        if ($classWise) {
            $sourceChapterIds = [];
            $sourceTopicIds = [];
            $convertExercisesToTopics = false;
            unset($options['target_subject_id']);
        }

        $afaq = $this->sourceAfaq($sourcePattern);
        $statusColumn = $this->sourceChapterStatusColumn($sourcePattern);
        $sourceClass = $this->source()->table('pk_class')->where('id', $sourceClassId)->first();

        if (! $sourceClass) {
            throw new RuntimeException("Source class {$sourceClassId} was not found.");
        }

        $visibleSourceSubjects = collect($this->sourceSubjects($sourcePattern, $sourceClassId));
        if ($classWise && $sourceSubjectIds === []) {
            $sourceSubjectIds = $visibleSourceSubjects
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        if ($sourceSubjectIds === []) {
            throw new RuntimeException('Select at least one source subject.');
        }

        if (isset($options['source_subject_id']) && $sourceChapterIds === [] && $sourceTopicIds === []) {
            throw new RuntimeException('Select at least one source chapter or topic.');
        }

        $visibleSourceSubjectIds = $visibleSourceSubjects
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $sourceSubjects = $this->source()
            ->table('pk_subject')
            ->whereIn('id', array_intersect($sourceSubjectIds, $visibleSourceSubjectIds))
            ->get()
            ->keyBy('id');

        $missingSubjects = array_diff($sourceSubjectIds, $sourceSubjects->keys()->map(fn ($id) => (int) $id)->all());
        if ($missingSubjects !== []) {
            throw new RuntimeException('Missing source subjects: '.implode(', ', $missingSubjects));
        }

        $this->validateTargetScope($options);

        $this->questionTypeMap = [];
        $this->mediumIdMap = [];
        $this->assets->reset();
        $this->prefetchSourceAssets(
            afaq: $afaq,
            sourcePattern: $sourcePattern,
            sourceClassId: $sourceClassId,
            sourceSubjectIds: $sourceSubjectIds,
            sourceChapterIds: $sourceChapterIds,
            sourceTopicIds: $sourceTopicIds,
            exerciseQuestion: $exerciseQuestion,
            statusColumn: $statusColumn,
        );

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
            $sourcePattern,
            $statusColumn,
            $sourceTopicIds,
            $exerciseQuestion,
            $convertExercisesToTopics,
            $classWise
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
                $this->validateSourceSelection(
                    sourcePattern: $sourcePattern,
                    sourceClassId: $sourceClassId,
                    sourceSubjectId: $sourceSubjectId,
                    sourceChapterIds: $sourceChapterIds,
                    sourceTopicIds: $sourceTopicIds,
                );
                $nativeSubjectType = $this->sourceSubjectType(
                    $sourcePattern,
                    $sourceClassId,
                    $sourceSubjectId,
                );
                $convertSubjectExercisesToTopics = $classWise
                    ? $nativeSubjectType !== 'topic-wise'
                        && $this->sourceUsesExerciseTopics(
                            $sourcePattern,
                            $sourceClassId,
                            $sourceSubjectId,
                        )
                    : $convertExercisesToTopics;
                $subjectType = $convertSubjectExercisesToTopics
                    ? 'topic-wise'
                    : $nativeSubjectType;
                $subject = $this->resolveTargetSubject($sourceSubject, $subjectType, $options, $creatorId);
                if (($classWise || $convertSubjectExercisesToTopics) && $subject->subject_type !== $subjectType) {
                    $subject->update(['subject_type' => $subjectType]);
                }

                $classSubject = ClassSubject::query()->firstOrCreate([
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
                    sourcePattern: $sourcePattern,
                    sourceClassId: $sourceClassId,
                    sourceSubjectId: $sourceSubjectId,
                    sourceChapterIds: $sourceChapterIds,
                    sourceTopicIds: $sourceTopicIds,
                    exerciseQuestion: $exerciseQuestion,
                    convertExercisesToTopics: $convertSubjectExercisesToTopics,
                    statusColumn: $statusColumn,
                    targetClass: $class,
                    targetPattern: $pattern,
                    targetSubject: $subject,
                );

                $detectedMedium = (string) ($subjectReport['medium'] ?? 'Both');
                if (! $replaceExisting) {
                    $classSubject->loadMissing('medium');
                    $detectedMedium = $this->mergeMediumNames(
                        $classSubject->medium?->name,
                        $detectedMedium,
                    );
                }
                $classSubject->update([
                    'medium_id' => $this->mediumId($detectedMedium),
                ]);

                $report['subjects'][] = [
                    'id' => $subject->id,
                    'name' => $subject->name_eng,
                    'source_id' => $sourceSubjectId,
                    'source_name' => (string) $sourceSubject->name,
                    'subject_type' => $subjectType,
                    'uses_exercise_topics' => $convertSubjectExercisesToTopics,
                    ...$subjectReport,
                ];

                $report['totals']['subjects']++;
                foreach (['chapters', 'topics', 'questions', 'options', 'question_types'] as $key) {
                    $report['totals'][$key] += $subjectReport[$key];
                }
            }

            $assetReport = $this->assets->report();
            $report['assets'] = $assetReport;

            return $report;
        });
    }

    private function prefetchSourceAssets(
        int $afaq,
        string $sourcePattern,
        int $sourceClassId,
        array $sourceSubjectIds,
        array $sourceChapterIds,
        array $sourceTopicIds,
        ?int $exerciseQuestion,
        string $statusColumn,
    ): void {
        $applySourceScope = function ($query) use (
            $afaq,
            $exerciseQuestion,
            $sourceChapterIds,
            $sourceClassId,
            $sourcePattern,
            $sourceSubjectIds,
            $sourceTopicIds,
            $statusColumn,
        ): void {
            $query
                ->where('chapter.class_id', $sourceClassId)
                ->whereIn('chapter.subject_id', $sourceSubjectIds)
                ->where('chapter.afaq', $afaq)
                ->where("chapter.{$statusColumn}", 1)
                ->where('question.afaq', $afaq)
                ->where('question.status', 1)
                ->where('question.type_id', '!=', 332)
                ->when($sourceChapterIds !== [], fn ($query) => $query->whereIn('chapter.id', $sourceChapterIds))
                ->when($sourceTopicIds !== [], fn ($query) => $query->whereIn('question.topic_id', $sourceTopicIds))
                ->when($exerciseQuestion !== null, fn ($query) => $query->where('question.exercise_question', $exerciseQuestion))
                ->when($sourcePattern === 'pef', fn ($query) => $query->where('question.status_pef', 1));
        };

        $questions = $this->source()
            ->table('pk_question as question')
            ->join('pk_chapter as chapter', 'chapter.id', '=', 'question.chapter_id');
        $applySourceScope($questions);
        $questionValues = $questions
            ->get([
                'question.statement_en',
                'question.statement_ur',
                'question.description_en',
                'question.description_ur',
                'question.answer_en',
                'question.answer_ur',
                'question.paragraph_questions',
            ])
            ->flatMap(fn (object $question) => array_values((array) $question))
            ->all();
        $this->assets->prefetchHtml($questionValues);
        unset($questionValues);

        $options = $this->source()
            ->table('pk_options as option')
            ->join('pk_question as question', 'question.id', '=', 'option.question_id')
            ->join('pk_chapter as chapter', 'chapter.id', '=', 'question.chapter_id');
        $applySourceScope($options);
        $optionValues = $options
            ->get([
                'option.option_en',
                'option.option_ur',
                'option.answer_en',
                'option.answer_ur',
            ])
            ->flatMap(fn (object $option) => array_values((array) $option))
            ->all();
        $this->assets->prefetchHtml($optionValues);
        $this->assets->finishPrefetch();
    }

    private function transferSubject(
        int $afaq,
        ?int $creatorId,
        string $sourcePattern,
        int $sourceClassId,
        int $sourceSubjectId,
        array $sourceChapterIds,
        array $sourceTopicIds,
        ?int $exerciseQuestion,
        bool $convertExercisesToTopics,
        string $statusColumn,
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
        $languagePresence = ['english' => false, 'urdu' => false];

        $sourceChapters = $this->source()
            ->table('pk_chapter')
            ->where('class_id', $sourceClassId)
            ->where('subject_id', $sourceSubjectId)
            ->where('afaq', $afaq)
            ->where($statusColumn, 1)
            ->when($sourceChapterIds !== [], fn ($query) => $query->whereIn('id', $sourceChapterIds))
            ->orderBy('chapter_number')
            ->orderBy('sort_int')
            ->orderBy('id')
            ->get();

        if ($sourceChapters->isEmpty()) {
            throw new RuntimeException('No source chapters matched the selected filters.');
        }

        foreach ($sourceChapters as $sourceChapter) {
            $this->recordLocalizedPayload($languagePresence, [
                'name_en' => $sourceChapter->name,
                'name_ur' => $sourceChapter->u_name,
            ]);
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

            $chapterTopicIds = [];
            $sourceTopics = $convertExercisesToTopics
                ? collect()
                : $this->source()
                    ->table('pk_topics')
                    ->where('chapter_id', $sourceChapter->id)
                    ->where('status', 1)
                    ->when($sourceTopicIds !== [], fn ($query) => $query->whereIn('id', $sourceTopicIds))
                    ->orderBy('sort_int')
                    ->orderBy('id')
                    ->get();

            $exerciseTopicMap = [];
            if ($convertExercisesToTopics) {
                $exerciseNames = $this->source()
                    ->table('pk_question')
                    ->where('chapter_id', $sourceChapter->id)
                    ->where('afaq', $afaq)
                    ->where('status', 1)
                    ->when($exerciseQuestion !== null, fn ($query) => $query->where('exercise_question', $exerciseQuestion))
                    ->where('type_id', '!=', 332)
                    ->when($sourcePattern === 'pef', fn ($query) => $query->where('status_pef', 1))
                    ->when($sourceTopicIds !== [], fn ($query) => $query->whereIn('topic_id', $sourceTopicIds))
                    ->orderBy('id')
                    ->pluck('exercise')
                    ->map(fn ($exercise) => $this->legacyExerciseTopicKey($exercise))
                    ->unique()
                    ->values();

                foreach ($exerciseNames as $sortId => $exerciseName) {
                    $topicName = $exerciseName === '__other__'
                        ? 'Other Questions'
                        : $exerciseName;
                    $topic = Topic::query()->updateOrCreate([
                        'chapter_id' => $chapter->id,
                        'name' => $this->limitedString($topicName, 150) ?? 'Other Questions',
                    ], [
                        'name_ur' => null,
                        'sort_id' => (int) $sortId,
                        'status' => 1,
                        'created_by' => $creatorId,
                    ]);
                    $exerciseTopicMap[$exerciseName] = $topic->id;
                    $chapterTopicIds[] = $topic->id;
                    $counts['topics']++;
                }
            }

            foreach ($sourceTopics as $sourceTopic) {
                $this->recordLocalizedPayload($languagePresence, [
                    'name_en' => $sourceTopic->name,
                    'name_ur' => $sourceTopic->u_name,
                ]);
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
                ->where('status', 1)
                ->when($exerciseQuestion !== null, fn ($query) => $query->where('exercise_question', $exerciseQuestion))
                ->where('type_id', '!=', 332)
                ->when($sourcePattern === 'pef', fn ($query) => $query->where('status_pef', 1))
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
                $embeddedPassageItems = $this->legacyPassageItems(
                    $sourceQuestion->paragraph_questions ?? null,
                );
                $hasEmbeddedPassageItems = $embeddedPassageItems !== [];
                $legacyOptionCount = $sourceOptions->count()
                    + collect($embeddedPassageItems)->sum(
                        fn (array $item) => count($item['options'] ?? []),
                    );
                $knownTypeCount = count($this->questionTypeMap);
                $questionType = $this->resolveQuestionType(
                    $sourceQuestion,
                    $sourceOptions->isNotEmpty() || $hasEmbeddedPassageItems,
                    $hasEmbeddedPassageItems,
                    $creatorId,
                );
                if (count($this->questionTypeMap) > $knownTypeCount) {
                    $counts['question_types']++;
                }

                [$payload, $options] = $this->buildQuestionPayload(
                    sourceQuestion: $sourceQuestion,
                    sourceOptions: $sourceOptions->all(),
                    questionType: $questionType,
                    targetChapterId: $chapter->id,
                    targetTopicId: $convertExercisesToTopics
                        ? ($exerciseTopicMap[$this->legacyExerciseTopicKey($sourceQuestion->exercise ?? null)] ?? null)
                        : ($topicMap[(int) ($sourceQuestion->topic_id ?? 0)] ?? null),
                    creatorId: $creatorId,
                );

                $this->recordLocalizedPayload($languagePresence, [
                    ...$payload,
                    'options' => $options,
                ]);

                $question = Question::query()->create($payload);

                if ($options !== []) {
                    $question->options()->createMany($options);
                }

                $counts['questions']++;
                $counts['options'] += $legacyOptionCount;
            }
        }

        $counts['medium'] = $this->mediumNameFromPresence($languagePresence);

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
            'medium_id' => $this->mediumId(
                $this->mediumNameFromPayload($questionPayload),
            ),
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

    private function mediumId(string $mediumName): ?int
    {
        if (! array_key_exists($mediumName, $this->mediumIdMap)) {
            $this->mediumIdMap[$mediumName] = Medium::query()
                ->where('name', $mediumName)
                ->value('id');
        }

        return $this->mediumIdMap[$mediumName];
    }

    private function mediumNameFromPayload(array $payload): string
    {
        $presence = ['english' => false, 'urdu' => false];
        $this->recordLocalizedPayload($presence, $payload);

        return $this->mediumNameFromPresence($presence);
    }

    private function recordLocalizedPayload(array &$presence, mixed $value): void
    {
        if (! is_array($value)) {
            return;
        }

        foreach ($value as $key => $item) {
            if ($key === 'options') {
                continue;
            }

            if (
                is_string($key)
                && ! is_array($item)
                && ! is_object($item)
                && $this->nullableString($item) !== null
            ) {
                if (str_ends_with($key, '_en')) {
                    $presence['english'] = true;
                }
                if (str_ends_with($key, '_ur')) {
                    $presence['urdu'] = true;
                }
            }

            if (is_array($item)) {
                $this->recordLocalizedPayload($presence, $item);
            }
        }
    }

    private function mediumNameFromPresence(array $presence): string
    {
        if ($presence['english'] && $presence['urdu']) {
            return 'Both';
        }

        if ($presence['urdu']) {
            return 'Urdu';
        }

        return 'English';
    }

    private function mergeMediumNames(?string $existing, string $detected): string
    {
        if ($existing === null || $existing === '') {
            return $detected;
        }

        return $existing === $detected ? $detected : 'Both';
    }

    private function legacyQuestionContent(string $schemaKey, object $question, array $sourceOptions): array
    {
        $statementEn = $this->assets->migrateHtml($this->nullableString($question->statement_en));
        $statementUr = $this->assets->migrateHtml($this->nullableString($question->statement_ur));
        $descriptionEn = $this->assets->migrateHtml($this->nullableString($question->description_en));
        $descriptionUr = $this->assets->migrateHtml($this->nullableString($question->description_ur));
        $answerEn = $this->assets->migrateHtml($this->nullableString($question->answer_en));
        $answerUr = $this->assets->migrateHtml($this->nullableString($question->answer_ur));
        $paragraph = $this->assets->migrateHtml($this->nullableString($question->paragraph_questions));
        $options = $this->legacyOptions($sourceOptions);
        $passageItems = $this->legacyPassageItems(
            $question->paragraph_questions ?? null,
        );

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
                'passage_en' => $passageItems !== []
                    ? ($statementEn ?? $descriptionEn ?? '')
                    : ($paragraph ?? $descriptionEn ?? $statementEn ?? ''),
                'passage_ur' => $passageItems !== []
                    ? ($statementUr ?? $descriptionUr ?? '')
                    : ($descriptionUr ?? $statementUr ?? ''),
                'items' => $passageItems !== []
                    ? $passageItems
                    : [[
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
            QuestionTypeSchemaRegistry::SUBJECTIVE_SAME_STATEMENT => [
                'prompt_en' => $statementEn ?? '',
                'prompt_ur' => $statementUr ?? '',
                'shared_en' => $descriptionEn ?? '',
                'shared_ur' => $descriptionUr ?? '',
                'answer_en' => $answerEn ?? '',
                'answer_ur' => $answerUr ?? '',
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

    private function legacyPassageItems(mixed $raw): array
    {
        if (! is_string($raw) || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);

        if (! is_array($decoded)) {
            return [];
        }

        $items = array_is_list($decoded) ? $decoded : [$decoded];

        return collect($items)
            ->filter(fn (mixed $item) => is_array($item))
            ->map(function (array $item): array {
                $promptEn = $this->assets->migrateHtml($this->nullableString(
                    $item['prompt_en'] ?? $item['statement_en'] ?? null,
                )) ?? '';
                $promptUr = $this->assets->migrateHtml($this->nullableString(
                    $item['prompt_ur'] ?? $item['statement_ur'] ?? null,
                )) ?? '';
                $options = collect(is_array($item['options'] ?? null)
                    ? $item['options']
                    : [])
                    ->filter(fn (mixed $option) => is_array($option))
                    ->map(function (array $option): array {
                        return [
                            'text_en' => $this->assets->migrateHtml($this->nullableString(
                                $option['text_en']
                                    ?? $option['option_en']
                                    ?? $option['name_en']
                                    ?? $option['name']
                                    ?? null,
                            )) ?? '',
                            'text_ur' => $this->assets->migrateHtml($this->nullableString(
                                $option['text_ur']
                                    ?? $option['option_ur']
                                    ?? $option['name_ur']
                                    ?? null,
                            )) ?? '',
                            'is_correct' => $this->legacyBoolean(
                                $option['is_correct']
                                    ?? $option['is_true']
                                    ?? false,
                            ),
                        ];
                    })
                    ->filter(
                        fn (array $option) => $option['text_en'] !== ''
                            || $option['text_ur'] !== '',
                    )
                    ->values()
                    ->all();

                return [
                    'prompt_en' => $promptEn,
                    'prompt_ur' => $promptUr,
                    'options' => $options,
                ];
            })
            ->filter(
                fn (array $item) => $item['prompt_en'] !== ''
                    || $item['prompt_ur'] !== ''
                    || $item['options'] !== [],
            )
            ->values()
            ->all();
    }

    private function legacyBoolean(mixed $value): bool
    {
        return in_array(
            strtolower(trim((string) $value)),
            ['1', 'true', 'yes', 'on'],
            true,
        );
    }

    private function legacyOptions(array $sourceOptions): array
    {
        return collect($sourceOptions)
            ->map(fn (object $option) => [
                'text_en' => $this->assets->migrateHtml(
                    $this->nullableString($option->option_en) ?? $this->nullableString($option->answer_en),
                ) ?? '',
                'text_ur' => $this->assets->migrateHtml(
                    $this->nullableString($option->option_ur) ?? $this->nullableString($option->answer_ur),
                ) ?? '',
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

    private function resolveQuestionType(
        object $sourceQuestion,
        bool $hasOptions,
        bool $hasEmbeddedPassageItems,
        ?int $creatorId,
    ): QuestionType {
        $sourceTypeId = (int) $sourceQuestion->type_id;
        $sourceType = $this->resolveLegacyQuestionType(
            sourceTypeId: $sourceTypeId,
            hasOptions: $hasOptions,
            hasEmbeddedPassageItems: $hasEmbeddedPassageItems,
        );

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

        $isSameStatement = in_array($sourceTypeId, self::LEGACY_SAME_STATEMENT_TYPES, true);
        $isObjective = $isSameStatement
            ? false
            : (bool) ($sourceType->is_objective ?? $hasOptions);
        // Group objective rows by their legacy parent objective type.
        $objectiveGroupId = (int) ($sourceType->objective_type_id ?? 0);
        $mapKey = $isObjective
            ? 'objective:'.($objectiveGroupId > 0 ? $objectiveGroupId : $sourceTypeId)
            : "subjective:{$sourceTypeId}";

        if (isset($this->questionTypeMap[$mapKey])) {
            return QuestionType::query()->findOrFail($this->questionTypeMap[$mapKey]);
        }

        $schemaKey = $isSameStatement
            ? QuestionTypeSchemaRegistry::SUBJECTIVE_SAME_STATEMENT
            : QuestionTypeSchemaRegistry::infer($isObjective, [
                'objective_type_id' => (int) ($sourceType->objective_type_id ?? 0),
                'have_description' => (bool) ($sourceType->have_description ?? false),
                'have_answer' => (bool) ($sourceType->have_answer ?? true),
            ]);
        $baseName = $this->limitedString($sourceType->type_name, 100) ?? "Legacy Type {$sourceTypeId}";
        $name = $this->uniqueQuestionTypeName($baseName, $schemaKey);
        $questionType = QuestionType::query()->firstOrNew(['name' => $name]);
        $questionType->fill([
            'name_ur' => $this->limitedString($sourceType->type_name_ur ?? null, 100),
            'heading_en' => $this->limitedString($sourceType->heading_en ?? null, 150) ?? $baseName,
            'heading_ur' => $this->limitedString($sourceType->heading_ur ?? null, 150),
            'description_en' => $this->nullableString($sourceType->description_en ?? null),
            'description_ur' => $this->nullableString($sourceType->description_ur ?? null),
            'have_exercise' => (int) ($sourceType->have_exercise ?? 0),
            'have_statement' => $isSameStatement
                ? 1
                : (int) ($sourceType->have_statment ?? 1),
            'statement_label' => $isSameStatement
                ? 'Question'
                : $this->limitedString($sourceType->statement_label ?? null, 100),
            'have_description' => $isSameStatement
                ? 1
                : (int) ($sourceType->have_description ?? 0),
            'description_label' => $isSameStatement
                ? 'Shared Statement'
                : $this->limitedString($sourceType->description_label ?? null, 100),
            'have_answer' => (int) ($sourceType->have_answer ?? ($hasOptions ? 0 : 1)),
            'is_single' => $isSameStatement
                ? 0
                : (int) ($sourceType->is_single ?? 1),
            'is_objective' => $isObjective,
            'schema_key' => $schemaKey,
            'objective_type_id' => null,
            'column_per_row' => (int) ($sourceType->column_per_row ?? 1),
            'status' => 1,
            'created_by' => $creatorId,
        ]);
        $questionType->save();

        $this->questionTypeMap[$mapKey] = $questionType->id;

        return $questionType;
    }

    private function resolveLegacyQuestionType(
        int $sourceTypeId,
        bool $hasOptions,
        bool $hasEmbeddedPassageItems,
    ): ?object {
        if ($hasEmbeddedPassageItems) {
            $passageType = $this->source()
                ->table('pk_question_types')
                ->where('objective_type_id', 5)
                ->where('is_objective', 1)
                ->orderBy('id_order')
                ->first();

            if ($passageType) {
                return $passageType;
            }
        }

        // The legacy question stores the parent objective id; its child row
        // owns the user-facing name and the printed English/Urdu headings.
        $objectiveType = $this->source()
            ->table('pk_question_types')
            ->where('objective_type_id', $sourceTypeId)
            ->where('is_objective', 1)
            ->orderBy('id_order')
            ->orderBy('id')
            ->first();

        if ($objectiveType) {
            return $objectiveType;
        }

        return $this->source()->table('pk_question_types')->where('id', $sourceTypeId)->first()
            ?? $this->resolveQuestionTypeByOrder($sourceTypeId, $hasOptions);
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

    private function validateTargetScope(array $options): void
    {
        $targetPatternId = ! empty($options['target_pattern_id'])
            ? (int) $options['target_pattern_id']
            : null;
        $targetClassId = ! empty($options['target_class_id'])
            ? (int) $options['target_class_id']
            : null;
        $targetSubjectId = ! empty($options['target_subject_id'])
            ? (int) $options['target_subject_id']
            : null;

        if ($targetPatternId === null || $targetClassId === null || $targetSubjectId === null) {
            return;
        }

        $isAttached = DB::table('class_subjects')
            ->where('pattern_id', $targetPatternId)
            ->where('class_id', $targetClassId)
            ->where('subject_id', $targetSubjectId)
            ->exists();

        if (! $isAttached) {
            throw new RuntimeException(
                'The selected target subject is not attached to the selected target pattern and class.',
            );
        }
    }

    private function validateSourceSelection(
        string $sourcePattern,
        int $sourceClassId,
        int $sourceSubjectId,
        array $sourceChapterIds,
        array $sourceTopicIds,
    ): void {
        $afaq = $this->sourceAfaq($sourcePattern);
        $statusColumn = $this->sourceChapterStatusColumn($sourcePattern);

        if ($sourceChapterIds !== []) {
            $validChapterIds = $this->source()
                ->table('pk_chapter')
                ->whereIn('id', $sourceChapterIds)
                ->where('class_id', $sourceClassId)
                ->where('subject_id', $sourceSubjectId)
                ->where('afaq', $afaq)
                ->where($statusColumn, 1)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $invalidChapterIds = array_diff($sourceChapterIds, $validChapterIds);
            if ($invalidChapterIds !== []) {
                throw new RuntimeException(
                    'One or more selected source chapters do not belong to the selected source pattern, class, and subject.',
                );
            }
        }

        if ($sourceTopicIds !== []) {
            $validTopicIds = $this->source()
                ->table('pk_topics as topic')
                ->join('pk_chapter as chapter', 'chapter.id', '=', 'topic.chapter_id')
                ->whereIn('topic.id', $sourceTopicIds)
                ->where('topic.status', 1)
                ->where('chapter.class_id', $sourceClassId)
                ->where('chapter.subject_id', $sourceSubjectId)
                ->where('chapter.afaq', $afaq)
                ->where("chapter.{$statusColumn}", 1)
                ->pluck('topic.id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $invalidTopicIds = array_diff($sourceTopicIds, $validTopicIds);
            if ($invalidTopicIds !== []) {
                throw new RuntimeException(
                    'One or more selected source topics do not belong to the selected source pattern, class, and subject.',
                );
            }
        }
    }

    private function sourceSubjectType(string $sourcePattern, int $sourceClassId, int $sourceSubjectId): string
    {
        $afaq = $this->sourceAfaq($sourcePattern);
        $statusColumn = $this->sourceChapterStatusColumn($sourcePattern);
        $topicsCount = $this->source()
            ->table('pk_topics as topic')
            ->join('pk_chapter as chapter', 'chapter.id', '=', 'topic.chapter_id')
            ->join('pk_question as question', function ($join) use ($afaq, $sourcePattern): void {
                $join->on('question.topic_id', '=', 'topic.id')
                    ->where('question.afaq', '=', $afaq)
                    ->where('question.status', '=', 1);
                if ($sourcePattern === 'pef') {
                    $join->where('question.status_pef', '=', 1);
                }
            })
            ->where('chapter.class_id', $sourceClassId)
            ->where('chapter.subject_id', $sourceSubjectId)
            ->where('chapter.afaq', $afaq)
            ->where("chapter.{$statusColumn}", 1)
            ->where('topic.status', 1)
            ->distinct()
            ->count('topic.id');

        return $topicsCount > 0 ? 'topic-wise' : 'chapter-wise';
    }

    private function isLegacyExerciseBasedMathSubject(int $sourceSubjectId): bool
    {
        return in_array($sourceSubjectId, self::LEGACY_EXERCISE_BASED_MATH_SUBJECT_IDS, true);
    }

    private function sourceUsesExerciseTopics(
        string $sourcePattern,
        int $sourceClassId,
        int $sourceSubjectId,
    ): bool {
        if (! $this->isLegacyExerciseBasedMathSubject($sourceSubjectId)) {
            return false;
        }

        $afaq = $this->sourceAfaq($sourcePattern);
        $statusColumn = $this->sourceChapterStatusColumn($sourcePattern);
        $counts = $this->source()
            ->table('pk_question as question')
            ->join('pk_chapter as chapter', 'chapter.id', '=', 'question.chapter_id')
            ->where('chapter.class_id', $sourceClassId)
            ->where('chapter.subject_id', $sourceSubjectId)
            ->where('chapter.afaq', $afaq)
            ->where("chapter.{$statusColumn}", 1)
            ->where('question.afaq', $afaq)
            ->where('question.status', 1)
            ->when($sourcePattern === 'pef', fn ($query) => $query->where('question.status_pef', 1))
            ->selectRaw("count(distinct question.id) as questions_count, count(distinct case when trim(coalesce(question.exercise, '')) <> '' then question.id end) as exercise_questions_count")
            ->first();

        return $this->hasExerciseBasedMathData(
            sourceSubjectId: $sourceSubjectId,
            questionsCount: (int) ($counts->questions_count ?? 0),
            exerciseQuestionsCount: (int) ($counts->exercise_questions_count ?? 0),
        );
    }

    private function hasExerciseBasedMathData(
        int $sourceSubjectId,
        int $questionsCount,
        int $exerciseQuestionsCount,
    ): bool {
        return $this->isLegacyExerciseBasedMathSubject($sourceSubjectId)
            && $questionsCount > 0
            && ($exerciseQuestionsCount / $questionsCount) >= self::EXERCISE_TOPIC_MINIMUM_COVERAGE;
    }

    private function resolveQuestionSource(object $sourceQuestion): string
    {
        return match ((int) ($sourceQuestion->exercise_question ?? 0)) {
            1 => Question::SOURCE_EXERCISE,
            2 => Question::SOURCE_PAST_PAPER,
            3 => Question::SOURCE_EXERCISE_EXAMPLES,
            4 => Question::SOURCE_CONCEPTUAL_QUESTIONS,
            default => (int) ($sourceQuestion->past_paper_questions ?? 0) === 1
                ? Question::SOURCE_PAST_PAPER
                : Question::SOURCE_ADDITIONAL,
        };
    }

    private function legacyExerciseTopicKey(mixed $value): string
    {
        $normalized = trim(preg_replace('/\s+/', ' ', (string) $value) ?? '');

        return $normalized === '' ? '__other__' : $normalized;
    }

    private function sourceAfaq(string $sourcePattern): int
    {
        $pattern = self::SOURCE_PATTERNS[$sourcePattern] ?? null;

        if (! $pattern) {
            throw new RuntimeException("Unsupported source pattern: {$sourcePattern}");
        }

        return $pattern['afaq'];
    }

    private function sourceChapterStatusColumn(string $sourcePattern): string
    {
        return $sourcePattern === 'pef' ? 'status_pef' : 'status';
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

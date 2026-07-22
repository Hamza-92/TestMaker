<?php

namespace App\Console\Commands;

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
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportLegacySubjects extends Command
{
    protected $signature = 'legacy:import-subjects \
        {classId : Source class id} \
        {subjectIds : Comma-separated source subject ids} \
        {--source=source_mysql : Source database connection} \
        {--target-pattern=PECTA : Target pattern short_name}';

    protected $description = 'Import selected legacy subjects and related content from a source database.';

    public function handle(): int
    {
        $sourceConnection = $this->option('source');
        $targetPatternShortName = $this->option('target-pattern');
        $classId = (int) $this->argument('classId');
        $subjectIds = array_values(array_filter(array_map('intval', explode(',', $this->argument('subjectIds')))));

        $source = DB::connection($sourceConnection);

        $sourceClass = $source->table('pk_class')->find($classId);
        if ($sourceClass === null) {
            $this->error("Source class with id {$classId} was not found on connection '{$sourceConnection}'.");
            return self::FAILURE;
        }

        $sourceSubjects = $source->table('pk_subject')->whereIn('id', $subjectIds)->get()->keyBy('id');
        $missingSubjects = array_diff($subjectIds, $sourceSubjects->keys()->all());
        if (! empty($missingSubjects)) {
            $this->error('Missing source subjects: '.implode(', ', $missingSubjects));
            return self::FAILURE;
        }

        $targetPattern = Pattern::where('short_name', $targetPatternShortName)->first();
        if ($targetPattern === null) {
            $this->error("Target pattern '{$targetPatternShortName}' was not found in the current database.");
            return self::FAILURE;
        }

        $admin = User::firstWhere('email', 'admin@testmaker.com') ?? User::first();
        $createdBy = $admin?->id;

        $this->info('Beginning legacy import...');

        $questionTypeMap = [];
        $chapterMap = [];
        $topicMap = [];

        DB::transaction(function () use (
            $source,
            $sourceClass,
            $sourceSubjects,
            $targetPattern,
            $classId,
            $subjectIds,
            $createdBy,
            &$questionTypeMap,
            &$chapterMap,
            &$topicMap
        ) {
            $newClass = SchoolClass::firstOrCreate(
                ['name' => $sourceClass->name],
                array_filter([
                    'status' => property_exists($sourceClass, 'status') ? $sourceClass->status : 1,
                    'created_by' => $createdBy,
                    'created_at' => property_exists($sourceClass, 'created_at') ? $this->normalizeTimestamp($sourceClass->created_at) : null,
                    'updated_at' => property_exists($sourceClass, 'updated_at') ? $this->normalizeTimestamp($sourceClass->updated_at) : null,
                ], fn ($value) => $value !== null)
            );

            $newClass->patterns()->syncWithoutDetaching([$targetPattern->id]);
            $this->line("Created or reused class '{$newClass->name}' (id: {$newClass->id}).");

            foreach ($subjectIds as $subjectId) {
                $sourceSubject = (array) $sourceSubjects->get($subjectId);

                $newSubject = Subject::firstOrCreate(
                    ['name_eng' => $sourceSubject['name']],
                    array_filter([
                        'name_ur' => $sourceSubject['name_ur'] ?? null,
                        'subject_type' => $sourceSubject['subject_type'] ?? 'chapter-wise',
                        'status' => $sourceSubject['status_punjab'] ?? $sourceSubject['status_smart'] ?? 1,
                        'created_by' => $createdBy,
                        'created_at' => $this->normalizeTimestamp($sourceSubject['created_at'] ?? null),
                    ], fn ($value) => $value !== null)
                );

                ClassSubject::firstOrCreate([
                    'class_id' => $newClass->id,
                    'pattern_id' => $targetPattern->id,
                    'subject_id' => $newSubject->id,
                ], []);

                $this->line("Imported subject '{$newSubject->name_eng}' (id: {$newSubject->id}).");

                $sourceChapters = $source->table('pk_chapter')
                    ->where('class_id', $sourceClass->id)
                    ->where('subject_id', $subjectId)
                    ->orderBy('chapter_number')
                    ->get();

                foreach ($sourceChapters as $sourceChapter) {
                    $chapter = Chapter::updateOrCreate(
                        [
                            'subject_id' => $newSubject->id,
                            'class_id' => $newClass->id,
                            'pattern_id' => $targetPattern->id,
                            'chapter_number' => $sourceChapter->chapter_number,
                        ],
                        array_filter([
                            'name' => $sourceChapter->name,
                            'name_ur' => $sourceChapter->u_name,
                            'sort_id' => $sourceChapter->sort_int ?? 0,
                            'status' => $sourceChapter->status ?? 1,
                            'created_by' => $createdBy,
                            'created_at' => $this->normalizeTimestamp($sourceChapter->created_at ?? null),
                            'updated_at' => $this->normalizeTimestamp($sourceChapter->created_at ?? null),
                        ], fn ($value) => $value !== null)
                    );

                    $chapterMap[$sourceChapter->id] = $chapter->id;
                    $this->line("  Chapter '{$chapter->name}' -> id {$chapter->id}.");

                    $sourceTopics = $source->table('pk_topics')
                        ->where('chapter_id', $sourceChapter->id)
                        ->orderBy('sort_int')
                        ->get();

                    foreach ($sourceTopics as $sourceTopic) {
                        $topic = Topic::updateOrCreate(
                            [
                                'chapter_id' => $chapter->id,
                                'name' => $sourceTopic->name,
                            ],
                            array_filter([
                                'name_ur' => $sourceTopic->u_name,
                                'sort_id' => $sourceTopic->sort_int ?? 0,
                                'status' => $sourceTopic->status ?? 1,
                                'created_by' => $createdBy,
                                'created_at' => $this->normalizeTimestamp($sourceTopic->created_at ?? null),
                                'updated_at' => $this->normalizeTimestamp($sourceTopic->created_at ?? null),
                            ], fn ($value) => $value !== null)
                        );

                        $topicMap[$sourceTopic->id] = $topic->id;
                        $this->line("    Topic '{$topic->name}' -> id {$topic->id}.");
                    }

                    $sourceQuestions = $source->table('pk_question')
                        ->where('chapter_id', $sourceChapter->id)
                        ->orderBy('id')
                        ->get();

                    foreach ($sourceQuestions as $sourceQuestion) {
                        $questionTypeId = $this->resolveQuestionType(
                            $source,
                            $sourceQuestion->type_id,
                            $createdBy,
                            $questionTypeMap
                        );

                        $topicId = null;
                    if (isset($sourceQuestion->topic_id) && $sourceQuestion->topic_id !== null && $sourceQuestion->topic_id !== '') {
                        $topicId = $topicMap[$sourceQuestion->topic_id] ?? null;
                    }

                    $questionPayload = array_filter([
                            'question_type_id' => $questionTypeId,
                            'chapter_id' => $chapter->id,
                            'topic_id' => $topicId,
                            'statement_en' => $sourceQuestion->statement_en,
                            'statement_ur' => $sourceQuestion->statement_ur,
                            'description_en' => $sourceQuestion->description_en,
                            'description_ur' => $sourceQuestion->description_ur,
                            'answer_en' => $sourceQuestion->answer_en,
                            'answer_ur' => $sourceQuestion->answer_ur,
                            'status' => $sourceQuestion->status ?? 1,
                            'created_by' => $createdBy,
                            'created_at' => $this->normalizeTimestamp($sourceQuestion->created_at ?? null),
                            'updated_at' => $this->normalizeTimestamp($sourceQuestion->created_at ?? null),
                        ], fn ($value) => $value !== null);

                        $question = Question::updateOrCreate(
                            [
                                'chapter_id' => $questionPayload['chapter_id'],
                                'topic_id' => $topicId,
                                'statement_en' => $questionPayload['statement_en'],
                            ],
                            $questionPayload
                        );

                        $this->line("      Question id {$question->id} created.");

                        $sourceOptions = $source->table('pk_options')
                            ->where('question_id', $sourceQuestion->id)
                            ->orderBy('id')
                            ->get();

                        foreach ($sourceOptions as $sourceOption) {
                            QuestionOption::firstOrCreate([
                                'question_id' => $question->id,
                                'text_en' => $sourceOption->option_en,
                                'sort_order' => $sourceOption->id,
                            ], [
                                'text_ur' => $sourceOption->option_ur,
                                'is_correct' => $sourceOption->is_correct,
                            ]);
                        }
                    }
                }
            }
        });

        $this->info('Legacy import complete.');

        return self::SUCCESS;
    }

    private function resolveQuestionType(object $source, mixed $sourceQuestionTypeId, ?int $createdBy, array &$map): int
    {
        if ($sourceQuestionTypeId === null || $sourceQuestionTypeId === '' || $sourceQuestionTypeId === 0) {
            throw new \RuntimeException('Source question type id is missing');
        }

        if (isset($map[$sourceQuestionTypeId])) {
            return $map[$sourceQuestionTypeId];
        }

        $sourceQuestionType = $this->findSourceQuestionType($source, $sourceQuestionTypeId);
        if ($sourceQuestionType === null) {
            $this->error("Source question_type id {$sourceQuestionTypeId} not found.");
            throw new \RuntimeException('Source question type missing');
        }

        $targetQuestionType = QuestionType::firstOrCreate(
            ['name' => $sourceQuestionType->type_name],
            array_filter([
                'name_ur' => $sourceQuestionType->type_name_ur ?? null,
                'heading_en' => $sourceQuestionType->heading_en ?? $sourceQuestionType->type_name,
                'heading_ur' => $sourceQuestionType->heading_ur ?? null,
                'description_en' => $sourceQuestionType->description_en ?? null,
                'description_ur' => $sourceQuestionType->description_ur ?? null,
                'have_exercise' => $sourceQuestionType->have_exercise ?? 0,
                'have_statement' => $sourceQuestionType->have_statment ?? 1,
                'statement_label' => $sourceQuestionType->statement_label ?? null,
                'have_description' => $sourceQuestionType->have_description ?? 0,
                'description_label' => $sourceQuestionType->description_label ?? null,
                'have_answer' => $sourceQuestionType->have_answer ?? 1,
                'is_single' => $sourceQuestionType->is_single ?? 1,
                'is_objective' => $sourceQuestionType->is_objective ?? 0,
                'schema_key' => property_exists($sourceQuestionType, 'schema_key') ? $sourceQuestionType->schema_key : null,
                'objective_type_id' => $this->resolveQuestionTypeObjective($source, $sourceQuestionType->objective_type_id ?? null, $createdBy, $map),
                'column_per_row' => $sourceQuestionType->column_per_row ?? 1,
                'status' => $sourceQuestionType->status ?? 1,
                'created_by' => $createdBy,
                'created_at' => $this->normalizeTimestamp($sourceQuestionType->created_at ?? null),
                'updated_at' => $this->normalizeTimestamp($sourceQuestionType->created_at ?? null),
            ], fn ($value) => $value !== null)
        );

        $map[$sourceQuestionTypeId] = $targetQuestionType->id;

        return $targetQuestionType->id;
    }

    private function findSourceQuestionType(object $source, mixed $questionTypeId): ?object
    {
        if (is_numeric($questionTypeId)) {
            $numeric = (int) $questionTypeId;
            $type = $source->table('pk_question_types')->where('id_order', $numeric)->first();
            if ($type !== null) {
                return $type;
            }
        }

        return $source->table('pk_question_types')->find($questionTypeId);
    }

    private function resolveQuestionTypeObjective(object $source, ?int $objectiveTypeId, ?int $createdBy, array &$map): ?int
    {
        if ($objectiveTypeId === null) {
            return null;
        }

        if (isset($map[$objectiveTypeId])) {
            return $map[$objectiveTypeId];
        }

        $sourceObjective = $this->findSourceQuestionType($source, $objectiveTypeId);
        if ($sourceObjective === null) {
            return null;
        }

        $targetObjective = QuestionType::firstOrCreate(
            ['name' => $sourceObjective->type_name],
            array_filter([
                'name_ur' => $sourceObjective->type_name_ur ?? null,
                'heading_en' => $sourceObjective->heading_en ?? $sourceObjective->type_name,
                'heading_ur' => $sourceObjective->heading_ur ?? null,
                'description_en' => $sourceObjective->description_en ?? null,
                'description_ur' => $sourceObjective->description_ur ?? null,
                'have_exercise' => $sourceObjective->have_exercise ?? 0,
                'have_statement' => $sourceObjective->have_statment ?? 1,
                'statement_label' => $sourceObjective->statement_label ?? null,
                'have_description' => $sourceObjective->have_description ?? 0,
                'description_label' => $sourceObjective->description_label ?? null,
                'have_answer' => $sourceObjective->have_answer ?? 1,
                'is_single' => $sourceObjective->is_single ?? 1,
                'is_objective' => $sourceObjective->is_objective ?? 0,
                'schema_key' => property_exists($sourceObjective, 'schema_key') ? $sourceObjective->schema_key : null,
                'objective_type_id' => null,
                'column_per_row' => $sourceObjective->column_per_row ?? 1,
                'status' => $sourceObjective->status ?? 1,
                'created_by' => $createdBy,
                'created_at' => $this->normalizeTimestamp($sourceObjective->created_at ?? null),
                'updated_at' => $this->normalizeTimestamp($sourceObjective->created_at ?? null),
            ], fn ($value) => $value !== null)
        );

        $map[$objectiveTypeId] = $targetObjective->id;

        return $targetObjective->id;
    }

    private function normalizeTimestamp(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateTimeString();
        } catch (\Throwable) {
            return null;
        }
    }
}

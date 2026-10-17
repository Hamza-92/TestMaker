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
use App\Support\Questions\QuestionTypeSchemaRegistry as SchemaKeys;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class LegacyExportService
{
    private const CONNECTION = 'legacy_mysql';

    private const SOURCES = [
        Question::SOURCE_ADDITIONAL => 0,
        Question::SOURCE_EXERCISE => 1,
        Question::SOURCE_PAST_PAPER => 2,
        Question::SOURCE_EXERCISE_EXAMPLES => 3,
        Question::SOURCE_CONCEPTUAL_QUESTIONS => 4,
    ];

    private const SUPPORTED = [
        SchemaKeys::OBJECTIVE_MCQ,
        SchemaKeys::OBJECTIVE_BLANK_CHOICE,
        SchemaKeys::OBJECTIVE_BLANK_OPEN,
        SchemaKeys::OBJECTIVE_TRUE_FALSE,
        SchemaKeys::OBJECTIVE_PASSAGE_MCQ,
        SchemaKeys::SUBJECTIVE_STANDARD,
        SchemaKeys::SUBJECTIVE_SAME_STATEMENT,
    ];

    private ?array $sharedStatementTypeNames = null;

    private array $typeIssues = [];

    public function catalog(array $filter): array
    {
        $patternId = (int) ($filter['pattern_id'] ?? 0);
        $classId = (int) ($filter['class_id'] ?? 0);
        $subjectId = (int) ($filter['subject_id'] ?? 0);
        $afaq = (int) ($filter['afaq'] ?? 0);
        $chapterFilterId = (int) ($filter['chapter_id'] ?? 0);
        $topicFilterId = (int) ($filter['topic_id'] ?? 0);
        $typeFilterId = (int) ($filter['question_type_id'] ?? 0);

        $result = [
            'patterns' => Pattern::query()->orderBy('sort_order')->get(['id', 'name']),
            'classes' => $patternId ? SchoolClass::query()->whereHas('patterns', fn ($q) => $q->whereKey($patternId))->ordered()->get(['classes.id', 'classes.name']) : [],
            'subjects' => $patternId && $classId ? Subject::query()->whereHas('classSubjects', fn ($q) => $q->where('pattern_id', $patternId)->where('class_id', $classId))->orderBy('name_eng')->get(['id', 'name_eng', 'name_ur']) : [],
            'legacy_classes' => DB::connection(self::CONNECTION)->table('pk_class')->orderBy('id_order')->get(['id', 'name']),
            'legacy_subjects' => DB::connection(self::CONNECTION)->table('pk_subject')->orderBy('name')->get(['id', 'name', 'afaq']),
            'legacy_question_types' => DB::connection(self::CONNECTION)->table('pk_question_types')
                ->orderBy('type_name')->get(['id', 'type_name', 'is_objective', 'objective_type_id']),
        ];

        if ($patternId && $classId && $subjectId && $this->scopeExists($patternId, $classId, $subjectId)) {
            $chapters = Chapter::query()->where('pattern_id', $patternId)->where('class_id', $classId)->where('subject_id', $subjectId)->orderBy('sort_id')->orderBy('id')->get(['id', 'name', 'chapter_number']);
            $chapterIds = $chapters->pluck('id');
            $result['chapters'] = $chapters;
            $result['topics'] = Topic::query()->whereIn('chapter_id', $chapterIds)->orderBy('chapter_id')->orderBy('sort_id')->get(['id', 'chapter_id', 'name']);
            $result['question_types'] = QuestionType::query()->whereIn('id', Question::query()->whereIn('chapter_id', $chapterIds)->select('question_type_id'))->orderBy('name')->get(['id', 'name', 'schema_key', 'is_objective']);
            $result['type_mappings'] = DB::table('legacy_export_items')->where('entity_type', 'question_type')->whereIn('entity_id', $result['question_types']->pluck('id'))->pluck('legacy_id', 'entity_id');
            $result['questions'] = Question::query()->whereIn('chapter_id', $chapterIds)
                ->when($chapterFilterId, fn ($query) => $query->where('chapter_id', $chapterFilterId))
                ->when($topicFilterId, fn ($query) => $query->where('topic_id', $topicFilterId))
                ->when($typeFilterId, fn ($query) => $query->where('question_type_id', $typeFilterId))
                ->selectRaw('id, chapter_id, topic_id, question_type_id, schema_key, substr(statement_en, 1, 300) as statement_en, substr(statement_ur, 1, 300) as statement_ur')
                ->orderBy('id')->paginate((int) ($filter['per_page'] ?? 50), ['*'], 'page', max(1, (int) ($filter['page'] ?? 1)));
        } else {
            $result += ['chapters' => [], 'topics' => [], 'question_types' => [], 'type_mappings' => [], 'questions' => null];
        }

        $result['legacy_patterns'] = [
            ['id' => 0, 'name' => 'Punjab'], ['id' => 1, 'name' => 'AFAQ'],
            ['id' => 2, 'name' => 'Oxford'], ['id' => 3, 'name' => 'Short Syllabus / PEF'],
            ['id' => 4, 'name' => 'Federal'], ['id' => 5, 'name' => 'AFAQ Sons'],
            ['id' => 6, 'name' => 'AJK'], ['id' => 7, 'name' => 'KPK'],
            ['id' => 8, 'name' => 'SS'], ['id' => 9, 'name' => 'Sindh'],
        ];
        $result['selected_legacy_pattern'] = $afaq;

        return $result;
    }

    public function preview(array $selection): array
    {
        $this->assertTarget($selection);
        $questions = $this->questions($selection);
        $unsupported = [];
        $ready = 0;
        foreach ($questions->with(['options', 'questionType'])->lazy(200) as $question) {
            $reason = $this->unsupportedReason($question, $selection);
            if ($reason) {
                $unsupported[$reason] = ($unsupported[$reason] ?? 0) + 1;
            } else {
                $ready++;
            }
        }

        return [
            'total' => $ready + array_sum($unsupported),
            'ready' => $ready,
            'unsupported' => $unsupported,
            'chapters' => $this->chapters($selection)->count(),
            'target' => $this->targetLabels($selection),
            'replace_existing' => (bool) ($selection['replace_existing'] ?? false),
            'type_destinations' => $this->typeDestinations($selection),
        ];
    }

    private function typeDestinations(array $selection): array
    {
        $types = QuestionType::query()->whereIn('id', $this->questions($selection)->select('question_type_id'))
            ->get(['id', 'name', 'is_objective', 'schema_key']);
        $legacy = DB::connection(self::CONNECTION);

        return $types->map(function (QuestionType $type) use ($selection, $legacy): array {
            $overrideId = (int) ($selection['legacy_type_ids'][$type->id] ?? 0);
            $mappedId = DB::table('legacy_export_items')->where('entity_type', 'question_type')->where('entity_id', $type->id)->value('legacy_id');
            $target = $overrideId
                ? $legacy->table('pk_question_types')->where('id', $overrideId)->first(['id', 'type_name', 'is_objective', 'objective_type_id'])
                : ($mappedId
                    ? $legacy->table('pk_question_types')->where('id', $mappedId)->first(['id', 'type_name', 'is_objective', 'objective_type_id'])
                    : $legacy->table('pk_question_types')->where('type_name', $type->name)->where('is_objective', (int) $type->is_objective)->first(['id', 'type_name', 'is_objective', 'objective_type_id']));
            if ($overrideId && ! $target) {
                throw new RuntimeException("Old question type {$overrideId} no longer exists.");
            }
            $incompatible = $target && ((bool) $target->is_objective !== (bool) $type->is_objective
                || ($type->is_objective && ! $this->compatibleObjectiveParent($type->schema_key, (int) $target->objective_type_id))
                || ($type->schema_key === SchemaKeys::SUBJECTIVE_SAME_STATEMENT && ! in_array((int) $target->id, [336, 386], true)));
            if ($overrideId && $incompatible) {
                throw new RuntimeException("Old question type {$target->id} is incompatible with {$type->name}.");
            }

            return [
                'source_id' => $type->id,
                'source_name' => $type->name,
                'legacy_id' => $target->id ?? null,
                'legacy_name' => $incompatible ? 'Incompatible old type' : ($target->type_name ?? ($mappedId ? 'Missing saved type' : 'New type')),
                'question_type_id' => $target && ! $incompatible ? ($type->is_objective ? (int) $target->objective_type_id : (int) $target->id) : null,
            ];
        })->all();
    }

    public function export(array $selection, ?int $userId): array
    {
        $this->assertTarget($selection);
        $preview = $this->preview($selection);
        $report = ['created' => 0, 'updated' => 0, 'matched' => 0, 'unchanged' => 0, 'skipped' => 0, 'conflicts' => 0, 'questions_created' => 0, 'questions_updated' => 0, 'errors' => []];
        $chapterMap = [];
        $topicMap = [];
        $typeMap = [];

        foreach ($this->chapters($selection)->lazy(200) as $chapter) {
            try {
                $chapterMap[$chapter->id] = $this->ensureChapter($chapter, $selection, $report);
            } catch (RuntimeException $e) {
                $report['errors'][] = "Chapter {$chapter->id}: {$e->getMessage()}";
            } catch (\Throwable $e) {
                report($e);
                $report['errors'][] = "Chapter {$chapter->id}: database write failed.";
            }
        }

        if (in_array($selection['mode'], ['subject', 'chapters', 'topics'], true)) {
            $topics = Topic::query()->whereIn('chapter_id', array_keys($chapterMap));
            if ($selection['mode'] === 'topics') {
                $topics->whereIn('id', $selection['ids']);
            }
            foreach ($topics->lazy(200) as $topic) {
                try {
                    $topicMap[$topic->id] = $this->ensureTopic($topic, $chapterMap[$topic->chapter_id], $selection, $report);
                } catch (RuntimeException $e) {
                    $report['errors'][] = "Topic {$topic->id}: {$e->getMessage()}";
                } catch (\Throwable $e) {
                    report($e);
                    $report['errors'][] = "Topic {$topic->id}: database write failed.";
                }
            }
        }

        $questions = $this->questions($selection)->with(['options', 'medium', 'questionType', 'topic'])->orderBy('id');
        foreach ($questions->lazy(200) as $question) {
            $reason = $this->unsupportedReason($question, $selection);
            if ($reason) {
                $report['skipped']++;

                continue;
            }
            if (! isset($chapterMap[$question->chapter_id])) {
                $report['skipped']++;

                continue;
            }

            try {
                $legacyTopicId = 0;
                if ($question->topic_id) {
                    if (! array_key_exists($question->topic_id, $topicMap)) {
                        $topicMap[$question->topic_id] = $this->ensureTopic($question->topic, $chapterMap[$question->chapter_id], $selection, $report);
                    }
                    $legacyTopicId = $topicMap[$question->topic_id];
                }
                if (! isset($typeMap[$question->question_type_id])) {
                    $typeMap[$question->question_type_id] = $this->ensureType($question->questionType, $selection, $report);
                }
                $this->writeQuestion($question, $selection, $chapterMap[$question->chapter_id], $legacyTopicId, $typeMap[$question->question_type_id], $report);
            } catch (RuntimeException $e) {
                $report['errors'][] = "Question {$question->id}: {$e->getMessage()}";
            } catch (\Throwable $e) {
                report($e);
                $report['errors'][] = "Question {$question->id}: database write failed.";
            }
        }

        $report['preview'] = $preview;
        DB::table('legacy_export_runs')->insert([
            'user_id' => $userId,
            'mode' => $selection['mode'],
            'pattern_id' => $selection['pattern_id'],
            'class_id' => $selection['class_id'],
            'subject_id' => $selection['subject_id'],
            'report' => json_encode($report, JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $report;
    }

    public function history(): array
    {
        return DB::table('legacy_export_runs')->orderByDesc('id')->limit(20)->get()->map(function ($run) {
            $run->report = json_decode($run->report, true);

            return $run;
        })->all();
    }

    private function scopeExists(int $patternId, int $classId, int $subjectId): bool
    {
        return ClassSubject::query()->where('pattern_id', $patternId)->where('class_id', $classId)->where('subject_id', $subjectId)->exists();
    }

    private function assertTarget(array $selection): void
    {
        if (! $this->scopeExists($selection['pattern_id'], $selection['class_id'], $selection['subject_id'])) {
            throw new RuntimeException('The selected pattern, class and subject are not linked.');
        }
        $legacy = DB::connection(self::CONNECTION);
        if (! $legacy->table('pk_class')->where('id', $selection['legacy_class_id'])->exists()
            || ! $legacy->table('pk_subject')->where('id', $selection['legacy_subject_id'])->exists()) {
            throw new RuntimeException('The selected old class or subject no longer exists.');
        }
    }

    private function targetLabels(array $selection): array
    {
        return [
            'class' => DB::connection(self::CONNECTION)->table('pk_class')->where('id', $selection['legacy_class_id'])->value('name'),
            'subject' => DB::connection(self::CONNECTION)->table('pk_subject')->where('id', $selection['legacy_subject_id'])->value('name'),
            'pattern' => $selection['legacy_afaq'],
        ];
    }

    private function chapters(array $selection): Builder
    {
        $query = Chapter::query()->where('pattern_id', $selection['pattern_id'])->where('class_id', $selection['class_id'])->where('subject_id', $selection['subject_id']);
        if (in_array($selection['mode'], ['chapters', 'topics'], true)) {
            $ids = $selection['mode'] === 'chapters'
                ? $selection['ids']
                : Topic::query()->whereIn('id', $selection['ids'])->pluck('chapter_id')->all();
            $query->whereIn('id', $ids);
        } elseif (in_array($selection['mode'], ['question_types', 'questions'], true)) {
            $query->whereIn('id', $this->questions($selection)->select('chapter_id'));
        }

        return $query;
    }

    private function questions(array $selection): Builder
    {
        $query = Question::query()->whereIn('chapter_id', Chapter::query()->where('pattern_id', $selection['pattern_id'])->where('class_id', $selection['class_id'])->where('subject_id', $selection['subject_id'])->select('id'));
        match ($selection['mode']) {
            'chapters' => $query->whereIn('chapter_id', $selection['ids']),
            'topics' => $query->whereIn('topic_id', $selection['ids']),
            'question_types' => $query->whereIn('question_type_id', $selection['ids']),
            'questions' => $query->whereIn('id', $selection['ids']),
            default => null,
        };

        return $query;
    }

    private function unsupportedReason(Question $question, array $selection): ?string
    {
        $schema = $question->schema_key ?: $question->questionType?->schema_key;
        if (! in_array($schema, self::SUPPORTED, true)) {
            return 'Question format has no safe old-format equivalent';
        }
        if ($question->questionType?->options_only) {
            return 'Options-only layout is not available in the old app';
        }
        $content = $question->content ?? [];
        $values = array_filter(array_merge([
            $question->statement_en, $question->statement_ur, $question->description_en,
            $question->description_ur, $question->answer_en, $question->answer_ur,
        ], $this->stringValues($content), $question->options->flatMap(fn ($option) => [$option->text_en, $option->text_ur])->all()));
        foreach ($values as $value) {
            if (preg_match('/<img\b|<video\b|<audio\b|<iframe\b|\b(?:src|href)\s*=\s*["\'](?:\/(?!\/)|\.\/|\.\.\/)/i', (string) $value)) {
                return 'Contains an asset that must be copied to the old site';
            }
        }
        if (in_array($schema, [SchemaKeys::OBJECTIVE_MCQ, SchemaKeys::OBJECTIVE_BLANK_CHOICE], true)) {
            $options = $content['options'] ?? $question->options->all();
            if (count($options) < 2) {
                return 'Objective question needs at least two options';
            }
            foreach ($options as $option) {
                if (mb_strlen((string) data_get($option, 'text_en', '')) > 250 || mb_strlen((string) data_get($option, 'text_ur', '')) > 250) {
                    return 'Option exceeds the old 250-character limit';
                }
            }
        }
        if ($schema === SchemaKeys::OBJECTIVE_PASSAGE_MCQ) {
            $items = $content['items'] ?? [];
            if ($items === []) {
                return 'Passage has no questions';
            }
            foreach ($items as $item) {
                $options = $item['options'] ?? [];
                if (count($options) < 2 || count($options) > 6) {
                    return 'Passage item needs 2 to 6 options';
                }
                foreach ($options as $option) {
                    if (mb_strlen((string) ($option['text_en'] ?? '')) > 250 || mb_strlen((string) ($option['text_ur'] ?? '')) > 250) {
                        return 'Option exceeds the old 250-character limit';
                    }
                }
            }
        }
        if ($schema === SchemaKeys::OBJECTIVE_TRUE_FALSE && ! in_array($content['correct_boolean'] ?? '', ['true', 'false'], true)) {
            return 'True/false answer is missing';
        }
        if ($schema === SchemaKeys::SUBJECTIVE_SAME_STATEMENT) {
            $destinationId = (int) ($selection['legacy_type_ids'][$question->question_type_id]
                ?? DB::table('legacy_export_items')->where('entity_type', 'question_type')->where('entity_id', $question->question_type_id)->value('legacy_id'));
            $this->sharedStatementTypeNames ??= DB::connection(self::CONNECTION)->table('pk_question_types')
                ->whereIn('id', [336, 386])->pluck('type_name')->all();
            if (! in_array($destinationId, [336, 386], true)
                && ! in_array($question->questionType->name, $this->sharedStatementTypeNames, true)) {
                return 'Shared statement requires its matching old question type';
            }
        }

        return $this->destinationTypeIssue($question->questionType, $selection);
    }

    private function destinationTypeIssue(QuestionType $type, array $selection): ?string
    {
        $overrideId = (int) ($selection['legacy_type_ids'][$type->id] ?? 0);
        $key = "{$type->id}:{$overrideId}";
        if (array_key_exists($key, $this->typeIssues)) {
            return $this->typeIssues[$key];
        }

        $mappedId = DB::table('legacy_export_items')->where('entity_type', 'question_type')->where('entity_id', $type->id)->value('legacy_id');
        $legacy = DB::connection(self::CONNECTION);
        $target = $overrideId
            ? $legacy->table('pk_question_types')->where('id', $overrideId)->first()
            : ($mappedId
                ? $legacy->table('pk_question_types')->where('id', $mappedId)->first()
                : $legacy->table('pk_question_types')->where('type_name', $type->name)->where('is_objective', (int) $type->is_objective)->first());

        if (($overrideId || $mappedId) && ! $target) {
            return $this->typeIssues[$key] = 'Selected old question type no longer exists';
        }
        if ($target && ((bool) $target->is_objective !== (bool) $type->is_objective
            || ($type->is_objective && ! $this->compatibleObjectiveParent($type->schema_key, (int) $target->objective_type_id))
            || ($type->schema_key === SchemaKeys::SUBJECTIVE_SAME_STATEMENT && ! in_array((int) $target->id, [336, 386], true)))) {
            return $this->typeIssues[$key] = 'Old question type uses an incompatible format';
        }

        return $this->typeIssues[$key] = null;
    }

    private function stringValues(array $content): array
    {
        $values = [];
        array_walk_recursive($content, function ($value) use (&$values): void {
            if (is_string($value)) {
                $values[] = $value;
            }
        });

        return $values;
    }

    private function ensureChapter(Chapter $chapter, array $selection, array &$report): int
    {
        $legacy = DB::connection(self::CONNECTION);
        $mapped = DB::table('legacy_export_items')->where('entity_type', 'chapter')->where('entity_id', $chapter->id)->first();
        $query = $legacy->table('pk_chapter')->where('class_id', $selection['legacy_class_id'])->where('subject_id', $selection['legacy_subject_id'])->where('afaq', $selection['legacy_afaq']);
        $existing = $mapped ? $query->clone()->where('id', $mapped->legacy_id)->first() : null;
        if ($mapped && ! $existing) {
            throw new RuntimeException('Saved old chapter mapping points outside the selected target.');
        }
        if (! $existing) {
            $existing = $chapter->chapter_number !== null
                ? $query->clone()->where('chapter_number', $chapter->chapter_number)->first()
                : $query->clone()->where('name', $chapter->name)->first();
        }
        $payload = [
            'class_id' => $selection['legacy_class_id'], 'subject_id' => $selection['legacy_subject_id'],
            'afaq' => $selection['legacy_afaq'], 'name' => $chapter->name,
            'u_name' => $chapter->name_ur ?? '', 'chapter_number' => $chapter->chapter_number ?? 0,
            'chapter_type' => '', 'sort_int' => $chapter->sort_id, 'status' => $chapter->status,
            'status_pef' => $chapter->status,
        ];
        if ($existing) {
            if ((string) $existing->name !== (string) $chapter->name) {
                throw new RuntimeException('An old chapter with this number has a different name.');
            }
            $id = (int) $existing->id;
            $report['matched']++;
        } else {
            $id = $legacy->table('pk_chapter')->insertGetId($payload);
            $report['created']++;
        }
        $this->remember('chapter', $chapter->id, $id, $payload);

        return $id;
    }

    private function ensureTopic(Topic $topic, int $legacyChapterId, array $selection, array &$report): int
    {
        $legacy = DB::connection(self::CONNECTION);
        $mapped = DB::table('legacy_export_items')->where('entity_type', 'topic')->where('entity_id', $topic->id)->first();
        $existing = $mapped
            ? $legacy->table('pk_topics')->where('id', $mapped->legacy_id)->where('chapter_id', $legacyChapterId)->first()
            : $legacy->table('pk_topics')->where('chapter_id', $legacyChapterId)->where('name', $topic->name)->first();
        if ($mapped && ! $existing) {
            throw new RuntimeException('Saved old topic mapping points outside the selected chapter.');
        }
        $payload = ['chapter_id' => $legacyChapterId, 'class_id' => $selection['legacy_class_id'], 'name' => $topic->name, 'u_name' => $topic->name_ur ?? '', 'status' => $topic->status, 'afaq' => $selection['legacy_afaq'], 'sort_int' => $topic->sort_id];
        if ($existing) {
            if ((string) $existing->name !== (string) $topic->name) {
                throw new RuntimeException('The old topic was changed.');
            }
            $id = (int) $existing->id;
            $report['matched']++;
        } else {
            $id = $legacy->table('pk_topics')->insertGetId($payload);
            $report['created']++;
        }
        $this->remember('topic', $topic->id, $id, $payload);

        return $id;
    }

    private function ensureType(QuestionType $type, array $selection, array &$report): int
    {
        $legacy = DB::connection(self::CONNECTION);
        $mapped = DB::table('legacy_export_items')->where('entity_type', 'question_type')->where('entity_id', $type->id)->first();
        $overrideId = (int) ($selection['legacy_type_ids'][$type->id] ?? 0);
        $existing = $overrideId
            ? $legacy->table('pk_question_types')->where('id', $overrideId)->first()
            : ($mapped
            ? $legacy->table('pk_question_types')->where('id', $mapped->legacy_id)->first()
            : $legacy->table('pk_question_types')->where('type_name', $type->name)->where('is_objective', (int) $type->is_objective)->first());
        if (($mapped || $overrideId) && ! $existing) {
            throw new RuntimeException('Saved old question type no longer exists.');
        }
        $schema = $type->schema_key;
        $parentId = $type->is_objective ? match ($schema) {
            SchemaKeys::OBJECTIVE_TRUE_FALSE => 2,
            SchemaKeys::OBJECTIVE_BLANK_CHOICE => 3,
            SchemaKeys::OBJECTIVE_BLANK_OPEN => 4,
            SchemaKeys::OBJECTIVE_PASSAGE_MCQ => 5,
            default => 1,
        } : 0;
        $payload = [
            'id_order' => $type->id, 'type_name' => $type->name, 'type_name_ur' => $type->name_ur ?? '',
            'type' => 0, 'heading_en' => $type->heading_en ?? '',
            'heading_ur' => $type->heading_ur ?? '', 'have_exercise' => (int) $type->have_exercise,
            'have_statment' => (int) $type->have_statement, 'statement_label' => $type->statement_label ?? '',
            'have_description' => (int) $type->have_description, 'description_label' => $type->description_label ?? '',
            'have_answer' => (int) $type->have_answer, 'is_single' => (int) $type->is_single,
            'is_objective' => (int) $type->is_objective, 'objective_type_id' => $parentId,
            'column_per_row' => $type->column_per_row ?: 1,
        ];
        if ($existing) {
            if ((bool) $existing->is_objective !== (bool) $type->is_objective) {
                throw new RuntimeException('Old question type has a different kind.');
            }
            if ($type->is_objective && ! $this->compatibleObjectiveParent($schema, (int) $existing->objective_type_id)) {
                throw new RuntimeException('Old question type uses a different objective format.');
            }
            if ($schema === SchemaKeys::SUBJECTIVE_SAME_STATEMENT && ! in_array((int) $existing->id, [336, 386], true)) {
                throw new RuntimeException('This shared statement type has no matching old layout.');
            }
            $id = (int) $existing->id;
            $report['matched']++;
        } else {
            $id = $legacy->table('pk_question_types')->insertGetId($payload);
            $report['created']++;
        }
        $this->remember('question_type', $type->id, $id, $payload);

        return $type->is_objective ? (int) ($existing->objective_type_id ?? $parentId) : $id;
    }

    private function compatibleObjectiveParent(?string $schema, int $parentId): bool
    {
        return match ($schema) {
            SchemaKeys::OBJECTIVE_TRUE_FALSE => $parentId === 2,
            SchemaKeys::OBJECTIVE_BLANK_CHOICE => $parentId === 3,
            SchemaKeys::OBJECTIVE_BLANK_OPEN => in_array($parentId, [4, 27], true),
            SchemaKeys::OBJECTIVE_PASSAGE_MCQ => $parentId === 5,
            default => $parentId !== 2 && $parentId !== 3 && $parentId !== 4 && $parentId !== 5 && $parentId !== 27,
        };
    }

    private function writeQuestion(Question $question, array $selection, int $chapterId, int $topicId, int $typeId, array &$report): void
    {
        $legacy = DB::connection(self::CONNECTION);
        $content = $question->content ?? [];
        $schema = $question->schema_key ?: $question->questionType->schema_key;
        $medium = strtolower((string) $question->medium?->name);
        $payload = [
            'chapter_id' => $chapterId, 'topic_id' => $topicId, 'exercise' => '',
            'medium' => match ($medium) {
                'english' => 1, 'urdu' => 2, default => 3
            },
            'type_id' => (string) $typeId, 'exercise_question' => self::SOURCES[Question::normalizeSource($question->source)] ?? 0,
            'past_paper_questions' => 0, 'afaq' => $selection['legacy_afaq'],
            'status' => $question->status, 'status_pef' => $question->status, 'is_table' => 0,
            'statement_en' => $content['prompt_en'] ?? $question->statement_en ?? '',
            'statement_ur' => $content['prompt_ur'] ?? $question->statement_ur ?? '',
            'description_en' => $content['guidance_en'] ?? $content['shared_en'] ?? $question->description_en ?? '',
            'description_ur' => $content['guidance_ur'] ?? $content['shared_ur'] ?? $question->description_ur ?? '',
            'answer_en' => $content['answer_en'] ?? $question->answer_en,
            'answer_ur' => $content['answer_ur'] ?? $question->answer_ur,
            'paragraph_questions' => null,
        ];
        if ($schema === SchemaKeys::OBJECTIVE_TRUE_FALSE) {
            $payload['answer_en'] = ($content['correct_boolean'] ?? '') === 'true' ? 'True' : 'False';
        }
        if ($schema === SchemaKeys::OBJECTIVE_PASSAGE_MCQ) {
            $payload['statement_en'] = $content['passage_en'] ?? '';
            $payload['statement_ur'] = $content['passage_ur'] ?? '';
            $payload['paragraph_questions'] = json_encode(array_map(function (array $item): array {
                $options = array_map(fn (array $option): array => [
                    'name_en' => $option['text_en'] ?? '',
                    'name_ur' => $option['text_ur'] ?? '',
                    'is_true' => (int) (bool) ($option['is_correct'] ?? false),
                ], $item['options']);
                while (count($options) < 6) {
                    $options[] = ['name_en' => '', 'name_ur' => '', 'is_true' => 0];
                }

                return ['statement_en' => $item['prompt_en'] ?? '', 'statement_ur' => $item['prompt_ur'] ?? '', 'options' => $options];
            }, $content['items']), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        $options = [];
        if (in_array($schema, [SchemaKeys::OBJECTIVE_MCQ, SchemaKeys::OBJECTIVE_BLANK_CHOICE], true)) {
            foreach ($content['options'] ?? $question->options as $option) {
                $options[] = [
                    'option_en' => (string) data_get($option, 'text_en', ''),
                    'option_ur' => (string) data_get($option, 'text_ur', ''),
                    'is_correct' => (int) (bool) data_get($option, 'is_correct', false),
                ];
            }
        }
        $fingerprint = $this->hash([$payload, $options]);
        $mapped = DB::table('legacy_export_items')->where('entity_type', 'question')->where('entity_id', $question->id)->first();

        if ($mapped) {
            $old = $legacy->table('pk_question')->where('id', $mapped->legacy_id)->first();
            if (! $old || (int) $old->chapter_id !== $chapterId || (int) $old->afaq !== (int) $selection['legacy_afaq']) {
                throw new RuntimeException('Saved old question mapping points outside this target.');
            }
            $oldFingerprint = $this->oldQuestionHash($old);
            if ($oldFingerprint === $fingerprint) {
                $report['unchanged']++;

                return;
            }
            if ($oldFingerprint === 'old-options-have-extra-content'
                || ($oldFingerprint !== $mapped->payload_hash && ! ($selection['replace_existing'] ?? false))) {
                $report['conflicts']++;

                return;
            }
            $legacy->transaction(function () use ($legacy, $mapped, $payload, $options): void {
                $legacy->table('pk_question')->where('id', $mapped->legacy_id)->update($payload);
                $legacy->table('pk_options')->where('question_id', $mapped->legacy_id)->delete();
                foreach ($options as $option) {
                    $legacy->table('pk_options')->insert(['question_id' => $mapped->legacy_id] + $option);
                }
            });
            $this->remember('question', $question->id, $mapped->legacy_id, [$payload, $options]);
            $report['updated']++;
            $report['questions_updated']++;

            return;
        }

        $candidates = $legacy->table('pk_question')->where('chapter_id', $chapterId)->where('type_id', (string) $typeId)->where('afaq', $selection['legacy_afaq'])->where('statement_en', $payload['statement_en'])->where('statement_ur', $payload['statement_ur'])->limit(10)->get();
        $candidate = $candidates->first(fn ($old) => $this->oldQuestionHash($old) === $fingerprint);
        if ($candidate) {
            $this->remember('question', $question->id, $candidate->id, [$payload, $options]);
            $report['matched']++;

            return;
        }
        if ($candidates->count() === 1 && ($selection['replace_existing'] ?? false)
            && $this->oldQuestionHash($candidates->first()) !== 'old-options-have-extra-content') {
            $replacement = $candidates->first();
            $legacy->transaction(function () use ($legacy, $replacement, $payload, $options): void {
                $legacy->table('pk_question')->where('id', $replacement->id)->update($payload);
                $legacy->table('pk_options')->where('question_id', $replacement->id)->delete();
                foreach ($options as $option) {
                    $legacy->table('pk_options')->insert(['question_id' => $replacement->id] + $option);
                }
            });
            $this->remember('question', $question->id, $replacement->id, [$payload, $options]);
            $report['updated']++;
            $report['questions_updated']++;

            return;
        }
        if ($candidates->isNotEmpty()) {
            $report['conflicts']++;

            return;
        }
        $id = $legacy->transaction(function () use ($legacy, $payload, $options): int {
            $id = $legacy->table('pk_question')->insertGetId($payload);
            foreach ($options as $option) {
                $legacy->table('pk_options')->insert(['question_id' => $id] + $option);
            }

            return $id;
        });
        $this->remember('question', $question->id, $id, [$payload, $options]);
        $report['created']++;
        $report['questions_created']++;
    }

    private function oldQuestionHash(object $old): string
    {
        $extraOptions = DB::connection(self::CONNECTION)->table('pk_options')->where('question_id', $old->id)->where(function ($query): void {
            foreach (['option_im', 'answer_en', 'answer_ur', 'answer_im'] as $column) {
                $query->orWhere(fn ($value) => $value->whereNotNull($column)->where($column, '!=', ''));
            }
        })->exists();
        if ($extraOptions) {
            return 'old-options-have-extra-content';
        }
        $keys = ['chapter_id', 'topic_id', 'exercise', 'medium', 'type_id', 'exercise_question', 'past_paper_questions', 'afaq', 'status', 'status_pef', 'is_table', 'statement_en', 'statement_ur', 'description_en', 'description_ur', 'answer_en', 'answer_ur', 'paragraph_questions'];
        $payload = [];
        foreach ($keys as $key) {
            $payload[$key] = $old->{$key};
        }
        $options = DB::connection(self::CONNECTION)->table('pk_options')->where('question_id', $old->id)->orderBy('id')->get(['option_en', 'option_ur', 'is_correct'])->map(fn ($row) => (array) $row)->all();

        return $this->hash([$payload, $options]);
    }

    private function remember(string $type, int $sourceId, int $legacyId, array $payload): void
    {
        DB::table('legacy_export_items')->updateOrInsert(
            ['entity_type' => $type, 'entity_id' => $sourceId],
            ['legacy_id' => $legacyId, 'payload_hash' => $this->hash($payload), 'created_at' => now(), 'updated_at' => now()],
        );
    }

    private function hash(array $payload): string
    {
        return hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
}

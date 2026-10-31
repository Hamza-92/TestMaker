<?php

namespace App\Support\Qat;

use App\Models\Question;
use App\Models\User;
use App\Support\AppUserAccess;
use App\Support\Questions\QuestionTypeHeadingResolver;
use Illuminate\Database\Query\Builder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class QatPaperBuilder
{
    public function resolve(User $user, int $subjectId, string $syllabus, array $chapterIds, array $months): array
    {
        $subject = DB::table('qat_subjects as subject')
            ->join('qat_classes as class', 'class.id', '=', 'subject.qat_class_id')
            ->join('qat_catalogues as catalogue', 'catalogue.id', '=', 'class.qat_catalogue_id')
            ->where('subject.id', $subjectId)
            ->where('subject.status', true)
            ->where('class.status', true)
            ->first([
                'subject.id', 'subject.subject_name', 'subject.subject_id', 'subject.source_pattern_id',
                'class.id as class_id', 'class.name as class_name', 'class.source_class_id',
                'catalogue.academic_year',
            ]);
        abort_unless($subject, 404);

        $access = AppUserAccess::resolve($user);
        abort_unless($user->isSchoolOwner() || AppUserAccess::allowsSubject(
            $access, (int) $subject->source_pattern_id, (int) $subject->source_class_id,
            (int) $subject->subject_id,
        ), 403);

        $requested = array_values(array_unique(array_map('intval', $chapterIds)));
        $query = DB::table('qat_chapters as chapter')
            ->where('chapter.qat_subject_id', $subjectId)
            ->where('chapter.status', true);
        if ($syllabus === 'qat') {
            $query->whereExists(fn (Builder $monthsQuery) => $monthsQuery
                ->selectRaw('1')->from('qat_chapter_months as chapter_month')
                ->whereColumn('chapter_month.qat_chapter_id', 'chapter.id')
                ->whereIn('chapter_month.month', $months));
        } else {
            $query->whereIn('chapter.id', $requested);
        }

        $chapters = $query->orderBy('chapter.sort_id')->orderBy('chapter.id')
            ->get(['chapter.id', 'chapter.name', 'chapter.chapter_number', 'chapter.source_chapter_id'])
            ->filter(fn ($chapter) => $user->isSchoolOwner() || AppUserAccess::allowsChapter(
                $access, (int) $subject->source_pattern_id, (int) $subject->source_class_id,
                (int) $subject->subject_id, (int) $chapter->source_chapter_id,
            ))->values();
        if ($syllabus === 'custom' && $chapters->count() !== count($requested)) {
            throw ValidationException::withMessages(['chapter_ids' => 'Some selected chapters are unavailable.']);
        }
        if ($chapters->isEmpty()) {
            throw ValidationException::withMessages(['chapter_ids' => 'No chapters are available for this syllabus.']);
        }
        if ($syllabus === 'qat') {
            $subject->syllabus_months = $months;
        }

        return [$subject, $chapters, $access];
    }

    public function withChapters(array $paperData): array
    {
        if (! isset($paperData['chapters'])) {
            $paperData['chapters'] = DB::table('qat_chapters')
                ->where('qat_subject_id', $paperData['subject_id'] ?? 0)
                ->whereIn('id', $paperData['chapter_ids'] ?? [])
                ->orderBy('sort_id')->orderBy('id')
                ->get(['id', 'name', 'chapter_number'])
                ->map(fn ($chapter) => [
                    'id' => (int) $chapter->id,
                    'name' => $chapter->name,
                    'chapter_number' => $chapter->chapter_number !== null ? (int) $chapter->chapter_number : null,
                ])->all();
        }

        return $paperData;
    }

    public function questionQuery(object $subject, array $chapterIds, array $access): Builder
    {
        $topicIds = AppUserAccess::topicIds(
            $access, (int) $subject->source_pattern_id, (int) $subject->source_class_id,
            (int) $subject->subject_id,
        );

        return DB::table('qat_questions as question')
            ->join('qat_chapters as chapter', 'chapter.id', '=', 'question.qat_chapter_id')
            ->leftJoin('qat_topics as topic', 'topic.id', '=', 'question.qat_topic_id')
            ->leftJoin('question_types as type', 'type.id', '=', 'question.question_type_id')
            ->whereIn('chapter.id', $chapterIds)
            ->where('chapter.qat_subject_id', $subject->id)
            ->where('chapter.status', true)
            ->where('question.status', true)
            ->when(isset($subject->syllabus_months), fn (Builder $query) => $this->applyMonthlySelection($query, $chapterIds, $subject->syllabus_months))
            ->where(function (Builder $query): void {
                $query->whereNull('question.qat_topic_id')->orWhere('topic.status', true);
            })
            ->when($topicIds !== null, fn (Builder $query) => $query->whereIn('topic.source_topic_id', $topicIds));
    }

    public function applyMonthlySelection(Builder $query, array $chapterIds, array $months, string $chapterColumn = 'chapter.id', string $questionColumn = 'question.source_question_id'): Builder
    {
        $mappings = DB::table('qat_chapter_months')->whereIn('qat_chapter_id', $chapterIds)->whereIn('month', $months)
            ->get(['qat_chapter_id', 'source_question_ids']);
        $wholeChapters = $mappings->whereNull('source_question_ids')->pluck('qat_chapter_id')->all();
        $questionIds = $mappings->whereNotNull('source_question_ids')->flatMap(fn ($mapping) => json_decode($mapping->source_question_ids, true) ?: [])->unique()->values()->all();

        return $query->where(fn (Builder $selection) => $selection->whereIn($chapterColumn, $wholeChapters)->orWhereIn($questionColumn, $questionIds));
    }

    public function withTypeOrder(Builder $query, object $subject): Builder
    {
        return $query->leftJoin('question_type_orders as type_order', function (JoinClause $join) use ($subject): void {
            $join->on('type_order.question_type_id', '=', 'type.id')
                ->where('type_order.pattern_id', $subject->source_pattern_id)
                ->where('type_order.class_id', $subject->source_class_id)
                ->where('type_order.subject_id', $subject->subject_id);
        });
    }

    public function orderByType(Builder $query): Builder
    {
        return $query->orderByDesc('type.is_objective')
            ->orderByRaw('type_order.sort_order IS NULL')
            ->orderBy('type_order.sort_order')
            ->orderBy('type.id');
    }

    public function typeRanks(object $subject, array $typeIds): array
    {
        if ($typeIds === []) {
            return [];
        }

        $query = $this->withTypeOrder(
            DB::table('question_types as type')->whereIn('type.id', $typeIds),
            $subject,
        );

        return array_flip($this->orderByType($query)->pluck('type.id')->map(fn ($id) => (int) $id)->all());
    }

    public function typeHeadings(object $subject, array $typeIds): array
    {
        if ($typeIds === []) {
            return [];
        }

        $types = DB::table('question_types')->whereIn('id', $typeIds)
            ->get(['id', 'name', 'name_ur', 'heading_en', 'heading_ur']);

        return QuestionTypeHeadingResolver::apply(
            $types,
            (int) $subject->source_pattern_id,
            (int) $subject->source_class_id,
            (int) $subject->subject_id,
        )->mapWithKeys(fn ($type) => [(int) $type->id => [
            'heading_en' => trim((string) ($type->heading_en ?: $type->name)),
            'heading_ur' => trim((string) ($type->heading_ur ?: $type->name_ur)),
        ]])->all();
    }

    public function questionColumns(): array
    {
        return [
            'question.id', 'question.qat_chapter_id as chapter_id', 'question.question_type_id',
            'question.question_data', 'chapter.name as chapter_name', 'topic.name as topic_name',
            'type.name as type_name', 'type.is_objective',
        ];
    }

    public function presentQuestion(object $question, bool $includeAnswers = false): array
    {
        $data = json_decode((string) $question->question_data, true) ?: [];
        $content = $this->withoutAnswers((array) ($data['content'] ?? []));
        $options = $this->withoutAnswers((array) ($data['options'] ?? []));
        $schemaKey = trim((string) ($data['schema_key'] ?? ''));
        if ($schemaKey === '') {
            $schemaKey = (string) ($data['question_type']['schema_key'] ?? '');
        }

        return [
            'id' => (int) $question->id,
            'chapter_id' => (int) $question->chapter_id,
            'chapter_name' => (string) $question->chapter_name,
            'topic_name' => $question->topic_name ? (string) $question->topic_name : null,
            'source_label' => Question::sourceLabel($data['source'] ?? null),
            'question_type_id' => (int) $question->question_type_id,
            'type_name' => (string) ($question->type_name ?: ($data['question_type']['name'] ?? 'Question')),
            'is_objective' => (bool) ($question->is_objective ?? $data['question_type']['is_objective'] ?? false),
            'schema_key' => $schemaKey,
            'statement_en' => (string) ($data['statement_en'] ?? ''),
            'statement_ur' => (string) ($data['statement_ur'] ?? ''),
            'description_en' => (string) ($data['description_en'] ?? ''),
            'description_ur' => (string) ($data['description_ur'] ?? ''),
            'content' => $content,
            'options' => $options,
            ...($includeAnswers && (bool) $question->is_objective ? ['objective_answers' => $this->objectiveAnswers($data)] : []),
        ];
    }

    public function withObjectiveAnswers(array $paperData): array
    {
        $ids = collect($paperData['sections'] ?? [])->flatMap(fn ($section) => $section['questions'] ?? [])
            ->filter(fn ($question) => ($question['is_objective'] ?? false) && ! array_key_exists('objective_answers', $question))
            ->pluck('id')->all();
        if ($ids === []) {
            return $paperData;
        }
        $answers = DB::table('qat_questions as question')
            ->join('qat_chapters as chapter', 'chapter.id', '=', 'question.qat_chapter_id')
            ->where('chapter.qat_subject_id', $paperData['subject_id'] ?? 0)
            ->whereIn('question.id', $ids)->get(['question.id', 'question.question_data'])
            ->mapWithKeys(fn ($question) => [(int) $question->id => json_decode($question->question_data, true) ?: []]);
        foreach ($paperData['sections'] as &$section) {
            foreach ($section['questions'] as &$question) {
                if (($question['is_objective'] ?? false) && ! array_key_exists('objective_answers', $question)) {
                    $question['objective_answers'] = $this->objectiveAnswers($answers->get($question['id'], []), $question);
                }
            }
            unset($question);
        }
        unset($section);

        return $paperData;
    }

    private function objectiveAnswers(array $data, ?array $snapshot = null): array
    {
        $content = (array) ($data['content'] ?? []);
        $correct = function (array $options, ?array $savedOptions = null): array {
            $indices = [];
            foreach (array_values($options) as $index => $option) {
                if (! filter_var($option['is_correct'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
                    continue;
                }
                $position = $savedOptions === null ? $index : array_search($this->withoutAnswers($option), array_values($savedOptions));
                if ($position !== false) {
                    $indices[] = $position;
                }
            }

            return $indices;
        };
        $options = $correct(($data['options'] ?? []) ?: ($content['options'] ?? []), $snapshot === null ? null : (($snapshot['options'] ?? []) ?: ($snapshot['content']['options'] ?? [])));
        $boolean = $content['correct_boolean'] ?? null;
        if ($options === [] && in_array($boolean, ['true', 'false', true, false], true)) {
            $options = [in_array($boolean, ['true', true], true) ? 0 : 1];
        }

        return [
            'options' => $options,
            'items' => collect($content['items'] ?? [])->map(fn ($item, $index) => $correct($item['options'] ?? [], $snapshot === null ? null : ($snapshot['content']['items'][$index]['options'] ?? [])))->values()->all(),
        ];
    }

    private function withoutAnswers(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_string($key) && preg_match('/^(?:answer|correct)(?:_|$)|^is_?correct$/i', $key)) {
                unset($data[$key]);

                continue;
            }
            if (is_array($value)) {
                $data[$key] = $this->withoutAnswers($value);
            }
        }

        return $data;
    }
}

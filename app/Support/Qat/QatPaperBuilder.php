<?php

namespace App\Support\Qat;

use App\Models\Question;
use App\Models\User;
use App\Support\AppUserAccess;
use App\Support\Questions\QuestionTypeHeadingResolver;
use App\Support\Questions\SubjectMediumResolver;
use Illuminate\Database\Query\Builder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class QatPaperBuilder
{
    public function resolve(User $user, int $subjectId, string $syllabus, array $chapterIds, array $months): array
    {
        $month = $syllabus === 'qat' ? (int) $months[0] : null;
        $subject = QatMonthlySyllabus::query('qat_subjects', 'subject', $month, 'subject')
            ->joinSub(QatMonthlySyllabus::query('qat_classes', 'class', $month, 'classes'), 'class', 'class.id', '=', 'subject.qat_class_id')
            ->join('qat_catalogues as catalogue', 'catalogue.id', '=', 'class.qat_catalogue_id')
            ->leftJoin('subjects as source_subject', 'source_subject.id', '=', 'subject.subject_id')
            ->where('subject.id', $subjectId)
            ->where('subject.status', true)
            ->where('class.status', true)
            ->first([
                'subject.id', 'subject.subject_name', 'subject.subject_id', 'subject.source_pattern_id',
                'class.id as class_id', 'class.name as class_name', 'class.source_class_id',
                'catalogue.academic_year', 'source_subject.name_ur as subject_name_ur',
            ]);
        abort_unless($subject, 404);

        $access = QatAccess::catalogue($user);
        abort_unless($user->isSchoolOwner() || AppUserAccess::allowsSubject(
            $access, (int) $subject->source_pattern_id, (int) $subject->source_class_id,
            (int) $subject->subject_id,
        ), 403);

        $subject->medium = SubjectMediumResolver::resolve(
            (int) $subject->source_pattern_id, (int) $subject->source_class_id,
            (int) $subject->subject_id, fallback: 'Both',
        );
        if ($subject->medium === 'Urdu' && filled($subject->subject_name_ur)) {
            $subject->subject_name = $subject->subject_name_ur;
        }

        $requested = array_values(array_unique(array_map('intval', $chapterIds)));
        $query = QatMonthlySyllabus::query('qat_chapters', 'chapter', $month, 'chapter')
            ->where('chapter.qat_subject_id', $subjectId)
            ->where('chapter.status', true);
        if ($syllabus === 'qat') {
            $query->whereExists(fn (Builder $monthsQuery) => $monthsQuery
                ->selectRaw('1')->from('qat_chapter_months as chapter_month')
                ->whereColumn('chapter_month.qat_chapter_id', 'chapter.id')
                ->where('chapter_month.month', $month));
        } else {
            $query->whereIn('chapter.id', $requested);
        }

        $chapters = $query->orderBy('chapter.sort_id')->orderBy('chapter.id')
            ->get(['chapter.id', 'chapter.name', 'chapter.name_ur', 'chapter.chapter_number', 'chapter.source_chapter_id'])
            ->filter(fn ($chapter) => $user->isSchoolOwner() || AppUserAccess::allowsChapter(
                $access, (int) $subject->source_pattern_id, (int) $subject->source_class_id,
                (int) $subject->subject_id, (int) $chapter->source_chapter_id,
            ))->values();
        if ($subject->medium === 'Urdu') {
            foreach ($chapters as $chapter) {
                $chapter->name = filled($chapter->name_ur) ? $chapter->name_ur : $chapter->name;
            }
        }
        if ($syllabus === 'custom' && $chapters->count() !== count($requested)) {
            throw ValidationException::withMessages(['chapter_ids' => 'Some selected chapters are unavailable.']);
        }
        if ($chapters->isEmpty()) {
            throw ValidationException::withMessages(['chapter_ids' => 'No chapters are available for this syllabus.']);
        }
        if ($syllabus === 'qat') {
            $subject->syllabus_month = $month;
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

    public function questionQuery(object $subject, array $chapterIds, array $access, QatQuestionTypeRules $rules): Builder
    {
        $topicIds = AppUserAccess::topicIds(
            $access, (int) $subject->source_pattern_id, (int) $subject->source_class_id,
            (int) $subject->subject_id,
        );

        $month = $subject->syllabus_month ?? null;

        return QatMonthlySyllabus::query('qat_questions', 'question', $month, 'question')
            ->joinSub(QatMonthlySyllabus::query('qat_chapters', 'chapter', $month, 'chapters'), 'chapter', 'chapter.id', '=', 'question.qat_chapter_id')
            ->leftJoinSub(QatMonthlySyllabus::query('qat_topics', 'topic', $month, 'topics'), 'topic', 'topic.id', '=', 'question.qat_topic_id')
            ->leftJoin('question_types as type', 'type.id', '=', 'question.question_type_id')
            ->whereIn('chapter.id', $chapterIds)
            ->where('chapter.qat_subject_id', $subject->id)
            ->whereNotIn('question.question_type_id', $rules->hiddenTypeIds)
            ->where('chapter.status', true)
            ->where('question.status', true)
            ->where(function (Builder $query): void {
                $query->whereNull('question.qat_topic_id')->orWhere('topic.status', true);
            })
            ->when($topicIds !== null, fn (Builder $query) => $query->whereIn('topic.source_topic_id', $topicIds));
    }

    public function pairSections(array $sections, array $pairs): array
    {
        $sections = collect($sections)->keyBy('question_type_id');
        foreach ($pairs as ['type_id' => $type, 'partner_id' => $partner]) {
            $primary = $sections->get($type);
            $alternative = $sections->get($partner);
            if (! $primary || ! $alternative || count($primary['questions']) !== count($alternative['questions'])) {
                throw ValidationException::withMessages(['or_pairs' => 'Select the same number of questions from both types in each OR pair.']);
            }

            foreach ($primary['questions'] as $index => &$question) {
                $other = $alternative['questions'][$index];
                if (abs($question['marks'] - $other['marks']) > 0.00001) {
                    throw ValidationException::withMessages(['or_pairs' => 'Both alternatives in an OR pair must carry the same marks.']);
                }

                $question['or_question'] = $other;
            }
            unset($question);
            $primary['or_heading_en'] = $alternative['heading_en'] ?? $alternative['title'];
            $primary['or_heading_ur'] = $alternative['heading_ur'] ?? null;
            $sections->put($type, $primary)->forget($partner);
        }

        return $sections->values()->all();
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
            'heading_en' => ($subject->medium ?? 'Both') === 'Urdu' ? '' : trim((string) ($type->heading_en ?: $type->name)),
            'heading_ur' => ($subject->medium ?? 'Both') === 'English' ? '' : trim((string) ($type->heading_ur ?: $type->name_ur)),
        ]])->all();
    }

    public function questionColumns(): array
    {
        return [
            'question.id', 'question.qat_chapter_id as chapter_id', 'question.question_type_id',
            'question.question_data', 'chapter.name as chapter_name', 'topic.name as topic_name',
            'type.name as type_name', 'type.is_objective',
            'chapter.name_ur as chapter_name_ur', 'topic.name_ur as topic_name_ur', 'type.name_ur as type_name_ur',
        ];
    }

    public function availableQuestions(Builder $query, string $medium): Collection
    {
        $questions = $query->get($this->questionColumns());
        if ($medium === 'Both') {
            return $questions;
        }

        return $questions->filter(function ($question) use ($medium): bool {
            $data = json_decode((string) $question->question_data, true) ?: [];
            if (! QatQuestionLanguage::canRender($data, $medium)) {
                return false;
            }

            $question->display_data = QatQuestionLanguage::project($data, $medium);
            unset($question->question_data);

            if ($medium === 'Urdu') {
                $question->chapter_name = filled($question->chapter_name_ur) ? $question->chapter_name_ur : $question->chapter_name;
                $question->topic_name = filled($question->topic_name_ur) ? $question->topic_name_ur : $question->topic_name;
                $question->type_name = filled($question->type_name_ur) ? $question->type_name_ur : $question->type_name;
            }

            return true;
        })->values();
    }

    public function presentQuestion(object $question, bool $includeAnswers = false): array
    {
        $data = $question->display_data ?? (json_decode((string) $question->question_data, true) ?: []);
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

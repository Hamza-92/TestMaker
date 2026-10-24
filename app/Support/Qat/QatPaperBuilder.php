<?php

namespace App\Support\Qat;

use App\Models\User;
use App\Support\AppUserAccess;
use Illuminate\Database\Query\Builder;
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
            ->get(['chapter.id', 'chapter.name', 'chapter.source_chapter_id'])
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

        return [$subject, $chapters, $access];
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
            ->where(function (Builder $query): void {
                $query->whereNull('question.qat_topic_id')->orWhere('topic.status', true);
            })
            ->when($topicIds !== null, fn (Builder $query) => $query->whereIn('topic.source_topic_id', $topicIds));
    }

    public function questionColumns(): array
    {
        return [
            'question.id', 'question.qat_chapter_id as chapter_id', 'question.question_type_id',
            'question.question_data', 'chapter.name as chapter_name',
            'type.name as type_name', 'type.is_objective',
        ];
    }

    public function presentQuestion(object $question): array
    {
        $data = json_decode((string) $question->question_data, true) ?: [];
        $content = $this->withoutAnswers((array) ($data['content'] ?? []));
        $options = $this->withoutAnswers((array) ($data['options'] ?? []));

        return [
            'id' => (int) $question->id,
            'chapter_id' => (int) $question->chapter_id,
            'chapter_name' => (string) $question->chapter_name,
            'question_type_id' => (int) $question->question_type_id,
            'type_name' => (string) ($question->type_name ?: ($data['question_type']['name'] ?? 'Question')),
            'is_objective' => (bool) ($question->is_objective ?? $data['question_type']['is_objective'] ?? false),
            'schema_key' => (string) ($data['schema_key'] ?? $data['question_type']['schema_key'] ?? ''),
            'statement_en' => (string) ($data['statement_en'] ?? ''),
            'statement_ur' => (string) ($data['statement_ur'] ?? ''),
            'description_en' => (string) ($data['description_en'] ?? ''),
            'description_ur' => (string) ($data['description_ur'] ?? ''),
            'content' => $content,
            'options' => $options,
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

<?php

namespace App\Support\Qat;

use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Topic;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QatCatalogueTransfer
{
    public function copy(array $data): array
    {
        return DB::transaction(function () use ($data): array {
            $patternId = (int) $data['source_pattern_id'];
            $classId = (int) $data['class_id'];
            $subjectId = (int) $data['subject_id'];
            $month = (int) $data['month'];

            $assigned = ClassSubject::query()
                ->where('pattern_id', $patternId)
                ->where('class_id', $classId)
                ->where('subject_id', $subjectId)
                ->exists();
            if (! $assigned) {
                throw ValidationException::withMessages([
                    'subject_id' => 'The selected subject does not belong to that pattern and class.',
                ]);
            }

            $chapters = Chapter::query()
                ->where('pattern_id', $patternId)
                ->where('class_id', $classId)
                ->where('subject_id', $subjectId)
                ->whereIn('id', $data['chapter_ids'])
                ->orderBy('sort_id')
                ->get();
            if ($chapters->count() !== count($data['chapter_ids'])) {
                throw ValidationException::withMessages([
                    'chapter_ids' => 'Select chapters from the chosen pattern, class and subject.',
                ]);
            }

            $selectedQuestions = isset($data['question_ids'])
                ? array_fill_keys($data['question_ids'], true)
                : null;
            if ($selectedQuestions !== null) {
                $availableQuestionIds = Question::query()->whereIn('chapter_id', $chapters->pluck('id'))
                    ->pluck('id')->all();
                if (array_diff(array_keys($selectedQuestions), $availableQuestionIds)) {
                    throw ValidationException::withMessages([
                        'question_ids' => 'Select questions from the chosen chapters only.',
                    ]);
                }
            }

            $now = now();
            $catalogueId = DB::table('qat_catalogues')->where('academic_year', $data['academic_year'])->value('id');
            if ($catalogueId === null) {
                $catalogueId = DB::table('qat_catalogues')->insertGetId([
                    'academic_year' => $data['academic_year'], 'created_at' => $now, 'updated_at' => $now,
                ]);
            }

            $qatClassId = DB::table('qat_classes')
                ->where('qat_catalogue_id', $catalogueId)
                ->where('source_class_id', $classId)
                ->value('id');
            if ($qatClassId === null) {
                $qatClassId = DB::table('qat_classes')->insertGetId([
                    'qat_catalogue_id' => $catalogueId,
                    'source_class_id' => $classId,
                    'name' => SchoolClass::query()->whereKey($classId)->value('name'),
                    'status' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            $qatSubject = DB::table('qat_subjects')
                ->where('qat_class_id', $qatClassId)
                ->where('subject_id', $subjectId)
                ->first();
            if (! $qatSubject) {
                $qatSubject = DB::table('qat_subjects')
                    ->where('qat_catalogue_id', $catalogueId)
                    ->where('class_id', $classId)
                    ->where('subject_id', $subjectId)
                    ->first();
                if ($qatSubject) {
                    DB::table('qat_subjects')->where('id', $qatSubject->id)->update(['qat_class_id' => $qatClassId]);
                }
            }
            if ($qatSubject && (int) $qatSubject->source_pattern_id !== $patternId) {
                throw ValidationException::withMessages([
                    'source_pattern_id' => 'This year, class and subject already use another source pattern.',
                ]);
            }
            $qatSubjectId = $qatSubject?->id ?? DB::table('qat_subjects')->insertGetId([
                'qat_class_id' => $qatClassId,
                'qat_catalogue_id' => $catalogueId,
                'class_id' => $classId,
                'class_name' => SchoolClass::query()->whereKey($classId)->value('name'),
                'subject_id' => $subjectId,
                'subject_name' => Subject::query()->whereKey($subjectId)->value('name_eng'),
                'status' => true,
                'source_pattern_id' => $patternId,
                'source_pattern_name' => Pattern::query()->whereKey($patternId)->value('name'),
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            if (array_key_exists('description', $data)) {
                $description = trim((string) $data['description']);
                if ($description === '') {
                    DB::table('qat_month_syllabi')
                        ->where('qat_subject_id', $qatSubjectId)
                        ->where('month', $month)
                        ->delete();
                } else {
                    DB::table('qat_month_syllabi')->upsert([[
                        'qat_subject_id' => $qatSubjectId,
                        'month' => $month,
                        'description' => $description,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]], ['qat_subject_id', 'month'], ['description', 'updated_at']);
                }
            }

            $report = ['chapters' => 0, 'topics' => 0, 'questions' => 0, 'month_assignments' => 0];
            if ($data['sync_month'] ?? false) {
                DB::table('qat_chapter_months')->where('month', $month)
                    ->whereIn('qat_chapter_id', DB::table('qat_chapters')->where('qat_subject_id', $qatSubjectId)->select('id'))
                    ->whereNotIn('qat_chapter_id', DB::table('qat_chapters')->where('qat_subject_id', $qatSubjectId)->whereIn('source_chapter_id', $data['chapter_ids'])->select('id'))
                    ->delete();
            }
            foreach ($chapters as $chapter) {
                $qatChapterId = DB::table('qat_chapters')
                    ->where('qat_subject_id', $qatSubjectId)
                    ->where('source_chapter_id', $chapter->id)
                    ->value('id');
                if ($qatChapterId === null) {
                    $qatChapterId = DB::table('qat_chapters')->insertGetId([
                        'qat_subject_id' => $qatSubjectId,
                        'source_chapter_id' => $chapter->id,
                        'name' => $chapter->name,
                        'name_ur' => $chapter->name_ur,
                        'chapter_number' => $chapter->chapter_number,
                        'sort_id' => $chapter->sort_id,
                        'status' => $chapter->status,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                    $report['chapters']++;
                }

                $inserted = DB::table('qat_chapter_months')->insertOrIgnore([
                    'qat_chapter_id' => $qatChapterId, 'month' => $month,
                ]);
                $report['month_assignments'] += $inserted;

                $topicIds = [];
                foreach (Topic::query()->where('chapter_id', $chapter->id)->orderBy('sort_id')->get() as $topic) {
                    $qatTopicId = DB::table('qat_topics')
                        ->where('qat_chapter_id', $qatChapterId)
                        ->where('source_topic_id', $topic->id)
                        ->value('id');
                    if ($qatTopicId === null) {
                        $qatTopicId = DB::table('qat_topics')->insertGetId([
                            'qat_chapter_id' => $qatChapterId,
                            'source_topic_id' => $topic->id,
                            'name' => $topic->name,
                            'name_ur' => $topic->name_ur,
                            'sort_id' => $topic->sort_id,
                            'status' => $topic->status,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                        $report['topics']++;
                    }
                    $topicIds[$topic->id] = $qatTopicId;
                }

                Question::query()->with(['options', 'questionType'])->where('chapter_id', $chapter->id)
                    ->orderBy('id')->chunk(200, function ($questions) use ($qatChapterId, $topicIds, $selectedQuestions, $now, &$report): void {
                        foreach ($questions as $question) {
                            if ($selectedQuestions !== null && ! isset($selectedQuestions[$question->id])) {
                                continue;
                            }
                            $report['questions'] += DB::table('qat_questions')->insertOrIgnore([
                                'qat_chapter_id' => $qatChapterId,
                                'qat_topic_id' => $question->topic_id ? ($topicIds[$question->topic_id] ?? null) : null,
                                'source_question_id' => $question->id,
                                'question_type_id' => $question->question_type_id,
                                'status' => $question->status,
                                'question_data' => json_encode($question->toArray(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                                'created_at' => $now,
                                'updated_at' => $now,
                            ]);
                        }
                    });
                $mapping = DB::table('qat_chapter_months')->where('qat_chapter_id', $qatChapterId)->where('month', $month);
                $previous = $mapping->value('source_question_ids');
                if (($data['sync_month'] ?? false) || $previous !== null) {
                    $ids = Question::query()->where('chapter_id', $chapter->id)
                        ->when($selectedQuestions !== null, fn ($query) => $query->whereIn('id', array_keys($selectedQuestions)))
                        ->pluck('id')->map(fn ($id) => (int) $id)->all();
                    if (! ($data['sync_month'] ?? false)) {
                        $ids = array_values(array_unique([...json_decode($previous, true), ...$ids]));
                    }
                    $mapping->update(['source_question_ids' => json_encode($ids)]);
                }
            }

            return $report;
        });
    }
}

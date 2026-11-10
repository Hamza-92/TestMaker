<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

final class SmartSyllabus
{
    /** @return array{chapters: array<int, int>, topics: array<int, int>} */
    public static function excludedForScope(int $patternId, int $classId, int $subjectId): array
    {
        $chapters = DB::table('smart_syllabus_excluded_chapters as exclusions')
            ->join('chapters', 'chapters.id', '=', 'exclusions.chapter_id')
            ->where('chapters.pattern_id', $patternId)
            ->where('chapters.class_id', $classId)
            ->where('chapters.subject_id', $subjectId)
            ->pluck('exclusions.chapter_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $topics = DB::table('smart_syllabus_excluded_topics as exclusions')
            ->join('topics', 'topics.id', '=', 'exclusions.topic_id')
            ->join('chapters', 'chapters.id', '=', 'topics.chapter_id')
            ->where('chapters.pattern_id', $patternId)
            ->where('chapters.class_id', $classId)
            ->where('chapters.subject_id', $subjectId)
            ->pluck('exclusions.topic_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        return compact('chapters', 'topics');
    }
}

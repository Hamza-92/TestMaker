<?php

namespace App\Support\Questions;

use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Question;

final class SubjectMediumResolver
{
    public static function resolve(int $patternId, int $classId, int $subjectId, string $fallback = 'English'): string
    {
        $assigned = ClassSubject::query()
            ->leftJoin('mediums', 'mediums.id', '=', 'class_subjects.medium_id')
            ->where('class_subjects.pattern_id', $patternId)
            ->where('class_subjects.class_id', $classId)
            ->where('class_subjects.subject_id', $subjectId)
            ->value('mediums.name');

        if (in_array($assigned, ['English', 'Urdu', 'Both'], true)) {
            return $assigned;
        }

        $questionScope = Question::query()
            ->whereHas('chapter', fn ($query) => $query
                ->where('pattern_id', $patternId)
                ->where('class_id', $classId)
                ->where('subject_id', $subjectId));
        $hasEnglish = (clone $questionScope)
            ->where(fn ($query) => $query->whereNotNull('statement_en')
                ->orWhereNotNull('description_en')
                ->orWhereNotNull('answer_en')
                ->orWhereHas('options', fn ($options) => $options->whereNotNull('text_en')))
            ->exists();
        $hasUrdu = (clone $questionScope)
            ->where(fn ($query) => $query->whereNotNull('statement_ur')
                ->orWhereNotNull('description_ur')
                ->orWhereNotNull('answer_ur')
                ->orWhereHas('options', fn ($options) => $options->whereNotNull('text_ur')))
            ->exists();

        if (! $hasEnglish && ! $hasUrdu) {
            $chapterScope = Chapter::query()
                ->where('pattern_id', $patternId)
                ->where('class_id', $classId)
                ->where('subject_id', $subjectId);
            $hasEnglish = (clone $chapterScope)->whereNotNull('name')->exists();
            $hasUrdu = (clone $chapterScope)->whereNotNull('name_ur')->exists();
        }

        return match (true) {
            $hasEnglish && $hasUrdu => 'Both',
            $hasUrdu => 'Urdu',
            $hasEnglish => 'English',
            default => $fallback,
        };
    }
}

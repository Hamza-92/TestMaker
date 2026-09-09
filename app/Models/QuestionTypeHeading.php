<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuestionTypeHeading extends Model
{
    protected $fillable = [
        'question_type_id', 'pattern_id', 'class_id', 'subject_id',
        'scope_key', 'heading_en', 'heading_ur',
    ];

    public static function scopeKey(int $patternId, ?int $classId = null, ?int $subjectId = null): string
    {
        return $patternId.':'.($classId ?? 0).':'.($subjectId ?? 0);
    }
}

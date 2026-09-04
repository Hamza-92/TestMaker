<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClassSubject extends Model
{
    public const SUBJECT_TYPES = ['chapter-wise', 'topic-wise'];

    protected $table = 'class_subjects';

    public $timestamps = false;

    protected $fillable = [
        'class_id',
        'pattern_id',
        'subject_id',
        'subject_type',
        'medium_id',
    ];

    public function effectiveSubjectType(): string
    {
        if (in_array($this->subject_type, self::SUBJECT_TYPES, true)) {
            return $this->subject_type;
        }

        $fallback = $this->relationLoaded('subject')
            ? $this->subject?->subject_type
            : $this->subject()->value('subject_type');

        return in_array($fallback, self::SUBJECT_TYPES, true) ? $fallback : 'chapter-wise';
    }

    public static function subjectTypeForScope(
        int $patternId,
        int $classId,
        int $subjectId,
        ?string $fallback = null,
    ): string {
        $subjectType = static::query()
            ->where('pattern_id', $patternId)
            ->where('class_id', $classId)
            ->where('subject_id', $subjectId)
            ->value('subject_type');

        if (in_array($subjectType, self::SUBJECT_TYPES, true)) {
            return $subjectType;
        }

        return in_array($fallback, self::SUBJECT_TYPES, true) ? $fallback : 'chapter-wise';
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function pattern(): BelongsTo
    {
        return $this->belongsTo(Pattern::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function medium(): BelongsTo
    {
        return $this->belongsTo(Medium::class);
    }
}

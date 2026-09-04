<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Chapter extends Model
{
    protected $fillable = [
        'subject_id',
        'class_id',
        'pattern_id',
        'name',
        'name_ur',
        'chapter_number',
        'group_name',
        'group_heading',
        'sort_id',
        'status',
        'created_by',
    ];

    public function effectiveSubjectType(): string
    {
        $fallback = $this->relationLoaded('subject')
            ? $this->subject?->subject_type
            : $this->subject()->value('subject_type');

        return ClassSubject::subjectTypeForScope(
            (int) $this->pattern_id,
            (int) $this->class_id,
            (int) $this->subject_id,
            $fallback,
        );
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function pattern(): BelongsTo
    {
        return $this->belongsTo(Pattern::class);
    }

    public function topics(): HasMany
    {
        return $this->hasMany(Topic::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(Question::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

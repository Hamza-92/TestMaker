<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ClassSubject extends Pivot
{
    protected $table = 'class_subjects';

    public $timestamps = false;

    protected $fillable = [
        'class_id',
        'subject_id',
        'medium_id',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
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

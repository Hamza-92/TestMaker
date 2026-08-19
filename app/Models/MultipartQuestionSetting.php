<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MultipartQuestionSetting extends Model
{
    protected $fillable = [
        'pattern_id',
        'class_id',
        'subject_id',
        'is_active',
        'max_parts',
        'choice_count',
        'heading_en',
        'heading_ur',
        'part_type_ids',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'max_parts' => 'integer',
            'choice_count' => 'integer',
            'part_type_ids' => 'array',
        ];
    }

    public function pattern(): BelongsTo
    {
        return $this->belongsTo(Pattern::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }
}

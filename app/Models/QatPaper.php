<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QatPaper extends Model
{
    protected $fillable = [
        'user_id', 'name', 'mode', 'class_ids', 'class_names', 'subject_name',
        'total_marks', 'question_count', 'paper_data', 'is_draft',
    ];

    protected function casts(): array
    {
        return [
            'class_ids' => 'array',
            'paper_data' => 'array',
            'total_marks' => 'float',
            'question_count' => 'integer',
            'is_draft' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

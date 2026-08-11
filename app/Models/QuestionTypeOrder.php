<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuestionTypeOrder extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'pattern_id',
        'class_id',
        'subject_id',
        'question_type_id',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'pattern_id' => 'integer',
            'class_id' => 'integer',
            'subject_id' => 'integer',
            'question_type_id' => 'integer',
            'sort_order' => 'integer',
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

    public function questionType(): BelongsTo
    {
        return $this->belongsTo(QuestionType::class);
    }
}

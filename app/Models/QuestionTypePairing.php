<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class QuestionTypePairing extends Model
{
    protected $fillable = [
        'pattern_id',
        'class_id',
        'subject_id',
        'question_type_a_id',
        'question_type_b_id',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'pattern_id' => 'integer',
            'class_id' => 'integer',
            'subject_id' => 'integer',
            'question_type_a_id' => 'integer',
            'question_type_b_id' => 'integer',
            'is_active' => 'boolean',
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

    public function questionTypeA(): BelongsTo
    {
        return $this->belongsTo(QuestionType::class, 'question_type_a_id');
    }

    public function questionTypeB(): BelongsTo
    {
        return $this->belongsTo(QuestionType::class, 'question_type_b_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function auditLogs(): MorphMany
    {
        return $this->morphMany(AuditLog::class, 'auditable')->latest('created_at');
    }
}

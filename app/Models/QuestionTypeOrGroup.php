<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class QuestionTypeOrGroup extends Model
{
    protected $table = 'question_type_or_groups';

    protected $fillable = [
        'pattern_id',
        'class_id',
        'subject_id',
        'type_signature',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'pattern_id' => 'integer',
            'class_id' => 'integer',
            'subject_id' => 'integer',
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

    public function members(): HasMany
    {
        return $this->hasMany(QuestionTypeOrGroupMember::class, 'group_id')
            ->orderBy('sort_order');
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

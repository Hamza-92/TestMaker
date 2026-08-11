<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class QuestionType extends Model
{
    protected $fillable = [
        'name',
        'name_ur',
        'heading_en',
        'heading_ur',
        'description_en',
        'description_ur',
        'have_exercise',
        'have_statement',
        'statement_label',
        'have_description',
        'description_label',
        'have_answer',
        'is_single',
        'is_objective',
        'schema_key',
        'objective_type_id',
        'column_per_row',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'have_exercise' => 'boolean',
            'have_statement' => 'boolean',
            'have_description' => 'boolean',
            'have_answer' => 'boolean',
            'is_single' => 'boolean',
            'is_objective' => 'boolean',
            'column_per_row' => 'integer',
            'status' => 'integer',
        ];
    }

    public function objectiveType(): BelongsTo
    {
        return $this->belongsTo(self::class, 'objective_type_id');
    }

    public function objectiveChildren(): HasMany
    {
        return $this->hasMany(self::class, 'objective_type_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(Question::class);
    }

    public function auditLogs(): MorphMany
    {
        return $this->morphMany(AuditLog::class, 'auditable')->latest('created_at');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

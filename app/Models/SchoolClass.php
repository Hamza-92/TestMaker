<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class SchoolClass extends Model
{
    protected $table = 'classes';

    protected $fillable = [
        'name',
        'sort_order',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'status' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (SchoolClass $schoolClass): void {
            if (! $schoolClass->sort_order) {
                $schoolClass->sort_order = ((int) static::query()->max('sort_order')) + 1;
            }
        });
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function patterns(): BelongsToMany
    {
        return $this->belongsToMany(Pattern::class, 'pattern_classes', 'class_id', 'pattern_id');
    }

    public function classSubjects(): HasMany
    {
        return $this->hasMany(ClassSubject::class, 'class_id');
    }

    public function chapters(): HasMany
    {
        return $this->hasMany(Chapter::class, 'class_id');
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

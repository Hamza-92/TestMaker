<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Pattern extends Model
{
    protected $fillable = [
        'name',
        'sort_order',
        'short_name',
        'description',
        'icon',
        'color',
        'paper_layout',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Pattern $pattern): void {
            if (! $pattern->sort_order) {
                $pattern->sort_order = ((int) static::query()->max('sort_order')) + 1;
            }
        });
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function classes(): BelongsToMany
    {
        return $this->belongsToMany(SchoolClass::class, 'pattern_classes', 'pattern_id', 'class_id')
            ->orderBy('classes.sort_order')
            ->orderBy('classes.id');
    }

    public function chapters(): HasMany
    {
        return $this->hasMany(Chapter::class);
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

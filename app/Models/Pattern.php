<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Pattern extends Model
{
    protected $fillable = [
        'name',
        'short_name',
        'status',
        'created_by',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function classes(): BelongsToMany
    {
        return $this->belongsToMany(SchoolClass::class, 'pattern_classes', 'pattern_id', 'class_id');
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

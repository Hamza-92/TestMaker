<?php

namespace App\Models;

use App\Enums\AuditEvent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AuditLog extends Model
{
    // Audit records are immutable — no updated_at
    public const UPDATED_AT = null;

    protected $fillable = [
        'auditable_type',
        'auditable_id',
        'event',
        'old_values',
        'new_values',
        'changed_by',
        'ip_address',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'event'      => AuditEvent::class,
            'old_values' => 'array',
            'new_values' => 'array',
        ];
    }

    // ── Static helper ─────────────────────────────────────────────────────────

    /**
     * Convenient factory method used across all models.
     *
     * Usage:
     *   AuditLog::record($user, AuditEvent::Updated, ['status' => 'active'], ['status' => 'suspended']);
     */
    public static function record(
        Model       $model,
        AuditEvent  $event,
        ?array      $oldValues = null,
        ?array      $newValues = null,
        ?User       $actor     = null,
        ?string     $notes     = null,
    ): static {
        return static::create([
            'auditable_type' => $model->getMorphClass(),
            'auditable_id'   => $model->getKey(),
            'event'          => $event,
            'old_values'     => $oldValues,
            'new_values'     => $newValues,
            'changed_by'     => $actor?->id ?? auth()->id(),
            'ip_address'     => request()->ip(),
            'notes'          => $notes,
        ]);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeForModel($query, Model $model)
    {
        return $query->where('auditable_type', $model->getMorphClass())
                     ->where('auditable_id', $model->getKey());
    }

    public function scopeEvent($query, AuditEvent $event)
    {
        return $query->where('event', $event->value);
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    /** The model that was changed (User, Subscription, or PaymentLog). */
    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }

    /** Who made the change. */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}

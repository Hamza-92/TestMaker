<?php

namespace App\Models;

use App\Enums\SubscriptionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Subscription extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'pattern_access',
        'class_access',
        'subject_access',
        'allow_teachers',
        'max_teachers',
        'allowed_questions',
        'amount',
        'started_at',
        'duration',
        'expired_at',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'pattern_access'  => 'array',
            'class_access'    => 'array',
            'subject_access'  => 'array',
            'allow_teachers'  => 'boolean',
            'amount'          => 'decimal:2',
            'started_at'     => 'datetime',
            'expired_at'     => 'datetime',
            'status'         => SubscriptionStatus::class,
        ];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function isActive(): bool
    {
        return $this->status === SubscriptionStatus::Active
            && ($this->expired_at === null || $this->expired_at->isFuture());
    }

    /** Calculate expiry from started_at + duration days and save. */
    public function computeExpiry(): static
    {
        $this->expired_at = $this->started_at->addDays($this->duration);

        return $this;
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function paymentLogs(): HasMany
    {
        return $this->hasMany(PaymentLog::class);
    }

    public function approvedPayment(): HasMany
    {
        return $this->paymentLogs()->where('status', 'approved');
    }

    /** Full audit trail for this subscription record. */
    public function auditLogs(): MorphMany
    {
        return $this->morphMany(AuditLog::class, 'auditable')->latest('created_at');
    }
}

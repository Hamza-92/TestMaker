<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class PaymentLog extends Model
{
    protected $fillable = [
        'subscription_id',
        'amount',
        'payment_method',
        'account_number',
        'status',
        'attachments',
        'reviewed_by',
        'reviewed_at',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount'         => 'decimal:2',
            'payment_method' => PaymentMethod::class,
            'status'         => PaymentStatus::class,
            'attachments'    => 'array',
            'reviewed_at'    => 'datetime',
        ];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function isPending(): bool
    {
        return $this->status === PaymentStatus::PendingReview;
    }

    public function isApproved(): bool
    {
        return $this->status === PaymentStatus::Approved;
    }

    /**
     * Transition status and record the change in audit_logs.
     * Usage: $payment->transitionTo(PaymentStatus::Approved, 'Proof verified', auth()->user());
     */
    public function transitionTo(PaymentStatus $newStatus, ?string $notes = null, ?User $actor = null): static
    {
        $oldStatus = $this->status;

        $this->status      = $newStatus;
        $this->reviewed_by = $actor?->id ?? $this->reviewed_by;
        $this->reviewed_at = now();
        $this->notes       = $notes ?? $this->notes;
        $this->save();

        AuditLog::record(
            model:     $this,
            event:     \App\Enums\AuditEvent::Updated,
            oldValues: ['status' => $oldStatus?->value],
            newValues: ['status' => $newStatus->value],
            actor:     $actor,
            notes:     $notes,
        );

        return $this;
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Full audit trail for this payment record. */
    public function auditLogs(): MorphMany
    {
        return $this->morphMany(AuditLog::class, 'auditable')->latest('created_at');
    }
}

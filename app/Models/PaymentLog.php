<?php

namespace App\Models;

use App\Enums\AuditEvent;
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
        'commission_amount',
        'payment_method',
        'account_number',
        'next_payment_date',
        'status',
        'attachments',
        'reviewed_by',
        'reviewed_at',
        'notes',
        'rejection_reason',
        'recorder_remarks',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'payment_method' => PaymentMethod::class,
            'status' => PaymentStatus::class,
            'attachments' => 'array',
            'reviewed_at' => 'datetime',
            'next_payment_date' => 'date',
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

    /** @return array<int, string> */
    public function allowedTransitionValues(): array
    {
        return match ($this->status) {
            PaymentStatus::PendingReview, PaymentStatus::Reviewed => [PaymentStatus::Approved->value, PaymentStatus::Rejected->value],
            PaymentStatus::Rejected => [PaymentStatus::Approved->value],
            default => [],
        };
    }

    public function canTransitionTo(PaymentStatus $newStatus): bool
    {
        return in_array($newStatus->value, $this->allowedTransitionValues(), true);
    }

    /**
     * Transition status and record the change in audit_logs.
     * Usage: $payment->transitionTo(PaymentStatus::Approved, 'Proof verified', auth()->user());
     */
    public function transitionTo(
        PaymentStatus $newStatus,
        ?string $notes = null,
        ?User $actor = null,
        ?string $rejectionReason = null,
    ): static {
        $oldStatus = $this->status;
        $oldRejectionReason = $this->rejection_reason;

        $this->status = $newStatus;

        if ($actor !== null) {
            $this->reviewed_by = $actor->id;
        }

        $this->reviewed_at = now();

        $this->notes = $notes ?? $this->notes;
        $this->rejection_reason = match ($newStatus) {
            PaymentStatus::Rejected => $rejectionReason,
            PaymentStatus::Approved => null,
            default => $this->rejection_reason,
        };
        $this->save();

        AuditLog::record(
            model: $this,
            event: AuditEvent::Updated,
            oldValues: [
                'status' => $oldStatus?->value,
                'rejection_reason' => $oldRejectionReason,
            ],
            newValues: [
                'status' => $newStatus->value,
                'rejection_reason' => $this->rejection_reason,
            ],
            actor: $actor,
            notes: $notes,
        );

        return $this;
    }

    public function resubmitWithRemarks(string $remarks, User $recorder): static
    {
        $oldStatus = $this->status;
        $this->recorder_remarks = $remarks;
        $this->status = PaymentStatus::PendingReview;
        $this->reviewed_by = null;
        $this->reviewed_at = null;
        $this->save();

        AuditLog::record(
            model: $this,
            event: AuditEvent::Updated,
            oldValues: ['status' => $oldStatus?->value],
            newValues: ['status' => PaymentStatus::PendingReview->value, 'recorder_remarks' => $remarks],
            actor: $recorder,
            notes: 'Recorder resubmitted rejected payment.',
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

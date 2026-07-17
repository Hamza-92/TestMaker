<?php

namespace App\Models;

use App\Concerns\HasPermissions;
use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

#[Fillable([
    'name', 'email', 'phone', 'password',
    'address', 'city', 'province', 'is_show_address',
    'school_name', 'logo',
    'user_type', 'school_id', 'status', 'account_type', 'created_by',
    'teacher_permissions', 'access_scope',
])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasPermissions, Notifiable, SoftDeletes, TwoFactorAuthenticatable;

    protected function casts(): array
    {
        return [
            'email_verified_at'        => 'datetime',
            'password'                 => 'hashed',
            'two_factor_confirmed_at'  => 'datetime',
            'is_show_address'          => 'boolean',
            'user_type'                => UserType::class,
            'status'                   => UserStatus::class,
            'account_type'             => AccountType::class,
            'teacher_permissions'      => 'array',
            'access_scope'             => 'array',
        ];
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    public function isSuperAdmin(): bool
    {
        return $this->user_type === UserType::SuperAdmin;
    }

    public function isCustomer(): bool
    {
        return $this->user_type === UserType::Customer;
    }

    public function isTeacher(): bool
    {
        return $this->user_type === UserType::Teacher;
    }

    public function isSchoolOwner(): bool
    {
        return $this->isCustomer();
    }

    public function isActive(): bool
    {
        return $this->status === UserStatus::Active;
    }

    public function hasTeacherPermission(string $permission): bool
    {
        if (! $this->isTeacher()) {
            return false;
        }

        return in_array($permission, (array) ($this->teacher_permissions ?? []), true);
    }

    public function schoolOwner(): ?User
    {
        if ($this->isSchoolOwner()) {
            return $this;
        }

        if ($this->isTeacher()) {
            return $this->school;
        }

        return null;
    }

    public function activeSchoolSubscription(): ?Subscription
    {
        $owner = $this->schoolOwner();

        if ($owner === null) {
            return null;
        }

        return $owner->subscriptions()
            ->where('status', 'active')
            ->latest('started_at')
            ->first();
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    /** The school this user (staff/teacher) belongs to. */
    public function school(): BelongsTo
    {
        return $this->belongsTo(User::class, 'school_id');
    }

    /** All staff/teachers under this school account. */
    public function members(): HasMany
    {
        return $this->hasMany(User::class, 'school_id');
    }

    public function teachers(): HasMany
    {
        return $this->hasMany(User::class, 'school_id')
            ->where('user_type', UserType::Teacher);
    }

    /** Who created this user. */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Users created by this user. */
    public function createdUsers(): HasMany
    {
        return $this->hasMany(User::class, 'created_by');
    }

    /** Active subscription. */
    public function activeSubscription(): HasMany
    {
        return $this->subscriptions()->where('status', 'active');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function paymentLogs(): HasMany
    {
        return $this->hasMany(PaymentLog::class, 'created_by');
    }

    /** Full audit trail for this user record. */
    public function auditLogs(): MorphMany
    {
        return $this->morphMany(AuditLog::class, 'auditable')->latest('created_at');
    }

    public function papers(): HasMany
    {
        return $this->hasMany(Paper::class);
    }

    public function onlineTests(): HasMany
    {
        return $this->hasMany(OnlineTest::class, 'school_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OnlineTest extends Model
{
    protected $fillable = [
        'school_id',
        'created_by',
        'pattern_id',
        'class_id',
        'subject_id',
        'title',
        'instructions',
        'duration_minutes',
        'timing_mode',
        'question_time_seconds',
        'auto_advance',
        'allow_back_navigation',
        'allow_skip',
        'shuffle_questions',
        'shuffle_options',
        'focus_loss_action',
        'require_fullscreen',
        'show_result',
        'show_correct_answers',
        'passing_percentage',
        'available_from',
        'available_until',
        'status',
        'share_token',
        'published_at',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'duration_minutes' => 'integer',
            'question_time_seconds' => 'integer',
            'auto_advance' => 'boolean',
            'allow_back_navigation' => 'boolean',
            'allow_skip' => 'boolean',
            'shuffle_questions' => 'boolean',
            'shuffle_options' => 'boolean',
            'require_fullscreen' => 'boolean',
            'show_result' => 'boolean',
            'show_correct_answers' => 'boolean',
            'passing_percentage' => 'integer',
            'available_from' => 'datetime',
            'available_until' => 'datetime',
            'published_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(User::class, 'school_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
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

    public function questions(): HasMany
    {
        return $this->hasMany(OnlineTestQuestion::class)->orderBy('sort_order');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(OnlineTestAttempt::class)->latest('created_at');
    }
}

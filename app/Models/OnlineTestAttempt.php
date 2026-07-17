<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OnlineTestAttempt extends Model
{
    protected $fillable = [
        'online_test_id',
        'attempt_token',
        'student_name',
        'student_class',
        'roll_number',
        'roll_number_normalized',
        'status',
        'current_index',
        'furthest_index',
        'score',
        'total_questions',
        'question_order',
        'focus_loss_count',
        'started_at',
        'question_started_at',
        'expires_at',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'current_index' => 'integer',
            'furthest_index' => 'integer',
            'score' => 'integer',
            'total_questions' => 'integer',
            'question_order' => 'array',
            'focus_loss_count' => 'integer',
            'started_at' => 'datetime',
            'question_started_at' => 'datetime',
            'expires_at' => 'datetime',
            'submitted_at' => 'datetime',
        ];
    }

    public function onlineTest(): BelongsTo
    {
        return $this->belongsTo(OnlineTest::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(OnlineTestAnswer::class)->orderBy('id');
    }
}

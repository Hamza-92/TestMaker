<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OnlineTestAnswer extends Model
{
    protected $fillable = [
        'online_test_attempt_id',
        'online_test_question_id',
        'selected_option_key',
        'is_correct',
        'answered_at',
    ];

    protected function casts(): array
    {
        return [
            'is_correct' => 'boolean',
            'answered_at' => 'datetime',
        ];
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(OnlineTestAttempt::class, 'online_test_attempt_id');
    }

    public function onlineTestQuestion(): BelongsTo
    {
        return $this->belongsTo(OnlineTestQuestion::class);
    }
}

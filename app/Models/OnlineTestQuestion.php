<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OnlineTestQuestion extends Model
{
    public $timestamps = true;

    protected $fillable = [
        'online_test_id',
        'question_id',
        'question_type_id',
        'chapter_id',
        'topic_id',
        'payload',
        'correct_option_key',
        'marks',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'marks' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function onlineTest(): BelongsTo
    {
        return $this->belongsTo(OnlineTest::class);
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }

    public function questionType(): BelongsTo
    {
        return $this->belongsTo(QuestionType::class);
    }

    public function chapter(): BelongsTo
    {
        return $this->belongsTo(Chapter::class);
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(OnlineTestAnswer::class);
    }
}

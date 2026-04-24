<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Question extends Model
{
    public const SOURCE_EXERCISE = 'exercise';

    public const SOURCE_ADDITIONAL = 'additional';

    public const SOURCE_PAST_PAPER = 'past paper';

    protected $fillable = [
        'question_type_id',
        'topic_id',
        'chapter_id',
        'statement_en',
        'statement_ur',
        'description_en',
        'description_ur',
        'answer_en',
        'answer_ur',
        'source',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'status' => 'integer',
        ];
    }

    public function questionType(): BelongsTo
    {
        return $this->belongsTo(QuestionType::class);
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function chapter(): BelongsTo
    {
        return $this->belongsTo(Chapter::class);
    }

    public function options(): HasMany
    {
        return $this->hasMany(QuestionOption::class)->orderBy('sort_order');
    }

    public function auditLogs(): MorphMany
    {
        return $this->morphMany(AuditLog::class, 'auditable')->latest('created_at');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public static function sourceValues(): array
    {
        return array_keys(self::sourceOptions());
    }

    public static function sourceOptions(): array
    {
        return [
            self::SOURCE_EXERCISE => 'Exercise',
            self::SOURCE_ADDITIONAL => 'Additional',
            self::SOURCE_PAST_PAPER => 'Past Paper',
        ];
    }

    public static function normalizeSource(mixed $value): ?string
    {
        $normalized = trim((string) $value);

        if ($normalized === '') {
            return null;
        }

        $normalized = strtolower(preg_replace('/\s+/', ' ', $normalized) ?? $normalized);

        if ($normalized === 'past papers') {
            return self::SOURCE_PAST_PAPER;
        }

        return in_array($normalized, self::sourceValues(), true)
            ? $normalized
            : null;
    }

    public static function sourceLabel(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = self::normalizeSource($value);

        if ($normalized === null) {
            return null;
        }

        return self::sourceOptions()[$normalized] ?? null;
    }
}

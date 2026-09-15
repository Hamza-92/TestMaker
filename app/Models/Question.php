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

    public const SOURCE_EXERCISE_EXAMPLES = 'exercise examples';

    public const SOURCE_CONCEPTUAL_QUESTIONS = 'conceptual questions';

    public const DIFFICULTY_EASY = 'easy';

    public const DIFFICULTY_MEDIUM = 'medium';

    public const DIFFICULTY_HARD = 'hard';

    protected $fillable = [
        'question_type_id',
        'schema_key',
        'medium_id',
        'topic_id',
        'chapter_id',
        'statement_en',
        'statement_ur',
        'description_en',
        'description_ur',
        'answer_en',
        'answer_ur',
        'content',
        'source',
        'difficulty',
        'status',
        'sort_order',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'content' => 'array',
            'status' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Question $question): void {
            if ((int) $question->sort_order < 1) {
                $question->sort_order = $question->nextSortOrder();
            }
        });

        static::updating(function (Question $question): void {
            if ($question->isDirty(['chapter_id', 'topic_id', 'question_type_id'])) {
                $question->sort_order = $question->nextSortOrder();
            }
        });
    }

    private function nextSortOrder(): int
    {
        return ((int) static::query()
            ->where('chapter_id', $this->chapter_id)
            ->where('question_type_id', $this->question_type_id)
            ->when(
                $this->topic_id === null,
                fn ($query) => $query->whereNull('topic_id'),
                fn ($query) => $query->where('topic_id', $this->topic_id),
            )
            ->when($this->exists, fn ($query) => $query->where('id', '!=', $this->getKey()))
            ->max('sort_order')) + 1;
    }

    public function questionType(): BelongsTo
    {
        return $this->belongsTo(QuestionType::class);
    }

    public function medium(): BelongsTo
    {
        return $this->belongsTo(Medium::class);
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
            self::SOURCE_EXERCISE_EXAMPLES => 'Exercise Examples',
            self::SOURCE_CONCEPTUAL_QUESTIONS => 'Conceptual Questions',
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

    public static function difficultyValues(): array
    {
        return [self::DIFFICULTY_EASY, self::DIFFICULTY_MEDIUM, self::DIFFICULTY_HARD];
    }
}

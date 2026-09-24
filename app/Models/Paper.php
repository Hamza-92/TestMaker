<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Paper extends Model
{
    protected $fillable = [
        'user_id',
        'folder_id',
        'name',
        'subject',
        'class_name',
        'total_marks',
        'paper_data',
        'is_draft',
    ];

    protected $casts = [
        'total_marks' => 'float',
        'is_draft' => 'boolean',
        'questions_count' => 'integer',
    ];

    protected function paperData(): Attribute
    {
        return Attribute::make(
            get: function ($value): array {
                $data = is_string($value) ? json_decode($value, true) : $value;

                if (! is_array($data) || ! isset($data['__tm_compressed'])) {
                    return is_array($data) ? $data : [];
                }

                $compressed = base64_decode((string) $data['__tm_compressed'], true);
                $json = $compressed === false ? false : gzdecode($compressed);
                $expanded = $json === false ? null : json_decode($json, true);

                return is_array($expanded) ? $expanded : [];
            },
            set: function ($value): array {
                $json = json_encode(
                    $value,
                    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
                );

                if ($json === false) {
                    $json = json_encode(is_array($value) ? $value : []) ?: '{}';
                }

                $compressed = gzencode($json, 6);

                return [
                    'paper_data' => $compressed === false
                        ? $json
                        : (json_encode([
                            '__tm_compressed' => base64_encode($compressed),
                        ], JSON_UNESCAPED_SLASHES) ?: $json),
                    'questions_count' => self::countQuestions($value),
                ];
            },
        );
    }

    public static function countQuestions(mixed $paperData): int
    {
        $sections = data_get($paperData, 'paper.sections', []);

        if (! is_array($sections)) {
            return 0;
        }

        return array_sum(array_map(
            static fn ($section): int => is_array($section['questions'] ?? null)
                ? count($section['questions'])
                : 0,
            $sections,
        ));
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(PaperFolder::class, 'folder_id');
    }
}

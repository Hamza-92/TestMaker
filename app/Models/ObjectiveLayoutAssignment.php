<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ObjectiveLayoutAssignment extends Model
{
    public const STANDARD = 'standard';

    public const FEDERAL_ROW = 'federal-row';

    protected $fillable = [
        'pattern_id',
        'class_id',
        'subject_id',
        'objective_layout',
        'show_bubbles',
    ];

    protected function casts(): array
    {
        return [
            'pattern_id' => 'integer',
            'class_id' => 'integer',
            'subject_id' => 'integer',
            'show_bubbles' => 'boolean',
        ];
    }

    public static function layouts(): array
    {
        return [
            self::STANDARD => 'Default objective layout',
            self::FEDERAL_ROW => 'One-line Federal objective table',
        ];
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
}

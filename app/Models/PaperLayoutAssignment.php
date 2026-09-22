<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaperLayoutAssignment extends Model
{
    protected $fillable = [
        'pattern_id',
        'class_id',
        'paper_layout',
    ];

    protected function casts(): array
    {
        return [
            'pattern_id' => 'integer',
            'class_id' => 'integer',
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
}

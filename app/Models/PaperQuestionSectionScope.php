<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaperQuestionSectionScope extends Model
{
    protected $fillable = [
        'pattern_id',
        'class_id',
        'subject_id',
        'is_active',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'pattern_id' => 'integer',
            'class_id' => 'integer',
            'subject_id' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}

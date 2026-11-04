<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubjectiveColumnSetting extends Model
{
    protected $fillable = [
        'pattern_id', 'class_id', 'subject_id', 'question_type_id', 'columns', 'apply_to_both',
    ];

    protected function casts(): array
    {
        return [
            'columns' => 'integer',
            'apply_to_both' => 'boolean',
        ];
    }
}

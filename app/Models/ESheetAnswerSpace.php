<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ESheetAnswerSpace extends Model
{
    protected $fillable = [
        'pattern_id', 'class_id', 'subject_id', 'question_type_id', 'lines', 'page_break',
    ];

    protected function casts(): array
    {
        return ['lines' => 'integer', 'page_break' => 'boolean'];
    }
}

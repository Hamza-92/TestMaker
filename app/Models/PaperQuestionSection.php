<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaperQuestionSection extends Model
{
    protected $fillable = [
        'pattern_id',
        'class_id',
        'subject_id',
        'sort_order',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'pattern_id' => 'integer',
            'class_id' => 'integer',
            'subject_id' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function members(): HasMany
    {
        return $this->hasMany(PaperQuestionSectionMember::class, 'section_id')->orderBy('sort_order');
    }
}

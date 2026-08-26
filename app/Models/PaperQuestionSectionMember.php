<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaperQuestionSectionMember extends Model
{
    protected $fillable = ['section_id', 'question_type_id', 'sort_order'];

    protected function casts(): array
    {
        return [
            'section_id' => 'integer',
            'question_type_id' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(PaperQuestionSection::class, 'section_id');
    }

    public function questionType(): BelongsTo
    {
        return $this->belongsTo(QuestionType::class);
    }
}

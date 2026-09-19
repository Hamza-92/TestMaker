<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomPaperLayoutItem extends Model
{
    protected $fillable = ['section_id', 'question_type_id', 'sort_order', 'shared_number_group', 'or_group'];

    protected function casts(): array
    {
        return ['section_id' => 'integer', 'question_type_id' => 'integer', 'sort_order' => 'integer', 'shared_number_group' => 'integer', 'or_group' => 'integer'];
    }

    public function questionType(): BelongsTo
    {
        return $this->belongsTo(QuestionType::class);
    }
}

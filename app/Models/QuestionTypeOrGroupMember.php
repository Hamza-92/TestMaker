<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuestionTypeOrGroupMember extends Model
{
    protected $table = 'question_type_or_group_members';

    protected $fillable = [
        'group_id',
        'question_type_id',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'group_id' => 'integer',
            'question_type_id' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(QuestionTypeOrGroup::class, 'group_id');
    }

    public function questionType(): BelongsTo
    {
        return $this->belongsTo(QuestionType::class);
    }
}

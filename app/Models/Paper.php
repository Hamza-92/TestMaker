<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Paper extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'subject',
        'class_name',
        'total_marks',
        'paper_data',
    ];

    protected $casts = [
        'paper_data' => 'array',
        'total_marks' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

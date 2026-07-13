<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaperTemplate extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'description',
        'settings',
        'structure',
    ];

    protected $casts = [
        'settings'  => 'array',
        'structure' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LegacyUserImport extends Model
{
    protected $fillable = [
        'source_user_id', 'target_user_id', 'subscription_id', 'source_account_type',
        'source_checksum', 'warnings', 'source_snapshot', 'transferred_by', 'transferred_at',
    ];

    protected function casts(): array
    {
        return [
            'warnings' => 'array',
            'source_snapshot' => 'array',
            'transferred_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }
}

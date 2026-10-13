<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteMenu extends Model
{
    protected $fillable = ['key', 'draft_items', 'published_items', 'version', 'published_at'];

    protected function casts(): array
    {
        return [
            'draft_items' => 'array',
            'published_items' => 'array',
            'version' => 'integer',
            'published_at' => 'datetime',
        ];
    }
}

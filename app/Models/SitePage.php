<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SitePage extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'slug', 'template', 'draft_content', 'published_content', 'version', 'published_at',
    ];

    protected function casts(): array
    {
        return [
            'draft_content' => 'array',
            'published_content' => 'array',
            'version' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(SitePageRevision::class);
    }
}

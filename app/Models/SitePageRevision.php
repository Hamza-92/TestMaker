<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SitePageRevision extends Model
{
    public $timestamps = false;

    protected $fillable = ['site_page_id', 'number', 'content', 'published_by', 'created_at'];

    protected function casts(): array
    {
        return ['site_page_id' => 'integer', 'content' => 'array', 'created_at' => 'datetime'];
    }

    public function page(): BelongsTo
    {
        return $this->belongsTo(SitePage::class, 'site_page_id');
    }
}

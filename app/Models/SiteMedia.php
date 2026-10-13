<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteMedia extends Model
{
    protected $table = 'site_media';

    protected $fillable = ['name', 'mime_type', 'byte_size', 'alt_text', 'caption', 'data_base64'];

    public function getUrlAttribute(): string
    {
        return route('site.media.show', $this, false);
    }
}

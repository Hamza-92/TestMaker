<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Announcement extends Model
{
    protected $fillable = [
        'title',
        'summary',
        'body',
        'type',
        'placement',
        'banner_style',
        'banner_direction',
        'banner_font',
        'banner_background',
        'banner_text_color',
        'status',
        'action_label',
        'action_url',
        'starts_at',
        'ends_at',
        'published_at',
        'is_dismissible',
        'sort_order',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'published_at' => 'datetime',
        'is_dismissible' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function dismissedBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'announcement_dismissals')
            ->withTimestamps();
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query
            ->where('status', 'published')
            ->where(function (Builder $query): void {
                $query->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function (Builder $query): void {
                $query->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            })
            ->orderByDesc('sort_order')
            ->orderByDesc('published_at')
            ->orderByDesc('id');
    }

    public function scopeForBanner(Builder $query): Builder
    {
        return $query->whereIn('placement', ['banner', 'both']);
    }

    public function scopeForCard(Builder $query): Builder
    {
        return $query->whereIn('placement', ['card', 'both']);
    }
}

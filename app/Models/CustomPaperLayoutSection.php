<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomPaperLayoutSection extends Model
{
    protected $fillable = ['layout_id', 'sort_order'];

    protected function casts(): array
    {
        return ['layout_id' => 'integer', 'sort_order' => 'integer'];
    }

    public function layout(): BelongsTo
    {
        return $this->belongsTo(CustomPaperLayout::class, 'layout_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(CustomPaperLayoutItem::class, 'section_id')->orderBy('sort_order');
    }
}

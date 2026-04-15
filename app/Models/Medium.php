<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Medium extends Model
{
    protected $table = 'mediums';

    public $timestamps = false;

    protected $fillable = ['name'];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function classSubjects(): HasMany
    {
        return $this->hasMany(ClassSubject::class);
    }
}

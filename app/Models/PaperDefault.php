<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaperDefault extends Model
{
    protected $fillable = ['user_id', 'settings', 'header', 'view_mode', 'num_sets'];

    protected function casts(): array
    {
        return ['settings' => 'array', 'header' => 'array', 'num_sets' => 'integer'];
    }
}

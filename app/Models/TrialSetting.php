<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrialSetting extends Model
{
    protected $fillable = [
        'trial_duration_days',
        'access_scope',
    ];

    protected $casts = [
        'access_scope' => 'array',
    ];

    public static function current(): self
    {
        return static::firstOrCreate([], [
            'trial_duration_days' => 30,
            'access_scope'        => ['questions', 'patterns', 'classes', 'subjects'],
        ]);
    }
}

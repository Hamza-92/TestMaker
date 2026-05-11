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
        $instance = static::firstOrCreate([], [
            'trial_duration_days' => 30,
            'access_scope'        => null,
        ]);

        // Fix records that were accidentally created with an indexed array default
        if (is_array($instance->access_scope) && array_key_exists(0, $instance->access_scope)) {
            $instance->update(['access_scope' => null]);
        }

        return $instance;
    }
}

<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Str;

final class TemporaryAccountEmail
{
    public static function forPhone(string $phone, string $fallback): string
    {
        $phone = Str::lower((string) preg_replace('/[^a-z0-9]+/i', '', trim($phone)));
        $base = $phone !== '' ? Str::limit($phone, 180, '') : $fallback;
        $candidate = $base.'@mail.com';

        if (! User::withTrashed()->whereRaw('LOWER(email) = ?', [$candidate])->exists()) {
            return $candidate;
        }

        $candidate = $base.'-'.$fallback.'@mail.com';
        $suffix = 1;
        while (User::withTrashed()->whereRaw('LOWER(email) = ?', [$candidate])->exists()) {
            $candidate = $base.'-'.$fallback.'-'.$suffix.'@mail.com';
            $suffix++;
        }

        return $candidate;
    }
}

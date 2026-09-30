<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthenticateUser
{
    public static function throttleIdentifier(string $identifier): string
    {
        $identifier = trim($identifier);
        if (str_contains($identifier, '@')) {
            return Str::lower($identifier);
        }

        $digits = preg_replace('/\D+/', '', $identifier);

        return $digits !== null && $digits !== '' ? self::localPhoneDigits($digits) : Str::lower($identifier);
    }

    public function __invoke(Request $request): ?User
    {
        $identifier = trim((string) $request->input('email'));
        $password = (string) $request->input('password');

        if (str_contains($identifier, '@')) {
            $user = User::query()->where('email', Str::lower($identifier))->first();
        } else {
            $user = $this->byPhone($identifier);
        }

        if (! $user || ! Hash::check($password, $user->password)) {
            return null;
        }

        if (config('hashing.rehash_on_login', true) && Hash::needsRehash($user->password)) {
            $user->forceFill(['password' => Hash::make($password)])->save();
        }

        return $user;
    }

    private function byPhone(string $identifier): ?User
    {
        $digits = preg_replace('/\D+/', '', $identifier);
        if ($digits === null || strlen($digits) < 7 || strlen($digits) > 15) {
            return null;
        }

        $local = self::localPhoneDigits($digits);
        $numbers = [$digits, $local];
        if (preg_match('/^03\d{9}$/', $local)) {
            $numbers[] = '92'.substr($local, 1);
            $numbers[] = '0092'.substr($local, 1);
            $numbers[] = substr($local, 1);
        }

        $normalizedPhone = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '(', ''), ')', ''), '.', '')";
        $matches = User::query()
            ->whereRaw($normalizedPhone.' in ('.implode(',', array_fill(0, count(array_unique($numbers)), '?')).')', array_values(array_unique($numbers)))
            ->limit(2)
            ->get();

        // A phone shared by multiple accounts cannot identify one account safely.
        return $matches->count() === 1 ? $matches->first() : null;
    }

    private static function localPhoneDigits(string $digits): string
    {
        return match (true) {
            strlen($digits) === 14 && str_starts_with($digits, '00923') => '0'.substr($digits, 4),
            strlen($digits) === 12 && str_starts_with($digits, '923') => '0'.substr($digits, 2),
            strlen($digits) === 10 && str_starts_with($digits, '3') => '0'.$digits,
            default => $digits,
        };
    }
}

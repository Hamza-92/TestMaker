<?php

namespace App\Support\Qat;

use App\Enums\AccountType;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class QatTrial
{
    public const LIMIT = 3;

    public static function school(User $user): ?User
    {
        $school = $user->schoolOwner();

        return $school?->account_type === AccountType::Trial && $school->qat_trial_ends_on !== null
            ? $school
            : null;
    }

    public static function summary(User $school): array
    {
        $expired = $school->qat_trial_ends_on->toDateString() < now('Asia/Karachi')->toDateString();
        $remaining = max(0, self::LIMIT - (int) $school->qat_trial_papers_used);

        return [
            'limit' => self::LIMIT,
            'remaining' => $remaining,
            'expired' => $expired,
            'locked' => $expired || $remaining === 0,
        ];
    }

    public static function charge(User $school, int $count): bool
    {
        return DB::transaction(function () use ($school, $count): bool {
            $updated = User::query()
                ->whereKey($school->id)
                ->where('account_type', AccountType::Trial->value)
                ->where('qat_trial_ends_on', '>=', now('Asia/Karachi')->toDateString())
                ->where('qat_trial_papers_used', '<=', self::LIMIT - $count)
                ->toBase()
                ->increment('qat_trial_papers_used', $count);
            $school->refresh();

            if ($updated === 1) {
                return (int) $school->qat_trial_papers_used === self::LIMIT;
            }

            $trial = self::school($school) ? self::summary($school) : null;
            if ($trial === null || $trial['locked']) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Your QAT trial is no longer available for generation.',
                    'redirect_url' => route('customer.qat.upgrade'),
                ], 423));
            }

            throw ValidationException::withMessages([
                'variants' => 'Only one trial paper remains. Select 1 Paper to generate it.',
            ]);
        });
    }
}

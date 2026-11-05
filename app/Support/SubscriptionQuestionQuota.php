<?php

namespace App\Support;

use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubscriptionQuestionQuota
{
    public static function summary(?Subscription $subscription): ?array
    {
        if (! $subscription?->is_question_based || (int) $subscription->allowed_questions <= 0) {
            return null;
        }

        $allowed = max(0, (int) $subscription->allowed_questions);
        $remaining = max(0, min($allowed, (int) ($subscription->remaining_questions ?? $allowed)));

        return [
            'allowed' => $allowed,
            'remaining' => $remaining,
            'remaining_percent' => $allowed > 0 ? round($remaining * 100 / $allowed) : 0,
        ];
    }

    public static function countSections(array $sections): int
    {
        return array_sum(array_map(static function ($section): int {
            if (! is_array($section)) {
                return 0;
            }
            $standard = is_array($section['questions'] ?? null) ? count($section['questions']) : 0;
            $multipart = 0;
            foreach (data_get($section, 'multipart.rows', []) as $row) {
                $multipart += is_array($row['parts'] ?? null) ? count($row['parts']) : 0;
            }

            return $standard + $multipart;
        }, $sections));
    }

    public static function charge(User $user, string $generationKey, int $count): ?array
    {
        return DB::transaction(function () use ($user, $generationKey, $count): ?array {
            $subscription = $user->activeSchoolSubscription();
            if (! $subscription?->is_question_based || (int) $subscription->allowed_questions <= 0 || $count === 0) {
                return self::summary($subscription);
            }

            $subscription = Subscription::query()->whereKey($subscription->id)->lockForUpdate()->firstOrFail();
            $existing = DB::table('subscription_question_usages')
                ->where('generation_key', $generationKey)->first();
            if ($existing) {
                if ((int) $existing->subscription_id !== $subscription->id || (int) $existing->user_id !== $user->id) {
                    throw ValidationException::withMessages(['paper' => 'This paper generation belongs to another account.']);
                }

                if ($count <= (int) $existing->question_count) {
                    return self::summary($subscription);
                }
            }

            $remaining = self::summary($subscription)['remaining'];
            $additional = $count - (int) ($existing->question_count ?? 0);
            if ($additional > $remaining) {
                throw ValidationException::withMessages([
                    'paper' => "Only {$remaining} questions remain in this subscription; this paper needs {$additional} more.",
                ]);
            }

            $subscription->remaining_questions = $remaining - $additional;
            $subscription->save();
            if ($existing) {
                DB::table('subscription_question_usages')->where('id', $existing->id)->update([
                    'question_count' => $count,
                    'updated_at' => now(),
                ]);
            } else {
                DB::table('subscription_question_usages')->insert([
                    'subscription_id' => $subscription->id,
                    'user_id' => $user->id,
                    'generation_key' => $generationKey,
                    'question_count' => $count,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return self::summary($subscription);
        });
    }
}

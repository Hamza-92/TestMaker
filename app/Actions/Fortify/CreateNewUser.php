<?php

namespace App\Actions\Fortify;

use App\Concerns\ProfileValidationRules;
use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\TrialSetting;
use App\Models\User;
use App\Support\Qat\QatTrial;
use App\Support\TemporaryAccountEmail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use ProfileValidationRules;

    /**
     * Validate and create a newly registered school owner.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        if (is_string($input['email'] ?? null)) {
            $input['email'] = Str::lower(trim($input['email']));
        }

        $validator = Validator::make($input, [
            ...$this->profileRules(),
            'email' => ['nullable', 'string', 'email', 'max:255', Rule::unique(User::class)],
            'school_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30', 'regex:/^[0-9+().\-\s]{7,30}$/'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'province' => ['required', 'string', 'max:100'],
            'terms' => ['accepted'],
            'password' => ['required', 'string', 'min:3', 'confirmed'],
            'trial_type' => ['sometimes', 'required', Rule::in(['standard', 'qat'])],
        ]);

        $validator->after(function ($validator) use ($input): void {
            $email = is_string($input['email'] ?? null) ? $input['email'] : '';
            $schoolName = is_string($input['school_name'] ?? null) ? Str::lower(trim($input['school_name'])) : '';

            if (! $validator->errors()->has('phone')) {
                $digits = preg_replace('/\D+/', '', $input['phone']);
                if (strlen($digits) < 7 || strlen($digits) > 15) {
                    $validator->errors()->add('phone', 'Enter a valid phone number with 7 to 15 digits.');
                }
            }

            if ($email !== '' && User::query()
                ->where('user_type', UserType::Customer->value)
                ->whereRaw('LOWER(email) = ?', [$email])
                ->exists()) {
                $validator->errors()->add('email', 'This customer already has a TestMaker account.');
            }

            if ($schoolName !== '' && User::query()
                ->where('user_type', UserType::Customer->value)
                ->whereRaw('LOWER(school_name) = ?', [$schoolName])
                ->exists()) {
                $validator->errors()->add('school_name', 'This school already has a customer account.');
            }
        });

        $validated = $validator->validate();
        $validated['phone'] = AuthenticateUser::throttleIdentifier($validated['phone']);

        return DB::transaction(function () use ($validated): User {
            // Ensure the configured trial access is ready for this new school.
            TrialSetting::current();

            return User::create([
                'name' => $validated['name'],
                'email' => ($validated['email'] ?? null) ?: TemporaryAccountEmail::forPhone($validated['phone'], 'signup'),
                'password' => $validated['password'],
                'phone' => $validated['phone'],
                'school_name' => $validated['school_name'],
                'address' => $validated['address'] ?? null,
                'city' => $validated['city'],
                'province' => $validated['province'],
                'user_type' => UserType::Customer->value,
                'status' => UserStatus::Active->value,
                'account_type' => AccountType::Trial->value,
                // The expiry date is inclusive, so signup counts as day one.
                'qat_trial_ends_on' => ($validated['trial_type'] ?? 'standard') === 'qat'
                    ? now('Asia/Karachi')->addDays(QatTrial::DURATION_DAYS - 1)->toDateString()
                    : null,
            ]);
        });
    }
}

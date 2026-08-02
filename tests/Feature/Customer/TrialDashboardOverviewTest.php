<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\TrialSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('trial dashboard uses the configured trial duration for expiry and progress', function () {
    TrialSetting::current()->update(['trial_duration_days' => 30]);

    $customer = User::factory()->create([
        'name' => 'Trial Owner',
        'school_name' => 'Trial School',
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
        'created_at' => now()->subDays(10),
    ]);

    $this
        ->actingAs($customer)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('customer/dashboard-view')
            ->where('school.plan_name', 'Trial')
            ->where('school.days_remaining', 20)
            ->where('school.subscription_remaining_percent', 67)
            ->where('school.subscription_ends_at', fn ($value) => is_string($value) && $value !== '')
        );
});

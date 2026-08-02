<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Pattern;
use App\Models\TrialSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('an available dashboard pattern can be preselected on the paper generator', function () {
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);

    $pattern = Pattern::create([
        'name' => 'Punjab Syllabus',
        'short_name' => 'PS',
        'status' => 1,
        'created_by' => null,
    ]);

    TrialSetting::current()->update(['access_scope' => null]);

    $this
        ->actingAs($customer)
        ->get(route('customer.papers.generate', ['pattern' => $pattern->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('customer/papers/generate')
            ->where('initialPatternId', $pattern->id)
        );
});

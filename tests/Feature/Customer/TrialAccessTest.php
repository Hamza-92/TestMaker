<?php

use App\Enums\UserType;
use App\Models\Pattern;
use App\Models\SchoolClass;
use App\Models\TrialSetting;
use App\Models\User;
use App\Support\AppUserAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('gives trial customers the full pattern access configured in trial settings', function () {
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'account_type' => 'trial',
    ]);
    $pattern = Pattern::create([
        'name' => 'Trial Pattern',
        'short_name' => 'TP',
        'status' => 1,
        'created_by' => null,
    ]);
    $schoolClass = SchoolClass::create([
        'name' => 'Trial Class',
        'status' => 1,
        'created_by' => null,
    ]);
    $pattern->classes()->attach($schoolClass->id);

    TrialSetting::current()->update(['access_scope' => null]);

    $access = AppUserAccess::resolve($customer);

    expect($access['scope'])->toBeNull()
        ->and($access['ids']['pattern_access'])->toBeNull()
        ->and(AppUserAccess::allowsPattern($access, $pattern->id))->toBeTrue()
        ->and(AppUserAccess::allowsClass($access, $pattern->id, $schoolClass->id))->toBeTrue();
});

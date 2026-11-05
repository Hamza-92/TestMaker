<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function profilePayload(User $school): array
{
    return [
        'name' => 'Updated Owner',
        'email' => $school->email,
        'phone' => '03001234567',
        'school_name' => 'Updated School',
        'address' => 'Main Road',
        'city' => 'Lahore',
        'province' => 'Punjab',
    ];
}

it('shows a trial profile as read only and rejects details and logo updates', function () {
    $school = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'account_type' => AccountType::Trial->value,
        'status' => UserStatus::Active->value,
        'school_name' => 'Original School',
    ]);

    $this->actingAs($school)->get(route('customer.profile'))
        ->assertOk()->assertInertia(fn ($page) => $page
        ->component('customer/profile')
        ->where('canUpdateProfile', false));

    $this->patch(route('customer.profile.update'), profilePayload($school))
        ->assertForbidden();
    $this->post(route('customer.profile.update'), [
        ...profilePayload($school),
        '_method' => 'PATCH',
        'logo' => UploadedFile::fake()->image('school.png'),
    ])->assertForbidden();

    expect($school->fresh()->school_name)->toBe('Original School')
        ->and($school->fresh()->logo)->toBeNull();
});

it('still lets a paid school update details and upload or remove its logo', function () {
    Storage::set('public', Storage::build([
        'driver' => 'local',
        'root' => sys_get_temp_dir().'/testmaker-profile-'.Str::uuid(),
    ]));

    $school = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'account_type' => AccountType::Paid->value,
        'status' => UserStatus::Active->value,
        'school_name' => 'Original School',
    ]);

    $this->actingAs($school)->get(route('customer.profile'))
        ->assertOk()->assertInertia(fn ($page) => $page
        ->component('customer/profile')
        ->where('canUpdateProfile', true));

    $this->from(route('customer.profile'))
        ->post(route('customer.profile.update'), [
            ...profilePayload($school),
            '_method' => 'PATCH',
            'logo' => UploadedFile::fake()->image('school.png'),
        ])->assertRedirect(route('customer.profile'))->assertSessionHasNoErrors();

    $school->refresh();
    expect($school->name)->toBe('Updated Owner')
        ->and($school->school_name)->toBe('Updated School')
        ->and($school->address)->toBe('Main Road')
        ->and($school->logo)->not->toBeNull();
    Storage::disk('public')->assertExists($school->logo);

    $oldLogo = $school->logo;
    $this->from(route('customer.profile'))
        ->post(route('customer.profile.update'), [
            ...profilePayload($school),
            '_method' => 'PATCH',
            'remove_logo' => true,
        ])->assertRedirect(route('customer.profile'))->assertSessionHasNoErrors();

    expect($school->fresh()->logo)->toBeNull();
    Storage::disk('public')->assertMissing($oldLogo);
});

it('also prevents a teacher under a trial school from changing profile details', function () {
    $school = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'account_type' => AccountType::Trial->value,
        'status' => UserStatus::Active->value,
    ]);
    $teacher = User::factory()->create([
        'user_type' => UserType::Teacher->value,
        'school_id' => $school->id,
        'status' => UserStatus::Active->value,
    ]);

    $this->actingAs($teacher)->get(route('customer.profile'))
        ->assertOk()->assertInertia(fn ($page) => $page
        ->component('customer/profile')
        ->where('canUpdateProfile', false));
    $this->patch(route('customer.profile.update'), profilePayload($teacher))
        ->assertForbidden();
    $this->patch(route('profile.update'), [
        'name' => 'Changed Teacher',
        'email' => $teacher->email,
    ])->assertForbidden();

    expect($teacher->fresh()->name)->not->toBe('Changed Teacher');
});

<?php

use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeMasterAdmin(): User
{
    return User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'status' => UserStatus::Active,
        'created_by' => null,
    ]);
}

function makeDelegatedAdmin(User $master, UserStatus $status = UserStatus::Active): User
{
    return User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'status' => $status,
        'created_by' => $master->id,
    ]);
}

it('lets the master log in as an active user and return to the master account', function () {
    $master = makeMasterAdmin();
    $target = makeDelegatedAdmin($master);

    $users = $this->actingAs($master)->get(route('superadmin.users'))
        ->assertOk()->viewData('page')['props']['users'];
    expect(collect($users)->firstWhere('id', $target->id)['can_login'])->toBeTrue();

    $this->post(route('superadmin.users.login', $target))
        ->assertRedirect(route('dashboard'));
    expect(auth()->id())->toBe($target->id)
        ->and(session('superadmin_impersonator_id'))->toBe($master->id);

    $this->get(route('dashboard'))->assertInertia(fn ($page) => $page->where('auth.is_admin_impersonating', true)
    );

    $this->post(route('superadmin.users.impersonation.stop'))
        ->assertRedirect(route('superadmin.users'));
    expect(auth()->id())->toBe($master->id)
        ->and(session()->has('superadmin_impersonator_id'))->toBeFalse();
});

it('rejects delegated, inactive, and non-user impersonation targets', function () {
    $master = makeMasterAdmin();
    $delegate = makeDelegatedAdmin($master);
    $inactive = makeDelegatedAdmin($master, UserStatus::Inactive);
    $customer = User::factory()->create(['user_type' => UserType::Customer]);

    $this->actingAs($delegate)->post(route('superadmin.users.login', $inactive))
        ->assertForbidden();
    $this->actingAs($master)->post(route('superadmin.users.login', $inactive))
        ->assertForbidden();
    $this->post(route('superadmin.users.login', $customer))->assertNotFound();
    $this->post(route('superadmin.users.login', $master))->assertNotFound();
    expect(auth()->id())->toBe($master->id);
});

it('does not allow a user to return as the master without an impersonation session', function () {
    $master = makeMasterAdmin();
    $delegate = makeDelegatedAdmin($master);

    $this->actingAs($delegate)
        ->post(route('superadmin.users.impersonation.stop'))
        ->assertForbidden();
    expect(auth()->id())->toBe($delegate->id);
});

<?php

use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->master = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'status' => UserStatus::Active,
        'created_by' => null,
    ]);
});

function delegatedAdmin(User $master, array $permissions = []): User
{
    $user = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'status' => UserStatus::Active,
        'created_by' => $master->id,
    ]);
    $user->syncPermissions($permissions);

    return $user;
}

it('allows only the granted announcement action', function () {
    $admin = delegatedAdmin($this->master, ['announcements.view']);

    $this->actingAs($admin)->get('/superadmin/announcements')->assertOk();
    $this->actingAs($admin)->get('/superadmin/announcements/add')->assertForbidden();
    $this->actingAs($admin)->get('/superadmin/data-transfer')->assertForbidden();
    $this->actingAs($admin)->get('/superadmin/user-transfer')->assertForbidden();
});

it('does not let an editor impersonate a customer without that permission', function () {
    $admin = delegatedAdmin($this->master, ['customers.edit']);
    $customer = User::factory()->create([
        'user_type' => UserType::Customer,
        'status' => UserStatus::Active,
    ]);

    $this->actingAs($admin)->post("/superadmin/customers/{$customer->id}/login")->assertForbidden();
});

it('prevents delegated permission escalation and self assignment', function () {
    $manager = delegatedAdmin($this->master, ['users.manage_permissions', 'announcements.view']);
    $target = delegatedAdmin($this->master);

    $this->actingAs($manager)
        ->put("/superadmin/users/{$manager->id}/permissions", ['permissions' => ['announcements.view']])
        ->assertForbidden();

    $this->actingAs($manager)
        ->put("/superadmin/users/{$target->id}/permissions", ['permissions' => ['questions.delete']])
        ->assertForbidden();

    $this->actingAs($manager)
        ->put("/superadmin/users/{$target->id}/permissions", ['permissions' => ['announcements.view']])
        ->assertRedirect();

    expect($target->fresh()->hasPermission('announcements.view'))->toBeTrue();
    expect($target->fresh()->hasPermission('questions.delete'))->toBeFalse();
});

it('prevents an editor from taking over a more privileged admin account', function () {
    $editor = delegatedAdmin($this->master, ['users.edit']);
    $privileged = delegatedAdmin($this->master, ['questions.delete']);

    $this->actingAs($editor)->get("/superadmin/users/{$privileged->id}/edit")->assertForbidden();
    $this->actingAs($editor)
        ->put("/superadmin/users/{$privileged->id}", [
            'name' => 'Taken over',
            'email' => $privileged->email,
            'status' => 'active',
            'password' => 'newpassword',
            'password_confirmation' => 'newpassword',
        ])->assertForbidden();

    $this->actingAs($editor)->get("/superadmin/users/{$editor->id}/edit")->assertForbidden();
});

it('keeps deployment helpers master only and blocks inactive admins', function () {
    $admin = delegatedAdmin($this->master, ['announcements.view']);
    $this->actingAs($admin)->get('/run-seed')->assertForbidden();
    $this->actingAs($admin)->get('/run-assign-permissions')->assertNotFound();

    $admin->update(['status' => UserStatus::Inactive]);
    $this->actingAs($admin)->get('/superadmin/announcements')->assertForbidden();
});



it('keeps every Superadmin route tied to a seeded Gate', function () {
    foreach (\Illuminate\Support\Facades\Route::getRoutes() as $route) {
        if (! str_starts_with($route->uri(), 'superadmin/')) {
            continue;
        }

        $permissions = array_filter(
            $route->gatherMiddleware(),
            fn (string $middleware) => str_starts_with($middleware, 'permission:')
        );

        expect($permissions)->not->toBeEmpty();

        foreach ($permissions as $middleware) {
            foreach (explode(',', substr($middleware, strlen('permission:'))) as $ability) {
                expect(\App\Models\Permission::where('name', $ability)->exists())->toBeTrue();
                expect(\Illuminate\Support\Facades\Gate::has($ability))->toBeTrue();
            }
        }
    }
});


it('allows explicitly granted impersonation and returns to the admin dashboard', function () {
    $admin = delegatedAdmin($this->master, ['customers.impersonate']);
    $customer = User::factory()->create([
        'user_type' => UserType::Customer,
        'status' => UserStatus::Active,
    ]);

    $this->actingAs($admin)->post("/superadmin/customers/{$customer->id}/login")
        ->assertRedirect(route('dashboard'));
    expect(auth()->id())->toBe($customer->id);

    $this->post(route('impersonation.stop'))->assertRedirect(route('dashboard'));
    expect(auth()->id())->toBe($admin->id);
});


it('saves and edits the same delegated permissions repeatedly', function () {
    $admin = delegatedAdmin($this->master);

    $this->actingAs($this->master)
        ->put("/superadmin/users/{$admin->id}/permissions", [
            'permissions' => ['announcements.view', 'questions.view'],
        ])->assertRedirect();
    expect($admin->fresh()->getPermissionNames())->toContain('announcements.view', 'questions.view');

    $this->actingAs($admin)->get('/superadmin/announcements')->assertOk();

    $this->actingAs($this->master)
        ->get("/superadmin/users/{$admin->id}/permissions")->assertOk();

    $this->actingAs($this->master)
        ->put("/superadmin/users/{$admin->id}/permissions", [
            'permissions' => ['announcements.view', 'questions.edit'],
        ])->assertRedirect();

    expect($admin->fresh()->getPermissionNames())
        ->toContain('announcements.view', 'questions.edit')
        ->not->toContain('questions.view');
    $this->actingAs($admin)->get('/superadmin/questions')->assertForbidden();
});

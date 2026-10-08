<?php

use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Permission;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;

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

it('shows manageable user controls to the master and opens their editors', function () {
    $target = delegatedAdmin($this->master, ['questions.delete']);
    $customer = User::factory()->create(['user_type' => UserType::Customer]);

    $page = $this->actingAs($this->master)->get('/superadmin/users')->assertOk()->viewData('page');
    $users = collect($page['props']['users'])->keyBy('id');

    expect($users[$target->id]['can_manage'])->toBeTrue();
    expect($users->has($this->master->id))->toBeFalse();
    expect($users->has($customer->id))->toBeFalse();
    expect($page['props']['auth']['is_master'])->toBeTrue();

    $this->get("/superadmin/users/{$target->id}/edit")->assertOk();
    $this->get("/superadmin/users/{$target->id}/permissions")->assertOk();
});

it('keeps the user list management flags consistent with delegated account boundaries', function () {
    $manager = delegatedAdmin($this->master, [
        'users.view', 'users.edit', 'users.manage_permissions', 'announcements.view',
    ]);
    $eligible = delegatedAdmin($this->master, ['announcements.view']);
    $privileged = delegatedAdmin($this->master, ['questions.delete']);

    $page = $this->actingAs($manager)->get('/superadmin/users')->assertOk()->viewData('page');
    $users = collect($page['props']['users'])->keyBy('id');

    expect($users[$eligible->id]['can_manage'])->toBeTrue();
    expect($users[$privileged->id]['can_manage'])->toBeFalse();
    expect($users[$manager->id]['can_manage'])->toBeFalse();

    $this->get("/superadmin/users/{$eligible->id}/edit")->assertOk();
    $this->get("/superadmin/users/{$eligible->id}/permissions")->assertOk();
    $this->get("/superadmin/users/{$privileged->id}/edit")->assertForbidden();
    $this->get("/superadmin/users/{$privileged->id}/permissions")->assertForbidden();
});

it('does not allow a user viewer to edit accounts or assign permissions', function () {
    $viewer = delegatedAdmin($this->master, ['users.view']);
    $target = delegatedAdmin($this->master);

    $page = $this->actingAs($viewer)->get('/superadmin/users')->assertOk()->viewData('page');
    expect($page['props']['auth']['permissions'])->toBe(['users.view']);

    $this->get("/superadmin/users/{$target->id}/edit")->assertForbidden();
    $this->get("/superadmin/users/{$target->id}/permissions")->assertForbidden();
    $this->put("/superadmin/users/{$target->id}", [
        'name' => 'Unauthorized edit', 'email' => $target->email, 'status' => 'inactive',
    ])->assertForbidden();
    $this->put("/superadmin/users/{$target->id}/permissions", ['permissions' => ['users.view']])
        ->assertForbidden();

    expect($target->fresh()->name)->toBe($target->name);
    expect($target->fresh()->getPermissionNames())->toBe([]);
});

it('saves an authorized account edit without changing its password or permissions', function () {
    $target = delegatedAdmin($this->master, ['announcements.view']);
    $originalPassword = $target->password;

    $this->actingAs($this->master)->put("/superadmin/users/{$target->id}", [
        'name' => 'Updated Administrator', 'email' => $target->email, 'status' => 'active',
        'password' => '', 'password_confirmation' => '',
    ])->assertRedirect(route('superadmin.users'));

    $updated = $target->fresh();
    expect($updated->name)->toBe('Updated Administrator');
    expect($updated->password)->toBe($originalPassword);
    expect($updated->getPermissionNames())->toBe(['announcements.view']);
});

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

it('allows question form resources to admins with create or edit permission', function () {
    $creator = delegatedAdmin($this->master, ['questions.create']);
    $editor = delegatedAdmin($this->master, ['questions.edit']);
    $viewer = delegatedAdmin($this->master, ['questions.view']);

    foreach ([$creator, $editor] as $admin) {
        $this->actingAs($admin)->getJson(route('superadmin.questions.form-chapters'))->assertOk();
        $this->postJson(route('superadmin.questions.images'), [
            'file' => UploadedFile::fake()->image('diagram.png'),
        ])->assertOk();
    }

    $this->actingAs($viewer)->getJson(route('superadmin.questions.form-chapters'))->assertForbidden();
    $this->postJson(route('superadmin.questions.images'), [
        'file' => UploadedFile::fake()->image('diagram.png'),
    ])->assertForbidden();
});

it('keeps every Superadmin route tied to a seeded Gate', function () {
    foreach (Route::getRoutes() as $route) {
        if (! str_starts_with($route->uri(), 'superadmin/')) {
            continue;
        }

        $permissions = array_filter(
            $route->gatherMiddleware(),
            fn (string $middleware) => str_starts_with($middleware, 'permission:')
        );

        expect($permissions)->not->toBeEmpty();

        foreach ($permissions as $middleware) {
            foreach (explode(',', substr($middleware, strlen('permission:'))) as $requirement) {
                foreach (explode('|', $requirement) as $ability) {
                    expect(Permission::where('name', $ability)->exists())->toBeTrue();
                    expect(Gate::has($ability))->toBeTrue();
                }
            }
        }
    }
});

it('allows explicitly granted impersonation and returns to the admin dashboard', function () {
    $admin = delegatedAdmin($this->master, ['customers.impersonate']);
    $customer = User::factory()->create([
        'user_type' => UserType::Customer,
        'status' => UserStatus::Active,
        'created_by' => $admin->id,
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

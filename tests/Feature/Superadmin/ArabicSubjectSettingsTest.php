<?php

use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\AuditLog;
use App\Models\Subject;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->master = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'status' => UserStatus::Active,
        'created_by' => null,
    ]);
});

it('shows and updates Arabic subjects without changing other subject details', function () {
    $arabic = Subject::create([
        'name_eng' => 'Arabic',
        'subject_type' => 'chapter-wise',
        'status' => 1,
    ]);
    $urdu = Subject::create([
        'name_eng' => 'Urdu',
        'subject_type' => 'chapter-wise',
        'status' => 1,
    ]);

    $this->actingAs($this->master)->get(route('superadmin.arabic-subjects'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/arabic-subjects')
            ->where('subjects.0.is_arabic', false));

    $this->put(route('superadmin.arabic-subjects.update'), [
        'subject_ids' => [$arabic->id],
    ])->assertRedirect(route('superadmin.arabic-subjects'));

    expect($arabic->fresh()->is_arabic)->toBeTrue();
    expect($urdu->fresh()->is_arabic)->toBeFalse();
    expect($arabic->fresh()->name_eng)->toBe('Arabic');
    expect(AuditLog::query()->forModel($arabic)->count())->toBe(1);

    $this->put(route('superadmin.arabic-subjects.update'), [
        'subject_ids' => [],
    ])->assertRedirect(route('superadmin.arabic-subjects'));

    expect($arabic->fresh()->is_arabic)->toBeFalse();
    expect(AuditLog::query()->forModel($arabic)->count())->toBe(2);
});

it('requires dedicated Arabic subject permissions and rejects unknown subjects', function () {
    $subject = Subject::create([
        'name_eng' => 'Arabic',
        'subject_type' => 'chapter-wise',
        'status' => 1,
    ]);
    $viewer = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'status' => UserStatus::Active,
        'created_by' => $this->master->id,
    ]);
    $viewer->syncPermissions(['subjects.view', 'subjects.edit']);

    $this->actingAs($viewer)->get(route('superadmin.arabic-subjects'))->assertForbidden();
    $this->put(route('superadmin.arabic-subjects.update'), [
        'subject_ids' => [$subject->id],
    ])->assertForbidden();
    expect($subject->fresh()->is_arabic)->toBeFalse();

    $viewer->syncPermissions(['arabic_subjects.view']);

    $this->actingAs($viewer)->get(route('superadmin.arabic-subjects'))->assertOk();
    $this->put(route('superadmin.arabic-subjects.update'), [
        'subject_ids' => [$subject->id],
    ])->assertForbidden();
    expect($subject->fresh()->is_arabic)->toBeFalse();

    $this->actingAs($this->master)->put(route('superadmin.arabic-subjects.update'), [
        'subject_ids' => [$subject->id, 999999],
    ])->assertSessionHasErrors('subject_ids.1');
    expect($subject->fresh()->is_arabic)->toBeFalse();
});

it('lets an assigned editor update Arabic subjects', function () {
    $subject = Subject::create([
        'name_eng' => 'Arabic',
        'subject_type' => 'chapter-wise',
        'status' => 1,
    ]);
    $editor = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'status' => UserStatus::Active,
        'created_by' => $this->master->id,
    ]);
    $editor->syncPermissions(['arabic_subjects.view', 'arabic_subjects.edit']);

    $this->actingAs($editor)->get(route('superadmin.arabic-subjects'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/arabic-subjects')
            ->where('auth.permissions', ['arabic_subjects.view', 'arabic_subjects.edit'])
            ->etc());

    $this->put(route('superadmin.arabic-subjects.update'), [
        'subject_ids' => [$subject->id],
    ])->assertRedirect(route('superadmin.arabic-subjects'));

    expect($subject->fresh()->is_arabic)->toBeTrue();
});

it('lists Arabic subject permissions in the user permission form', function () {
    $user = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'created_by' => $this->master->id,
    ]);

    $page = $this->actingAs($this->master)
        ->get(route('superadmin.users.permissions', $user))
        ->assertOk()
        ->viewData('page');
    $group = collect($page['props']['permissionGroups'])->firstWhere('group', 'Arabic Subjects');

    expect($group)->not->toBeNull()
        ->and(collect($group['permissions'])->pluck('name')->all())
        ->toBe(['arabic_subjects.edit', 'arabic_subjects.view']);
});

<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Pattern;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Subscription;
use App\Models\User;
use App\Support\SubscriptionAccess;
use App\Support\TeacherAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function teacherAccessSchool(bool $allowOnlineTests = false, ?array $scope = null): User
{
    $owner = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Paid->value,
    ]);

    Subscription::create([
        'user_id' => $owner->id,
        'name' => 'School plan',
        'access_scope' => $scope,
        'allow_teachers' => true,
        'allow_online_mcq_tests' => $allowOnlineTests,
        'max_teachers' => 10,
        'is_question_based' => false,
        'amount' => '1000.00',
        'started_at' => now()->subDay(),
        'duration' => 365,
        'expired_at' => now()->addYear(),
        'status' => 'active',
        'created_by' => $owner->id,
    ]);

    return $owner;
}

test('new teachers start without feature or content access', function () {
    $owner = teacherAccessSchool();

    $response = $this->actingAs($owner)->post(route('customer.teachers.store'), [
        'name' => 'New Teacher',
        'email' => 'new.teacher@example.com',
        'password' => 'secret123',
        'password_confirmation' => 'secret123',
        'status' => 'active',
    ]);

    $teacher = User::where('email', 'new.teacher@example.com')->firstOrFail();

    $response->assertRedirect(route('customer.teachers.permissions', $teacher));
    expect($teacher->teacher_permissions)->toBe([]);
    expect($teacher->access_scope)->toBe([]);
});

test('teacher access page lists only school content and available features', function () {
    $owner = teacherAccessSchool(false);
    $teacher = User::factory()->create([
        'user_type' => UserType::Teacher->value,
        'status' => UserStatus::Active->value,
        'school_id' => $owner->id,
        'teacher_permissions' => [],
        'access_scope' => [],
    ]);

    $response = $this->actingAs($owner)->get(route('customer.teachers.permissions', $teacher));

    $response->assertOk();
    $props = $response->viewData('page')['props'];
    expect($props['teacher']['teacher_permissions'])->toBe([]);
    expect($props['teacher']['access_scope'])->toBe([]);

    $permissionNames = array_column($props['permissionCatalog'], 'name');
    expect($permissionNames)->toContain('generate_papers', 'manage_own_papers', 'view_school_papers');
    expect($permissionNames)->not->toContain('view_question_bank', 'manage_online_tests');
});

test('teacher access updates reject unavailable features and preserve an empty scope', function () {
    $owner = teacherAccessSchool(false);
    $teacher = User::factory()->create([
        'user_type' => UserType::Teacher->value,
        'status' => UserStatus::Active->value,
        'school_id' => $owner->id,
        'teacher_permissions' => [],
        'access_scope' => [],
    ]);

    $this->actingAs($owner)->put(route('customer.teachers.permissions.update', $teacher), [
        'permissions' => ['manage_online_tests'],
        'access_scope' => [],
    ])->assertSessionHasErrors('permissions.0');

    $this->actingAs($owner)->put(route('customer.teachers.permissions.update', $teacher), [
        'permissions' => ['view_question_bank'],
        'access_scope' => [],
    ])->assertSessionHasErrors('permissions.0');

    $this->actingAs($owner)->put(route('customer.teachers.permissions.update', $teacher), [
        'permissions' => ['generate_papers'],
        'access_scope' => [],
    ])->assertRedirect(route('customer.teachers.index'));

    $teacher->refresh();
    expect($teacher->teacher_permissions)->toBe(['generate_papers']);
    expect($teacher->access_scope)->toBe([]);
});

test('online test permission is available only when the school add-on is enabled', function () {
    $owner = teacherAccessSchool(true);
    $teacher = User::factory()->create([
        'user_type' => UserType::Teacher->value,
        'status' => UserStatus::Active->value,
        'school_id' => $owner->id,
        'teacher_permissions' => [],
        'access_scope' => [],
    ]);

    $response = $this->actingAs($owner)->get(route('customer.teachers.permissions', $teacher));
    $response->assertOk();
    expect(array_column($response->viewData('page')['props']['permissionCatalog'], 'name'))
        ->toContain('manage_online_tests');

    $this->actingAs($owner)->put(route('customer.teachers.permissions.update', $teacher), [
        'permissions' => ['manage_online_tests'],
        'access_scope' => [],
    ])->assertRedirect(route('customer.teachers.index'));

    expect($teacher->fresh()->teacher_permissions)->toBe(['manage_online_tests']);
});

test('teacher access cannot be changed after teacher management is removed from the plan', function () {
    $owner = teacherAccessSchool();
    $teacher = User::factory()->create([
        'user_type' => UserType::Teacher->value,
        'status' => UserStatus::Active->value,
        'school_id' => $owner->id,
        'teacher_permissions' => [],
        'access_scope' => [],
    ]);
    $owner->subscriptions()->firstOrFail()->update(['allow_teachers' => false]);

    $this->actingAs($owner)->put(route('customer.teachers.permissions.update', $teacher), [
        'permissions' => ['generate_papers'],
        'access_scope' => null,
    ])->assertForbidden();

    expect($teacher->fresh()->teacher_permissions)->toBe([]);
    expect($teacher->access_scope)->toBe([]);
});

test('teacher content choices cannot exceed the school subscription', function () {
    $owner = teacherAccessSchool();
    $pattern = Pattern::create([
        'name' => 'Teacher Board',
        'short_name' => 'TB',
        'status' => 1,
        'created_by' => $owner->id,
    ]);
    $class = SchoolClass::create([
        'name' => 'Class 9',
        'status' => 1,
        'created_by' => $owner->id,
    ]);
    $allowedSubject = Subject::create([
        'name_eng' => 'Math',
        'name_ur' => 'Math',
        'subject_type' => 'chapter-wise',
        'status' => 1,
        'created_by' => $owner->id,
    ]);
    $otherSubject = Subject::create([
        'name_eng' => 'Physics',
        'name_ur' => 'Physics',
        'subject_type' => 'chapter-wise',
        'status' => 1,
        'created_by' => $owner->id,
    ]);

    DB::table('pattern_classes')->insert(['pattern_id' => $pattern->id, 'class_id' => $class->id]);
    DB::table('class_subjects')->insert([
        ['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $allowedSubject->id],
        ['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $otherSubject->id],
    ]);

    $owner->subscriptions()->firstOrFail()->update([
        'access_scope' => [
            (string) $pattern->id => [
                'classes' => [(string) $class->id => ['subjects' => [$allowedSubject->id]]],
            ],
        ],
    ]);

    $teacher = User::factory()->create([
        'user_type' => UserType::Teacher->value,
        'status' => UserStatus::Active->value,
        'school_id' => $owner->id,
        'teacher_permissions' => [],
        'access_scope' => [],
    ]);

    $response = $this->actingAs($owner)->get(route('customer.teachers.permissions', $teacher));

    $response->assertOk();
    expect(array_column($response->viewData('page')['props']['subjects'], 'id'))
        ->toBe([$allowedSubject->id]);

    $this->actingAs($owner)->put(route('customer.teachers.permissions.update', $teacher), [
        'permissions' => [],
        'access_scope' => [
            (string) $pattern->id => [
                'classes' => [(string) $class->id => ['subjects' => [$allowedSubject->id, $otherSubject->id]]],
            ],
        ],
    ])->assertRedirect(route('customer.teachers.index'));

    $effectiveScope = TeacherAccess::effectiveScope(
        $teacher->fresh(),
        $owner->subscriptions()->firstOrFail(),
        SubscriptionAccess::buildMaps(),
    );

    expect($effectiveScope[(string) $pattern->id]['classes'][(string) $class->id]['subjects'])
        ->toBe([$allowedSubject->id]);
});

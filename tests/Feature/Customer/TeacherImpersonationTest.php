<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function schoolWithTeacherAccess(): User
{
    $school = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Paid->value,
    ]);

    Subscription::create([
        'user_id' => $school->id,
        'name' => 'School plan',
        'allow_teachers' => true,
        'max_teachers' => 10,
        'is_question_based' => false,
        'amount' => '1000.00',
        'started_at' => now()->subDay(),
        'duration' => 365,
        'expired_at' => now()->addYear(),
        'status' => 'active',
        'created_by' => $school->id,
    ]);

    return $school;
}

function schoolTeacher(User $school, string $status = 'active'): User
{
    return User::factory()->create([
        'user_type' => UserType::Teacher->value,
        'status' => $status,
        'school_id' => $school->id,
    ]);
}

test('a school owner can log in as an active teacher and return to the school account', function () {
    $school = schoolWithTeacherAccess();
    $teacher = schoolTeacher($school);

    $this->actingAs($school)->post(route('customer.teachers.login', $teacher))
        ->assertRedirect(route('dashboard'));

    expect(auth()->id())->toBe($teacher->id)
        ->and(session('teacher_impersonator_id'))->toBe($school->id);

    $this->get(route('dashboard'))->assertOk()
        ->assertInertia(fn ($page) => $page->where('auth.is_teacher_impersonating', true));

    $this->post(route('customer.teachers.impersonation.stop'))
        ->assertRedirect(route('customer.teachers.index'));

    expect(auth()->id())->toBe($school->id)
        ->and(session()->has('teacher_impersonator_id'))->toBeFalse();

    $this->actingAs($teacher)->get(route('dashboard'))->assertOk()
        ->assertInertia(fn ($page) => $page->where('auth.is_teacher_impersonating', false));
});

test('a school owner cannot enter another school teacher or an inactive teacher account', function () {
    $school = schoolWithTeacherAccess();
    $otherSchool = schoolWithTeacherAccess();
    $otherTeacher = schoolTeacher($otherSchool);
    $inactiveTeacher = schoolTeacher($school, UserStatus::Inactive->value);

    $this->actingAs($school)->post(route('customer.teachers.login', $otherTeacher))
        ->assertNotFound();
    $this->post(route('customer.teachers.login', $inactiveTeacher))
        ->assertForbidden();

    expect(auth()->id())->toBe($school->id)
        ->and(session()->has('teacher_impersonator_id'))->toBeFalse();
});

test('teacher login is unavailable when the school plan does not allow teachers', function () {
    $school = schoolWithTeacherAccess();
    $teacher = schoolTeacher($school);
    $school->subscriptions()->update(['allow_teachers' => false]);

    $this->actingAs($school)->post(route('customer.teachers.login', $teacher))
        ->assertForbidden();

    expect(auth()->id())->toBe($school->id);
});

test('teachers cannot enter another teacher account or return without a valid school session', function () {
    $school = schoolWithTeacherAccess();
    $otherSchool = schoolWithTeacherAccess();
    $teacher = schoolTeacher($school);
    $colleague = schoolTeacher($school);

    $this->actingAs($teacher)->post(route('customer.teachers.login', $colleague))
        ->assertNotFound();
    $this->post(route('customer.teachers.impersonation.stop'))
        ->assertForbidden();
    $this->withSession(['teacher_impersonator_id' => $otherSchool->id])
        ->post(route('customer.teachers.impersonation.stop'))
        ->assertForbidden();

    expect(auth()->id())->toBe($teacher->id);
});

test('returning from a teacher preserves an existing superadmin school session', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    $school = schoolWithTeacherAccess();
    $teacher = schoolTeacher($school);

    $this->actingAs($school)
        ->withSession(['impersonator_id' => $admin->id])
        ->post(route('customer.teachers.login', $teacher))
        ->assertRedirect(route('dashboard'));

    $this->post(route('customer.teachers.impersonation.stop'))
        ->assertRedirect(route('customer.teachers.index'));

    expect(auth()->id())->toBe($school->id)
        ->and(session('impersonator_id'))->toBe($admin->id);
});

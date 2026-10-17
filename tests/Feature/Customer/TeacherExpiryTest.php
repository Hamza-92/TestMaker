<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

function expirySchool(): User
{
    $owner = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Paid->value,
    ]);

    Subscription::create([
        'user_id' => $owner->id,
        'name' => 'School plan',
        'allow_teachers' => true,
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

function expiryTeacher(User $owner, ?string $expiresOn): User
{
    return User::factory()->create([
        'user_type' => UserType::Teacher->value,
        'status' => UserStatus::Active->value,
        'school_id' => $owner->id,
        'teacher_expires_on' => $expiresOn,
    ]);
}

test('a school can set extend and clear a teacher expiry date', function () {
    $this->travelTo(Carbon::parse('2026-10-17 10:00:00', 'Asia/Karachi'));
    $owner = expirySchool();

    $this->actingAs($owner)->post(route('customer.teachers.store'), [
        'name' => 'Teacher One',
        'email' => 'teacher.expiry@example.com',
        'password' => 'secret123',
        'password_confirmation' => 'secret123',
        'status' => 'active',
        'expires_on' => '2026-10-17',
    ])->assertSessionHasNoErrors();

    $teacher = User::where('email', 'teacher.expiry@example.com')->firstOrFail();
    expect($teacher->teacher_expires_on->toDateString())->toBe('2026-10-17')
        ->and($teacher->teacherAccessExpired())->toBeFalse();

    $this->get(route('customer.teachers.index'))->assertInertia(fn ($page) => $page
        ->where('teachers.0.expires_on', '2026-10-17')
        ->where('teachers.0.access_expired', false));

    $this->travelTo(Carbon::parse('2026-10-18 00:01:00', 'Asia/Karachi'));
    expect($teacher->teacherAccessExpired())->toBeTrue();

    $this->put(route('customer.teachers.update', $teacher), [
        'name' => $teacher->name,
        'email' => $teacher->email,
        'password' => '',
        'status' => 'active',
        'expires_on' => '2026-10-20',
    ])->assertSessionHasNoErrors();
    expect($teacher->fresh()->teacherAccessExpired())->toBeFalse();

    $this->put(route('customer.teachers.update', $teacher), [
        'name' => $teacher->name,
        'email' => $teacher->email,
        'password' => '',
        'status' => 'active',
    ])->assertSessionHasNoErrors();
    expect($teacher->fresh()->teacher_expires_on->toDateString())->toBe('2026-10-20');

    $this->put(route('customer.teachers.update', $teacher), [
        'name' => $teacher->name,
        'email' => $teacher->email,
        'password' => '',
        'status' => 'active',
        'expires_on' => '',
    ])->assertSessionHasNoErrors();
    expect($teacher->fresh()->teacher_expires_on)->toBeNull();

    $this->travelBack();
});

test('invalid teacher expiry dates are rejected', function () {
    $owner = expirySchool();
    $this->actingAs($owner)->post(route('customer.teachers.store'), [
        'name' => 'Teacher One',
        'email' => 'teacher.invalid@example.com',
        'password' => 'secret123',
        'password_confirmation' => 'secret123',
        'status' => 'active',
        'expires_on' => 'tomorrow',
    ])->assertSessionHasErrors('expires_on');

    expect(User::where('email', 'teacher.invalid@example.com')->exists())->toBeFalse();
});

test('expired teachers cannot sign in or enter through the school account', function () {
    $owner = expirySchool();
    $teacher = expiryTeacher($owner, now('Asia/Karachi')->subDay()->toDateString());

    $this->post(route('login.store'), [
        'email' => $teacher->email,
        'password' => 'password',
    ])->assertSessionHasErrors('email');
    $this->assertGuest();

    $this->actingAs($owner)->post(route('customer.teachers.login', $teacher))
        ->assertForbidden();
    $this->assertAuthenticatedAs($owner);
});

test('an existing teacher session ends after expiry while the return to school action remains available', function () {
    $this->travelTo(Carbon::parse('2026-10-17 10:00:00', 'Asia/Karachi'));
    $owner = expirySchool();
    $teacher = expiryTeacher($owner, '2026-10-17');

    $this->actingAs($teacher)->get(route('dashboard'))->assertOk();

    $this->travelTo(Carbon::parse('2026-10-18 00:01:00', 'Asia/Karachi'));
    $this->get(route('dashboard'))->assertRedirect(route('login'));
    $this->assertGuest();

    $this->actingAs($teacher)->withSession(['teacher_impersonator_id' => $owner->id])
        ->post(route('customer.teachers.impersonation.stop'))
        ->assertRedirect(route('customer.teachers.index'));
    $this->assertAuthenticatedAs($owner);

    $this->travelBack();
});

<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\TrialSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('a paper creator can upload a replacement image for a saved paper', function () {
    TrialSetting::current()->update(['access_scope' => null]);
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);

    $response = $this->actingAs($customer)->postJson(route('customer.papers.images'), [
        'file' => UploadedFile::fake()->image('drawing.png'),
    ]);

    $response->assertOk()->assertJsonStructure(['location']);
    $path = $response->json('location');
    expect(DB::table('question_images')->count())->toBe(1);
    $this->get($path)->assertOk()->assertHeader('Content-Type', 'image/png');
});

test('paper image replacement rejects non-image files and unauthenticated uploads', function () {
    $this->postJson(route('customer.papers.images'), [
        'file' => UploadedFile::fake()->image('drawing.png'),
    ])->assertUnauthorized();

    TrialSetting::current()->update(['access_scope' => null]);
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);
    $this->actingAs($customer)->postJson(route('customer.papers.images'), [
        'file' => UploadedFile::fake()->create('notes.txt', 1, 'text/plain'),
    ])->assertUnprocessable()->assertJsonValidationErrors('file');
    expect(DB::table('question_images')->count())->toBe(0);
});

test('a teacher without paper generation access cannot upload replacement images', function () {
    $school = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
    ]);
    $teacher = User::factory()->create([
        'user_type' => UserType::Teacher->value,
        'status' => UserStatus::Active->value,
        'school_id' => $school->id,
        'teacher_permissions' => ['view_school_papers'],
    ]);

    $this->actingAs($teacher)->postJson(route('customer.papers.images'), [
        'file' => UploadedFile::fake()->image('drawing.png'),
    ])->assertForbidden();
    expect(DB::table('question_images')->count())->toBe(0);
});

test('a teacher who can manage their papers can replace an image', function () {
    $school = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
    ]);
    $teacher = User::factory()->create([
        'user_type' => UserType::Teacher->value,
        'status' => UserStatus::Active->value,
        'school_id' => $school->id,
        'teacher_permissions' => ['manage_own_papers'],
    ]);

    $this->actingAs($teacher)->postJson(route('customer.papers.images'), [
        'file' => UploadedFile::fake()->image('drawing.png'),
    ])->assertOk();
});

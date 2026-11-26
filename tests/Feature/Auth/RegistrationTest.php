<?php

use App\Models\TrialSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::registration());
    $this->signupData = [
        'name' => 'Phone Owner', 'password' => 'abc', 'password_confirmation' => 'abc',
        'school_name' => 'Phone Signup Academy', 'phone' => '+92 300 1234567',
        'city' => 'Lahore', 'province' => 'Punjab', 'terms' => 'on',
    ];
});

test('the standard registration page can be rendered', function () {
    TrialSetting::current()->update(['trial_duration_days' => 17]);

    $this->get(route('register'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('auth/register')
            ->where('trialType', 'standard')->where('trialDurationDays', 17));
});

test('the previous QAT registration URL redirects to the dedicated page', function () {
    $this->get(route('register', ['trial' => 'qat']))->assertRedirectToRoute('register.qat');
});

test('the QAT registration page requires guest access and enabled registration', function () {
    config(['fortify.features' => []]);
    $this->get(route('register.qat'))->assertNotFound();

    config(['fortify.features' => [Features::registration()]]);
    $this->actingAs(User::factory()->create())->get(route('register.qat'))->assertRedirect();
});

test('new schools can register for a trial', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'School Owner',
        'email' => 'owner@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'school_name' => 'TestMaker Academy',
        'phone' => '03001234567',
        'address' => '12 Learning Street',
        'city' => 'Lahore',
        'province' => 'Punjab',
        'terms' => 'on',
    ]);

    $this->assertGuest();
    $response->assertRedirectToRoute('login')->assertSessionHas('status');

    $this->assertDatabaseHas('users', [
        'email' => 'owner@example.com',
        'school_name' => 'TestMaker Academy',
        'phone' => '03001234567',
        'user_type' => 'customer',
        'status' => 'active',
        'account_type' => 'trial',
    ]);

    expect(User::where('email', 'owner@example.com')->value('city'))->toBe('Lahore')
        ->and(User::where('email', 'owner@example.com')->value('qat_trial_ends_on'))->toBeNull()
        ->and(TrialSetting::query()->exists())->toBeTrue();
});

test('QAT registration grants three calendar days and three papers', function () {
    $this->freezeTime();
    TrialSetting::current()->update(['trial_duration_days' => 17]);
    $this->get(route('register.qat'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('auth/register')
            ->where('trialType', 'qat')->where('trialLimit', 3)->where('trialDurationDays', 3));

    $this->post(route('register.store'), [
        'name' => 'QAT Owner', 'email' => 'qat-owner@example.test',
        'password' => 'password', 'password_confirmation' => 'password',
        'school_name' => 'QAT Practice Academy', 'phone' => '03001234567',
        'city' => 'Lahore', 'province' => 'Punjab', 'terms' => 'on',
        'trial_type' => 'qat', 'user_type' => 'superadmin', 'account_type' => 'paid',
        'qat_trial_papers_used' => -100,
    ])->assertRedirectToRoute('login');

    $school = User::where('email', 'qat-owner@example.test')->firstOrFail();
    expect($school->qat_trial_ends_on->toDateString())->toBe(now('Asia/Karachi')->addDays(2)->toDateString())
        ->and($school->qat_trial_papers_used)->toBe(0)
        ->and($school->account_type->value)->toBe('trial')
        ->and($school->user_type->value)->toBe('customer')
        ->and($school->subscriptions()->exists())->toBeFalse();
    $this->assertGuest();
    $this->get(route('dashboard'))->assertRedirectToRoute('login');
    $this->post(route('login.store'), ['email' => $school->phone, 'password' => 'password'])
        ->assertRedirectToRoute('dashboard');
    $this->assertAuthenticatedAs($school);
    $this->get(route('dashboard'))->assertRedirectToRoute('customer.qat.index');
    $this->get(route('customer.papers.generate'))->assertRedirectToRoute('customer.qat.index');
    $this->get(route('customer.qat.index'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.school_context.qat_only', true)
            ->where('auth.school_context.qat_trial.limit', 3)
            ->where('auth.school_context.qat_trial.remaining', 3));
});

test('registration rejects an unsupported trial type', function () {
    $this->post(route('register.store'), [
        'name' => 'Invalid Owner', 'email' => 'invalid-trial@example.test',
        'password' => 'password', 'password_confirmation' => 'password',
        'school_name' => 'Invalid Trial School', 'phone' => '03001234567',
        'city' => 'Lahore', 'province' => 'Punjab', 'terms' => 'on',
        'trial_type' => 'paid',
    ])->assertSessionHasErrors('trial_type');

    expect(User::where('email', 'invalid-trial@example.test')->exists())->toBeFalse();
});

test('schools can sign up without email and then log in using their phone or generated email', function (string $trialType) {
    $this->post(route('register.store'), [...$this->signupData, 'trial_type' => $trialType])
        ->assertSessionHasNoErrors()->assertRedirectToRoute('login')->assertSessionHas('status');

    $this->assertGuest();
    $school = User::where('email', '03001234567@mail.com')->firstOrFail();
    expect($school->phone)->toBe('03001234567')
        ->and($school->qat_trial_ends_on !== null)->toBe($trialType === 'qat');
    $this->get(route('login'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('auth/login')->where('status', fn ($message) => str_contains($message, 'account has been created')));
    $this->post(route('login.store'), ['email' => '0092 300 1234567', 'password' => 'abc'])
        ->assertRedirectToRoute('dashboard');
    $this->assertAuthenticatedAs($school);

    $this->post(route('logout'))->assertRedirect();
    $this->post(route('login.store'), ['email' => $school->email, 'password' => 'abc'])
        ->assertRedirectToRoute('dashboard');
    $this->assertAuthenticatedAs($school);
})->with(['standard', 'qat']);

test('blank optional email values also get a phone based address', function (?string $email) {
    $this->post(route('register.store'), [...$this->signupData, 'email' => $email])
        ->assertSessionHasNoErrors()->assertRedirectToRoute('login');

    $this->assertGuest();
    $this->assertDatabaseHas('users', ['phone' => '03001234567', 'email' => '03001234567@mail.com']);
})->with([null, '']);

test('signup requires a usable phone number', function (?string $phone) {
    $this->post(route('register.store'), [...$this->signupData, 'phone' => $phone])
        ->assertSessionHasErrors('phone');

    $this->assertGuest();
    expect(User::query()->count())->toBe(0);
})->with([null, '', 'letters', '123456', '1234567890123456', '(((((((']);

test('signup phone formats work with the existing shared number login behavior', function (string $phone) {
    User::factory()->create([
        'user_type' => 'customer', 'phone' => '0300-1234567', 'school_name' => 'Existing School',
    ]);

    $this->post(route('register.store'), [...$this->signupData, 'phone' => $phone])
        ->assertSessionHasNoErrors()->assertRedirectToRoute('login');

    $this->assertGuest();
    $school = User::where('email', '03001234567@mail.com')->firstOrFail();
    expect($school->phone)->toBe('03001234567');
    $this->post(route('login.store'), ['email' => $phone, 'password' => 'abc'])
        ->assertRedirectToRoute('dashboard');
    $this->assertAuthenticatedAs($school);
})->with(['03001234567', '+92 300 1234567', '0092-300-1234567', '3001234567']);

test('generated email avoids existing and deleted account email addresses', function () {
    User::factory()->create(['email' => '03001234567@mail.com'])->delete();
    User::factory()->create(['email' => '03001234567-signup@mail.com']);

    $this->post(route('register.store'), $this->signupData)
        ->assertSessionHasNoErrors()->assertRedirectToRoute('login');

    $this->assertGuest();
    $this->assertDatabaseHas('users', ['phone' => '03001234567', 'email' => '03001234567-signup-1@mail.com']);
});

test('provided optional email is normalized and validated', function () {
    $this->post(route('register.store'), [...$this->signupData, 'email' => 'invalid-email'])
        ->assertSessionHasErrors('email');
    expect(User::query()->count())->toBe(0);

    $this->post(route('register.store'), [...$this->signupData, 'email' => ' Owner@Example.Test '])
        ->assertSessionHasNoErrors()->assertRedirectToRoute('login');

    $this->assertGuest();
    $this->assertDatabaseHas('users', ['email' => 'owner@example.test', 'phone' => '03001234567']);
});

test('JSON signup also leaves the account signed out and returns the login destination', function () {
    $this->postJson(route('register.store'), $this->signupData)->assertCreated()
        ->assertJsonPath('redirect_url', route('login'));

    $this->assertGuest();
    $this->get(route('dashboard'))->assertRedirectToRoute('login');
});

test('school trials accept a three character password even with strict application defaults', function (string $trialType) {
    $defaults = Password::$defaultCallback;
    Password::defaults(fn () => Password::min(12)->mixedCase()->numbers()->symbols());

    try {
        $this->post(route('register.store'), [
            'name' => 'Trial Owner', 'email' => 'short-password@example.test',
            'password' => 'abc', 'password_confirmation' => 'abc',
            'school_name' => 'Short Password School', 'phone' => '03001234567',
            'city' => 'Lahore', 'province' => 'Punjab', 'terms' => 'on',
            'trial_type' => $trialType,
        ])->assertSessionHasNoErrors()->assertRedirectToRoute('login');

        $school = User::where('email', 'short-password@example.test')->firstOrFail();
        $this->assertGuest();
        expect(Hash::check('abc', $school->password))->toBeTrue()
            ->and($school->qat_trial_ends_on !== null)->toBe($trialType === 'qat');
    } finally {
        Password::$defaultCallback = $defaults;
    }
})->with(['standard', 'qat']);

test('registration still requires at least three characters and matching confirmation', function (string $password, string $confirmation) {
    $this->post(route('register.store'), [
        'name' => 'Trial Owner', 'email' => 'invalid-password@example.test',
        'password' => $password, 'password_confirmation' => $confirmation,
        'school_name' => 'Password Validation School', 'phone' => '03001234567',
        'city' => 'Lahore', 'province' => 'Punjab', 'terms' => 'on',
        'trial_type' => 'qat',
    ])->assertSessionHasErrors('password');

    $this->assertGuest();
    expect(User::where('email', 'invalid-password@example.test')->exists())->toBeFalse();
})->with([
    'too short' => ['ab', 'ab'],
    'missing' => ['', ''],
    'confirmation mismatch' => ['abc', 'abd'],
]);
test('existing customers cannot register a second account with the same email', function () {
    User::factory()->create([
        'email' => 'existing@example.com',
        'school_name' => 'Existing School',
        'user_type' => 'customer',
        'account_type' => 'trial',
    ]);

    $response = $this->post(route('register.store'), [
        'name' => 'Another Owner',
        'email' => 'existing@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'school_name' => 'Another School',
        'phone' => '03001234567',
        'city' => 'Lahore',
        'province' => 'Punjab',
        'terms' => 'on',
    ]);

    $response->assertSessionHasErrors('email');
    expect(User::where('email', 'existing@example.com')->count())->toBe(1);
});

test('existing customers cannot register the same school twice', function () {
    User::factory()->create([
        'email' => 'existing@example.com',
        'school_name' => 'Existing School',
        'user_type' => 'customer',
        'account_type' => 'trial',
    ]);

    $response = $this->post(route('register.store'), [
        'name' => 'Another Owner',
        'email' => 'another@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'school_name' => 'existing school',
        'phone' => '03001234567',
        'city' => 'Lahore',
        'province' => 'Punjab',
        'terms' => 'on',
    ]);

    $response->assertSessionHasErrors('school_name');
    expect(User::where('email', 'another@example.com')->exists())->toBeFalse();
});

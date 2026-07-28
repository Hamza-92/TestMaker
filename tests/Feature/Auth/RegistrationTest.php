<?php

use App\Models\TrialSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Fortify\Features;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::registration());
});

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
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

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));

    $this->assertDatabaseHas('users', [
        'email' => 'owner@example.com',
        'school_name' => 'TestMaker Academy',
        'phone' => '03001234567',
        'user_type' => 'customer',
        'status' => 'active',
        'account_type' => 'trial',
    ]);

    expect(User::where('email', 'owner@example.com')->value('city'))->toBe('Lahore')
        ->and(TrialSetting::query()->exists())->toBeTrue();
});
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
<?php

use App\Enums\UserType;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('guests can view the homepage', function () {
    $this->get(route('home'))->assertOk();
});

test('signed-in superadmins and customers skip the homepage', function () {
    $this->withoutMiddleware(HandleInertiaRequests::class);

    foreach ([UserType::SuperAdmin, UserType::Customer] as $userType) {
        $user = User::factory()->make(['user_type' => $userType]);

        $this->actingAs($user)
            ->get(route('home'))
            ->assertRedirect(route('dashboard'));
    }
});

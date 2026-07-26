<?php

use App\Enums\UserType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeImpersonationAdmin(): User
{
    return User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
    ]);
}

function makeImpersonationCustomer(): User
{
    return User::factory()->create([
        'user_type' => UserType::Customer->value,
        'account_type' => 'paid',
    ]);
}

it('allows a superadmin to log in as a customer and return to the admin account', function () {
    $admin = makeImpersonationAdmin();
    $customer = makeImpersonationCustomer();

    $loginResponse = $this
        ->actingAs($admin)
        ->post(route('superadmin.customers.login', $customer));

    $loginResponse->assertRedirect(route('dashboard'));
    expect(auth()->id())->toBe($customer->id)
        ->and(session('impersonator_id'))->toBe($admin->id);

    $returnResponse = $this->post(route('impersonation.stop'));

    $returnResponse->assertRedirect(route('superadmin.customers'));
    expect(auth()->id())->toBe($admin->id)
        ->and(session()->has('impersonator_id'))->toBeFalse();
});

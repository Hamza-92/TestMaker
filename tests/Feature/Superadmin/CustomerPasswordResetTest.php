<?php

use App\Enums\UserType;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function makePasswordResetAdmin(): User
{
    return User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
    ]);
}

function makePasswordResetCustomer(): User
{
    return User::factory()->create([
        'user_type' => UserType::Customer->value,
        'account_type' => 'paid',
        'password' => Hash::make('old-password'),
    ]);
}

it('allows a superadmin to reset a customer password without storing the plaintext password', function () {
    $admin = makePasswordResetAdmin();
    $customer = makePasswordResetCustomer();

    $response = $this
        ->actingAs($admin)
        ->post(route('superadmin.customers.reset-password', $customer), [
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

    $response
        ->assertRedirect(route('superadmin.customers.show', $customer))
        ->assertSessionMissing('success');

    $customer->refresh();
    $auditLog = AuditLog::query()->where('auditable_id', $customer->id)->latest('id')->first();

    expect(Hash::check('new-password', $customer->password))->toBeTrue()
        ->and($customer->getRawOriginal('password'))->not->toBe('new-password')
        ->and($auditLog?->new_values)->toBe(['password' => '[reset by superadmin]']);
});

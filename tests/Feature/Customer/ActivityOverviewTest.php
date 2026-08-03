<?php

use App\Enums\AccountType;
use App\Enums\AuditEvent;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\AuditLog;
use App\Models\Paper;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('a customer activity page shows school audit events', function () {
    $customer = User::factory()->create([
        'name' => 'Ameer Khan',
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);

    AuditLog::create([
        'auditable_type' => Paper::class,
        'auditable_id' => 42,
        'event' => AuditEvent::Updated,
        'new_values' => [
            'name' => 'Mathematics Paper',
            'activity' => 'generated',
        ],
        'changed_by' => $customer->id,
        'notes' => 'Paper generated.',
    ]);

    $this
        ->actingAs($customer)
        ->get(route('customer.activity'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('customer/activity')
            ->where('counts.all', 1)
            ->where('counts.papers', 1)
            ->where('items.data.0.category', 'papers')
            ->where('items.data.0.message', 'Ameer Khan generated Mathematics Paper')
        );
});

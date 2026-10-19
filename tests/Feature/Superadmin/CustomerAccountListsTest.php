<?php

use App\Enums\UserType;
use App\Models\Subscription;
use App\Models\TrialSetting;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->master = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => null]);
    $this->staff = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => $this->master->id]);
    $this->paid = User::factory()->create([
        'user_type' => UserType::Customer, 'account_type' => 'paid', 'created_by' => $this->staff->id,
    ]);
    $this->trial = User::factory()->create([
        'user_type' => UserType::Customer, 'account_type' => 'trial', 'created_by' => $this->staff->id,
    ]);
});

it('keeps paid and trial lists and customer actions within separate view grants', function () {
    $this->staff->syncPermissions(['customers.paid.view', 'customers.edit', 'customers.impersonate']);

    $this->actingAs($this->staff)->get(route('superadmin.customers'))
        ->assertRedirect(route('superadmin.customers.paid'));
    $page = $this->get(route('superadmin.customers.paid'))->assertOk()->viewData('page');
    expect(collect($page['props']['customers'])->pluck('id')->all())->toBe([$this->paid->id]);
    expect($page['props']['accountType'])->toBe('paid');

    $this->get(route('superadmin.customers.trial'))->assertForbidden();
    $this->get(route('superadmin.customers.show', $this->trial))->assertForbidden();
    $this->get(route('superadmin.customers.edit', $this->trial))->assertForbidden();
    $this->post(route('superadmin.customers.login', $this->trial))->assertForbidden();
    $this->get(route('superadmin.customers.show', $this->paid))->assertOk();

    $this->staff->syncPermissions(['customers.trial.view']);
    $this->get(route('superadmin.customers'))
        ->assertRedirect(route('superadmin.customers.trial'));
    $trialPage = $this->get(route('superadmin.customers.trial'))->assertOk()->viewData('page');
    expect(collect($trialPage['props']['customers'])->pluck('id')->all())->toBe([$this->trial->id]);
    $this->get(route('superadmin.customers.paid'))->assertForbidden();
    $this->get(route('superadmin.customers.show', $this->paid))->assertForbidden();
});

it('sorts each list by update time and marks expired and near expiry accounts', function () {
    TrialSetting::current()->update(['trial_duration_days' => 30]);
    $olderPaid = User::factory()->create([
        'user_type' => UserType::Customer, 'account_type' => 'paid', 'created_by' => $this->staff->id,
    ]);
    DB::table('users')->where('id', $this->paid->id)->update(['updated_at' => now()->subDays(2)]);
    DB::table('users')->where('id', $olderPaid->id)->update(['updated_at' => now()->subDay()]);
    DB::table('users')->where('id', $this->trial->id)->update(['created_at' => now()->subDays(31)]);

    Subscription::create([
        'user_id' => $this->paid->id, 'name' => 'Annual', 'amount' => 1000,
        'started_at' => now()->subYear(), 'expired_at' => now()->subDay(),
        'duration' => 365, 'status' => 'active', 'created_by' => $this->master->id,
    ]);
    Subscription::create([
        'user_id' => $olderPaid->id, 'name' => 'Annual', 'amount' => 1000,
        'started_at' => now()->subYear(), 'expired_at' => now()->addDays(20),
        'duration' => 365, 'status' => 'active', 'created_by' => $this->master->id,
    ]);

    $paid = $this->actingAs($this->master)->get(route('superadmin.customers.paid'))->assertOk()->viewData('page');
    expect(collect($paid['props']['customers'])->pluck('id')->all())->toBe([$olderPaid->id, $this->paid->id]);
    expect(collect($paid['props']['customers'])->pluck('plan_state')->all())->toBe(['near_expiry', 'expired']);
    expect($paid['props']['customers'][0]['updated_at'])->not->toBeNull();

    $trial = $this->get(route('superadmin.customers.trial'))->assertOk()->viewData('page');
    expect(collect($trial['props']['customers'])->first()['plan_state'])->toBe('expired');
});

it('prevents creation or conversion into an account type outside the granted scope', function () {
    $this->staff->syncPermissions(['customers.trial.view', 'customers.create', 'customers.edit']);
    $this->actingAs($this->staff)->get(route('superadmin.customers.add'))->assertOk();

    $this->put(route('superadmin.customers.update', $this->trial), [
        'name' => $this->trial->name,
        'email' => $this->trial->email,
        'phone' => '03000000000',
        'status' => 'active',
        'account_type' => 'paid',
    ])->assertForbidden();
    expect($this->trial->fresh()->account_type->value)->toBe('trial');

    $this->post(route('superadmin.customers.store'), [
        'name' => 'Paid Account',
        'email' => 'paid-outside-scope@example.test',
        'phone' => '03000000000',
        'password' => 'secret123',
        'password_confirmation' => 'secret123',
        'status' => 'active',
        'account_type' => 'paid',
    ])->assertForbidden();
    expect(User::where('email', 'paid-outside-scope@example.test')->exists())->toBeFalse();
});

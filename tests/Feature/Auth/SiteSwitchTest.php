<?php

use App\Models\LegacyUserImport;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    config()->set('database.connections.legacy_mysql', [
        'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '',
    ]);
    DB::purge('legacy_mysql');
    DB::connection('legacy_mysql')->getPdo()->sqliteCreateFunction(
        'UTC_TIMESTAMP', fn (): string => now('UTC')->toDateTimeString(),
    );
    Schema::connection('legacy_mysql')->create('admin', function (Blueprint $table): void {
        $table->id();
        $table->string('email')->nullable();
        $table->string('phone')->nullable();
        $table->string('status');
        $table->string('account_type');
        $table->string('end_date');
        $table->string('due_payment_date')->nullable();
        $table->unsignedInteger('allowed_questions')->default(0);
        $table->unsignedInteger('remaining_questions')->default(0);
    });
    Schema::connection('legacy_mysql')->create('site_login_handoffs', function (Blueprint $table): void {
        $table->id();
        $table->char('token_hash', 64)->unique();
        $table->string('source_site');
        $table->string('source_role');
        $table->unsignedBigInteger('source_user_id');
        $table->string('target_role')->nullable();
        $table->unsignedBigInteger('target_user_id')->nullable();
        $table->string('expires_at');
        $table->string('consumed_at')->nullable();
        $table->string('created_at');
    });
    Schema::connection('legacy_mysql')->create('teachers', function (Blueprint $table): void {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->string('username')->nullable();
        $table->string('cell_number')->nullable();
        $table->string('status');
        $table->string('expdate');
    });
});

function oldCustomer(int $id, array $overrides = []): void
{
    DB::connection('legacy_mysql')->table('admin')->insert(array_merge([
        'id' => $id,
        'email' => 'school@example.test',
        'phone' => '03001234567',
        'status' => 'Enabled',
        'account_type' => 'Paid',
        'end_date' => now('Asia/Karachi')->addMonth()->toDateString(),
        'due_payment_date' => null,
        'allowed_questions' => 0,
        'remaining_questions' => 0,
    ], $overrides));
}

function oldHandoff(int $sourceId, string $token, string $role = 'customer'): void
{
    DB::connection('legacy_mysql')->table('site_login_handoffs')->insert([
        'token_hash' => hash('sha256', $token),
        'source_site' => 'old',
        'source_role' => $role,
        'source_user_id' => $sourceId,
        'expires_at' => now('UTC')->addMinute()->toDateTimeString(),
        'created_at' => now('UTC')->toDateTimeString(),
    ]);
}

test('a linked customer signs in from the old site with a single use code', function (): void {
    $user = User::factory()->create(['user_type' => 'customer']);
    oldCustomer(41);
    LegacyUserImport::create([
        'source_user_id' => 41,
        'target_user_id' => $user->id,
        'source_account_type' => 'Paid',
        'source_checksum' => str_repeat('a', 64),
        'transferred_at' => now(),
    ]);
    $token = str_repeat('a', 64);
    oldHandoff(41, $token);

    $state = str_repeat('1', 32);
    $this->withSession(['site_switch_from_old_state' => $state])
        ->get('/site-switch/from-old?code='.$token.'&state='.$state)
        ->assertRedirect(route('dashboard'));
    $this->assertAuthenticatedAs($user);

    $this->get('/site-switch/from-old?code='.$token.'&state='.$state)->assertRedirect(route('login'));
});

test('a matching email alone cannot authorize a different customer account', function (): void {
    User::factory()->create(['user_type' => 'customer', 'email' => 'school@example.test']);
    oldCustomer(42);
    $token = str_repeat('b', 64);
    oldHandoff(42, $token);

    $state = str_repeat('2', 32);
    $this->withSession(['site_switch_from_old_state' => $state])
        ->get('/site-switch/from-old?code='.$token.'&state='.$state)
        ->assertRedirect(route('login'));
    $this->assertGuest();
});

test('an inactive old customer cannot hand off to a linked new account', function (): void {
    $user = User::factory()->create(['user_type' => 'customer']);
    oldCustomer(43, ['status' => 'Disabled']);
    LegacyUserImport::create([
        'source_user_id' => 43,
        'target_user_id' => $user->id,
        'source_account_type' => 'Paid',
        'source_checksum' => str_repeat('b', 64),
        'transferred_at' => now(),
    ]);
    $token = str_repeat('c', 64);
    oldHandoff(43, $token);

    $state = str_repeat('3', 32);
    $this->withSession(['site_switch_from_old_state' => $state])
        ->get('/site-switch/from-old?code='.$token.'&state='.$state)
        ->assertRedirect(route('login'));
    $this->assertGuest();
});

test('the new site issues an old site handoff only for a linked customer', function (): void {
    config()->set('app.legacy_website_url', 'http://localhost/testmaker');
    $user = User::factory()->create(['user_type' => 'customer']);
    oldCustomer(44);
    LegacyUserImport::create([
        'source_user_id' => 44,
        'target_user_id' => $user->id,
        'source_account_type' => 'Paid',
        'source_checksum' => str_repeat('c', 64),
        'transferred_at' => now(),
    ]);

    $response = $this->actingAs($user)->get('/site-switch/to-old?state='.str_repeat('4', 32));
    expect($response->headers->get('Location'))->toStartWith('http://localhost/testmaker/site-switch-complete.php?code=');
    expect(DB::connection('legacy_mysql')->table('site_login_handoffs')->count())->toBe(1);
    expect(DB::connection('legacy_mysql')->table('site_login_handoffs')->first()->target_user_id)->toBe(44);
});

test('the new site sends an unlinked customer to old site sign in', function (): void {
    config()->set('app.legacy_website_url', 'http://localhost/testmaker');
    $user = User::factory()->create(['user_type' => 'customer']);
    oldCustomer(45, ['email' => $user->email, 'phone' => $user->phone]);

    $this->actingAs($user)->get('/site-switch/to-old?state='.str_repeat('5', 32))
        ->assertRedirect('http://localhost/testmaker/login.php?site_switch=account_not_found');
    expect(DB::connection('legacy_mysql')->table('site_login_handoffs')->count())->toBe(0);
});

test('a handoff code without a browser state is rejected', function (): void {
    $user = User::factory()->create(['user_type' => 'customer']);
    oldCustomer(46);
    LegacyUserImport::create([
        'source_user_id' => 46,
        'target_user_id' => $user->id,
        'source_account_type' => 'Paid',
        'source_checksum' => str_repeat('d', 64),
        'transferred_at' => now(),
    ]);
    $token = str_repeat('d', 64);
    oldHandoff(46, $token);

    $this->get('/site-switch/from-old?code='.$token.'&state='.str_repeat('6', 32))
        ->assertRedirect(route('login'));
    $this->assertGuest();
    expect(DB::connection('legacy_mysql')->table('site_login_handoffs')->first()->consumed_at)->toBeNull();
});

test('a teacher is matched within the linked school and keeps new site permissions', function (): void {
    $owner = User::factory()->create(['user_type' => 'customer']);
    $teacher = User::factory()->create([
        'user_type' => 'teacher',
        'school_id' => $owner->id,
        'email' => 'teacher@example.test',
        'phone' => '03007654321',
        'teacher_permissions' => ['generate_papers'],
    ]);
    oldCustomer(47);
    LegacyUserImport::create([
        'source_user_id' => 47,
        'target_user_id' => $owner->id,
        'source_account_type' => 'Paid',
        'source_checksum' => str_repeat('e', 64),
        'transferred_at' => now(),
    ]);
    DB::connection('legacy_mysql')->table('teachers')->insert([
        'id' => 12,
        'user_id' => 47,
        'username' => 'teacher@example.test',
        'cell_number' => '03007654321',
        'status' => '1',
        'expdate' => now('Asia/Karachi')->addMonth()->toDateString(),
    ]);
    $token = str_repeat('e', 64);
    oldHandoff(12, $token, 'teacher');
    $state = str_repeat('7', 32);

    $this->withSession(['site_switch_from_old_state' => $state])
        ->get('/site-switch/from-old?code='.$token.'&state='.$state)
        ->assertRedirect(route('dashboard'));
    $this->assertAuthenticatedAs($teacher);
    expect($teacher->fresh()->teacher_permissions)->toBe(['generate_papers']);
});

test('a new account requiring two factor cannot bypass its challenge through the old site', function (): void {
    $user = User::factory()->withTwoFactor()->create(['user_type' => 'customer']);
    oldCustomer(48);
    LegacyUserImport::create([
        'source_user_id' => 48,
        'target_user_id' => $user->id,
        'source_account_type' => 'Paid',
        'source_checksum' => str_repeat('f', 64),
        'transferred_at' => now(),
    ]);
    $token = str_repeat('f', 64);
    oldHandoff(48, $token);
    $state = str_repeat('8', 32);

    $this->withSession(['site_switch_from_old_state' => $state])
        ->get('/site-switch/from-old?code='.$token.'&state='.$state)
        ->assertRedirect(route('login'));
    $this->assertGuest();
});

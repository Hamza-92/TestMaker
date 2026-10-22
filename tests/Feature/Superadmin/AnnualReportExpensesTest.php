<?php

use App\Enums\UserType;
use App\Models\Expense;
use App\Models\PaymentLog;
use App\Models\Subscription;
use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->travelTo(CarbonImmutable::parse('2026-10-21 12:00:00', 'Asia/Karachi'));
    $this->master = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => null]);
});

function reportPayment(User $agent, User $customer, int $commission, string $amount, string $method, string $date, ?Subscription $subscription = null): PaymentLog
{
    $subscription ??= Subscription::create([
        'user_id' => $customer->id,
        'name' => 'Plan',
        'amount' => 1000,
        'commission_amount' => $commission,
        'started_at' => now(),
        'duration' => 30,
        'expired_at' => now()->addDays(30),
        'status' => 'active',
        'created_by' => $agent->id,
    ]);
    $payment = PaymentLog::create([
        'subscription_id' => $subscription->id,
        'amount' => $amount,
        'payment_method' => $method,
        'status' => 'approved',
        'created_by' => $agent->id,
    ]);
    DB::table('payment_logs')->where('id', $payment->id)->update([
        'reviewed_at' => CarbonImmutable::parse($date, 'Asia/Karachi')->utc()->toDateTimeString(),
    ]);

    return $payment;
}

it('adds expenses and includes them in payments profit', function () {
    $this->actingAs($this->master)
        ->post(route('superadmin.payments.expenses.store'), [
            'name' => 'Hosting', 'amount' => '125.50', 'description' => 'October server',
        ])->assertRedirect(route('superadmin.payments.expenses'));

    expect(Expense::query()->count())->toBe(1)
        ->and(Expense::query()->first()->created_by)->toBe($this->master->id);

    $page = $this->get(route('superadmin.payments.expenses'))->assertOk()->viewData('page');
    expect($page['props']['expenses']['total'])->toBe('125.50')
        ->and($page['props']['expenses']['data'][0]['name'])->toBe('Hosting');

    $summary = $this->get(route('superadmin.payments'))->assertOk()->viewData('page')['props']['summary'];
    expect($summary['expenses'])->toBe('125.50')
        ->and($summary['profit'])->toBe('-125.50');

    $this->post(route('superadmin.payments.expenses.store'), ['name' => 'Bad', 'amount' => '-1'])
        ->assertSessionHasErrors('amount');
    expect(Expense::query()->count())->toBe(1);
});

it('reports approved payments commissions and expenses by Pakistan calendar month', function () {
    $customer = User::factory()->create([
        'user_type' => UserType::Customer,
        'account_type' => 'paid',
        'created_by' => $this->master->id,
    ]);
    $first = reportPayment($this->master, $customer, 20, '100.00', 'cash', '2026-09-30 12:00:00');
    reportPayment($this->master, $customer, 20, '50.00', 'online', '2026-10-01 00:30:00', $first->subscription);
    reportPayment($this->master, $customer, 30, '200.00', 'bank_transfer', '2026-10-15 12:00:00');
    reportPayment($this->master, $customer, 10, '75.00', 'cheque', '2026-11-01 00:00:00');
    Expense::create(['name' => 'Rent', 'amount' => '40.00', 'created_by' => $this->master->id]);

    $report = $this->actingAs($this->master)
        ->get(route('superadmin.payments.annual-report'))
        ->assertOk()->viewData('page')['props'];
    expect($report['year'])->toBe(2026)
        ->and($report['months'])->toHaveCount(12)
        ->and($report['months'][8]['gross'])->toBe('100.00')
        ->and($report['months'][8]['commissions'])->toBe('20.00')
        ->and($report['months'][9]['gross'])->toBe('250.00')
        ->and($report['months'][9]['online'])->toBe('50.00')
        ->and($report['months'][9]['bank_transfer'])->toBe('200.00')
        ->and($report['months'][9]['commissions'])->toBe('30.00')
        ->and($report['months'][9]['expenses'])->toBe('40.00')
        ->and($report['months'][9]['profit'])->toBe('180.00')
        ->and($report['months'][10]['gross'])->toBe('75.00')
        ->and($report['totals']['gross'])->toBe('425.00')
        ->and($report['totals']['profit'])->toBe('325.00');

    $priorYear = $this->get(route('superadmin.payments.annual-report', ['year' => 2025]))
        ->assertOk()->viewData('page')['props'];
    expect($priorYear['totals']['gross'])->toBe('0.00');
});

it('keeps delegated admin expenses and reports within their scope', function () {
    $staff = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => $this->master->id]);
    $staff->syncPermissions(['subscriptions.view', 'subscriptions.manage_payments', 'customers.paid.view']);
    $owned = User::factory()->create(['user_type' => UserType::Customer, 'account_type' => 'paid', 'created_by' => $staff->id]);
    $other = User::factory()->create(['user_type' => UserType::Customer, 'account_type' => 'paid', 'created_by' => $this->master->id]);
    reportPayment($staff, $owned, 10, '60.00', 'cash', '2026-10-10 12:00:00');
    reportPayment($this->master, $other, 20, '90.00', 'cash', '2026-10-10 12:00:00');
    Expense::create(['name' => 'Mine', 'amount' => '5.00', 'created_by' => $staff->id]);
    Expense::create(['name' => 'Other', 'amount' => '25.00', 'created_by' => $this->master->id]);

    $this->actingAs($staff);
    $expenses = $this->get(route('superadmin.payments.expenses'))->assertOk()->viewData('page')['props']['expenses'];
    expect($expenses['total'])->toBe('5.00')
        ->and(collect($expenses['data'])->pluck('name')->all())->toBe(['Mine']);

    $report = $this->get(route('superadmin.payments.annual-report'))->assertOk()->viewData('page')['props'];
    expect($report['months'][9]['gross'])->toBe('60.00')
        ->and($report['months'][9]['expenses'])->toBe('5.00');

    $staff->syncPermissions(['subscriptions.view', 'customers.paid.view']);
    $this->get(route('superadmin.payments.expenses'))->assertForbidden();
    $this->post(route('superadmin.payments.expenses.store'), ['name' => 'Denied', 'amount' => '1.00'])->assertForbidden();
    $this->get(route('superadmin.payments.annual-report'))->assertForbidden();
});

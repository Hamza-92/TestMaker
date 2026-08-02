<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Paper;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('a customer dashboard shows school scoped overview data', function () {
    $customer = User::factory()->create([
        'name' => 'Ameer Khan',
        'school_name' => 'TestMaker School',
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Paid->value,
    ]);

    Subscription::create([
        'user_id' => $customer->id,
        'name' => 'Premium',
        'allowed_questions' => 1000,
        'amount' => 1000,
        'started_at' => now()->subDays(5),
        'duration' => 30,
        'expired_at' => now()->addDays(25),
        'status' => 'active',
        'created_by' => $customer->id,
    ]);

    Paper::create([
        'user_id' => $customer->id,
        'name' => 'Mathematics Paper',
        'subject' => 'Mathematics',
        'class_name' => '10th',
        'total_marks' => 20,
        'is_draft' => false,
        'paper_data' => [
            'paper' => [
                'sections' => [
                    [
                        'questions' => [
                            ['id' => 'one'],
                            ['id' => 'two'],
                        ],
                    ],
                ],
            ],
        ],
    ]);

    $this
        ->actingAs($customer)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('customer/dashboard-view')
            ->where('school.name', 'TestMaker School')
            ->where('school.plan_name', 'Premium')
            ->where('stats.papers_generated', 1)
            ->where('stats.saved_papers', 1)
            ->where('stats.questions_used', 2)
            ->where('subject_usage.monthly.0.name', 'Mathematics')
            ->where('permissions.can_generate_papers', true)
        );
});

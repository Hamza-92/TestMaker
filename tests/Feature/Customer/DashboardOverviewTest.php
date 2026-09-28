<?php

use App\Enums\AccountType;
use App\Enums\AuditEvent;
use App\Enums\TeacherPermission;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\AuditLog;
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

test('teacher dashboards and activity show only their own data', function (bool $canViewSchoolPapers) {
    $owner = User::factory()->create([
        'user_type' => UserType::Customer,
        'status' => UserStatus::Active,
        'account_type' => AccountType::Paid,
    ]);

    Subscription::create([
        'user_id' => $owner->id,
        'name' => 'School plan',
        'allow_teachers' => true,
        'max_teachers' => 10,
        'amount' => 1000,
        'started_at' => now()->subDay(),
        'duration' => 30,
        'expired_at' => now()->addDays(29),
        'status' => 'active',
        'created_by' => $owner->id,
    ]);

    $teacher = User::factory()->create([
        'name' => 'Current Teacher',
        'user_type' => UserType::Teacher,
        'status' => UserStatus::Active,
        'school_id' => $owner->id,
        'teacher_permissions' => $canViewSchoolPapers
            ? [TeacherPermission::ViewSchoolPapers->value]
            : [],
        'access_scope' => [],
    ]);
    $colleague = User::factory()->create([
        'user_type' => UserType::Teacher,
        'status' => UserStatus::Active,
        'school_id' => $owner->id,
    ]);
    User::factory()->create([
        'user_type' => UserType::Teacher,
        'status' => UserStatus::Active,
        'school_id' => $owner->id,
    ]);
    User::factory()->create([
        'user_type' => UserType::Teacher,
        'status' => UserStatus::Inactive,
        'school_id' => $owner->id,
    ]);
    $outsider = User::factory()->create(['user_type' => UserType::Customer]);

    foreach ([$teacher, $owner, $colleague, $outsider] as $author) {
        $paper = Paper::create([
            'user_id' => $author->id,
            'name' => $author->id === $teacher->id ? 'My Paper' : 'Private Paper '.$author->id,
            'subject' => $author->id === $teacher->id ? 'My Subject' : 'Private Subject '.$author->id,
            'is_draft' => false,
            'paper_data' => ['paper' => ['sections' => [
                ['questions' => [['id' => 'one'], ['id' => 'two']]],
            ]]],
        ]);
        AuditLog::record($paper, AuditEvent::Created, newValues: [
            'name' => $paper->name,
            'activity' => 'saved',
        ], actor: $author, notes: 'Paper saved.');
    }

    Paper::create([
        'user_id' => $teacher->id,
        'name' => 'My Draft',
        'is_draft' => true,
        'paper_data' => ['paper' => ['sections' => [
            ['questions' => [['id' => 'three']]],
        ]]],
    ]);
    AuditLog::record($colleague, AuditEvent::Updated, newValues: [
        'name' => $colleague->name,
        'activity' => 'updated',
    ], actor: $teacher, notes: 'Teacher updated.');

    $this->actingAs($teacher)->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('customer/dashboard-view')
            ->where('school.total_teachers', 1)
            ->where('stats.active_teachers', 1)
            ->where('stats.total_teachers', 1)
            ->where('stats.papers_generated', 2)
            ->where('stats.saved_papers', 1)
            ->where('stats.questions_used', 3)
            ->where('stats.drafts', 1)
            ->where('auth.school_context.teachers_used', 1)
            ->where('auth.school_context.max_teachers', null)
            ->missing('auth.user.school')
            ->where('permissions.can_add_teacher', false)
            ->has('subject_usage.monthly', 1)
            ->where('subject_usage.monthly.0.name', 'My Subject')
            ->where('subject_usage.monthly.0.count', 1)
            ->has('activities', 2)
            ->where('activities', fn ($items) => collect($items)->every(
                fn ($item) => in_array($item['message'], [
                    'Current Teacher saved My Paper',
                    'Current Teacher saved a draft of My Draft',
                ], true),
            ))
        );

    $this->get(route('customer.activity'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('customer/activity')
            ->where('counts.all', 1)
            ->where('counts.papers', 1)
            ->where('counts.teachers', 0)
            ->has('items.data', 1)
            ->where('items.data.0.message', 'Current Teacher saved My Paper')
        );

    $this->actingAs($owner)->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('school.total_teachers', 4)
            ->where('stats.total_teachers', 4)
            ->where('stats.active_teachers', 3)
            ->where('stats.papers_generated', 4)
            ->where('stats.saved_papers', 3)
            ->where('stats.questions_used', 7)
            ->where('auth.school_context.teachers_used', 4)
            ->where('auth.school_context.max_teachers', 10)
            ->has('subject_usage.monthly', 3)
        );
})->with([
    'without school paper access' => false,
    'with school paper access' => true,
]);

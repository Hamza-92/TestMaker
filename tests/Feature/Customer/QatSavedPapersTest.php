<?php

use App\Enums\UserType;
use App\Models\QatPaper;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->school = User::factory()->create(['user_type' => UserType::Customer->value, 'account_type' => 'paid']);
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value, 'created_by' => null]);
    $this->subscription = Subscription::create([
        'user_id' => $this->school->id, 'name' => 'QAT plan', 'amount' => 1000,
        'started_at' => now()->subDay(), 'duration' => 30, 'expired_at' => now()->addDays(29),
        'status' => 'active', 'created_by' => $admin->id, 'access_scope' => [], 'allow_qat_tests' => true,
    ]);
});

function qatSavedPaperFor(User $user, array $overrides = []): QatPaper
{
    return QatPaper::create(array_replace([
        'user_id' => $user->id, 'name' => 'Mathematics practice', 'mode' => 'manual',
        'class_ids' => [1], 'class_names' => '5th', 'subject_name' => 'Mathematics',
        'question_count' => 3, 'total_marks' => 6, 'is_draft' => false,
        'paper_data' => ['sections' => [], 'chapters' => [], 'chapter_ids' => [1, 2]],
    ], $overrides));
}

test('saved QAT table includes chapter counts creation times and deletion access', function (array $data) {
    $paper = qatSavedPaperFor($this->school, ['paper_data' => $data]);

    $this->actingAs($this->school)->get(route('customer.qat.index'))
        ->assertOk()->assertInertia(fn ($page) => $page
        ->has('papers.data', 1)
        ->where('papers.data.0.id', $paper->id)
        ->where('papers.data.0.chapter_count', 2)
        ->where('papers.data.0.created_at', $paper->created_at->toISOString())
        ->where('papers.data.0.can_delete', true));
})->with([
    'chapter ids' => [['chapter_ids' => [7, 7, 9], 'sections' => []]],
    'saved chapters' => [['chapters' => [['id' => 7], ['id' => 9]], 'sections' => []]],
]);

test('QAT answer key links enable the existing answer toggle only when requested', function () {
    $paper = qatSavedPaperFor($this->school);

    $this->actingAs($this->school)->get(route('customer.qat.papers.show', $paper))
        ->assertOk()->assertInertia(fn ($page) => $page->where('showAnswerKey', false));
    $this->get(route('customer.qat.papers.show', ['qatPaper' => $paper, 'answer_key' => 1]))
        ->assertOk()->assertInertia(fn ($page) => $page->where('showAnswerKey', true));
});

test('QAT-only home shows recent papers and My Papers supports search and pagination', function () {
    $first = qatSavedPaperFor($this->school, ['name' => 'English practice', 'subject_name' => 'English']);
    foreach (range(1, 12) as $number) {
        $latest = qatSavedPaperFor($this->school, ['name' => 'Mathematics practice '.$number]);
    }
    qatSavedPaperFor($this->school, ['is_draft' => true]);
    qatSavedPaperFor(User::factory()->create());

    $this->actingAs($this->school)->get(route('customer.qat.index'))->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('auth.school_context.qat_only', true)
            ->where('qatSavedPaperCount', 13)
            ->where('view', 'home')
            ->has('papers.data', 5)
            ->where('papers.data.0.id', $latest->id));

    $this->get(route('customer.qat.papers.index', ['page' => 2]))->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('view', 'papers')
            ->where('papers.total', 13)
            ->has('papers.data', 1)
            ->where('papers.data.0.id', $first->id));

    $this->get(route('customer.qat.papers.index', ['q' => 'English']))->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.q', 'English')
            ->where('qatSavedPaperCount', 13)
            ->has('papers.data', 1)
            ->where('papers.data.0.id', $first->id));
});

test('only a paid school with an active QAT subscription and no pattern access enters QAT-only mode', function (
    string $accountType, bool $allowQat, ?array $scope, bool $expired, bool $qatOnly,
) {
    $this->school->update(['account_type' => $accountType]);
    $this->subscription->update([
        'allow_qat_tests' => $allowQat,
        'access_scope' => $scope,
        'expired_at' => $expired ? now()->subHour() : now()->addDay(),
    ]);

    $response = $this->actingAs($this->school)->get(route('dashboard'));
    if ($qatOnly) {
        $response->assertRedirectToRoute('customer.qat.index');
    } else {
        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('customer/dashboard-view')
            ->where('auth.school_context.qat_only', false)
            ->where('auth.school_context.allow_qat_tests', $allowQat));
    }
})->with([
    'QAT only' => ['paid', true, [], false, true],
    'standard only' => ['paid', false, null, false, false],
    'standard and QAT' => ['paid', true, null, false, false],
    'trial' => ['trial', true, [], false, false],
    'expired' => ['paid', true, [], true, false],
]);

test('QAT-only login lands on QAT home and standard routes reject direct requests', function () {
    $this->subscription->update(['allow_online_mcq_tests' => true, 'allow_teachers' => true]);

    $this->followingRedirects()->post(route('login.store'), [
        'email' => $this->school->email,
        'password' => 'password',
    ])->assertOk()->assertInertia(fn ($page) => $page
        ->component('customer/qat/index')
        ->where('view', 'home'));

    foreach ([
        'customer.papers.generate', 'customer.papers.index', 'customer.templates.index',
        'customer.online-tests.index', 'customer.teachers.index', 'customer.settings', 'customer.activity',
    ] as $name) {
        $this->get(route($name))->assertRedirectToRoute('customer.qat.index');
    }

    $this->getJson(route('customer.papers.generate.questions'))->assertForbidden();
    $this->postJson(route('customer.papers.store'))->assertForbidden();
    $this->get(route('customer.profile'))->assertOk();
});

test('the combined QAT page stays available for mixed plans and the QAT list requires access', function () {
    $this->subscription->update(['access_scope' => null]);
    $this->actingAs($this->school)->get(route('customer.qat.index'))->assertOk()
        ->assertInertia(fn ($page) => $page->where('view', 'combined'));
    $this->get(route('customer.papers.index'))->assertOk();

    $this->subscription->update(['allow_qat_tests' => false]);
    $this->get(route('customer.qat.index'))->assertForbidden();
    $this->get(route('customer.qat.papers.index'))->assertForbidden();
});

test('school owners can delete their own QAT papers but cannot delete another account papers', function () {
    $paper = qatSavedPaperFor($this->school);
    $other = User::factory()->create(['user_type' => UserType::Customer->value]);
    $otherPaper = qatSavedPaperFor($other);

    $this->actingAs($this->school)->deleteJson(route('customer.qat.papers.destroy', $otherPaper))->assertForbidden();
    $this->deleteJson(route('customer.qat.papers.destroy', $paper))->assertOk()->assertJson(['deleted' => true]);
    $this->assertModelMissing($paper);
    $this->assertModelExists($otherPaper);
    $this->get(route('customer.qat.index'))->assertOk()
        ->assertInertia(fn ($page) => $page->where('qatSavedPaperCount', 0));
    $this->deleteJson(route('customer.qat.papers.destroy', $paper))->assertNotFound();
});

test('viewing school QAT papers does not grant teachers deletion access', function () {
    $teacher = User::factory()->create([
        'user_type' => UserType::Teacher->value, 'school_id' => $this->school->id,
        'teacher_permissions' => ['generate_papers', 'view_school_papers'],
    ]);
    $schoolPaper = qatSavedPaperFor($this->school);
    $teacherPaper = qatSavedPaperFor($teacher);

    $this->actingAs($teacher)->get(route('customer.qat.index'))->assertOk()
        ->assertInertia(fn ($page) => $page->has('papers.data', 2)
            ->where('qatSavedPaperCount', 2)
            ->where('papers.data', fn ($papers) => collect($papers)->every(fn ($paper) => ! $paper['can_delete'])));
    $teacher->update(['teacher_permissions' => ['generate_papers']]);
    $this->actingAs($teacher->fresh())->get(route('customer.qat.papers.index'))->assertOk()
        ->assertInertia(fn ($page) => $page->has('papers.data', 1)->where('qatSavedPaperCount', 1));
    $this->deleteJson(route('customer.qat.papers.destroy', $teacherPaper))->assertForbidden();
    $teacher->update(['teacher_permissions' => ['generate_papers', 'view_school_papers', 'manage_own_papers']]);
    $this->actingAs($teacher->fresh())->deleteJson(route('customer.qat.papers.destroy', $schoolPaper))->assertForbidden();
    $this->deleteJson(route('customer.qat.papers.destroy', $teacherPaper))->assertOk();
    $this->assertModelMissing($teacherPaper);
    $this->assertModelExists($schoolPaper);
});

test('QAT subscription access is required to delete a saved paper', function () {
    $paper = qatSavedPaperFor($this->school);
    $this->subscription->update(['allow_qat_tests' => false]);

    $this->actingAs($this->school)->deleteJson(route('customer.qat.papers.destroy', $paper))->assertForbidden();
    $this->assertModelExists($paper);
});

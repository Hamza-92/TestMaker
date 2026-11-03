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

test('school owners can delete their own QAT papers but cannot delete another account papers', function () {
    $paper = qatSavedPaperFor($this->school);
    $other = User::factory()->create(['user_type' => UserType::Customer->value]);
    $otherPaper = qatSavedPaperFor($other);

    $this->actingAs($this->school)->deleteJson(route('customer.qat.papers.destroy', $otherPaper))->assertForbidden();
    $this->deleteJson(route('customer.qat.papers.destroy', $paper))->assertOk()->assertJson(['deleted' => true]);
    $this->assertModelMissing($paper);
    $this->assertModelExists($otherPaper);
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
            ->where('papers.data', fn ($papers) => collect($papers)->every(fn ($paper) => ! $paper['can_delete'])));
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

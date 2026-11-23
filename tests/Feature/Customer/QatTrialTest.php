<?php

use App\Enums\UserType;
use App\Models\QatPaper;
use App\Models\QuestionType;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->school = User::factory()->create([
        'user_type' => UserType::Customer,
        'account_type' => 'trial',
        'school_name' => 'QAT Trial School',
        'qat_trial_ends_on' => now('Asia/Karachi')->addWeek()->toDateString(),
    ]);

    $type = QuestionType::create([
        'name' => 'Trial MCQ', 'heading_en' => 'Choose the answer',
        'have_exercise' => false, 'have_statement' => true, 'have_description' => false,
        'have_answer' => false, 'is_single' => true, 'is_objective' => true,
        'column_per_row' => 1, 'status' => 1,
    ]);
    $catalogue = DB::table('qat_catalogues')->insertGetId(['academic_year' => '2026-27']);
    $class = DB::table('qat_classes')->insertGetId([
        'qat_catalogue_id' => $catalogue, 'source_class_id' => 10, 'name' => 'Class 5', 'status' => true,
    ]);
    $subject = DB::table('qat_subjects')->insertGetId([
        'qat_class_id' => $class, 'qat_catalogue_id' => $catalogue, 'class_id' => 10,
        'class_name' => 'Class 5', 'subject_id' => 20, 'subject_name' => 'English',
        'source_pattern_id' => 30, 'source_pattern_name' => 'Source', 'status' => true,
    ]);
    $chapter = DB::table('qat_chapters')->insertGetId([
        'qat_subject_id' => $subject, 'source_chapter_id' => 101, 'name' => 'April chapter',
        'chapter_number' => 1, 'status' => true,
    ]);
    DB::table('qat_chapter_months')->insert(['qat_chapter_id' => $chapter, 'month' => 4]);
    $question = DB::table('qat_questions')->insertGetId([
        'qat_chapter_id' => $chapter, 'source_question_id' => 101,
        'question_type_id' => $type->id, 'status' => true,
        'question_data' => json_encode(['statement_en' => 'Choose an answer.']),
    ]);

    $this->auto = [
        'name' => 'QAT trial paper', 'mode' => 'auto', 'class_ids' => [$class],
        'subject_id' => $subject, 'syllabus' => 'qat', 'months' => [4], 'minutes' => 40,
        'sections' => [['question_type_id' => $type->id, 'quantity' => 1, 'marks' => 1]],
        'allow_repeat' => true,
    ];
    $this->manual = [
        'name' => 'Manual QAT trial paper', 'mode' => 'manual', 'class_ids' => [$class],
        'subject_id' => $subject, 'syllabus' => 'custom', 'chapter_ids' => [$chapter], 'minutes' => 40,
        'manual_questions' => [['id' => $question, 'marks' => 1]],
    ];
});

test('a QAT trial counts variants and unsaved papers and gives access to the last preview until exit', function () {
    $store = route('customer.qat.papers.store');
    $upgrade = route('customer.qat.upgrade');
    $this->actingAs($this->school)->get(route('dashboard'))->assertRedirectToRoute('customer.qat.index');
    $this->get(route('customer.papers.generate'))->assertRedirectToRoute('customer.qat.index');
    $this->get(route('customer.qat.create', 'auto'))->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('auth.school_context.qat_trial.limit', 3)
            ->where('auth.school_context.qat_trial.remaining', 3));

    $this->postJson($store, [])->assertUnprocessable();
    expect($this->school->fresh()->qat_trial_papers_used)->toBe(0);

    $previous = $this->postJson($store, [...$this->auto, 'variants' => 2])->assertCreated()->json('preview_url');
    expect($this->school->fresh()->qat_trial_papers_used)->toBe(2);
    expect(QatPaper::query()->count())->toBe(0);
    $this->postJson($store, [...$this->auto, 'variants' => 2])
        ->assertUnprocessable()->assertJsonValidationErrors('variants');
    $final = $this->postJson($store, $this->manual)->assertCreated()->json('preview_url');
    expect($this->school->fresh()->qat_trial_papers_used)->toBe(3);

    $this->get($final)->assertOk()->assertInertia(fn ($page) => $page
        ->component('customer/qat/paper')
        ->where('finalTrialPreview', true)
        ->where('backUrl', $upgrade)
        ->where('auth.school_context.qat_trial.locked', true));

    $saved = $this->postJson($final.'/save')->assertCreated()
        ->assertJsonPath('stay_on_preview', true)->json('paper_url');
    expect(QatPaper::query()->count())->toBe(1);
    $this->get($upgrade)->assertOk()->assertInertia(fn ($page) => $page
        ->component('customer/qat/upgrade')
        ->where('schoolName', $this->school->school_name)
        ->where('auth.school_context.qat_trial.remaining', 0));
    $this->get($previous)->assertRedirect($upgrade);
    $this->get($final)->assertRedirect($upgrade);
    $this->get($saved.'?answer_key=1')->assertRedirect($upgrade);
    $this->get(route('customer.qat.papers.index'))->assertRedirect($upgrade);
    $this->get(route('customer.profile'))->assertRedirect($upgrade);
    $this->postJson($store, $this->auto)->assertStatus(423)->assertJsonPath('redirect_url', $upgrade);
    $this->deleteJson($saved)->assertStatus(423);

    $this->school->update(['account_type' => 'paid']);
    Subscription::create([
        'user_id' => $this->school->id, 'name' => 'QAT plan', 'amount' => 3600,
        'started_at' => now()->subDay(), 'duration' => 365, 'expired_at' => now()->addYear(),
        'status' => 'active', 'created_by' => $this->school->id,
        'access_scope' => [], 'allow_qat_tests' => true,
    ]);
    $this->actingAs($this->school->fresh())->get($saved)->assertOk()
        ->assertInertia(fn ($page) => $page->where('auth.school_context.qat_trial', null));
    $this->postJson($store, $this->auto)->assertCreated();
    expect($this->school->fresh()->qat_trial_papers_used)->toBe(3);
});

test('leaving an unsaved third preview or reaching the trial end locks the account', function () {
    $upgrade = route('customer.qat.upgrade');
    $this->school->forceFill(['qat_trial_papers_used' => 2])->save();
    $final = $this->actingAs($this->school)->postJson(route('customer.qat.papers.store'), $this->manual)
        ->assertCreated()->json('preview_url');
    $this->get($final)->assertOk();
    $this->get(route('customer.qat.index'))->assertRedirect($upgrade);
    $this->postJson($final.'/save')->assertStatus(423);
    $this->get($final)->assertRedirect($upgrade);
    expect(QatPaper::query()->count())->toBe(0);

    $this->school->forceFill([
        'qat_trial_papers_used' => 0,
        'qat_trial_ends_on' => now('Asia/Karachi')->subDay()->toDateString(),
    ])->save();
    $this->actingAs($this->school)->get(route('dashboard'))->assertRedirect($upgrade);
    $this->get($upgrade)->assertOk()
        ->assertInertia(fn ($page) => $page->where('auth.school_context.qat_trial.expired', true));
});

test('each generation after editing selections counts and the third paper returns home for payment', function (string $mode) {
    $store = route('customer.qat.papers.store');
    $upgrade = route('customer.qat.upgrade');
    $payload = $this->{$mode};
    $staleSchool = clone $this->school;
    $this->actingAs($this->school);

    $first = $this->postJson($store, $payload)->assertCreated()
        ->assertJsonPath('final_trial_preview', false)->json('preview_url');
    expect($this->school->fresh()->qat_trial_papers_used)->toBe(1);
    $firstEdit = $this->get($first)->assertOk()->viewData('page')['props']['backUrl'];
    $this->get($firstEdit)->assertOk()->assertInertia(fn ($page) => $page
        ->where('initialSelections.subject_id', $payload['subject_id'])
        ->where('auth.school_context.qat_trial.remaining', 2));

    $class = DB::table('qat_classes')->insertGetId([
        'qat_catalogue_id' => DB::table('qat_catalogues')->value('id'),
        'source_class_id' => 11, 'name' => 'Class 6', 'status' => true,
    ]);
    $subject = DB::table('qat_subjects')->insertGetId([
        'qat_class_id' => $class, 'qat_catalogue_id' => DB::table('qat_catalogues')->value('id'),
        'class_id' => 11, 'class_name' => 'Class 6', 'subject_id' => 21, 'subject_name' => 'Science',
        'source_pattern_id' => 30, 'source_pattern_name' => 'Source', 'status' => true,
    ]);
    $chapter = DB::table('qat_chapters')->insertGetId([
        'qat_subject_id' => $subject, 'source_chapter_id' => 201, 'name' => 'Science chapter',
        'chapter_number' => 1, 'status' => true,
    ]);
    DB::table('qat_chapter_months')->insert(['qat_chapter_id' => $chapter, 'month' => 4]);
    $question = DB::table('qat_questions')->insertGetId([
        'qat_chapter_id' => $chapter, 'source_question_id' => 201,
        'question_type_id' => $this->auto['sections'][0]['question_type_id'], 'status' => true,
        'question_data' => json_encode(['statement_en' => 'Choose the science answer.']),
    ]);
    $changed = [...$payload, 'class_ids' => [$class], 'subject_id' => $subject];
    if ($mode === 'manual') {
        $changed['chapter_ids'] = [$chapter];
        $changed['manual_questions'] = [['id' => $question, 'marks' => 1]];
    }

    $second = $this->postJson($store, $changed)->assertCreated()
        ->assertJsonPath('final_trial_preview', false)->json('preview_url');
    expect($this->school->fresh()->qat_trial_papers_used)->toBe(2);
    $secondEdit = $this->get($second)->assertOk()->viewData('page')['props']['backUrl'];
    $this->get($secondEdit)->assertOk()->assertInertia(fn ($page) => $page
        ->where('initialSelections.subject_id', $subject)
        ->where('initialSelections.class_ids', [$class])
        ->where('auth.school_context.qat_trial.remaining', 1));

    $third = $this->postJson($store, $payload)->assertCreated()
        ->assertJsonPath('final_trial_preview', true)->json('preview_url');
    $this->get($third)->assertOk()->assertInertia(fn ($page) => $page
        ->where('backUrl', $upgrade)->where('finalTrialPreview', true)
        ->where('auth.school_context.qat_trial.remaining', 0));
    $this->get($secondEdit)->assertRedirect($upgrade);
    $this->get($upgrade)->assertOk()->assertInertia(fn ($page) => $page
        ->component('customer/qat/upgrade'));
    $this->get(route('customer.qat.create', $mode))->assertRedirect($upgrade);
    $this->postJson($store, $changed)->assertStatus(423)->assertJsonPath('redirect_url', $upgrade);

    // A cached form or another tab cannot rely on an older allowance to generate again.
    $this->actingAs($staleSchool)->postJson($store, $payload)
        ->assertStatus(423)->assertJsonPath('redirect_url', $upgrade);
    expect($this->school->fresh()->qat_trial_papers_used)->toBe(3)
        ->and(QatPaper::query()->count())->toBe(0);
})->with(['auto', 'manual']);

test('a trial with more than three previously generated papers remains locked', function () {
    $this->school->forceFill(['qat_trial_papers_used' => 4])->save();

    $this->actingAs($this->school)->get(route('customer.qat.create', 'auto'))
        ->assertRedirectToRoute('customer.qat.upgrade');
    $this->get(route('customer.qat.upgrade'))->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('auth.school_context.qat_trial.remaining', 0)
            ->where('auth.school_context.qat_trial.locked', true));
});

test('superadmin can opt an individual standard trial into QAT and set its expiry', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => null]);
    $this->school->update(['qat_trial_ends_on' => null]);
    $this->actingAs($this->school)->get(route('customer.qat.index'))->assertForbidden();

    $date = now('Asia/Karachi')->addDays(10)->toDateString();
    $this->actingAs($admin)->put(route('superadmin.customers.update', $this->school), [
        'name' => $this->school->name, 'email' => $this->school->email, 'phone' => '03000000000',
        'status' => 'active', 'account_type' => 'trial', 'qat_trial_ends_on' => $date,
    ])->assertRedirectToRoute('superadmin.customers.show', $this->school);
    $this->get(route('superadmin.customers.edit', $this->school))->assertOk()
        ->assertInertia(fn ($page) => $page->where('customer.qat_trial_ends_on', $date));
    $this->actingAs($this->school->fresh())->get(route('customer.qat.index'))->assertOk();
});

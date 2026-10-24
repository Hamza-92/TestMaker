<?php

use App\Enums\UserType;
use App\Models\QatPaper;
use App\Models\QuestionType;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('QAT paper generation uses only selected monthly chapters and saves a printable paper', function () {
    $school = User::factory()->create(['user_type' => UserType::Customer->value, 'account_type' => 'paid']);
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value, 'created_by' => null]);
    Subscription::create([
        'user_id' => $school->id, 'name' => 'QAT plan', 'amount' => 1000,
        'started_at' => now()->subDay(), 'duration' => 30, 'expired_at' => now()->addDays(29),
        'status' => 'active', 'created_by' => $admin->id, 'access_scope' => [],
        'allow_qat_tests' => true,
    ]);
    $type = QuestionType::create([
        'name' => 'QAT MCQ', 'heading_en' => 'Choose the answer',
        'have_exercise' => false, 'have_statement' => true,
        'have_description' => false, 'have_answer' => false,
        'is_single' => true, 'is_objective' => true, 'column_per_row' => 1, 'status' => 1,
    ]);
    $catalogueId = DB::table('qat_catalogues')->insertGetId([
        'academic_year' => '2026-27', 'created_at' => now(), 'updated_at' => now(),
    ]);
    $classId = DB::table('qat_classes')->insertGetId([
        'qat_catalogue_id' => $catalogueId, 'source_class_id' => 10,
        'name' => 'Class 5', 'status' => true, 'created_at' => now(), 'updated_at' => now(),
    ]);
    $subjectId = DB::table('qat_subjects')->insertGetId([
        'qat_class_id' => $classId, 'qat_catalogue_id' => $catalogueId,
        'class_id' => 10, 'class_name' => 'Class 5', 'subject_id' => 20,
        'subject_name' => 'English', 'source_pattern_id' => 30,
        'source_pattern_name' => 'Source', 'status' => true,
        'created_at' => now(), 'updated_at' => now(),
    ]);
    $aprilId = DB::table('qat_chapters')->insertGetId([
        'qat_subject_id' => $subjectId, 'source_chapter_id' => 101,
        'name' => 'April chapter', 'status' => true, 'created_at' => now(), 'updated_at' => now(),
    ]);
    $mayId = DB::table('qat_chapters')->insertGetId([
        'qat_subject_id' => $subjectId, 'source_chapter_id' => 102,
        'name' => 'May chapter', 'status' => true, 'created_at' => now(), 'updated_at' => now(),
    ]);
    DB::table('qat_chapter_months')->insert([
        ['qat_chapter_id' => $aprilId, 'month' => 4],
        ['qat_chapter_id' => $mayId, 'month' => 5],
    ]);
    foreach ([$aprilId => 'April question', $mayId => 'May question'] as $chapterId => $statement) {
        DB::table('qat_questions')->insert([
            'qat_chapter_id' => $chapterId, 'source_question_id' => $chapterId,
            'question_type_id' => $type->id, 'status' => true,
            'question_data' => json_encode([
                'statement_en' => $statement, 'answer_en' => 'Private answer', 'source' => 'exercise',
                'options' => [['text_en' => 'Option A', 'is_correct' => true]],
            ]),
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }
    $aprilQuestionId = DB::table('qat_questions')->where('qat_chapter_id', $aprilId)->value('id');
    $mayQuestionId = DB::table('qat_questions')->where('qat_chapter_id', $mayId)->value('id');

    $this->actingAs($school)->get(route('customer.qat.create', 'auto'))->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('chapters', 2)
            ->where('chapters.0.months.0', 4)
            ->where('chapters.1.months.0', 5));

    $this->actingAs($school)->postJson(route('customer.qat.questions'), [
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [5],
    ])->assertOk()->assertJsonPath('questions.total', 1)
        ->assertJsonPath('questions.data.0.id', $mayQuestionId)
        ->assertJsonPath('questions.data.0.chapter_name', 'May chapter')
        ->assertJsonPath('questions.data.0.source_label', 'Exercise')
        ->assertJsonMissingPath('questions.data.0.answer_en')
        ->assertJsonMissingPath('questions.data.0.options.0.is_correct');

    $this->actingAs($school)->postJson(route('customer.qat.papers.store'), [
        'name' => 'Monthly QAT', 'mode' => 'auto', 'class_ids' => [$classId],
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [5],
        'minutes' => 40, 'sections' => [[
            'question_type_id' => $type->id, 'quantity' => 1, 'marks' => 2,
        ]],
    ])->assertCreated();
    $paper = QatPaper::query()->sole();
    expect($paper->paper_data['chapter_ids'])->toBe([$mayId])
        ->and($paper->paper_data['sections'][0]['questions'][0]['id'])->toBe($mayQuestionId)
        ->and($paper->total_marks)->toBe(2.0);
    $this->actingAs($school)->get(route('customer.qat.papers.show', $paper))->assertOk()
        ->assertInertia(fn ($page) => $page->component('customer/qat/paper')
            ->where('paper.paper_data.sections.0.questions.0.statement_en', 'May question'));
    $otherSchool = User::factory()->create(['user_type' => UserType::Customer->value, 'account_type' => 'paid']);
    Subscription::create([
        'user_id' => $otherSchool->id, 'name' => 'Other QAT plan', 'amount' => 1000,
        'started_at' => now()->subDay(), 'duration' => 30, 'expired_at' => now()->addDays(29),
        'status' => 'active', 'created_by' => $admin->id, 'access_scope' => [],
        'allow_qat_tests' => true,
    ]);
    $this->actingAs($otherSchool)->get(route('customer.qat.papers.show', $paper))->assertForbidden();

    $this->actingAs($school)->postJson(route('customer.qat.papers.store'), [
        'name' => 'Manual QAT', 'mode' => 'manual', 'class_ids' => [$classId],
        'subject_id' => $subjectId, 'syllabus' => 'custom', 'chapter_ids' => [$aprilId],
        'minutes' => 40, 'manual_questions' => [['id' => $mayQuestionId, 'marks' => 1]],
    ])->assertUnprocessable()->assertJsonValidationErrors('manual_questions');
    $this->actingAs($school)->postJson(route('customer.qat.papers.store'), [
        'name' => 'Manual QAT', 'mode' => 'manual', 'class_ids' => [$classId],
        'subject_id' => $subjectId, 'syllabus' => 'custom', 'chapter_ids' => [$aprilId],
        'minutes' => 40, 'manual_questions' => [['id' => $aprilQuestionId, 'marks' => 3]],
    ])->assertCreated();
    expect(QatPaper::query()->count())->toBe(2);

    $this->actingAs($school)->postJson(route('customer.qat.papers.store'), [
        'name' => 'Two variants', 'mode' => 'auto', 'class_ids' => [$classId],
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [4, 5],
        'minutes' => 40, 'variants' => 2,
        'sections' => [['question_type_id' => $type->id, 'quantity' => 1, 'marks' => 1]],
    ])->assertCreated()->assertJsonCount(2, 'paper_ids');
    $variants = QatPaper::query()->where('name', 'like', 'Two variants%')->get();
    expect($variants)->toHaveCount(2)
        ->and($variants->pluck('paper_data')->pluck('sections.0.questions.0.id')->unique())->toHaveCount(2);
});

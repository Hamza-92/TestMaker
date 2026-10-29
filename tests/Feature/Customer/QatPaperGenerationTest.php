<?php

use App\Enums\UserType;
use App\Models\QatPaper;
use App\Models\QuestionType;
use App\Models\QuestionTypeHeading;
use App\Models\Subscription;
use App\Models\User;
use App\Support\Qat\QatPaperBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('QAT paper answer keys support true false and multipart objective options', function () {
    $builder = app(QatPaperBuilder::class);
    $question = (object) [
        'id' => 1, 'chapter_id' => 1, 'chapter_name' => 'Chapter', 'topic_name' => null,
        'question_type_id' => 1, 'type_name' => 'Objective', 'is_objective' => true,
        'question_data' => json_encode(['content' => ['correct_boolean' => 'false']]),
    ];
    $presented = $builder->presentQuestion($question, true);
    expect($presented['objective_answers']['options'])->toBe([1])
        ->and($presented['content'])->not->toHaveKey('correct_boolean');

    $question->question_data = json_encode(['content' => ['items' => [
        ['options' => [['text_en' => 'A', 'is_correct' => false], ['text_en' => 'B', 'is_correct' => true]]],
        ['options' => [['text_en' => 'C', 'is_correct' => true]]],
    ]]]);
    $presented = $builder->presentQuestion($question, true);
    expect($presented['objective_answers']['items'])->toBe([[1], [0]])
        ->and($presented['content']['items'][0]['options'][1])->not->toHaveKey('is_correct');
});

test('QAT paper generation uses only selected monthly chapters and saves a printable paper', function () {
    $school = User::factory()->create(['user_type' => UserType::Customer->value, 'account_type' => 'paid']);
    $school->update(['school_name' => 'Sample School', 'logo' => 'school-logos/sample.png']);
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value, 'created_by' => null]);
    Subscription::create([
        'user_id' => $school->id, 'name' => 'QAT plan', 'amount' => 1000,
        'started_at' => now()->subDay(), 'duration' => 30, 'expired_at' => now()->addDays(29),
        'status' => 'active', 'created_by' => $admin->id, 'access_scope' => [],
        'allow_qat_tests' => true,
    ]);
    $type = QuestionType::create([
        'name' => 'QAT MCQ', 'heading_en' => 'Choose the answer', 'heading_ur' => 'درست جواب منتخب کریں',
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
    $templateId = DB::table('qat_paper_templates')->insertGetId([
        'qat_subject_id' => $subjectId, 'name' => 'Monthly practice', 'category' => 'Practice',
        'minutes' => 35, 'sections' => json_encode([
            ['question_type_id' => $type->id, 'quantity' => 1, 'marks' => 2],
        ]), 'status' => true, 'created_at' => now(), 'updated_at' => now(),
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
    DB::table('qat_month_syllabi')->insert([
        'qat_subject_id' => $subjectId, 'month' => 5,
        'description' => 'Prepare the May chapter and exercises.',
        'created_at' => now(), 'updated_at' => now(),
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
            ->has('templates', 1)
            ->has('monthSyllabi', 1)
            ->where('monthSyllabi.0.description', 'Prepare the May chapter and exercises.')
            ->where('templates.0.id', $templateId)
            ->where('chapters.0.months.0', 4)
            ->where('chapters.1.months.0', 5));

    $this->actingAs($school)->postJson(route('customer.qat.questions'), [
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [5],
    ])->assertOk()->assertJsonPath('questions.total', 1)
        ->assertJsonPath('questions.data.0.id', $mayQuestionId)
        ->assertJsonPath('questions.data.0.chapter_name', 'May chapter')
        ->assertJsonPath('questions.data.0.source_label', 'Exercise')
        ->assertJsonMissingPath('questions.data.0.answer_en')
        ->assertJsonMissingPath('questions.data.0.objective_answers')
        ->assertJsonMissingPath('questions.data.0.options.0.is_correct');

    $this->actingAs($school)->postJson(route('customer.qat.questions'), [
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [4, 5],
    ])->assertUnprocessable()->assertJsonValidationErrors('months');
    $this->actingAs($school)->postJson(route('customer.qat.papers.store'), [
        'name' => 'Multiple months', 'mode' => 'auto', 'class_ids' => [$classId],
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [4, 5],
        'template_id' => $templateId,
    ])->assertUnprocessable()->assertJsonValidationErrors('months');

    $this->actingAs($school)->postJson(route('customer.qat.papers.store'), [
        'name' => 'Multiple classes', 'mode' => 'auto', 'class_ids' => [$classId, $classId],
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [5],
        'template_id' => $templateId,
    ])->assertUnprocessable()->assertJsonValidationErrors('class_ids');

    $generation = $this->actingAs($school)->postJson(route('customer.qat.papers.store'), [
        'name' => 'Monthly QAT', 'mode' => 'auto', 'class_ids' => [$classId],
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [5],
        'template_id' => $templateId,
    ])->assertCreated();
    $previewId = basename($generation->json('preview_url'));
    expect(QatPaper::query()->count())->toBe(0);
    $this->actingAs($school)->get(route('customer.qat.previews.show', $previewId))
        ->assertOk()->assertInertia(fn ($page) => $page
        ->component('customer/qat/paper')
        ->where('previewId', $previewId)
        ->where('schoolDetails.name', 'Sample School')
        ->where('schoolDetails.logo', 'school-logos/sample.png')
        ->where('paper.paper_data.sections.0.questions.0.objective_answers.options', [0])
        ->where('paper.paper_data.sections.0.heading_en', 'Choose the answer')
        ->where('paper.paper_data.sections.0.heading_ur', 'درست جواب منتخب کریں')
        ->where('paper.paper_data.sections.0.questions.0.statement_en', 'May question'));
    $this->actingAs($school)->get(route('customer.qat.index'))
        ->assertOk()->assertInertia(fn ($page) => $page->has('papers.data', 0));
    $this->actingAs($school)->postJson(route('customer.qat.previews.save', $previewId))
        ->assertCreated();
    $this->actingAs($school)->postJson(route('customer.qat.previews.save', $previewId))
        ->assertNotFound();
    $paper = QatPaper::query()->sole();
    expect($paper->paper_data['chapter_ids'])->toBe([$mayId])
        ->and($paper->paper_data['sections'][0]['questions'][0]['id'])->toBe($mayQuestionId)
        ->and($paper->paper_data['minutes'])->toBe(35)
        ->and($paper->paper_data['template']['id'])->toBe($templateId)
        ->and($paper->total_marks)->toBe(2.0);
    $this->actingAs($school)->get(route('customer.qat.papers.show', $paper))->assertOk()
        ->assertInertia(fn ($page) => $page->component('customer/qat/paper')
            ->where('schoolDetails.name', 'Sample School')
            ->where('schoolDetails.logo', 'school-logos/sample.png')
            ->where('paper.paper_data.sections.0.questions.0.statement_en', 'May question'));
    $legacyData = $paper->paper_data;
    unset($legacyData['sections'][0]['heading_en'], $legacyData['sections'][0]['heading_ur']);
    unset($legacyData['sections'][0]['questions'][0]['objective_answers']);
    $paper->update(['paper_data' => $legacyData]);
    $originalQuestionData = DB::table('qat_questions')->where('id', $mayQuestionId)->value('question_data');
    $updatedQuestionData = json_decode($originalQuestionData, true);
    array_unshift($updatedQuestionData['options'], ['text_en' => 'New option', 'is_correct' => false]);
    DB::table('qat_questions')->where('id', $mayQuestionId)->update(['question_data' => json_encode($updatedQuestionData)]);
    $this->actingAs($school)->get(route('customer.qat.papers.show', $paper))->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('paper.paper_data.sections.0.questions.0.objective_answers.options', [0])
            ->where('paper.paper_data.sections.0.heading_en', 'Choose the answer')
            ->where('paper.paper_data.sections.0.heading_ur', 'درست جواب منتخب کریں'));
    DB::table('qat_questions')->where('id', $mayQuestionId)->update(['question_data' => $originalQuestionData]);
    $otherSchool = User::factory()->create(['user_type' => UserType::Customer->value, 'account_type' => 'paid']);
    Subscription::create([
        'user_id' => $otherSchool->id, 'name' => 'Other QAT plan', 'amount' => 1000,
        'started_at' => now()->subDay(), 'duration' => 30, 'expired_at' => now()->addDays(29),
        'status' => 'active', 'created_by' => $admin->id, 'access_scope' => [],
        'allow_qat_tests' => true,
    ]);
    $this->actingAs($otherSchool)->get(route('customer.qat.papers.show', $paper))->assertForbidden();
    $privatePreview = $this->actingAs($school)->postJson(route('customer.qat.papers.store'), [
        'name' => 'Private preview', 'mode' => 'auto', 'class_ids' => [$classId],
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [4],
        'template_id' => $templateId,
    ])->assertCreated();
    $privatePreviewId = basename($privatePreview->json('preview_url'));
    $this->actingAs($otherSchool)->get(route('customer.qat.previews.show', $privatePreviewId))
        ->assertForbidden();
    $this->actingAs($otherSchool)->postJson(route('customer.qat.previews.save', $privatePreviewId))
        ->assertForbidden();
    expect(QatPaper::query()->count())->toBe(1);

    $saveGenerated = function (array $payload) use ($school): array {
        $generation = $this->actingAs($school)->postJson(route('customer.qat.papers.store'), $payload)
            ->assertCreated();
        $previewId = basename($generation->json('preview_url'));

        return $this->actingAs($school)->postJson(route('customer.qat.previews.save', $previewId))
            ->assertCreated()->json();
    };
    $this->actingAs($school)->postJson(route('customer.qat.papers.store'), [
        'name' => 'Manual QAT', 'mode' => 'manual', 'class_ids' => [$classId],
        'subject_id' => $subjectId, 'syllabus' => 'custom', 'chapter_ids' => [$aprilId],
        'minutes' => 40, 'manual_questions' => [['id' => $mayQuestionId, 'marks' => 1]],
    ])->assertUnprocessable()->assertJsonValidationErrors('manual_questions');
    $saveGenerated([
        'name' => 'Manual QAT', 'mode' => 'manual', 'class_ids' => [$classId],
        'subject_id' => $subjectId, 'syllabus' => 'custom', 'chapter_ids' => [$aprilId],
        'minutes' => 40, 'manual_questions' => [['id' => $aprilQuestionId, 'marks' => 3]],
    ]);
    expect(QatPaper::query()->count())->toBe(2);

    $variantSave = $saveGenerated([
        'name' => 'Two variants', 'mode' => 'auto', 'class_ids' => [$classId],
        'subject_id' => $subjectId, 'syllabus' => 'custom', 'chapter_ids' => [$aprilId, $mayId],
        'template_id' => $templateId, 'variants' => 2,
    ]);
    expect($variantSave['paper_ids'])->toHaveCount(2);
    $variants = QatPaper::query()->where('name', 'like', 'Two variants%')->get();
    expect($variants)->toHaveCount(2)
        ->and($variants->pluck('paper_data')->pluck('sections.0.questions.0.id')->unique())->toHaveCount(2);

    $extraQuestions = [];
    foreach (range(1, 35) as $number) {
        $extraQuestions[] = [
            'qat_chapter_id' => $mayId, 'source_question_id' => 10000 + $number,
            'question_type_id' => $type->id, 'status' => true,
            'question_data' => json_encode(['statement_en' => 'Extra question '.$number]),
            'created_at' => now(), 'updated_at' => now(),
        ];
    }
    DB::table('qat_questions')->insert($extraQuestions);
    $this->actingAs($school)->postJson(route('customer.qat.questions'), [
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [5],
        'include_questions' => true,
    ])->assertOk()->assertJsonPath('questions.total', 36)
        ->assertJsonCount(36, 'questions.data');
    $this->actingAs($school)->postJson(route('customer.qat.questions'), [
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [5],
        'include_questions' => false,
    ])->assertOk()->assertJsonPath('questions.total', 0)
        ->assertJsonCount(0, 'questions.data')
        ->assertJsonPath('types.0.total', 36);

    DB::table('qat_paper_templates')->where('id', $templateId)->update([
        'sections' => json_encode([[
            'question_type_id' => $type->id, 'quantity' => 3,
            'required_questions' => 2, 'marks' => 2,
        ]]),
    ]);
    $choiceGeneration = $this->actingAs($school)->postJson(route('customer.qat.papers.store'), [
        'name' => 'QAT with choices', 'mode' => 'auto', 'class_ids' => [$classId],
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [5],
        'template_id' => $templateId,
    ])->assertCreated();
    $this->actingAs($school)->get($choiceGeneration->json('preview_url'))
        ->assertOk()->assertInertia(fn ($page) => $page
        ->where('paper.question_count', 3)
        ->where('paper.total_marks', 4)
        ->where('paper.paper_data.is_pef_pattern', true)
        ->where('paper.paper_data.sections.0.required_questions', 2)
        ->has('paper.paper_data.sections.0.questions', 3));

    $customPayload = [
        'name' => 'Edited QAT template', 'mode' => 'auto', 'class_ids' => [$classId],
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [5],
        'template_id' => $templateId, 'minutes' => 50,
        'sections' => [['question_type_id' => $type->id, 'quantity' => 4, 'required_questions' => 3, 'marks' => 1.5]],
    ];
    $customGeneration = $this->actingAs($school)->postJson(route('customer.qat.papers.store'), $customPayload)->assertCreated();
    $this->actingAs($school)->get($customGeneration->json('preview_url'))->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('paper.question_count', 4)->where('paper.total_marks', 4.5)
            ->where('paper.paper_data.minutes', 50)->where('paper.paper_data.is_pef_pattern', false)
            ->where('paper.paper_data.sections.0.required_questions', 3));
    $customPayload['template_id'] = null;
    $customGeneration = $this->actingAs($school)->postJson(route('customer.qat.papers.store'), $customPayload)->assertCreated();
    $this->actingAs($school)->get($customGeneration->json('preview_url'))->assertOk()
        ->assertInertia(fn ($page) => $page->where('paper.paper_data.template', null)->where('paper.paper_data.is_pef_pattern', false));
    $customPayload['sections'][0]['required_questions'] = 5;
    $this->actingAs($school)->postJson(route('customer.qat.papers.store'), $customPayload)
        ->assertUnprocessable()->assertJsonValidationErrors('sections');
    $customPayload['sections'] = [];
    $this->actingAs($school)->postJson(route('customer.qat.papers.store'), $customPayload)
        ->assertUnprocessable()->assertJsonValidationErrors('sections');

    $sourcePatternId = DB::table('patterns')->insertGetId(['name' => 'QAT source', 'created_at' => now(), 'updated_at' => now()]);
    $sourceClassId = DB::table('classes')->insertGetId(['name' => 'QAT source class', 'created_at' => now(), 'updated_at' => now()]);
    $sourceSubjectId = DB::table('subjects')->insertGetId([
        'name_eng' => 'QAT source subject', 'subject_type' => 'chapter-wise',
        'created_at' => now(), 'updated_at' => now(),
    ]);
    DB::table('qat_classes')->where('id', $classId)->update(['source_class_id' => $sourceClassId]);
    DB::table('qat_subjects')->where('id', $subjectId)->update([
        'class_id' => $sourceClassId, 'source_pattern_id' => $sourcePatternId, 'subject_id' => $sourceSubjectId,
    ]);
    $firstObjective = QuestionType::create([
        'name' => 'First objective', 'heading_en' => 'First objective',
        'have_exercise' => false, 'have_statement' => true,
        'have_description' => false, 'have_answer' => false,
        'is_single' => true, 'is_objective' => true, 'column_per_row' => 1, 'status' => 1,
    ]);
    $subjective = QuestionType::create([
        'name' => 'Short answer', 'heading_en' => 'Short answer',
        'have_exercise' => false, 'have_statement' => true,
        'have_description' => false, 'have_answer' => false,
        'is_single' => true, 'is_objective' => false, 'column_per_row' => 1, 'status' => 1,
    ]);
    QuestionTypeHeading::create([
        'question_type_id' => $firstObjective->id,
        'pattern_id' => $sourcePatternId,
        'class_id' => $sourceClassId,
        'subject_id' => $sourceSubjectId,
        'scope_key' => QuestionTypeHeading::scopeKey($sourcePatternId, $sourceClassId, $sourceSubjectId),
        'heading_en' => 'Answer the first objective questions',
    ]);
    foreach ([[$firstObjective->id, 1], [$type->id, 2], [$subjective->id, 1]] as [$typeId, $order]) {
        DB::table('question_type_orders')->insert([
            'pattern_id' => $sourcePatternId, 'class_id' => $sourceClassId,
            'subject_id' => $sourceSubjectId, 'question_type_id' => $typeId, 'sort_order' => $order,
        ]);
    }
    foreach ([[$firstObjective->id, 20001], [$subjective->id, 20002]] as [$typeId, $sourceQuestionId]) {
        DB::table('qat_questions')->insert([
            'qat_chapter_id' => $mayId, 'source_question_id' => $sourceQuestionId,
            'question_type_id' => $typeId, 'status' => true,
            'question_data' => json_encode(['statement_en' => 'Ordered question '.$sourceQuestionId]),
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }
    $firstObjectiveQuestionId = DB::table('qat_questions')->where('source_question_id', 20001)->value('id');
    $subjectiveQuestionId = DB::table('qat_questions')->where('source_question_id', 20002)->value('id');
    $this->actingAs($school)->postJson(route('customer.qat.questions'), [
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [5],
    ])->assertOk()
        ->assertJsonPath('types.0.id', $firstObjective->id)
        ->assertJsonPath('types.1.id', $type->id)
        ->assertJsonPath('types.2.id', $subjective->id)
        ->assertJsonPath('questions.data.0.id', $firstObjectiveQuestionId)
        ->assertJsonPath('questions.data.37.id', $subjectiveQuestionId);

    $saveGenerated([
        'name' => 'Ordered manual QAT', 'mode' => 'manual', 'class_ids' => [$classId],
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [5], 'minutes' => 40,
        'manual_questions' => [
            ['id' => $subjectiveQuestionId, 'marks' => 3],
            ['id' => $mayQuestionId, 'marks' => 1],
            ['id' => $firstObjectiveQuestionId, 'marks' => 1],
        ],
    ]);
    $orderedPaper = QatPaper::query()->where('name', 'Ordered manual QAT')->sole();
    expect(collect($orderedPaper->paper_data['sections'])->pluck('question_type_id')->all())
        ->toBe([$firstObjective->id, $type->id, $subjective->id]);
    expect($orderedPaper->paper_data['sections'][0]['heading_en'])
        ->toBe('Answer the first objective questions');

    $this->actingAs($school)->postJson(route('customer.qat.papers.store'), [
        'name' => 'Missing template', 'mode' => 'auto', 'class_ids' => [$classId],
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [5],
    ])->assertUnprocessable()->assertJsonValidationErrors('minutes');
    DB::table('qat_paper_templates')->where('id', $templateId)->update([
        'sections' => json_encode([
            ['question_type_id' => $subjective->id, 'quantity' => 1, 'marks' => 3],
            ['question_type_id' => $type->id, 'quantity' => 1, 'marks' => 1],
            ['question_type_id' => $firstObjective->id, 'quantity' => 1, 'marks' => 1],
        ]),
    ]);
    $saveGenerated([
        'name' => 'Ordered auto QAT template', 'mode' => 'auto', 'class_ids' => [$classId],
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [5], 'template_id' => $templateId,
    ]);
    $orderedAutoPaper = QatPaper::query()->where('name', 'Ordered auto QAT template')->sole();
    expect(collect($orderedAutoPaper->paper_data['sections'])->pluck('question_type_id')->all())
        ->toBe([$firstObjective->id, $type->id, $subjective->id]);
    DB::table('qat_paper_templates')->where('id', $templateId)->update(['status' => false]);
    $this->actingAs($school)->postJson(route('customer.qat.papers.store'), [
        'name' => 'Inactive template', 'mode' => 'auto', 'class_ids' => [$classId],
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [5], 'template_id' => $templateId,
    ])->assertUnprocessable()->assertJsonValidationErrors('template_id');
    $otherSubjectId = DB::table('qat_subjects')->insertGetId([
        'qat_class_id' => $classId, 'qat_catalogue_id' => $catalogueId,
        'class_id' => $sourceClassId, 'class_name' => 'Class 5', 'subject_id' => 999,
        'subject_name' => 'Other book', 'source_pattern_id' => $sourcePatternId,
        'source_pattern_name' => 'Source', 'status' => true,
        'created_at' => now(), 'updated_at' => now(),
    ]);
    DB::table('qat_paper_templates')->where('id', $templateId)->update([
        'qat_subject_id' => $otherSubjectId, 'status' => true,
    ]);
    $this->actingAs($school)->postJson(route('customer.qat.papers.store'), [
        'name' => 'Other book template', 'mode' => 'auto', 'class_ids' => [$classId],
        'subject_id' => $subjectId, 'syllabus' => 'qat', 'months' => [5], 'template_id' => $templateId,
    ])->assertUnprocessable()->assertJsonValidationErrors('template_id');
});

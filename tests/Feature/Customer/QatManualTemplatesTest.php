<?php

use App\Enums\UserType;
use App\Models\ClassSubject;
use App\Models\Medium;
use App\Models\Pattern;
use App\Models\QatPaper;
use App\Models\QuestionType;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->school = User::factory()->create(['user_type' => UserType::Customer->value, 'account_type' => 'paid']);
    $this->admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value, 'created_by' => null]);
    Subscription::create([
        'user_id' => $this->school->id, 'name' => 'QAT', 'amount' => 1000, 'started_at' => now()->subDay(),
        'duration' => 30, 'expired_at' => now()->addDays(29), 'status' => 'active',
        'created_by' => $this->admin->id, 'access_scope' => [], 'allow_qat_tests' => true,
    ]);
    $this->type = QuestionType::create([
        'name' => 'Short Question', 'heading_en' => 'Answer the questions.', 'have_exercise' => false,
        'have_statement' => true, 'have_description' => false, 'have_answer' => false,
        'is_single' => true, 'is_objective' => false, 'column_per_row' => 1, 'status' => 1,
    ]);
    $catalogue = DB::table('qat_catalogues')->insertGetId(['academic_year' => '2026-27']);
    $this->classId = DB::table('qat_classes')->insertGetId([
        'qat_catalogue_id' => $catalogue, 'source_class_id' => 10, 'name' => '5th', 'status' => true,
    ]);
    $this->subjectId = DB::table('qat_subjects')->insertGetId([
        'qat_class_id' => $this->classId, 'qat_catalogue_id' => $catalogue, 'class_id' => 10,
        'class_name' => '5th', 'subject_id' => 20, 'subject_name' => 'Mathematics',
        'source_pattern_id' => 30, 'source_pattern_name' => 'Source', 'status' => true,
    ]);
    $this->chapterId = DB::table('qat_chapters')->insertGetId([
        'qat_subject_id' => $this->subjectId, 'source_chapter_id' => 101, 'name' => 'Selected chapter', 'status' => true,
    ]);
    $otherChapter = DB::table('qat_chapters')->insertGetId([
        'qat_subject_id' => $this->subjectId, 'source_chapter_id' => 102, 'name' => 'Excluded chapter', 'status' => true,
    ]);
    $this->questions = [];
    foreach ([$this->chapterId, $this->chapterId, $otherChapter] as $index => $chapter) {
        $this->questions[] = DB::table('qat_questions')->insertGetId([
            'qat_chapter_id' => $chapter, 'source_question_id' => $index + 1,
            'question_type_id' => $this->type->id, 'status' => true,
            'question_data' => json_encode(['statement_en' => 'Question '.($index + 1)]),
        ]);
    }
    $this->sections = [['question_type_id' => $this->type->id, 'quantity' => 2, 'required_questions' => 1, 'marks' => 3]];
    $this->templateId = DB::table('qat_paper_templates')->insertGetId([
        'qat_subject_id' => $this->subjectId, 'name' => 'Custom chapter practice', 'minutes' => 35,
        'sections' => json_encode($this->sections), 'status' => true,
    ]);
    $this->payload = [
        'name' => 'Custom chapter paper', 'mode' => 'manual', 'selection_method' => 'template',
        'class_ids' => [$this->classId], 'subject_id' => $this->subjectId, 'syllabus' => 'custom',
        'chapter_ids' => [$this->chapterId], 'template_id' => $this->templateId, 'minutes' => 35,
        'sections' => $this->sections,
        'manual_questions' => [['id' => $this->questions[0], 'marks' => 3], ['id' => $this->questions[1], 'marks' => 3]],
    ];
});

test('manual QAT lists active templates for the accessible subjects', function () {
    DB::table('qat_paper_templates')->insert([
        'qat_subject_id' => $this->subjectId, 'name' => 'Inactive', 'minutes' => 35, 'sections' => '[]', 'status' => false,
    ]);
    $this->actingAs($this->school)->get(route('customer.qat.create', 'manual'))->assertOk()
        ->assertInertia(fn ($page) => $page->has('templates', 1)->where('templates.0.id', $this->templateId));
});

test('QAT keeps template and saved section names when no questions qualify', function () {
    [$customType, [$customQuestion]] = addQatTypeToChapter($this->chapterId, 'Custom section type', 60, 1);
    $scope = ['subject_id' => $this->subjectId, 'syllabus' => 'custom', 'chapter_ids' => [$this->chapterId]];
    $chapterQuestions = DB::table('qat_questions')->where('qat_chapter_id', $this->chapterId);
    $chapterQuestions->update(['status' => false]);
    $this->actingAs($this->school)->postJson(route('customer.qat.questions'), $scope)
        ->assertOk()->assertJsonPath('types', [])->assertJsonPath('questions.total', 0);
    $this->get(route('customer.qat.create', 'manual'))->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('questionTypeNames.'.$this->type->id, $this->type->name)
            ->missing('questionTypeNames.'.$customType));

    $chapterQuestions->update(['status' => true]);
    $response = $this->postJson(route('customer.qat.papers.store'), [
        ...$this->payload,
        'sections' => [['question_type_id' => $customType, 'quantity' => 1, 'required_questions' => 1, 'marks' => 3]],
        'manual_questions' => [['id' => $customQuestion, 'marks' => 3]],
    ])->assertCreated();
    $saved = $this->postJson(route('customer.qat.previews.save', basename($response->json('preview_url'))))
        ->assertCreated()->json('paper_id');
    $this->get(route('customer.qat.create', ['mode' => 'manual', 'paper' => $saved]))->assertOk()
        ->assertInertia(fn ($page) => $page->where('questionTypeNames.'.$customType, 'Custom section type'));
});

test('the past paper setting uses the same QAT questions in every journey', function (string $journey) {
    DB::table('qat_questions')->whereIn('id', [$this->questions[0], $this->questions[2]])
        ->update(['is_past_qat_paper' => true]);
    [$partner, $alternatives] = addQatTypeToChapter($this->chapterId, 'Past paper alternative', 60, 2);
    $pair = ['type_id' => $this->type->id, 'partner_id' => $partner];
    DB::table('qat_subjects')->where('id', $this->subjectId)->update([
        'question_type_rules' => json_encode(['or_pairs' => [$pair]]),
    ]);
    DB::table('qat_chapter_months')->insert([
        ['qat_chapter_id' => $this->chapterId, 'month' => 4],
        ['qat_chapter_id' => $this->chapterId, 'month' => 5],
    ]);
    // Monthly papers still use the content assigned to the selected month.
    DB::table('qat_month_edits')->insert([
        'kind' => 'question', 'record_id' => $this->questions[0], 'month' => 4,
        'question_type_id' => $this->type->id, 'status' => true,
        'question_data' => json_encode(['statement_en' => 'Edited for April']),
    ]);
    $payload = [...$this->payload, 'past_paper' => true, 'or_pairs' => [$pair]];
    if ($journey === 'auto') {
        $payload = [...$payload, 'mode' => 'auto', 'syllabus' => 'qat', 'months' => [4], 'chapter_ids' => []];
    } else {
        foreach ($alternatives as $id) {
            $payload['manual_questions'][] = ['id' => $id, 'marks' => 3];
        }
    }
    if ($journey === 'manual') {
        $payload['selection_method'] = 'manual';
        $payload['sections'] = [];
    }
    $scope = array_intersect_key($payload, array_flip(['subject_id', 'syllabus', 'months', 'chapter_ids']));
    $pool = $this->actingAs($this->school)->postJson(route('customer.qat.questions'), [...$scope, 'past_paper' => true])
        ->assertOk()->assertJsonCount(4, 'questions.data')->assertJsonPath('types.0.total', 2);
    expect(array_column($pool->json('questions.data'), 'id'))
        ->toContain($this->questions[0], $this->questions[1])->not->toContain($this->questions[2]);
    $this->postJson(route('customer.qat.questions'), [...$scope, 'past_paper' => false])
        ->assertOk()->assertExactJson($pool->json());
    $this->postJson(route('customer.qat.questions'), [...$scope, 'past_paper' => true, 'include_questions' => false])
        ->assertOk()->assertJsonCount(0, 'questions.data')->assertJsonPath('types.0.total', 2);

    $response = $this->postJson(route('customer.qat.papers.store'), $payload)->assertCreated();
    $preview = basename($response->json('preview_url'));
    $this->get($response->json('preview_url'))->assertOk()->assertInertia(fn ($page) => $page
        ->where('paper.paper_data.generation_settings.past_paper', true)
        ->has('paper.paper_data.sections.0.questions', 2)
        ->where('paper.paper_data.sections.0.questions.0.or_question.question_type_id', $partner));
    $saved = $this->postJson(route('customer.qat.previews.save', $preview))->assertCreated()->json('paper_id');
    $this->get(route('customer.qat.create', ['mode' => $payload['mode'], 'paper' => $saved]))->assertOk()
        ->assertInertia(fn ($page) => $page->where('initialSelections.past_paper', true));
    $unchecked = $this->postJson(route('customer.qat.papers.store'), [...$payload, 'past_paper' => false])->assertCreated();
    $this->get($unchecked->json('preview_url'))->assertOk()->assertInertia(fn ($page) => $page
        ->where('paper.paper_data.generation_settings.past_paper', false)
        ->has('paper.paper_data.sections.0.questions', 2));
})->with(['manual', 'template', 'auto']);

test('manual templates preserve custom chapters choices required counts and restore the journey', function () {
    $response = $this->actingAs($this->school)->postJson(route('customer.qat.papers.store'), $this->payload)->assertCreated();
    $preview = basename($response->json('preview_url'));
    expect(QatPaper::count())->toBe(0);
    $this->get($response->json('preview_url'))->assertOk()->assertInertia(fn ($page) => $page
        ->where('paper.mode', 'manual')->where('paper.paper_data.syllabus', 'custom')
        ->where('paper.paper_data.generation_settings.past_paper', true)
        ->where('paper.paper_data.chapter_ids', [$this->chapterId])->where('paper.paper_data.months', [])
        ->where('paper.total_marks', 3)->where('paper.question_count', 2)
        ->where('paper.paper_data.sections.0.required_questions', 1)
        ->where('paper.paper_data.sections.0.questions.0.id', $this->questions[0])
        ->where('paper.paper_data.sections.0.questions.1.id', $this->questions[1])
        ->where('paper.paper_data.is_pef_pattern', true));
    $this->get(route('customer.qat.create', ['mode' => 'manual', 'preview' => $preview]))->assertOk()
        ->assertInertia(fn ($page) => $page->where('initialSelections.selection_method', 'template')
            ->where('initialSelections.manual_questions', $this->payload['manual_questions']));
    $saved = $this->postJson(route('customer.qat.previews.save', $preview))->assertCreated()->json('paper_id');
    $this->get(route('customer.qat.create', ['mode' => 'manual', 'paper' => $saved]))->assertOk()
        ->assertInertia(fn ($page) => $page->where('initialSelections.selection_method', 'template')
            ->where('initialSelections.sections.0.required_questions', 1));
});

test('manual templates reject questions from unselected chapters', function () {
    $this->payload['manual_questions'][1]['id'] = $this->questions[2];
    $this->actingAs($this->school)->postJson(route('customer.qat.papers.store'), $this->payload)
        ->assertUnprocessable()->assertJsonValidationErrors('manual_questions');
});

test('manual templates validate the chosen questions against the distribution', function (string $field) {
    if ($field === 'count') {
        $this->payload['sections'][0]['quantity'] = 3;
    }
    if ($field === 'required') {
        $this->payload['sections'][0]['required_questions'] = 3;
    }
    if ($field === 'marks') {
        $this->payload['manual_questions'][0]['marks'] = 4;
    }
    $this->actingAs($this->school)->postJson(route('customer.qat.papers.store'), $this->payload)
        ->assertUnprocessable()->assertJsonValidationErrors('sections');
})->with(['count', 'required', 'marks']);

test('manual templates reject inactive templates and templates from another subject', function (bool $inactive) {
    $otherSubject = (array) DB::table('qat_subjects')->where('id', $this->subjectId)->first();
    unset($otherSubject['id']);
    $otherSubject['subject_id'] = 21;
    $otherSubjectId = DB::table('qat_subjects')->insertGetId($otherSubject);
    DB::table('qat_paper_templates')->where('id', $this->templateId)->update($inactive
        ? ['status' => false] : ['qat_subject_id' => $otherSubjectId]);
    $this->actingAs($this->school)->postJson(route('customer.qat.papers.store'), $this->payload)
        ->assertUnprocessable()->assertJsonValidationErrors('template_id');
})->with([true, false]);

test('editing a manual template keeps custom chapters and marks the paper as non PEF', function () {
    $this->payload['sections'][0]['required_questions'] = 2;
    $response = $this->actingAs($this->school)->postJson(route('customer.qat.papers.store'), $this->payload)->assertCreated();
    $this->get($response->json('preview_url'))->assertOk()->assertInertia(fn ($page) => $page
        ->where('paper.total_marks', 6)->where('paper.paper_data.is_pef_pattern', false));
});

test('QAT uses the source subject medium for selection and stores it with each paper', function (string $journey) {
    $pattern = Pattern::create(['name' => 'Source pattern', 'status' => 1]);
    $class = SchoolClass::create(['name' => '5th', 'status' => 1]);
    $subject = Subject::create(['name_eng' => 'Mathematics', 'name_ur' => 'ریاضی', 'subject_type' => 'chapter-wise', 'status' => 1]);
    $urdu = Medium::firstOrCreate(['name' => 'Urdu']);
    $english = Medium::firstOrCreate(['name' => 'English']);
    $both = Medium::firstOrCreate(['name' => 'Both']);
    $assignment = ClassSubject::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id,
        'subject_id' => $subject->id, 'medium_id' => $urdu->id,
    ]);
    DB::table('qat_classes')->where('id', $this->classId)->update(['source_class_id' => $class->id]);
    DB::table('qat_subjects')->where('id', $this->subjectId)->update([
        'class_id' => $class->id, 'subject_id' => $subject->id, 'source_pattern_id' => $pattern->id,
    ]);
    DB::table('qat_chapters')->where('id', $this->chapterId)->update(['name_ur' => 'منتخب باب']);
    $this->type->update(['name_ur' => 'معروضی سوالات', 'heading_ur' => 'سوالات کے جواب دیں۔', 'is_objective' => true]);
    DB::table('qat_questions')->where('id', $this->questions[0])->update([
        'question_data' => json_encode([
            'statement_en' => 'Explain the rule.',
            'statement_ur' => 'اصول بیان کریں۔',
            'schema_key' => 'objective_passage_mcq',
            'content' => ['items' => [[
                'prompt_en' => 'Give an example.',
                'prompt_ur' => 'ایک مثال دیں۔',
                'options' => [
                    ['text_en' => 'One', 'text_ur' => 'ایک'],
                    ['text_en' => 'Two', 'text_ur' => 'دو', 'is_correct' => true],
                    ['text_en' => null, 'text_ur' => null],
                ],
            ]]],
        ]),
    ]);
    $scope = ['subject_id' => $this->subjectId, 'syllabus' => 'custom', 'chapter_ids' => [$this->chapterId]];
    $this->actingAs($this->school)->postJson(route('customer.qat.questions'), $scope)
        ->assertOk()
        ->assertJsonPath('medium', 'Urdu')
        ->assertJsonPath('types.0.total', 1)
        ->assertJsonPath('chapters.0.name', 'منتخب باب')
        ->assertJsonPath('questions.data.0.statement_en', '')
        ->assertJsonPath('questions.data.0.statement_ur', 'اصول بیان کریں۔')
        ->assertJsonMissingPath('questions.data.0.content.items.0.prompt_en');
    $this->postJson(route('customer.qat.papers.store'), [
        ...$this->payload, 'selection_method' => 'manual',
        'manual_questions' => [['id' => $this->questions[1], 'marks' => 3]],
    ])->assertUnprocessable()->assertJsonValidationErrors('manual_questions');

    $payload = [...$this->payload, 'sections' => [
        ['question_type_id' => $this->type->id, 'quantity' => 1, 'required_questions' => 1, 'marks' => 3],
    ], 'manual_questions' => [['id' => $this->questions[0], 'marks' => 3]]];
    if ($journey === 'manual') {
        $payload['selection_method'] = 'manual';
    } elseif ($journey === 'auto') {
        DB::table('qat_chapter_months')->insert(['qat_chapter_id' => $this->chapterId, 'month' => 4]);
        $payload = [...$payload, 'mode' => 'auto', 'syllabus' => 'qat', 'months' => [4]];
        $this->postJson(route('customer.qat.questions'), [
            ...$scope, 'syllabus' => 'qat', 'months' => [4], 'include_questions' => false,
        ])->assertOk()->assertJsonPath('types.0.total', 1)->assertJsonCount(0, 'questions.data');
    }

    $response = $this->postJson(route('customer.qat.papers.store'), $payload)->assertCreated();
    $previewUrl = $response->json('preview_url');
    $this->get($previewUrl)->assertOk()->assertInertia(fn ($page) => $page
        ->where('paper.subject_name', 'ریاضی')->where('paper.paper_data.medium', 'Urdu')
        ->where('paper.paper_data.sections.0.heading_en', '')
        ->where('paper.paper_data.sections.0.heading_ur', 'سوالات کے جواب دیں۔')
        ->where('paper.paper_data.sections.0.questions.0.content.items.0.prompt_ur', 'ایک مثال دیں۔')
        ->has('paper.paper_data.sections.0.questions.0.content.items.0.options', 2)
        ->where('paper.paper_data.sections.0.questions.0.objective_answers.items.0', [1]));
    $paperId = $this->postJson(route('customer.qat.previews.save', basename($previewUrl)))->assertCreated()->json('paper_id');

    $assignment->update(['medium_id' => $english->id]);
    $this->postJson(route('customer.qat.questions'), $scope)
        ->assertOk()->assertJsonPath('medium', 'English')->assertJsonPath('types.0.total', 2)
        ->assertJsonPath('questions.data.0.statement_ur', '')
        ->assertJsonMissingPath('questions.data.0.content.items.0.prompt_ur');
    $this->get(route('customer.qat.papers.show', $paperId))->assertOk()
        ->assertInertia(fn ($page) => $page->where('paper.paper_data.medium', 'Urdu'));

    $assignment->update(['medium_id' => $both->id]);
    $this->postJson(route('customer.qat.questions'), $scope)
        ->assertOk()->assertJsonPath('medium', 'Both')
        ->assertJsonPath('questions.data.0.statement_en', 'Explain the rule.')
        ->assertJsonPath('questions.data.0.statement_ur', 'اصول بیان کریں۔');
})->with(['manual', 'template', 'auto']);

function addQatTypeToChapter(int $chapter, string $name, int $source, int $count): array
{
    $type = QuestionType::create([
        'name' => $name, 'heading_en' => "Answer $name.", 'have_exercise' => false,
        'have_statement' => true, 'have_description' => false, 'have_answer' => false,
        'is_single' => true, 'is_objective' => false, 'column_per_row' => 1, 'status' => 1,
    ]);
    $ids = [];
    for ($index = 0; $index < $count; $index++) {
        $ids[] = DB::table('qat_questions')->insertGetId([
            'qat_chapter_id' => $chapter, 'source_question_id' => $source + $index,
            'question_type_id' => $type->id, 'status' => true,
            'question_data' => json_encode(['statement_en' => "$name $index", 'statement_ur' => 'سوال']),
        ]);
    }

    return [$type->id, $ids];
}

test('QAT paper sections can be configured per subject and are captured on generated papers', function (string $journey) {
    [$otherType, [$otherQuestion]] = addQatTypeToChapter($this->chapterId, 'Long Question', 100, 1);
    [$objective] = addQatTypeToChapter($this->chapterId, 'Objective question', 110, 1);
    QuestionType::query()->whereKey($objective)->update(['is_objective' => true]);
    DB::table('qat_chapter_months')->insert(['qat_chapter_id' => $this->chapterId, 'month' => 4]);
    $scope = ['catalogue_id' => DB::table('qat_catalogues')->value('id'), 'class_id' => $this->classId, 'subject_id' => $this->subjectId];
    $update = route('superadmin.qat-paper-sections.update', $this->subjectId);
    $settings = [
        'is_active' => true, 'show_objective_section' => false,
        'objective_label_en' => 'Multiple choice', 'objective_label_ur' => 'معروضی سوالات',
        'groups' => [[
            'label_en' => 'Written questions', 'label_ur' => 'تحریری سوالات',
            'question_type_ids' => [$otherType, $this->type->id],
        ]],
    ];

    $delegate = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => $this->admin->id]);
    $this->actingAs($delegate)->putJson($update, $settings)->assertForbidden();
    $this->actingAs($this->admin)->get(route('superadmin.qat-paper-sections.index', $scope))->assertOk()
        ->assertInertia(fn ($page) => $page->component('superadmin/qat-paper-sections')
            ->where('scope', $scope)->has('types', 2)->where('settings', null));
    $this->putJson($update, [...$settings, 'groups' => [['question_type_ids' => [$objective]]]])
        ->assertUnprocessable()->assertJsonValidationErrors('groups.0.question_type_ids');
    $this->putJson($update, [...$settings, 'groups' => [...$settings['groups'], ['question_type_ids' => [$otherType]]]])
        ->assertUnprocessable()->assertJsonValidationErrors('groups.1.question_type_ids.0');
    $this->put($update, $settings)->assertRedirect()->assertSessionHasNoErrors();
    $this->get(route('superadmin.qat-paper-sections.index', $scope))->assertOk()
        ->assertInertia(fn ($page) => $page->where('settings', $settings));

    $payload = [...$this->payload,
        'sections' => [...$this->sections, ['question_type_id' => $otherType, 'quantity' => 1, 'marks' => 3]],
        'manual_questions' => [...$this->payload['manual_questions'], ['id' => $otherQuestion, 'marks' => 3]],
    ];
    if ($journey === 'auto') {
        $payload = [...$payload, 'mode' => 'auto', 'syllabus' => 'qat', 'months' => [4], 'chapter_ids' => []];
    }
    if ($journey === 'manual') {
        $payload = [...$payload, 'selection_method' => 'manual', 'sections' => []];
    }
    $preview = $this->actingAs($this->school)->postJson(route('customer.qat.papers.store'), $payload)->assertCreated()->json('preview_url');
    $this->get($preview)->assertOk()->assertInertia(fn ($page) => $page
        ->where('paper.paper_data.section_layout', $settings)->has('paper.paper_data.sections', 2)
        ->where('paper.question_count', 3));
    $saved = $this->postJson(route('customer.qat.previews.save', basename($preview)))->assertCreated()->json('paper_id');
    $this->actingAs($this->admin)->put($update, [...$settings, 'is_active' => false])->assertRedirect();
    $this->actingAs($this->school)->get(route('customer.qat.papers.show', $saved))->assertOk()
        ->assertInertia(fn ($page) => $page->where('paper.paper_data.section_layout', $settings));
    $default = $this->postJson(route('customer.qat.papers.store'), $payload)->assertCreated()->json('preview_url');
    $this->get($default)->assertOk()->assertInertia(fn ($page) => $page->where('paper.paper_data.section_layout', null));
})->with(['manual', 'template', 'auto']);

test('heading visibility is scoped and captured on each generated QAT paper', function () {
    [$essayType, [$essayQuestion]] = addQatTypeToChapter($this->chapterId, 'Write a story', 120, 1);
    [$unusedType] = addQatTypeToChapter($this->chapterId, 'Unassigned type', 130, 0);
    $scope = ['catalogue_id' => DB::table('qat_catalogues')->value('id'), 'class_id' => $this->classId, 'subject_id' => $this->subjectId];
    $index = route('superadmin.qat-question-headings.index', $scope);
    $update = route('superadmin.qat-question-headings.update', $this->subjectId);
    $delegate = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => $this->admin->id]);
    $this->actingAs($delegate)->get($index)->assertForbidden();
    $this->putJson($update, ['hidden_type_ids' => [$essayType]])->assertForbidden();
    $this->actingAs($this->admin)->putJson($update, ['hidden_type_ids' => [$unusedType]])
        ->assertUnprocessable()->assertJsonValidationErrors('hidden_type_ids');
    $this->put($update, ['hidden_type_ids' => [$essayType]])->assertRedirect()->assertSessionHasNoErrors();
    $this->get($index)->assertOk()->assertInertia(fn ($page) => $page
        ->component('superadmin/qat-question-headings')->where('scope', $scope)
        ->has('types', 2)->where('hiddenTypeIds', [$essayType]));
    $this->get(route('superadmin.qat-question-headings.index', [...$scope, 'class_id' => 0]))->assertOk()
        ->assertInertia(fn ($page) => $page->where('scope.subject_id', 0)->has('types', 0));

    $payload = [...$this->payload, 'selection_method' => 'manual', 'sections' => [],
        'manual_questions' => [...$this->payload['manual_questions'], ['id' => $essayQuestion, 'marks' => 5]],
    ];
    $preview = $this->actingAs($this->school)->postJson(route('customer.qat.papers.store'), $payload)
        ->assertCreated()->json('preview_url');
    $this->get($preview)->assertOk()->assertInertia(fn ($page) => $page
        ->missing('paper.paper_data.sections.0.hide_heading')
        ->where('paper.paper_data.sections.1.hide_heading', true)
        ->where('paper.paper_data.sections.1.questions.0.statement_en', 'Write a story 0'));
    $saved = $this->postJson(route('customer.qat.previews.save', basename($preview)))->assertCreated()->json('paper_id');
    $this->actingAs($this->admin)->put($update, ['hidden_type_ids' => []])->assertRedirect()->assertSessionHasNoErrors();
    $this->actingAs($this->school)->get(route('customer.qat.papers.show', $saved))->assertOk()
        ->assertInertia(fn ($page) => $page->where('paper.paper_data.sections.1.hide_heading', true));
    $newPreview = $this->postJson(route('customer.qat.papers.store'), $payload)->assertCreated()->json('preview_url');
    $this->get($newPreview)->assertOk()
        ->assertInertia(fn ($page) => $page->missing('paper.paper_data.sections.1.hide_heading'));
});

test('QAT heading text stays in its catalogue scope and is captured for both sides of an OR pair', function () {
    [$partner, $alternatives] = addQatTypeToChapter($this->chapterId, 'Translation', 140, 2);
    [$unused] = addQatTypeToChapter($this->chapterId, 'Unassigned type', 150, 0);
    $this->type->update(['heading_ur' => 'مختصر جواب دیں۔']);
    $pair = ['type_id' => $this->type->id, 'partner_id' => $partner];
    $scope = ['catalogue_id' => DB::table('qat_catalogues')->value('id'), 'class_id' => $this->classId, 'subject_id' => $this->subjectId];
    $index = route('superadmin.qat-question-heading-text.index', $scope);
    $update = route('superadmin.qat-question-heading-text.update', $this->subjectId);
    $headings = [
        ['question_type_id' => $this->type->id, 'heading_en' => '  Give short answers.  ', 'heading_ur' => ''],
        ['question_type_id' => $partner, 'heading_ur' => 'ترجمہ کریں۔'],
    ];
    $delegate = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => $this->admin->id]);
    $this->actingAs($delegate)->get($index)->assertForbidden();
    $this->putJson($update, ['overrides' => $headings])->assertForbidden();
    $this->actingAs($this->admin)->get($index)->assertOk()->assertInertia(fn ($page) => $page
        ->component('superadmin/qat-question-heading-text')->where('scope', $scope)
        ->where("defaultHeadings.{$this->type->id}.heading_en", 'Answer the questions.'));
    $this->putJson($update, ['overrides' => [['question_type_id' => $unused, 'heading_en' => 'Unavailable']]])
        ->assertUnprocessable()->assertJsonValidationErrors('overrides');
    $this->put($update, ['overrides' => $headings])->assertRedirect()->assertSessionHasNoErrors();
    $this->put(route('superadmin.qat-question-types.update', $this->subjectId), [
        'hidden_type_ids' => [], 'or_pairs' => [$pair],
    ])->assertRedirect()->assertSessionHasNoErrors();
    $this->get($index)->assertOk()->assertInertia(fn ($page) => $page
        ->where("overrides.{$this->type->id}.heading_en", 'Give short answers.')
        ->missing("overrides.{$this->type->id}.heading_ur"));
    expect($this->type->fresh()->heading_en)->toBe('Answer the questions.');

    $otherYear = DB::table('qat_catalogues')->insertGetId(['academic_year' => '2027-28']);
    $otherClass = DB::table('qat_classes')->insertGetId(['qat_catalogue_id' => $otherYear, 'source_class_id' => 10, 'name' => '5th']);
    $otherSubject = DB::table('qat_subjects')->insertGetId([
        'qat_class_id' => $otherClass, 'qat_catalogue_id' => $otherYear, 'class_id' => 10,
        'class_name' => '5th', 'subject_id' => 20, 'subject_name' => 'Mathematics',
        'source_pattern_id' => 30, 'source_pattern_name' => 'Source',
    ]);
    $this->get(route('superadmin.qat-question-heading-text.index', [
        'catalogue_id' => $otherYear, 'class_id' => $otherClass, 'subject_id' => $otherSubject,
    ]))->assertOk()->assertInertia(fn ($page) => $page->where('overrides', []));

    $payload = [...$this->payload, 'or_pairs' => [$pair], 'manual_questions' => [
        ...$this->payload['manual_questions'],
        ...array_map(fn ($id) => ['id' => $id, 'marks' => 3], $alternatives),
    ]];
    $preview = $this->actingAs($this->school)->postJson(route('customer.qat.papers.store'), $payload)
        ->assertCreated()->json('preview_url');
    $this->get($preview)->assertOk()->assertInertia(fn ($page) => $page
        ->where('paper.paper_data.sections.0.heading_en', 'Give short answers.')
        ->where('paper.paper_data.sections.0.heading_ur', 'مختصر جواب دیں۔')
        ->where('paper.paper_data.sections.0.or_heading_en', 'Answer Translation.')
        ->where('paper.paper_data.sections.0.or_heading_ur', 'ترجمہ کریں۔'));
    $saved = $this->postJson(route('customer.qat.previews.save', basename($preview)))->assertCreated()->json('paper_id');
    $this->actingAs($this->admin)->put($update, ['overrides' => []])->assertRedirect()->assertSessionHasNoErrors();
    $this->actingAs($this->school)->get(route('customer.qat.papers.show', $saved))->assertOk()
        ->assertInertia(fn ($page) => $page->where('paper.paper_data.sections.0.heading_en', 'Give short answers.'));
    $newPreview = $this->postJson(route('customer.qat.papers.store'), $payload)->assertCreated()->json('preview_url');
    $this->get($newPreview)->assertOk()
        ->assertInertia(fn ($page) => $page->where('paper.paper_data.sections.0.heading_en', 'Answer the questions.'));
});

test('subject question type settings control the customer pool and templates in every month', function () {
    [$partner] = addQatTypeToChapter($this->chapterId, 'Translation', 20, 1);
    [$hidden, [$hiddenQuestion]] = addQatTypeToChapter($this->chapterId, 'Extra type', 30, 1);
    DB::table('qat_chapter_months')->insert([
        ['qat_chapter_id' => $this->chapterId, 'month' => 4],
        ['qat_chapter_id' => $this->chapterId, 'month' => 5],
    ]);
    $scope = ['catalogue_id' => DB::table('qat_catalogues')->value('id'), 'class_id' => $this->classId, 'subject_id' => $this->subjectId];
    $route = route('superadmin.qat-question-types.update', $this->subjectId);
    $pair = ['type_id' => $this->type->id, 'partner_id' => $partner];
    $settings = ['hidden_type_ids' => [$hidden], 'or_pairs' => [$pair]];

    $this->actingAs($this->admin)->get(route('superadmin.qat-question-types.index', $scope))->assertOk()
        ->assertInertia(fn ($page) => $page->component('superadmin/qat-question-types')
            ->where('scope', $scope)->has('types', 3)->where('hiddenTypeIds', []));
    $delegate = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => $this->admin->id]);
    $this->actingAs($delegate)->putJson($route, $settings)->assertForbidden();
    $this->actingAs($this->school)->postJson(route('customer.qat.questions'), [
        'subject_id' => $this->subjectId, 'syllabus' => 'custom', 'chapter_ids' => [$this->chapterId],
    ])->assertOk()->assertJsonCount(3, 'types');
    $this->actingAs($this->admin)->putJson($route, [
        ...$settings, 'or_pairs' => [$pair, ['type_id' => $partner, 'partner_id' => $hidden]],
    ])->assertUnprocessable()->assertJsonValidationErrors('or_pairs');
    $this->put($route, $settings)->assertRedirect()->assertSessionHasNoErrors();

    DB::table('qat_paper_templates')->where('id', $this->templateId)->update([
        'sections' => json_encode([...$this->sections, ['question_type_id' => $hidden, 'quantity' => 1, 'marks' => 1]]),
    ]);
    $this->actingAs($this->school)->get(route('customer.qat.create', 'auto'))->assertOk()
        ->assertInertia(fn ($page) => $page->has('templates.0.sections', 1)->where('templates.0.has_hidden_types', true));
    foreach ([4, 5] as $month) {
        $pool = $this->postJson(route('customer.qat.questions'), [
            'subject_id' => $this->subjectId, 'syllabus' => 'qat', 'months' => [$month],
        ])->assertOk()->assertJsonCount(2, 'types');
        expect(collect($pool->json('types'))->pluck('or_partner_id', 'id')->all())
            ->toMatchArray([$this->type->id => $partner, $partner => $this->type->id]);
        expect(array_column($pool->json('questions.data'), 'id'))->not->toContain($hiddenQuestion);
    }

    $this->postJson(route('customer.qat.papers.store'), [
        ...$this->payload, 'selection_method' => 'manual',
        'manual_questions' => [['id' => $hiddenQuestion, 'marks' => 1]],
    ])->assertUnprocessable()->assertJsonValidationErrors('manual_questions');
});

test('automatic QAT OR groups share a template slot and reserve eligible questions for later variants', function () {
    [$story, $stories] = addQatTypeToChapter($this->chapterId, 'Story', 210, 2);
    $otherChapter = DB::table('qat_chapters')->where('qat_subject_id', $this->subjectId)->where('id', '!=', $this->chapterId)->value('id');
    [$application] = addQatTypeToChapter($otherChapter, 'Application', 220, 2);
    $group = ['type_ids' => [$this->type->id, $story, $application]];
    $update = route('superadmin.qat-question-types.update', $this->subjectId);
    $this->actingAs($this->admin)->putJson($update, [
        'hidden_type_ids' => [], 'or_pairs' => [['type_id' => $this->type->id, 'partner_id' => $story]],
        'random_or_groups' => [$group],
    ])->assertUnprocessable()->assertJsonValidationErrors('random_or_groups');
    $this->put($update, ['hidden_type_ids' => [], 'or_pairs' => [], 'random_or_groups' => [$group]])
        ->assertRedirect()->assertSessionHasNoErrors();

    DB::table('qat_chapter_months')->insert(['qat_chapter_id' => $this->chapterId, 'month' => 4]);
    $source = [
        ...$this->payload, 'mode' => 'auto', 'syllabus' => 'qat', 'months' => [4],
        'chapter_ids' => [], 'variants' => 2, 'allow_repeat' => false,
        'sections' => [...$this->sections, ['question_type_id' => $story, 'quantity' => 1, 'marks' => 4]],
    ];
    $this->actingAs($this->school)->postJson(route('customer.qat.questions'), [
        'subject_id' => $this->subjectId, 'syllabus' => 'qat', 'months' => [4],
    ])->assertOk()->assertJsonPath('random_or_groups', [$group])
        ->assertJsonCount(2, 'types');
    $preview = $this->postJson(route('customer.qat.papers.store'), $source)->assertCreated()->json('preview_url');
    $page = $this->get($preview)->assertOk()->viewData('page')['props'];
    expect($page['variants'])->toHaveCount(2);
    $used = [];
    foreach ($page['variants'] as $paper) {
        expect($paper['total_marks'])->toEqual(3)->and($paper['question_count'])->toBe(2);
        $section = $paper['paper_data']['sections'][0];
        expect($section['question_type_id'])->toBe($this->type->id)
            ->and($section['questions'][0])->not->toHaveKey('or_questions');
        $used = [...$used, ...array_column($section['questions'], 'id')];
    }
    expect($used)->toEqualCanonicalizing([...array_slice($this->questions, 0, 2), ...$stories]);
    $saved = $this->postJson(route('customer.qat.previews.save', basename($preview)))->assertCreated()->json('paper_ids');
    expect($saved)->toHaveCount(2);
    $reopened = $this->get(route('customer.qat.papers.show', $saved[0]))->assertOk()->viewData('page')['props']['paper'];
    expect(array_column($reopened['paper_data']['sections'][0]['questions'], 'id'))
        ->toBe(array_column($page['variants'][0]['paper_data']['sections'][0]['questions'], 'id'));
});

test('QAT OR groups can be edited independently and the random toggle changes automatic selection', function () {
    [$story] = addQatTypeToChapter($this->chapterId, 'Story', 230, 2);
    [$application] = addQatTypeToChapter($this->chapterId, 'Application', 240, 2);
    $scope = [
        'catalogue_id' => DB::table('qat_catalogues')->value('id'),
        'class_id' => $this->classId, 'subject_id' => $this->subjectId,
    ];
    DB::table('qat_subjects')->where('id', $this->subjectId)->update([
        'question_type_rules' => json_encode(['or_pairs' => [['type_id' => $this->type->id, 'partner_id' => $story]]]),
    ]);
    $index = route('superadmin.qat-question-types.index', $scope);
    $route = route('superadmin.qat-question-types.groups.update', $this->subjectId);
    $legacy = ['type_ids' => [$this->type->id, $story], 'random_pick' => false];
    $group = ['type_ids' => [$this->type->id, $story, $application], 'random_pick' => false];
    $delegate = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => $this->admin->id]);
    $this->actingAs($delegate)->putJson($route, ['or_groups' => [$group]])->assertForbidden();
    $this->actingAs($this->admin)->get($index)->assertOk()
        ->assertInertia(fn ($page) => $page->where('orGroups', [$legacy]));
    $this->put($route, ['or_groups' => [$group]])->assertRedirect()->assertSessionHasNoErrors();
    $this->put(route('superadmin.qat-question-types.update', $this->subjectId), [
        'hidden_type_ids' => [$application],
    ])->assertRedirect()->assertSessionHasNoErrors();
    $this->get($index)->assertOk()->assertInertia(fn ($page) => $page
        ->where('orGroups', [$group])->where('hiddenTypeIds', [$application]));

    DB::table('qat_chapter_months')->insert(['qat_chapter_id' => $this->chapterId, 'month' => 4]);
    $payload = [...$this->payload, 'mode' => 'auto', 'syllabus' => 'qat', 'months' => [4], 'chapter_ids' => []];
    $this->actingAs($this->school)->postJson(route('customer.qat.papers.store'), $payload)
        ->assertUnprocessable()->assertJsonValidationErrors('sections');

    $this->actingAs($this->admin)->put($route, ['or_groups' => [[...$group, 'random_pick' => true]]])
        ->assertRedirect()->assertSessionHasNoErrors();
    $this->get($index)->assertOk()->assertInertia(fn ($page) => $page
        ->where('orGroups.0.random_pick', true)->where('hiddenTypeIds', [$application]));
    $random = $this->actingAs($this->school)->postJson(route('customer.qat.papers.store'), $payload)->assertCreated()->json('preview_url');
    $this->get($random)->assertOk()->assertInertia(fn ($page) => $page->where('paper.total_marks', 3));

    $this->actingAs($this->admin)->put(route('superadmin.qat-question-types.update', $this->subjectId), [
        'hidden_type_ids' => [],
    ])->assertRedirect()->assertSessionHasNoErrors();
    $this->put($route, ['or_groups' => [$group]])->assertRedirect()->assertSessionHasNoErrors();
    $fixed = $this->actingAs($this->school)->postJson(route('customer.qat.papers.store'), $payload)->assertCreated()->json('preview_url');
    $this->get($fixed)->assertOk()->assertInertia(fn ($page) => $page
        ->where('paper.question_count', 2)->where('paper.total_marks', 3)
        ->where('paper.paper_data.sections.0.questions.0.or_questions.0.question_type_id', $story)
        ->where('paper.paper_data.sections.0.questions.0.or_questions.1.question_type_id', $application));
});

test('matching automatic templates stay PEF and use the OR choices shown for each variant', function () {
    [$story] = addQatTypeToChapter($this->chapterId, 'Story', 260, 2);
    [$application] = addQatTypeToChapter($this->chapterId, 'Application', 270, 2);
    $this->actingAs($this->admin)->put(route('superadmin.qat-question-types.groups.update', $this->subjectId), [
        'or_groups' => [['type_ids' => [$this->type->id, $story, $application], 'random_pick' => true]],
    ])->assertRedirect()->assertSessionHasNoErrors();
    DB::table('qat_chapter_months')->insert(['qat_chapter_id' => $this->chapterId, 'month' => 4]);
    $choices = [
        'question_type_id' => $this->type->id,
        'variants' => [[$story], [$this->type->id, $application]],
    ];
    $payload = [
        ...$this->payload, 'mode' => 'auto', 'syllabus' => 'qat', 'months' => [4],
        'chapter_ids' => [], 'variants' => 2, 'auto_or_choices' => [$choices],
    ];

    $this->actingAs($this->school)->postJson(route('customer.qat.papers.store'), [
        ...$payload, 'auto_or_choices' => [[...$choices, 'variants' => [[$story], [999999]]]],
    ])->assertUnprocessable()->assertJsonValidationErrors('auto_or_choices');
    $this->postJson(route('customer.qat.papers.store'), [
        ...$payload, 'auto_or_choices' => [[...$choices, 'variants' => [[$story], [$story]]]],
    ])->assertUnprocessable()->assertJsonValidationErrors('sections');
    $preview = $this->postJson(route('customer.qat.papers.store'), $payload)->assertCreated()->json('preview_url');
    $this->get($preview)->assertOk()->assertInertia(fn ($page) => $page
        ->where('variants.0.paper_data.is_pef_pattern', true)
        ->where('variants.0.paper_data.sections.0.questions.0.question_type_id', $story)
        ->missing('variants.0.paper_data.sections.0.questions.0.or_questions')
        ->where('variants.1.paper_data.is_pef_pattern', true)
        ->where('variants.1.paper_data.sections.0.questions.0.or_questions.0.question_type_id', $application)
        ->where('paper.paper_data.generation_settings.auto_or_choices', [$choices]));

    $edited = $this->postJson(route('customer.qat.papers.store'), [...$payload, 'minutes' => 45])
        ->assertCreated()->json('preview_url');
    $this->get($edited)->assertOk()->assertInertia(fn ($page) => $page->where('paper.paper_data.is_pef_pattern', false));
});

test('QAT OR pairs generate one numbered choice and count marks once in each mode', function (string $journey) {
    [$partner, $alternatives] = addQatTypeToChapter($this->chapterId, 'Translation', 20, 2);
    $pair = ['type_id' => $this->type->id, 'partner_id' => $partner];
    $this->actingAs($this->admin)->put(route('superadmin.qat-question-types.update', $this->subjectId), [
        'hidden_type_ids' => [], 'or_pairs' => [$pair],
    ])->assertRedirect()->assertSessionHasNoErrors();

    $payload = $this->payload;
    $payload['or_pairs'] = [$pair];
    if ($journey === 'auto') {
        DB::table('qat_chapter_months')->insert(['qat_chapter_id' => $this->chapterId, 'month' => 4]);
        $payload = [...$payload, 'mode' => 'auto', 'syllabus' => 'qat', 'months' => [4], 'chapter_ids' => []];
    } else {
        foreach ($alternatives as $id) {
            $payload['manual_questions'][] = ['id' => $id, 'marks' => 3];
        }
    }
    if ($journey === 'manual') {
        $payload['selection_method'] = 'manual';
        $payload['sections'] = [];
        $invalid = $payload;
        $invalid['manual_questions'][2]['marks'] = 4;
        $this->actingAs($this->school)->postJson(route('customer.qat.papers.store'), $invalid)
            ->assertUnprocessable()->assertJsonValidationErrors('or_pairs');
    }

    $response = $this->actingAs($this->school)->postJson(route('customer.qat.papers.store'), $payload)->assertCreated();
    $preview = basename($response->json('preview_url'));
    $this->get($response->json('preview_url'))->assertOk()->assertInertia(fn ($page) => $page
        ->where('paper.total_marks', $journey === 'manual' ? 6 : 3)
        ->where('paper.question_count', 2)->has('paper.paper_data.sections', 1)
        ->where('paper.paper_data.sections.0.questions.0.or_question.question_type_id', $partner)
        ->where('paper.paper_data.sections.0.questions.1.or_question.marks', 3)
        ->where('paper.paper_data.is_pef_pattern', $journey === 'auto'));
    $saved = $this->postJson(route('customer.qat.previews.save', $preview))->assertCreated()->json('paper_id');
    $this->get(route('customer.qat.create', ['mode' => $payload['mode'], 'paper' => $saved]))->assertOk()
        ->assertInertia(fn ($page) => $page->where('initialSelections.or_pairs', [$pair]));
})->with(['manual', 'template', 'auto']);

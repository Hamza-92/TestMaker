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

test('past QAT papers filter selection and generation in each journey and restore the setting', function (string $journey) {
    DB::table('qat_questions')->whereIn('id', [$this->questions[0], $this->questions[1], $this->questions[2]])
        ->update(['is_past_qat_paper' => true]);
    $unmarked = DB::table('qat_questions')->insertGetId([
        'qat_chapter_id' => $this->chapterId, 'source_question_id' => 50,
        'question_type_id' => $this->type->id, 'status' => true,
        'question_data' => json_encode(['statement_en' => 'An unmarked question']),
    ]);
    [$partner, $alternatives] = addQatTypeToChapter($this->chapterId, 'Past paper alternative', 60, 2);
    $pair = ['type_id' => $this->type->id, 'partner_id' => $partner];
    DB::table('qat_subjects')->where('id', $this->subjectId)->update([
        'question_type_rules' => json_encode(['or_pairs' => [$pair]]),
    ]);
    DB::table('qat_questions')->whereIn('id', $alternatives)->update(['is_past_qat_paper' => true]);
    DB::table('qat_chapter_months')->insert([
        ['qat_chapter_id' => $this->chapterId, 'month' => 4],
        ['qat_chapter_id' => $this->chapterId, 'month' => 5],
    ]);
    // A monthly content override must keep using the question's shared flag.
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
    expect(array_column($pool->json('questions.data'), 'id'))->not->toContain($unmarked, $this->questions[2]);
    $this->postJson(route('customer.qat.questions'), [...$scope, 'past_paper' => false])
        ->assertOk()->assertJsonCount(5, 'questions.data');
    $this->postJson(route('customer.qat.questions'), [...$scope, 'past_paper' => true, 'include_questions' => false])
        ->assertOk()->assertJsonCount(0, 'questions.data')->assertJsonPath('types.0.total', 2);

    if ($journey !== 'auto') {
        $invalid = $payload;
        $invalid['manual_questions'][0]['id'] = $unmarked;
        $this->postJson(route('customer.qat.papers.store'), $invalid)
            ->assertUnprocessable()->assertJsonValidationErrors('manual_questions');
    }
    $response = $this->postJson(route('customer.qat.papers.store'), $payload)->assertCreated();
    $preview = basename($response->json('preview_url'));
    $this->get($response->json('preview_url'))->assertOk()->assertInertia(fn ($page) => $page
        ->where('paper.paper_data.generation_settings.past_paper', true)
        ->has('paper.paper_data.sections.0.questions', 2)
        ->where('paper.paper_data.sections.0.questions.0.or_question.question_type_id', $partner));
    $saved = $this->postJson(route('customer.qat.previews.save', $preview))->assertCreated()->json('paper_id');
    $this->get(route('customer.qat.create', ['mode' => $payload['mode'], 'paper' => $saved]))->assertOk()
        ->assertInertia(fn ($page) => $page->where('initialSelections.past_paper', true));
    DB::table('qat_questions')->where('id', $this->questions[1])->update(['is_past_qat_paper' => false]);
    $this->postJson(route('customer.qat.papers.store'), $payload)->assertUnprocessable();
})->with(['manual', 'template', 'auto']);

test('manual templates preserve custom chapters choices required counts and restore the journey', function () {
    $response = $this->actingAs($this->school)->postJson(route('customer.qat.papers.store'), $this->payload)->assertCreated();
    $preview = basename($response->json('preview_url'));
    expect(QatPaper::count())->toBe(0);
    $this->get($response->json('preview_url'))->assertOk()->assertInertia(fn ($page) => $page
        ->where('paper.mode', 'manual')->where('paper.paper_data.syllabus', 'custom')
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
        ->where('paper.paper_data.is_pef_pattern', false));
    $saved = $this->postJson(route('customer.qat.previews.save', $preview))->assertCreated()->json('paper_id');
    $this->get(route('customer.qat.create', ['mode' => $payload['mode'], 'paper' => $saved]))->assertOk()
        ->assertInertia(fn ($page) => $page->where('initialSelections.or_pairs', [$pair]));
})->with(['manual', 'template', 'auto']);

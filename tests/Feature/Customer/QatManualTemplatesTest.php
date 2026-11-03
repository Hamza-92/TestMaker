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
    $this->school = User::factory()->create(['user_type' => UserType::Customer->value, 'account_type' => 'paid']);
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value, 'created_by' => null]);
    Subscription::create([
        'user_id' => $this->school->id, 'name' => 'QAT', 'amount' => 1000, 'started_at' => now()->subDay(),
        'duration' => 30, 'expired_at' => now()->addDays(29), 'status' => 'active',
        'created_by' => $admin->id, 'access_scope' => [], 'allow_qat_tests' => true,
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

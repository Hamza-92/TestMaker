<?php

use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\Medium;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\QuestionTypeHeading;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Topic;
use App\Models\User;
use App\Support\Questions\QuestionTypeSchemaRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

uses(RefreshDatabase::class);

function makeImportSuperAdmin(): User
{
    return User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
    ]);
}

function makeImportQuestionType(User $creator, array $overrides = []): QuestionType
{
    $uuid = Str::lower((string) Str::uuid());

    return QuestionType::create(array_merge([
        'name' => "Question Type {$uuid}",
        'name_ur' => null,
        'heading_en' => "Heading {$uuid}",
        'heading_ur' => null,
        'description_en' => null,
        'description_ur' => null,
        'have_exercise' => false,
        'have_statement' => true,
        'statement_label' => 'Statement',
        'have_description' => false,
        'description_label' => null,
        'have_answer' => true,
        'is_single' => true,
        'is_objective' => false,
        'objective_type_id' => null,
        'column_per_row' => 1,
        'status' => 1,
        'created_by' => $creator->id,
    ], $overrides));
}

function makeImportContext(User $creator, string $subjectType = 'chapter-wise'): array
{
    $suffix = Str::lower((string) Str::uuid());

    $pattern = Pattern::create([
        'name' => "Pattern {$suffix}",
        'short_name' => strtoupper(Str::random(5)),
        'status' => 1,
        'created_by' => $creator->id,
    ]);

    $class = SchoolClass::create([
        'name' => "Class {$suffix}",
        'status' => 1,
        'created_by' => $creator->id,
    ]);

    $subject = Subject::create([
        'name_eng' => "Subject {$suffix}",
        'name_ur' => null,
        'subject_type' => $subjectType,
        'status' => 1,
        'created_by' => $creator->id,
    ]);

    $chapter = Chapter::create([
        'subject_id' => $subject->id,
        'class_id' => $class->id,
        'pattern_id' => $pattern->id,
        'name' => "Chapter {$suffix}",
        'name_ur' => null,
        'chapter_number' => 1,
        'sort_id' => 1,
        'status' => 1,
        'created_by' => $creator->id,
    ]);

    $topic = null;

    if ($subjectType === 'topic-wise') {
        $topic = Topic::create([
            'chapter_id' => $chapter->id,
            'name' => "Topic {$suffix}",
            'name_ur' => null,
            'sort_id' => 1,
            'status' => 1,
            'created_by' => $creator->id,
        ]);
    }

    return compact('pattern', 'class', 'subject', 'chapter', 'topic');
}

it('requires a preview before importing questions', function () {
    $admin = makeImportSuperAdmin();
    $questionType = makeImportQuestionType($admin, [
        'name' => 'Short Questions',
        'heading_en' => 'Short Questions',
    ]);
    $context = makeImportContext($admin);

    $csv = implode("\n", [
        'statement_en,answer_en,source,status',
        '"What is force?","A push or pull.",exercise,active',
        '"What is energy?","Ability to do work.",additional,1',
    ]);

    $response = $this
        ->actingAs($admin)
        ->post(route('superadmin.questions.import.store'), [
            'question_type_id' => $questionType->id,
            'chapter_id' => $context['chapter']->id,
            'topic_id' => null,
            'source' => '',
            'status' => true,
            'file' => UploadedFile::fake()->createWithContent('questions.csv', $csv),
        ]);

    $response->assertSessionHasErrors(['preview_token', 'selected_row_numbers']);
    expect(Question::query()->count())->toBe(0);
});

it('previews questions before import', function () {
    $admin = makeImportSuperAdmin();
    $questionType = makeImportQuestionType($admin, [
        'name' => 'Short Questions',
        'heading_en' => 'Short Questions',
    ]);
    $context = makeImportContext($admin);

    $csv = implode("\n", [
        'statement_en,answer_en',
        '"What is heat?","A form of energy."',
        '"What is motion?","Change in position."',
    ]);

    $response = $this
        ->actingAs($admin)
        ->post(route('superadmin.questions.import.preview'), [
            'question_type_id' => $questionType->id,
            'chapter_id' => $context['chapter']->id,
            'topic_id' => null,
            'source' => '',
            'status' => true,
            'file' => UploadedFile::fake()->createWithContent('preview.csv', $csv),
        ]);

    $response->assertRedirect(route('superadmin.questions.import', [
        'question_type_id' => (string) $questionType->id,
        'chapter_id' => (string) $context['chapter']->id,
        'status' => '1',
    ]));
    $response->assertSessionHas('question_import_preview.status', 'success');
    $response->assertSessionHas('question_import_preview.ready_rows', 2);
    $response->assertSessionHas('question_import_preview.rows.0.row_number', 2);
    $response->assertSessionHas('question_import_preview_token');

    expect(Question::query()->count())->toBe(0);
});

it('imports a previewed file without re-uploading it', function () {
    $admin = makeImportSuperAdmin();
    $questionType = makeImportQuestionType($admin, [
        'name' => 'Short Questions',
        'heading_en' => 'Short Questions',
    ]);
    $context = makeImportContext($admin);

    $csv = implode("\n", [
        'statement_en,answer_en',
        '"What is light?","A form of energy."',
        '"What is sound?","A vibration."',
    ]);

    $this
        ->actingAs($admin)
        ->post(route('superadmin.questions.import.preview'), [
            'question_type_id' => $questionType->id,
            'chapter_id' => $context['chapter']->id,
            'topic_id' => null,
            'source' => '',
            'status' => true,
            'file' => UploadedFile::fake()->createWithContent('confirm.csv', $csv),
        ])
        ->assertRedirect();

    $previewToken = session('question_import_preview_token');

    $response = $this
        ->actingAs($admin)
        ->post(route('superadmin.questions.import.store'), [
            'question_type_id' => $questionType->id,
            'chapter_id' => $context['chapter']->id,
            'topic_id' => null,
            'source' => '',
            'status' => true,
            'preview_token' => $previewToken,
            'selected_row_numbers' => [2, 3],
        ]);

    $response->assertRedirect(route('superadmin.questions.import', [
        'question_type_id' => (string) $questionType->id,
        'chapter_id' => (string) $context['chapter']->id,
        'status' => '1',
    ]));
    $response->assertSessionHas('question_import_report.status', 'success');
    $response->assertSessionHas('question_import_report.imported_rows', 2);

    expect(Question::query()->count())->toBe(2);
});

it('imports objective questions with options', function () {
    $admin = makeImportSuperAdmin();
    $questionType = makeImportQuestionType($admin, [
        'name' => 'MCQs',
        'heading_en' => 'MCQs',
        'have_answer' => false,
        'is_objective' => true,
        'is_single' => true,
    ]);
    $context = makeImportContext($admin);

    $csv = implode("\n", [
        'statement_en,option_1_en,option_1_correct,option_2_en,option_2_correct,option_3_en,option_3_correct',
        '"Choose the correct answer","Option A",yes,"Option B",no,"Option C",no',
    ]);

    $response = $this
        ->actingAs($admin)
        ->post(route('superadmin.questions.import.preview'), [
            'question_type_id' => $questionType->id,
            'chapter_id' => $context['chapter']->id,
            'topic_id' => null,
            'source' => '',
            'status' => true,
            'file' => UploadedFile::fake()->createWithContent('objective-success.csv', $csv),
        ]);

    $response->assertRedirect(route('superadmin.questions.import', [
        'question_type_id' => (string) $questionType->id,
        'chapter_id' => (string) $context['chapter']->id,
        'status' => '1',
    ]));
    $response->assertSessionHas('question_import_preview.status', 'success');
    $this->actingAs($admin)->post(route('superadmin.questions.import.store'), [
        'question_type_id' => $questionType->id,
        'chapter_id' => $context['chapter']->id,
        'status' => true,
        'preview_token' => session('question_import_preview_token'),
        'selected_row_numbers' => [2],
    ])->assertSessionHas('question_import_report.imported_rows', 1);

    $question = Question::query()->with('options')->sole();

    expect($question->statement_en)->toBe('Choose the correct answer')
        ->and($question->answer_en)->toBeNull()
        ->and($question->options)->toHaveCount(4)
        ->and($question->options->where('is_correct', true))->toHaveCount(1)
        ->and($question->options->firstWhere('is_correct', true)?->text_en)->toBe('Option A')
        ->and($question->options->last()?->text_en)->toBeNull();
});

it('fails objective import when a single-answer row has multiple correct options', function () {
    $admin = makeImportSuperAdmin();
    $questionType = makeImportQuestionType($admin, [
        'name' => 'MCQs',
        'heading_en' => 'MCQs',
        'have_answer' => false,
        'is_objective' => true,
        'is_single' => true,
    ]);
    $context = makeImportContext($admin);

    $csv = implode("\n", [
        'statement_en,option_1_en,option_1_correct,option_2_en,option_2_correct',
        '"Choose the correct answer","Option A",yes,"Option B",yes',
    ]);

    $response = $this
        ->actingAs($admin)
        ->post(route('superadmin.questions.import.preview'), [
            'question_type_id' => $questionType->id,
            'chapter_id' => $context['chapter']->id,
            'topic_id' => null,
            'source' => 'exercise',
            'status' => true,
            'file' => UploadedFile::fake()->createWithContent('objective.csv', $csv),
        ]);

    $response->assertRedirect(route('superadmin.questions.import', [
        'question_type_id' => (string) $questionType->id,
        'chapter_id' => (string) $context['chapter']->id,
        'source' => 'exercise',
        'status' => '1',
    ]));
    $response->assertSessionHas('question_import_preview.status', 'error');
    $response->assertSessionHas('question_import_preview.failed_rows', 1);

    expect(Question::query()->count())->toBe(0);
});

it('imports only selected valid rows and reports skipped and duplicate rows', function () {
    $admin = makeImportSuperAdmin();
    $questionType = makeImportQuestionType($admin);
    $chapter = makeImportContext($admin)['chapter'];
    $csv = implode("\n", [
        'statement_en,answer_en',
        '"First question","First answer"',
        '"Second question","Second answer"',
        '"First question","First answer"',
        ',"Answer without question"',
    ]);

    $this->actingAs($admin)->post(route('superadmin.questions.import.preview'), [
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'status' => true,
        'file' => UploadedFile::fake()->createWithContent('selection.csv', $csv),
    ])->assertSessionHas('question_import_preview.ready_rows', 2)
        ->assertSessionHas('question_import_preview.failed_rows', 2)
        ->assertSessionHas('question_import_preview.duplicate_rows', 1);

    $token = session('question_import_preview_token');

    $this->actingAs($admin)->post(route('superadmin.questions.import.store'), [
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'status' => true,
        'preview_token' => $token,
        'selected_row_numbers' => [3],
    ])->assertSessionHas('question_import_report.imported_rows', 1)
        ->assertSessionHas('question_import_report.failed_rows', 1)
        ->assertSessionHas('question_import_report.unselected_rows', 1)
        ->assertSessionHas('question_import_report.duplicate_rows', 1);

    expect(Question::query()->sole()->statement_en)->toBe('Second question');

    $this->actingAs($admin)->post(route('superadmin.questions.import.store'), [
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'status' => true,
        'preview_token' => $token,
        'selected_row_numbers' => [2],
    ])->assertSessionHas('question_import_report.status', 'error');

    expect(Question::query()->count())->toBe(1);
});

it('rejects selection of an invalid preview row', function () {
    $admin = makeImportSuperAdmin();
    $questionType = makeImportQuestionType($admin);
    $chapter = makeImportContext($admin)['chapter'];

    $this->actingAs($admin)->post(route('superadmin.questions.import.preview'), [
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'status' => true,
        'file' => UploadedFile::fake()->createWithContent('invalid.csv', "statement_en,answer_en\nValid,Answer\n,Answer"),
    ])->assertSessionHas('question_import_preview.ready_rows', 1);

    $this->actingAs($admin)->post(route('superadmin.questions.import.store'), [
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'status' => true,
        'preview_token' => session('question_import_preview_token'),
        'selected_row_numbers' => [3],
    ])->assertSessionHas('question_import_report.status', 'error');

    expect(Question::query()->count())->toBe(0);
});

it('paginates every previewed row and keeps the template content-only', function () {
    $admin = makeImportSuperAdmin();
    $questionType = makeImportQuestionType($admin);
    $chapter = makeImportContext($admin)['chapter'];
    $rows = ['statement_en,answer_en'];

    foreach (range(1, 27) as $number) {
        $rows[] = "Question {$number},Answer {$number}";
    }

    $this->actingAs($admin)->post(route('superadmin.questions.import.preview'), [
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'status' => true,
        'file' => UploadedFile::fake()->createWithContent('many.csv', implode("\n", $rows)),
    ])->assertSessionHas('question_import_preview.total_rows', 27)
        ->assertSessionHas('question_import_preview.rows', fn ($value) => count($value) === 25);

    $this->actingAs($admin)->getJson(route('superadmin.questions.import.preview-rows', [
        'preview_token' => session('question_import_preview_token'),
        'page' => 2,
    ]))->assertOk()->assertJsonCount(2, 'rows')->assertJsonPath('rows.0.row_number', 27);

    $this->actingAs($admin)->get(route('superadmin.questions.import.template', [
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'format' => 'csv',
    ]))->assertOk()->assertDownload('question-import-template.csv');
});

it('previews Excel files and rejects another users preview token', function () {
    $admin = makeImportSuperAdmin();
    $otherAdmin = makeImportSuperAdmin();
    $questionType = makeImportQuestionType($admin);
    $chapter = makeImportContext($admin)['chapter'];
    $spreadsheet = new Spreadsheet;
    $spreadsheet->getActiveSheet()->fromArray([
        ['statement_en', 'answer_en'],
        ['Excel question', 'Excel answer'],
    ]);
    $path = tempnam(sys_get_temp_dir(), 'question-import-');
    (new Xlsx($spreadsheet))->save($path);
    $contents = file_get_contents($path);
    unlink($path);
    $spreadsheet->disconnectWorksheets();

    $this->actingAs($admin)->post(route('superadmin.questions.import.preview'), [
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'status' => true,
        'file' => UploadedFile::fake()->createWithContent('questions.xlsx', $contents),
    ])->assertSessionHas('question_import_preview.ready_rows', 1);

    $token = session('question_import_preview_token');

    $this->actingAs($otherAdmin)->getJson(route('superadmin.questions.import.preview-rows', [
        'preview_token' => $token,
        'page' => 1,
    ]))->assertNotFound();

    $this->actingAs($admin)->get(route('superadmin.questions.import.template', [
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'format' => 'xlsx',
    ]))->assertOk()->assertDownload('question-import-template.xlsx');
});

it('marks an already imported question as a duplicate on the next preview', function () {
    $admin = makeImportSuperAdmin();
    $questionType = makeImportQuestionType($admin);
    $chapter = makeImportContext($admin)['chapter'];
    $data = [
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'status' => true,
    ];
    $file = UploadedFile::fake()->createWithContent('repeat.csv', "statement_en,answer_en\nRepeated question,Repeated answer");

    $this->actingAs($admin)->post(route('superadmin.questions.import.preview'), [
        ...$data,
        'file' => $file,
    ])->assertSessionHas('question_import_preview.ready_rows', 1);

    $this->actingAs($admin)->post(route('superadmin.questions.import.store'), [
        ...$data,
        'preview_token' => session('question_import_preview_token'),
        'selected_row_numbers' => [2],
    ])->assertSessionHas('question_import_report.imported_rows', 1);

    $this->actingAs($admin)->post(route('superadmin.questions.import.preview'), [
        ...$data,
        'file' => UploadedFile::fake()->createWithContent('repeat.csv', "statement_en,answer_en\nRepeated question,Repeated answer"),
    ])->assertSessionHas('question_import_preview.ready_rows', 0)
        ->assertSessionHas('question_import_preview.duplicate_rows', 1);
});

it('detects existing option-only questions without a statement', function () {
    $admin = makeImportSuperAdmin();
    $questionType = makeImportQuestionType($admin, [
        'name' => 'Option-only MCQs',
        'heading_en' => 'Option-only MCQs',
        'have_statement' => false,
        'have_answer' => false,
        'is_objective' => true,
        'options_only' => true,
    ]);
    $chapter = makeImportContext($admin)['chapter'];
    $data = [
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'status' => true,
    ];
    $csv = "option_1_en,option_1_correct,option_2_en,option_2_correct\nFirst choice,yes,Second choice,no";

    $this->actingAs($admin)->post(route('superadmin.questions.import.preview'), [
        ...$data,
        'file' => UploadedFile::fake()->createWithContent('options.csv', $csv),
    ])->assertSessionHas('question_import_preview.ready_rows', 1);

    $this->actingAs($admin)->post(route('superadmin.questions.import.store'), [
        ...$data,
        'preview_token' => session('question_import_preview_token'),
        'selected_row_numbers' => [2],
    ])->assertSessionHas('question_import_report.imported_rows', 1);

    $this->actingAs($admin)->post(route('superadmin.questions.import.preview'), [
        ...$data,
        'file' => UploadedFile::fake()->createWithContent('options.csv', $csv),
    ])->assertSessionHas('question_import_preview.ready_rows', 0)
        ->assertSessionHas('question_import_preview.duplicate_rows', 1);
});

it('uses the chapter scoped schema for templates and preview validation', function () {
    $admin = makeImportSuperAdmin();
    $questionType = makeImportQuestionType($admin, [
        'schema_key' => QuestionTypeSchemaRegistry::SUBJECTIVE_STANDARD,
        'have_description' => false,
    ]);
    $chapter = makeImportContext($admin)['chapter'];

    QuestionTypeHeading::create([
        'question_type_id' => $questionType->id,
        'pattern_id' => $chapter->pattern_id,
        'class_id' => $chapter->class_id,
        'subject_id' => $chapter->subject_id,
        'scope_key' => QuestionTypeHeading::scopeKey(
            $chapter->pattern_id,
            $chapter->class_id,
            $chapter->subject_id,
        ),
        'heading_en' => 'Shared Statement Questions',
        'schema_key' => QuestionTypeSchemaRegistry::SUBJECTIVE_SAME_STATEMENT,
    ]);

    $response = $this->actingAs($admin)->get(route('superadmin.questions.import.template', [
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'format' => 'csv',
    ]));
    $response->assertOk()->assertDownload('question-import-template.csv');
    expect($response->streamedContent())->toContain('description_en');

    $this->actingAs($admin)->post(route('superadmin.questions.import.preview'), [
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'status' => true,
        'file' => UploadedFile::fake()->createWithContent(
            'scoped.csv',
            "statement_en,description_en,answer_en\nQuestion,Shared statement,Answer",
        ),
    ])->assertSessionHas('question_import_preview.ready_rows', 1);
});

it('takes source status and medium from the form instead of spreadsheet columns', function () {
    $admin = makeImportSuperAdmin();
    $questionType = makeImportQuestionType($admin);
    $chapter = makeImportContext($admin)['chapter'];
    $medium = Medium::query()->create(['name' => 'English']);
    $data = [
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'source' => 'exercise',
        'status' => false,
        'medium_id' => $medium->id,
    ];

    $this->actingAs($admin)->post(route('superadmin.questions.import.preview'), [
        ...$data,
        'file' => UploadedFile::fake()->createWithContent(
            'metadata.csv',
            "statement_en,answer_en,source\nQuestion,Answer,additional",
        ),
    ])->assertSessionHas('question_import_preview.status', 'error')
        ->assertSessionHas('question_import_preview.total_rows', 0);

    $this->actingAs($admin)->post(route('superadmin.questions.import.preview'), [
        ...$data,
        'file' => UploadedFile::fake()->createWithContent(
            'content.csv',
            "statement_en,answer_en\nQuestion,Answer",
        ),
    ])->assertSessionHas('question_import_preview.ready_rows', 1);

    $this->actingAs($admin)->post(route('superadmin.questions.import.store'), [
        ...$data,
        'preview_token' => session('question_import_preview_token'),
        'selected_row_numbers' => [2],
    ])->assertSessionHas('question_import_report.imported_rows', 1);

    $question = Question::query()->sole();
    expect($question->source)->toBe('exercise')
        ->and($question->status)->toBe(0)
        ->and($question->medium_id)->toBe($medium->id);
});

<?php

use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

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

it('imports subjective questions from csv', function () {
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

    $response->assertRedirect(route('superadmin.questions.import', [
        'question_type_id' => (string) $questionType->id,
        'chapter_id' => (string) $context['chapter']->id,
        'status' => '1',
    ]));
    $response->assertSessionHas('question_import_report.status', 'success');

    expect(Question::query()->count())->toBe(2)
        ->and(Question::query()->where('chapter_id', $context['chapter']->id)->count())->toBe(2)
        ->and(Question::query()->where('source', 'exercise')->exists())->toBeTrue()
        ->and(Question::query()->where('source', 'additional')->exists())->toBeTrue();
});

it('previews questions before import', function () {
    $admin = makeImportSuperAdmin();
    $questionType = makeImportQuestionType($admin, [
        'name' => 'Short Questions',
        'heading_en' => 'Short Questions',
    ]);
    $context = makeImportContext($admin);

    $csv = implode("\n", [
        'statement_en,answer_en,source,status',
        '"What is heat?","A form of energy.",exercise,active',
        '"What is motion?","Change in position.",additional,1',
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
        'statement_en,answer_en,source,status',
        '"What is light?","A form of energy.",exercise,active',
        '"What is sound?","A vibration.",additional,1',
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
        ]);

    $response->assertRedirect(route('superadmin.questions.import', [
        'question_type_id' => (string) $questionType->id,
        'chapter_id' => (string) $context['chapter']->id,
        'status' => '1',
    ]));
    $response->assertSessionHas('question_import_report.status', 'success');
    $response->assertSessionHas('question_import_report.imported_rows', 2);

    expect(Question::query()->count())->toBe(2)
        ->and(Question::query()->where('source', 'exercise')->exists())->toBeTrue()
        ->and(Question::query()->where('source', 'additional')->exists())->toBeTrue();
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
        'statement_en,source,status,option_1_en,option_1_correct,option_2_en,option_2_correct,option_3_en,option_3_correct',
        '"Choose the correct answer",exercise,active,"Option A",yes,"Option B",no,"Option C",no',
    ]);

    $response = $this
        ->actingAs($admin)
        ->post(route('superadmin.questions.import.store'), [
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
    $response->assertSessionHas('question_import_report.status', 'success');
    $response->assertSessionHas('question_import_report.imported_rows', 1);

    $question = Question::query()->with('options')->sole();

    expect($question->statement_en)->toBe('Choose the correct answer')
        ->and($question->answer_en)->toBeNull()
        ->and($question->options)->toHaveCount(3)
        ->and($question->options->where('is_correct', true))->toHaveCount(1)
        ->and($question->options->firstWhere('is_correct', true)?->text_en)->toBe('Option A');
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
        ->post(route('superadmin.questions.import.store'), [
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
    $response->assertSessionHas('question_import_report.status', 'error');
    $response->assertSessionHas('question_import_report.failed_rows', 1);

    expect(Question::query()->count())->toBe(0);
});

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
use App\Support\LegacyTransfer\LegacyExportService;
use Database\Seeders\PermissionSeeder;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    config()->set('database.connections.legacy_mysql', [
        'driver' => 'sqlite',
        'database' => ':memory:',
        'prefix' => '',
        'foreign_key_constraints' => false,
    ]);
    DB::purge('legacy_mysql');
    $schema = Schema::connection('legacy_mysql');
    $schema->create('pk_class', function (Blueprint $table): void {
        $table->increments('id');
        $table->string('name');
        $table->integer('id_order')->default(0);
    });
    $schema->create('pk_subject', function (Blueprint $table): void {
        $table->increments('id');
        $table->string('name');
        $table->integer('afaq')->default(0);
    });
    $schema->create('pk_chapter', function (Blueprint $table): void {
        $table->increments('id');
        $table->integer('class_id');
        $table->integer('subject_id');
        $table->integer('afaq');
        $table->string('name');
        $table->string('u_name');
        $table->integer('chapter_number');
        $table->string('chapter_type');
        $table->integer('sort_int');
        $table->integer('status');
        $table->integer('status_pef');
    });
    $schema->create('pk_topics', function (Blueprint $table): void {
        $table->increments('id');
        $table->integer('chapter_id');
        $table->integer('class_id');
        $table->string('name');
        $table->string('u_name');
        $table->integer('status');
        $table->integer('afaq');
        $table->integer('sort_int');
    });
    $schema->create('pk_question_types', function (Blueprint $table): void {
        $table->increments('id');
        $table->integer('id_order');
        $table->string('type_name');
        $table->string('type_name_ur');
        $table->integer('type');
        $table->string('heading_en');
        $table->string('heading_ur');
        $table->integer('have_exercise');
        $table->integer('have_statment');
        $table->string('statement_label');
        $table->integer('have_description');
        $table->string('description_label');
        $table->integer('have_answer');
        $table->integer('is_single');
        $table->integer('is_objective');
        $table->integer('objective_type_id');
        $table->integer('column_per_row');
    });
    $schema->create('pk_question', function (Blueprint $table): void {
        $table->increments('id');
        $table->integer('chapter_id');
        $table->integer('topic_id');
        $table->string('exercise');
        $table->integer('medium');
        $table->string('type_id');
        $table->integer('exercise_question');
        $table->integer('past_paper_questions');
        $table->integer('afaq');
        $table->integer('status');
        $table->integer('status_pef');
        $table->integer('is_table');
        $table->text('statement_en');
        $table->text('statement_ur');
        $table->text('description_en');
        $table->text('description_ur');
        $table->text('answer_en')->nullable();
        $table->text('answer_ur')->nullable();
        $table->text('paragraph_questions')->nullable();
    });
    $schema->create('pk_options', function (Blueprint $table): void {
        $table->increments('id');
        $table->integer('question_id');
        $table->string('option_en');
        $table->string('option_ur');
        $table->string('option_im')->nullable();
        $table->string('answer_en')->nullable();
        $table->string('answer_ur')->nullable();
        $table->string('answer_im')->nullable();
        $table->integer('is_correct');
    });
    DB::connection('legacy_mysql')->table('pk_class')->insert(['id' => 5, 'name' => '9th', 'id_order' => 1]);
    DB::connection('legacy_mysql')->table('pk_subject')->insert(['id' => 7, 'name' => 'Mathematics', 'afaq' => 4]);
    DB::connection('legacy_mysql')->table('pk_chapter')->insert([
        'id' => 1, 'class_id' => 5, 'subject_id' => 7, 'afaq' => 4,
        'name' => 'Existing chapter', 'u_name' => '', 'chapter_number' => 99,
        'chapter_type' => '', 'sort_int' => 99, 'status' => 1, 'status_pef' => 1,
    ]);
});

function legacyExportContext(): array
{
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    $pattern = Pattern::create(['name' => 'Federal test', 'short_name' => 'FED-T', 'status' => 1, 'created_by' => $admin->id]);
    $class = SchoolClass::create(['name' => '9th', 'status' => 1, 'created_by' => $admin->id]);
    $subject = Subject::create(['name_eng' => 'Mathematics', 'subject_type' => 'chapter-wise', 'status' => 1, 'created_by' => $admin->id]);
    DB::table('pattern_classes')->insert(['pattern_id' => $pattern->id, 'class_id' => $class->id]);
    DB::table('class_subjects')->insert(['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id]);
    $chapter = Chapter::create(['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id, 'name' => 'Algebra', 'chapter_number' => 1, 'sort_id' => 1, 'status' => 1]);
    $type = QuestionType::create(['name' => 'Short question', 'heading_en' => 'Short questions', 'is_objective' => false, 'schema_key' => 'subjective_standard', 'status' => 1]);
    $question = Question::create(['chapter_id' => $chapter->id, 'question_type_id' => $type->id, 'schema_key' => 'subjective_standard', 'statement_en' => 'Find x.', 'content' => ['prompt_en' => 'Find x.', 'prompt_ur' => '', 'guidance_en' => '', 'guidance_ur' => '', 'answer_en' => 'x = 2', 'answer_ur' => ''], 'source' => 'exercise', 'status' => 1]);

    return [$admin, $pattern, $class, $subject, $chapter, $question];
}

it('exports a selected subject and safely retries and updates its questions', function (): void {
    [$admin, $pattern, $class, $subject, $chapter, $question] = legacyExportContext();
    $selection = ['mode' => 'subject', 'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id, 'legacy_afaq' => 4, 'legacy_class_id' => 5, 'legacy_subject_id' => 7, 'ids' => []];
    $service = app(LegacyExportService::class);

    expect($service->preview($selection)['ready'])->toBe(1);
    expect($service->export($selection, $admin->id)['questions_created'])->toBe(1);
    expect(DB::connection('legacy_mysql')->table('pk_question')->count())->toBe(1);
    expect($service->export($selection, $admin->id)['unchanged'])->toBe(1);
    expect(DB::connection('legacy_mysql')->table('pk_question')->count())->toBe(1);

    $question->content = ['prompt_en' => 'Find y.', 'prompt_ur' => '', 'guidance_en' => '', 'guidance_ur' => '', 'answer_en' => 'y = 2', 'answer_ur' => ''];
    $question->statement_en = 'Find y.';
    $question->save();
    expect($service->export($selection, $admin->id)['questions_updated'])->toBe(1);
    expect(DB::connection('legacy_mysql')->table('pk_question')->first()->statement_en)->toBe('Find y.');
    expect(DB::connection('legacy_mysql')->table('pk_question')->count())->toBe(1);
});

it('accepts an empty ids list when previewing and exporting a whole subject', function (): void {
    [$admin, $pattern, $class, $subject] = legacyExportContext();
    $this->seed(PermissionSeeder::class);
    $selection = [
        'mode' => 'subject', 'pattern_id' => $pattern->id, 'class_id' => $class->id,
        'subject_id' => $subject->id, 'legacy_afaq' => 4, 'legacy_class_id' => 5,
        'legacy_subject_id' => 7, 'ids' => [],
    ];

    $this->actingAs($admin)->postJson('/superadmin/legacy-export/preview', $selection)
        ->assertOk()->assertJsonPath('ready', 1);
    $this->postJson('/superadmin/legacy-export', $selection)
        ->assertOk()->assertJsonPath('report.questions_created', 1);
});

it('reports a conflict when an old question has changed independently', function (): void {
    [$admin, $pattern, $class, $subject] = legacyExportContext();
    $selection = ['mode' => 'subject', 'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id, 'legacy_afaq' => 4, 'legacy_class_id' => 5, 'legacy_subject_id' => 7, 'ids' => []];
    $service = app(LegacyExportService::class);
    $service->export($selection, $admin->id);
    DB::connection('legacy_mysql')->table('pk_question')->update(['statement_en' => 'Changed in old app']);

    expect($service->export($selection, $admin->id)['conflicts'])->toBe(1);
    expect(DB::connection('legacy_mysql')->table('pk_question')->first()->statement_en)->toBe('Changed in old app');
});

it('exports objective options once and skips questions with uncopied images', function (): void {
    [$admin, $pattern, $class, $subject, $chapter] = legacyExportContext();
    $type = QuestionType::create(['name' => 'New MCQ type', 'heading_en' => 'Choose one', 'is_objective' => true, 'schema_key' => 'objective_mcq', 'status' => 1]);
    Question::create([
        'chapter_id' => $chapter->id, 'question_type_id' => $type->id,
        'schema_key' => 'objective_mcq', 'statement_en' => 'What is 2 + 2?',
        'content' => ['prompt_en' => 'What is 2 + 2?', 'prompt_ur' => '', 'options' => [
            ['text_en' => '3', 'text_ur' => '', 'is_correct' => false],
            ['text_en' => '4', 'text_ur' => '', 'is_correct' => true],
        ]],
        'status' => 1,
    ]);
    Question::create([
        'chapter_id' => $chapter->id, 'question_type_id' => $type->id,
        'schema_key' => 'objective_mcq', 'statement_en' => '<img src="/storage/photo.png">',
        'content' => ['prompt_en' => '<img src="/storage/photo.png">', 'options' => [
            ['text_en' => 'A', 'is_correct' => true], ['text_en' => 'B', 'is_correct' => false],
        ]],
        'status' => 1,
    ]);
    $selection = ['mode' => 'subject', 'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id, 'legacy_afaq' => 4, 'legacy_class_id' => 5, 'legacy_subject_id' => 7, 'ids' => []];
    $service = app(LegacyExportService::class);

    expect($service->preview($selection)['unsupported'])->toHaveKey('Contains an asset that must be copied to the old site');
    expect($service->export($selection, $admin->id)['questions_created'])->toBe(2);
    expect(DB::connection('legacy_mysql')->table('pk_options')->count())->toBe(2);
    expect(DB::connection('legacy_mysql')->table('pk_question')->where('statement_en', 'What is 2 + 2?')->value('type_id'))->toBe('1');
    expect($service->export($selection, $admin->id)['questions_created'])->toBe(0);
    expect(DB::connection('legacy_mysql')->table('pk_options')->count())->toBe(2);
});

it('keeps passage questions in the old paragraph format', function (): void {
    [$admin, $pattern, $class, $subject, $chapter] = legacyExportContext();
    $type = QuestionType::create(['name' => 'Passage MCQ', 'heading_en' => 'Read and answer', 'is_objective' => true, 'schema_key' => 'objective_passage_mcq', 'status' => 1]);
    Question::create([
        'chapter_id' => $chapter->id, 'question_type_id' => $type->id,
        'schema_key' => 'objective_passage_mcq', 'statement_en' => 'Read this passage.',
        'content' => ['passage_en' => 'Read this passage.', 'passage_ur' => '', 'items' => [[
            'prompt_en' => 'What happened?', 'prompt_ur' => '',
            'options' => [['text_en' => 'A', 'text_ur' => '', 'is_correct' => true], ['text_en' => 'B', 'text_ur' => '', 'is_correct' => false]],
        ]]],
        'status' => 1,
    ]);
    $selection = ['mode' => 'subject', 'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id, 'legacy_afaq' => 4, 'legacy_class_id' => 5, 'legacy_subject_id' => 7, 'ids' => []];
    $service = app(LegacyExportService::class);

    expect($service->preview($selection)['ready'])->toBe(2);
    $service->export($selection, $admin->id);
    $legacy = DB::connection('legacy_mysql')->table('pk_question')->where('statement_en', 'Read this passage.')->first();
    $items = json_decode($legacy->paragraph_questions, true);
    expect($legacy->type_id)->toBe('5');
    expect($items[0]['statement_en'])->toBe('What happened?');
    expect($items[0]['options'])->toHaveCount(6);
    expect($items[0]['options'][0]['is_true'])->toBe(1);
});

it('restricts the selection to the requested questions and chapter scope', function (): void {
    [$admin, $pattern, $class, $subject, $chapter, $question] = legacyExportContext();
    $other = Question::create([
        'chapter_id' => $chapter->id, 'question_type_id' => $question->question_type_id,
        'schema_key' => 'subjective_standard', 'statement_en' => 'Second question',
        'content' => ['prompt_en' => 'Second question'], 'status' => 1,
    ]);
    $selection = ['mode' => 'questions', 'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id, 'legacy_afaq' => 4, 'legacy_class_id' => 5, 'legacy_subject_id' => 7, 'ids' => [$question->id]];
    $service = app(LegacyExportService::class);

    expect($service->preview($selection)['total'])->toBe(1);
    expect($service->export($selection, $admin->id)['questions_created'])->toBe(1);
    expect(DB::connection('legacy_mysql')->table('pk_question')->pluck('statement_en')->all())->toBe(['Find x.']);
    $selection['ids'] = [$other->id];
    expect($service->export($selection, $admin->id)['questions_created'])->toBe(1);
    expect(DB::connection('legacy_mysql')->table('pk_question')->count())->toBe(2);
});

it('protects export routes with the data transfer permission', function (): void {
    $this->seed(PermissionSeeder::class);
    $master = User::factory()->create(['user_type' => UserType::SuperAdmin->value, 'created_by' => null]);
    $delegated = User::factory()->create(['user_type' => UserType::SuperAdmin->value, 'created_by' => $master->id]);

    $this->actingAs($master)->get('/superadmin/legacy-export')->assertOk();
    $this->getJson('/superadmin/legacy-export/catalog')->assertOk();
    $this->actingAs($delegated)->get('/superadmin/legacy-export')->assertForbidden();
    $this->postJson('/superadmin/legacy-export', [])->assertForbidden();
});

it('filters question pages and permits 200 rows', function (): void {
    [$admin, $pattern, $class, $subject, $chapter, $question] = legacyExportContext();
    $topic = Topic::create(['chapter_id' => $chapter->id, 'name' => 'Linear equations', 'sort_id' => 1, 'status' => 1]);
    $question->topic_id = $topic->id;
    $question->save();
    Question::create(['chapter_id' => $chapter->id, 'question_type_id' => $question->question_type_id, 'schema_key' => 'subjective_standard', 'statement_en' => 'Another algebra question', 'content' => ['prompt_en' => 'Another algebra question'], 'status' => 1]);
    $otherChapter = Chapter::create(['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id, 'name' => 'Geometry', 'chapter_number' => 2, 'sort_id' => 2, 'status' => 1]);
    Question::create(['chapter_id' => $otherChapter->id, 'question_type_id' => $question->question_type_id, 'schema_key' => 'subjective_standard', 'statement_en' => 'Find the angle.', 'content' => ['prompt_en' => 'Find the angle.'], 'status' => 1]);

    $catalog = app(LegacyExportService::class)->catalog([
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id,
        'chapter_id' => $chapter->id, 'topic_id' => $topic->id,
        'question_type_id' => $question->question_type_id,
        'per_page' => 200,
    ]);

    expect($catalog['questions']->perPage())->toBe(200);
    expect($catalog['questions']->total())->toBe(1);
    expect($catalog['questions']->items()[0]->id)->toBe($question->id);
});

it('loads only the catalog data needed by the active tab', function (): void {
    [$admin, $pattern, $class, $subject, $chapter] = legacyExportContext();
    Topic::create(['chapter_id' => $chapter->id, 'name' => 'Linear equations', 'sort_id' => 1, 'status' => 1]);
    $filter = ['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id, 'afaq' => 4, 'legacy_class_id' => 5];
    $service = app(LegacyExportService::class);

    $subjectCatalog = $service->catalog($filter + ['mode' => 'subject']);
    expect($subjectCatalog['legacy_classes'])->toHaveCount(1);
    expect($subjectCatalog['chapters'])->toBe([]);
    expect($subjectCatalog['questions'])->toBeNull();

    $withoutLegacy = $service->catalog($filter + ['mode' => 'subject', 'include_legacy' => false]);
    expect($withoutLegacy['legacy_classes'])->toBe([]);
    expect($withoutLegacy['legacy_subjects'])->toBe([]);

    $chapterCatalog = $service->catalog($filter + ['mode' => 'chapters']);
    expect($chapterCatalog['chapters'])->toHaveCount(1);
    expect($chapterCatalog['topics'])->toBe([]);
    expect($chapterCatalog['question_types'])->toBe([]);
    expect($chapterCatalog['questions'])->toBeNull();

    $topicCatalog = $service->catalog($filter + ['mode' => 'topics', 'chapter_id' => $chapter->id]);
    expect($topicCatalog['topics'])->toHaveCount(1);
    expect($topicCatalog['question_types'])->toBe([]);
    expect($topicCatalog['questions'])->toBeNull();

    $questionCatalog = $service->catalog($filter + ['mode' => 'questions']);
    expect($questionCatalog['questions']->total())->toBe(1);
});

it('limits old classes and subjects to the selected pattern and class', function (): void {
    [$admin, $pattern, $class, $subject] = legacyExportContext();
    $old = DB::connection('legacy_mysql');
    $old->table('pk_class')->insert(['id' => 6, 'name' => '10th', 'id_order' => 2]);
    $old->table('pk_subject')->insert(['id' => 8, 'name' => 'General Science', 'afaq' => 0]);
    $old->table('pk_chapter')->insert([
        ['id' => 2, 'class_id' => 6, 'subject_id' => 8, 'afaq' => 4, 'name' => 'Federal science', 'u_name' => '', 'chapter_number' => 1, 'chapter_type' => '', 'sort_int' => 1, 'status' => 1, 'status_pef' => 1],
        ['id' => 3, 'class_id' => 5, 'subject_id' => 8, 'afaq' => 0, 'name' => 'Punjab science', 'u_name' => '', 'chapter_number' => 1, 'chapter_type' => '', 'sort_int' => 1, 'status' => 1, 'status_pef' => 1],
    ]);
    $service = app(LegacyExportService::class);

    $federal = $service->catalog(['mode' => 'subject', 'afaq' => 4, 'legacy_class_id' => 5]);
    expect($federal['legacy_classes']->pluck('id')->all())->toBe([5, 6]);
    expect($federal['legacy_subjects']->pluck('id')->all())->toBe([7]);

    $punjab = $service->catalog(['mode' => 'subject', 'afaq' => 0, 'legacy_class_id' => 5]);
    expect($punjab['legacy_classes']->pluck('id')->all())->toBe([5]);
    expect($punjab['legacy_subjects']->pluck('id')->all())->toBe([8]);

    expect(fn () => $service->preview([
        'mode' => 'subject', 'pattern_id' => $pattern->id, 'class_id' => $class->id,
        'subject_id' => $subject->id, 'legacy_afaq' => 4, 'legacy_class_id' => 5,
        'legacy_subject_id' => 8, 'ids' => [],
    ]))->toThrow(RuntimeException::class, 'not linked');
});

it('shows the PECTA classes under the short syllabus legacy pattern', function (): void {
    $old = DB::connection('legacy_mysql');
    $old->table('pk_class')->insert(['id' => 6, 'name' => 'One', 'id_order' => 2]);
    $old->table('pk_subject')->insert(['id' => 8, 'name' => 'English', 'afaq' => 3]);
    $old->table('pk_chapter')->insert([
        'id' => 2, 'class_id' => 6, 'subject_id' => 8, 'afaq' => 3,
        'name' => 'Chapter 1', 'u_name' => '', 'chapter_number' => 1,
        'chapter_type' => '', 'sort_int' => 1, 'status' => 1, 'status_pef' => 1,
    ]);

    $catalog = app(LegacyExportService::class)->catalog(['mode' => 'subject', 'afaq' => 3, 'legacy_class_id' => 6]);

    expect(collect($catalog['legacy_patterns'])->firstWhere('id', 3)['name'])->toContain('PECTA');
    expect($catalog['legacy_classes']->pluck('name')->all())->toBe(['One']);
    expect($catalog['legacy_subjects']->pluck('name')->all())->toBe(['English']);
});

it('replaces a changed old question only when the replacement option is selected', function (): void {
    [$admin, $pattern, $class, $subject] = legacyExportContext();
    $selection = ['mode' => 'subject', 'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id, 'legacy_afaq' => 4, 'legacy_class_id' => 5, 'legacy_subject_id' => 7, 'ids' => []];
    $service = app(LegacyExportService::class);
    $service->export($selection, $admin->id);
    DB::connection('legacy_mysql')->table('pk_question')->update(['answer_en' => 'Changed in old app']);

    expect($service->export($selection, $admin->id)['conflicts'])->toBe(1);
    $selection['replace_existing'] = true;
    expect($service->preview($selection)['replace_existing'])->toBeTrue();
    expect($service->export($selection, $admin->id)['questions_updated'])->toBe(1);
    expect(DB::connection('legacy_mysql')->table('pk_question')->value('answer_en'))->toBe('x = 2');
});

it('uses an explicitly selected compatible old question type', function (): void {
    [$admin, $pattern, $class, $subject, $chapter, $question] = legacyExportContext();
    DB::connection('legacy_mysql')->table('pk_question_types')->insert([
        'id' => 333, 'id_order' => 1, 'type_name' => 'Old short questions', 'type_name_ur' => '',
        'type' => 0, 'heading_en' => '', 'heading_ur' => '', 'have_exercise' => 0,
        'have_statment' => 1, 'statement_label' => '', 'have_description' => 0,
        'description_label' => '', 'have_answer' => 1, 'is_single' => 1,
        'is_objective' => 0, 'objective_type_id' => 0, 'column_per_row' => 1,
    ]);
    $selection = [
        'mode' => 'questions', 'pattern_id' => $pattern->id, 'class_id' => $class->id,
        'subject_id' => $subject->id, 'legacy_afaq' => 4, 'legacy_class_id' => 5,
        'legacy_subject_id' => 7, 'ids' => [$question->id],
        'legacy_type_ids' => [$question->question_type_id => 333],
    ];
    $service = app(LegacyExportService::class);

    expect($service->preview($selection)['ready'])->toBe(1);
    expect($service->export($selection, $admin->id)['questions_created'])->toBe(1);
    expect(DB::connection('legacy_mysql')->table('pk_question')->value('type_id'))->toBe('333');
});

it('can replace an unmapped matching old question without adding a duplicate', function (): void {
    [$admin, $pattern, $class, $subject, $chapter, $question] = legacyExportContext();
    $selection = ['mode' => 'questions', 'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id, 'legacy_afaq' => 4, 'legacy_class_id' => 5, 'legacy_subject_id' => 7, 'ids' => [$question->id]];
    $service = app(LegacyExportService::class);
    $service->export($selection, $admin->id);
    DB::table('legacy_export_items')->where('entity_type', 'question')->where('entity_id', $question->id)->delete();
    DB::connection('legacy_mysql')->table('pk_question')->update(['answer_en' => 'Different old answer']);

    expect($service->export($selection, $admin->id)['conflicts'])->toBe(1);
    $selection['replace_existing'] = true;
    expect($service->export($selection, $admin->id)['questions_updated'])->toBe(1);
    expect(DB::connection('legacy_mysql')->table('pk_question')->count())->toBe(1);
    expect(DB::connection('legacy_mysql')->table('pk_question')->value('answer_en'))->toBe('x = 2');
});

<?php

use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\QuestionType;
use App\Models\QuestionTypeHeading;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Topic;
use App\Models\User;
use App\Support\Questions\QuestionTypeSchemaRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function questionLoadingContext(): array
{
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    $suffix = Str::random(8);
    $pattern = Pattern::create(['name' => 'Federal '.$suffix, 'short_name' => 'FED'.$suffix, 'status' => 1, 'created_by' => $admin->id]);
    $class = SchoolClass::create(['name' => '9th '.$suffix, 'status' => 1, 'created_by' => $admin->id]);
    $subject = Subject::create(['name_eng' => 'Biology '.$suffix, 'subject_type' => 'chapter-wise', 'status' => 1, 'created_by' => $admin->id]);
    $pattern->classes()->attach($class);
    ClassSubject::create(['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id, 'subject_type' => 'topic-wise']);
    $chapter = Chapter::create(['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id, 'name' => 'Cells', 'chapter_number' => 1, 'sort_id' => 1, 'status' => 1, 'created_by' => $admin->id]);
    $topic = Topic::create(['chapter_id' => $chapter->id, 'name' => 'Cell structure', 'sort_id' => 1, 'status' => 1, 'created_by' => $admin->id]);
    $type = QuestionType::create(['name' => 'MCQs '.$suffix, 'heading_en' => 'Choose an option', 'is_objective' => true, 'is_single' => true, 'schema_key' => 'objective_mcq', 'column_per_row' => 1, 'status' => 1, 'created_by' => $admin->id]);

    return compact('admin', 'pattern', 'class', 'subject', 'chapter', 'topic', 'type');
}

function loadingQuestion(array $context, array $overrides = []): Question
{
    return Question::create(array_merge([
        'question_type_id' => $context['type']->id,
        'chapter_id' => $context['chapter']->id,
        'topic_id' => $context['topic']->id,
        'statement_en' => 'A question',
        'source' => Question::SOURCE_EXERCISE,
        'status' => 1,
        'created_by' => $context['admin']->id,
    ], $overrides));
}

it('loads only patterns in the initial question page catalog', function () {
    $context = questionLoadingContext();
    loadingQuestion($context);
    $queries = [];
    DB::listen(function ($query) use (&$queries): void {
        $queries[] = $query->sql;
    });

    $this->actingAs($context['admin'])->get(route('superadmin.questions'))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/questions/browse')->where('level', 'patterns')->has('rows', 1)
        ->missing('chapters')->missing('questions')->missing('questionTypes'));

    expect(collect($queries)->filter(fn ($sql) => preg_match('/from ["`](chapters|topics|questions|question_options|class_subjects|question_types)["`]/i', $sql)))->toBeEmpty();
});

it('loads classes by their saved order and limits subjects to the selected scope', function () {
    $context = questionLoadingContext();
    $other = questionLoadingContext();
    $firstClass = SchoolClass::create(['name' => 'Earlier', 'sort_order' => 1, 'status' => 0, 'created_by' => $context['admin']->id]);
    $context['class']->update(['sort_order' => 5]);
    $context['pattern']->classes()->attach($firstClass);
    $this->actingAs($context['admin'])->getJson(route('superadmin.questions.filter-options', ['level' => 'classes', 'pattern_id' => $context['pattern']->id]))
        ->assertOk()->assertJsonCount(2, 'options')->assertJsonPath('options.0.id', $firstClass->id)->assertJsonPath('options.1.id', $context['class']->id);
    $this->getJson(route('superadmin.questions.filter-options', ['level' => 'subjects', 'pattern_id' => $context['pattern']->id, 'class_id' => $context['class']->id]))
        ->assertOk()->assertJsonCount(1, 'options')->assertJsonPath('options.0.id', $context['subject']->id);
    $this->getJson(route('superadmin.questions.filter-options', ['level' => 'subjects', 'pattern_id' => $other['pattern']->id, 'class_id' => $context['class']->id]))
        ->assertOk()->assertJsonCount(0, 'options');
});

it('loads scoped chapters without topics and fetches topics separately in order', function () {
    $context = questionLoadingContext();
    $other = questionLoadingContext();
    $later = Topic::create(['chapter_id' => $context['chapter']->id, 'name' => 'Later', 'sort_id' => 3, 'status' => 0, 'created_by' => $context['admin']->id]);
    $this->actingAs($context['admin'])->getJson(route('superadmin.questions.filter-options', [
        'level' => 'chapters', 'pattern_id' => $context['pattern']->id, 'class_id' => $context['class']->id, 'subject_id' => $context['subject']->id,
    ]))->assertOk()->assertJsonCount(1, 'options')->assertJsonPath('options.0.subject.subject_type', 'topic-wise')->assertJsonPath('options.0.topics', []);
    $this->getJson(route('superadmin.questions.filter-options', ['level' => 'topics', 'chapter_id' => $context['chapter']->id]))
        ->assertOk()->assertJsonCount(2, 'options')->assertJsonPath('options.0.id', $context['topic']->id)->assertJsonPath('options.1.id', $later->id);
    $this->getJson(route('superadmin.questions.list-data', ['chapter_id' => $context['chapter']->id, 'topic_id' => $other['topic']->id]))->assertNotFound();
    $this->getJson(route('superadmin.questions.filter-options', ['level' => 'subjects', 'pattern_id' => $context['pattern']->id]))->assertUnprocessable()->assertJsonValidationErrors('class_id');
});

it('adds a chapter from the questions browse scope without trusting posted scope fields', function () {
    $context = questionLoadingContext();
    $other = questionLoadingContext();
    $browseUrl = route('superadmin.questions.browse.chapters', [
        $context['pattern'], $context['class'], $context['subject'],
    ]);
    $storeUrl = route('superadmin.questions.browse.chapters.store', [
        $context['pattern'], $context['class'], $context['subject'],
    ]);

    $this->actingAs($context['admin'])->get($browseUrl)->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/questions/browse')
            ->where('createChapterHref', parse_url($storeUrl, PHP_URL_PATH)));

    $this->from($browseUrl)->post($storeUrl, [
        'chapter_number' => 2,
        'name' => 'New chapter',
        'name_ur' => 'نیا باب',
        'group_name' => 'Group A',
        'group_heading' => 'Section One',
        'pattern_id' => $other['pattern']->id,
        'class_id' => $other['class']->id,
        'status' => 0,
    ])->assertRedirect($browseUrl)->assertSessionHasNoErrors();

    $this->assertDatabaseHas('chapters', [
        'pattern_id' => $context['pattern']->id,
        'class_id' => $context['class']->id,
        'subject_id' => $context['subject']->id,
        'chapter_number' => 2,
        'name' => 'New chapter',
        'name_ur' => 'نیا باب',
        'group_name' => 'Group A',
        'group_heading' => 'Section One',
        'status' => 1,
    ]);
    $this->get($browseUrl)->assertOk()->assertInertia(fn (Assert $page) => $page->has('rows', 2));

    $this->from($browseUrl)->post($storeUrl, [
        'chapter_number' => 2,
        'name' => 'Duplicate number',
    ])->assertSessionHasErrors('chapter_number');

    $this->post(route('superadmin.questions.browse.chapters.store', [
        $context['pattern'], $other['class'], $context['subject'],
    ]), ['name' => 'Wrong scope'])->assertNotFound();

    ClassSubject::query()->where('pattern_id', $context['pattern']->id)
        ->where('class_id', $context['class']->id)
        ->where('subject_id', $context['subject']->id)
        ->delete();
    $this->from($browseUrl)->post($storeUrl, [
        'chapter_number' => 3,
        'name' => 'Legacy scope chapter',
    ])->assertRedirect($browseUrl)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('chapters', [
        'pattern_id' => $context['pattern']->id,
        'class_id' => $context['class']->id,
        'subject_id' => $context['subject']->id,
        'name' => 'Legacy scope chapter',
    ]);
});

it('requires chapter creation permission on the questions browse route', function () {
    $context = questionLoadingContext();
    $restricted = User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
        'created_by' => $context['admin']->id,
    ]);

    $this->actingAs($restricted)->post(route('superadmin.questions.browse.chapters.store', [
        $context['pattern'], $context['class'], $context['subject'],
    ]), ['name' => 'Unauthorized'])->assertForbidden();
});

it('shows an empty topics table for a new topic-wise chapter and adds topics within that scope', function () {
    $context = questionLoadingContext();
    $chapter = Chapter::create([
        'pattern_id' => $context['pattern']->id,
        'class_id' => $context['class']->id,
        'subject_id' => $context['subject']->id,
        'name' => 'New chapter',
        'status' => 1,
        'created_by' => $context['admin']->id,
    ]);
    $parents = [$context['pattern'], $context['class'], $context['subject'], $chapter];
    $browseUrl = route('superadmin.questions.browse.chapter', $parents);
    $storeUrl = route('superadmin.questions.browse.topics.store', $parents);

    $this->actingAs($context['admin'])->get($browseUrl)->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/questions/browse')->where('level', 'topics')
            ->has('rows', 0)->where('createTopicHref', parse_url($storeUrl, PHP_URL_PATH)));

    $this->from($browseUrl)->post($storeUrl, [
        'name' => 'New topic',
        'name_ur' => 'نیا موضوع',
        'status' => 0,
    ])->assertRedirect($browseUrl)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('topics', [
        'chapter_id' => $chapter->id,
        'name' => 'New topic',
        'name_ur' => 'نیا موضوع',
        'status' => 1,
    ]);
    $this->get($browseUrl)->assertOk()->assertInertia(fn (Assert $page) => $page->has('rows', 1));
    $this->from($browseUrl)->post($storeUrl, ['name' => 'New topic'])
        ->assertSessionHasErrors('name');

    $this->post(route('superadmin.questions.browse.topics.store', [
        $context['pattern'], $context['class'], $context['subject'], $context['chapter'],
    ]), ['name' => 'Cell structure'])->assertSessionHasErrors('name');
});

it('rejects topic creation outside a topic-wise chapter or without permission', function () {
    $context = questionLoadingContext();
    $other = questionLoadingContext();
    $this->actingAs($context['admin'])->post(route('superadmin.questions.browse.topics.store', [
        $context['pattern'], $context['class'], $context['subject'], $other['chapter'],
    ]), ['name' => 'Wrong scope'])->assertNotFound();

    ClassSubject::query()->where('pattern_id', $context['pattern']->id)
        ->where('class_id', $context['class']->id)->where('subject_id', $context['subject']->id)
        ->update(['subject_type' => 'chapter-wise']);
    $this->post(route('superadmin.questions.browse.topics.store', [
        $context['pattern'], $context['class'], $context['subject'], $context['chapter'],
    ]), ['name' => 'Wrong type'])->assertNotFound();

    $restricted = User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
        'created_by' => $context['admin']->id,
    ]);
    $this->actingAs($restricted)->post(route('superadmin.questions.browse.topics.store', [
        $context['pattern'], $context['class'], $context['subject'], $context['chapter'],
    ]), ['name' => 'Unauthorized'])->assertForbidden();
});

it('keeps unassigned questions accessible when a topic-wise chapter has no topics', function () {
    $context = questionLoadingContext();
    $chapter = Chapter::create([
        'pattern_id' => $context['pattern']->id,
        'class_id' => $context['class']->id,
        'subject_id' => $context['subject']->id,
        'name' => 'Legacy chapter',
        'status' => 1,
        'created_by' => $context['admin']->id,
    ]);
    loadingQuestion($context, ['chapter_id' => $chapter->id, 'topic_id' => null]);
    $parents = [$context['pattern'], $context['class'], $context['subject'], $chapter];

    $this->actingAs($context['admin'])->get(route('superadmin.questions.browse.chapter', $parents))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/questions/browse')->where('level', 'topics')
        ->has('rows', 1)->where('rows.0.name', 'Unassigned questions'));
    $this->get(route('superadmin.questions.browse.unassigned', $parents))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/questions/list')->where('items.total', 1));
});

it('loads only scoped add-question options and saves from the list modal', function () {
    $context = questionLoadingContext();
    $other = questionLoadingContext();
    $parents = [$context['pattern'], $context['class'], $context['subject'], $context['chapter']];
    $optionsUrl = route('superadmin.questions.browse.chapter.form-options', $parents);
    $listUrl = route('superadmin.questions.browse.topic', [...$parents, $context['topic']]);

    $this->actingAs($context['admin'])->get($listUrl)->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/questions/list')
            ->where('addOptionsHref', parse_url($optionsUrl, PHP_URL_PATH)));
    $this->getJson($optionsUrl)->assertOk()
        ->assertJsonCount(1, 'chapters')
        ->assertJsonPath('chapters.0.id', $context['chapter']->id)
        ->assertJsonPath('chapters.0.subject.subject_type', 'topic-wise')
        ->assertJsonStructure(['questionTypes' => [['id', 'name', 'schema_key', 'schema']]])
        ->assertJsonMissingPath('items');

    $this->from($listUrl)->post(route('superadmin.questions.store', ['modal' => 1, 'save_and_add_new' => 1]), [
        'question_type_id' => $context['type']->id,
        'chapter_id' => $context['chapter']->id,
        'topic_id' => $context['topic']->id,
        'source' => Question::SOURCE_EXERCISE,
        'status' => 1,
        'content' => [
            'prompt_en' => 'Question from modal',
            'options' => [
                ['text_en' => 'A', 'is_correct' => true],
                ['text_en' => 'B', 'is_correct' => false],
            ],
        ],
    ])->assertRedirect($listUrl)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('questions', [
        'chapter_id' => $context['chapter']->id,
        'topic_id' => $context['topic']->id,
        'statement_en' => 'Question from modal',
    ]);

    $this->postJson(route('superadmin.questions.store'), [
        'question_type_id' => $context['type']->id,
        'chapter_id' => $context['chapter']->id,
        'topic_id' => $context['topic']->id,
        'status' => 1,
        'content' => [
            'prompt_en' => 'Another modal question',
            'options' => [
                ['text_en' => 'A', 'is_correct' => true],
                ['text_en' => 'B', 'is_correct' => false],
            ],
        ],
    ])->assertCreated()->assertJsonStructure(['id']);
    $this->assertDatabaseHas('questions', ['statement_en' => 'Another modal question']);

    $this->getJson(route('superadmin.questions.browse.chapter.form-options', [
        $context['pattern'], $context['class'], $context['subject'], $other['chapter'],
    ]))->assertNotFound();

    $restricted = User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
        'created_by' => $context['admin']->id,
    ]);
    $this->actingAs($restricted)->getJson($optionsUrl)->assertForbidden();
});

it('sends the resolved schema for the selected question scope', function () {
    $context = questionLoadingContext();
    QuestionTypeHeading::create([
        'question_type_id' => $context['type']->id,
        'pattern_id' => $context['pattern']->id,
        'class_id' => $context['class']->id,
        'subject_id' => $context['subject']->id,
        'scope_key' => QuestionTypeHeading::scopeKey(
            $context['pattern']->id, $context['class']->id, $context['subject']->id,
        ),
        'schema_key' => 'objective_true_false',
    ]);

    $this->actingAs($context['admin'])->getJson(route('superadmin.questions.browse.chapter.form-options', [
        $context['pattern'], $context['class'], $context['subject'], $context['chapter'],
    ]))->assertOk()
        ->assertJsonPath('questionTypes.0.schema_key', 'objective_true_false')
        ->assertJsonPath('questionTypes.0.scope_rules', []);
});

it('keeps existing chapter deep links without eagerly loading the question bank', function () {
    $context = questionLoadingContext();
    loadingQuestion($context);
    $this->actingAs($context['admin'])->get(route('superadmin.questions.topic', [$context['chapter'], $context['topic']]))
        ->assertRedirect(route('superadmin.questions.browse.topic', [
            $context['pattern'], $context['class'], $context['subject'], $context['chapter'], $context['topic'],
        ]));
});

it('returns compact JSON with rich summaries and the same legacy and structured metrics', function () {
    $context = questionLoadingContext();
    $math = '<img class="mathImg" alt="iota" src="https://latex.codecogs.com/svg.image?iota" />';
    $legacy = loadingQuestion($context, ['statement_en' => $math]);
    foreach ([true, false, false, false] as $index => $correct) {
        QuestionOption::create(['question_id' => $legacy->id, 'text_en' => "Option {$index}", 'is_correct' => $correct, 'sort_order' => $index + 1]);
    }
    $passage = loadingQuestion($context, ['schema_key' => 'objective_passage_mcq', 'content' => [
        'passage_en' => 'A scenario', 'items' => [
            ['prompt_en' => 'First', 'options' => [['text_en' => 'Yes', 'is_correct' => true], ['text_en' => 'No', 'is_correct' => false]]],
            ['prompt_en' => 'Second', 'options' => [['text_en' => 'Yes', 'is_correct' => true], ['text_en' => 'No', 'is_correct' => false]]],
        ],
    ]]);
    $this->actingAs($context['admin']);
    $data = $this->getJson(route('superadmin.questions.list-data', ['chapter_id' => $context['chapter']->id]))
        ->assertOk()->assertJsonCount(2, 'questions')->assertJsonCount(1, 'questionTypes')->json();
    foreach ([$legacy, $passage] as $question) {
        $type = QuestionTypeSchemaRegistry::typeForQuestion($question, $context['type']);
        $content = QuestionTypeSchemaRegistry::contentFromQuestion($question->load('options'), $type);
        $expected = QuestionTypeSchemaRegistry::metrics($type, $content, $question->options);
        $row = collect($data['questions'])->firstWhere('id', $question->id);
        expect($row['summary_text'])->toBe(QuestionTypeSchemaRegistry::summarize($type, $content))
            ->and($row['options_count'])->toBe($expected['options_count'])
            ->and($row['correct_options_count'])->toBe($expected['correct_options_count'])
            ->and($row['items_count'])->toBe($expected['items_count'])
            ->and($row)->not->toHaveKeys(['content', 'options', 'answer_en', 'chapter', 'question_type']);
    }
    expect($data['chapter']['subject']['subject_type'])->toBe('topic-wise');
    $this->getJson(route('superadmin.questions.list-data', ['chapter_id' => $context['chapter']->id, 'topic_id' => $context['topic']->id]))->assertJsonCount(2, 'questions');
});

it('preserves first-option summaries and true false counts for legacy questions', function () {
    $context = questionLoadingContext();
    $context['type']->update(['options_only' => true]);
    $optionsOnly = loadingQuestion($context);
    QuestionOption::create(['question_id' => $optionsOnly->id, 'text_en' => 'Later option', 'sort_order' => 2, 'is_correct' => false]);
    QuestionOption::create(['question_id' => $optionsOnly->id, 'text_en' => 'First option', 'sort_order' => 1, 'is_correct' => true]);
    $booleanType = $context['type']->replicate();
    $booleanType->fill(['name' => 'True false', 'schema_key' => 'objective_true_false', 'options_only' => false])->save();
    $boolean = loadingQuestion($context, ['question_type_id' => $booleanType->id]);
    QuestionOption::create(['question_id' => $boolean->id, 'text_en' => 'False', 'is_correct' => true, 'sort_order' => 1]);
    $data = $this->actingAs($context['admin'])->getJson(route('superadmin.questions.list-data', ['chapter_id' => $context['chapter']->id]))->assertOk()->json();
    $rows = collect($data['questions'])->keyBy('id');
    expect($rows[$optionsOnly->id]['summary_text'])->toBe('First option')
        ->and($rows[$optionsOnly->id]['options_count'])->toBe(2)
        ->and($rows[$optionsOnly->id]['correct_options_count'])->toBe(1)
        ->and($rows[$boolean->id]['options_count'])->toBe(2)
        ->and($rows[$boolean->id]['correct_options_count'])->toBe(1);
});

it('does not add database queries for every additional question row', function () {
    $context = questionLoadingContext();
    loadingQuestion($context);
    $this->actingAs($context['admin']);
    $measure = function () use ($context): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson(route('superadmin.questions.list-data', ['chapter_id' => $context['chapter']->id]))->assertOk();
        $count = count(DB::getQueryLog());
        DB::disableQueryLog();

        return $count;
    };
    $before = $measure();
    for ($index = 0; $index < 40; $index++) {
        loadingQuestion($context);
    }
    expect($measure())->toBe($before);
});

it('enforces view and edit permissions on the JSON endpoints', function () {
    $context = questionLoadingContext();
    $restricted = User::factory()->create(['user_type' => UserType::SuperAdmin->value, 'created_by' => $context['admin']->id]);
    $this->actingAs($restricted)->getJson(route('superadmin.questions.filter-options', ['level' => 'classes', 'pattern_id' => $context['pattern']->id]))->assertForbidden();
    $this->getJson(route('superadmin.questions.list-data', ['chapter_id' => $context['chapter']->id]))->assertForbidden();
    $this->getJson(route('superadmin.questions.list-types'))->assertForbidden();
});

it('navigates scoped tables and paginates only the selected topic questions', function () {
    $context = questionLoadingContext();
    $this->actingAs($context['admin']);
    $parents = [$context['pattern'], $context['class'], $context['subject']];

    $this->get(route('superadmin.questions.browse.classes', $context['pattern']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->component('superadmin/questions/browse')
        ->where('level', 'classes')->has('rows', 1));
    $this->get(route('superadmin.questions.browse.subjects', [$context['pattern'], $context['class']]))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->component('superadmin/questions/browse')
        ->where('level', 'subjects')->has('rows', 1));
    $this->get(route('superadmin.questions.browse.chapters', $parents))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->component('superadmin/questions/browse')
        ->where('level', 'chapters')->has('rows', 1));
    $this->get(route('superadmin.questions.browse.chapter', [...$parents, $context['chapter']]))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->component('superadmin/questions/browse')
        ->where('level', 'topics')->has('rows', 1));

    for ($index = 0; $index < 31; $index++) {
        loadingQuestion($context, ['statement_en' => 'Question '.$index]);
    }
    $url = route('superadmin.questions.browse.topic', [...$parents, $context['chapter'], $context['topic']]);
    $this->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/questions/list')->where('items.total', 31)
        ->where('items.per_page', 200)->has('items.data', 31)->missing('items.data.0.content'));
    $this->get($url.'?per_page=25')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/questions/list')->where('items.per_page', 25)
        ->has('items.data', 25)->missing('items.data.0.content'));
    $this->get($url.'?per_page=25&page=2')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/questions/list')->where('items.per_page', 25)->has('items.data', 6));
    $this->getJson($url.'?per_page=201')->assertUnprocessable()->assertJsonValidationErrors('per_page');
});

it('shows complete question statements and descriptions in the scoped list', function () {
    $context = questionLoadingContext();
    $statement = str_repeat('A long question sentence. ', 12);
    $description = '<p>Use the diagram to explain your answer.</p>';
    loadingQuestion($context, [
        'statement_en' => $statement,
        'statement_ur' => 'اردو سوال',
        'description_en' => $description,
        'description_ur' => 'اردو وضاحت',
    ]);
    $url = route('superadmin.questions.browse.topic', [
        $context['pattern'], $context['class'], $context['subject'], $context['chapter'], $context['topic'],
    ]);

    $this->actingAs($context['admin'])->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/questions/list')
        ->where('items.data.0.statement_en', $statement)
        ->where('items.data.0.statement_ur', 'اردو سوال')
        ->where('items.data.0.description_en', $description)
        ->where('items.data.0.description_ur', 'اردو وضاحت')
        ->missing('items.data.0.content'));
    $this->get($url.'?q=diagram')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/questions/list')->where('items.total', 1));
});

it('lists chapter-wise questions directly and keeps unassigned topic-wise questions visible', function () {
    $context = questionLoadingContext();
    $this->actingAs($context['admin']);
    loadingQuestion($context, ['topic_id' => null]);
    $parents = [$context['pattern'], $context['class'], $context['subject'], $context['chapter']];

    $this->get(route('superadmin.questions.browse.chapter', $parents))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->component('superadmin/questions/browse')
        ->where('level', 'topics')->has('rows', 2));
    $this->get(route('superadmin.questions.browse.unassigned', $parents))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->component('superadmin/questions/list')
        ->where('items.total', 1));

    ClassSubject::query()->where('pattern_id', $context['pattern']->id)
        ->where('class_id', $context['class']->id)->where('subject_id', $context['subject']->id)
        ->update(['subject_type' => 'chapter-wise']);
    $this->get(route('superadmin.questions.browse.chapter', $parents))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->component('superadmin/questions/list')
        ->where('items.total', 1));
    $this->get(route('superadmin.questions.browse.topic', [...$parents, $context['topic']]))->assertNotFound();
});

it('rejects mismatched parent routes and returns lightweight selection and sort data', function () {
    $context = questionLoadingContext();
    $other = questionLoadingContext();
    $question = loadingQuestion($context);
    $this->actingAs($context['admin']);

    $this->get(route('superadmin.questions.browse.chapter', [
        $context['pattern'], $context['class'], $context['subject'], $other['chapter'],
    ]))->assertNotFound();
    $this->getJson(route('superadmin.questions.selection-ids', [
        'chapter_id' => $context['chapter']->id, 'topic_id' => $context['topic']->id,
    ]))->assertOk()->assertJsonCount(1, 'rows')->assertJsonPath('rows.0.id', $question->id);
    $this->getJson(route('superadmin.questions.sort-rows', [
        'chapter_id' => $context['chapter']->id, 'topic_id' => $context['topic']->id,
        'question_type_id' => $context['type']->id,
    ]))->assertOk()->assertJsonCount(1, 'rows')
        ->assertJsonPath('rows.0.id', $question->id)
        ->assertJsonPath('rows.0.statement_en', 'A question')
        ->assertJsonPath('rows.0.summary_text', '');
    $this->getJson(route('superadmin.questions.selection-ids', [
        'chapter_id' => $context['chapter']->id, 'topic_id' => $other['topic']->id,
    ]))->assertNotFound();
});

it('shows rich and structured question text when sorting without an id fallback', function () {
    $context = questionLoadingContext();
    $image = loadingQuestion($context, [
        'statement_en' => '<img alt="Equation" src="/equation.svg">',
    ]);
    $structured = loadingQuestion($context, [
        'statement_en' => null,
        'schema_key' => 'objective_passage_mcq',
        'content' => ['passage_en' => 'Read this passage before answering.'],
    ]);

    $rows = $this->actingAs($context['admin'])->getJson(route('superadmin.questions.sort-rows', [
        'chapter_id' => $context['chapter']->id,
        'topic_id' => $context['topic']->id,
        'question_type_id' => $context['type']->id,
    ]))->assertOk()->assertJsonCount(2, 'rows')->json('rows');

    $rows = collect($rows)->keyBy('id');
    expect($rows[$image->id]['statement_en'])->toBe('<img alt="Equation" src="/equation.svg">')
        ->and($rows[$image->id]['summary_text'])->toBe('')
        ->and($rows[$structured->id]['statement_en'])->toBeNull()
        ->and($rows[$structured->id]['summary_text'])->toBe('Read this passage before answering.')
        ->and($rows[$structured->id])->not->toHaveKey('content');
});

it('loads only the current chapter on edit until the chapter picker is opened', function () {
    $context = questionLoadingContext();
    $other = questionLoadingContext();
    $question = loadingQuestion($context);
    $this->actingAs($context['admin'])->get(route('superadmin.questions.edit', $question))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/questions/edit')->has('chapters', 1)
        ->where('chapters.0.id', $context['chapter']->id)
        ->where('chapterOptionsUrl', route('superadmin.questions.form-chapters', absolute: false)));
    $this->getJson(route('superadmin.questions.form-chapters'))
        ->assertOk()->assertJsonCount(2, 'chapters');

    $restricted = User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
        'created_by' => $context['admin']->id,
    ]);
    $this->actingAs($restricted)->getJson(route('superadmin.questions.form-chapters'))
        ->assertForbidden();
});

it('opens add question from the full topic path and shows that path on the form', function () {
    $context = questionLoadingContext();
    $parents = [$context['pattern'], $context['class'], $context['subject'], $context['chapter']];
    $url = route('superadmin.questions.browse.topic.add', [...$parents, $context['topic']]);
    $listUrl = route('superadmin.questions.browse.topic', [...$parents, $context['topic']]);
    $this->actingAs($context['admin']);

    $this->get($listUrl)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/questions/list')->where('addHref', parse_url($url, PHP_URL_PATH)));
    $this->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/questions/add')
        ->where('backHref', parse_url($listUrl, PHP_URL_PATH))
        ->where('breadcrumbs.0.label', 'Questions')
        ->where('breadcrumbs.1.label', $context['pattern']->name)
        ->where('breadcrumbs.2.label', $context['class']->name)
        ->where('breadcrumbs.3.label', $context['subject']->name_eng)
        ->where('breadcrumbs.4.label', $context['chapter']->name)
        ->where('breadcrumbs.5.label', $context['topic']->name)
        ->where('breadcrumbs.6.label', 'Add Question'));
    $this->get(route('superadmin.questions.chapters.topics.add', [$context['chapter'], $context['topic']]))
        ->assertRedirect($url);

    $chapterAddUrl = route('superadmin.questions.browse.chapter.add', $parents);
    $this->get($chapterAddUrl)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/questions/add')
        ->where('breadcrumbs.5.label', 'Unassigned questions')
        ->where('breadcrumbs.6.label', 'Add Question'));
    $this->get(route('superadmin.questions.chapters.add', $context['chapter']))
        ->assertRedirect($chapterAddUrl);

    $other = questionLoadingContext();
    $this->get(route('superadmin.questions.browse.topic.add', [
        $other['pattern'], $context['class'], $context['subject'], $context['chapter'], $context['topic'],
    ]))->assertNotFound();
});

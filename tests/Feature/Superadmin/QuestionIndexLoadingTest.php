<?php

use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\QuestionType;
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
        ->component('superadmin/questions')->has('patterns', 1)->where('initialChapter', null)
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

it('keeps existing chapter deep links without eagerly loading the question bank', function () {
    $context = questionLoadingContext();
    loadingQuestion($context);
    $this->actingAs($context['admin'])->get(route('superadmin.questions.topic', [$context['chapter'], $context['topic']]))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/questions')->where('initialChapter.id', $context['chapter']->id)
        ->where('filters.chapter_id', $context['chapter']->id)->where('filters.topic_id', $context['topic']->id)
        ->missing('questions')->missing('questionTypes'));
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

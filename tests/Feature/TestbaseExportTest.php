<?php

use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Medium;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Services\Export\TestbaseExportService;
use App\Services\Export\TestbasePayloadConverter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

function exportFixture(): array
{
    config([
        'testbase_export.enabled' => true,
        'testbase_export.installation_id' => 'sqlite-bank',
        'testbase_export.token_sha256' => hash('sha256', 'fixture-export-token'),
    ]);
    $pattern = Pattern::create(['name' => 'Export pattern', 'status' => 1]);
    $class = SchoolClass::create(['name' => 'Export class', 'status' => 1]);
    $subject = Subject::create(['name_eng' => 'Export subject', 'subject_type' => 'chapter-wise', 'status' => 1]);
    $medium = Medium::create(['name' => 'English']);
    DB::table('pattern_classes')->insert(['pattern_id' => $pattern->id, 'class_id' => $class->id]);
    ClassSubject::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id,
        'subject_id' => $subject->id, 'medium_id' => $medium->id,
        'subject_type' => 'chapter-wise',
    ]);
    $chapter = Chapter::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id,
        'subject_id' => $subject->id, 'chapter_number' => 1,
        'name' => 'Chapter one', 'status' => 1,
    ]);
    $type = QuestionType::create([
        'name' => 'Export MCQ', 'heading_en' => 'Choose one',
        'is_objective' => true, 'is_single' => true,
        'schema_key' => 'objective_mcq', 'status' => 1,
    ]);
    $options = [
        ['text_en' => 'First', 'is_correct' => true],
        ['text_en' => 'Second', 'is_correct' => false],
        ['text_en' => 'Third', 'is_correct' => false],
        ['text_en' => 'Fourth', 'is_correct' => false],
    ];
    $question = Question::create([
        'chapter_id' => $chapter->id, 'question_type_id' => $type->id,
        'schema_key' => 'objective_mcq', 'statement_en' => 'Which?',
        'content' => ['prompt_en' => 'Which?', 'options' => $options],
        'source' => 'exercise', 'status' => 1,
    ]);
    foreach ($options as $index => $option) {
        DB::table('question_options')->insert([
            'question_id' => $question->id, 'text_en' => $option['text_en'],
            'is_correct' => $option['is_correct'], 'sort_order' => $index + 1,
        ]);
    }
    $query = http_build_query([
        'patternId' => $pattern->id, 'classId' => $class->id,
        'subjectId' => $subject->id,
    ]);

    return compact('pattern', 'class', 'subject', 'chapter', 'type', 'question', 'query');
}

function exportGet(string $path): TestResponse
{
    return test()->withToken('fixture-export-token')->getJson('/api/testbase-export/v1/'.$path);
}

it('keeps the export disabled by default and rejects other credentials and methods', function () {
    $this->getJson('/api/testbase-export/v1/capabilities')->assertForbidden();
    $fixture = exportFixture();
    $this->getJson('/api/testbase-export/v1/capabilities')->assertUnauthorized();
    $this->withToken('wrong')->getJson('/api/testbase-export/v1/capabilities')->assertUnauthorized();
    exportGet('capabilities')->assertOk()
        ->assertJsonPath('contract', 'testmaker-export/1')
        ->assertJsonPath('payloadFormat', 'testbase-question/1');
    $this->withToken('fixture-export-token')->postJson('/api/testbase-export/v1/scope')->assertStatus(405);
    expect($fixture['question']->fresh()->statement_en)->toBe('Which?');
});

it('exports only the exact assignment with stable pages and blocks a changed revision', function () {
    $fixture = exportFixture();
    $foreign = Pattern::create(['name' => 'Other pattern', 'status' => 1]);
    $this->withToken('fixture-export-token')->getJson('/api/testbase-export/v1/catalog?patternId='.$foreign->id)
        ->assertOk()->assertJsonCount(0, 'classes');
    exportGet('catalog?patternId='.$fixture['pattern']->id.'&classId='.$fixture['class']->id)
        ->assertOk()->assertJsonCount(1, 'subjects')
        ->assertJsonPath('subjects.0.medium', 'ENGLISH');
    exportGet('scope?patternId='.$foreign->id.'&classId='.$fixture['class']->id.'&subjectId='.$fixture['subject']->id)
        ->assertNotFound();
    $manifest = exportGet('scope?'.$fixture['query'])->assertOk()->json();
    expect($manifest['questionCount'])->toBe(1)
        ->and($manifest['chapters'][0]['questionCount'])->toBe(1)
        ->and($manifest['variants'][0]['schema'])->toBe('STANDARD_OBJECTIVE');
    $revision = $manifest['revision'];
    $page = exportGet('questions?'.$fixture['query'].'&revision='.$revision.'&pageSize=1')
        ->assertOk()->json();
    expect($page['items'])->toHaveCount(1)
        ->and($page['items'][0]['payload']['correctOptionId'])->toBe('oq'.$fixture['question']->id.'-0')
        ->and($page['nextCursor'])->toBeNull();
    DB::table('question_options')->where('question_id', $fixture['question']->id)
        ->where('sort_order', 2)->update(['text_en' => 'Edited option']);
    exportGet('questions?'.$fixture['query'].'&revision='.$revision.'&pageSize=1')->assertStatus(409);
    exportGet('scope?'.$fixture['query'].'&revision='.$revision)->assertStatus(409);
});

it('keeps unsupported and unanswered source questions visible for review', function () {
    $fixture = exportFixture();
    $fixture['question']->update(['content' => [
        'prompt_en' => 'Which?',
        'options' => array_map(fn ($label) => ['text_en' => $label, 'is_correct' => false],
            ['A', 'B', 'C', 'D']),
    ]]);
    Question::create([
        'chapter_id' => $fixture['chapter']->id,
        'question_type_id' => $fixture['type']->id,
        'schema_key' => 'objective_blank_open',
        'content' => ['prompt_en' => 'Fill blank'],
        'status' => 1,
    ]);
    $manifest = exportGet('scope?'.$fixture['query'])->assertOk()->json();
    $page = exportGet('questions?'.$fixture['query'].'&revision='.$manifest['revision'].'&pageSize=2')
        ->assertOk()->json();
    expect($page['items'])->toHaveCount(2)
        ->and($page['items'][0]['payload'])->toBeNull()
        ->and($page['items'][0]['issues'])->not->toBeEmpty()
        ->and($page['items'][1]['schema'])->toBeNull()
        ->and($page['items'][1]['issues'])->not->toBeEmpty();
});

it('paginates parents without repeats and exports only referenced verified image bytes', function () {
    $fixture = exportFixture();
    $imageId = (string) Str::uuid();
    $bytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+juz8AAAAASUVORK5CYII=', true);
    DB::table('question_images')->insert([
        'id' => $imageId, 'mime_type' => 'image/png',
        'data' => base64_encode($bytes), 'created_at' => now(),
    ]);
    $content = $fixture['question']->content;
    $content['prompt_en'] = '<p>Which diagram?</p><img src="/question-images/'.$imageId.'">';
    $fixture['question']->update(['content' => $content]);
    Question::create([
        'chapter_id' => $fixture['chapter']->id,
        'question_type_id' => $fixture['type']->id,
        'schema_key' => 'objective_mcq',
        'content' => ['prompt_en' => 'Second question', 'options' => $content['options']],
        'status' => 1,
    ]);
    $manifest = exportGet('scope?'.$fixture['query'])->assertOk()->json();
    expect($manifest['assets'])->toHaveCount(1)
        ->and($manifest['assets'][0]['sha256'])->toBe(hash('sha256', $bytes));
    $revision = $manifest['revision'];
    $first = exportGet('questions?'.$fixture['query'].'&revision='.$revision.'&pageSize=1')
        ->assertOk()->json();
    $second = exportGet('questions?'.$fixture['query'].'&revision='.$revision.'&pageSize=1&cursor='.$first['nextCursor'])
        ->assertOk()->json();
    expect($first['items'][0]['id'])->not->toBe($second['items'][0]['id'])
        ->and($second['nextCursor'])->toBeNull();
    $assetId = $manifest['assets'][0]['id'];
    $assetResponse = exportGet('assets/'.$assetId.'?'.$fixture['query'].'&revision='.$revision)
        ->assertOk()->assertHeader('Content-Type', 'image/png');
    expect($assetResponse->headers->get('Cache-Control'))->toContain('private')->toContain('no-store');
    exportGet('assets/asset-'.str_repeat('0', 64).'?'.$fixture['query'].'&revision='.$revision)
        ->assertNotFound();
    DB::table('question_images')->where('id', $imageId)->update(['data' => base64_encode($bytes.'changed')]);
    exportGet('assets/'.$assetId.'?'.$fixture['query'].'&revision='.$revision)->assertStatus(409);
});

it('converts supported grouped, true-false and shared schemas without dropping content', function () {
    $converter = new TestbasePayloadConverter;
    $type = new QuestionType(['schema_key' => 'objective_true_false', 'is_objective' => true]);
    $question = new Question(['schema_key' => 'objective_true_false', 'content' => [
        'prompt_en' => '<p>Zero is positive.</p>', 'correct_boolean' => 'false',
    ]]);
    $question->id = 501;
    $truth = $converter->convert($question, $type, 'ENGLISH');
    expect($truth['schema'])->toBe('TRUE_FALSE')
        ->and($truth['payload']['truth'])->toBeFalse()
        ->and($truth['issues'])->toBeEmpty();

    $type = new QuestionType(['schema_key' => 'objective_passage_mcq', 'is_objective' => true, 'is_single' => true]);
    $question = new Question(['schema_key' => 'objective_passage_mcq', 'content' => [
        'passage_en' => '<p>Read this.</p>',
        'items' => [[
            'prompt_en' => 'Choose one',
            'options' => [
                ['text_en' => 'A', 'is_correct' => false],
                ['text_en' => 'B', 'is_correct' => true],
                ['text_en' => 'C', 'is_correct' => false],
                ['text_en' => 'D', 'is_correct' => false],
            ],
        ]],
    ]]);
    $question->id = 502;
    $passage = $converter->convert($question, $type, 'ENGLISH');
    expect($passage['schema'])->toBe('PASSAGE_OBJECTIVE')
        ->and($passage['payload']['parts'])->toHaveCount(1)
        ->and($passage['payload']['parts'][0]['correctOptionId'])->toBe('op502-0-1')
        ->and($passage['issues'])->toBeEmpty();

    $type = new QuestionType(['schema_key' => 'subjective_same_statement', 'is_objective' => false]);
    $question = new Question(['schema_key' => 'subjective_same_statement', 'content' => [
        'prompt_en' => 'Explain', 'shared_en' => '<p><strong>Shared</strong> text</p>',
    ]]);
    $question->id = 503;
    $shared = $converter->convert($question, $type, 'ENGLISH');
    expect($shared['schema'])->toBe('STANDARD_SUBJECTIVE')
        ->and($shared['payload']['shared']['content'][0]['content'][0]['marks'][0]['type'])->toBe('bold')
        ->and($shared['issues'])->toBeEmpty();

    $type = new QuestionType(['schema_key' => 'subjective_grouped', 'is_objective' => false]);
    $question = new Question(['schema_key' => 'subjective_grouped', 'content' => [
        'intro_en' => '', 'items' => [['prompt_en' => 'Part one', 'answer_en' => 'Answer one']],
    ]]);
    $question->id = 504;
    $grouped = $converter->convert($question, $type, 'ENGLISH');
    expect($grouped['schema'])->toBe('GROUPED_SUBJECTIVE')
        ->and($grouped['payload']['parts'])->toHaveCount(1)
        ->and($grouped['payload']['passage']['en'])->toBeNull()
        ->and($grouped['issues'])->toBeEmpty();
});

it('blocks unsafe HTML but retains available translations for destination validation', function () {
    $converter = new TestbasePayloadConverter;
    $type = new QuestionType(['schema_key' => 'subjective_standard', 'is_objective' => false]);
    $question = new Question(['schema_key' => 'subjective_standard', 'content' => [
        'prompt_en' => '<p><a href="https://example.test">Link</a></p>',
    ]]);
    $question->id = 601;
    expect($converter->convert($question, $type, 'ENGLISH')['payload'])->toBeNull();
    $question->content = ['prompt_en' => 'English only'];
    $missing = $converter->convert($question, $type, 'BOTH');
    expect($missing['payload']['statement']['en'])->not->toBeNull()
        ->and($missing['payload']['statement']['ur'])->toBeNull()
        ->and($missing['issues'])->toBeEmpty();
    $question->content = ['prompt_en' => 'A &amp; B'];
    $decoded = $converter->convert($question, $type, 'ENGLISH');
    expect($decoded['payload']['statement']['en']['content'][0]['content'][0]['text'])->toBe('A & B');
});

it('exports legacy shared images with CSS pixel dimensions through the authenticated API', function () {
    $fixture = exportFixture();
    $imageId = (string) Str::uuid();
    $bytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+juz8AAAAASUVORK5CYII=', true);
    DB::table('question_images')->insert([
        'id' => $imageId, 'mime_type' => 'image/png', 'data' => base64_encode($bytes), 'created_at' => now(),
    ]);
    $fixture['type']->update(['schema_key' => 'subjective_same_statement', 'is_objective' => false]);
    $image = '<img alt="" src="/question-images/'.$imageId.'" width="1" style="height:74px; width:95px" />';
    $content = [
        'prompt_en' => 'Count the objects and write the correct number in the box.',
        'prompt_ur' => 'تصویروں کو گنیں اور دیئے گئے ڈبے میں نمبر لکھیں۔',
        'shared_en' => $image, 'shared_ur' => $image,
        'answer_en' => null, 'answer_ur' => null,
    ];
    $fixture['question']->update(['schema_key' => 'subjective_same_statement', 'content' => $content]);
    $manifest = exportGet('scope?'.$fixture['query'])->assertOk()->json();
    $page = exportGet('questions?'.$fixture['query'].'&revision='.$manifest['revision'].'&pageSize=10')->assertOk()->json();
    $converted = $page['items'][0];
    expect($converted['issues'])->toBeEmpty()
        ->and($converted['payload']['shared']['content'][0]['attrs']['width'])->toBe(95)
        ->and($converted['payload']['shared']['content'][0]['attrs']['height'])->toBe(74)
        ->and($converted['payload']['statement']['ur'])->not->toBeNull()
        ->and($manifest['assets'][0]['available'])->toBeTrue()
        ->and($fixture['question']->fresh()->content)->toBe($content);
    exportGet('assets/'.$manifest['assets'][0]['id'].'?'.$fixture['query'].'&revision='.$manifest['revision'])
        ->assertOk()->assertContent($bytes);
});

it('preserves styled text semantics, inherited marks, table alignment and ordered-list numbering', function () {
    $converter = new TestbasePayloadConverter;
    $type = new QuestionType(['schema_key' => 'subjective_standard', 'is_objective' => false]);
    $question = new Question(['schema_key' => 'subjective_standard', 'content' => [
        'prompt_en' => '<p style="font-weight:700"><span style="font-style:italic; text-decoration:underline line-through">Marked</span><span style="font-weight:normal"> plain</span><span style="vertical-align:super">2</span></p><ol start="3" type="1"><li><strong>Third</strong></li></ol><table><tbody><tr><td style="text-align:center"><u>Cell</u></td></tr></tbody></table>',
    ]]);
    $question->id = 801;
    $converted = $converter->convert($question, $type, 'ENGLISH');
    $blocks = $converted['payload']['statement']['en']['content'];
    expect($converted['issues'])->toBeEmpty()
        ->and(array_column($blocks[0]['content'][0]['marks'], 'type'))->toBe(['bold', 'italic', 'underline', 'strike'])
        ->and($blocks[0]['content'][1])->not->toHaveKey('marks')
        ->and(array_column($blocks[0]['content'][2]['marks'], 'type'))->toBe(['bold', 'superscript'])
        ->and($blocks[1]['attrs'])->toBe(['start' => 3, 'type' => '1'])
        ->and($blocks[2]['content'][0]['content'][0]['attrs']->align)->toBe('center');
    $question->content = ['prompt_en' => '<p><s><span style="text-decoration:underline">Both</span><span style="text-decoration:none">Strike</span></s></p>'];
    $nested = $converter->convert($question, $type, 'ENGLISH')['payload']['statement']['en']['content'][0]['content'];
    expect(array_column($nested[0]['marks'], 'type'))->toContain('strike', 'underline')
        ->and(array_column($nested[1]['marks'], 'type'))->toBe(['strike']);
});

it('reports the exact field, element and unsupported style without dropping source content', function () {
    $converter = new TestbasePayloadConverter;
    $type = new QuestionType(['schema_key' => 'subjective_grouped', 'is_objective' => false]);
    $question = new Question(['schema_key' => 'subjective_grouped', 'content' => [
        'items' => [['prompt_en' => 'Part', 'prompt_ur' => '<p><span style="color:red">اہم</span></p>']],
    ]]);
    $question->id = 802;
    $converted = $converter->convert($question, $type, 'BOTH');
    expect($converted['payload'])->toBeNull()
        ->and($converted['issues'])->toBe(['items[0].prompt_ur: Unsupported style on <span>: color: red.']);
});

it('blocks unsafe events and dimensions that cannot be represented as portable image attributes', function (string $html, string $issue) {
    $converter = new TestbasePayloadConverter;
    $type = new QuestionType(['schema_key' => 'subjective_standard', 'is_objective' => false]);
    $question = new Question(['schema_key' => 'subjective_standard', 'content' => ['prompt_en' => $html]]);
    $question->id = 803;
    $converted = $converter->convert($question, $type, 'ENGLISH');
    expect($converted['payload'])->toBeNull()
        ->and($converted['issues'][0])->toContain('prompt_en:', $issue);
})->with([
    ['<img src="/storage/a.png" style="width:50%">', 'width: 50%'],
    ['<img src="/storage/a.png" style="height:4001px">', 'height: 4001px'],
    ['<span onclick="alert(1)">Text</span>', 'Unsafe HTML attribute'],
    ['<span style="background-image:url(https://example.test/a.png)">Text</span>', 'background-image'],
]);

it('uses the actual answer keys when a source type permits multiple answers', function (string $schema) {
    $converter = new TestbasePayloadConverter;
    $type = new QuestionType(['schema_key' => $schema, 'is_objective' => true, 'is_single' => false]);
    $item = ['prompt_en' => 'Choose one', 'options' => [
        ['text_en' => 'A', 'is_correct' => true],
        ['text_en' => 'B', 'is_correct' => false],
        ['text_en' => 'C', 'is_correct' => false],
        ['text_en' => 'D', 'is_correct' => false],
    ]];
    $content = $schema === 'objective_passage_mcq' ? ['passage_en' => 'Read', 'items' => [$item]] : $item;
    $question = new Question(['schema_key' => $schema, 'content' => $content]);
    $question->id = 804;
    expect($converter->convert($question, $type, 'ENGLISH')['issues'])->toBeEmpty();
    $item['options'][1]['is_correct'] = true;
    $question->content = $schema === 'objective_passage_mcq' ? ['passage_en' => 'Read', 'items' => [$item]] : $item;
    $multiple = $converter->convert($question, $type, 'ENGLISH');
    expect($multiple['payload'])->toBeNull()
        ->and($multiple['issues'])->toBe(['Objective question has multiple correct options.']);
})->with(['objective_mcq', 'objective_passage_mcq']);

it('hashes empty rich attributes as objects in the canonical contract', function () {
    $checksum = new ReflectionMethod(TestbaseExportService::class, 'checksum');
    $actual = $checksum->invoke(new TestbaseExportService, [
        'type' => 'tableCell', 'attrs' => new stdClass, 'content' => [],
    ]);

    expect($actual)->toBe(hash('sha256', '{"attrs":{},"content":[],"type":"tableCell"}'));
});

it('blocks an options-only question if old statement content would be lost', function () {
    $converter = new TestbasePayloadConverter;
    $type = new QuestionType([
        'schema_key' => 'objective_mcq', 'is_objective' => true,
        'is_single' => true, 'options_only' => true,
    ]);
    $question = new Question(['schema_key' => 'objective_mcq', 'content' => [
        'prompt_en' => 'Old statement',
        'options' => [
            ['text_en' => 'A', 'is_correct' => true],
            ['text_en' => 'B', 'is_correct' => false],
            ['text_en' => 'C', 'is_correct' => false],
            ['text_en' => 'D', 'is_correct' => false],
        ],
    ]]);
    $question->id = 701;
    $converted = $converter->convert($question, $type, 'ENGLISH');
    expect($converted['schema'])->toBe('OPTIONS_ONLY_OBJECTIVE')
        ->and($converted['payload'])->toBeNull()
        ->and($converted['issues'])->not->toBeEmpty();
});

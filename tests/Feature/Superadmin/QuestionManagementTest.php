<?php

use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\QuestionType;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function makeQuestionAdmin(): User
{
    return User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
    ]);
}

function makeQuestionContextForManagement(User $creator): array
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
        'subject_type' => 'chapter-wise',
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

    return compact('pattern', 'class', 'subject', 'chapter');
}

function managementQuestionListUrl(array $context): string
{
    return route('superadmin.questions.browse.chapter', [
        $context['pattern'], $context['class'], $context['subject'], $context['chapter'],
    ]);
}

function makeObjectiveQuestionTypeForManagement(User $creator, array $overrides = []): QuestionType
{
    $uuid = Str::lower((string) Str::uuid());

    return QuestionType::create(array_merge([
        'name' => "MCQ {$uuid}",
        'name_ur' => null,
        'heading_en' => "MCQ {$uuid}",
        'heading_ur' => null,
        'description_en' => null,
        'description_ur' => null,
        'have_exercise' => false,
        'have_statement' => true,
        'statement_label' => 'Statement',
        'have_description' => false,
        'description_label' => null,
        'have_answer' => false,
        'is_single' => true,
        'is_objective' => true,
        'schema_key' => 'objective_mcq',
        'objective_type_id' => null,
        'column_per_row' => 1,
        'status' => 1,
        'created_by' => $creator->id,
    ], $overrides));
}

it('creates an objective question with options', function () {
    $admin = makeQuestionAdmin();
    $questionType = makeObjectiveQuestionTypeForManagement($admin);
    $context = makeQuestionContextForManagement($admin);

    $response = $this
        ->actingAs($admin)
        ->post(route('superadmin.questions.store'), [
            'question_type_id' => $questionType->id,
            'chapter_id' => $context['chapter']->id,
            'topic_id' => null,
            'source' => 'exercise',
            'status' => true,
            'content' => [
                'prompt_en' => 'Choose the correct option',
                'prompt_ur' => null,
                'options' => [
                    ['text_en' => 'Option A', 'text_ur' => null, 'is_correct' => true],
                    ['text_en' => 'Option B', 'text_ur' => null, 'is_correct' => false],
                    ['text_en' => 'Option C', 'text_ur' => null, 'is_correct' => false],
                    ['text_en' => 'Option D', 'text_ur' => null, 'is_correct' => false],
                ],
            ],
        ]);

    $question = Question::query()->with('options')->sole();

    $response->assertRedirect(managementQuestionListUrl($context));

    expect($question->question_type_id)->toBe($questionType->id)
        ->and($question->statement_en)->toBe('Choose the correct option')
        ->and($question->answer_en)->toBeNull()
        ->and($question->options)->toHaveCount(4)
        ->and($question->options->where('is_correct', true))->toHaveCount(1)
        ->and($question->options->pluck('text_en')->all())->toBe([
            'Option A',
            'Option B',
            'Option C',
            'Option D',
        ]);

    $this->getJson(route('superadmin.questions.list-data', ['chapter_id' => $context['chapter']->id]))
        ->assertOk()->assertJsonPath('questions.0.id', $question->id)
        ->assertJsonPath('questions.0.options_count', 4);
});

it('allows enabled subjective answers to be omitted on create and edit', function (string $schemaKey, array $content) {
    $admin = makeQuestionAdmin();
    $questionType = makeObjectiveQuestionTypeForManagement($admin, [
        'is_objective' => false,
        'is_single' => false,
        'schema_key' => $schemaKey,
        'have_answer' => true,
    ]);
    $context = makeQuestionContextForManagement($admin);
    $payload = [
        'question_type_id' => $questionType->id,
        'chapter_id' => $context['chapter']->id,
        'topic_id' => null,
        'source' => 'exercise',
        'status' => true,
        'content' => $content,
    ];

    $this->actingAs($admin)
        ->post(route('superadmin.questions.store'), $payload)
        ->assertRedirect(managementQuestionListUrl($context));

    $question = Question::query()->sole();
    expect($question->answer_en)->toBeNull()
        ->and($question->answer_ur)->toBeNull();

    $answeredContent = $content;
    if ($schemaKey === 'subjective_grouped') {
        $answeredContent['items'][0]['answer_en'] = 'Sample answer';
    } else {
        $answeredContent['answer_en'] = 'Sample answer';
    }

    $this->put(route('superadmin.questions.update', $question), [
        ...$payload,
        'content' => $answeredContent,
    ])->assertRedirect(managementQuestionListUrl($context));

    $answeredQuestion = $question->fresh();
    expect($schemaKey === 'subjective_grouped'
        ? $answeredQuestion->content['items'][0]['answer_en']
        : $answeredQuestion->answer_en)->toBe('Sample answer');

    $this->put(route('superadmin.questions.update', $question), $payload)
        ->assertRedirect(managementQuestionListUrl($context));

    $clearedQuestion = $question->fresh();
    expect($schemaKey === 'subjective_grouped'
        ? $clearedQuestion->content['items'][0]['answer_en']
        : $clearedQuestion->answer_en)->toBeNull();
})->with([
    'standard subjective' => ['subjective_standard', ['prompt_en' => 'Explain evaporation.']],
    'same statement' => ['subjective_same_statement', ['prompt_en' => 'Calculate the value.', 'shared_en' => 'x + 2 = 5']],
    'grouped subjective' => ['subjective_grouped', ['intro_en' => 'Answer the following.', 'items' => [['prompt_en' => 'What is evaporation?']]]],
]);

it('sorts questions within one chapter topic and question type scope', function () {
    $admin = makeQuestionAdmin();
    $questionType = makeObjectiveQuestionTypeForManagement($admin);
    $otherType = makeObjectiveQuestionTypeForManagement($admin);
    $context = makeQuestionContextForManagement($admin);

    $questions = collect(['First', 'Second', 'Third'])->map(
        fn (string $statement) => Question::create([
            'question_type_id' => $questionType->id,
            'chapter_id' => $context['chapter']->id,
            'topic_id' => null,
            'statement_en' => $statement,
            'source' => Question::SOURCE_EXERCISE,
            'status' => 1,
            'created_by' => $admin->id,
        ]),
    );
    $otherQuestion = Question::create([
        'question_type_id' => $otherType->id,
        'chapter_id' => $context['chapter']->id,
        'topic_id' => null,
        'statement_en' => 'Other type',
        'source' => Question::SOURCE_EXERCISE,
        'status' => 1,
        'created_by' => $admin->id,
    ]);

    expect($questions->pluck('sort_order')->all())->toBe([1, 2, 3])
        ->and($otherQuestion->sort_order)->toBe(1);

    $order = [
        $questions[2]->id,
        $questions[0]->id,
        $questions[1]->id,
    ];

    $this->actingAs($admin)
        ->post(route('superadmin.questions.reorder'), [
            'chapter_id' => $context['chapter']->id,
            'topic_id' => null,
            'question_type_id' => $questionType->id,
            'order' => $order,
        ])
        ->assertRedirect();

    expect(
        Question::query()
            ->where('chapter_id', $context['chapter']->id)
            ->where('question_type_id', $questionType->id)
            ->orderBy('sort_order')
            ->pluck('id')
            ->all(),
    )->toBe($order)
        ->and($otherQuestion->fresh()->sort_order)->toBe(1);
});

it('updates an objective question and replaces its options', function () {
    $admin = makeQuestionAdmin();
    $questionType = makeObjectiveQuestionTypeForManagement($admin);
    $context = makeQuestionContextForManagement($admin);

    $question = Question::create([
        'question_type_id' => $questionType->id,
        'chapter_id' => $context['chapter']->id,
        'topic_id' => null,
        'statement_en' => 'Original prompt',
        'statement_ur' => null,
        'description_en' => null,
        'description_ur' => null,
        'answer_en' => null,
        'answer_ur' => null,
        'source' => 'exercise',
        'status' => 1,
        'created_by' => $admin->id,
    ]);

    $question->options()->createMany([
        ['text_en' => 'Old A', 'text_ur' => null, 'is_correct' => true, 'sort_order' => 1],
        ['text_en' => 'Old B', 'text_ur' => null, 'is_correct' => false, 'sort_order' => 2],
    ]);

    $response = $this
        ->actingAs($admin)
        ->put(route('superadmin.questions.update', $question), [
            'question_type_id' => $questionType->id,
            'chapter_id' => $context['chapter']->id,
            'topic_id' => null,
            'source' => 'past paper',
            'status' => false,
            'content' => [
                'prompt_en' => 'Updated prompt',
                'prompt_ur' => null,
                'options' => [
                    ['text_en' => 'New A', 'text_ur' => null, 'is_correct' => false],
                    ['text_en' => 'New B', 'text_ur' => null, 'is_correct' => true],
                    ['text_en' => 'New C', 'text_ur' => null, 'is_correct' => false],
                    ['text_en' => 'New D', 'text_ur' => null, 'is_correct' => false],
                ],
            ],
        ]);

    $response->assertRedirect(managementQuestionListUrl($context));

    $question->refresh()->load('options');

    expect($question->statement_en)->toBe('Updated prompt')
        ->and($question->source)->toBe('past paper')
        ->and($question->status)->toBe(0)
        ->and($question->options)->toHaveCount(4)
        ->and($question->options->where('is_correct', true))->toHaveCount(1)
        ->and($question->options->firstWhere('is_correct', true)?->text_en)->toBe('New B')
        ->and(QuestionOption::query()->where('question_id', $question->id)->count())->toBe(4);
});

it('creates a passage based MCQ with nested sub-questions and options', function () {
    $admin = makeQuestionAdmin();
    $questionType = makeObjectiveQuestionTypeForManagement($admin, [
        'name' => 'Passage MCQ',
        'heading_en' => 'Passage MCQ',
        'schema_key' => 'objective_passage_mcq',
    ]);
    $context = makeQuestionContextForManagement($admin);

    $response = $this
        ->actingAs($admin)
        ->post(route('superadmin.questions.store'), [
            'question_type_id' => $questionType->id,
            'chapter_id' => $context['chapter']->id,
            'topic_id' => null,
            'source' => 'exercise',
            'status' => true,
            'content' => [
                'passage_en' => 'Water changes into vapour when heated.',
                'passage_ur' => null,
                'items' => [
                    [
                        'prompt_en' => 'What happens to water when heated?',
                        'prompt_ur' => null,
                        'options' => [
                            ['text_en' => 'It evaporates', 'text_ur' => null, 'is_correct' => true],
                            ['text_en' => 'It freezes', 'text_ur' => null, 'is_correct' => false],
                        ],
                    ],
                    [
                        'prompt_en' => 'What is the passage about?',
                        'prompt_ur' => null,
                        'options' => [
                            ['text_en' => 'Water', 'text_ur' => null, 'is_correct' => true],
                            ['text_en' => 'Metal', 'text_ur' => null, 'is_correct' => false],
                        ],
                    ],
                ],
            ],
        ]);

    $question = Question::query()->with('options')->sole();
    $content = $question->content;

    $response->assertRedirect(
        managementQuestionListUrl($context),
    );

    expect($question->statement_en)
        ->toBe('Water changes into vapour when heated.')
        ->and($question->options)->toHaveCount(0)
        ->and($content['passage_en'])->toBe(
            'Water changes into vapour when heated.',
        )
        ->and($content['items'])->toHaveCount(2)
        ->and($content['items'][0]['options'])->toHaveCount(4)
        ->and($content['items'][0]['options'][0]['text_en'])->toBe(
            'It evaporates',
        )
        ->and($content['items'][1]['options'][0]['is_correct'])->toBeTrue();
});

it('uploads question images only for users who may create or edit questions', function () {
    $admin = makeQuestionAdmin();
    $response = $this->actingAs($admin)->postJson(route('superadmin.questions.images'), [
        'file' => UploadedFile::fake()->image('diagram.png'),
    ])->assertOk();

    expect($response->json('location'))->toStartWith('/question-images/');
    $image = $this->get($response->json('location'))->assertOk();
    expect($image->headers->get('Content-Type'))->toBe('image/png');

    $restricted = User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
        'created_by' => $admin->id,
    ]);
    $this->actingAs($restricted)->postJson(route('superadmin.questions.images'), [
        'file' => UploadedFile::fake()->image('diagram.png'),
    ])->assertForbidden();
});

it('keeps equations and uploaded images in question statements and options', function () {
    $admin = makeQuestionAdmin();
    $type = makeObjectiveQuestionTypeForManagement($admin);
    $context = makeQuestionContextForManagement($admin);
    $imageUrl = $this->actingAs($admin)->postJson(route('superadmin.questions.images'), [
        'file' => UploadedFile::fake()->image('formula.png'),
    ])->assertOk()->json('location');
    $equation = '<span class="tm-equation" data-latex="x^2" data-display="inline">x^2</span>';
    $option = '<p><img src="'.$imageUrl.'" alt="Formula"></p>';

    $this->post(route('superadmin.questions.store'), [
        'question_type_id' => $type->id,
        'chapter_id' => $context['chapter']->id,
        'status' => true,
        'content' => [
            'prompt_en' => '<p>Solve '.$equation.'</p>',
            'options' => [
                ['text_en' => $option, 'is_correct' => true],
                ['text_en' => 'None', 'is_correct' => false],
            ],
        ],
    ])->assertRedirect(managementQuestionListUrl($context));

    $question = Question::query()->with('options')->sole();
    expect($question->statement_en)->toContain('data-latex="x^2"')
        ->and($question->options->first()->text_en)->toContain($imageUrl);
    $this->get($imageUrl)->assertOk();
});

it('treats visually empty rich text as an empty required statement', function () {
    $admin = makeQuestionAdmin();
    $type = makeObjectiveQuestionTypeForManagement($admin);
    $context = makeQuestionContextForManagement($admin);

    $this->actingAs($admin)->post(route('superadmin.questions.store'), [
        'question_type_id' => $type->id,
        'chapter_id' => $context['chapter']->id,
        'status' => true,
        'content' => [
            'prompt_en' => '<p><br></p>',
            'options' => [
                ['text_en' => 'One', 'is_correct' => true],
                ['text_en' => 'Two', 'is_correct' => false],
            ],
        ],
    ])->assertSessionHasErrors('content.prompt_en');

    expect(Question::query()->count())->toBe(0);
});

<?php

use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Pattern;
use App\Models\QatPaper;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\QuestionType;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Subscription;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('QAT transfer lists source questions and copies only the selected ones', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value, 'created_by' => null]);
    $pattern = Pattern::create(['name' => 'Selective source', 'status' => 1]);
    $class = SchoolClass::create(['name' => 'Class 6', 'status' => 1]);
    $subject = Subject::create(['name_eng' => 'Science', 'subject_type' => 'chapter-wise', 'status' => 1]);
    DB::table('pattern_classes')->insert(['pattern_id' => $pattern->id, 'class_id' => $class->id]);
    ClassSubject::create(['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id]);
    $chapter = Chapter::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id,
        'name' => 'Plants', 'status' => 1,
    ]);
    $otherChapter = Chapter::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id,
        'name' => 'Animals', 'status' => 1,
    ]);
    $type = QuestionType::create([
        'name' => 'MCQ', 'heading_en' => 'Choose the answer',
        'have_exercise' => false, 'have_statement' => true,
        'have_description' => false, 'have_answer' => false, 'is_single' => true,
        'is_objective' => true, 'column_per_row' => 1, 'status' => 1,
    ]);
    $first = Question::create([
        'question_type_id' => $type->id, 'chapter_id' => $chapter->id,
        'statement_en' => 'What do leaves do?', 'status' => 1,
    ]);
    $second = Question::create([
        'question_type_id' => $type->id, 'chapter_id' => $chapter->id,
        'statement_en' => 'What do roots do?', 'status' => 1,
    ]);
    $unrelated = Question::create([
        'question_type_id' => $type->id, 'chapter_id' => $otherChapter->id,
        'statement_en' => 'What do animals eat?', 'status' => 1,
    ]);
    $payload = [
        'academic_year' => '2026-27', 'month' => 4,
        'source_pattern_id' => $pattern->id, 'class_id' => $class->id,
        'subject_id' => $subject->id, 'chapter_ids' => [$chapter->id],
    ];

    $this->actingAs($admin)->getJson(route('superadmin.qat-transfer.chapters', [
        'source_pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id,
    ]))->assertOk()
        ->assertJsonPath('0.questions.0.id', $first->id)
        ->assertJsonPath('0.questions.0.summary', 'What do leaves do?')
        ->assertJsonPath('0.questions.1.id', $second->id);

    $this->actingAs($admin)->post(route('superadmin.qat-transfer.store'), [
        ...$payload, 'question_ids' => [$first->id, $unrelated->id],
    ])->assertSessionHasErrors('question_ids');
    expect(DB::table('qat_catalogues')->count())->toBe(0);

    $this->actingAs($admin)->post(route('superadmin.qat-transfer.store'), [
        ...$payload, 'question_ids' => [$first->id],
    ])->assertSessionHasNoErrors();
    expect(DB::table('qat_questions')->pluck('source_question_id')->all())->toBe([$first->id]);

    $this->actingAs($admin)->post(route('superadmin.qat-transfer.store'), [
        ...$payload, 'question_ids' => [$second->id],
    ])->assertSessionHasNoErrors();
    expect(DB::table('qat_questions')->orderBy('source_question_id')->pluck('source_question_id')->all())
        ->toBe([$first->id, $second->id])
        ->and(DB::table('qat_chapter_months')->count())->toBe(1);
});

test('QAT transfer copies one scope once and can assign it to another month', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value, 'created_by' => null]);
    $pattern = Pattern::create(['name' => 'Source Pattern', 'status' => 1]);
    $class = SchoolClass::create(['name' => 'Class 5', 'status' => 1]);
    $subject = Subject::create(['name_eng' => 'Science', 'subject_type' => 'topic-wise', 'status' => 1]);
    DB::table('pattern_classes')->insert(['pattern_id' => $pattern->id, 'class_id' => $class->id]);
    ClassSubject::create(['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id]);
    $chapter = Chapter::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id,
        'name' => 'Plants', 'chapter_number' => 1, 'status' => 1,
    ]);
    $topic = Topic::create(['chapter_id' => $chapter->id, 'name' => 'Leaves', 'status' => 1]);
    $type = QuestionType::create([
        'name' => 'MCQ', 'heading_en' => 'Select the correct answer',
        'have_exercise' => false, 'have_statement' => true,
        'have_description' => false, 'have_answer' => false, 'is_single' => true,
        'is_objective' => true, 'column_per_row' => 1, 'status' => 1,
    ]);
    $question = Question::create([
        'question_type_id' => $type->id, 'chapter_id' => $chapter->id, 'topic_id' => $topic->id,
        'statement_en' => 'What do leaves do?', 'source' => Question::SOURCE_EXERCISE, 'status' => 1,
    ]);
    QuestionOption::create(['question_id' => $question->id, 'text_en' => 'Make food', 'is_correct' => true, 'sort_order' => 1]);
    QuestionOption::create(['question_id' => $question->id, 'text_en' => 'Absorb sunlight', 'is_correct' => false, 'sort_order' => 2]);

    $payload = [
        'academic_year' => '2026-27', 'month' => 4, 'source_pattern_id' => $pattern->id,
        'class_id' => $class->id, 'subject_id' => $subject->id, 'chapter_ids' => [$chapter->id],
    ];
    $otherSubject = Subject::create(['name_eng' => 'Mathematics', 'subject_type' => 'chapter-wise', 'status' => 1]);
    $otherChapter = Chapter::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $otherSubject->id,
        'name' => 'Numbers', 'chapter_number' => 1, 'status' => 1,
    ]);
    $this->actingAs($admin)->get(route('superadmin.qat-catalogue'))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/qat-catalogue')
        ->has('classes.data', 0)
        ->missing('sources')
        ->missing('report'));
    $this->actingAs($admin)->get(route('superadmin.qat-transfer'))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/qat-transfer')
        ->has('sources', 1)
        ->missing('catalogue'));

    $this->actingAs($admin)->post(route('superadmin.qat-transfer.store'), [
        ...$payload, 'chapter_ids' => [$otherChapter->id],
    ])->assertSessionHasErrors('chapter_ids');
    expect(DB::table('qat_catalogues')->count())->toBe(0);

    $this->actingAs($admin)->post(route('superadmin.qat-transfer.store'), $payload)->assertRedirect();
    expect(DB::table('qat_chapters')->count())->toBe(1)
        ->and(DB::table('qat_topics')->count())->toBe(1)
        ->and(DB::table('qat_questions')->count())->toBe(1);
    $copy = json_decode(DB::table('qat_questions')->value('question_data'), true);
    expect($copy['statement_en'])->toBe('What do leaves do?')
        ->and($copy['options'][0]['text_en'])->toBe('Make food')
        ->and($copy['question_type']['name'])->toBe('MCQ');

    $qatClassId = DB::table('qat_classes')->value('id');
    $qatSubjectId = DB::table('qat_subjects')->value('id');
    $qatChapterId = DB::table('qat_chapters')->value('id');
    $qatTopicId = DB::table('qat_topics')->value('id');
    $qatQuestionId = DB::table('qat_questions')->value('id');
    $templatePayload = [
        'qat_subject_id' => $qatSubjectId, 'name' => 'Monthly practice',
        'category' => 'Practice', 'minutes' => 40, 'status' => true,
        'sections' => [['question_type_id' => $type->id, 'quantity' => 1, 'marks' => 2]],
    ];
    $this->actingAs($admin)->get(route('superadmin.qat-templates.index'))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/qat-templates')
        ->has('templates.data', 0)
        ->has('types', 1));
    $this->actingAs($admin)->post(route('superadmin.qat-templates.store'), [
        ...$templatePayload, 'sections' => [['question_type_id' => 999999, 'quantity' => 1, 'marks' => 2]],
    ])->assertSessionHasErrors('sections');
    $this->actingAs($admin)->post(route('superadmin.qat-templates.store'), $templatePayload)
        ->assertRedirect();
    $templateId = DB::table('qat_paper_templates')->value('id');
    expect(json_decode(DB::table('qat_paper_templates')->value('sections'), true))
        ->toBe($templatePayload['sections']);
    $this->actingAs($admin)->put(route('superadmin.qat-templates.update', $templateId), [
        ...$templatePayload, 'name' => 'Updated practice', 'status' => false,
    ])->assertRedirect();
    expect(DB::table('qat_paper_templates')->value('name'))->toBe('Updated practice')
        ->and((int) DB::table('qat_paper_templates')->value('status'))->toBe(0);
    $this->actingAs($admin)->get(route('superadmin.qat-catalogue'))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/qat-catalogue')
        ->has('classes.data', 1)
        ->where('classes.data.0.name', 'Class 5'));
    $this->actingAs($admin)->get(route('superadmin.qat-catalogue.classes.show', $qatClassId))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/qat-catalogue/class')
        ->where('subjects.data.0.subject_name', 'Science'));
    $this->actingAs($admin)->get(route('superadmin.qat-catalogue.subjects.show', [$qatClassId, $qatSubjectId]))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/qat-catalogue/subject')
        ->where('chapters.data.0.question_count', 1)
        ->where('chapters.data.0.months.0', 4));
    $this->actingAs($admin)->get(route('superadmin.qat-catalogue.chapters.show', [$qatClassId, $qatSubjectId, $qatChapterId]))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/qat-catalogue/chapter')
        ->where('topics.data.0.name', 'Leaves'));
    $this->actingAs($admin)->get(route('superadmin.qat-catalogue.questions.index', [$qatClassId, $qatSubjectId, $qatChapterId]))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/qat-catalogue/questions')
        ->where('questions.data.0.statement_en', 'What do leaves do?'));

    DB::table('qat_subjects')->where('id', $qatSubjectId)->update(['qat_class_id' => null]);
    $this->actingAs($admin)->post(route('superadmin.qat-transfer.store'), [
        ...$payload, 'month' => 5,
    ])->assertRedirect();
    expect(DB::table('qat_questions')->count())->toBe(1)
        ->and(DB::table('qat_chapter_months')->count())->toBe(2)
        ->and(DB::table('qat_subjects')->value('qat_class_id'))->toBe($qatClassId)
        ->and(Question::query()->count())->toBe(1);
    $this->actingAs($admin)->post(route('superadmin.qat-transfer.store'), [
        ...$payload, 'month' => 5,
    ])->assertRedirect();
    expect(DB::table('qat_chapter_months')->count())->toBe(2);

    $this->actingAs($admin)->patch(route('superadmin.qat-catalogue.classes.update', $qatClassId), [
        'name' => 'QAT Class 5', 'status' => false,
    ])->assertSessionHasNoErrors();
    $this->actingAs($admin)->patch(route('superadmin.qat-catalogue.subjects.update', [$qatClassId, $qatSubjectId]), [
        'subject_name' => 'QAT Science', 'status' => false,
    ])->assertSessionHasNoErrors();
    $this->actingAs($admin)->patch(route('superadmin.qat-catalogue.chapters.update', [$qatClassId, $qatSubjectId, $qatChapterId]), [
        'name' => 'Invalid syllabus', 'sort_id' => 3, 'status' => true, 'months' => [],
    ])->assertSessionHasErrors('months');
    $this->actingAs($admin)->patch(route('superadmin.qat-catalogue.chapters.update', [$qatClassId, $qatSubjectId, $qatChapterId]), [
        'name' => 'QAT Plants', 'name_ur' => 'پودے', 'chapter_number' => 2,
        'sort_id' => 3, 'status' => false, 'months' => [4, 6],
    ])->assertSessionHasNoErrors();
    $this->actingAs($admin)->patch(route('superadmin.qat-catalogue.topics.update', [$qatClassId, $qatSubjectId, $qatChapterId, $qatTopicId]), [
        'name' => 'QAT Leaves', 'sort_id' => 2, 'status' => false,
    ])->assertSessionHasNoErrors();
    $questionRoute = [$qatClassId, $qatSubjectId, $qatChapterId, $qatQuestionId];
    $this->actingAs($admin)->getJson(route('superadmin.qat-catalogue.questions.edit', $questionRoute))
        ->assertOk()
        ->assertJsonPath('question.content.prompt_en', 'What do leaves do?')
        ->assertJsonPath('question.content.options.0.text_en', 'Make food')
        ->assertJsonPath('question.chapter_id', $qatChapterId)
        ->assertJsonPath('lockedChapterId', $qatChapterId);
    $editPayload = [
        'question_type_id' => $type->id,
        'chapter_id' => $qatChapterId,
        'topic_id' => $qatTopicId,
        'medium_id' => null,
        'source' => Question::SOURCE_EXERCISE,
        'status' => false,
        'content' => [
            'prompt_en' => 'How do leaves make food?',
            'prompt_ur' => '',
            'options' => [
                ['text_en' => 'By photosynthesis', 'text_ur' => '', 'is_correct' => true],
                ['text_en' => 'By breathing', 'text_ur' => '', 'is_correct' => false],
            ],
        ],
    ];
    $this->actingAs($admin)->putJson(route('superadmin.qat-catalogue.questions.update', $questionRoute), [
        ...$editPayload, 'content' => [...$editPayload['content'], 'options' => []],
    ])->assertUnprocessable()->assertJsonValidationErrors('content.options');
    $this->actingAs($admin)->putJson(route('superadmin.qat-catalogue.questions.update', $questionRoute), $editPayload)
        ->assertOk()->assertJsonPath('id', $qatQuestionId);
    expect(DB::table('qat_classes')->value('name'))->toBe('QAT Class 5')
        ->and(DB::table('qat_subjects')->value('subject_name'))->toBe('QAT Science')
        ->and(DB::table('qat_chapters')->value('name'))->toBe('QAT Plants')
        ->and(DB::table('qat_topics')->value('name'))->toBe('QAT Leaves')
        ->and(DB::table('qat_chapter_months')->pluck('month')->sort()->values()->all())->toBe([4, 6])
        ->and(json_decode(DB::table('qat_questions')->value('question_data'), true)['statement_en'])->toBe('How do leaves make food?')
        ->and(json_decode(DB::table('qat_questions')->value('question_data'), true)['options'][0]['text_en'])->toBe('By photosynthesis')
        ->and(json_decode(DB::table('qat_questions')->value('question_data'), true)['content']['options'][1]['text_en'])->toBe('By breathing')
        ->and(Question::query()->first()->statement_en)->toBe('What do leaves do?')
        ->and(SchoolClass::query()->first()->name)->toBe('Class 5');
    $this->actingAs($admin)->get(route('superadmin.qat-catalogue.subjects.show', [$qatClassId, $qatSubjectId]).'?month=5')
        ->assertOk()->assertInertia(fn (Assert $page) => $page->has('chapters.data', 0));
    $this->actingAs($admin)->getJson(route('superadmin.qat-catalogue.questions.edit', [$qatClassId, $qatSubjectId, $qatChapterId + 999, $qatQuestionId]))
        ->assertNotFound();
    $this->actingAs($admin)->putJson(route('superadmin.qat-catalogue.questions.update', [$qatClassId, $qatSubjectId, $qatChapterId + 999, $qatQuestionId]), [
        ...$editPayload, 'chapter_id' => $qatChapterId + 999,
    ])->assertNotFound();

    $groupedType = QuestionType::create([
        'name' => 'Grouped short questions', 'heading_en' => 'Answer the following',
        'have_exercise' => false, 'have_statement' => true,
        'have_description' => false, 'have_answer' => true, 'is_single' => false,
        'is_objective' => false, 'schema_key' => 'subjective_grouped',
        'column_per_row' => 1, 'status' => 1,
    ]);
    $this->actingAs($admin)->putJson(route('superadmin.qat-catalogue.questions.update', $questionRoute), [
        ...$editPayload,
        'question_type_id' => $groupedType->id,
        'content' => [
            'intro_en' => 'Answer these questions about leaves.',
            'items' => [['prompt_en' => 'Name one function.', 'answer_en' => 'Making food.']],
        ],
    ])->assertOk();
    $this->actingAs($admin)->getJson(route('superadmin.qat-catalogue.questions.edit', $questionRoute))
        ->assertJsonPath('question.schema_key', 'subjective_grouped')
        ->assertJsonPath('question.content.items.0.answer_en', 'Making food.');
    expect(Question::query()->findOrFail($question->id)->question_type_id)->toBe($type->id)
        ->and(QuestionOption::query()->where('question_id', $question->id)->count())->toBe(2);
});

test('QAT catalogue requires subscription access', function () {
    $school = User::factory()->create(['user_type' => UserType::Customer->value, 'account_type' => 'paid']);
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value, 'created_by' => null]);
    $pattern = Pattern::create(['name' => 'School source', 'status' => 1]);
    $class = SchoolClass::create(['name' => 'Class 4', 'status' => 1]);
    $subject = Subject::create(['name_eng' => 'English', 'subject_type' => 'chapter-wise', 'status' => 1]);
    DB::table('pattern_classes')->insert(['pattern_id' => $pattern->id, 'class_id' => $class->id]);
    ClassSubject::create(['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id]);
    $catalogueId = DB::table('qat_catalogues')->insertGetId([
        'academic_year' => '2026-27', 'created_at' => now(), 'updated_at' => now(),
    ]);
    $qatClassId = DB::table('qat_classes')->insertGetId([
        'qat_catalogue_id' => $catalogueId, 'source_class_id' => $class->id,
        'name' => $class->name, 'status' => true, 'created_at' => now(), 'updated_at' => now(),
    ]);
    $qatSubjectId = DB::table('qat_subjects')->insertGetId([
        'qat_class_id' => $qatClassId,
        'qat_catalogue_id' => $catalogueId, 'class_id' => $class->id, 'class_name' => $class->name,
        'subject_id' => $subject->id, 'subject_name' => $subject->name_eng,
        'source_pattern_id' => $pattern->id, 'source_pattern_name' => $pattern->name, 'status' => true,
        'created_at' => now(), 'updated_at' => now(),
    ]);
    $subscription = Subscription::create([
        'user_id' => $school->id, 'name' => 'School plan', 'amount' => 1000,
        'started_at' => now()->subDay(), 'duration' => 30, 'expired_at' => now()->addDays(29),
        'status' => 'active', 'created_by' => $admin->id, 'access_scope' => [],
        'allow_qat_tests' => false,
    ]);

    $this->actingAs($school)->get(route('customer.qat.index'))->assertForbidden();
    $this->actingAs($school)->get(route('customer.qat.create', 'auto'))->assertForbidden();
    $this->actingAs($admin)->put(route('superadmin.customers.subscriptions.update', [$school, $subscription]), [
        'name' => $subscription->name,
        'amount' => 1000,
        'started_at' => $subscription->started_at->toDateString(),
        'expired_at' => $subscription->expired_at->toDateString(),
        'status' => 'active',
        'access_scope' => [],
        'allow_qat_tests' => true,
    ])->assertSessionHasNoErrors();
    $this->actingAs($school)->get(route('customer.qat.index'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('customer/qat/index')
            ->has('papers.data', 0));
    $this->actingAs($school)->get(route('customer.qat.create', 'auto'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('customer/qat/create')
            ->where('mode', 'auto')
            ->has('classes', 1)
            ->where('classes.0.name', 'Class 4')
            ->where('classes.0.subject_count', 1));
    $this->actingAs($school)->get(route('customer.qat.create', 'manual'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('mode', 'manual'));
    $this->actingAs($school)->get('/qa-tests/create/invalid')->assertNotFound();

    QatPaper::create([
        'user_id' => $school->id,
        'name' => 'April QAT practice',
        'mode' => 'manual',
        'class_ids' => [$qatClassId],
        'class_names' => 'Class 4',
        'subject_name' => 'English',
        'total_marks' => 20,
        'question_count' => 10,
        'paper_data' => ['sections' => []],
        'is_draft' => false,
    ]);
    QatPaper::create([
        'user_id' => $school->id,
        'name' => 'Unfinished QAT',
        'mode' => 'auto',
        'class_ids' => [$qatClassId],
        'paper_data' => ['sections' => []],
        'is_draft' => true,
    ]);
    $this->actingAs($school)->get(route('customer.qat.index'))->assertInertia(fn (Assert $page) => $page
        ->has('papers.data', 1)
        ->where('papers.data.0.name', 'April QAT practice'));
    $this->actingAs($school)->get(route('customer.qat.index', ['q' => 'missing']))
        ->assertInertia(fn (Assert $page) => $page->has('papers.data', 0));
    $questionType = QuestionType::create([
        'name' => 'QAT MCQ', 'heading_en' => 'Choose the answer',
        'have_exercise' => false, 'have_statement' => true,
        'have_description' => false, 'have_answer' => false, 'is_single' => true,
        'is_objective' => true, 'column_per_row' => 1, 'status' => 1,
    ]);
    $firstChapterId = DB::table('qat_chapters')->insertGetId([
        'qat_subject_id' => $qatSubjectId, 'source_chapter_id' => 101,
        'name' => 'April chapter', 'sort_id' => 1, 'status' => true,
        'created_at' => now(), 'updated_at' => now(),
    ]);
    $secondChapterId = DB::table('qat_chapters')->insertGetId([
        'qat_subject_id' => $qatSubjectId, 'source_chapter_id' => 102,
        'name' => 'May chapter', 'sort_id' => 2, 'status' => true,
        'created_at' => now(), 'updated_at' => now(),
    ]);
    DB::table('qat_chapter_months')->insert([
        ['qat_chapter_id' => $firstChapterId, 'month' => 4],
        ['qat_chapter_id' => $secondChapterId, 'month' => 5],
    ]);
    foreach ([$firstChapterId => 'April question', $secondChapterId => 'May question'] as $chapterId => $statement) {
        DB::table('qat_questions')->insert([
            'qat_chapter_id' => $chapterId,
            'source_question_id' => $chapterId,
            'question_type_id' => $questionType->id,
            'status' => true,
            'question_data' => json_encode([
                'statement_en' => $statement,
                'answer_en' => 'Private answer',
                'question_type' => ['name' => 'QAT MCQ'],
            ]),
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }
    $this->actingAs($school)->get(route('customer.qat.create', 'manual'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('classes.0.subject_count', 1)
            ->has('subjects', 1)
            ->where('subjects.0.chapter_count', 2)
            ->has('chapters', 2));
    $this->actingAs($school)->get(route('customer.qat.subjects.show', $qatSubjectId))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('customer/qat/subject')
        ->has('chapters', 2)
        ->has('questions.data', 2)
        ->where('availableCount', 2)
        ->missing('questions.data.0.question_data'));
    $this->actingAs($school)->get(route('customer.qat.subjects.show', $qatSubjectId).'?month=4')
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('availableCount', 1)
        ->has('chapters', 1)
        ->has('questions.data', 1)
        ->where('questions.data.0.summary', 'April question'));
    $this->actingAs($school)->get(route('customer.qat.subjects.show', $qatSubjectId).'?chapter=999')
        ->assertNotFound();
    $scope = [(string) $pattern->id => [
        'classes' => [(string) $class->id => ['subjects' => [$subject->id]]],
    ]];
    $subscription->update(['access_scope' => $scope]);
    $teacher = User::factory()->create([
        'user_type' => UserType::Teacher->value,
        'status' => UserStatus::Active->value,
        'school_id' => $school->id,
        'teacher_permissions' => ['generate_papers'],
        'access_scope' => $scope,
    ]);
    $this->actingAs($teacher)->get(route('customer.qat.subjects.show', $qatSubjectId))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->where('availableCount', 2));
    $this->actingAs($teacher)->get(route('customer.qat.create', 'manual'))
        ->assertInertia(fn (Assert $page) => $page->has('classes', 1));
    $teacher->update(['access_scope' => []]);
    $this->actingAs($teacher)->get(route('customer.qat.subjects.show', $qatSubjectId))->assertForbidden();
    $this->actingAs($teacher)->get(route('customer.qat.create', 'manual'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('classes', 0)
            ->has('subjects', 0)
            ->has('chapters', 0));
    DB::table('qat_classes')->where('id', $qatClassId)->update(['status' => false]);
    $this->actingAs($school)->get(route('customer.qat.create', 'auto'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('classes', 0));
    $this->actingAs($school)->get(route('customer.qat.subjects.show', $qatSubjectId))->assertNotFound();
    DB::table('qat_classes')->where('id', $qatClassId)->update(['status' => true]);
    DB::table('qat_subjects')->where('qat_class_id', $qatClassId)->update(['status' => false]);
    $this->actingAs($school)->get(route('customer.qat.create', 'auto'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('classes', 0));
});

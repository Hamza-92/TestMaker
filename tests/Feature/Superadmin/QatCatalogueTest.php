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
use App\Models\Subscription;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

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
    $this->actingAs($admin)->patch(route('superadmin.qat-catalogue.questions.update', [$qatClassId, $qatSubjectId, $qatChapterId, $qatQuestionId]), [
        'statement_en' => 'How do leaves make food?', 'status' => false,
    ])->assertSessionHasNoErrors();
    expect(DB::table('qat_classes')->value('name'))->toBe('QAT Class 5')
        ->and(DB::table('qat_subjects')->value('subject_name'))->toBe('QAT Science')
        ->and(DB::table('qat_chapters')->value('name'))->toBe('QAT Plants')
        ->and(DB::table('qat_topics')->value('name'))->toBe('QAT Leaves')
        ->and(DB::table('qat_chapter_months')->pluck('month')->sort()->values()->all())->toBe([4, 6])
        ->and(json_decode(DB::table('qat_questions')->value('question_data'), true)['options'][0]['text_en'])->toBe('Make food')
        ->and(Question::query()->first()->statement_en)->toBe('What do leaves do?')
        ->and(SchoolClass::query()->first()->name)->toBe('Class 5');
    $this->actingAs($admin)->get(route('superadmin.qat-catalogue.subjects.show', [$qatClassId, $qatSubjectId]).'?month=5')
        ->assertOk()->assertInertia(fn (Assert $page) => $page->has('chapters.data', 0));
    $this->actingAs($admin)->patch(route('superadmin.qat-catalogue.questions.update', [$qatClassId, $qatSubjectId, $qatChapterId + 999, $qatQuestionId]), [
        'statement_en' => 'Wrong scope', 'status' => true,
    ])->assertNotFound();
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
    DB::table('qat_subjects')->insert([
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
            ->has('subjects', 1)
            ->where('subjects.0.subject_name', 'English'));
    DB::table('qat_classes')->where('id', $qatClassId)->update(['status' => false]);
    $this->actingAs($school)->get(route('customer.qat.index'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('subjects', 0));
    DB::table('qat_classes')->where('id', $qatClassId)->update(['status' => true]);
    DB::table('qat_subjects')->where('qat_class_id', $qatClassId)->update(['status' => false]);
    $this->actingAs($school)->get(route('customer.qat.index'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('subjects', 0));
});

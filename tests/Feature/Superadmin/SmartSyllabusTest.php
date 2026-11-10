<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Topic;
use App\Models\TrialSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function smartSyllabusScope(): array
{
    $pattern = Pattern::create(['name' => 'Smart Syllabus', 'status' => 1]);
    $class = SchoolClass::create(['name' => '9th', 'status' => 1]);
    $subject = Subject::create(['name_eng' => 'Science', 'subject_type' => 'topic-wise', 'status' => 1]);
    DB::table('pattern_classes')->insert(['pattern_id' => $pattern->id, 'class_id' => $class->id]);
    ClassSubject::create(['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id]);

    $chapter = Chapter::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id,
        'name' => 'First chapter', 'chapter_number' => 1, 'status' => 1,
    ]);
    $secondChapter = Chapter::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id,
        'name' => 'Second chapter', 'chapter_number' => 2, 'status' => 1,
    ]);
    $allowedTopic = Topic::create(['chapter_id' => $chapter->id, 'name' => 'Included', 'status' => 1]);
    $excludedTopic = Topic::create(['chapter_id' => $chapter->id, 'name' => 'Excluded', 'status' => 1]);

    return compact('pattern', 'class', 'subject', 'chapter', 'secondChapter', 'allowedTopic', 'excludedTopic');
}

test('smart syllabus exclusions persist and appear on the customer chapter picker', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);
    TrialSetting::current()->update(['access_scope' => null]);
    extract(smartSyllabusScope());
    $scope = ['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id];

    $this->actingAs($admin)->get(route('superadmin.smart-syllabus'))->assertOk();
    $this->getJson(route('superadmin.smart-syllabus.chapters', $scope))
        ->assertOk()
        ->assertJsonCount(0, 'excludedChapterIds')
        ->assertJsonCount(0, 'excludedTopicIds');

    $this->actingAs($admin)->put(route('superadmin.smart-syllabus.update'), [
        ...$scope,
        'excluded_chapter_ids' => [$secondChapter->id],
        'excluded_topic_ids' => [$excludedTopic->id],
    ])->assertRedirect();

    $this->assertDatabaseHas('smart_syllabus_excluded_chapters', ['chapter_id' => $secondChapter->id]);
    $this->assertDatabaseHas('smart_syllabus_excluded_topics', ['topic_id' => $excludedTopic->id]);

    $this->getJson(route('superadmin.smart-syllabus.chapters', $scope))
        ->assertOk()
        ->assertJsonPath('excludedChapterIds.0', $secondChapter->id)
        ->assertJsonPath('excludedTopicIds.0', $excludedTopic->id);

    $this->actingAs($customer)->getJson(route('customer.papers.generate.chapters', $scope))
        ->assertOk()
        ->assertJsonPath('chapters.0.smart_excluded', false)
        ->assertJsonPath('chapters.0.topics.0.smart_excluded', false)
        ->assertJsonPath('chapters.0.topics.1.smart_excluded', true)
        ->assertJsonPath('chapters.0.topics.1.locked', true)
        ->assertJsonPath('chapters.1.smart_excluded', true)
        ->assertJsonPath('chapters.1.locked', true);

    $this->getJson(route('customer.papers.generate.question-types').'?'.http_build_query([
        'chapter_ids' => [$secondChapter->id],
        'sources' => [Question::SOURCE_EXERCISE],
    ]))->assertForbidden();

    $this->actingAs($admin)->put(route('superadmin.smart-syllabus.update'), [
        ...$scope,
        'excluded_chapter_ids' => [],
        'excluded_topic_ids' => [],
    ])->assertRedirect();
    $this->assertDatabaseCount('smart_syllabus_excluded_chapters', 0);
    $this->assertDatabaseCount('smart_syllabus_excluded_topics', 0);
});

test('smart syllabus rejects content from another subject and blocks excluded questions', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);
    TrialSetting::current()->update(['access_scope' => null]);
    extract(smartSyllabusScope());
    $otherSubject = Subject::create(['name_eng' => 'Other', 'subject_type' => 'chapter-wise', 'status' => 1]);
    ClassSubject::create(['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $otherSubject->id]);
    $otherChapter = Chapter::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $otherSubject->id,
        'name' => 'Foreign chapter', 'chapter_number' => 1, 'status' => 1,
    ]);
    $scope = ['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id];

    $this->actingAs($admin)->from(route('superadmin.smart-syllabus'))
        ->put(route('superadmin.smart-syllabus.update'), [
            ...$scope,
            'excluded_chapter_ids' => [$otherChapter->id],
            'excluded_topic_ids' => [],
        ])->assertSessionHasErrors('excluded_chapter_ids');
    $this->assertDatabaseCount('smart_syllabus_excluded_chapters', 0);

    $type = QuestionType::create([
        'name' => 'Short Questions',
        'heading_en' => 'Answer the short questions',
        'heading_ur' => 'مختصر سوالات کے جواب دیں',
        'have_exercise' => false,
        'have_statement' => true,
        'have_description' => false,
        'have_answer' => false,
        'is_single' => true,
        'is_objective' => false,
        'schema_key' => 'subjective_standard',
        'column_per_row' => 1,
        'status' => 1,
    ]);
    foreach ([$allowedTopic, $excludedTopic] as $topic) {
        Question::create([
            'chapter_id' => $chapter->id, 'topic_id' => $topic->id,
            'question_type_id' => $type->id, 'statement_en' => $topic->name,
            'source' => Question::SOURCE_EXERCISE, 'status' => 1,
        ]);
    }

    $this->actingAs($admin)->put(route('superadmin.smart-syllabus.update'), [
        ...$scope,
        'excluded_chapter_ids' => [],
        'excluded_topic_ids' => [$excludedTopic->id],
    ])->assertRedirect();

    $this->actingAs($customer)->getJson(route('customer.papers.generate.question-types').'?'.http_build_query([
        'chapter_ids' => [$chapter->id],
        'sources' => [Question::SOURCE_EXERCISE],
    ]))->assertOk()->assertJsonPath('sections.0.availableCount', 1);

    $this->getJson(route('customer.papers.generate.question-types').'?'.http_build_query([
        'chapter_ids' => [$chapter->id],
        'topic_ids' => [$excludedTopic->id],
        'sources' => [Question::SOURCE_EXERCISE],
    ]))->assertForbidden();
});

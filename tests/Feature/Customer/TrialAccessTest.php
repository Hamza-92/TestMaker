<?php

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
use App\Support\AppUserAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('gives trial customers the full pattern access configured in trial settings', function () {
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'account_type' => 'trial',
    ]);
    $pattern = Pattern::create([
        'name' => 'Trial Pattern',
        'short_name' => 'TP',
        'status' => 1,
        'created_by' => null,
    ]);
    $schoolClass = SchoolClass::create([
        'name' => 'Trial Class',
        'status' => 1,
        'created_by' => null,
    ]);
    $pattern->classes()->attach($schoolClass->id);

    TrialSetting::current()->update(['access_scope' => null]);

    $access = AppUserAccess::resolve($customer);

    expect($access['scope'])->toBeNull()
        ->and($access['ids']['pattern_access'])->toBeNull()
        ->and(AppUserAccess::allowsPattern($access, $pattern->id))->toBeTrue()
        ->and(AppUserAccess::allowsClass($access, $pattern->id, $schoolClass->id))->toBeTrue();
});

it('shows trial customers only selected chapters and topics in the paper generator', function () {
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'account_type' => 'trial',
    ]);
    $pattern = Pattern::create(['name' => 'Trial Pattern', 'status' => 1]);
    $class = SchoolClass::create(['name' => 'Trial Class', 'status' => 1]);
    $subject = Subject::create(['name_eng' => 'Trial Subject', 'subject_type' => 'chapter-wise', 'status' => 1]);
    DB::table('pattern_classes')->insert(['pattern_id' => $pattern->id, 'class_id' => $class->id]);
    ClassSubject::create(['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id]);

    $allowedChapter = Chapter::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id,
        'name' => 'Allowed chapter', 'chapter_number' => 1, 'status' => 1,
    ]);
    $blockedChapter = Chapter::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id,
        'name' => 'Blocked chapter', 'chapter_number' => 2, 'status' => 1,
    ]);
    $otherSubject = Subject::create(['name_eng' => 'Unconfigured subject', 'subject_type' => 'chapter-wise', 'status' => 1]);
    ClassSubject::create(['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $otherSubject->id]);
    $otherChapter = Chapter::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $otherSubject->id,
        'name' => 'Available by default', 'chapter_number' => 1, 'status' => 1,
    ]);
    $allowedTopic = Topic::create(['chapter_id' => $allowedChapter->id, 'name' => 'Allowed topic', 'status' => 1]);
    $blockedTopic = Topic::create(['chapter_id' => $allowedChapter->id, 'name' => 'Blocked topic', 'status' => 1]);
    $type = QuestionType::create(['name' => 'Trial questions', 'heading_en' => 'Trial questions', 'schema_key' => 'subjective_standard', 'status' => 1]);
    $allowedQuestion = Question::create([
        'question_type_id' => $type->id, 'chapter_id' => $allowedChapter->id,
        'topic_id' => $allowedTopic->id, 'statement_en' => 'Allowed question',
        'source' => Question::SOURCE_EXERCISE, 'status' => 1,
    ]);
    foreach ([[$allowedChapter->id, $blockedTopic->id], [$allowedChapter->id, null], [$blockedChapter->id, null]] as [$chapterId, $topicId]) {
        Question::create([
            'question_type_id' => $type->id, 'chapter_id' => $chapterId, 'topic_id' => $topicId,
            'statement_en' => 'Blocked question', 'source' => Question::SOURCE_EXERCISE, 'status' => 1,
        ]);
    }
    Question::create([
        'question_type_id' => $type->id, 'chapter_id' => $otherChapter->id,
        'statement_en' => 'Unconfigured subject question', 'source' => Question::SOURCE_EXERCISE, 'status' => 1,
    ]);
    TrialSetting::current()->update([
        'access_scope' => null,
        'chapter_access' => ["{$pattern->id}:{$class->id}:{$subject->id}" => [$allowedChapter->id]],
        'topic_access' => ["{$pattern->id}:{$class->id}:{$subject->id}" => [$allowedTopic->id]],
    ]);

    $this->actingAs($customer)->getJson(route('customer.papers.generate.chapters', [
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id,
    ]))->assertOk()
        ->assertJsonCount(1, 'chapters')
        ->assertJsonPath('chapters.0.id', $allowedChapter->id)
        ->assertJsonCount(1, 'chapters.0.topics')
        ->assertJsonPath('chapters.0.topics.0.id', $allowedTopic->id)
        ->assertJsonPath('chapters.0.question_count', 1);

    $this->actingAs($customer)->getJson(route('customer.papers.generate.questions', [
        'chapter_ids' => [$allowedChapter->id], 'sources' => [Question::SOURCE_EXERCISE],
        'question_type_id' => $type->id,
    ]))->assertOk()->assertJsonCount(1, 'questions')->assertJsonPath('questions.0.id', $allowedQuestion->id);

    $this->actingAs($customer)->getJson(route('customer.papers.generate.question-types', [
        'chapter_ids' => [$blockedChapter->id], 'sources' => [Question::SOURCE_EXERCISE],
    ]))->assertForbidden();

    $this->actingAs($customer)->getJson(route('customer.papers.generate.questions', [
        'chapter_ids' => [$allowedChapter->id], 'topic_ids' => [$blockedTopic->id],
        'sources' => [Question::SOURCE_EXERCISE], 'question_type_id' => $type->id,
    ]))->assertForbidden();

    $this->actingAs($customer)->getJson(route('customer.papers.generate.chapters', [
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $otherSubject->id,
    ]))->assertOk()->assertJsonPath('chapters.0.id', $otherChapter->id);
});

<?php

use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Pattern;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Topic;
use App\Models\TrialSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('saves selected trial chapters and topics and loads one subject at a time', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    $pattern = Pattern::create(['name' => 'Trial Pattern', 'status' => 1]);
    $class = SchoolClass::create(['name' => 'Trial Class', 'status' => 1]);
    $subject = Subject::create(['name_eng' => 'Trial Subject', 'subject_type' => 'chapter-wise', 'status' => 1]);
    ClassSubject::create(['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id]);
    $chapter = Chapter::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id,
        'name' => 'Selected chapter', 'chapter_number' => 1, 'status' => 1,
    ]);
    $topic = Topic::create(['chapter_id' => $chapter->id, 'name' => 'Selected topic', 'status' => 1]);
    $key = "{$pattern->id}:{$class->id}:{$subject->id}";

    $this->actingAs($admin)->getJson(route('superadmin.trial-settings.chapters', [
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id,
    ]))->assertOk()
        ->assertJsonCount(1, 'chapters')
        ->assertJsonPath('chapters.0.id', $chapter->id)
        ->assertJsonPath('chapters.0.topics.0.id', $topic->id);

    $this->actingAs($admin)->put(route('superadmin.trial-settings.update'), [
        'trial_duration_days' => 30,
        'allow_subjective_answers' => false,
        'access_scope' => null,
        'chapter_access' => [$key => [$chapter->id]],
        'topic_access' => [$key => [$topic->id]],
    ])->assertRedirect();

    expect(TrialSetting::current()->refresh()->chapter_access)->toBe([$key => [$chapter->id]])
        ->and(TrialSetting::current()->refresh()->topic_access)->toBe([$key => [$topic->id]]);
});

it('rejects topics outside the selected trial chapters', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    $pattern = Pattern::create(['name' => 'Trial Pattern', 'status' => 1]);
    $class = SchoolClass::create(['name' => 'Trial Class', 'status' => 1]);
    $subject = Subject::create(['name_eng' => 'Trial Subject', 'subject_type' => 'chapter-wise', 'status' => 1]);
    ClassSubject::create(['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id]);
    $selected = Chapter::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id,
        'name' => 'Selected', 'status' => 1,
    ]);
    $other = Chapter::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id,
        'name' => 'Other', 'status' => 1,
    ]);
    $topic = Topic::create(['chapter_id' => $other->id, 'name' => 'Other topic', 'status' => 1]);
    $key = "{$pattern->id}:{$class->id}:{$subject->id}";

    $this->actingAs($admin)->from(route('superadmin.trial-settings'))->put(route('superadmin.trial-settings.update'), [
        'trial_duration_days' => 30,
        'access_scope' => null,
        'chapter_access' => [$key => [$selected->id]],
        'topic_access' => [$key => [$topic->id]],
    ])->assertRedirect(route('superadmin.trial-settings'))->assertSessionHasErrors('topic_access');
});

it('converts existing global trial selections into subject rules without losing selected ids', function () {
    $pattern = Pattern::create(['name' => 'Trial Pattern', 'status' => 1]);
    $class = SchoolClass::create(['name' => 'Trial Class', 'status' => 1]);
    $subject = Subject::create(['name_eng' => 'Trial Subject', 'subject_type' => 'chapter-wise', 'status' => 1]);
    $chapter = Chapter::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id,
        'name' => 'Selected chapter', 'status' => 1,
    ]);
    $topic = Topic::create(['chapter_id' => $chapter->id, 'name' => 'Selected topic', 'status' => 1]);
    TrialSetting::current()->update(['chapter_access' => [$chapter->id], 'topic_access' => [$topic->id]]);

    $migration = require database_path('migrations/2026_10_01_000001_scope_existing_trial_content_access.php');
    $migration->up();

    $key = "{$pattern->id}:{$class->id}:{$subject->id}";
    expect(TrialSetting::current()->refresh()->chapter_access)->toBe([$key => [$chapter->id]])
        ->and(TrialSetting::current()->refresh()->topic_access)->toBe([$key => [$topic->id]]);
});

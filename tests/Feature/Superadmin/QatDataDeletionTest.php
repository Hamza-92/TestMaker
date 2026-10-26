<?php

use App\Enums\UserType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function qatDeletionFixture(): array
{
    $catalogue = DB::table('qat_catalogues')->insertGetId([
        'academic_year' => '2026-27', 'created_at' => now(), 'updated_at' => now(),
    ]);
    $class = DB::table('qat_classes')->insertGetId([
        'qat_catalogue_id' => $catalogue, 'source_class_id' => 101,
        'name' => 'Class 5', 'status' => true, 'created_at' => now(), 'updated_at' => now(),
    ]);
    $subject = DB::table('qat_subjects')->insertGetId([
        'qat_catalogue_id' => $catalogue, 'qat_class_id' => $class,
        'class_id' => 101, 'class_name' => 'Class 5', 'subject_id' => 201,
        'subject_name' => 'Science', 'source_pattern_id' => 301,
        'source_pattern_name' => 'Pattern', 'status' => true,
        'created_at' => now(), 'updated_at' => now(),
    ]);
    $chapter = DB::table('qat_chapters')->insertGetId([
        'qat_subject_id' => $subject, 'source_chapter_id' => 401,
        'name' => 'Plants', 'status' => true, 'created_at' => now(), 'updated_at' => now(),
    ]);
    DB::table('qat_chapter_months')->insert(['qat_chapter_id' => $chapter, 'month' => 4]);
    $topic = DB::table('qat_topics')->insertGetId([
        'qat_chapter_id' => $chapter, 'source_topic_id' => 501,
        'name' => 'Leaves', 'status' => true, 'created_at' => now(), 'updated_at' => now(),
    ]);
    $question = DB::table('qat_questions')->insertGetId([
        'qat_chapter_id' => $chapter, 'qat_topic_id' => $topic,
        'source_question_id' => 601, 'question_type_id' => 701,
        'question_data' => json_encode(['statement_en' => 'What do leaves do?']),
        'status' => true, 'created_at' => now(), 'updated_at' => now(),
    ]);
    DB::table('qat_paper_templates')->insert([
        'qat_subject_id' => $subject, 'name' => 'Science template',
        'minutes' => 40, 'sections' => json_encode([]), 'status' => true,
        'created_at' => now(), 'updated_at' => now(),
    ]);

    return compact('class', 'subject', 'chapter', 'topic', 'question');
}

test('superadmin can delete a QAT class and all of its copied data', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value, 'created_by' => null]);
    $ids = qatDeletionFixture();

    $this->actingAs($admin)->delete(route('superadmin.qat-catalogue.classes.destroy', $ids['class']))
        ->assertRedirect();

    foreach (['qat_classes', 'qat_subjects', 'qat_chapters', 'qat_chapter_months', 'qat_topics', 'qat_questions', 'qat_paper_templates'] as $table) {
        expect(DB::table($table)->count())->toBe(0);
    }
    expect(DB::table('qat_catalogues')->count())->toBe(1);
});

test('superadmin can delete each nested QAT record at its own level', function (string $level, string $table) {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value, 'created_by' => null]);
    $ids = qatDeletionFixture();
    $route = match ($level) {
        'subject' => route('superadmin.qat-catalogue.subjects.destroy', [$ids['class'], $ids['subject']]),
        'chapter' => route('superadmin.qat-catalogue.chapters.destroy', [$ids['class'], $ids['subject'], $ids['chapter']]),
        'topic' => route('superadmin.qat-catalogue.topics.destroy', [$ids['class'], $ids['subject'], $ids['chapter'], $ids['topic']]),
        'question' => route('superadmin.qat-catalogue.questions.destroy', [$ids['class'], $ids['subject'], $ids['chapter'], $ids['question']]),
    };

    $this->actingAs($admin)->delete($route)->assertRedirect();

    expect(DB::table($table)->count())->toBe(0);
    if ($level === 'topic') {
        expect(DB::table('qat_questions')->value('qat_topic_id'))->toBeNull();
    }
    if ($level === 'subject') {
        expect(DB::table('qat_paper_templates')->count())->toBe(0);
    }
    if ($level === 'chapter') {
        expect(DB::table('qat_topics')->count())->toBe(0)
            ->and(DB::table('qat_questions')->count())->toBe(0)
            ->and(DB::table('qat_chapter_months')->count())->toBe(0);
    }
})->with([
    ['subject', 'qat_subjects'],
    ['chapter', 'qat_chapters'],
    ['topic', 'qat_topics'],
    ['question', 'qat_questions'],
]);

test('QAT deletion rejects a record outside the requested parent', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value, 'created_by' => null]);
    $ids = qatDeletionFixture();

    $this->actingAs($admin)->delete(route('superadmin.qat-catalogue.subjects.destroy', [$ids['class'] + 1, $ids['subject']]))
        ->assertNotFound();
    $this->actingAs($admin)->delete(route('superadmin.qat-catalogue.chapters.destroy', [$ids['class'], $ids['subject'] + 1, $ids['chapter']]))
        ->assertNotFound();
    $this->actingAs($admin)->delete(route('superadmin.qat-catalogue.topics.destroy', [$ids['class'], $ids['subject'], $ids['chapter'] + 1, $ids['topic']]))
        ->assertNotFound();
    $this->actingAs($admin)->delete(route('superadmin.qat-catalogue.questions.destroy', [$ids['class'], $ids['subject'], $ids['chapter'] + 1, $ids['question']]))
        ->assertNotFound();

    expect(DB::table('qat_questions')->count())->toBe(1)
        ->and(DB::table('qat_topics')->count())->toBe(1);
});

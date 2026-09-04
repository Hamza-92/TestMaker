<?php

use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Medium;
use App\Models\Pattern;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('resolves a subject structure from its pattern and class assignment', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    $pattern = Pattern::create([
        'name' => 'Scoped Structure Pattern',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $topicWiseClass = SchoolClass::create([
        'name' => 'Scoped Topic Class',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $chapterWiseClass = SchoolClass::create([
        'name' => 'Scoped Chapter Class',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $subject = Subject::create([
        'name_eng' => 'Scoped Computer Science',
        'subject_type' => 'chapter-wise',
        'status' => 1,
        'created_by' => $admin->id,
    ]);

    ClassSubject::create([
        'class_id' => $topicWiseClass->id,
        'pattern_id' => $pattern->id,
        'subject_id' => $subject->id,
        'subject_type' => 'topic-wise',
    ]);
    ClassSubject::create([
        'class_id' => $chapterWiseClass->id,
        'pattern_id' => $pattern->id,
        'subject_id' => $subject->id,
        'subject_type' => 'chapter-wise',
    ]);

    $topicWiseChapter = Chapter::create([
        'subject_id' => $subject->id,
        'class_id' => $topicWiseClass->id,
        'pattern_id' => $pattern->id,
        'name' => 'Topic-based chapter',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $chapterWiseChapter = Chapter::create([
        'subject_id' => $subject->id,
        'class_id' => $chapterWiseClass->id,
        'pattern_id' => $pattern->id,
        'name' => 'Chapter-based chapter',
        'status' => 1,
        'created_by' => $admin->id,
    ]);

    expect($topicWiseChapter->effectiveSubjectType())->toBe('topic-wise')
        ->and($chapterWiseChapter->effectiveSubjectType())->toBe('chapter-wise');
});

it('updates scoped structures without losing an existing assignment medium', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    $pattern = Pattern::create([
        'name' => 'Editable Structure Pattern',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $firstClass = SchoolClass::create([
        'name' => 'Editable First Class',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $secondClass = SchoolClass::create([
        'name' => 'Editable Second Class',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $subject = Subject::create([
        'name_eng' => 'Editable Computer Science',
        'subject_type' => 'chapter-wise',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $medium = Medium::query()->firstOrCreate(['name' => 'Both']);

    ClassSubject::create([
        'class_id' => $firstClass->id,
        'pattern_id' => $pattern->id,
        'subject_id' => $subject->id,
        'subject_type' => 'chapter-wise',
        'medium_id' => $medium->id,
    ]);

    $this->actingAs($admin)
        ->put(route('superadmin.subjects.update', $subject), [
            'name_eng' => $subject->name_eng,
            'name_ur' => '',
            'subject_type' => 'chapter-wise',
            'status' => true,
            'links' => [
                [
                    'class_id' => $firstClass->id,
                    'pattern_id' => $pattern->id,
                    'subject_type' => 'topic-wise',
                ],
                [
                    'class_id' => $secondClass->id,
                    'pattern_id' => $pattern->id,
                    'subject_type' => 'chapter-wise',
                ],
            ],
        ])
        ->assertRedirect(route('superadmin.subjects.show', $subject));

    $this->assertDatabaseHas('class_subjects', [
        'class_id' => $firstClass->id,
        'pattern_id' => $pattern->id,
        'subject_id' => $subject->id,
        'subject_type' => 'topic-wise',
        'medium_id' => $medium->id,
    ]);
    $this->assertDatabaseHas('class_subjects', [
        'class_id' => $secondClass->id,
        'pattern_id' => $pattern->id,
        'subject_id' => $subject->id,
        'subject_type' => 'chapter-wise',
    ]);
});

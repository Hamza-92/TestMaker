<?php

use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\PaperQuestionSection;
use App\Models\PaperQuestionSectionScope;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('saves objective heading visibility and bilingual labels for one subject', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    $pattern = Pattern::create(['name' => 'Sections Pattern', 'status' => 1]);
    $class = SchoolClass::create(['name' => 'Sections Class', 'status' => 1]);
    $subject = Subject::create(['name_eng' => 'Sections Subject', 'subject_type' => 'chapter-wise', 'status' => 1]);
    ClassSubject::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'subject_type' => 'chapter-wise',
    ]);

    $scope = [
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
    ];

    $this->actingAs($admin)
        ->patch(route('superadmin.paper-question-sections.scope'), [
            ...$scope,
            'is_active' => true,
            'show_objective_section' => false,
            'objective_label_en' => 'Part I',
            'objective_label_ur' => 'حصہ اول',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('paper_question_section_scopes', [
        ...$scope,
        'is_active' => true,
        'show_objective_section' => false,
        'objective_label_en' => 'Part I',
        'objective_label_ur' => 'حصہ اول',
    ]);

    $this->actingAs($admin)
        ->get(route('superadmin.paper-question-sections', $scope))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/paper-question-sections')
            ->where('sectionSettings.is_active', true)
            ->where('sectionSettings.show_objective_section', false)
            ->where('sectionSettings.objective_label_en', 'Part I')
            ->where('sectionSettings.objective_label_ur', 'حصہ اول'));

    $this->actingAs($admin)
        ->patch(route('superadmin.paper-question-sections.scope'), [
            ...$scope,
            'is_active' => false,
        ])
        ->assertRedirect();

    expect(PaperQuestionSectionScope::query()->first()?->show_objective_section)->toBeFalse();

    $chapter = Chapter::create([
        ...$scope,
        'name' => 'First Chapter',
        'chapter_number' => 1,
        'status' => 1,
    ]);
    $type = QuestionType::create([
        'name' => 'Short Answer',
        'heading_en' => 'Short Answer',
        'is_objective' => false,
        'schema_key' => 'subjective_standard',
        'status' => 1,
    ]);
    Question::create([
        'chapter_id' => $chapter->id,
        'question_type_id' => $type->id,
        'statement_en' => 'What is the answer?',
        'status' => 1,
    ]);

    $this->actingAs($admin)
        ->post(route('superadmin.paper-question-sections.store'), [
            ...$scope,
            'question_type_ids' => [$type->id],
            'label_en' => 'Part I',
            'label_ur' => 'حصہ اول',
        ])
        ->assertRedirect();

    $section = PaperQuestionSection::query()->firstOrFail();
    expect($section->label_en)->toBe('Part I')
        ->and($section->label_ur)->toBe('حصہ اول');

    $this->actingAs($admin)
        ->patch(route('superadmin.paper-question-sections.update', $section), [
            'question_type_ids' => [$type->id],
            'label_en' => 'Part II',
            'label_ur' => 'حصہ دوم',
        ])
        ->assertRedirect();

    expect($section->refresh()->label_en)->toBe('Part II')
        ->and($section->label_ur)->toBe('حصہ دوم');
});

<?php

use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\CustomPaperLayout;
use App\Models\MultipartQuestionSetting;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('saves scoped custom layouts and keeps multipart parts together', function () {
    $this->withoutMiddleware();

    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    $pattern = Pattern::create([
        'name' => 'Custom Layout Pattern',
        'short_name' => 'CLP',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $class = SchoolClass::create([
        'name' => 'Custom Layout Class',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $subject = Subject::create([
        'name_eng' => 'Custom Layout Subject',
        'subject_type' => 'chapter-wise',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    DB::table('pattern_classes')->insert([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
    ]);
    DB::table('class_subjects')->insert([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'medium_id' => null,
    ]);
    $chapter = Chapter::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'name' => 'Custom Layout Chapter',
        'chapter_number' => 1,
        'sort_id' => 1,
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $types = collect(range(1, 4))->map(function (int $index) use ($admin, $chapter) {
        $type = QuestionType::create([
            'name' => "Layout Type {$index}",
            'heading_en' => "Layout heading {$index}",
            'have_exercise' => false,
            'have_statement' => true,
            'have_description' => false,
            'have_answer' => true,
            'is_single' => true,
            'is_objective' => false,
            'schema_key' => 'subjective_standard',
            'column_per_row' => 1,
            'status' => 1,
            'created_by' => $admin->id,
        ]);
        Question::create([
            'question_type_id' => $type->id,
            'chapter_id' => $chapter->id,
            'statement_en' => "Question {$index}",
            'source' => Question::SOURCE_EXERCISE,
            'status' => 1,
            'created_by' => $admin->id,
        ]);

        return $type;
    });
    MultipartQuestionSetting::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'is_active' => true,
        'max_parts' => 2,
        'choice_count' => 1,
        'part_type_ids' => [$types[0]->id, $types[1]->id],
        'created_by' => $admin->id,
    ]);
    $scope = [
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
    ];
    $validSections = [[
        'items' => [
            ['question_type_id' => $types[0]->id],
            ['question_type_id' => $types[1]->id],
            ['question_type_id' => $types[2]->id, 'shared_number_group' => 1, 'or_group' => 1],
            ['question_type_id' => $types[3]->id, 'shared_number_group' => 1, 'or_group' => 1],
        ],
    ]];

    $this->actingAs($admin)
        ->put(route('superadmin.custom-paper-layouts.save'), [
            ...$scope,
            'is_active' => true,
            'sections' => $validSections,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $layout = CustomPaperLayout::query()->with('sections.items')->sole();
    expect($layout->is_active)->toBeTrue()
        ->and($layout->sections)->toHaveCount(1)
        ->and($layout->sections->first()->items)->toHaveCount(4)
        ->and($layout->sections->first()->items->last()->or_group)->toBe(1);

    $this->actingAs($admin)
        ->from(route('superadmin.custom-paper-layouts', $scope))
        ->put(route('superadmin.custom-paper-layouts.save'), [
            ...$scope,
            'is_active' => true,
            'sections' => [
                ['items' => [$validSections[0]['items'][0], $validSections[0]['items'][2], $validSections[0]['items'][3]]],
                ['items' => [$validSections[0]['items'][1]]],
            ],
        ])
        ->assertSessionHasErrors('sections');

    expect($layout->fresh()->sections)->toHaveCount(1);
});

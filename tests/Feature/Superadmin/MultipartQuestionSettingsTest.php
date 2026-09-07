<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\MultipartQuestionSetting;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\TrialSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('allows one question type to supply both multipart parts', function () {
    $admin = User::factory()->create([
        'user_type' => UserType::SuperAdmin->value,
    ]);
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);
    TrialSetting::current()->update(['access_scope' => null]);

    $pattern = Pattern::create([
        'name' => 'Single Type Multipart Pattern',
        'short_name' => 'STM',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $class = SchoolClass::create([
        'name' => 'Single Type Multipart Class',
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $subject = Subject::create([
        'name_eng' => 'Single Type Multipart Subject',
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
        'name' => 'Single Type Multipart Chapter',
        'chapter_number' => 1,
        'sort_id' => 1,
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    $questionType = QuestionType::create([
        'name' => 'Repeated Multipart Type',
        'heading_en' => 'Repeated Multipart Type',
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
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'statement_en' => 'First multipart question from the repeated type.',
        'source' => Question::SOURCE_EXERCISE,
        'status' => 1,
        'created_by' => $admin->id,
    ]);
    Question::create([
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'statement_en' => 'Second multipart question from the repeated type.',
        'source' => Question::SOURCE_EXERCISE,
        'status' => 1,
        'created_by' => $admin->id,
    ]);

    $scope = [
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
    ];

    $this->actingAs($admin)
        ->post(route('superadmin.multipart-question-settings.store'), [
            ...$scope,
            'is_active' => true,
            'max_parts' => 2,
            'choice_count' => 1,
            'heading_en' => 'Multipart Questions',
            'heading_ur' => null,
            'part_type_ids' => [$questionType->id],
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $setting = MultipartQuestionSetting::query()->sole();

    expect($setting->part_type_ids)
        ->toBe([$questionType->id])
        ->and($setting->max_parts)->toBe(2);

    $this->actingAs($customer)
        ->getJson(route('customer.papers.generate.question-types', [
            'chapter_ids' => [$chapter->id],
            'sources' => [Question::SOURCE_EXERCISE],
        ]))
        ->assertOk()
        ->assertJsonPath('multipart.maxParts', 2)
        ->assertJsonCount(1, 'multipart.partTypes')
        ->assertJsonPath('multipart.partTypes.0.id', $questionType->id);
});

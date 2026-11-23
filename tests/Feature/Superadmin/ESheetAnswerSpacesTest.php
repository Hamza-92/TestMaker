<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\ESheetAnswerSpace;
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

it('saves answer lines only for subjective types in the selected scope and serves them to the customer', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);
    TrialSetting::current()->update(['access_scope' => null]);
    $pattern = Pattern::create(['name' => 'E-Sheet Pattern', 'status' => 1]);
    $class = SchoolClass::create(['name' => 'E-Sheet Class', 'status' => 1]);
    $subject = Subject::create(['name_eng' => 'Biology', 'subject_type' => 'chapter-wise', 'status' => 1]);
    $otherSubject = Subject::create(['name_eng' => 'Chemistry', 'subject_type' => 'chapter-wise', 'status' => 1]);
    DB::table('pattern_classes')->insert(['pattern_id' => $pattern->id, 'class_id' => $class->id]);
    foreach ([$subject, $otherSubject] as $item) {
        ClassSubject::create(['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $item->id]);
    }
    $type = QuestionType::create([
        'name' => 'Short Questions', 'heading_en' => 'Short Questions', 'is_objective' => false,
        'schema_key' => 'subjective_standard', 'status' => 1,
    ]);
    $otherType = QuestionType::create([
        'name' => 'Long Questions', 'heading_en' => 'Long Questions', 'is_objective' => false,
        'schema_key' => 'subjective_standard', 'status' => 1,
    ]);
    $chapter = Chapter::create([
        'pattern_id' => $pattern->id, 'class_id' => $class->id,
        'subject_id' => $subject->id, 'name' => 'Chapter', 'chapter_number' => 1, 'status' => 1,
    ]);
    Question::create([
        'question_type_id' => $type->id, 'chapter_id' => $chapter->id,
        'statement_en' => 'Explain photosynthesis.', 'source' => Question::SOURCE_EXERCISE, 'status' => 1,
    ]);
    $scope = ['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id];
    $orderedType = QuestionType::create([
        'name' => 'Structured Questions', 'heading_en' => 'Structured Questions', 'is_objective' => false,
        'schema_key' => 'subjective_standard', 'status' => 1,
    ]);
    Question::create([
        'question_type_id' => $orderedType->id, 'chapter_id' => $chapter->id,
        'statement_en' => 'Describe the process.', 'source' => Question::SOURCE_EXERCISE, 'status' => 1,
    ]);
    DB::table('question_type_orders')->insert([
        ...$scope, 'question_type_id' => $orderedType->id, 'sort_order' => 1,
    ]);

    $this->actingAs($admin)->get(route('superadmin.e-sheet-answer-spaces', $scope))
        ->assertOk()->assertInertia(fn ($page) => $page
        ->component('superadmin/e-sheet-answer-spaces')
        ->where('questionTypes.0.id', $orderedType->id)
        ->where('questionTypes.1.id', $type->id)
        ->where('questionTypes.1.lines', 10)
        ->where('questionTypes.1.page_break', false));

    $this->actingAs($admin)->put(route('superadmin.e-sheet-answer-spaces.update'), [
        ...$scope, 'settings' => [['question_type_id' => $type->id, 'lines' => 14, 'page_break' => true]],
    ])->assertSessionHasNoErrors();
    expect(ESheetAnswerSpace::sole()->lines)->toBe(14);
    expect(ESheetAnswerSpace::sole()->page_break)->toBeTrue();

    $this->actingAs($customer)->getJson(route('customer.papers.generate.e-sheet-answer-spaces', $scope))
        ->assertOk()->assertJsonPath("linesByType.{$type->id}", 14)
        ->assertJsonPath('pageBreakTypeIds', [$type->id]);
    $this->getJson(route('customer.papers.generate.e-sheet-answer-spaces', [
        ...$scope, 'subject_id' => $otherSubject->id,
    ]))->assertOk()->assertExactJson(['linesByType' => [], 'pageBreakTypeIds' => []]);

    $this->actingAs($admin)->put(route('superadmin.e-sheet-answer-spaces.update'), [
        ...$scope, 'settings' => [['question_type_id' => $otherType->id, 'lines' => 12]],
    ])->assertSessionHasErrors('settings');
    $this->put(route('superadmin.e-sheet-answer-spaces.update'), [
        ...$scope, 'settings' => [['question_type_id' => $type->id, 'lines' => 31]],
    ])->assertSessionHasErrors('settings.0.lines');
    expect(ESheetAnswerSpace::sole()->lines)->toBe(14);
});

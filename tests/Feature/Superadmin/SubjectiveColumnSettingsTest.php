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
use App\Models\SubjectiveColumnSetting;
use App\Models\TrialSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('applies scoped subjective columns to single medium unless both is enabled', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);
    TrialSetting::current()->update(['access_scope' => null]);
    $pattern = Pattern::create(['name' => 'Columns Pattern', 'status' => 1]);
    $class = SchoolClass::create(['name' => 'Columns Class', 'status' => 1]);
    $subject = Subject::create(['name_eng' => 'Columns Subject', 'subject_type' => 'chapter-wise', 'status' => 1]);
    $otherSubject = Subject::create(['name_eng' => 'Other Subject', 'subject_type' => 'chapter-wise', 'status' => 1]);
    DB::table('pattern_classes')->insert(['pattern_id' => $pattern->id, 'class_id' => $class->id]);
    foreach ([$subject, $otherSubject] as $item) {
        ClassSubject::create(['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $item->id]);
    }
    $type = QuestionType::create([
        'name' => 'Short Questions', 'heading_en' => 'Short Questions', 'is_objective' => false,
        'schema_key' => 'subjective_standard', 'column_per_row' => 4, 'status' => 1,
    ]);
    $chapters = collect([$subject, $otherSubject])->map(function (Subject $item) use ($pattern, $class, $type) {
        $chapter = Chapter::create([
            'pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $item->id,
            'name' => 'Chapter', 'chapter_number' => 1, 'status' => 1,
        ]);
        Question::create([
            'question_type_id' => $type->id, 'chapter_id' => $chapter->id,
            'statement_en' => 'Explain.', 'source' => Question::SOURCE_EXERCISE, 'status' => 1,
        ]);

        return $chapter;
    });

    $scope = ['pattern_id' => $pattern->id, 'class_id' => $class->id, 'subject_id' => $subject->id];
    $this->actingAs($admin)->get(route('superadmin.subjective-column-settings', $scope))
        ->assertOk()->assertInertia(fn ($page) => $page
        ->component('superadmin/subjective-column-settings')
        ->where('questionTypes.0.columns', 1));

    $this->put(route('superadmin.subjective-column-settings.update'), [
        ...$scope, 'question_type_id' => $type->id, 'columns' => 3, 'apply_to_both' => false,
    ])->assertSessionHasNoErrors();
    expect(SubjectiveColumnSetting::count())->toBe(1);

    $paperTypes = fn (Chapter $chapter, string $medium) => $this->actingAs($customer)
        ->getJson(route('customer.papers.generate.question-types', [
            'chapter_ids' => [$chapter->id], 'sources' => [Question::SOURCE_EXERCISE], 'medium' => $medium,
        ]))->assertOk();
    $paperTypes($chapters[0], 'English')->assertJsonPath('sections.0.columnPerRow', 3);
    $paperTypes($chapters[0], 'Urdu')->assertJsonPath('sections.0.columnPerRow', 3);
    $paperTypes($chapters[0], 'Both')->assertJsonPath('sections.0.columnPerRow', 1);
    $paperTypes($chapters[1], 'English')->assertJsonPath('sections.0.columnPerRow', 1);

    $this->actingAs($admin)->put(route('superadmin.subjective-column-settings.update'), [
        ...$scope, 'question_type_id' => $type->id, 'columns' => 2, 'apply_to_both' => true,
    ])->assertSessionHasNoErrors();
    $paperTypes($chapters[0], 'Both')->assertJsonPath('sections.0.columnPerRow', 2);

    $this->actingAs($admin)->put(route('superadmin.subjective-column-settings.update'), [
        ...$scope, 'question_type_id' => $type->id, 'columns' => 6, 'apply_to_both' => true,
    ])->assertSessionHasErrors('columns');
    expect(SubjectiveColumnSetting::sole()->columns)->toBe(2);

    $this->actingAs($admin)->put(route('superadmin.subjective-column-settings.update'), [
        ...$scope, 'subject_id' => $otherSubject->id + 1000,
        'question_type_id' => $type->id, 'columns' => 4, 'apply_to_both' => false,
    ])->assertSessionHasErrors('subject_id');
    expect(SubjectiveColumnSetting::count())->toBe(1);
});

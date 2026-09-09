<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\MultipartQuestionSetting;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\QuestionTypeHeading;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\TrialSetting;
use App\Models\User;
use App\Support\Questions\QuestionTypeHeadingResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    $this->pattern = Pattern::create([
        'name' => 'Heading pattern', 'short_name' => 'HP', 'status' => 1,
    ]);
    $this->class = SchoolClass::create(['name' => 'Heading class', 'status' => 1]);
    $this->subject = Subject::create([
        'name_eng' => 'Physics', 'subject_type' => 'chapter-wise', 'status' => 1,
    ]);
    DB::table('pattern_classes')->insert([
        'pattern_id' => $this->pattern->id, 'class_id' => $this->class->id,
    ]);
    $this->scope = [
        'pattern_id' => $this->pattern->id,
        'class_id' => $this->class->id,
        'subject_id' => $this->subject->id,
    ];
    DB::table('class_subjects')->insert($this->scope);
    $this->type = QuestionType::create([
        'name' => 'Short Questions',
        'heading_en' => 'Default English',
        'heading_ur' => 'Default Urdu',
        'have_exercise' => false,
        'have_statement' => true,
        'have_description' => false,
        'have_answer' => true,
        'is_single' => true,
        'is_objective' => false,
        'schema_key' => 'subjective_standard',
        'column_per_row' => 1,
        'status' => 1,
    ]);
});

function headingRuleUrl(QuestionType $type): string
{
    return route('superadmin.question-types.heading-rules.update', $type);
}

it('shows a compact type selector and a dedicated rule page', function () {
    $this->actingAs($this->admin)
        ->get(route('superadmin.question-types.headings'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/question-types/headings')
            ->has('questionTypes', 1)
            ->where('questionTypes.0.id', $this->type->id)
            ->where('questionTypes.0.rules_count', 0));

    $this->get(route('superadmin.question-types.heading-rules', $this->type))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('superadmin/question-types/heading-rules')
            ->where('questionType.id', $this->type->id)
            ->where('questionType.heading_en', 'Default English')
            ->has('rules', 0));
});

it('resolves each language from pattern to class to subject independently', function () {
    $this->actingAs($this->admin);
    $scopes = [
        ['pattern_id' => $this->pattern->id],
        ['pattern_id' => $this->pattern->id, 'class_id' => $this->class->id],
        $this->scope,
    ];

    foreach ($scopes as $index => $scope) {
        $this->put(headingRuleUrl($this->type), [
            ...$scope,
            'heading_en' => $index === 2 ? '' : "English {$index}",
            'heading_ur' => $index === 1 ? '' : "Urdu {$index}",
        ])->assertRedirect()->assertSessionHasNoErrors();
    }

    $resolved = QuestionTypeHeadingResolver::apply(
        collect([$this->type]),
        ...array_values($this->scope),
    )->first();

    expect(QuestionTypeHeading::count())->toBe(3)
        ->and($resolved->heading_en)->toBe('English 1')
        ->and($resolved->heading_ur)->toBe('Urdu 2')
        ->and($this->type->fresh()->heading_en)->toBe('Default English');
});

it('updates and removes one scoped rule without affecting broader rules', function () {
    $this->actingAs($this->admin);
    $url = headingRuleUrl($this->type);
    $this->put($url, [
        'pattern_id' => $this->pattern->id, 'heading_en' => 'Pattern heading',
    ])->assertSessionHasNoErrors();
    $this->put($url, [
        ...$this->scope, 'heading_en' => 'Subject heading',
    ])->assertSessionHasNoErrors();
    $this->put($url, [
        ...$this->scope, 'heading_en' => 'Updated subject heading',
    ])->assertSessionHasNoErrors();

    expect(QuestionTypeHeading::count())->toBe(2);
    $subjectRule = QuestionTypeHeading::whereNotNull('subject_id')->sole();
    $this->delete(route('superadmin.question-types.heading-rules.destroy', [
        $this->type, $subjectRule,
    ]))->assertRedirect()->assertSessionHasNoErrors();

    $resolved = QuestionTypeHeadingResolver::apply(
        collect([$this->type]),
        ...array_values($this->scope),
    )->first();
    expect(QuestionTypeHeading::count())->toBe(1)
        ->and($resolved->heading_en)->toBe('Pattern heading');
});

it('validates linked scopes, non-empty headings, ownership, and permissions', function () {
    $otherClass = SchoolClass::create(['name' => 'Unlinked class', 'status' => 1]);
    $otherType = QuestionType::create([
        'name' => 'Other', 'heading_en' => 'Other', 'have_exercise' => false,
        'have_statement' => true, 'have_description' => false, 'have_answer' => true,
        'is_single' => true, 'is_objective' => false, 'schema_key' => 'subjective_standard',
        'column_per_row' => 1, 'status' => 1,
    ]);
    $this->actingAs($this->admin);
    $this->put(headingRuleUrl($this->type), [
        'pattern_id' => $this->pattern->id,
        'class_id' => $otherClass->id,
        'heading_en' => 'Invalid',
    ])->assertSessionHasErrors('class_id');
    $this->put(headingRuleUrl($this->type), [
        'pattern_id' => $this->pattern->id,
        'heading_en' => '',
        'heading_ur' => '',
    ])->assertSessionHasErrors('heading_en');

    $this->put(headingRuleUrl($this->type), [
        'pattern_id' => $this->pattern->id, 'heading_en' => 'Valid',
    ])->assertSessionHasNoErrors();
    $rule = QuestionTypeHeading::sole();
    $this->delete(route('superadmin.question-types.heading-rules.destroy', [
        $otherType, $rule,
    ]))->assertNotFound();

    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);
    $this->actingAs($customer)
        ->get(route('superadmin.question-types.headings'))
        ->assertRedirect('/dashboard');
});

it('uses the resolved heading in the paper catalog and multipart parts', function () {
    $this->actingAs($this->admin)->put(headingRuleUrl($this->type), [
        ...$this->scope,
        'heading_en' => 'Subject heading',
        'heading_ur' => 'Subject Urdu',
    ])->assertSessionHasNoErrors();
    $chapter = Chapter::create([
        ...$this->scope, 'name' => 'Chapter 1', 'chapter_number' => 1,
        'sort_id' => 1, 'status' => 1,
    ]);
    Question::create([
        'chapter_id' => $chapter->id,
        'question_type_id' => $this->type->id,
        'statement_en' => 'A question',
        'source' => 'exercise',
        'status' => 1,
    ]);
    MultipartQuestionSetting::create([
        ...$this->scope,
        'is_active' => true,
        'max_parts' => 2,
        'choice_count' => 1,
        'heading_en' => 'Multipart heading',
        'part_type_ids' => [$this->type->id],
    ]);
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);
    TrialSetting::current()->update(['access_scope' => null]);

    $this->actingAs($customer)
        ->getJson(route('customer.papers.generate.question-types', [
            'chapter_ids' => [$chapter->id], 'sources' => ['exercise'],
        ]))
        ->assertOk()
        ->assertJsonPath('sections.0.headingEnglish', 'Subject heading')
        ->assertJsonPath('sections.0.headingUrdu', 'Subject Urdu')
        ->assertJsonPath('sections.0.titleEnglish', 'Short Questions')
        ->assertJsonPath('multipart.partTypes.0.headingEnglish', 'Subject heading');
});

<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\CustomPaperLayout;
use App\Models\Medium;
use App\Models\MultipartQuestionSetting;
use App\Models\PaperQuestionSection;
use App\Models\PaperQuestionSectionScope;
use App\Models\PaperTemplate;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\QuestionTypeOrder;
use App\Models\QuestionTypeOrGroup;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\TrialSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('a subject assignment medium becomes the generator default without restricting other mediums', function () {
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);
    TrialSetting::current()->update(['access_scope' => null]);

    $pattern = Pattern::create(['name' => 'Medium Pattern', 'status' => 1]);
    $class = SchoolClass::create(['name' => 'Medium Class', 'status' => 1]);
    $subject = Subject::create([
        'name_eng' => 'Computer Science',
        'name_ur' => 'کمپیوٹر سائنس',
        'subject_type' => 'chapter-wise',
        'status' => 1,
    ]);
    $urdu = Medium::query()->firstOrCreate(['name' => 'Urdu']);

    DB::table('pattern_classes')->insert([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
    ]);
    ClassSubject::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'medium_id' => $urdu->id,
    ]);
    $chapter = Chapter::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'name' => 'Introduction',
        'name_ur' => 'تعارف',
        'chapter_number' => 1,
        'status' => 1,
    ]);
    $questionType = QuestionType::create([
        'name' => 'Short Questions',
        'name_ur' => 'مختصر سوالات',
        'heading_en' => 'Answer the short questions',
        'heading_ur' => 'مختصر سوالات کے جواب دیں',
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
    Question::create([
        'question_type_id' => $questionType->id,
        'chapter_id' => $chapter->id,
        'statement_en' => 'What is a computer?',
        'statement_ur' => 'کمپیوٹر کیا ہے؟',
        'source' => Question::SOURCE_EXERCISE,
        'status' => 1,
    ]);

    $this->actingAs($customer)
        ->getJson(route('customer.papers.generate.chapters', [
            'pattern_id' => $pattern->id,
            'class_id' => $class->id,
            'subject_id' => $subject->id,
        ]))
        ->assertOk()
        ->assertJsonPath('medium', 'Urdu')
        ->assertJsonPath('chapters.0.name', 'تعارف');

    $this->actingAs($customer)
        ->getJson(route('customer.papers.generate.question-types', [
            'chapter_ids' => [$chapter->id],
            'sources' => [Question::SOURCE_EXERCISE],
        ]))
        ->assertOk()
        ->assertJsonPath('sections.0.title', 'مختصر سوالات')
        ->assertJsonPath('sections.0.titleEnglish', 'Short Questions')
        ->assertJsonPath('sections.0.titleUrdu', 'مختصر سوالات');

    $this->actingAs($customer)
        ->getJson(route('customer.papers.generate.question-types', [
            'chapter_ids' => [$chapter->id],
            'sources' => [Question::SOURCE_EXERCISE],
            'medium' => 'English',
        ]))
        ->assertOk()
        ->assertJsonPath('sections.0.title', 'Short Questions');
});

test('paper question pickers receive questions in their saved scope order', function () {
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);
    TrialSetting::current()->update(['access_scope' => null]);

    $pattern = Pattern::create(['name' => 'Picker Order Pattern', 'status' => 1]);
    $class = SchoolClass::create(['name' => 'Picker Order Class', 'status' => 1]);
    $subject = Subject::create([
        'name_eng' => 'Picker Order Subject',
        'subject_type' => 'chapter-wise',
        'status' => 1,
    ]);

    DB::table('pattern_classes')->insert([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
    ]);
    ClassSubject::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
    ]);

    $chapter = Chapter::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'name' => 'Picker Order Chapter',
        'chapter_number' => 1,
        'status' => 1,
    ]);
    $questionType = QuestionType::create([
        'name' => 'Picker Order Questions',
        'heading_en' => 'Picker Order Questions',
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

    $questions = collect(['First created', 'Second created', 'Third created'])
        ->map(fn (string $statement) => Question::create([
            'question_type_id' => $questionType->id,
            'chapter_id' => $chapter->id,
            'statement_en' => $statement,
            'source' => Question::SOURCE_EXERCISE,
            'status' => 1,
        ]));

    $questions[0]->update(['sort_order' => 3]);
    $questions[1]->update(['sort_order' => 1]);
    $questions[2]->update(['sort_order' => 2]);

    $this->actingAs($customer)
        ->getJson(route('customer.papers.generate.questions', [
            'chapter_ids' => [$chapter->id],
            'sources' => [Question::SOURCE_EXERCISE],
            'question_type_id' => $questionType->id,
        ]))
        ->assertOk()
        ->assertJsonPath('questions.0.id', $questions[1]->id)
        ->assertJsonPath('questions.1.id', $questions[2]->id)
        ->assertJsonPath('questions.2.id', $questions[0]->id);
});

test('an available dashboard pattern can be preselected on the paper generator', function () {
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);

    $pattern = Pattern::create([
        'name' => 'Punjab Syllabus',
        'short_name' => 'PS',
        'status' => 1,
        'created_by' => null,
    ]);

    TrialSetting::current()->update(['access_scope' => null]);

    $response = $this
        ->actingAs($customer)
        ->get(route('customer.papers.generate', ['pattern' => $pattern->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('customer/papers/generate')
            ->where('initialPatternId', $pattern->id)
        );

    expect(substr_count($response->headers->get('Link', ''), '<'))
        ->toBeLessThanOrEqual(20);
});

test('paper generator returns question types in the saved pattern class subject order', function () {
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);
    TrialSetting::current()->update(['access_scope' => null]);

    $pattern = Pattern::create([
        'name' => 'Generator Pattern',
        'short_name' => 'GP',
        'status' => 1,
    ]);
    $class = SchoolClass::create([
        'name' => 'Generator Class',
        'status' => 1,
    ]);
    $subject = Subject::create([
        'name_eng' => 'Generator Subject',
        'name_ur' => null,
        'subject_type' => 'chapter-wise',
        'status' => 1,
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
        'name' => 'Generator Chapter',
        'chapter_number' => 1,
        'sort_id' => 1,
        'status' => 1,
    ]);

    $makeType = function (string $name, bool $questionTextRtl = false): QuestionType {
        return QuestionType::create([
            'name' => $name,
            'heading_en' => $name,
            'have_exercise' => false,
            'have_statement' => true,
            'have_description' => false,
            'have_answer' => true,
            'is_single' => true,
            'is_objective' => false,
            'question_text_rtl' => $questionTextRtl,
            'schema_key' => 'subjective_standard',
            'column_per_row' => 1,
            'status' => 1,
        ]);
    };

    $first = $makeType('Generator First');
    $second = $makeType('Generator Second', true);

    foreach ([$first, $second] as $questionType) {
        Question::create([
            'question_type_id' => $questionType->id,
            'chapter_id' => $chapter->id,
            'statement_en' => 'Generator question '.$questionType->id,
            'source' => Question::SOURCE_EXERCISE,
            'status' => 1,
        ]);
    }

    QuestionTypeOrder::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'question_type_id' => $second->id,
        'sort_order' => 1,
    ]);
    QuestionTypeOrder::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'question_type_id' => $first->id,
        'sort_order' => 2,
    ]);

    PaperQuestionSectionScope::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'is_active' => true,
        'updated_by' => null,
    ]);
    $paperSection = PaperQuestionSection::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'sort_order' => 2,
        'created_by' => null,
    ]);
    $paperSection->members()->createMany([
        ['question_type_id' => $first->id, 'sort_order' => 0],
        ['question_type_id' => $second->id, 'sort_order' => 1],
    ]);

    $pairing = QuestionTypeOrGroup::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'type_signature' => implode(':', [$first->id, $second->id]),
        'is_active' => true,
        'created_by' => null,
    ]);
    $pairing->members()->createMany([
        ['question_type_id' => $first->id, 'sort_order' => 0],
        ['question_type_id' => $second->id, 'sort_order' => 1],
    ]);

    MultipartQuestionSetting::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'is_active' => true,
        'max_parts' => 2,
        'choice_count' => 1,
        'heading_en' => 'Multipart Questions',
        'part_type_ids' => [$first->id, $second->id],
    ]);

    $this->actingAs($customer)
        ->getJson(route('customer.papers.generate.question-types', [
            'chapter_ids' => [$chapter->id],
            'sources' => [Question::SOURCE_EXERCISE],
        ]))
        ->assertOk()
        ->assertJsonPath('sections.0.questionTypeId', $second->id)
        ->assertJsonPath('sections.0.questionTextRtl', true)
        ->assertJsonPath('sections.0.sortOrder', 1)
        ->assertJsonPath('sections.1.questionTypeId', $first->id)
        ->assertJsonPath('sections.1.questionTextRtl', false)
        ->assertJsonPath('sections.1.sortOrder', 2)
        ->assertJsonCount(1, 'groups')
        ->assertJsonPath('groups.0.id', $pairing->id)
        ->assertJsonPath('groups.0.questionTypeIds', [$first->id, $second->id])
        ->assertJsonPath('multipart.partTypes.0.questionTextRtl', false)
        ->assertJsonPath('multipart.partTypes.1.questionTextRtl', true)
        ->assertJsonPath('paperSectioning.active', true)
        ->assertJsonCount(1, 'paperSectioning.groups')
        ->assertJsonPath('paperSectioning.groups.0.id', $paperSection->id)
        ->assertJsonPath('paperSectioning.groups.0.questionTypeIds', [
            $first->id,
            $second->id,
        ]);

    $customLayout = CustomPaperLayout::create([
        'pattern_id' => $pattern->id,
        'class_id' => $class->id,
        'subject_id' => $subject->id,
        'is_active' => true,
    ]);
    $customSection = $customLayout->sections()->create(['sort_order' => 2]);
    $customSection->items()->createMany([
        [
            'question_type_id' => $second->id,
            'sort_order' => 0,
            'shared_number_group' => 1,
            'or_group' => 1,
        ],
        [
            'question_type_id' => $first->id,
            'sort_order' => 1,
            'shared_number_group' => 1,
            'or_group' => 1,
        ],
    ]);
    $customOrGroupId = -(($customLayout->id * 100000) + 1);

    $this->actingAs($customer)
        ->getJson(route('customer.papers.generate.question-types', [
            'chapter_ids' => [$chapter->id],
            'sources' => [Question::SOURCE_EXERCISE],
        ]))
        ->assertOk()
        ->assertJsonPath('sections.0.questionTypeId', $second->id)
        ->assertJsonPath('sections.0.layoutNumberGroup', "custom:{$customLayout->id}:number:1")
        ->assertJsonPath('sections.0.layoutItemOrder', 0)
        ->assertJsonPath('sections.0.layoutOrGroupId', $customOrGroupId)
        ->assertJsonPath('sections.1.questionTypeId', $first->id)
        ->assertJsonPath('sections.1.layoutItemOrder', 1)
        ->assertJsonPath('groups.0.id', $customOrGroupId)
        ->assertJsonPath('groups.0.questionTypeIds', [$second->id, $first->id])
        ->assertJsonPath('paperSectioning.custom', true)
        ->assertJsonPath('paperSectioning.groups.0.id', $customSection->id);

    $customLayout->update(['is_active' => false]);

    $pairing->update(['is_active' => false]);
    PaperQuestionSectionScope::query()->update(['is_active' => false]);

    $this->actingAs($customer)
        ->getJson(route('customer.papers.generate.question-types', [
            'chapter_ids' => [$chapter->id],
            'sources' => [Question::SOURCE_EXERCISE],
        ]))
        ->assertOk()
        ->assertJsonCount(0, 'groups')
        ->assertJsonPath('paperSectioning.active', false)
        ->assertJsonCount(0, 'paperSectioning.groups');
});

test('paper templates preserve OR metadata without double counting alternative marks', function () {
    $customer = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);
    TrialSetting::current()->update(['access_scope' => null]);

    $this->actingAs($customer)
        ->postJson(route('customer.templates.store'), [
            'name' => 'Paired subjective template',
            'description' => null,
            'settings' => ['headingSize' => 12],
            'structure' => [
                'sections' => [
                    [
                        'questionTypeId' => 10,
                        'category' => 'Subjective Questions',
                        'title' => 'Primary type',
                        'requiredQuestions' => 2,
                        'totalQuestions' => 3,
                        'marksEach' => 1.25,
                        'columns' => 1,
                        'orPairingId' => 4,
                        'orQuestionTypeId' => 11,
                        'orRole' => 'primary',
                    ],
                    [
                        'questionTypeId' => 11,
                        'category' => 'Subjective Questions',
                        'title' => 'Alternative type',
                        'requiredQuestions' => 2,
                        'totalQuestions' => 3,
                        'marksEach' => 1.25,
                        'columns' => 1,
                        'orPairingId' => 4,
                        'orQuestionTypeId' => 10,
                        'orRole' => 'alternative',
                    ],
                ],
            ],
        ])
        ->assertCreated();

    $template = PaperTemplate::query()->where('user_id', $customer->id)->sole();

    expect($template->structure['total_marks'])->toBe(2.5)
        ->and($template->structure['sections'][0]['orRole'])->toBe('primary')
        ->and($template->structure['sections'][1]['orRole'])->toBe('alternative');
});

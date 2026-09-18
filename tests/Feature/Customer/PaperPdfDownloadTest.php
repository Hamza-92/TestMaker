<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Paper;
use App\Models\TrialSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function pdfDownloadCustomer(): User
{
    TrialSetting::current()->update(['access_scope' => null]);

    return User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);
}

test('a saved paper PDF opens the shared browser renderer with its stored paper and set count', function () {
    $customer = pdfDownloadCustomer();
    $paper = Paper::create([
        'user_id' => $customer->id,
        'name' => 'Saved Physics Paper',
        'total_marks' => 20,
        'is_draft' => false,
        'paper_data' => [
            'paper' => [
                'header' => ['subject' => 'Physics'],
                'sections' => [],
            ],
            'pdfState' => [
                'activeSetIndex' => 1,
                'numSets' => 3,
                'viewMode' => 'answer_key',
            ],
        ],
    ]);

    $this->actingAs($customer)
        ->get(route('customer.papers.pdf.saved', $paper))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('customer/papers/generate')
            ->where('autoDownloadPdf', true)
            ->where('savedPaper.id', $paper->id)
            ->where('savedPaper.name', 'Saved Physics Paper')
            ->where('savedPaper.paper.header.subject', 'Physics')
            ->where('savedPaper.pdfState.numSets', 3)
            ->where('savedPaper.pdfState.activeSetIndex', 0)
            ->where('savedPaper.pdfState.viewMode', 'paper')
        );
});

test('a customer cannot download another customers saved paper', function () {
    $owner = pdfDownloadCustomer();
    $otherCustomer = pdfDownloadCustomer();
    $paper = Paper::create([
        'user_id' => $owner->id,
        'name' => 'Private Paper',
        'total_marks' => 10,
        'is_draft' => false,
        'paper_data' => [
            'paper' => ['sections' => []],
        ],
    ]);

    $this->actingAs($otherCustomer)
        ->get(route('customer.papers.pdf.saved', $paper))
        ->assertForbidden();
});

test('saved PDF rendering does not expose restricted subjective answers', function () {
    $customer = pdfDownloadCustomer();
    TrialSetting::current()->update(['allow_subjective_answers' => false]);
    $paper = Paper::create([
        'user_id' => $customer->id,
        'name' => 'Restricted Answers',
        'total_marks' => 10,
        'is_draft' => false,
        'paper_data' => ['paper' => ['sections' => [[
            'category' => 'Subjective Questions',
            'questions' => [['text' => 'Define speed.', 'answerText' => 'Restricted solution']],
        ]]]],
    ]);
    $this->actingAs($customer)
        ->get(route('customer.papers.pdf.saved', $paper))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('savedPaper.paper.sections.0.questions.0.answerText', null)
            ->where('canViewSubjectiveAnswers', false)
        );
});

test('saved PDF rendering rejects papers without printable data', function () {
    $customer = pdfDownloadCustomer();
    $paper = Paper::create([
        'user_id' => $customer->id, 'name' => 'Empty', 'total_marks' => 0,
        'is_draft' => false, 'paper_data' => [],
    ]);
    $this->actingAs($customer)->get(route('customer.papers.pdf.saved', $paper))->assertStatus(422);
});

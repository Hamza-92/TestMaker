<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Paper;
use App\Models\TrialSetting;
use App\Models\User;
use App\Support\PaperPdfExporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;

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

test('a generated paper can be downloaded from its current unsaved state', function () {
    $customer = pdfDownloadCustomer();
    $paperData = [
        'paper' => [
            'header' => ['subject' => 'Physics'],
            'sections' => [],
        ],
        'pdfState' => [
            'activeSetIndex' => 0,
            'numSets' => 2,
            'viewMode' => 'answer_key',
        ],
    ];

    $this->mock(PaperPdfExporter::class, function (MockInterface $mock) use ($paperData): void {
        $mock->shouldReceive('download')
            ->once()
            ->withArgs(fn ($request, $data, $name) => $request->user() !== null
                && $data === $paperData
                && $name === 'Current Physics Paper')
            ->andReturn(response()->download(__FILE__, 'current-paper.pdf'));
    });

    $this->actingAs($customer)
        ->post(route('customer.papers.pdf.download'), [
            'name' => 'Current Physics Paper',
            'paper_data' => $paperData,
        ])
        ->assertOk()
        ->assertDownload('current-paper.pdf');
});

test('a saved paper PDF uses its stored paper and saved set count', function () {
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

    $this->mock(PaperPdfExporter::class, function (MockInterface $mock): void {
        $mock->shouldReceive('download')
            ->once()
            ->withArgs(fn ($request, $data, $name) => $request->user() !== null
                && data_get($data, 'pdfState.numSets') === 3
                && data_get($data, 'pdfState.activeSetIndex') === 0
                && data_get($data, 'pdfState.viewMode') === 'paper'
                && $name === 'Saved Physics Paper')
            ->andReturn(response()->download(__FILE__, 'saved-paper.pdf'));
    });

    $this->actingAs($customer)
        ->get(route('customer.papers.pdf.saved', $paper))
        ->assertOk()
        ->assertDownload('saved-paper.pdf');
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

<?php

use App\Enums\AccountType;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Paper;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('a teacher who can generate papers can save and update their paper', function () {
    $school = User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
        'account_type' => AccountType::Trial->value,
    ]);
    $teacher = User::factory()->create([
        'user_type' => UserType::Teacher->value,
        'status' => UserStatus::Active->value,
        'school_id' => $school->id,
        'teacher_permissions' => ['generate_papers'],
    ]);

    $payload = [
        'name' => 'Generated Physics Paper',
        'subject' => 'Physics',
        'class_name' => '10th',
        'total_marks' => 20,
        'is_draft' => false,
        'paper_data' => ['paper' => ['sections' => []]],
    ];

    $response = $this
        ->actingAs($teacher)
        ->postJson(route('customer.papers.store'), $payload);

    $response
        ->assertCreated()
        ->assertJsonPath('name', 'Generated Physics Paper');

    $paper = Paper::findOrFail($response->json('id'));
    expect($paper->user_id)->toBe($teacher->id);

    expect(DB::table('papers')->where('id', $paper->id)->value('paper_data'))
        ->toContain('__tm_compressed');
    expect($paper->paper_data)->toBe($payload['paper_data']);
    $this
        ->actingAs($teacher)
        ->putJson(route('customer.papers.update', $paper), [
            ...$payload,
            'name' => 'Updated Physics Paper',
        ])
        ->assertOk();

    expect($paper->fresh()->name)->toBe('Updated Physics Paper');
});

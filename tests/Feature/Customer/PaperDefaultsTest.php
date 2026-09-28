<?php

use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Paper;
use App\Models\PaperDefault;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function paperDefaultsCustomer(): User
{
    return User::factory()->create([
        'user_type' => UserType::Customer->value,
        'status' => UserStatus::Active->value,
    ]);
}

function paperDefaultsPayload(): array
{
    return [
        'settings' => ['headerTemplate' => 'centered', 'questionSize' => 14, 'marginTop' => 12, 'repeatTableHeaders' => true],
        'header' => ['exam' => 'Monthly Test', 'section' => '', 'type' => 'Assessment', 'duration' => '1 hour'],
        'viewMode' => 'answers_on_paper',
        'numSets' => 2,
    ];
}

test('customers can save and reload their paper defaults without changing existing papers', function () {
    $customer = paperDefaultsCustomer();
    $other = paperDefaultsCustomer();
    $paper = Paper::create([
        'user_id' => $customer->id, 'name' => 'Existing Paper', 'total_marks' => 10,
        'paper_data' => ['paper' => ['settings' => ['questionSize' => 12]]], 'is_draft' => false,
    ]);

    $this->actingAs($customer)->get(route('customer.settings'))->assertOk();
    $this->actingAs($customer)->from(route('customer.settings'))
        ->put(route('customer.settings.update'), paperDefaultsPayload())
        ->assertRedirect(route('customer.settings'));

    $defaults = PaperDefault::where('user_id', $customer->id)->firstOrFail();
    expect($defaults->settings['questionSize'])->toBe(14);
    expect($defaults->header['section'])->toBe('');
    expect($defaults->num_sets)->toBe(2);
    expect($paper->fresh()->paper_data['paper']['settings']['questionSize'])->toBe(12);

    $page = $this->actingAs($customer)->get(route('customer.settings'))->assertOk()->viewData('page');
    expect($page['component'])->toBe('customer/paper-defaults');
    expect($page['props']['paperDefaults']['header']['exam'])->toBe('Monthly Test');

    $page = $this->actingAs($other)->get(route('customer.settings'))->assertOk()->viewData('page');
    expect($page['props']['paperDefaults'])->toBeNull();
});

test('generation receives school defaults for the customer and their teachers', function () {
    $customer = paperDefaultsCustomer();
    $this->actingAs($customer)->put(route('customer.settings.update'), paperDefaultsPayload())->assertRedirect();
    $teacher = User::factory()->create([
        'user_type' => UserType::Teacher->value, 'status' => UserStatus::Active->value,
        'school_id' => $customer->id, 'teacher_permissions' => ['generate_papers'],
    ]);

    foreach ([$customer, $teacher] as $user) {
        $props = $this->actingAs($user)->get(route('customer.papers.generate'))->assertOk()->viewData('page')['props'];
        expect($props['paperDefaults']['settings']['marginTop'])->toBe(12);
        expect($props['paperDefaults']['viewMode'])->toBe('answers_on_paper');
    }
});

test('teachers cannot change school paper defaults', function () {
    $customer = paperDefaultsCustomer();
    $teacher = User::factory()->create([
        'user_type' => UserType::Teacher->value, 'status' => UserStatus::Active->value,
        'school_id' => $customer->id, 'teacher_permissions' => ['generate_papers'],
    ]);

    $this->actingAs($teacher)->get(route('customer.settings'))->assertNotFound();
    $this->actingAs($teacher)->put(route('customer.settings.update'), paperDefaultsPayload())->assertNotFound();
    $this->actingAs($teacher)->delete(route('customer.settings.reset'))->assertNotFound();
    expect(PaperDefault::count())->toBe(0);
});

test('uploaded watermark images accepted by the shared settings drawer can be saved', function () {
    $customer = paperDefaultsCustomer();
    $payload = paperDefaultsPayload();
    $payload['settings']['watermarkType'] = 'logo';
    $payload['settings']['watermarkLogoUrl'] = 'data:image/svg+xml;base64,'.base64_encode('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');

    $this->actingAs($customer)->put(route('customer.settings.update'), $payload)->assertRedirect()->assertSessionHasNoErrors();
    expect(PaperDefault::where('user_id', $customer->id)->firstOrFail()->settings['watermarkLogoUrl'])
        ->toBe($payload['settings']['watermarkLogoUrl']);
});

test('invalid paper defaults and structural assignment overrides are rejected', function (string $key, mixed $value, string $error) {
    $customer = paperDefaultsCustomer();
    $payload = paperDefaultsPayload();
    data_set($payload, $key, $value);

    $this->actingAs($customer)->put(route('customer.settings.update'), $payload)->assertSessionHasErrors($error);
    expect(PaperDefault::count())->toBe(0);
})->with([
    ['settings.marginTop', 500, 'settings.marginTop'],
    ['settings.paperLayout', 'federal-board', 'settings'],
    ['settings.objectiveLayout', 'federal-row', 'settings'],
    ['settings.watermarkLogoUrl', 'javascript:alert(1)', 'settings.watermarkLogoUrl'],
    ['header.marks', 900, 'header'],
    ['numSets', 9, 'numSets'],
    ['viewMode', 'subjective_answers', 'viewMode'],
]);

test('restoring system defaults only removes the current customer preferences', function () {
    $customer = paperDefaultsCustomer();
    $other = paperDefaultsCustomer();
    foreach ([$customer, $other] as $user) {
        $this->actingAs($user)->put(route('customer.settings.update'), paperDefaultsPayload())->assertRedirect();
    }

    $this->actingAs($customer)->from(route('customer.settings'))->delete(route('customer.settings.reset'))
        ->assertRedirect(route('customer.settings'));
    expect(PaperDefault::where('user_id', $customer->id)->exists())->toBeFalse();
    expect(PaperDefault::where('user_id', $other->id)->exists())->toBeTrue();
    $props = $this->actingAs($customer)->get(route('customer.papers.generate'))->assertOk()->viewData('page')['props'];
    expect($props['paperDefaults'])->toBeNull();
});

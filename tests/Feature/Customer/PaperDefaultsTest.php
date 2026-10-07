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

test('customers can save an Arabic paper font', function (string $font) {
    $customer = paperDefaultsCustomer();
    $payload = paperDefaultsPayload();
    $payload['settings']['urduFont'] = $font;

    $this->actingAs($customer)->put(route('customer.settings.update'), $payload)
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(PaperDefault::where('user_id', $customer->id)->firstOrFail()->settings['urduFont'])
        ->toBe($font);
})->with(['noto-naskh-arabic', 'amiri', 'noto-sans-arabic', 'noto-kufi-arabic']);

test('customers can save print copies, side by side layout, and orientation', function () {
    $customer = paperDefaultsCustomer();
    $payload = paperDefaultsPayload();
    $payload['settings'] += [
        'printCopies' => 3,
        'sideBySideCopiesEnabled' => true,
        'orientation' => 'landscape',
    ];

    $this->actingAs($customer)->put(route('customer.settings.update'), $payload)
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $settings = PaperDefault::where('user_id', $customer->id)->firstOrFail()->settings;
    expect($settings['printCopies'])->toBe(3);
    expect($settings['sideBySideCopiesEnabled'])->toBeTrue();
    expect($settings['orientation'])->toBe('landscape');
});

test('customers can save circled objective option labels', function () {
    $customer = paperDefaultsCustomer();
    $payload = paperDefaultsPayload();
    $payload['settings']['objectiveOptionBubblesEnabled'] = true;

    $this->actingAs($customer)->put(route('customer.settings.update'), $payload)
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(PaperDefault::where('user_id', $customer->id)->firstOrFail()->settings['objectiveOptionBubblesEnabled'])
        ->toBeTrue();
});

test('school users cannot change or erase a saved watermark through paper defaults', function () {
    $customer = paperDefaultsCustomer();
    PaperDefault::create([
        'user_id' => $customer->id,
        'settings' => [
            'questionSize' => 12,
            'watermarkType' => 'logo',
            'watermarkLogoUrl' => '/storage/approved-watermark.png',
            'watermarkOpacity' => 25,
        ],
        'header' => ['exam' => 'Existing'],
        'view_mode' => 'paper',
        'num_sets' => 1,
    ]);

    $page = $this->actingAs($customer)->get(route('customer.settings'))->assertOk()->viewData('page');
    expect($page['props']['canEditWatermark'])->toBeFalse();

    $payload = paperDefaultsPayload();
    $payload['settings'] += [
        'watermarkType' => 'text',
        'watermarkText' => 'Changed',
        'watermarkLogoUrl' => '/storage/replacement.png',
        'watermarkOpacity' => 80,
    ];
    $this->actingAs($customer)->put(route('customer.settings.update'), $payload)
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $settings = PaperDefault::where('user_id', $customer->id)->firstOrFail()->settings;
    expect($settings['questionSize'])->toBe(14)
        ->and($settings['watermarkType'])->toBe('logo')
        ->and($settings['watermarkLogoUrl'])->toBe('/storage/approved-watermark.png')
        ->and($settings['watermarkOpacity'])->toBe(25)
        ->and($settings)->not->toHaveKey('watermarkText');

    $this->actingAs($customer)->delete(route('customer.settings.reset'))->assertRedirect();
    $settings = PaperDefault::where('user_id', $customer->id)->firstOrFail()->settings;
    expect($settings['watermarkType'])->toBe('logo')
        ->and($settings['watermarkLogoUrl'])->toBe('/storage/approved-watermark.png')
        ->and($settings)->not->toHaveKey('questionSize');
});

test('a superadmin impersonating a school can change its watermark', function () {
    $admin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    $customer = paperDefaultsCustomer();
    $payload = paperDefaultsPayload();
    $payload['settings'] += [
        'watermarkType' => 'logo',
        'watermarkLogoUrl' => '/storage/admin-watermark.png',
        'watermarkOpacity' => 30,
    ];

    $page = $this->actingAs($customer)
        ->withSession(['impersonator_id' => $admin->id])
        ->get(route('customer.settings'))->assertOk()->viewData('page');
    expect($page['props']['canEditWatermark'])->toBeTrue();

    $generatePage = $this->actingAs($customer)
        ->get(route('customer.papers.generate'))->assertOk()->viewData('page');
    expect($generatePage['props']['canEditWatermark'])->toBeTrue();

    $this->actingAs($customer)->put(route('customer.settings.update'), $payload)
        ->assertRedirect()
        ->assertSessionHasNoErrors();
    expect(PaperDefault::where('user_id', $customer->id)->firstOrFail()->settings['watermarkLogoUrl'])
        ->toBe('/storage/admin-watermark.png');
});

test('staff impersonation does not unlock school watermark settings', function () {
    $staff = User::factory()->create(['user_type' => UserType::Staff->value]);
    $customer = paperDefaultsCustomer();

    $page = $this->actingAs($customer)
        ->withSession(['impersonator_id' => $staff->id])
        ->get(route('customer.settings'))->assertOk()->viewData('page');
    expect($page['props']['canEditWatermark'])->toBeFalse();

    $generatePage = $this->actingAs($customer)
        ->get(route('customer.papers.generate'))->assertOk()->viewData('page');
    expect($generatePage['props']['canEditWatermark'])->toBeFalse();

    $payload = paperDefaultsPayload();
    $payload['settings']['watermarkText'] = 'Not allowed';
    $this->actingAs($customer)->put(route('customer.settings.update'), $payload)
        ->assertRedirect()
        ->assertSessionHasNoErrors();
    expect(PaperDefault::where('user_id', $customer->id)->firstOrFail()->settings)
        ->not->toHaveKey('watermarkText');
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
        expect($props['canEditWatermark'])->toBeFalse();
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
    $superadmin = User::factory()->create(['user_type' => UserType::SuperAdmin->value]);
    $payload = paperDefaultsPayload();
    $payload['settings']['watermarkType'] = 'logo';
    $payload['settings']['watermarkLogoUrl'] = 'data:image/svg+xml;base64,'.base64_encode('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');

    $this->actingAs($customer)->withSession(['impersonator_id' => $superadmin->id])
        ->put(route('customer.settings.update'), $payload)->assertRedirect()->assertSessionHasNoErrors();
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
    ['settings.printCopies', 5, 'settings.printCopies'],
    ['settings.sideBySideCopiesEnabled', 'invalid', 'settings.sideBySideCopiesEnabled'],
    ['settings.objectiveOptionBubblesEnabled', 'invalid', 'settings.objectiveOptionBubblesEnabled'],
    ['settings.multiplePerSheetEnabled', true, 'settings'],
    ['settings.papersPerSheet', 2, 'settings'],
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

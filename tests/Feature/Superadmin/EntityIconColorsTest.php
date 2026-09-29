<?php

use App\Enums\UserType;
use App\Models\ClassSubject;
use App\Models\Medium;
use App\Models\Pattern;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->master = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'created_by' => null,
    ]);
    $this->pattern = Pattern::create(['name' => 'Color Pattern', 'status' => 1]);
});

it('saves class colors without changing its linked patterns or order', function () {
    $payload = ['name' => 'Color Class', 'status' => 1, 'color' => '#059669', 'pattern_ids' => [$this->pattern->id]];
    $this->actingAs($this->master)->post(route('superadmin.classes.store'), $payload)->assertSessionHasNoErrors()->assertRedirect();
    $class = SchoolClass::where('name', 'Color Class')->firstOrFail();
    $order = $class->sort_order;
    expect($class->color)->toBe('#059669');
    $this->get(route('superadmin.classes.edit', $class))->assertOk()->assertInertia(fn ($page) => $page->where('schoolClass.color', '#059669'));

    $this->put(route('superadmin.classes.update', $class), [...$payload, 'color' => '#db2777'])->assertSessionHasNoErrors()->assertRedirect();
    expect($class->fresh()->color)->toBe('#db2777')
        ->and($class->fresh()->sort_order)->toBe($order)
        ->and($class->patterns()->pluck('patterns.id')->all())->toBe([$this->pattern->id]);
    expect($class->auditLogs()->where('event', 'updated')->first()->new_values['color'])->toBe('#db2777');

    unset($payload['color']);
    $this->put(route('superadmin.classes.update', $class), $payload)->assertSessionHasNoErrors();
    expect($class->fresh()->color)->toBe('#db2777');
    $this->put(route('superadmin.classes.update', $class), [...$payload, 'color' => ''])->assertSessionHasNoErrors();
    expect($class->fresh()->color)->toBeNull();
});

it('saves subject colors without changing its scoped structure or medium', function () {
    $class = SchoolClass::create(['name' => 'Subject Color Class', 'status' => 1]);
    $this->pattern->classes()->attach($class);
    $medium = Medium::firstOrCreate(['name' => 'Urdu']);
    $payload = [
        'name_eng' => 'Color Subject', 'name_ur' => 'اردو', 'subject_type' => 'chapter-wise', 'status' => 1, 'color' => '#ea580c',
        'links' => [['pattern_id' => $this->pattern->id, 'class_id' => $class->id, 'subject_type' => 'topic-wise', 'medium_id' => $medium->id]],
    ];
    $this->actingAs($this->master)->post(route('superadmin.subjects.store'), $payload)->assertSessionHasNoErrors()->assertRedirect();
    $subject = Subject::where('name_eng', 'Color Subject')->firstOrFail();
    $assignment = ClassSubject::where('subject_id', $subject->id)->firstOrFail();
    $original = $assignment->only(['id', 'pattern_id', 'class_id', 'subject_id', 'subject_type', 'medium_id']);
    expect($subject->color)->toBe('#ea580c');
    $this->get(route('superadmin.subjects.edit', $subject))->assertOk()->assertInertia(fn ($page) => $page->where('subject.color', '#ea580c'));

    $this->put(route('superadmin.subjects.update', $subject), [...$payload, 'color' => '#0284c7'])->assertSessionHasNoErrors()->assertRedirect();
    expect($subject->fresh()->color)->toBe('#0284c7')
        ->and($assignment->fresh()->only(array_keys($original)))->toBe($original);
    expect($subject->auditLogs()->where('event', 'updated')->first()->new_values['color'])->toBe('#0284c7');

    unset($payload['color']);
    $this->put(route('superadmin.subjects.update', $subject), $payload)->assertSessionHasNoErrors();
    expect($subject->fresh()->color)->toBe('#0284c7');
    $this->put(route('superadmin.subjects.update', $subject), [...$payload, 'color' => ''])->assertSessionHasNoErrors();
    expect($subject->fresh()->color)->toBeNull();
});

it('rejects invalid colors without creating catalog data', function (string $entity, string $nameField, string $color) {
    $payload = [$nameField => 'Invalid Color', 'status' => 1, 'subject_type' => 'chapter-wise', 'color' => $color];
    $this->actingAs($this->master)->post(route("superadmin.{$entity}.store"), $payload)->assertSessionHasErrors('color');
    $this->assertDatabaseMissing($entity, [$nameField => 'Invalid Color']);
})->with([
    ['classes', 'name', 'red'],
    ['classes', 'name', '#abc'],
    ['subjects', 'name_eng', 'url(example.com)'],
    ['subjects', 'name_eng', '#12345678'],
]);

it('requires the existing edit permission to change an icon color', function (string $entity, string $nameField) {
    $this->seed(PermissionSeeder::class);
    $viewer = User::factory()->create(['user_type' => UserType::SuperAdmin, 'created_by' => $this->master->id]);
    $viewer->syncPermissions(["{$entity}.view"]);
    $record = $entity === 'classes'
        ? SchoolClass::create(['name' => 'Protected Color Class', 'status' => 1, 'color' => '#059669'])
        : Subject::create(['name_eng' => 'Protected Color Subject', 'subject_type' => 'chapter-wise', 'status' => 1, 'color' => '#059669']);
    $payload = [$nameField => $record->{$nameField}, 'status' => 1, 'subject_type' => 'chapter-wise', 'color' => '#dc2626'];
    $this->actingAs($viewer)->get(route("superadmin.{$entity}.edit", $record))->assertForbidden();
    $this->put(route("superadmin.{$entity}.update", $record), $payload)->assertForbidden();
    expect($record->fresh()->color)->toBe('#059669');

    $viewer->syncPermissions(["{$entity}.edit"]);
    $this->actingAs($viewer)->put(route("superadmin.{$entity}.update", $record), $payload)->assertSessionHasNoErrors()->assertRedirect();
    expect($record->fresh()->color)->toBe('#dc2626');
})->with([['classes', 'name'], ['subjects', 'name_eng']]);

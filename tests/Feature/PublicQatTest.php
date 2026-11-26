<?php

use App\Models\SiteMenu;
use App\Models\TrialSetting;
use App\Support\SiteNavigation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('visitors can discover QAT and start a three paper trial', function () {
    TrialSetting::current()->update(['trial_duration_days' => 14]);

    $this->get(route('qat'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('qat')->where('canRegister', true)
        ->where('trialLimit', 3)->where('trialDurationDays', 3)
        ->where('siteNavigation.header.2.href', '/qat'));
    $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('welcome')->where('siteNavigation.header.2.href', '/qat'));
});

test('QAT remains discoverable with an existing published menu', function () {
    $item = ['id' => 'about', 'label' => 'Our school', 'type' => 'url', 'url' => '/#about', 'visible' => true, 'children' => []];
    $menu = SiteMenu::create([
        'key' => 'header', 'draft_items' => [$item], 'published_items' => [$item], 'published_at' => now(),
    ]);

    expect(array_column(SiteNavigation::published()['header'], 'href'))->toBe(['/#about', '/qat']);
    expect($menu->fresh()->published_items)->toBe([$item]);
    $menu->update(['published_items' => [$item, [
        ...$item, 'id' => 'qat', 'label' => 'QAT Papers', 'url' => '/qat', 'visible' => false,
    ]]]);
    expect(array_column(SiteNavigation::published()['header'], 'href'))->toBe(['/#about']);
});

test('the public QAT page respects disabled registration', function () {
    config(['fortify.features' => []]);

    $this->get(route('qat'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('qat')->where('canRegister', false));
});

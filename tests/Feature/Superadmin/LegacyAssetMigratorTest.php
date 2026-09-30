<?php

use App\Support\LegacyTransfer\LegacyAssetMigrator;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

test('legacy images are prefetched and rewritten from the remote fallback', function () {
    Storage::fake('public');
    config([
        'legacy-transfer.asset_root' => 'Z:\missing-legacy-root',
        'legacy-transfer.asset_url' => 'https://old.testmaker.pk',
    ]);

    Http::fake([
        'https://old.testmaker.pk/ckfinder/userfiles/images/first.png' => Http::response(
            'first-image',
            200,
            ['Content-Type' => 'image/png'],
        ),
        'https://old.testmaker.pk/ckfinder/userfiles/images/second.jpg' => Http::response('', 404),
        'https://old.testmaker.pk/ULC/ckfinder/userfiles/images/second.jpg' => Http::response(
            'second-image',
            200,
            ['Content-Type' => 'image/jpeg'],
        ),
    ]);

    $migrator = app(LegacyAssetMigrator::class);
    $migrator->reset();
    $migrator->prefetchHtml([
        '<img src="/ckfinder/userfiles/images/first.png">',
        json_encode([
            'prompt_en' => '<img src="/ckfinder/userfiles/images/second.jpg">',
        ], JSON_THROW_ON_ERROR),
    ]);

    $firstPath = '/storage/legacy-content/'.hash('sha256', 'first-image').'.png';
    $secondPath = '/storage/legacy-content/'.hash('sha256', 'second-image').'.jpg';

    expect($migrator->migrateHtml('<img src="/ckfinder/userfiles/images/first.png">'))
        ->toContain($firstPath)
        ->and($migrator->migrateHtml('<img src="/ckfinder/userfiles/images/second.jpg">'))
        ->toContain($secondPath)
        ->and($migrator->report())
        ->toMatchArray([
            'copied' => 2,
            'reused' => 0,
            'missing' => 0,
        ]);

    Storage::disk('public')->assertExists(ltrim($firstPath, '/storage/'));
    Storage::disk('public')->assertExists(ltrim($secondPath, '/storage/'));
});

test('old absolute TestMaker image URLs are fetched from the legacy domain', function () {
    Storage::fake('public');
    config([
        'legacy-transfer.asset_root' => 'Z:\\missing-legacy-root',
        'legacy-transfer.asset_url' => 'https://testmaker.pk',
    ]);
    Http::fake([
        'https://old.testmaker.pk/uploads/example.png' => Http::response('legacy-image', 200, ['Content-Type' => 'image/png']),
    ]);

    $migrator = app(LegacyAssetMigrator::class);
    $source = 'https://testmaker.pk/uploads/example.png';
    $migrated = $migrator->migrateHtml('<img src="'.$source.'">');

    expect($migrated)->toContain('/storage/legacy-content/')
        ->not->toContain($source);

    Http::assertSent(fn ($request) => $request->url() === 'https://old.testmaker.pk/uploads/example.png');
});
